import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingProducts, pricingCompetitors, pricingMatches, pricingAlertEvents } from "@/db/schema";
import { eq, sql, and, gte, isNull } from "drizzle-orm";
import { pricingCache, getStatsCacheKey } from "@/lib/pricing/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StatsParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: StatsParams
) {
  try {
    const { slug } = await params;

    // Check cache first (TTL: 5 minutes)
    const cacheKey = getStatsCacheKey(slug);
    const cached = pricingCache.get(cacheKey);

    if (cached) {
      console.log(`[PricingStats] Cache HIT for ${slug}`);
      return NextResponse.json(cached);
    }

    console.log(`[PricingStats] Cache MISS for ${slug}, computing stats...`);

    // 1. Get company by slug
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

    // 2. Count total products (exclude soft-deleted)
    const totalProducts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          isNull(pricingProducts.deletedAt)
        )
      );

    // 3. Count tracked products (isActive = true, exclude soft-deleted)
    const trackedProducts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          eq(pricingProducts.isActive, true),
          isNull(pricingProducts.deletedAt)
        )
      );

    // 4. Count matched products (exclude soft-deleted)
    const matchedProducts = await db
      .select({ count: sql<number>`count(DISTINCT product_id)::int` })
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          isNull(pricingProducts.deletedAt)
        )
      );

    // 5. Count active competitors
    const activeCompetitors = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingCompetitors)
      .where(
        and(
          eq(pricingCompetitors.companyId, company.id),
          eq(pricingCompetitors.isActive, true)
        )
      );

    // 6. Calculate average price gap (exclude soft-deleted)
    const priceGaps = await db
      .select({
        yourPrice: pricingProducts.currentPrice,
        competitorPrice: pricingMatches.price,
      })
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          isNull(pricingProducts.deletedAt)
        )
      );

    let avgGap = 0;
    if (priceGaps.length > 0) {
      const gaps = priceGaps
        .filter(pg => pg.yourPrice && pg.competitorPrice)
        .map((pg) => {
          const yourPrice = parseFloat(pg.yourPrice as string);
          const competitorPrice = parseFloat(pg.competitorPrice as string);
          return ((yourPrice - competitorPrice) / competitorPrice) * 100;
        });

      if (gaps.length > 0) {
        avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      }
    }

    // 7. Count alerts in last 7 days (exclude soft-deleted)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const alertsLast7d = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingAlertEvents)
      .innerJoin(pricingProducts, eq(pricingAlertEvents.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          isNull(pricingProducts.deletedAt),
          gte(pricingAlertEvents.triggeredAt, sevenDaysAgo)
        )
      );

    // 8. Calculate market coverage
    const coverage =
      totalProducts[0].count > 0
        ? matchedProducts[0].count / totalProducts[0].count
        : 0;

    // 9. Calculate competitive advantage (average gap where we're cheaper)
    const cheaperProducts = priceGaps.filter(pg => {
      if (!pg.yourPrice || !pg.competitorPrice) return false;
      return parseFloat(pg.yourPrice as string) < parseFloat(pg.competitorPrice as string);
    });

    let competitiveAdvantage = 0;
    if (cheaperProducts.length > 0) {
      const advantages = cheaperProducts.map(pg => {
        const yourPrice = parseFloat(pg.yourPrice as string);
        const competitorPrice = parseFloat(pg.competitorPrice as string);
        return ((competitorPrice - yourPrice) / competitorPrice) * 100;
      });
      competitiveAdvantage = advantages.reduce((sum, adv) => sum + adv, 0) / advantages.length;
    }

    // 10. Build stats object
    const stats = {
      products: {
        total: totalProducts[0].count,
        tracked: trackedProducts[0].count,
        matched: matchedProducts[0].count,
        coverage,
      },
      pricing: {
        avgGap: parseFloat(avgGap.toFixed(2)),
        competitiveAdvantage: parseFloat(competitiveAdvantage.toFixed(2)),
        trend7d: 0, // TODO Phase 4: Calculate from price history
      },
      competitors: {
        active: activeCompetitors[0].count,
        total: activeCompetitors[0].count,
      },
      alerts: {
        last7d: alertsLast7d[0].count,
        trend: 0, // TODO Phase 4: Compare with previous 7 days
        critical: 0, // TODO Phase 4: Count severity='critical'
      },
    };

    // Cache for 5 minutes (300 seconds)
    pricingCache.set(cacheKey, stats, 300);
    console.log(`[PricingStats] Cached stats for ${slug} (TTL: 5min)`);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching pricing stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
