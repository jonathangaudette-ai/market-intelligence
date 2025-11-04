import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/db";
import { documents, signals, conversations, messages, competitors } from "@/db/schema";
import { eq, and, gte, count, sql, desc } from "drizzle-orm";

/**
 * GET /api/companies/[slug]/analytics
 * Returns comprehensive analytics and statistics for the company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1. Verify authentication
    const { slug } = await params;
    const authResult = await requireAuth("viewer", slug);
    if (!authResult.success) return authResult.error;

    const { company } = authResult.data;

    // 2. Get time range from query params
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d"; // 7d, 30d, 90d, all

    // Calculate date threshold
    const now = new Date();
    let dateThreshold: Date | null = null;

    switch (range) {
      case "7d":
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        dateThreshold = null;
    }

    const companyId = company.company.id;

    // 3. Document Statistics
    const documentStats = await db
      .select({
        total: count(),
        status: documents.status,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          dateThreshold ? gte(documents.createdAt, dateThreshold) : undefined
        )
      )
      .groupBy(documents.status);

    const documentsByType = await db
      .select({
        count: count(),
        type: documents.documentType,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, companyId),
          dateThreshold ? gte(documents.createdAt, dateThreshold) : undefined
        )
      )
      .groupBy(documents.documentType);

    // 4. Signal Statistics
    const signalStats = await db
      .select({
        count: count(),
        status: signals.status,
        severity: signals.severity,
      })
      .from(signals)
      .where(
        and(
          eq(signals.companyId, companyId),
          dateThreshold ? gte(signals.createdAt, dateThreshold) : undefined
        )
      )
      .groupBy(signals.status, signals.severity);

    const signalsByType = await db
      .select({
        count: count(),
        type: signals.type,
      })
      .from(signals)
      .where(
        and(
          eq(signals.companyId, companyId),
          dateThreshold ? gte(signals.createdAt, dateThreshold) : undefined
        )
      )
      .groupBy(signals.type);

    // 5. Recent Activity (last 10 documents and signals)
    const recentDocuments = await db
      .select({
        id: documents.id,
        name: documents.name,
        type: documents.type,
        status: documents.status,
        createdAt: documents.createdAt,
        documentType: documents.documentType,
      })
      .from(documents)
      .where(eq(documents.companyId, companyId))
      .orderBy(desc(documents.createdAt))
      .limit(10);

    const recentSignals = await db
      .select({
        id: signals.id,
        type: signals.type,
        severity: signals.severity,
        summary: signals.summary,
        status: signals.status,
        createdAt: signals.createdAt,
      })
      .from(signals)
      .where(eq(signals.companyId, companyId))
      .orderBy(desc(signals.createdAt))
      .limit(10);

    // 6. Conversation Statistics
    const conversationCount = await db
      .select({ count: count() })
      .from(conversations)
      .where(eq(conversations.companyId, companyId));

    const messageCount = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.companyId, companyId));

    // 7. Competitor Coverage
    const competitorCount = await db
      .select({ count: count() })
      .from(competitors)
      .where(and(
        eq(competitors.companyId, companyId),
        eq(competitors.isActive, true)
      ));

    const documentsPerCompetitor = await db
      .select({
        count: count(),
        competitorId: documents.competitorId,
        competitorName: competitors.name,
      })
      .from(documents)
      .leftJoin(competitors, eq(documents.competitorId, competitors.id))
      .where(eq(documents.companyId, companyId))
      .groupBy(documents.competitorId, competitors.name);

    // 8. Processing Performance
    const processingStats = await db
      .select({
        totalChunks: sql<number>`SUM(${documents.totalChunks})`,
        avgChunks: sql<number>`AVG(${documents.totalChunks})`,
        vectorsCreatedCount: sql<number>`COUNT(CASE WHEN ${documents.vectorsCreated} = true THEN 1 END)`,
        analysisCompletedCount: sql<number>`COUNT(CASE WHEN ${documents.analysisCompleted} = true THEN 1 END)`,
      })
      .from(documents)
      .where(eq(documents.companyId, companyId));

    // 9. Transform and return analytics
    const analytics = {
      timeRange: range,
      generatedAt: new Date().toISOString(),

      documents: {
        total: documentStats.reduce((sum, s) => sum + s.total, 0),
        byStatus: Object.fromEntries(
          documentStats.map(s => [s.status || "unknown", s.total])
        ),
        byType: Object.fromEntries(
          documentsByType.map(s => [s.type || "unknown", s.count])
        ),
        processing: processingStats[0] || {},
      },

      signals: {
        total: signalStats.reduce((sum, s) => sum + s.count, 0),
        byStatus: signalStats.reduce((acc, s) => {
          const status = s.status || "unknown";
          acc[status] = (acc[status] || 0) + s.count;
          return acc;
        }, {} as Record<string, number>),
        bySeverity: signalStats.reduce((acc, s) => {
          const severity = s.severity || "unknown";
          acc[severity] = (acc[severity] || 0) + s.count;
          return acc;
        }, {} as Record<string, number>),
        byType: Object.fromEntries(
          signalsByType.map(s => [s.type || "unknown", s.count])
        ),
      },

      conversations: {
        total: conversationCount[0]?.count || 0,
        totalMessages: messageCount[0]?.count || 0,
        avgMessagesPerConversation:
          conversationCount[0]?.count > 0
            ? Math.round((messageCount[0]?.count || 0) / conversationCount[0].count)
            : 0,
      },

      competitors: {
        active: competitorCount[0]?.count || 0,
        coverage: documentsPerCompetitor
          .filter(d => d.competitorId)
          .map(d => ({
            competitorName: d.competitorName || "Unknown",
            documentCount: d.count,
          })),
      },

      recentActivity: {
        documents: recentDocuments.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          status: d.status,
          createdAt: d.createdAt,
          documentType: d.documentType,
        })),
        signals: recentSignals.map(s => ({
          id: s.id,
          type: s.type,
          severity: s.severity,
          summary: s.summary,
          status: s.status,
          createdAt: s.createdAt,
        })),
      },
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
