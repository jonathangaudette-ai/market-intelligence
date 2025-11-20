import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingCompetitors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ScrapingService } from "@/lib/pricing/scraping-service";

interface DiscoverParams {
  params: Promise<{
    slug: string;
  }>;
}

// POST /api/companies/[slug]/pricing/discover
// Discover product URLs using GPT-5 Search (without scraping prices)
export async function POST(
  request: NextRequest,
  { params }: DiscoverParams
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const scrapingService = new ScrapingService();

    if (body.competitorId) {
      // Discover URLs for single competitor (optionally for a specific product)
      const result = await scrapingService.discoverUrls(
        body.competitorId,
        body.productId // Optional: if provided, discover only for this product
      );

      return NextResponse.json({
        success: result.success,
        urlsDiscovered: result.urlsDiscovered,
        urlsFailed: result.urlsFailed,
        discoveredUrls: result.discoveredUrls,
      });
    } else if (body.productId) {
      // Discover URLs for a specific product across all active competitors
      const competitors = await db
        .select()
        .from(pricingCompetitors)
        .where(
          and(
            eq(pricingCompetitors.companyId, company.id),
            eq(pricingCompetitors.isActive, true)
          )
        );

      const results = [];
      let totalDiscovered = 0;
      let totalFailed = 0;

      for (const competitor of competitors) {
        try {
          const result = await scrapingService.discoverUrls(
            competitor.id,
            body.productId
          );

          totalDiscovered += result.urlsDiscovered;
          totalFailed += result.urlsFailed;

          results.push({
            competitorId: competitor.id,
            competitorName: competitor.name,
            ...result,
          });
        } catch (error: any) {
          console.error(`Error discovering URLs for ${competitor.name}:`, error);
          results.push({
            competitorId: competitor.id,
            competitorName: competitor.name,
            success: false,
            error: error.message,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Discovery completed for product ${body.productId}`,
        totalCompetitors: competitors.length,
        totalUrlsDiscovered: totalDiscovered,
        totalUrlsFailed: totalFailed,
        results,
      });
    } else {
      return NextResponse.json(
        { error: "Either competitorId or productId must be provided" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error discovering URLs:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
