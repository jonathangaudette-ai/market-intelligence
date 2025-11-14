import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfpResponses, rfps, companies, rfpSourcePreferences } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { z } from 'zod';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getAIModelOrDefault, type CompanySettings } from '@/types/company';
import { DualQueryRetrievalEngine } from '@/lib/rag/dual-query-engine';

const GenerateRequestSchema = z.object({
  mode: z.enum(['standard', 'with_context', 'manual']).default('with_context'),
  customContext: z.string().optional(),
  depth: z.enum(['basic', 'advanced']).default('basic'),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const INDEX_NAME = 'market-intelligence';
const NAMESPACE = 'rfp-library';

/**
 * POST /api/companies/[slug]/rfps/[rfpId]/questions/[questionId]/generate-response
 * Generate AI-powered response for a question using RAG
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; questionId: string }> }
) {
  try {
    const { slug, id: rfpId, questionId } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify company access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = GenerateRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { mode, customContext, depth } = validation.data;

    // Verify question exists and belongs to this RFP
    const [question] = await db
      .select({
        id: rfpQuestions.id,
        rfpId: rfpQuestions.rfpId,
        questionText: rfpQuestions.questionText,
        category: rfpQuestions.category,
        wordLimit: rfpQuestions.wordLimit,
        difficulty: rfpQuestions.difficulty,
        estimatedMinutes: rfpQuestions.estimatedMinutes,
        // Surgical retrieval fields
        primaryContentType: rfpQuestions.primaryContentType,
        selectedSourceRfpId: rfpQuestions.selectedSourceRfpId,
        adaptationLevel: rfpQuestions.adaptationLevel,
      })
      .from(rfpQuestions)
      .where(eq(rfpQuestions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (question.rfpId !== rfpId) {
      return NextResponse.json({ error: 'Question does not belong to this RFP' }, { status: 400 });
    }

    // Get RFP and verify ownership
    const rfpWithCompany = await db
      .select({
        rfp: {
          id: rfps.id,
          companyId: rfps.companyId,
          title: rfps.title,
          clientName: rfps.clientName,
          clientIndustry: rfps.clientIndustry,
          extractedText: rfps.extractedText,
          manualEnrichment: rfps.manualEnrichment,
          linkedinEnrichment: rfps.linkedinEnrichment,
        },
        companySettings: companies.settings,
      })
      .from(rfps)
      .innerJoin(companies, eq(companies.id, rfps.companyId))
      .where(eq(rfps.id, question.rfpId))
      .limit(1);

    if (!rfpWithCompany || rfpWithCompany.length === 0) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    const rfp = rfpWithCompany[0].rfp;
    const companySettings = rfpWithCompany[0].companySettings as CompanySettings | null;

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    // Verify RFP belongs to this company
    if (rfp.companyId !== companyContext.company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get AI model from company settings (defaults to Sonnet 4.5)
    const aiModel = getAIModelOrDefault(companySettings);
    console.log(`[Generate Response] Using AI model: ${aiModel}`);

    // Step 1: Generate embedding for the question
    console.log(`[Generate Response] Generating embedding for question: ${questionId}`);
    const queryEmbedding = await generateEmbedding(question.questionText);

    // Step 2: Two-tier retrieval (Surgical Retrieval System)
    let sourceRfpIds: string[] = [];
    let sourceContext = '';
    let ragContext = '';

    // Tier 1: Source-pinned retrieval (if source is selected)
    if (question.selectedSourceRfpId) {
      console.log(`[Generate Response] Using selected source RFP: ${question.selectedSourceRfpId}`);
      sourceRfpIds = [question.selectedSourceRfpId];
    } else {
      // Check if there are smart defaults from preferences
      const [prefs] = await db
        .select()
        .from(rfpSourcePreferences)
        .where(eq(rfpSourcePreferences.rfpId, rfpId))
        .limit(1);

      if (prefs && question.primaryContentType) {
        const suggestedSources = prefs.suggestedSources as Record<string, string[]> || {};
        const suggested = suggestedSources[question.primaryContentType];
        if (suggested && suggested.length > 0) {
          console.log(`[Generate Response] Using smart default source for ${question.primaryContentType}: ${suggested[0]}`);
          sourceRfpIds = [suggested[0]];
        }
      }
    }

    // Step 2: Dual Query Retrieval (Support Docs RAG v4.0)
    console.log(`[Generate Response] Starting dual query retrieval (pinned + support + historical)...`);

    const dualEngine = new DualQueryRetrievalEngine();
    const retrievalResults = await dualEngine.retrieve(
      queryEmbedding,
      question.category || 'general',
      rfp.companyId,
      {
        pinnedSourceRfpId: sourceRfpIds.length > 0 ? sourceRfpIds[0] : undefined,
        depth: depth === 'basic' ? 'basic' : 'detailed',
      }
    );

    // Separate results by source type
    const pinnedChunks = retrievalResults.chunks.filter((c: any) => c.source === 'pinned');
    const supportChunks = retrievalResults.chunks.filter((c: any) => c.source === 'support');
    const historicalChunks = retrievalResults.chunks.filter((c: any) => c.source === 'historical');

    // Extract source context from pinned results
    sourceContext = pinnedChunks
      .map((r: any) => r.text)
      .join('\n\n');

    // Extract RAG context from support docs + historical RFPs
    const supportDocsText = supportChunks
      .map((r: any) => r.text)
      .join('\n\n');
    const historicalText = historicalChunks
      .map((r: any) => r.text)
      .join('\n\n');

    // Combine support docs and historical for ragContext
    ragContext = [supportDocsText, historicalText].filter(t => t).join('\n\n---\n\n');

    // Extract unique RFP IDs from pinned results for usage tracking
    const usedRfpIds = new Set<string>();
    pinnedChunks.forEach((r: any) => {
      if (r.metadata.rfpId) usedRfpIds.add(r.metadata.rfpId);
    });
    sourceRfpIds = Array.from(usedRfpIds);

    // Build relevantDocs array for backwards compatibility with context building
    const relevantDocs = retrievalResults.chunks.map((doc: any) => ({
      text: doc.text,
      category: doc.metadata.category || 'unknown',
      title: doc.metadata.title || 'Untitled',
      score: doc.score,
    }));

    console.log(`[Generate Response] Retrieval complete:`);
    console.log(`  - Pinned: ${retrievalResults.metadata.pinnedCount} docs`);
    console.log(`  - Support: ${retrievalResults.metadata.supportCount} docs`);
    console.log(`  - Historical: ${retrievalResults.metadata.historicalCount} docs`);
    console.log(`  - Total: ${retrievalResults.metadata.totalResults} docs`);

    // Step 3: Build context based on mode
    let contextText = '';
    const contextSources: string[] = [];

    if (mode === 'standard') {
      // Standard: Only product/company docs + source context if available
      const standardDocs = relevantDocs
        .filter(doc => ['company_info', 'product_docs'].includes(doc.category))
        .map(doc => doc.text)
        .join('\n\n---\n\n');

      if (sourceContext) {
        contextText = `PAST RFP CONTENT (ADAPT TO CURRENT MANDATE):\n${sourceContext}\n\n---\n\nKNOWLEDGE BASE:\n${standardDocs}`;
        contextSources.push('historical_rfp', 'knowledge_base');
      } else {
        contextText = standardDocs;
        contextSources.push('knowledge_base');
      }
    } else if (mode === 'with_context') {
      // With context: Source + All docs + RFP metadata + LinkedIn + Manual enrichment
      const allDocsText = ragContext;

      // Build RFP metadata section
      let rfpMetadata = `
RFP CONTEXT:
- Client: ${rfp.clientName}
- Industry: ${rfp.clientIndustry || 'Not specified'}
- RFP Title: ${rfp.title}
      `.trim();

      // Add LinkedIn enrichment if available
      if (rfp.linkedinEnrichment) {
        const linkedin = rfp.linkedinEnrichment as any;
        rfpMetadata += `\n\nLINKEDIN COMPANY DATA:`;
        if (linkedin.description) rfpMetadata += `\n- Description: ${linkedin.description}`;
        if (linkedin.employeeCount) rfpMetadata += `\n- Employee Count: ${linkedin.employeeCount}`;
        if (linkedin.headquarters) rfpMetadata += `\n- Headquarters: ${linkedin.headquarters}`;
        if (linkedin.founded) rfpMetadata += `\n- Founded: ${linkedin.founded}`;
        if (linkedin.specialties && Array.isArray(linkedin.specialties)) {
          rfpMetadata += `\n- Specialties: ${linkedin.specialties.join(', ')}`;
        }
        contextSources.push('linkedin');
      }

      // Add manual enrichment if available
      if (rfp.manualEnrichment) {
        const manual = rfp.manualEnrichment as any;
        rfpMetadata += `\n\nMANUAL ENRICHMENT NOTES:`;
        if (manual.clientBackground) rfpMetadata += `\n- Client Background: ${manual.clientBackground}`;
        if (manual.keyNeeds) rfpMetadata += `\n- Key Needs: ${manual.keyNeeds}`;
        if (manual.constraints) rfpMetadata += `\n- Constraints: ${manual.constraints}`;
        if (manual.relationships) rfpMetadata += `\n- Relationships: ${manual.relationships}`;
        if (manual.customNotes) rfpMetadata += `\n- Custom Notes: ${manual.customNotes}`;
        contextSources.push('manual_enrichment');
      }

      // Add extracted RFP text if available (limited to 3000 chars)
      if (rfp.extractedText) {
        const extractPreview = rfp.extractedText.substring(0, 3000);
        rfpMetadata += `\n\nRFP DOCUMENT EXTRACT:\n${extractPreview}${rfp.extractedText.length > 3000 ? '...' : ''}`;
        contextSources.push('rfp_extract');
      }

      // Add source context if available
      if (sourceContext) {
        contextText = `${rfpMetadata}\n\n---\n\nPAST RFP CONTENT (ADAPT TO CURRENT MANDATE):\n${sourceContext}\n\n---\n\nKNOWLEDGE BASE:\n\n${allDocsText}`;
        contextSources.push('historical_rfp', 'knowledge_base', 'rfp_metadata');
      } else {
        contextText = `${rfpMetadata}\n\n---\n\nKNOWLEDGE BASE:\n\n${allDocsText}`;
        contextSources.push('knowledge_base', 'rfp_metadata');
      }
    } else if (mode === 'manual') {
      // Manual: Only custom context provided by user
      contextText = customContext || '';
      contextSources.push('manual');
    }

    // Step 4: Generate response using Claude
    console.log(`[Generate Response] Generating response with ${aiModel}...`);
    const responseText = await generateResponseWithClaude(
      question.questionText,
      contextText,
      question.wordLimit,
      question.category || 'general',
      mode,
      aiModel
    );

    console.log(`[Generate Response] Response generated (${responseText.length} chars)`);

    // Step 5: Convert to HTML (simple paragraph wrapping for now)
    const responseHtml = convertToHtml(responseText);

    // Step 6: Count words
    const wordCount = countWords(responseText);

    // Step 7: Save response to database (with surgical retrieval metadata)
    const [savedResponse] = await db
      .insert(rfpResponses)
      .values({
        questionId,
        responseText,
        responseHtml,
        wordCount,
        version: 1,
        createdBy: session.user.id,
        wasAiGenerated: true,
        aiModel,
        status: 'draft',
        // Surgical retrieval metadata
        sourceRfpIds,
        adaptationUsed: question.adaptationLevel || 'contextual',
      })
      .returning();

    // Step 8: Update question to mark as having response
    await db
      .update(rfpQuestions)
      .set({
        hasResponse: true,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(rfpQuestions.id, questionId));

    // Step 9: Update usage count for source RFPs
    if (sourceRfpIds.length > 0) {
      console.log(`[Generate Response] Updating usage count for source RFPs: ${sourceRfpIds.join(', ')}`);
      for (const sourceId of sourceRfpIds) {
        await db
          .update(rfps)
          .set({
            usageCount: sql`COALESCE(${rfps.usageCount}, 0) + 1`,
            lastUsedAt: new Date(),
          })
          .where(eq(rfps.id, sourceId));
      }
    }

    return NextResponse.json({
      success: true,
      response: {
        id: savedResponse.id,
        responseText: savedResponse.responseText,
        responseHtml: savedResponse.responseHtml,
        wordCount: savedResponse.wordCount,
        version: savedResponse.version,
        wasAiGenerated: true,
        aiModel,
        createdAt: savedResponse.createdAt,
      },
      metadata: {
        mode,
        depth,
        contextSources,
        relevantDocsCount: relevantDocs.length,
        // Support Docs RAG v4.0 metadata
        sourceBreakdown: {
          pinned: retrievalResults.metadata.pinnedCount,
          supportDocs: retrievalResults.metadata.supportCount,
          historical: retrievalResults.metadata.historicalCount,
          total: retrievalResults.metadata.totalResults,
        },
        averageScore: retrievalResults.chunks.length > 0
          ? retrievalResults.chunks.reduce((sum: number, doc: any) => sum + doc.compositeScore, 0) / retrievalResults.chunks.length
          : 0,
      },
    });
  } catch (error) {
    console.error('[Generate Response Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * DEPRECATED: These functions have been replaced by DualQueryRetrievalEngine (Support Docs RAG v4.0)
 *
 * The new DualQueryRetrievalEngine provides:
 * - Parallel queries across 3 sources (pinned, support docs, historical RFPs)
 * - Composite scoring (semantic + outcome + recency + quality)
 * - Better multi-tenant security with tenant_id
 * - Automatic source type tracking
 *
 * See src/lib/rag/dual-query-engine.ts for the implementation.
 */

/**
 * Generate response using Claude
 */
async function generateResponseWithClaude(
  questionText: string,
  contextText: string,
  wordLimit: number | null,
  category: string,
  mode: 'standard' | 'with_context' | 'manual',
  aiModel: string
): Promise<string> {
  const wordLimitText = wordLimit ? `Maximum ${wordLimit} words.` : 'No strict word limit, but be concise.';

  const systemPrompt = `You are an expert RFP response writer for TechVision AI, a B2B SaaS company specializing in AI solutions.

Your task is to generate a professional, compelling response to an RFP question based on the provided context.

GUIDELINES:
- Write in French (français) with professional business tone
- Be specific and factual, citing concrete numbers, features, and benefits when available
- Structure your response with clear paragraphs
- Focus on value proposition and differentiation
- ${wordLimitText}
- Category: ${category}
- Use context information to craft an accurate, relevant response
- If context is insufficient, acknowledge gaps professionally

MODE: ${mode}
${mode === 'with_context' ? '- Include client-specific context and RFP details in your response' : ''}
${mode === 'manual' ? '- Only use the manually provided context' : ''}

OUTPUT FORMAT:
- Plain text paragraphs (no markdown)
- Use line breaks between paragraphs
- Professional business French`;

  const userPrompt = `CONTEXT:
${contextText}

---

QUESTION:
${questionText}

---

Please generate a professional RFP response based on the context provided above.`;

  const response = await anthropic.messages.create({
    model: aiModel,
    max_tokens: wordLimit ? wordLimit * 8 : 4000, // Approximate tokens from words
    temperature: 0.3, // Lower temperature for more factual, consistent responses
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const textContent = response.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  return textContent.text.trim();
}

/**
 * Convert plain text to simple HTML
 */
function convertToHtml(text: string): string {
  // Split by double line breaks (paragraphs)
  const paragraphs = text.split(/\n\n+/);

  const htmlParagraphs = paragraphs.map(para => {
    // Trim and wrap in <p> tags
    const trimmed = para.trim();
    if (!trimmed) return '';

    return `<p>${trimmed}</p>`;
  });

  return htmlParagraphs.filter(p => p).join('\n');
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}
