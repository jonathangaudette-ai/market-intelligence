import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireRFPAuthWithSlug } from '@/lib/rfp/auth';
import { parseDocument } from '@/lib/rfp/parser/parser-service';
import {
  extractQuestionsInBatches,
  validateQuestions,
  type ExtractedQuestion,
  type ProgressCallback,
} from '@/lib/rfp/parser/question-extractor';
import { categorizeQuestionsBatch } from '@/lib/rfp/ai/claude';
import { getPromptService } from '@/lib/prompts/service';
import { PROMPT_KEYS } from '@/types/prompts';
import { shouldUseDatabase } from '@/lib/prompts/feature-flags';
import OpenAI from 'openai';
import { GPT5_CONFIGS } from '@/lib/constants/ai-models';

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

// Increase timeout to 13 minutes for large RFP documents (requires Vercel Pro + Fluid Compute)
// With Fluid Compute: Pro plan can go up to 800s (13 min)
export const maxDuration = 800;

/**
 * Helper function to add a log event to the parsing_logs column
 */
async function addParsingLog(
  rfpId: string,
  type: 'info' | 'success' | 'error' | 'progress',
  stage: string,
  message: string,
  metadata?: Record<string, any>
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    stage,
    message,
    metadata,
  };

  await db.execute(sql`
    UPDATE rfps
    SET parsing_logs = COALESCE(parsing_logs, '[]'::jsonb) || ${JSON.stringify(logEntry)}::jsonb,
        updated_at = NOW()
    WHERE id = ${rfpId}
  `);
}

