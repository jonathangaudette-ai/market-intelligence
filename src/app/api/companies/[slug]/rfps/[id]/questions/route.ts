import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfps, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRFPAuthWithSlug } from '@/lib/rfp/auth';

/**
 * GET /api/companies/[slug]/rfps/[id]/questions
 * Get all questions for an RFP
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

    const { user, company } = authResult;

    // 2. Get RFP to verify ownership
    const [rfp] = await db
      .select()
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

    // 4. Get all questions for this RFP with assigned user info
    const questionsWithUsers = await db
      .select({
        question: rfpQuestions,
        assignedUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(rfpQuestions)
      .leftJoin(users, eq(rfpQuestions.assignedTo, users.id))
      .where(eq(rfpQuestions.rfpId, id))
      .orderBy(rfpQuestions.questionNumber);

    // Map to include assigned user info
    const questions = questionsWithUsers.map(({ question, assignedUser }) => ({
      ...question,
      assignedUser: assignedUser?.id ? {
        id: assignedUser.id,
        name: assignedUser.name || assignedUser.email || '',
        email: assignedUser.email || '',
      } : null,
    }));

    // 5. Calculate stats
    const stats = {
      total: questions.length,
      byCategory: questions.reduce((acc, q) => {
        acc[q.category || 'uncategorized'] = (acc[q.category || 'uncategorized'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: questions.reduce((acc, q) => {
        const status = q.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byDifficulty: questions.reduce((acc, q) => {
        acc[q.difficulty || 'medium'] = (acc[q.difficulty || 'medium'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalEstimatedTime: questions.reduce((sum, q) => sum + (q.estimatedMinutes || 0), 0),
    };

    return NextResponse.json({
      questions,
      stats,
    });
  } catch (error) {
    console.error('[RFP Questions Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to get RFP questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
