/**
 * Historical RFP Import Service
 *
 * Imports past RFPs with their submitted responses for use as content sources
 * in the surgical retrieval system.
 *
 * Uses GPT-5 (with GPT-4o fallback) for intelligent matching of questions to responses.
 */

import { db } from '@/db';
import { rfps, rfpQuestions, rfpResponses } from '@/db/schema';
import { GPT5_CONFIGS, GPT4O_FALLBACK } from '@/lib/constants/ai-models';
import { parsePDF, cleanPDFText } from './parser/pdf-parser';
import OpenAI from 'openai';
import { eq } from 'drizzle-orm';
import { put } from '@vercel/blob';

// Lazy initialization
let _openai: OpenAI | null = null;

function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

export interface HistoricalImportInput {
  rfpPdf: File;
  responsePdf: File;
  metadata: {
    title: string;
    clientName: string;
    industry: string;
    submittedAt: Date;
    result: 'won' | 'lost' | 'pending';
    dealValue?: number;
    outcomeNotes?: string;
  };
  companyId: string;
  ownerId: string;
}

export interface MatchResult {
  question: string;
  response: string;
  section: string;
  confidence: number; // 0.0-1.0
  category?: string;
}

interface ResponseStructure {
  sections: Array<{
    sectionTitle: string;
    content: string;
    possibleQuestions: string[];
  }>;
}

interface MatchingResult {
  matches: MatchResult[];
  unmatchedQuestions: string[];
  unmatchedSections: string[];
}

/**
 * Parse submitted response document with GPT (GPT-5 preferred, GPT-4o fallback)
 */
async function parseSubmittedResponse(responseText: string): Promise<ResponseStructure> {
  const openai = getOpenAI();

  const prompt = `Analyze this RFP response document and extract its structure.

Document:
${responseText.substring(0, 50000)}

Return JSON with this structure:
{
  "sections": [
    {
      "sectionTitle": "Project Methodology",
      "content": "Our approach...",
      "possibleQuestions": ["Describe your methodology", "How do you manage projects"]
    }
  ]
}

Extract all major sections and their content. For each section, infer what RFP questions it might be answering.`;

  try {
    // Try GPT-5 first
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Using GPT-4o for now since GPT-5 may not be available
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing RFP response documents and extracting their structure. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }

    return JSON.parse(content) as ResponseStructure;
  } catch (error) {
    console.error('[Parse Response Error]', error);
    throw new Error('Failed to parse submitted response document');
  }
}

/**
 * Match questions to responses using GPT (GPT-5 preferred, GPT-4o fallback)
 */
