import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany } from "@/lib/auth/helpers";
import { db } from "@/db";
import { rfps, rfpQuestions, rfpResponses, documents } from "@/db/schema";
import { eq, sql, and, lt, gte, isNotNull } from "drizzle-orm";

/**
 * GET /api/companies/[slug]/rfp-stats
 * Returns RFP-focused dashboard statistics for the company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1. Verify authentication
    const { error: authError, session } = await verifyAuth();
    if (!session) return authError;

    // 2. Verify company context
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) {
      return NextResponse.json({ error: "No active company" }, { status: 403 });
    }

    // 3. Verify company slug matches
    const { slug } = await params;
    if (currentCompany.company.slug !== slug) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    const companyId = currentCompany.company.id;

    // 4. Calculate date ranges
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // 5. Get all RFP stats in parallel
    const [
      // Active RFPs (pipeline)
      activeRfpStats,
      urgentRfps,

      // Questions & Responses
      questionsStats,
      responsesStats,

      // Documents (support library)
      documentsStats,

      // Historical Performance
      historicalStats,

      // Recent won/lost for win rate calculation
      recentResults,
    ] = await Promise.all([
      // Active RFPs: count, sum of deal value, avg completion
      db
        .select({
          count: sql<number>`count(*)::int`,
          totalValue: sql<number>`coalesce(sum(${rfps.estimatedDealValue}), 0)::int`,
          avgCompletion: sql<number>`coalesce(avg(${rfps.completionPercentage}), 0)::int`,
        })
        .from(rfps)
        .where(
          and(
            eq(rfps.companyId, companyId),
            eq(rfps.isHistorical, false)
          )
        )
        .then((r) => r[0] || { count: 0, totalValue: 0, avgCompletion: 0 }),

      // Urgent RFPs (deadline < 7 days)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(rfps)
        .where(
          and(
            eq(rfps.companyId, companyId),
            eq(rfps.isHistorical, false),
            isNotNull(rfps.submissionDeadline),
            lt(rfps.submissionDeadline, sevenDaysFromNow),
            gte(rfps.submissionDeadline, now)
          )
        )
        .then((r) => r[0]?.count || 0),

      // Questions stats (for active RFPs)
      db
        .select({
          total: sql<number>`count(*)::int`,
          answered: sql<number>`count(*) filter (where ${rfpQuestions.hasResponse} = true)::int`,
        })
        .from(rfpQuestions)
        .innerJoin(rfps, eq(rfpQuestions.rfpId, rfps.id))
        .where(
          and(
            eq(rfps.companyId, companyId),
            eq(rfps.isHistorical, false)
          )
        )
        .then((r) => r[0] || { total: 0, answered: 0 }),

      // Responses stats (AI generation, confidence, review status)
      db
        .select({
          aiGenerated: sql<number>`count(*) filter (where ${rfpResponses.wasAiGenerated} = true)::int`,
          total: sql<number>`count(*)::int`,
          avgConfidence: sql<number>`coalesce(avg(${rfpResponses.confidenceScore}), 0)::int`,
          pendingReview: sql<number>`count(*) filter (where ${rfpResponses.status} = 'in_review')::int`,
        })
        .from(rfpResponses)
        .innerJoin(rfpQuestions, eq(rfpResponses.questionId, rfpQuestions.id))
        .innerJoin(rfps, eq(rfpQuestions.rfpId, rfps.id))
        .where(
          and(
            eq(rfps.companyId, companyId),
            eq(rfps.isHistorical, false)
          )
        )
        .then((r) => r[0] || { aiGenerated: 0, total: 0, avgConfidence: 0, pendingReview: 0 }),

      // Documents stats (support library)
      db
        .select({
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${documents.status} = 'completed')::int`,
          processing: sql<number>`count(*) filter (where ${documents.status} = 'processing')::int`,
          failed: sql<number>`count(*) filter (where ${documents.status} = 'failed')::int`,
          avgConfidence: sql<number>`coalesce(avg(${documents.analysisConfidence}), 0)::int`,
          totalChunks: sql<number>`coalesce(sum(${documents.totalChunks}), 0)::int`,
        })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.documentPurpose, "rfp_support")
          )
        )
        .then((r) => r[0] || {
          total: 0,
          completed: 0,
          processing: 0,
          failed: 0,
          avgConfidence: 0,
          totalChunks: 0
        }),

      // Historical RFPs stats
      db
        .select({
          total: sql<number>`count(*)::int`,
          won: sql<number>`count(*) filter (where ${rfps.result} = 'won')::int`,
          lost: sql<number>`count(*) filter (where ${rfps.result} = 'lost')::int`,
          totalDealValue: sql<number>`coalesce(sum(case when ${rfps.result} = 'won' then ${rfps.dealValue} else 0 end), 0)::int`,
          avgQualityScore: sql<number>`coalesce(avg(${rfps.qualityScore}), 0)::int`,
          totalUsage: sql<number>`coalesce(sum(${rfps.usageCount}), 0)::int`,
        })
        .from(rfps)
        .where(
          and(
            eq(rfps.companyId, companyId),
            eq(rfps.isHistorical, true)
          )
        )
        .then((r) => r[0] || {
          total: 0,
          won: 0,
          lost: 0,
          totalDealValue: 0,
          avgQualityScore: 0,
          totalUsage: 0
        }),

      // Recent results for win rate (last 90 days)
      db
        .select({
          won: sql<number>`count(*) filter (where ${rfps.result} = 'won')::int`,
          lost: sql<number>`count(*) filter (where ${rfps.result} = 'lost')::int`,
        })
        .from(rfps)
        .where(
          and(
            eq(rfps.companyId, companyId),
            isNotNull(rfps.resultRecordedAt),
            gte(rfps.resultRecordedAt, ninetyDaysAgo)
          )
        )
        .then((r) => r[0] || { won: 0, lost: 0 }),
    ]);

    // 6. Calculate derived metrics
    const totalQuestions = questionsStats.total;
    const answeredQuestions = questionsStats.answered;
    const pendingQuestions = totalQuestions - answeredQuestions;

    const aiGeneratedPercent = responsesStats.total > 0
      ? Math.round((responsesStats.aiGenerated / responsesStats.total) * 100)
      : 0;

    const historicalWinRate = (historicalStats.won + historicalStats.lost) > 0
      ? Math.round((historicalStats.won / (historicalStats.won + historicalStats.lost)) * 100)
      : 0;

    const recentWinRate = (recentResults.won + recentResults.lost) > 0
      ? Math.round((recentResults.won / (recentResults.won + recentResults.lost)) * 100)
      : 0;

    const avgDealSize = historicalStats.won > 0
      ? Math.round(historicalStats.totalDealValue / historicalStats.won)
      : 0;

    // 7. Return comprehensive RFP stats
    return NextResponse.json({
      pipeline: {
        activeRfps: activeRfpStats.count,
        totalValue: activeRfpStats.totalValue,
        avgCompletion: activeRfpStats.avgCompletion,
        urgentCount: urgentRfps,
      },
      questions: {
        total: totalQuestions,
        answered: answeredQuestions,
        pending: pendingQuestions,
        aiGeneratedPercent: aiGeneratedPercent,
        avgConfidence: responsesStats.avgConfidence,
        pendingReview: responsesStats.pendingReview,
      },
      documents: {
        total: documentsStats.total,
        completed: documentsStats.completed,
        processing: documentsStats.processing,
        failed: documentsStats.failed,
        avgConfidence: documentsStats.avgConfidence,
        totalChunks: documentsStats.totalChunks,
      },
      historical: {
        total: historicalStats.total,
        won: historicalStats.won,
        lost: historicalStats.lost,
        winRate: historicalWinRate,
        totalDealValue: historicalStats.totalDealValue,
        avgDealSize: avgDealSize,
        avgQualityScore: historicalStats.avgQualityScore,
        totalReuse: historicalStats.totalUsage,
      },
      winRate: {
        current: recentWinRate,
        historical: historicalWinRate,
        recentWon: recentResults.won,
        recentLost: recentResults.lost,
        period: "90 days",
      },
    });
  } catch (error) {
    console.error("RFP Stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
