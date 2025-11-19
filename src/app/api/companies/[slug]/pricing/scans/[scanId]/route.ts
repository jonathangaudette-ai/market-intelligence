import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingScans, pricingCompetitors } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface ScanParams {
  params: Promise<{
    slug: string;
    scanId: string;
  }>;
}

// GET /api/companies/[slug]/pricing/scans/[scanId]
// Get scan status and details
export async function GET(
  _request: NextRequest,
  { params }: ScanParams
) {
  try {
    const { slug, scanId } = await params;

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get scan with competitor info
    const [scan] = await db
      .select({
        scan: pricingScans,
        competitor: pricingCompetitors,
      })
      .from(pricingScans)
      .leftJoin(
        pricingCompetitors,
        eq(pricingScans.competitorId, pricingCompetitors.id)
      )
      .where(
        and(
          eq(pricingScans.id, scanId),
          eq(pricingScans.companyId, company.id)
        )
      )
      .limit(1);

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    return NextResponse.json({
      scan: scan.scan,
      competitor: scan.competitor,
    });
  } catch (error: any) {
    console.error("Error fetching scan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