/**
 * POST /api/companies/[slug]/rfps/[id]/parse
 * Parse an uploaded RFP and extract questions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    // 1. Authentication with slug
    const authResult = await requireRFPAuthWithSlug(slug);
    if (authResult.error) return authResult.error;

    const { user, company } = authResult;

    // 2. Get RFP from database
    const [rfp] = await db
      .select()
      .from(rfps)
      .where(eq(rfps.id, id))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    // 3. Verify ownership/access
    if (rfp.companyId !== company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 4. Check if already parsing or parsed
    if (rfp.parsingStatus === 'processing') {
      return NextResponse.json(
        { error: 'RFP is already being parsed' },
        { status: 409 }
      );
    }

    if (rfp.parsingStatus === 'completed') {
      return NextResponse.json(
        { error: 'RFP has already been parsed' },
        { status: 409 }
      );
    }

    // 5. Update status to processing - downloading stage
    await db
      .update(rfps)
      .set({
        parsingStatus: 'processing',
        parsingStage: 'downloading',
        parsingProgressCurrent: 0,
        parsingProgressTotal: 0,
        questionsExtracted: 0,
        parsingLogs: [], // Reset logs
        updatedAt: new Date(),
      })
      .where(eq(rfps.id, id));

    // Log: Start downloading
    await addParsingLog(id, 'info', 'downloading', 'Téléchargement du document PDF depuis Vercel Blob Storage', {
      fileUrl: rfp.originalFileUrl,
      fileType: rfp.fileType,
    });

    try {
      // 6. Parse document
      console.log(`[RFP ${id}] Starting parsing...`);

      // Update to parsing stage
      await db
        .update(rfps)
        .set({
          parsingStage: 'parsing',
          updatedAt: new Date(),
        })
        .where(eq(rfps.id, id));

      // Log: Start parsing
      await addParsingLog(id, 'info', 'parsing', 'Extraction du texte du document PDF en cours...');

      const parsedDoc = await parseDocument(
        rfp.originalFileUrl!,
        rfp.fileType!
      );

      console.log(`[RFP ${id}] Document parsed, extracted ${parsedDoc.text.length} characters`);

      // Log: Parsing completed
      await addParsingLog(id, 'success', 'parsing', `Document PDF analysé avec succès`, {
        characterCount: parsedDoc.text.length,
        pageCount: parsedDoc.metadata?.pageCount,
      });

      // 7. Extract questions using GPT-5
      console.log(`[RFP ${id}] Extracting questions...`);

      // Update to extracting stage (total will be set by first progress callback)
      await db
        .update(rfps)
        .set({
          parsingStage: 'extracting',
          parsingProgressCurrent: 0,
          parsingProgressTotal: 0,
          updatedAt: new Date(),
        })
        .where(eq(rfps.id, id));

      // Log: Start extraction
      await addParsingLog(id, 'info', 'extracting', 'Extraction des questions avec GPT-5 démarrée', {
        textLength: parsedDoc.text.length,
      });

      // Use configurable prompt system if enabled
      const useConfigurablePrompts = shouldUseDatabase(company.id, PROMPT_KEYS.QUESTION_EXTRACT);
      console.log(`[RFP ${id}] Using configurable prompts for extraction: ${useConfigurablePrompts}`);

      const extractedQuestions = useConfigurablePrompts
        ? await extractQuestionsWithPromptService(
            company.id,
            parsedDoc.text,
            {
              onProgress: async (current, total, questionsFound, newQuestions) => {
                await db
                  .update(rfps)
                  .set({
                    parsingProgressCurrent: current,
                    parsingProgressTotal: total,
                    questionsExtracted: questionsFound,
                    updatedAt: new Date(),
                  })
                  .where(eq(rfps.id, id));

                console.log(`[RFP ${id}] Progress: ${current}/${total} batches, ${questionsFound} questions extracted (${newQuestions.length} in this batch)`);

                await addParsingLog(
                  id,
                  'progress',
                  'extracting',
                  `Batch ${current}/${total} traité`,
                  {
                    batchNumber: current,
                    totalBatches: total,
                    questionsFound: questionsFound,
                    questions: newQuestions,
                  }
                );
              },
            }
          )
        : await extractQuestionsInBatches(parsedDoc.text, {
            onProgress: async (current, total, questionsFound, newQuestions) => {
              await db
                .update(rfps)
                .set({
                  parsingProgressCurrent: current,
                  parsingProgressTotal: total,
                  questionsExtracted: questionsFound,
                  updatedAt: new Date(),
                })
                .where(eq(rfps.id, id));

              console.log(`[RFP ${id}] Progress: ${current}/${total} batches, ${questionsFound} questions extracted (${newQuestions.length} in this batch)`);

              await addParsingLog(
                id,
                'progress',
                'extracting',
                `Batch ${current}/${total} traité`,
                {
                  batchNumber: current,
                  totalBatches: total,
                  questionsFound: questionsFound,
                  questions: newQuestions,
                }
              );
            },
          });

      const validQuestions = validateQuestions(extractedQuestions);
      console.log(`[RFP ${id}] Extracted ${validQuestions.length} questions`);

      // Log: Extraction completed
      await addParsingLog(id, 'success', 'extracting', `Extraction terminée: ${validQuestions.length} questions trouvées`, {
        totalQuestions: validQuestions.length,
        rawQuestions: extractedQuestions.length,
      });

      // 8. Save extracted questions and mark as "extracted" (categorization will be done in separate request)
      console.log(`[RFP ${id}] Saving extracted questions for categorization...`);

      // 8. Save extracted questions for categorization (done in separate request)
      await db
        .update(rfps)
        .set({
          parsingStatus: 'extracted',
          parsingStage: 'extracted',
          extractedQuestions: validQuestions as any, // Store questions temporarily
          parsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(rfps.id, id));

      console.log(`[RFP ${id}] Extraction phase completed successfully`);

      // Log: Extraction phase completed
      await addParsingLog(id, 'success', 'extracted', `✅ Extraction terminée: ${validQuestions.length} questions prêtes pour la catégorisation`, {
        totalQuestions: validQuestions.length,
        nextStep: 'categorization',
      });

      return NextResponse.json({
        message: 'RFP extraction completed successfully',
        status: 'extracted',
        questionsExtracted: validQuestions.length,
        nextStep: 'Please call POST /categorize to complete the analysis',
      });
    } catch (parsingError) {
      // Log: Error
      await addParsingLog(
        id,
        'error',
        'error',
        `❌ Erreur lors de l'analyse: ${parsingError instanceof Error ? parsingError.message : 'Erreur inconnue'}`,
        {
          error: parsingError instanceof Error ? parsingError.message : 'Unknown error',
          stack: parsingError instanceof Error ? parsingError.stack : undefined,
        }
      );

      // Update RFP with error
      await db
        .update(rfps)
        .set({
          parsingStatus: 'failed',
          parsingError:
            parsingError instanceof Error
              ? parsingError.message
              : 'Unknown parsing error',
          updatedAt: new Date(),
        })
        .where(eq(rfps.id, id));

      throw parsingError;
    }
  } catch (error) {
    console.error('[RFP Parse Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to parse RFP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract questions using Configurable Prompt System
 * Reproduces the batching logic from extractQuestionsInBatches but uses PromptService
 */
