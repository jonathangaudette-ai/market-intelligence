import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { HistoryService } from "@/lib/pricing/history-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HistoryParams {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * GET /api/companies/[slug]/pricing/history
 *
 * Query parameters:
 * - days: number (default: 30) - how many days of history to fetch
 * - productId: string (optional) - get history for specific product only
 *
 * Returns:
 * - If productId provided: { history: [...] } - raw history for that product
 * - If no productId: { trends: [...] } - aggregated trends for dashboard chart
 */
export async function GET(
  request: NextRequest,
  { params }: HistoryParams
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const productId = searchParams.get("productId");

    // Validate company exists
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const historyService = new HistoryService();

    if (productId) {
      // Return raw history for a specific product
      const history = await historyService.getPriceHistory(productId, days);

      return NextResponse.json({
        productId,
        days,
        history,
        total: history.length,
      });
    } else {
      // Return aggregated trends for dashboard
      const trends = await historyService.getAggregatePriceTrends(company.id, days);

      return NextResponse.json({
        companyId: company.id,
        days,
        trends,
        total: trends.length,
      });
    }
  } catch (error) {
    console.error("Error fetching price history:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
