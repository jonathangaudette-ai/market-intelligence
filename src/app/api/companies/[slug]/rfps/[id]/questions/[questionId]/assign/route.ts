import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfps, companyMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';

/**
 * POST /api/companies/[slug]/rfps/[id]/questions/[questionId]/assign
 * Assign a question to a user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; questionId: string }> }
) {
  try {
    const { slug, id: rfpId, questionId } = await params;

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
    const { userId } = body;

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

    // Get question and verify it belongs to this RFP
    const [question] = await db
      .select()
      .from(rfpQuestions)
      .where(eq(rfpQuestions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (question.rfpId !== rfpId) {
      return NextResponse.json(
        { error: 'Question does not belong to this RFP' },
        { status: 400 }
      );
    }

    // Update question assignment
    const [updatedQuestion] = await db
      .update(rfpQuestions)
      .set({
        assignedTo: userId,
        status: question.status === 'pending' ? 'in_progress' : question.status,
        updatedAt: new Date(),
      })
      .where(eq(rfpQuestions.id, questionId))
      .returning();

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error) {
    console.error('[Question Assign Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to assign question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[slug]/rfps/[id]/questions/[questionId]/assign
 * Unassign a question
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; questionId: string }> }
) {
  try {
    const { slug, id: rfpId, questionId } = await params;

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

    // Get question
    const [question] = await db
      .select()
      .from(rfpQuestions)
      .where(eq(rfpQuestions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (question.rfpId !== rfpId) {
      return NextResponse.json(
        { error: 'Question does not belong to this RFP' },
        { status: 400 }
      );
    }

    // Update question to unassign
    const [updatedQuestion] = await db
      .update(rfpQuestions)
      .set({
        assignedTo: null,
        status: question.hasResponse ? question.status : 'pending',
        updatedAt: new Date(),
      })
      .where(eq(rfpQuestions.id, questionId))
      .returning();

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error) {
    console.error('[Question Unassign Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to unassign question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
