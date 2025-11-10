import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRFPAuth } from '@/lib/rfp/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await requireRFPAuth();
    if (authResult.error) return authResult.error;

    const { company } = authResult;
    const rfpId = params.id;

    // Fetch RFP with questions
    const rfp = await db.query.rfps.findFirst({
      where: eq(rfps.id, rfpId),
      with: {
        questions: {
          orderBy: (questions, { asc }) => [asc(questions.questionNumber)],
        },
      },
    });

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

    return NextResponse.json(rfp);
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
