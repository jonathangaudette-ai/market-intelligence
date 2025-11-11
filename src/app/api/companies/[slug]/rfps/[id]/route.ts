import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { auth } from '@/lib/auth/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;

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

    // 3. Fetch RFP
    const [rfp] = await db
      .select()
      .from(rfps)
      .where(eq(rfps.id, rfpId))
      .limit(1);

    if (!rfp) {
      return NextResponse.json(
        { error: 'RFP not found' },
        { status: 404 }
      );
    }

    // 4. Verify RFP belongs to this company
    if (rfp.companyId !== company.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 5. Fetch questions for this RFP
    const questions = await db
      .select()
      .from(rfpQuestions)
      .where(eq(rfpQuestions.rfpId, rfpId));

    return NextResponse.json({
      ...rfp,
      questions,
    });
  } catch (error) {
    console.error('[GET RFP Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch RFP',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
