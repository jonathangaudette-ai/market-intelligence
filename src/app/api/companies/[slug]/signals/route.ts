import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany } from "@/lib/auth/helpers";
import { db } from "@/db";
import { signals, documents, competitors } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * GET /api/companies/[slug]/signals
 * Returns list of detected signals for the company
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

    // 4. Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // new, reviewed, archived
    const type = searchParams.get("type"); // competitor_mention, price_change, etc.
    const severity = searchParams.get("severity"); // low, medium, high
    const limit = parseInt(searchParams.get("limit") || "50");

    // 5. Build query with joins
    let query = db
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
      .where(eq(signals.companyId, currentCompany.company.id))
      .orderBy(desc(signals.createdAt))
      .limit(limit);

    const results = await query;

    // 6. Filter results in memory (simpler for now)
    let filteredResults = results;

    if (status) {
      filteredResults = filteredResults.filter((s) => s.status === status);
    }

    if (type) {
      filteredResults = filteredResults.filter((s) => s.type === type);
    }

    if (severity) {
      filteredResults = filteredResults.filter((s) => s.severity === severity);
    }

    // 7. Transform results
    const transformedSignals = filteredResults.map((signal) => ({
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

    // 8. Calculate signal stats
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
    });
  } catch (error) {
    console.error("Signals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  }
  const months = Math.floor(diffDays / 30);
  return `Il y a ${months} mois`;
}
