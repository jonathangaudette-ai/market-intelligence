import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/db";
import { signals, documents, competitors } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { formatRelativeTime } from "@/lib/utils/formatting";

/**
 * GET /api/companies/[slug]/signals
 * Returns list of detected signals for the company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1. Verify authentication using middleware
    const { slug } = await params;
    const authResult = await requireAuth("viewer", slug);
    if (!authResult.success) return authResult.error;

    const { company } = authResult.data;

    // 2. Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "new" | "reviewed" | "archived" | null;
    const type = searchParams.get("type");
    const severity = searchParams.get("severity") as "low" | "medium" | "high" | null;

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // 3. Build WHERE conditions for SQL filtering (OPTIMIZED - no in-memory filtering)
    const whereConditions = [eq(signals.companyId, company.company.id)];

    if (status) {
      whereConditions.push(eq(signals.status, status));
    }

    if (type) {
      whereConditions.push(eq(signals.type, type));
    }

    if (severity) {
      whereConditions.push(eq(signals.severity, severity));
    }

    // 4. Get total count for pagination
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(signals)
      .where(and(...whereConditions));

    // 5. Execute optimized query with SQL-level filtering + pagination
    const results = await db
      .select({
        // Signal fields
        id: signals.id,
        type: signals.type,
        severity: signals.severity,
        summary: signals.summary,
        details: signals.details,
        relatedEntities: signals.relatedEntities,
        status: signals.status,
        createdAt: signals.createdAt,
        updatedAt: signals.updatedAt,

        // Document info
        document: {
          id: documents.id,
          name: documents.name,
          type: documents.type,
        },

        // Competitor info (if linked)
        competitor: {
          id: competitors.id,
          name: competitors.name,
        },
      })
      .from(signals)
      .leftJoin(documents, eq(signals.documentId, documents.id))
      .leftJoin(competitors, eq(signals.competitorId, competitors.id))
      .where(and(...whereConditions))
      .orderBy(desc(signals.createdAt))
      .limit(limit)
      .offset(offset);

    // 5. Transform results
    const transformedSignals = results.map((signal) => ({
      id: signal.id,
      type: signal.type,
      severity: signal.severity,
      summary: signal.summary,
      details: signal.details,
      relatedEntities: signal.relatedEntities as string[],
      status: signal.status,
      createdAt: signal.createdAt,
      updatedAt: signal.updatedAt,
      document: signal.document,
      competitor: signal.competitor,
      timeAgo: formatRelativeTime(signal.createdAt),
    }));

    // 6. Calculate signal stats (from already filtered results)
    const stats = {
      total: results.length,
      new: results.filter((s) => s.status === "new").length,
      reviewed: results.filter((s) => s.status === "reviewed").length,
      archived: results.filter((s) => s.status === "archived").length,
      byType: {
        competitor_mention: results.filter((s) => s.type === "competitor_mention").length,
        price_change: results.filter((s) => s.type === "price_change").length,
        hiring_spike: results.filter((s) => s.type === "hiring_spike").length,
        new_product: results.filter((s) => s.type === "new_product").length,
        contract_win: results.filter((s) => s.type === "contract_win").length,
      },
      bySeverity: {
        low: results.filter((s) => s.severity === "low").length,
        medium: results.filter((s) => s.severity === "medium").length,
        high: results.filter((s) => s.severity === "high").length,
      },
    };

    return NextResponse.json({
      signals: transformedSignals,
      stats,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / limit),
        hasNext: page < Math.ceil(totalCount.count / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Signals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
