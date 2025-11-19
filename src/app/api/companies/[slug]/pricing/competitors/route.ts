import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingCompetitors, pricingMatches } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

interface CompetitorsParams {
  params: Promise<{
    slug: string;
  }>;
}

// GET /api/companies/[slug]/pricing/competitors
export async function GET(
  request: NextRequest,
  { params }: CompetitorsParams
) {
  try {
    const { slug } = await params;

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Fetch competitors with product match counts
    const competitors = await db
      .select({
        id: pricingCompetitors.id,
        name: pricingCompetitors.name,
        websiteUrl: pricingCompetitors.websiteUrl,
        isActive: pricingCompetitors.isActive,
        scanFrequency: pricingCompetitors.scanFrequency,
        lastScanAt: pricingCompetitors.lastScanAt,
        createdAt: pricingCompetitors.createdAt,
        productsMatched: sql<number>`
          COALESCE((
            SELECT COUNT(DISTINCT ${pricingMatches.productId})::int
            FROM ${pricingMatches}
            WHERE ${pricingMatches.competitorId} = ${pricingCompetitors.id}
          ), 0)
        `,
      })
      .from(pricingCompetitors)
      .where(eq(pricingCompetitors.companyId, company.id));

    return NextResponse.json({ competitors });
  } catch (error) {
    console.error("Error fetching competitors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/companies/[slug]/pricing/competitors
export async function POST(
  request: NextRequest,
  { params }: CompetitorsParams
) {
  try {
    const { slug } = await params;

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.websiteUrl) {
      return NextResponse.json(
        { error: "Name and websiteUrl are required" },
        { status: 400 }
      );
    }

    const newCompetitor = {
      id: createId(),
      companyId: company.id,
      companySlug: slug,
      name: body.name,
      websiteUrl: body.websiteUrl,
      logoUrl: body.logoUrl || null,
      scraperConfig: body.scraperConfig || {
        baseUrl: "",
        selectors: {
          productName: "",
          price: "",
        },
      },
      isActive: body.isActive !== undefined ? body.isActive : true,
      scanFrequency: body.scanFrequency || "weekly",
      customCron: body.customCron || null,
      lastScanAt: null,
      nextScanAt: null,
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(pricingCompetitors).values(newCompetitor);

    return NextResponse.json({ competitor: newCompetitor }, { status: 201 });
  } catch (error) {
    console.error("Error creating competitor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