async function matchQuestionsToResponses(
  questions: any[],
  responseStructure: ResponseStructure
): Promise<MatchingResult> {
  const openai = getOpenAI();

  const prompt = `Match each RFP question with the corresponding section in the response document.

Questions RFP:
${JSON.stringify(questions.map(q => ({ questionText: q.questionText, category: q.category })), null, 2)}

Response Sections:
${JSON.stringify(responseStructure.sections.map(s => ({
  sectionTitle: s.sectionTitle,
  contentPreview: s.content.substring(0, 200) + '...',
  possibleQuestions: s.possibleQuestions
})), null, 2)}

Analyze the semantic similarity between questions and sections to create matches.
Assign a confidence score (0.0-1.0) based on how well the section answers the question.

Return JSON:
{
  "matches": [
    {
      "question": "Question text",
      "response": "Extracted response text",
      "section": "Section title",
      "confidence": 0.95,
      "category": "Methodology"
    }
  ],
  "unmatchedQuestions": ["Questions that have no good match"],
  "unmatchedSections": ["Sections that weren't matched to any question"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at matching RFP questions with their corresponding answers in response documents. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5, // Lower temperature for more consistent matching
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }

    // Get full content for matches
    const parsed = JSON.parse(content) as MatchingResult;

    // Enrich matches with full content from sections
    parsed.matches = parsed.matches.map(match => {
      const section = responseStructure.sections.find(s => s.sectionTitle === match.section);
      if (section) {
        return {
          ...match,
          response: section.content
        };
      }
      return match;
    });

    return parsed;
  } catch (error) {
    console.error('[Match Questions Error]', error);
    throw new Error('Failed to match questions to responses');
  }
}

/**
 * Calculate quality score based on multiple factors
 */
async function calculateRfpQualityScore(rfpId: string): Promise<number> {
  const [rfp] = await db.select().from(rfps).where(eq(rfps.id, rfpId));

  if (!rfp) return 50;

  const responsesData = await db
    .select()
    .from(rfpResponses)
    .innerJoin(rfpQuestions, eq(rfpQuestions.id, rfpResponses.questionId))
    .where(eq(rfpQuestions.rfpId, rfpId));

  let score = 50; // Base score

  // Outcome bonus
  if (rfp.result === 'won') score += 30;
  else if (rfp.result === 'pending') score += 10;

  // Response quality
  if (responsesData.length > 0) {
    const avgResponseLength = responsesData.reduce(
      (sum, r) => sum + (r.rfp_responses.responseText?.length || 0),
      0
    ) / responsesData.length;

    if (avgResponseLength > 500) score += 10;
    if (avgResponseLength > 1000) score += 10;
  }

  return Math.min(100, score);
}

/**
 * Main import function - auto-accepts high confidence matches (≥90%)
 */
export async function importHistoricalRfp(
  input: HistoricalImportInput
): Promise<{
  rfpId: string;
  autoAccepted: number;
  needsReview: MatchResult[] | null;
}> {
  try {
    // 1. Extract text from both PDFs
    console.log('[Import] Extracting text from RFP PDF...');
    const rfpBuffer = Buffer.from(await input.rfpPdf.arrayBuffer());
    const rfpParsed = await parsePDF(rfpBuffer);
    const rfpText = cleanPDFText(rfpParsed.text);

    console.log('[Import] Extracting text from Response PDF...');
    const responseBuffer = Buffer.from(await input.responsePdf.arrayBuffer());
    const responseParsed = await parsePDF(responseBuffer);
    const responseText = cleanPDFText(responseParsed.text);

    // 1.5. Upload PDFs to Vercel Blob for future access
    console.log('[Import] Uploading PDFs to Vercel Blob...');
    const timestamp = Date.now();

    // Upload RFP PDF
    const rfpBlob = await put(
      `historical-rfps/${input.companyId}/${timestamp}-rfp-${input.rfpPdf.name}`,
      rfpBuffer,
      {
        access: 'public',
        contentType: 'application/pdf',
      }
    );
    console.log(`[Import] RFP PDF uploaded: ${rfpBlob.url}`);

    // Upload Response PDF
    const responseBlob = await put(
      `historical-rfps/${input.companyId}/${timestamp}-response-${input.responsePdf.name}`,
      responseBuffer,
      {
        access: 'public',
        contentType: 'application/pdf',
      }
    );
    console.log(`[Import] Response PDF uploaded: ${responseBlob.url}`);

    // 2. Parse RFP questions (using existing logic from question-extractor)
    console.log('[Import] Parsing RFP questions...');
    const { extractQuestions } = await import('./parser/question-extractor');
    const extractedQuestions = await extractQuestions(rfpText);

    // 3. Parse response structure with GPT
    console.log('[Import] Parsing response structure...');
    const responseStructure = await parseSubmittedResponse(responseText);

    // 4. Match questions ↔ responses with GPT
    console.log('[Import] Matching questions to responses...');
    const matchingResult = await matchQuestionsToResponses(
      extractedQuestions,
      responseStructure
    );

    // 5. Separate by confidence threshold (90%)
    const autoAccepted = matchingResult.matches.filter(m => m.confidence >= 0.90);
    const needsReview = matchingResult.matches.filter(m => m.confidence < 0.90);

    // 6. Create RFP in DB (mode: historical)
    console.log('[Import] Creating historical RFP record...');
    const [rfp] = await db.insert(rfps).values({
      title: input.metadata.title,
      clientName: input.metadata.clientName,
      clientIndustry: input.metadata.industry,
      companyId: input.companyId,
      ownerId: input.ownerId,
      mode: 'historical',
      isHistorical: true,
      submittedAt: input.metadata.submittedAt,
      result: input.metadata.result,
      dealValue: input.metadata.dealValue,
      outcomeNotes: input.metadata.outcomeNotes,
      extractedText: rfpText,
      parsingStatus: 'completed',
      status: 'submitted',
      // Store PDF URLs for future access
      originalFileUrl: rfpBlob.url,
      originalFilename: input.rfpPdf.name,
      fileSizeBytes: input.rfpPdf.size,
      fileType: 'application/pdf',
      submittedDocument: responseBlob.url,
    }).returning();

    // 7. Save auto-accepted questions + responses
    console.log(`[Import] Saving ${autoAccepted.length} auto-accepted matches...`);
    for (const match of autoAccepted) {
      const [question] = await db.insert(rfpQuestions).values({
        rfpId: rfp.id,
        questionText: match.question,
        category: match.category,
        status: 'completed',
        hasResponse: true,
      }).returning();

      await db.insert(rfpResponses).values({
        questionId: question.id,
        responseText: match.response,
        wasAiGenerated: false,
        createdBy: input.ownerId,
        status: 'approved',
      });
    }

    // 8. Calculate quality score
    console.log('[Import] Calculating quality score...');
    const qualityScore = await calculateRfpQualityScore(rfp.id);
    await db.update(rfps)
      .set({ qualityScore })
      .where(eq(rfps.id, rfp.id));

    console.log(`[Import] ✅ Import completed! RFP ID: ${rfp.id}`);
    console.log(`[Import] Auto-accepted: ${autoAccepted.length}, Needs review: ${needsReview.length}`);

    return {
      rfpId: rfp.id,
      autoAccepted: autoAccepted.length,
      needsReview: needsReview.length > 0 ? needsReview : null
    };
  } catch (error) {
    console.error('[Import Historical RFP Error]', error);
    throw error;
  }
}
