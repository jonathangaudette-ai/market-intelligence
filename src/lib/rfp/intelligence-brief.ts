import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import type { RFPIntelligenceBrief } from '@/types/rfp-intelligence';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an intelligence brief for an RFP
 * This function can be called from API routes or background jobs
 */
export async function generateIntelligenceBrief(rfpId: string): Promise<RFPIntelligenceBrief> {
  // Get RFP
  const [rfp] = await db
    .select()
    .from(rfps)
    .where(eq(rfps.id, rfpId))
    .limit(1);

  if (!rfp) {
    throw new Error('RFP not found');
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

  // Generate Intelligence Brief using GPT-5
  const completion = await openai.chat.completions.create({
    model: 'gpt-5',
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
    // GPT-5 does not support temperature - uses reasoning.effort instead
    response_format: { type: 'json_object' },
  });

  const briefContent = completion.choices[0].message.content;
  if (!briefContent) {
    throw new Error('No content generated');
  }

  const brief: RFPIntelligenceBrief = {
    ...JSON.parse(briefContent),
    generatedAt: new Date().toISOString(),
    modelUsed: 'gpt-5',
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

  return brief;
}
