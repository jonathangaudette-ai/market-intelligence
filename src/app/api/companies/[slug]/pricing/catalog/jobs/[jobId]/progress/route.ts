import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
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
 * Poll job status for real-time updates
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

    // 2. Fetch job status from Vercel Blob
    const statusUrl = `https://blob.vercel-storage.com/catalog-jobs/${company.id}/${jobId}/status.json`;

    try {
      const response = await fetch(statusUrl);

      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json(
            { error: "Job not found" },
            { status: 404 }
          );
        }
        throw new Error(`Failed to fetch job status: ${response.statusText}`);
      }

      const status = await response.json();

      return NextResponse.json(status);
    } catch (fetchError: any) {
      console.error("Error fetching job status:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch job status" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in progress endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
