import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireRFPAuth } from '@/lib/rfp/auth';
import { parseDocument } from '@/lib/rfp/parser/parser-service';
import { extractQuestionsInBatches, validateQuestions } from '@/lib/rfp/parser/question-extractor';
import { categorizeQuestionsBatch } from '@/lib/rfp/ai/claude';

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
 * POST /api/v1/rfp/rfps/[id]/parse
 * Parse an uploaded RFP and extract questions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const authResult = await requireRFPAuth();
    if (authResult.error) return authResult.error;

    const { user, company } = authResult;
    const { id } = await params;

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

      const extractedQuestions = await extractQuestionsInBatches(
        parsedDoc.text,
        {
          onProgress: async (current, total, questionsFound) => {
            // Update progress in database (including total on first call)
            await db
              .update(rfps)
              .set({
                parsingProgressCurrent: current,
                parsingProgressTotal: total,
                questionsExtracted: questionsFound,
                updatedAt: new Date(),
              })
              .where(eq(rfps.id, id));

            console.log(`[RFP ${id}] Progress: ${current}/${total} batches, ${questionsFound} questions extracted`);

            // Log: Batch progress
            await addParsingLog(
              id,
              'progress',
              'extracting',
              `Batch ${current}/${total} traité`,
              {
                batchNumber: current,
                totalBatches: total,
                questionsFound: questionsFound,
              }
            );
          }
        }
      );

      const validQuestions = validateQuestions(extractedQuestions);
      console.log(`[RFP ${id}] Extracted ${validQuestions.length} questions`);

      // Log: Extraction completed
      await addParsingLog(id, 'success', 'extracting', `Extraction terminée: ${validQuestions.length} questions trouvées`, {
        totalQuestions: validQuestions.length,
        rawQuestions: extractedQuestions.length,
      });

      // 8. Categorize questions and save to database
      console.log(`[RFP ${id}] Categorizing and saving questions...`);

      // Update to categorizing stage
      await db
        .update(rfps)
        .set({
          parsingStage: 'categorizing',
          parsingProgressCurrent: 0,
          parsingProgressTotal: validQuestions.length,
          updatedAt: new Date(),
        })
        .where(eq(rfps.id, id));

      // Log: Start categorization
      await addParsingLog(id, 'info', 'categorizing', `Catégorisation de ${validQuestions.length} questions avec Claude démarrée`);

      const savedQuestions = [];
      const BATCH_SIZE = 10; // Process 10 questions per API call

      // Process questions in batches for 90% faster categorization
      for (let batchStart = 0; batchStart < validQuestions.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, validQuestions.length);
        const batch = validQuestions.slice(batchStart, batchEnd);

        try {
          console.log(`[RFP ${id}] Categorizing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(validQuestions.length / BATCH_SIZE)} (questions ${batchStart + 1}-${batchEnd})`);

          // Categorize entire batch with ONE API call
          const categorizations = await categorizeQuestionsBatch(
            batch.map((q, idx) => ({
              questionText: q.questionText,
              index: idx
            }))
          );

          // Save all questions in this batch
          for (let i = 0; i < batch.length; i++) {
            const question = batch[i];
            const categorization = categorizations[i];

            try {
              const [saved] = await db
                .insert(rfpQuestions)
                .values({
                  rfpId: id,
                  sectionTitle: question.sectionTitle,
                  questionNumber: question.questionNumber,
                  questionText: question.questionText,
                  requiresAttachment: question.requiresAttachment || false,
                  wordLimit: question.wordLimit,
                  category: categorization.category,
                  tags: categorization.tags,
                  difficulty: categorization.difficulty,
                  estimatedMinutes: categorization.estimatedMinutes,
                  status: 'pending',
                  hasResponse: false,
                })
                .returning();

              savedQuestions.push(saved);
            } catch (dbError) {
              console.error(`[RFP ${id}] Failed to save question ${batchStart + i + 1}:`, dbError);
            }
          }

          // Update progress after each batch
          await db
            .update(rfps)
            .set({
              parsingProgressCurrent: batchEnd,
              updatedAt: new Date(),
            })
            .where(eq(rfps.id, id));

          console.log(`[RFP ${id}] Batch complete: ${batchEnd}/${validQuestions.length} questions categorized`);

          // Log batch progress
          await addParsingLog(
            id,
            'progress',
            'categorizing',
            `Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(validQuestions.length / BATCH_SIZE)} catégorisé`,
            {
              batchNumber: Math.floor(batchStart / BATCH_SIZE) + 1,
              totalBatches: Math.ceil(validQuestions.length / BATCH_SIZE),
              questionsInBatch: batch.length,
              totalCategorized: batchEnd,
            }
          );

          // Small delay between batches to avoid rate limits
          if (batchEnd < validQuestions.length) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`[RFP ${id}] Error processing batch ${batchStart}-${batchEnd}:`, error);

          // Fallback: save all questions in this batch with default categorization
          for (let i = 0; i < batch.length; i++) {
            const question = batch[i];

            try {
              const [saved] = await db
                .insert(rfpQuestions)
                .values({
                  rfpId: id,
                  sectionTitle: question.sectionTitle,
                  questionNumber: question.questionNumber,
                  questionText: question.questionText,
                  requiresAttachment: question.requiresAttachment || false,
                  wordLimit: question.wordLimit,
                  category: 'company_info',
                  tags: ['uncategorized'],
                  difficulty: 'medium',
                  estimatedMinutes: 15,
                  status: 'pending',
                  hasResponse: false,
                })
                .returning();

              savedQuestions.push(saved);
            } catch (dbError) {
              console.error(`[RFP ${id}] Failed to save question ${batchStart + i + 1} even with default values:`, dbError);
            }
          }
        }
      }

      // 9. Update RFP status
      await db
        .update(rfps)
        .set({
          parsingStatus: 'completed',
          parsedAt: new Date(),
          completionPercentage: 0, // No answers yet
          updatedAt: new Date(),
        })
        .where(eq(rfps.id, id));

      console.log(`[RFP ${id}] Parsing completed successfully`);

      // Log: Parsing completed
      await addParsingLog(id, 'success', 'completed', `✅ Analyse terminée avec succès: ${savedQuestions.length} questions extraites et catégorisées`, {
        totalQuestions: savedQuestions.length,
        duration: 'calculated_client_side',
      });

      return NextResponse.json({
        message: 'RFP parsed successfully',
        questionsExtracted: savedQuestions.length,
        questions: savedQuestions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          category: q.category,
          difficulty: q.difficulty,
        })),
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
