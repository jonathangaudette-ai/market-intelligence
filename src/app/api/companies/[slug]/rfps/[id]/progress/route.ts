import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRFPAuthWithSlug } from '@/lib/rfp/auth';

/**
 * GET /api/companies/[slug]/rfps/[id]/progress
 * Get parsing progress for an RFP
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    // 1. Authentication with slug
    const authResult = await requireRFPAuthWithSlug(slug);
    if (authResult.error) return authResult.error;

    const { company } = authResult;

    // 2. Get RFP from database
    const [rfp] = await db
      .select({
        id: rfps.id,
        companyId: rfps.companyId,
        parsingStatus: rfps.parsingStatus,
        parsingStage: rfps.parsingStage,
        parsingProgressCurrent: rfps.parsingProgressCurrent,
        parsingProgressTotal: rfps.parsingProgressTotal,
        questionsExtracted: rfps.questionsExtracted,
        parsingError: rfps.parsingError,
        parsingLogs: rfps.parsingLogs,
      })
      .from(rfps)
      .where(eq(rfps.id, id))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    // 3. Verify ownership/access
    if (rfp.companyId !== company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 4. Calculate progress percentage
    let progressPercentage = 0;

    if (rfp.parsingStatus === 'completed') {
      progressPercentage = 100;
    } else if (rfp.parsingStatus === 'processing') {
      if (rfp.parsingProgressTotal && rfp.parsingProgressTotal > 0) {
        progressPercentage = Math.round(
          (rfp.parsingProgressCurrent! / rfp.parsingProgressTotal) * 100
        );
      }
    }

    // 5. Return progress data
    return NextResponse.json({
      status: rfp.parsingStatus,
      stage: rfp.parsingStage,
      progressCurrent: rfp.parsingProgressCurrent || 0,
      progressTotal: rfp.parsingProgressTotal || 0,
      progressPercentage,
      questionsExtracted: rfp.questionsExtracted || 0,
      error: rfp.parsingError,
      logs: rfp.parsingLogs || [],
    });
  } catch (error) {
    console.error('[RFP Progress Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to get RFP progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
