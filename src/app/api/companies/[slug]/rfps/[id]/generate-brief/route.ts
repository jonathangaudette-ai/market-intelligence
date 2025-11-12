import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { auth } from '@/lib/auth/config';
import OpenAI from 'openai';
import type { RFPIntelligenceBrief } from '@/types/rfp-intelligence';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Get questions
    const questions = await db
      .select()
      .from(rfpQuestions)
      .where(eq(rfpQuestions.rfpId, rfpId));

    // Prepare context for AI
    const questionsText = questions
      .map((q, i) => `${i + 1}. [${q.category || 'General'}] ${q.questionText}`)
      .join('\n');

    // Generate Intelligence Brief using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an RFP analysis expert. Analyze the provided RFP information and generate a structured intelligence brief for Go/No-Go decision making.

Focus on:
1. Overview (project type, industry, scope)
2. Qualification criteria (mandatory requirements, disqualifiers)
3. Restrictive clauses (penalties, red flags)
4. Functional scope (core requirements, deliverables)
5. Risk factors
6. Unusual requirements
7. Go/No-Go recommendation with reasoning

Output must be valid JSON matching the RFPIntelligenceBrief TypeScript interface.`,
        },
        {
          role: 'user',
          content: `Analyze this RFP:

**RFP Title:** ${rfp.title}
**Client:** ${rfp.clientName}
**Industry:** ${rfp.clientIndustry || 'Not specified'}
**Submission Deadline:** ${rfp.submissionDeadline || 'Not specified'}
**Estimated Deal Value:** ${rfp.estimatedDealValue ? `$${rfp.estimatedDealValue}` : 'Not specified'}

**Questions/Requirements (${questions.length} total):**
${questionsText.substring(0, 15000)} ${questionsText.length > 15000 ? '... (truncated)' : ''}

Generate a comprehensive intelligence brief in JSON format.`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const briefContent = completion.choices[0].message.content;
    if (!briefContent) {
      throw new Error('No content generated');
    }

    const brief: RFPIntelligenceBrief = {
      ...JSON.parse(briefContent),
      generatedAt: new Date().toISOString(),
      modelUsed: 'gpt-4o',
      version: '1.0',
    };

    // Save to database
    await db
      .update(rfps)
      .set({
        intelligenceBrief: brief as any,
        updatedAt: new Date(),
      })
      .where(eq(rfps.id, rfpId));

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
