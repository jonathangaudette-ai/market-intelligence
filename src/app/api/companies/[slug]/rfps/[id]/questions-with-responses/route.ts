import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfpResponses, rfps, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireRFPAuthWithSlug } from '@/lib/rfp/auth';

/**
 * GET /api/companies/[slug]/rfps/[id]/questions-with-responses
 * Get all questions WITH their latest responses for a historical RFP
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    // 1. Authentication with slug
    const authResult = await requireRFPAuthWithSlug(slug);
    if (authResult.error) return authResult.error;

    const { user, company } = authResult;

    // 2. Get RFP to verify ownership
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

    // 4. Get all questions for this RFP
    const questions = await db
      .select()
      .from(rfpQuestions)
      .where(eq(rfpQuestions.rfpId, id))
      .orderBy(rfpQuestions.questionNumber);

    // 5. Get latest response for each question
    const questionsWithResponses = await Promise.all(
      questions.map(async (question) => {
        const [latestResponse] = await db
          .select({
            id: rfpResponses.id,
            responseText: rfpResponses.responseText,
            responseHtml: rfpResponses.responseHtml,
            wordCount: rfpResponses.wordCount,
            wasAiGenerated: rfpResponses.wasAiGenerated,
            aiModel: rfpResponses.aiModel,
            sourcesUsed: rfpResponses.sourcesUsed,
            sourceRfpIds: rfpResponses.sourceRfpIds,
            confidenceScore: rfpResponses.confidenceScore,
            adaptationUsed: rfpResponses.adaptationUsed,
            version: rfpResponses.version,
            status: rfpResponses.status,
            createdAt: rfpResponses.createdAt,
            updatedAt: rfpResponses.updatedAt,
            reviewedBy: rfpResponses.reviewedBy,
            reviewedAt: rfpResponses.reviewedAt,
            reviewNotes: rfpResponses.reviewNotes,
            createdBy: rfpResponses.createdBy,
            createdByUser: {
              id: users.id,
              name: users.name,
              email: users.email,
            },
          })
          .from(rfpResponses)
          .leftJoin(users, eq(rfpResponses.createdBy, users.id))
          .where(eq(rfpResponses.questionId, question.id))
          .orderBy(desc(rfpResponses.version))
          .limit(1);

        return {
          ...question,
          response: latestResponse || null,
        };
      })
    );

    // 6. Calculate stats
    const stats = {
      total: questions.length,
      withResponses: questionsWithResponses.filter((q) => q.response).length,
      withoutResponses: questionsWithResponses.filter((q) => !q.response).length,
      avgWordCount:
        questionsWithResponses.filter((q) => q.response).length > 0
          ? Math.round(
              questionsWithResponses
                .filter((q) => q.response)
                .reduce((sum, q) => sum + (q.response?.wordCount || 0), 0) /
                questionsWithResponses.filter((q) => q.response).length
            )
          : 0,
      byContentType: questionsWithResponses.reduce((acc, q) => {
        const type = q.primaryContentType || 'uncategorized';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      aiGenerated: questionsWithResponses.filter(
        (q) => q.response?.wasAiGenerated
      ).length,
    };

    return NextResponse.json({
      questions: questionsWithResponses,
      stats,
      rfp: {
        id: rfp.id,
        title: rfp.title,
        clientName: rfp.clientName,
        isHistorical: rfp.isHistorical,
        result: rfp.result,
        qualityScore: rfp.qualityScore,
      },
    });
  } catch (error) {
    console.error('[RFP Questions With Responses Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to get RFP questions with responses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
