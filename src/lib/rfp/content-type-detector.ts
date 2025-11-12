/**
 * Content Type Detection Service
 *
 * Uses Claude AI (Haiku for speed, Sonnet for accuracy) to classify RFP questions
 * into content types for the surgical retrieval system.
 *
 * Tiered strategy:
 * 1. First pass with Haiku (fast + cheap)
 * 2. Retry low confidence (<85%) with Sonnet (more accurate)
 */

import { Anthropic } from '@anthropic-ai/sdk';
import type { ContentType, ContentTypeDetection } from '@/types/content-types';
import { CONTENT_TYPE_DESCRIPTIONS } from '@/types/content-types';
import { CLAUDE_MODELS } from '@/lib/constants/ai-models';

// Lazy initialization
let _anthropic: Anthropic | null = null;

function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

/**
 * Detect content types for a single question using Claude
 */
export async function detectQuestionContentType(
  questionText: string,
  model: 'haiku' | 'sonnet' = 'haiku'
): Promise<ContentTypeDetection> {
  const anthropic = getAnthropic();

  const modelId = model === 'haiku'
    ? CLAUDE_MODELS.haiku
    : CLAUDE_MODELS.sonnet;

  const prompt = `Classify this RFP question into one or more content types.

Available types:
${Object.entries(CONTENT_TYPE_DESCRIPTIONS).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

Question: "${questionText}"

Analyze the question and determine:
1. Which content types apply (can be multiple)
2. Which is the PRIMARY content type (most relevant)
3. Your confidence in this classification (0.0 to 1.0)

Return ONLY valid JSON in this exact format:
{
  "contentTypes": ["type1", "type2"],
  "primaryContentType": "type1",
  "confidence": 0.95
}`;

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    // Extract JSON from response (Claude sometimes adds explanation text)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as ContentTypeDetection;

    // Validate response
    if (!parsed.contentTypes || !parsed.primaryContentType || typeof parsed.confidence !== 'number') {
      throw new Error('Invalid response format from Claude');
    }

    return parsed;
  } catch (error) {
    console.error(`[Content Type Detection Error - ${model}]`, error);
    throw new Error(`Failed to detect content type: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch classify with tiered strategy: Haiku first, Sonnet for low-confidence
 *
 * This approach saves costs by using the cheaper Haiku model for most questions,
 * and only using the more expensive Sonnet for difficult cases.
 */
export async function detectQuestionContentTypes(
  questions: Array<{ id: string; questionText: string }>
): Promise<Array<{ id: string; detection: ContentTypeDetection }>> {
  console.log(`[Content Type Detection] Processing ${questions.length} questions...`);

  // First pass with Haiku (fast + cheap)
  console.log('[Content Type Detection] First pass with Haiku...');
  const firstPass = await Promise.all(
    questions.map(async (q) => {
      try {
        const detection = await detectQuestionContentType(q.questionText, 'haiku');
        return { id: q.id, detection };
      } catch (error) {
        console.error(`[Haiku Error] Question ${q.id}:`, error);
        // Return low confidence to trigger Sonnet retry
        return {
          id: q.id,
          detection: {
            contentTypes: ['company-overview'] as ContentType[],
            primaryContentType: 'company-overview' as ContentType,
            confidence: 0.0
          }
        };
      }
    })
  );

  // Identify low confidence results (<85%)
  const lowConfidence = firstPass.filter(r => r.detection.confidence < 0.85);

  if (lowConfidence.length === 0) {
    console.log('[Content Type Detection] ✅ All questions classified with high confidence using Haiku');
    return firstPass;
  }

  // Retry low confidence with Sonnet
  console.log(`[Content Type Detection] Retrying ${lowConfidence.length} low-confidence questions with Sonnet...`);
  const refined = await Promise.all(
    lowConfidence.map(async (r) => {
      try {
        const question = questions.find(q => q.id === r.id)!;
        const detection = await detectQuestionContentType(question.questionText, 'sonnet');
        return { id: r.id, detection };
      } catch (error) {
        console.error(`[Sonnet Error] Question ${r.id}:`, error);
        // Keep original Haiku result as fallback
        return r;
      }
    })
  );

  // Merge results: high-confidence Haiku + refined Sonnet
  const refinedIds = new Set(refined.map(r => r.id));
  const finalResults = [
    ...firstPass.filter(r => !refinedIds.has(r.id)),
    ...refined
  ];

  // Calculate statistics
  const haikuOnly = finalResults.filter(r => !refinedIds.has(r.id)).length;
  const sonnetRefined = refined.length;
  const avgConfidence = finalResults.reduce((sum, r) => sum + r.detection.confidence, 0) / finalResults.length;

  console.log(`[Content Type Detection] ✅ Complete:`);
  console.log(`  - Haiku only: ${haikuOnly} (${Math.round(haikuOnly / finalResults.length * 100)}%)`);
  console.log(`  - Sonnet refined: ${sonnetRefined} (${Math.round(sonnetRefined / finalResults.length * 100)}%)`);
  console.log(`  - Average confidence: ${Math.round(avgConfidence * 100)}%`);

  return finalResults;
}

/**
 * Detect content type for a single question with automatic model selection
 * Uses Haiku by default, automatically retries with Sonnet if confidence is low
 */
export async function detectQuestionContentTypeAuto(
  questionText: string
): Promise<ContentTypeDetection> {
  // Try Haiku first
  const haikuResult = await detectQuestionContentType(questionText, 'haiku');

  // If confidence is high enough, return Haiku result
  if (haikuResult.confidence >= 0.85) {
    return haikuResult;
  }

  // Otherwise, retry with Sonnet
  console.log(`[Content Type Detection] Low confidence (${haikuResult.confidence}), retrying with Sonnet...`);
  return await detectQuestionContentType(questionText, 'sonnet');
}
