import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfpResponses, rfps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { z } from 'zod';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

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

    // Verify user has access to the RFP
    const [rfp] = await db
      .select({
        id: rfps.id,
        companyId: rfps.companyId,
        title: rfps.title,
        clientName: rfps.clientName,
        clientIndustry: rfps.clientIndustry,
      })
      .from(rfps)
      .where(eq(rfps.id, question.rfpId))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    // TODO: Verify user is member of company (for now, skip this check)

    // Step 1: Generate embedding for the question
    console.log(`[Generate Response] Generating embedding for question: ${questionId}`);
    const queryEmbedding = await generateEmbedding(question.questionText);

    // Step 2: Retrieve relevant context from Pinecone
    console.log(`[Generate Response] Searching Pinecone for relevant documents...`);
    const relevantDocs = await retrieveRelevantDocs(
      queryEmbedding,
      question.category || 'general',
      depth
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
      // With context: All docs + RFP metadata + client info
      const allDocsText = relevantDocs.map(doc => doc.text).join('\n\n---\n\n');

      const rfpMetadata = `
RFP CONTEXT:
- Client: ${rfp.clientName}
- Industry: ${rfp.clientIndustry || 'Not specified'}
- RFP Title: ${rfp.title}
      `.trim();

      contextText = `${rfpMetadata}\n\n---\n\nKNOWLEDGE BASE:\n\n${allDocsText}`;
      contextSources.push('knowledge_base', 'rfp_metadata');

      // TODO: Add LinkedIn enrichment data
      // TODO: Add manual enrichment data from form
    } else if (mode === 'manual') {
      // Manual: Only custom context provided by user
      contextText = customContext || '';
      contextSources.push('manual');
    }

    // Step 4: Generate response using Claude 3.5 Sonnet
    console.log(`[Generate Response] Generating response with Claude 3.5 Sonnet...`);
    const responseText = await generateResponseWithClaude(
      question.questionText,
      contextText,
      question.wordLimit,
      question.category || 'general',
      mode
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
        aiModel: 'claude-3.5-sonnet',
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
        aiModel: 'claude-3.5-sonnet',
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
 * Retrieve relevant documents from Pinecone
 */
async function retrieveRelevantDocs(
  queryEmbedding: number[],
  category: string,
  depth: 'basic' | 'advanced'
): Promise<Array<{ text: string; category: string; title: string; score: number }>> {
  const index = pinecone.index(INDEX_NAME);

  // Adjust topK based on depth
  const topK = depth === 'basic' ? 5 : 10;

  const results = await index.namespace(NAMESPACE).query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  return results.matches.map(match => ({
    text: (match.metadata?.text as string) || '',
    category: (match.metadata?.category as string) || 'unknown',
    title: (match.metadata?.title as string) || 'Untitled',
    score: match.score || 0,
  }));
}

/**
 * Generate response using Claude 3.5 Sonnet
 */
async function generateResponseWithClaude(
  questionText: string,
  contextText: string,
  wordLimit: number | null,
  category: string,
  mode: 'standard' | 'with_context' | 'manual'
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
    model: 'claude-3-5-sonnet-20241022',
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
