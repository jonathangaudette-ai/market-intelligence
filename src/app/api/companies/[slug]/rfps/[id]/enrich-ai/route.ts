import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { generateEmbedding } from '@/lib/rfp/ai/embeddings';
import { DualQueryRetrievalEngine } from '@/lib/rag/dual-query-engine';
import {
  generateAIEnrichment,
  type EnrichmentContext,
  type AIEnrichmentResult,
} from '@/lib/rfp/services/ai-enrichment.service';
import { getPromptService } from '@/lib/prompts/service';
import { PROMPT_KEYS } from '@/types/prompts';
import { shouldUseDatabase } from '@/lib/prompts/feature-flags';
import Anthropic from '@anthropic-ai/sdk';

// Lazy initialization
let _anthropic: Anthropic | null = null;

function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

/**
 * POST /api/companies/[slug]/rfps/[id]/enrich-ai
 * Generate AI-powered enrichment using Claude Haiku 4.5
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

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

    // Get RFP with all relevant data
    const [rfp] = await db
      .select({
        id: rfps.id,
        clientName: rfps.clientName,
        clientIndustry: rfps.clientIndustry,
        companyId: rfps.companyId,
        extractedText: rfps.extractedText,
        linkedinEnrichment: rfps.linkedinEnrichment,
        manualEnrichment: rfps.manualEnrichment,
      })
      .from(rfps)
      .where(eq(rfps.id, id))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    if (rfp.companyId !== companyContext.company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log(`[AI Enrichment] Generating enrichment for RFP: ${rfp.clientName}`);

    // Step 1: Query knowledge base for relevant company information
    let knowledgeBaseChunks: Array<{
      text: string;
      source: string;
      score: number;
    }> = [];

    try {
      // Generate embedding for the client name + industry query
      const queryText = `${rfp.clientName}${rfp.clientIndustry ? ` ${rfp.clientIndustry}` : ''} company information background`;
      const queryEmbedding = await generateEmbedding(queryText);

      // Query RAG system for relevant documents
      const ragEngine = new DualQueryRetrievalEngine();
      const ragResults = await ragEngine.retrieve(
        queryEmbedding,
        'company-overview', // Use company-overview category
        rfp.companyId,
        { depth: 'detailed' } // Get more context
      );

      // Extract top chunks
      knowledgeBaseChunks = ragResults.chunks.slice(0, 5).map((chunk) => ({
        text: chunk.text,
        source: chunk.source,
        score: chunk.score,
      }));

      console.log(
        `[AI Enrichment] Retrieved ${knowledgeBaseChunks.length} knowledge base chunks`
      );
    } catch (error) {
      // RAG query is optional - continue even if it fails
      console.warn('[AI Enrichment] RAG query failed, continuing without knowledge base:', error);
    }

    // Step 2: Build enrichment context
    const enrichmentContext: EnrichmentContext = {
      clientName: rfp.clientName,
      clientIndustry: rfp.clientIndustry || undefined,
      rfpText: rfp.extractedText || undefined,
      linkedinData: rfp.linkedinEnrichment
        ? {
            description: (rfp.linkedinEnrichment as any).description,
            industry: (rfp.linkedinEnrichment as any).industry,
            employeeCount: (rfp.linkedinEnrichment as any).employeeCount,
            specialties: (rfp.linkedinEnrichment as any).specialties,
            headquarters: (rfp.linkedinEnrichment as any).headquarters,
            founded: (rfp.linkedinEnrichment as any).founded
              ? parseInt((rfp.linkedinEnrichment as any).founded, 10)
              : undefined,
            website: (rfp.linkedinEnrichment as any).website,
          }
        : undefined,
      existingEnrichment: rfp.manualEnrichment
        ? {
            clientBackground: (rfp.manualEnrichment as any).clientBackground,
            keyNeeds: (rfp.manualEnrichment as any).keyNeeds,
            constraints: (rfp.manualEnrichment as any).constraints,
            relationships: (rfp.manualEnrichment as any).relationships,
            customNotes: (rfp.manualEnrichment as any).customNotes,
          }
        : undefined,
      knowledgeBaseChunks: knowledgeBaseChunks.length > 0 ? knowledgeBaseChunks : undefined,
    };

    // Step 3: Generate AI enrichment (with configurable prompt system)
    const useConfigurablePrompts = shouldUseDatabase(rfp.companyId, PROMPT_KEYS.AI_ENRICHMENT);
    console.log(`[AI Enrichment] Using configurable prompts: ${useConfigurablePrompts}`);

    const enrichmentResult = useConfigurablePrompts
      ? await generateEnrichmentWithPromptService(rfp.companyId, enrichmentContext)
      : await generateAIEnrichment(enrichmentContext, {
          useCache: true,
          retryWithSonnet: true,
          model: 'haiku', // Start with Haiku (fast and cheap)
        });

    console.log(
      `[AI Enrichment] Generated enrichment with confidence: ${enrichmentResult.confidence} using ${enrichmentResult.model}`
    );

    // Step 4: Prepare enrichment data for database
    const enrichmentData = {
      clientBackground: enrichmentResult.clientBackground,
      keyNeeds: enrichmentResult.keyNeeds,
      constraints: enrichmentResult.constraints,
      relationships: enrichmentResult.relationships,
      customNotes: enrichmentResult.customNotes,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: session.user.email || session.user.id,
      aiGenerated: true,
      aiModel: enrichmentResult.model,
      aiConfidence: enrichmentResult.confidence,
    };

    // Step 5: Save to database
    const [updatedRfp] = await db
      .update(rfps)
      .set({
        manualEnrichment: enrichmentData as any,
        updatedAt: new Date(),
      })
      .where(eq(rfps.id, id))
      .returning();

    console.log(`[AI Enrichment] Successfully saved enrichment for ${rfp.clientName}`);

    return NextResponse.json({
      success: true,
      enrichment: updatedRfp.manualEnrichment,
      metadata: {
        confidence: enrichmentResult.confidence,
        model: enrichmentResult.model,
        knowledgeBaseChunksUsed: knowledgeBaseChunks.length,
      },
    });
  } catch (error) {
    console.error('[AI Enrichment Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to generate AI enrichment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate AI enrichment using Configurable Prompt System
 * Uses PromptService to retrieve company-specific or default prompts from database
 */
