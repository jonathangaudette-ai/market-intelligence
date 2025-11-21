import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pricingCompetitors, pricingMatches } from "@/db/schema-pricing";
import { companies } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getDefaultScrapingBeeConfig } from "@/lib/pricing/scraper-defaults";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get all competitors with their match counts
    const competitors = await db
      .select({
        id: pricingCompetitors.id,
        name: pricingCompetitors.name,
        websiteUrl: pricingCompetitors.websiteUrl,
        isActive: pricingCompetitors.isActive,
        scanFrequency: pricingCompetitors.scanFrequency,
        lastScanAt: pricingCompetitors.lastScanAt,
        createdAt: pricingCompetitors.createdAt,
        productsMatched: sql<number>`(
          SELECT COUNT(DISTINCT ${pricingMatches.productId})
          FROM ${pricingMatches}
          WHERE ${pricingMatches.competitorId} = ${pricingCompetitors.id}
        )`,
      })
      .from(pricingCompetitors)
      .where(eq(pricingCompetitors.companySlug, slug));

    return NextResponse.json({ competitors });
  } catch (error: any) {
    console.error("Error fetching competitors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const { name, websiteUrl, scanFrequency, isActive } = body;

    // Validate required fields
    if (!name || !websiteUrl) {
      return NextResponse.json(
        { error: "Name and website URL are required" },
        { status: 400 }
      );
    }

    // Get company to verify it exists and get companyId
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Create competitor with default ScrapingBee configuration
    const defaultConfig = getDefaultScrapingBeeConfig();

    const [newCompetitor] = await db
      .insert(pricingCompetitors)
      .values({
        companyId: company.id,
        companySlug: slug,
        name,
        websiteUrl,
        scanFrequency: scanFrequency || 'daily',
        isActive: isActive ?? true,
        scraperConfig: defaultConfig,
      })
      .returning();

    console.log('[Competitors] Created new competitor:', {
      id: newCompetitor.id,
      name: newCompetitor.name,
      scraperType: defaultConfig.scraperType,
    });

    return NextResponse.json(
      { competitor: newCompetitor },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating competitor:", error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: "A competitor with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
