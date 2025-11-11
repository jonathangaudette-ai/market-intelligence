import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfpQuestions, rfpResponses, rfps } from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { z } from 'zod';

const ResponseSchema = z.object({
  responseText: z.string().min(1, 'Response text is required'),
  responseHtml: z.string().min(1, 'Response HTML is required'),
  wordCount: z.number().int().min(0),
});

/**
 * POST /api/v1/rfp/questions/[id]/response
 * Create or update a response for a question
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ResponseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { responseText, responseHtml, wordCount } = validation.data;

    // Verify question exists and user has access
    const [question] = await db
      .select({
        id: rfpQuestions.id,
        rfpId: rfpQuestions.rfpId,
        wordLimit: rfpQuestions.wordLimit,
      })
      .from(rfpQuestions)
      .where(eq(rfpQuestions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Verify user has access to the RFP
    const [rfp] = await db
      .select({ id: rfps.id, companyId: rfps.companyId })
      .from(rfps)
      .where(eq(rfps.id, question.rfpId))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    // TODO: Verify user is member of company (for now, skip this check)
    // In production, add company membership verification here

    // Check if there's an existing response
    const [existingResponse] = await db
      .select()
      .from(rfpResponses)
      .where(eq(rfpResponses.questionId, questionId))
      .orderBy(desc(rfpResponses.version))
      .limit(1);

    let response;

    if (existingResponse) {
      // Update existing response (create new version)
      const newVersion = (existingResponse.version || 0) + 1;

      [response] = await db
        .insert(rfpResponses)
        .values({
          questionId,
          responseText,
          responseHtml,
          wordCount,
          version: newVersion,
          previousVersionId: existingResponse.id,
          createdBy: session.user.id,
          wasAiGenerated: false,
          status: 'draft',
        })
        .returning();
    } else {
      // Create new response
      [response] = await db
        .insert(rfpResponses)
        .values({
          questionId,
          responseText,
          responseHtml,
          wordCount,
          version: 1,
          createdBy: session.user.id,
          wasAiGenerated: false,
          status: 'draft',
        })
        .returning();
    }

    // Update question to mark as having response
    await db
      .update(rfpQuestions)
      .set({
        hasResponse: true,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(rfpQuestions.id, questionId));

    // Update RFP completion percentage
    await updateRFPCompletionPercentage(question.rfpId);

    return NextResponse.json({
      success: true,
      response: {
        id: response.id,
        version: response.version,
        wordCount: response.wordCount,
        createdAt: response.createdAt,
      },
    });
  } catch (error) {
    console.error('Error saving response:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/rfp/questions/[id]/response
 * Get the latest response for a question
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify question exists
    const [question] = await db
      .select({ id: rfpQuestions.id, rfpId: rfpQuestions.rfpId })
      .from(rfpQuestions)
      .where(eq(rfpQuestions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Get latest response
    const [response] = await db
      .select()
      .from(rfpResponses)
      .where(eq(rfpResponses.questionId, questionId))
      .orderBy(desc(rfpResponses.version))
      .limit(1);

    if (!response) {
      return NextResponse.json({ response: null });
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error fetching response:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update RFP completion percentage
 */
async function updateRFPCompletionPercentage(rfpId: string) {
  // Get total questions and questions with responses
  const [stats] = await db
    .select({
      total: count(),
    })
    .from(rfpQuestions)
    .where(eq(rfpQuestions.rfpId, rfpId));

  const [withResponses] = await db
    .select({
      count: count(),
    })
    .from(rfpQuestions)
    .where(
      and(
        eq(rfpQuestions.rfpId, rfpId),
        eq(rfpQuestions.hasResponse, true)
      )
    );

  const total = stats?.total || 0;
  const completed = withResponses?.count || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Update RFP
  await db
    .update(rfps)
    .set({
      completionPercentage: percentage,
      updatedAt: new Date(),
    })
    .where(eq(rfps.id, rfpId));
}
