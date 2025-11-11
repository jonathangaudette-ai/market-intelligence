import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRFPAuth } from '@/lib/rfp/auth';
import { parseDocument } from '@/lib/rfp/parser/parser-service';
import { extractQuestionsInBatches, validateQuestions } from '@/lib/rfp/parser/question-extractor';
import { categorizeQuestion } from '@/lib/rfp/ai/claude';

// Increase timeout to 5 minutes for large RFP documents (requires Vercel Pro plan)
export const maxDuration = 300;

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
        updatedAt: new Date(),
      })
      .where(eq(rfps.id, id));

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

      const parsedDoc = await parseDocument(
        rfp.originalFileUrl!,
        rfp.fileType!
      );

      console.log(`[RFP ${id}] Document parsed, extracted ${parsedDoc.text.length} characters`);

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
          }
        }
      );

      const validQuestions = validateQuestions(extractedQuestions);
      console.log(`[RFP ${id}] Extracted ${validQuestions.length} questions`);

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

      const savedQuestions = [];

      for (let i = 0; i < validQuestions.length; i++) {
        const question = validQuestions[i];

        try {
          // Categorize question using Claude (with fallback to default)
          const categorization = await categorizeQuestion(question.questionText);

          // Save to database
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

          // Update progress every 5 questions
          if (i % 5 === 0 || i === validQuestions.length - 1) {
            await db
              .update(rfps)
              .set({
                parsingProgressCurrent: i + 1,
                updatedAt: new Date(),
              })
              .where(eq(rfps.id, id));

            console.log(`[RFP ${id}] Categorized ${i + 1}/${validQuestions.length} questions`);
          }

          // Optimized delay for speed while avoiding rate limits (100ms)
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[RFP ${id}] Error processing question ${i + 1}:`, error);

          // Save question with default categorization if categorization fails completely
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
            console.error(`[RFP ${id}] Failed to save question ${i + 1} even with default values:`, dbError);
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
