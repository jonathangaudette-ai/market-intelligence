import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfpResponses, rfps, companies } from '@/db/schema';
import { eq, inArray, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { z } from 'zod';
import type { CompanySettings } from '@/types/company';
import { getAIModelOrDefault } from '@/types/company';
import {
  generateResponseStreaming,
  checkRAGDataAvailability,
  convertToHtml,
  countWords,
  type StreamingGeneratorParams,
} from '@/lib/rfp/streaming-generator';

const BulkGenerateRequestSchema = z.object({
  questionIds: z.array(z.string()).min(1).max(10), // Hard limit: max 10 questions
  mode: z.enum(['standard', 'with_context', 'manual']).default('with_context'),
  depth: z.enum(['basic', 'advanced']).default('basic'),
});

/**
 * POST /api/companies/[slug]/rfps/[id]/questions/bulk-generate
 * Generate AI responses for multiple questions with Server-Sent Events (SSE) streaming
 *
 * This endpoint:
 * 1. Validates questionIds (max 10, belong to RFP, correct companyId)
 * 2. Processes questions sequentially
 * 3. Streams real-time progress via SSE events
 * 4. Saves each response immediately after generation
 * 5. Handles errors gracefully (continues with remaining questions)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;

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

    // Parse and validate request body
    const body = await request.json();
    const validation = BulkGenerateRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { questionIds, mode, depth } = validation.data;

    // Verify RFP exists and belongs to this company
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
      .where(eq(rfps.id, rfpId))
      .limit(1);

    if (!rfpWithCompany || rfpWithCompany.length === 0) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    const rfp = rfpWithCompany[0].rfp;
    const companySettings = rfpWithCompany[0].companySettings as CompanySettings | null;

    if (rfp.companyId !== companyContext.company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch all questions and verify they belong to this RFP
    const questions = await db
      .select({
        id: rfpQuestions.id,
        rfpId: rfpQuestions.rfpId,
        questionText: rfpQuestions.questionText,
        category: rfpQuestions.category,
        wordLimit: rfpQuestions.wordLimit,
        difficulty: rfpQuestions.difficulty,
        estimatedMinutes: rfpQuestions.estimatedMinutes,
        primaryContentType: rfpQuestions.primaryContentType,
        selectedSourceRfpId: rfpQuestions.selectedSourceRfpId,
        adaptationLevel: rfpQuestions.adaptationLevel,
        sectionTitle: rfpQuestions.sectionTitle,
        questionNumber: rfpQuestions.questionNumber,
      })
      .from(rfpQuestions)
      .where(
        and(
          inArray(rfpQuestions.id, questionIds),
          eq(rfpQuestions.rfpId, rfpId)
        )
      );

    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { error: 'Some questions not found or do not belong to this RFP' },
        { status: 400 }
      );
    }

    const aiModel = getAIModelOrDefault(companySettings);

    // Setup SSE (Server-Sent Events)
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper to send SSE event
    const sendEvent = async (data: any) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    // Process questions sequentially in background
    (async () => {
      try {
        let completedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];

          try {
            // Send question_start event
            await sendEvent({
              type: 'question_start',
              index: i + 1,
              total: questions.length,
              questionId: question.id,
              questionText: question.questionText,
              category: question.category,
              sectionTitle: question.sectionTitle,
              questionNumber: question.questionNumber,
            });

            // Check RAG data availability
            const availability = await checkRAGDataAvailability(
              question.questionText,
              question.category || 'general',
              rfp.companyId
            );

            if (!availability.isAvailable) {
              // Skip question - insufficient data
              await sendEvent({
                type: 'question_skipped',
                questionId: question.id,
                reason: availability.reason || 'Données insuffisantes',
              });
              skippedCount++;
              continue;
            }

            // Generate response with streaming
            const generatorParams: StreamingGeneratorParams = {
              question: {
                id: question.id,
                questionText: question.questionText,
                category: question.category,
                wordLimit: question.wordLimit,
                primaryContentType: question.primaryContentType,
                selectedSourceRfpId: question.selectedSourceRfpId,
                adaptationLevel: question.adaptationLevel,
              },
              rfp,
              companySettings,
              mode,
              depth,
            };

            let accumulatedText = '';

            // Stream chunks to client
            for await (const chunk of generateResponseStreaming(generatorParams)) {
              accumulatedText += chunk;

              await sendEvent({
                type: 'response_chunk',
                questionId: question.id,
                chunk,
                accumulated: accumulatedText,
              });
            }

            // Convert to HTML and count words
            const responseHtml = convertToHtml(accumulatedText);
            const wordCount = countWords(accumulatedText);

            // Check for existing responses to determine version
            const existingResponses = await db
              .select({ version: rfpResponses.version })
              .from(rfpResponses)
              .where(eq(rfpResponses.questionId, question.id))
              .orderBy(sql`${rfpResponses.version} DESC`)
              .limit(1);

            const nextVersion = existingResponses.length > 0 ? (existingResponses[0].version || 0) + 1 : 1;

            // Save response to database (real-time)
            const [savedResponse] = await db
              .insert(rfpResponses)
              .values({
                questionId: question.id,
                responseText: accumulatedText,
                responseHtml,
                wordCount,
                version: nextVersion,
                createdBy: session.user.id,
                wasAiGenerated: true,
                aiModel,
                status: 'draft',
                adaptationUsed: question.adaptationLevel || 'contextual',
                sourceRfpIds: question.selectedSourceRfpId ? [question.selectedSourceRfpId] : [],
              })
              .returning();

            // Update question status
            await db
              .update(rfpQuestions)
              .set({
                hasResponse: true,
                status: 'in_progress',
                updatedAt: new Date(),
              })
              .where(eq(rfpQuestions.id, question.id));

            // Update source RFP usage count if applicable
            if (question.selectedSourceRfpId) {
              await db
                .update(rfps)
                .set({
                  usageCount: sql`COALESCE(${rfps.usageCount}, 0) + 1`,
                  lastUsedAt: new Date(),
                })
                .where(eq(rfps.id, question.selectedSourceRfpId));
            }

            // Send question_completed event
            await sendEvent({
              type: 'question_completed',
              questionId: question.id,
              responseId: savedResponse.id,
              responseText: accumulatedText,
              wordCount,
              version: nextVersion,
            });

            completedCount++;
          } catch (error) {
            console.error(`[Bulk Generate] Error processing question ${question.id}:`, error);

            // Send error event but continue with remaining questions
            await sendEvent({
              type: 'question_error',
              questionId: question.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            errorCount++;
          }
        }

        // Send batch_completed event
        await sendEvent({
          type: 'batch_completed',
          totalProcessed: questions.length,
          completedCount,
          skippedCount,
          errorCount,
        });
      } catch (error) {
        console.error('[Bulk Generate] Fatal error:', error);
        await sendEvent({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        await writer.close();
      }
    })();

    // Return SSE response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering in nginx
      },
    });
  } catch (error) {
    console.error('[Bulk Generate Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to start bulk generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