async function generateEnrichmentWithPromptService(
  companyId: string,
  context: EnrichmentContext
): Promise<AIEnrichmentResult> {
  console.log(`[Prompt Service] Retrieving AI_ENRICHMENT prompt for company ${companyId}...`);

  // Get the prompt template from PromptService
  const promptService = getPromptService();
  const template = await promptService.getPrompt(companyId, PROMPT_KEYS.AI_ENRICHMENT);

  console.log(`[Prompt Service] Using prompt: ${template.name} (v${template.version})`);

  // Prepare variables for template rendering
  const variables = {
    clientName: context.clientName,
    clientIndustry: context.clientIndustry,
    rfpText: context.rfpText,
    linkedinData: context.linkedinData,
    existingEnrichment: context.existingEnrichment,
    knowledgeBaseChunks: context.knowledgeBaseChunks,
  };

  // Render the prompt with variables
  const rendered = promptService.renderPromptWithVariables(template, variables);

  console.log(
    `[Prompt Service] Rendered prompt (system: ${rendered.system?.length || 0} chars, user: ${rendered.user.length} chars)`
  );

  // Call Claude with the rendered prompt
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: rendered.model || 'claude-haiku-4-5-20251001',
    max_tokens: rendered.maxTokens || 4096,
    temperature: rendered.temperature !== null ? rendered.temperature : 0.7,
    system: rendered.system,
    messages: [
      {
        role: 'user',
        content: rendered.user,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  // Parse JSON response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const enrichment = JSON.parse(jsonMatch[0]);

  console.log(`[Prompt Service] Enrichment generated successfully (confidence: ${enrichment.confidence})`);

  return {
    clientBackground: enrichment.clientBackground,
    keyNeeds: enrichment.keyNeeds,
    constraints: enrichment.constraints,
    relationships: enrichment.relationships,
    customNotes: enrichment.customNotes,
    confidence: enrichment.confidence || 0.8,
    model: rendered.model || 'claude-haiku-4-5-20251001',
  };
}
