import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingCompetitors } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface CompetitorParams {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

// GET /api/companies/[slug]/pricing/competitors/[id]
export async function GET(
  _request: NextRequest,
  { params }: CompetitorParams
) {
  try {
    const { slug, id } = await params;

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get competitor
    const [competitor] = await db
      .select()
      .from(pricingCompetitors)
      .where(
        and(
          eq(pricingCompetitors.id, id),
          eq(pricingCompetitors.companyId, company.id)
        )
      )
      .limit(1);

    if (!competitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ competitor });
  } catch (error) {
    console.error("Error fetching competitor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/companies/[slug]/pricing/competitors/[id]
export async function PATCH(
  request: NextRequest,
  { params }: CompetitorParams
) {
  try {
    const { slug, id } = await params;

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Verify competitor exists and belongs to this company
    const [existingCompetitor] = await db
      .select()
      .from(pricingCompetitors)
      .where(
        and(
          eq(pricingCompetitors.id, id),
          eq(pricingCompetitors.companyId, company.id)
        )
      )
      .limit(1);

    if (!existingCompetitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
    if (body.scraperConfig !== undefined) updateData.scraperConfig = body.scraperConfig;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.scanFrequency !== undefined) updateData.scanFrequency = body.scanFrequency;
    if (body.customCron !== undefined) updateData.customCron = body.customCron;

    await db
      .update(pricingCompetitors)
      .set(updateData)
      .where(
        and(
          eq(pricingCompetitors.id, id),
          eq(pricingCompetitors.companyId, company.id)
        )
      );

    // Fetch updated competitor
    const [updatedCompetitor] = await db
      .select()
      .from(pricingCompetitors)
      .where(
        and(
          eq(pricingCompetitors.id, id),
          eq(pricingCompetitors.companyId, company.id)
        )
      )
      .limit(1);

    return NextResponse.json({ competitor: updatedCompetitor });
  } catch (error) {
    console.error("Error updating competitor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[slug]/pricing/competitors/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: CompetitorParams
) {
  try {
    const { slug, id } = await params;

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Verify competitor exists and belongs to this company
    const [existingCompetitor] = await db
      .select()
      .from(pricingCompetitors)
      .where(
        and(
          eq(pricingCompetitors.id, id),
          eq(pricingCompetitors.companyId, company.id)
        )
      )
      .limit(1);

    if (!existingCompetitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    // Delete competitor (cascades to matches, scans, etc.)
    await db
      .delete(pricingCompetitors)
      .where(
        and(
          eq(pricingCompetitors.id, id),
          eq(pricingCompetitors.companyId, company.id)
        )
      );

    return NextResponse.json(
      { message: "Competitor deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting competitor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
