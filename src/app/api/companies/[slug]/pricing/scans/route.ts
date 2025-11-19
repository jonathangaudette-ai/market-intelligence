import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingScans } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ScrapingService } from "@/lib/pricing/scraping-service";

interface ScansParams {
  params: Promise<{
    slug: string;
  }>;
}

// POST /api/companies/[slug]/pricing/scans
// Trigger a scraping job (single competitor or all)
export async function POST(
  request: NextRequest,
  { params }: ScansParams
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
      // Scrape single competitor
      const result = await scrapingService.scrapeCompetitor(body.competitorId);

      return NextResponse.json({
        success: result.success,
        scanId: result.scanId,
        productsScraped: result.productsScraped,
        productsFailed: result.productsFailed,
        errors: result.errors,
      });
    } else {
      // Scrape all active competitors
      const result = await scrapingService.scrapeAllCompetitors(company.id);

      return NextResponse.json({
        success: true,
        message: `Scan completed for ${result.totalCompetitors} competitors`,
        totalCompetitors: result.totalCompetitors,
        successfulScans: result.successfulScans,
        failedScans: result.failedScans,
      });
    }
  } catch (error: any) {
    console.error("Error triggering scan:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/companies/[slug]/pricing/scans
// Fetch scan history
export async function GET(
  request: NextRequest,
  { params }: ScansParams
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Fetch recent scans
    const scans = await db
      .select()
      .from(pricingScans)
      .where(eq(pricingScans.companyId, company.id))
      .orderBy(desc(pricingScans.createdAt))
      .limit(limit);

    return NextResponse.json({ scans });
  } catch (error: any) {
    console.error("Error fetching scans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
