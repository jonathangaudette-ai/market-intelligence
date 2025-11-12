/**
 * GET /api/companies/[slug]/rfps/library
 *
 * Get all historical RFPs for a company.
 *
 * Query parameters:
 * - result: Filter by result (won, lost, pending)
 * - limit: Number of RFPs to return (default: 50)
 * - offset: Pagination offset (default: 0)
 *
 * Returns:
 * - rfps: Array of historical RFPs
 * - total: Total count of historical RFPs
 * - stats: Statistics about the library
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getHistoricalRfpStats } from '@/lib/rfp/source-scoring';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const resultFilter = searchParams.get('result') as 'won' | 'lost' | 'pending' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 1. Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get company by slug and verify access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    const { company } = companyContext;

    // 3. Build query
    const conditions = [
      eq(rfps.companyId, company.id),
      eq(rfps.isHistorical, true)
    ];

    if (resultFilter) {
      conditions.push(eq(rfps.result, resultFilter));
    }

    // 4. Get RFPs
    const historicalRfps = await db
      .select()
      .from(rfps)
      .where(and(...conditions))
      .orderBy(desc(rfps.submittedAt))
      .limit(limit)
      .offset(offset);

    // 5. Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rfps)
      .where(and(...conditions));

    // 6. Get stats
    const stats = await getHistoricalRfpStats(company.id);

    console.log(`[Library API] Returning ${historicalRfps.length} RFPs (total: ${count})`);

    return NextResponse.json({
      success: true,
      rfps: historicalRfps,
      total: count,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: offset + historicalRfps.length < count
      }
    });
  } catch (error) {
    console.error('[Library API Error]', error);

    return NextResponse.json(
      {
        error: 'Failed to get RFP library',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