async function extractQuestionsWithPromptService(
  companyId: string,
  text: string,
  options?: {
    onProgress?: ProgressCallback;
  }
): Promise<ExtractedQuestion[]> {
  console.log(`[Prompt Service] Extracting questions for company ${companyId}...`);

  // Same batching logic as original function
  const MAX_SINGLE_REQUEST = 100000; // ~25k tokens
  const LARGE_BATCH_SIZE = 30000; // ~7.5k tokens per batch

  let batches: string[] = [];

  if (text.length < MAX_SINGLE_REQUEST) {
    console.log(`Document size: ${text.length} chars - processing in single request`);
    batches = [text];
  } else {
    console.log(`Document size: ${text.length} chars - splitting into 30k batches`);
    let currentIndex = 0;
    while (currentIndex < text.length) {
      batches.push(text.substring(currentIndex, currentIndex + LARGE_BATCH_SIZE));
      currentIndex += LARGE_BATCH_SIZE;
    }
  }

  console.log(
    `Processing ${batches.length} batch${batches.length > 1 ? 'es' : ''} for question extraction`
  );

  // Get the prompt template from PromptService
  const promptService = getPromptService();
  const template = await promptService.getPrompt(companyId, PROMPT_KEYS.QUESTION_EXTRACT);

  console.log(`[Prompt Service] Using prompt: ${template.name} (v${template.version})`);

  const allQuestions: ExtractedQuestion[] = [];

  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batchText = batches[i];

    console.log(`[Prompt Service] Processing batch ${i + 1}/${batches.length} (${batchText.length} chars)`);

    // Render the prompt with variables
    const variables = {
      text: batchText,
      maxQuestions: undefined, // No limit
      sectionTitle: undefined,
    };

    const rendered = promptService.renderPromptWithVariables(template, variables);

    // Call OpenAI (GPT-5) with the rendered prompt
    const openai = getOpenAI();

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          ...(rendered.system ? [{ role: 'system' as const, content: rendered.system }] : []),
          { role: 'user' as const, content: rendered.user },
        ],
        modalities: ['text'],
        reasoning: GPT5_CONFIGS.extraction.reasoning,
        text: GPT5_CONFIGS.extraction.text,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in GPT-5 response');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`[Prompt Service] No JSON array found in batch ${i + 1}, skipping`);
        continue;
      }

      const batchQuestions = JSON.parse(jsonMatch[0]) as ExtractedQuestion[];
      allQuestions.push(...batchQuestions);

      console.log(`[Prompt Service] Batch ${i + 1} extracted ${batchQuestions.length} questions`);

      // Call progress callback
      if (options?.onProgress) {
        await options.onProgress(i + 1, batches.length, allQuestions.length, batchQuestions);
      }
    } catch (error) {
      console.error(`[Prompt Service] Error processing batch ${i + 1}:`, error);
      // Continue to next batch instead of throwing
    }
  }

  console.log(`[Prompt Service] Total extracted: ${allQuestions.length} questions`);

  return allQuestions;
}
