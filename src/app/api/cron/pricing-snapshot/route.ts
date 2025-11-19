import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { HistoryService } from "@/lib/pricing/history-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for cron job

/**
 * Cron job: runs daily to snapshot all prices
 *
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/pricing-snapshot",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 *
 * Environment variables required:
 * - CRON_SECRET: Secret key to authenticate cron requests
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.error("Unauthorized cron request - invalid or missing secret");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🔄 Starting daily pricing snapshot cron job...");
    const startTime = Date.now();

    const historyService = new HistoryService();

    // Get all companies (we'll snapshot all companies' pricing)
    const allCompanies = await db.select().from(companies);

    let totalSnapshots = 0;
    const results: any[] = [];

    for (const company of allCompanies) {
      try {
        const recorded = await historyService.recordPriceSnapshot(company.id);
        totalSnapshots += recorded;

        results.push({
          companyId: company.id,
          companySlug: company.slug,
          pricesRecorded: recorded,
          status: "success",
        });

        console.log(`✅ Recorded ${recorded} prices for company ${company.slug}`);
      } catch (error) {
        console.error(`❌ Error recording snapshot for ${company.slug}:`, error);

        results.push({
          companyId: company.id,
          companySlug: company.slug,
          pricesRecorded: 0,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Pricing snapshot completed in ${duration}ms`);
    console.log(`   - Companies processed: ${allCompanies.length}`);
    console.log(`   - Total snapshots: ${totalSnapshots}`);

    return NextResponse.json({
      success: true,
      companiesProcessed: allCompanies.length,
      totalSnapshots,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("❌ Error in pricing snapshot cron:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
