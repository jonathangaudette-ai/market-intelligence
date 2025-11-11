import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRFPAuth } from '@/lib/rfp/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await requireRFPAuth();
    if (authResult.error) return authResult.error;

    const { company } = authResult;
    const { id: rfpId } = await params;

    // Fetch RFP
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

    // Verify RFP belongs to user's company
    if (rfp.companyId !== company.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch questions for this RFP
    const questions = await db
      .select()
      .from(rfpQuestions)
      .where(eq(rfpQuestions.rfpId, rfpId))
      .orderBy(rfpQuestions.questionNumber);

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
