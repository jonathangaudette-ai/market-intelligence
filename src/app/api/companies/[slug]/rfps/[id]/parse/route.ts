import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireRFPAuthWithSlug } from '@/lib/rfp/auth';
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

      const extractedQuestions = await extractQuestionsInBatches(
        parsedDoc.text,
        {
          onProgress: async (current, total, questionsFound, newQuestions) => {
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

            console.log(`[RFP ${id}] Progress: ${current}/${total} batches, ${questionsFound} questions extracted (${newQuestions.length} in this batch)`);

            // Log: Batch progress with newly extracted questions for real-time preview
            await addParsingLog(
              id,
              'progress',
              'extracting',
              `Batch ${current}/${total} traité`,
              {
                batchNumber: current,
                totalBatches: total,
                questionsFound: questionsFound,
                questions: newQuestions, // Include actual questions for real-time preview
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
