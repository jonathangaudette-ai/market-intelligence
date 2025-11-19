import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingHistory, pricingProducts, pricingMatches, pricingCompetitors } from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HistoryParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: HistoryParams
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const productId = searchParams.get("productId");

    // 1. Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 2. Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // 3. Build query - get price history with product and competitor info
    const conditions = [
      eq(pricingProducts.companyId, company.id),
      gte(pricingHistory.recordedAt, dateThreshold),
    ];

    if (productId) {
      conditions.push(eq(pricingHistory.matchId, productId));
    }

    // 4. Fetch history with joins
    const history = await db
      .select({
        id: pricingHistory.id,
        matchId: pricingHistory.matchId,
        productId: pricingProducts.id,
        productName: pricingProducts.name,
        price: pricingHistory.price,
        competitorId: pricingMatches.competitorId,
        competitorName: pricingCompetitors.name,
        recordedAt: pricingHistory.recordedAt,
        inStock: pricingHistory.inStock,
        promoActive: pricingHistory.promoActive,
      })
      .from(pricingHistory)
      .innerJoin(pricingMatches, eq(pricingHistory.matchId, pricingMatches.id))
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .innerJoin(pricingCompetitors, eq(pricingMatches.competitorId, pricingCompetitors.id))
      .where(and(...conditions))
      .orderBy(desc(pricingHistory.recordedAt))
      .limit(1000);

    // 5. Also get "your" price history (current prices from products table over time)
    // For MVP, we'll use the current price as a constant line
    // In Phase 4+, we'll track product price changes separately
    const yourProducts = await db
      .select({
        id: pricingProducts.id,
        name: pricingProducts.name,
        currentPrice: pricingProducts.currentPrice,
        updatedAt: pricingProducts.updatedAt,
      })
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          eq(pricingProducts.isActive, true)
        )
      )
      .limit(100);

    return NextResponse.json({
      history,
      yourProducts,
      meta: {
        days,
        productId,
        recordCount: history.length,
      }
    });
  } catch (error) {
    console.error("Error fetching pricing history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
