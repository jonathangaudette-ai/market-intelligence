import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfps, companyMembers } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';

/**
 * POST /api/companies/[slug]/rfps/[id]/questions/bulk-assign
 * Assign multiple questions to a user at once
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
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

    // Parse request body
    const body = await request.json();
    const { questionIds, userId } = body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'questionIds array is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Verify RFP belongs to this company
    const [rfp] = await db
      .select({ id: rfps.id, companyId: rfps.companyId })
      .from(rfps)
      .where(eq(rfps.id, rfpId))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    if (rfp.companyId !== companyContext.company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify the user to be assigned is a member of this company
    const [member] = await db
      .select()
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.companyId, companyContext.company.id),
          eq(companyMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: 'User is not a member of this company' },
        { status: 400 }
      );
    }

    // Verify all questions belong to this RFP
    const questions = await db
      .select()
      .from(rfpQuestions)
      .where(
        and(
          inArray(rfpQuestions.id, questionIds),
          eq(rfpQuestions.rfpId, rfpId)
        )
      );

    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { error: 'Some questions not found or do not belong to this RFP' },
        { status: 400 }
      );
    }

    // Update all questions
    const updatedQuestions = await db
      .update(rfpQuestions)
      .set({
        assignedTo: userId,
        updatedAt: new Date(),
      })
      .where(inArray(rfpQuestions.id, questionIds))
      .returning();

    // Update status to in_progress for pending questions
    await db
      .update(rfpQuestions)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(rfpQuestions.id, questionIds),
          eq(rfpQuestions.status, 'pending')
        )
      );

    return NextResponse.json({
      success: true,
      count: updatedQuestions.length,
      questions: updatedQuestions,
    });
  } catch (error) {
    console.error('[Bulk Assign Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to assign questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
