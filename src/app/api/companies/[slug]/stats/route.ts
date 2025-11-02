import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents, messages, competitors, signals, conversations } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

/**
 * GET /api/companies/[slug]/stats
 * Returns dashboard statistics for the company
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
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    // 5. Get all stats in parallel
    const [
      // Messages stats
      currentMonthMessages,
      previousMonthMessages,

      // Documents stats
      totalDocuments,
      currentMonthDocuments,
      completedDocuments,
      processingDocuments,
      failedDocuments,

      // Competitors stats
      activeCompetitors,

      // Signals stats
      totalSignals,
      newSignals,

      // Conversations stats
      totalConversations,
    ] = await Promise.all([
      // Messages: current month
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.companyId, companyId),
            gte(messages.createdAt, oneMonthAgo)
          )
        )
        .then((r) => r[0]?.count || 0),

      // Messages: previous month
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.companyId, companyId),
            gte(messages.createdAt, twoMonthsAgo),
            sql`${messages.createdAt} < ${oneMonthAgo}`
          )
        )
        .then((r) => r[0]?.count || 0),

      // Documents: total
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(eq(documents.companyId, companyId))
        .then((r) => r[0]?.count || 0),

      // Documents: current month
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            gte(documents.createdAt, oneMonthAgo)
          )
        )
        .then((r) => r[0]?.count || 0),

      // Documents: completed
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.status, "completed")
          )
        )
        .then((r) => r[0]?.count || 0),

      // Documents: processing
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.status, "processing")
          )
        )
        .then((r) => r[0]?.count || 0),

      // Documents: failed
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.status, "failed")
          )
        )
        .then((r) => r[0]?.count || 0),

      // Competitors: active
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(competitors)
        .where(
          and(
            eq(competitors.companyId, companyId),
            eq(competitors.isActive, true)
          )
        )
        .then((r) => r[0]?.count || 0),

      // Signals: total
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(signals)
        .where(eq(signals.companyId, companyId))
        .then((r) => r[0]?.count || 0),

      // Signals: new (status = 'new')
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(signals)
        .where(
          and(
            eq(signals.companyId, companyId),
            eq(signals.status, "new")
          )
        )
        .then((r) => r[0]?.count || 0),

      // Conversations: total
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(eq(conversations.companyId, companyId))
        .then((r) => r[0]?.count || 0),
    ]);

    // 6. Calculate changes and percentages
    const messagesChange = previousMonthMessages > 0
      ? Math.round(((currentMonthMessages - previousMonthMessages) / previousMonthMessages) * 100)
      : currentMonthMessages > 0 ? 100 : 0;

    // 7. Return stats
    return NextResponse.json({
      messages: {
        current: currentMonthMessages,
        previous: previousMonthMessages,
        change: messagesChange,
        trend: messagesChange >= 0 ? "up" : "down",
      },
      documents: {
        total: totalDocuments,
        currentMonth: currentMonthDocuments,
        completed: completedDocuments,
        processing: processingDocuments,
        failed: failedDocuments,
        change: currentMonthDocuments,
        trend: "up",
      },
      competitors: {
        active: activeCompetitors,
        total: activeCompetitors, // Could track inactive separately
      },
      signals: {
        total: totalSignals,
        new: newSignals,
        reviewed: totalSignals - newSignals,
      },
      conversations: {
        total: totalConversations,
      },
      // Calculated metrics
      responseRate: completedDocuments > 0 && totalDocuments > 0
        ? Math.round((completedDocuments / totalDocuments) * 100)
        : 0,
      // Average processing time (mock for now - would need to track in DB)
      avgProcessingTime: "2.3s",
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
