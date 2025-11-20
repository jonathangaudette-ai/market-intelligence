import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pricingCompetitors, pricingMatches } from "@/db/schema-pricing";
import { eq, sql } from "drizzle-orm";

interface CompetitorsParams {
  params: {
    slug: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: CompetitorsParams
) {
  try {
    const { slug } = params;

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
