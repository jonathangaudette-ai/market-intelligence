import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfpResponses, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';

/**
 * GET /api/companies/[slug]/rfps/[id]/questions/[questionId]/versions
 * Get all versions of responses for a question
 */
export async function GET(
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

    // Verify question exists and belongs to this RFP
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

    // Fetch all response versions for this question, ordered by version DESC
    const versions = await db
      .select({
        response: {
          id: rfpResponses.id,
          version: rfpResponses.version,
          responseText: rfpResponses.responseText,
          responseHtml: rfpResponses.responseHtml,
          wordCount: rfpResponses.wordCount,
          wasAiGenerated: rfpResponses.wasAiGenerated,
          aiModel: rfpResponses.aiModel,
          status: rfpResponses.status,
          createdAt: rfpResponses.createdAt,
        },
        createdBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(rfpResponses)
      .innerJoin(users, eq(users.id, rfpResponses.createdBy))
      .where(eq(rfpResponses.questionId, questionId))
      .orderBy(desc(rfpResponses.version));

    // Format response
    const formattedVersions = versions.map((v) => ({
      id: v.response.id,
      version: v.response.version,
      responseText: v.response.responseText,
      responseHtml: v.response.responseHtml,
      wordCount: v.response.wordCount,
      wasAiGenerated: v.response.wasAiGenerated,
      aiModel: v.response.aiModel,
      status: v.response.status,
      createdBy: v.createdBy,
      createdAt: v.response.createdAt,
    }));

    return NextResponse.json({
      versions: formattedVersions,
    });
  } catch (error) {
    console.error('[Get Versions Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to get versions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
