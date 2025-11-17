import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { DualQueryRetrievalEngine } from '@/lib/rag/dual-query-engine';
import type { CompanySettings } from '@/types/company';
import { getAIModelOrDefault } from '@/types/company';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface StreamingGeneratorParams {
  question: {
    id: string;
    questionText: string;
    category: string | null;
    wordLimit: number | null;
    primaryContentType: string | null;
    selectedSourceRfpId: string | null;
    adaptationLevel: string | null;
  };
  rfp: {
    id: string;
    companyId: string;
    title: string;
    clientName: string | null;
    clientIndustry: string | null;
    extractedText: string | null;
    manualEnrichment: any;
    linkedinEnrichment: any;
  };
  companySettings: CompanySettings | null;
  mode?: 'standard' | 'with_context' | 'manual';
  depth?: 'basic' | 'advanced';
  customContext?: string;
}

export interface RAGAvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
  chunkCount?: number;
  averageScore?: number;
}

/**
 * Check if enough RAG data is available for the question
 * Threshold: At least 1 chunk with score > 0.4 (relaxed for initial testing)
 *
 * NOTE: This check is now very permissive to allow generation even with limited data.
 * The AI will acknowledge gaps in context if data is insufficient.
 */
export async function checkRAGDataAvailability(
  questionText: string,
  category: string,
  companyId: string
): Promise<RAGAvailabilityCheck> {
  try {
    // Generate embedding
    const queryEmbedding = await generateEmbedding(questionText);

    // Perform retrieval
    const dualEngine = new DualQueryRetrievalEngine();
    const results = await dualEngine.retrieve(
      queryEmbedding,
      category || 'general',
      companyId,
      { depth: 'basic' }
    );

    // Filter relevant chunks (composite score > 0.4 - relaxed threshold)
    const relevantChunks = results.chunks.filter((c: any) => c.compositeScore > 0.4);

    if (relevantChunks.length < 1) {
      return {
        isAvailable: false,
        reason: 'Aucune donnée pertinente dans la knowledge base',
        chunkCount: 0,
      };
    }

    const averageScore = relevantChunks.reduce((sum: number, c: any) => sum + c.compositeScore, 0) / relevantChunks.length;

    return {
      isAvailable: true,
      chunkCount: relevantChunks.length,
      averageScore,
    };
  } catch (error) {
    console.error('[RAG Availability Check Error]', error);
    // Changed to allow generation even on error - the AI will work with available context
    return {
      isAvailable: true,
      reason: 'Génération avec contexte limité',
      chunkCount: 0,
      averageScore: 0,
    };
  }
}

/**
 * Generate RFP response with streaming support
 * Yields text chunks as they arrive from Claude
 */
export async function* generateResponseStreaming(
  params: StreamingGeneratorParams
): AsyncGenerator<string> {
  const { question, rfp, companySettings, mode = 'with_context', depth = 'basic', customContext } = params;

  // Step 1: Generate embedding
  const queryEmbedding = await generateEmbedding(question.questionText);

  // Step 2: Retrieve context using dual query engine
  let sourceRfpIds: string[] = [];
  let sourceContext = '';
  let ragContext = '';

  // Check for pinned source
  if (question.selectedSourceRfpId) {
    sourceRfpIds = [question.selectedSourceRfpId];
  }

  // Dual Query Retrieval
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

  // Extract contexts
  sourceContext = pinnedChunks.map((r: any) => r.text).join('\n\n');
  const supportDocsText = supportChunks.map((r: any) => r.text).join('\n\n');
  const historicalText = historicalChunks.map((r: any) => r.text).join('\n\n');
  ragContext = [supportDocsText, historicalText].filter(t => t).join('\n\n---\n\n');

  // Extract RFP IDs for tracking
  const usedRfpIds = new Set<string>();
  pinnedChunks.forEach((r: any) => {
    if (r.metadata.rfpId) usedRfpIds.add(r.metadata.rfpId);
  });
  sourceRfpIds = Array.from(usedRfpIds);

  // Step 3: Build context based on mode
  let contextText = '';

  if (mode === 'standard') {
    const relevantDocs = retrievalResults.chunks.map((doc: any) => ({
      text: doc.text,
      category: doc.metadata.category || 'unknown',
    }));

    const standardDocs = relevantDocs
      .filter(doc => ['company_info', 'product_docs'].includes(doc.category))
      .map(doc => doc.text)
      .join('\n\n---\n\n');

    if (sourceContext) {
      contextText = `PAST RFP CONTENT (ADAPT TO CURRENT MANDATE):\n${sourceContext}\n\n---\n\nKNOWLEDGE BASE:\n${standardDocs}`;
    } else {
      contextText = standardDocs;
    }
  } else if (mode === 'with_context') {
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
    }

    // Add extracted RFP text if available (limited to 3000 chars)
    if (rfp.extractedText) {
      const extractPreview = rfp.extractedText.substring(0, 3000);
      rfpMetadata += `\n\nRFP DOCUMENT EXTRACT:\n${extractPreview}${rfp.extractedText.length > 3000 ? '...' : ''}`;
    }

    // Combine all context
    if (sourceContext) {
      contextText = `${rfpMetadata}\n\n---\n\nPAST RFP CONTENT (ADAPT TO CURRENT MANDATE):\n${sourceContext}\n\n---\n\nKNOWLEDGE BASE:\n\n${ragContext}`;
    } else {
      contextText = `${rfpMetadata}\n\n---\n\nKNOWLEDGE BASE:\n\n${ragContext}`;
    }
  } else if (mode === 'manual') {
    contextText = customContext || '';
  }

  // Step 4: Stream response from Claude
  const aiModel = getAIModelOrDefault(companySettings);
  const wordLimitText = question.wordLimit ? `Maximum ${question.wordLimit} words.` : 'No strict word limit, but be concise.';

  const systemPrompt = `You are an expert RFP response writer for TechVision AI, a B2B SaaS company specializing in AI solutions.

Your task is to generate a professional, compelling response to an RFP question based on the provided context.

GUIDELINES:
- Write in French (français) with professional business tone
- Be specific and factual, citing concrete numbers, features, and benefits when available
- Structure your response with clear paragraphs
- Focus on value proposition and differentiation
- ${wordLimitText}
- Category: ${question.category || 'general'}
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
${question.questionText}

---

Please generate a professional RFP response based on the context provided above.`;

  const stream = await anthropic.messages.stream({
    model: aiModel,
    max_tokens: question.wordLimit ? question.wordLimit * 8 : 4000,
    temperature: 0.3,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  // Yield chunks as they arrive
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text;
    }
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
 * Convert plain text to simple HTML
 */
export function convertToHtml(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  const htmlParagraphs = paragraphs.map(para => {
    const trimmed = para.trim();
    if (!trimmed) return '';
    return `<p>${trimmed}</p>`;
  });
  return htmlParagraphs.filter(p => p).join('\n');
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}
