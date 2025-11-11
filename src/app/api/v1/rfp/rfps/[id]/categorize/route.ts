import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireRFPAuth } from '@/lib/rfp/auth';
import { categorizeQuestionsBatch } from '@/lib/rfp/ai/claude';

// Increase timeout to 13 minutes for categorization (separate from extraction)
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
 * POST /api/v1/rfp/rfps/[id]/categorize
 * Categorize extracted questions and save to database
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

    // 4. Check if status is "extracted"
    if (rfp.parsingStatus !== 'extracted') {
      return NextResponse.json(
        {
          error: `RFP must be in 'extracted' status. Current status: ${rfp.parsingStatus}`,
        },
        { status: 400 }
      );
    }

    // 5. Get extracted questions
    const extractedQuestions = rfp.extractedQuestions as any[];
    if (!extractedQuestions || extractedQuestions.length === 0) {
      return NextResponse.json(
        { error: 'No extracted questions found' },
        { status: 400 }
      );
    }

    console.log(`[RFP ${id}] Starting categorization of ${extractedQuestions.length} questions...`);

    // 6. Update status to processing categorization
    await db
      .update(rfps)
      .set({
        parsingStatus: 'processing', // IMPORTANT: Change status to prevent duplicate calls
        parsingStage: 'categorizing',
        parsingProgressCurrent: 0,
        parsingProgressTotal: extractedQuestions.length,
        updatedAt: new Date(),
      })
      .where(eq(rfps.id, id));

    // Log: Start categorization
    await addParsingLog(id, 'info', 'categorizing', `Catégorisation de ${extractedQuestions.length} questions avec Claude démarrée`);

    try {
      const savedQuestions = [];
      const BATCH_SIZE = 10; // Process 10 questions per API call

      // Process questions in batches for 90% faster categorization
      for (let batchStart = 0; batchStart < extractedQuestions.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, extractedQuestions.length);
        const batch = extractedQuestions.slice(batchStart, batchEnd);

        try {
          console.log(`[RFP ${id}] Categorizing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(extractedQuestions.length / BATCH_SIZE)} (questions ${batchStart + 1}-${batchEnd})`);

          // Categorize entire batch with ONE API call
          const categorizations = await categorizeQuestionsBatch(
            batch.map((q: any, idx: number) => ({
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

          console.log(`[RFP ${id}] Batch complete: ${batchEnd}/${extractedQuestions.length} questions categorized`);

          // Log batch progress
          await addParsingLog(
            id,
            'progress',
            'categorizing',
            `Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(extractedQuestions.length / BATCH_SIZE)} catégorisé`,
            {
              batchNumber: Math.floor(batchStart / BATCH_SIZE) + 1,
              totalBatches: Math.ceil(extractedQuestions.length / BATCH_SIZE),
              questionsInBatch: batch.length,
              totalCategorized: batchEnd,
            }
          );

          // Small delay between batches to avoid rate limits
          if (batchEnd < extractedQuestions.length) {
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

      // 7. Update RFP status to completed and clear extractedQuestions
      await db
        .update(rfps)
        .set({
          parsingStatus: 'completed',
          parsingStage: 'completed',
          extractedQuestions: null, // Clear temporary storage
          completionPercentage: 0, // No answers yet
          updatedAt: new Date(),
        })
        .where(eq(rfps.id, id));

      console.log(`[RFP ${id}] Categorization completed successfully`);

      // Log: Categorization completed
      await addParsingLog(id, 'success', 'completed', `✅ Catégorisation terminée avec succès: ${savedQuestions.length} questions catégorisées`, {
        totalQuestions: savedQuestions.length,
        duration: 'calculated_client_side',
      });

      return NextResponse.json({
        message: 'RFP categorization completed successfully',
        questionsExtracted: savedQuestions.length,
        questions: savedQuestions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          category: q.category,
          difficulty: q.difficulty,
        })),
      });
    } catch (categorizationError) {
      // Log: Error
      await addParsingLog(
        id,
        'error',
        'error',
        `❌ Erreur lors de la catégorisation: ${categorizationError instanceof Error ? categorizationError.message : 'Erreur inconnue'}`,
        {
          error: categorizationError instanceof Error ? categorizationError.message : 'Unknown error',
          stack: categorizationError instanceof Error ? categorizationError.stack : undefined,
        }
      );

      // Update RFP with error
      await db
        .update(rfps)
        .set({
          parsingStatus: 'failed',
          parsingError:
            categorizationError instanceof Error
              ? categorizationError.message
              : 'Unknown categorization error',
          updatedAt: new Date(),
        })
        .where(eq(rfps.id, id));

      throw categorizationError;
    }
  } catch (error) {
    console.error('[RFP Categorize Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to categorize RFP questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
