import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfpResponses, rfps, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCurrentCompany } from '@/lib/auth/helpers';
import { z } from 'zod';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getAIModelOrDefault, type CompanySettings } from '@/types/company';

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
 * POST /api/v1/rfp/questions/[id]/generate-response
 * Generate AI-powered response for a question using RAG
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Verify question exists and user has access
    const [question] = await db
      .select({
        id: rfpQuestions.id,
        rfpId: rfpQuestions.rfpId,
        questionText: rfpQuestions.questionText,
        category: rfpQuestions.category,
        wordLimit: rfpQuestions.wordLimit,
        difficulty: rfpQuestions.difficulty,
        estimatedMinutes: rfpQuestions.estimatedMinutes,
      })
      .from(rfpQuestions)
      .where(eq(rfpQuestions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Verify user has access to the RFP and get company settings
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

    // Verify user is member of company
    const companyContext = await getCurrentCompany();
    if (!companyContext) {
      return NextResponse.json({ error: 'No active company' }, { status: 403 });
    }

    if (rfp.companyId !== companyContext.company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get AI model from company settings (defaults to Sonnet 4.5)
    const aiModel = getAIModelOrDefault(companySettings);
    console.log(`[Generate Response] Using AI model: ${aiModel}`);

    // Step 1: Generate embedding for the question
    console.log(`[Generate Response] Generating embedding for question: ${questionId}`);
    const queryEmbedding = await generateEmbedding(question.questionText);

    // Step 2: Retrieve relevant context from Pinecone (filtered by company)
    console.log(`[Generate Response] Searching Pinecone for relevant documents (company: ${rfp.companyId})...`);
    const relevantDocs = await retrieveRelevantDocs(
      queryEmbedding,
      question.category || 'general',
      depth,
      rfp.companyId
    );

    console.log(`[Generate Response] Found ${relevantDocs.length} relevant documents`);

    // Step 3: Build context based on mode
    let contextText = '';
    const contextSources: string[] = [];

    if (mode === 'standard') {
      // Standard: Only product/company docs
      contextText = relevantDocs
        .filter(doc => ['company_info', 'product_docs'].includes(doc.category))
        .map(doc => doc.text)
        .join('\n\n---\n\n');
      contextSources.push('knowledge_base');
    } else if (mode === 'with_context') {
      // With context: All docs + RFP metadata + LinkedIn + Manual enrichment
      const allDocsText = relevantDocs.map(doc => doc.text).join('\n\n---\n\n');

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

      contextText = `${rfpMetadata}\n\n---\n\nKNOWLEDGE BASE:\n\n${allDocsText}`;
      contextSources.push('knowledge_base', 'rfp_metadata');
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

    // Step 7: Save response to database
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
 * Retrieve relevant documents from Pinecone (filtered by company for multi-tenant isolation)
 */
async function retrieveRelevantDocs(
  queryEmbedding: number[],
  category: string,
  depth: 'basic' | 'advanced',
  companyId: string
): Promise<Array<{ text: string; category: string; title: string; score: number }>> {
  const index = pinecone.index(INDEX_NAME);

  // Adjust topK based on depth
  const topK = depth === 'basic' ? 5 : 10;

  const results = await index.namespace(NAMESPACE).query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: {
      companyId: { $eq: companyId },
    },
  });

  return results.matches.map(match => ({
    text: (match.metadata?.text as string) || '',
    category: (match.metadata?.category as string) || 'unknown',
    title: (match.metadata?.title as string) || 'Untitled',
    score: match.score || 0,
  }));
}

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
