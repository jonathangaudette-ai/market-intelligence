import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { auth } from '@/lib/auth/config';
import { generateIntelligenceBrief } from '@/lib/rfp/intelligence-brief';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;

    // Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify company access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    // Get RFP
    const [rfp] = await db
      .select()
      .from(rfps)
      .where(eq(rfps.id, rfpId))
      .limit(1);

    if (!rfp || rfp.companyId !== companyContext.company.id) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    // Generate intelligence brief using shared service
    const brief = await generateIntelligenceBrief(rfpId);

    return NextResponse.json({
      success: true,
      brief,
    });
  } catch (error) {
    console.error('[Generate Brief Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to generate intelligence brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET: Retrieve existing brief
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    const [rfp] = await db
      .select({ intelligenceBrief: rfps.intelligenceBrief })
      .from(rfps)
      .where(eq(rfps.id, rfpId))
      .limit(1);

    if (!rfp || !rfp.intelligenceBrief) {
      return NextResponse.json(
        { error: 'Intelligence brief not found. Generate one first.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      brief: rfp.intelligenceBrief,
    });
  } catch (error) {
    console.error('[Get Brief Error]', error);
    return NextResponse.json(
      { error: 'Failed to retrieve intelligence brief' },
      { status: 500 }
    );
  }
}
