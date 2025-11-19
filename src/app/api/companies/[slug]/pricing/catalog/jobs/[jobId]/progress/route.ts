import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingCatalogImports } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

interface ProgressParams {
  params: Promise<{
    slug: string;
    jobId: string;
  }>;
}

/**
 * GET /api/companies/[slug]/pricing/catalog/jobs/[jobId]/progress
 * Poll job status for real-time updates (PostgreSQL-based)
 */
export async function GET(
  request: NextRequest,
  { params }: ProgressParams
) {
  try {
    const { slug, jobId } = await params;

    // 1. Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 2. Fetch job status from PostgreSQL
    const [job] = await db
      .select()
      .from(pricingCatalogImports)
      .where(eq(pricingCatalogImports.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // 3. Calculate progress percentage
    const progressPercentage = (job.progressTotal ?? 0) > 0
      ? Math.round(((job.progressCurrent ?? 0) / (job.progressTotal ?? 1)) * 100)
      : 0;

    // 4. Return formatted status
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      currentStep: job.currentStep,
      progressCurrent: job.progressCurrent,
      progressTotal: job.progressTotal,
      progressPercentage,
      productsImported: job.productsImported,
      productsFailed: job.productsFailed,
      error: job.errorMessage,
      logs: job.logs || [],
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error in progress endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
