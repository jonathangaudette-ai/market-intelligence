/**
 * Smart Defaults Service
 *
 * Generates optimal source configuration automatically using AI.
 *
 * Process:
 * 1. Detect content types for all RFP questions (using Claude Haiku + Sonnet)
 * 2. For each content type, find top 3 relevant historical RFPs (using scoring)
 * 3. Save configuration to rfp_source_preferences table
 * 4. Update questions with classifications and smart settings
 */

import { db } from '@/db';
import { rfps, rfpQuestions, rfpSourcePreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { detectQuestionContentTypes } from './content-type-detector';
import { scoreRfpsForAllContentTypes } from './source-scoring';
import type { ContentType } from '@/types/content-types';

export interface SmartDefaultsResult {
  suggestedSources: Record<ContentType, string[]>;
  questionsClassified: number;
  averageConfidence: number;
  contentTypeBreakdown: Record<ContentType, number>;
}

/**
 * Generate optimal configuration automatically using AI
 *
 * This is the main "Smart Configure" function that:
 * - Classifies all questions
 * - Finds best historical sources
 * - Saves preferences
 */
export async function generateSmartDefaults(
  rfpId: string
): Promise<SmartDefaultsResult> {
  console.log(`[Smart Defaults] Starting smart configuration for RFP ${rfpId}...`);

  // 1. Get RFP and questions
  const [rfp] = await db.select().from(rfps).where(eq(rfps.id, rfpId));

  if (!rfp) {
    throw new Error(`RFP ${rfpId} not found`);
  }

  const questions = await db
    .select()
    .from(rfpQuestions)
    .where(eq(rfpQuestions.rfpId, rfpId));

  if (questions.length === 0) {
    throw new Error(`No questions found for RFP ${rfpId}`);
  }

  console.log(`[Smart Defaults] Found ${questions.length} questions to classify`);

  // 2. Detect content types for all questions
  console.log('[Smart Defaults] Classifying questions...');
  const classifications = await detectQuestionContentTypes(
    questions.map(q => ({ id: q.id, questionText: q.questionText }))
  );

  // 3. Update questions with classifications
  console.log('[Smart Defaults] Updating question classifications in DB...');
  await Promise.all(classifications.map(async ({ id, detection }) => {
    // Convert confidence from 0-1 to 0-100 for DB storage
    const confidencePercent = Math.round(detection.confidence * 100);

    await db.update(rfpQuestions)
      .set({
        contentTypes: detection.contentTypes,
        primaryContentType: detection.primaryContentType,
        detectionConfidence: confidencePercent,
        appliedFromSettings: true,
        updatedAt: new Date(),
      })
      .where(eq(rfpQuestions.id, id));
  }));

  // 4. Get unique content types
  const contentTypes = Array.from(
    new Set(classifications.map(c => c.detection.primaryContentType))
  );

  console.log(`[Smart Defaults] Found ${contentTypes.length} unique content types:`, contentTypes);

  // 5. For each content type, find top 3 RFP sources
  console.log('[Smart Defaults] Scoring historical RFPs...');
  const scoredByType = await scoreRfpsForAllContentTypes(
    rfp,
    contentTypes,
    rfp.companyId,
    {
      onlyWon: true,
      limitPerType: 3
    }
  );

  // 6. Build suggested sources map
  const suggestedSources: Record<string, string[]> = {};
  for (const contentType of contentTypes) {
    const topSources = scoredByType[contentType] || [];
    suggestedSources[contentType] = topSources.map(s => s.rfpId);
  }

  // 7. Save or update preferences
  console.log('[Smart Defaults] Saving preferences...');
  await db.insert(rfpSourcePreferences).values({
    rfpId,
    suggestedSources,
    defaultSourceStrategy: 'hybrid',
    defaultAdaptationLevel: 'contextual',
    preferWonRfps: true,
    minQualityScore: 70,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: rfpSourcePreferences.rfpId,
    set: {
      suggestedSources,
      updatedAt: new Date()
    }
  });

  // 8. Calculate statistics
  const avgConfidence = classifications.reduce(
    (sum, c) => sum + c.detection.confidence,
    0
  ) / classifications.length;

  const contentTypeBreakdown: Record<string, number> = {};
  for (const { detection } of classifications) {
    contentTypeBreakdown[detection.primaryContentType] =
      (contentTypeBreakdown[detection.primaryContentType] || 0) + 1;
  }

  console.log('[Smart Defaults] ✅ Smart configuration complete!');
  console.log(`[Smart Defaults] Average confidence: ${Math.round(avgConfidence * 100)}%`);

  return {
    suggestedSources: suggestedSources as Record<ContentType, string[]>,
    questionsClassified: questions.length,
    averageConfidence: avgConfidence,
    contentTypeBreakdown: contentTypeBreakdown as Record<ContentType, number>
  };
}

/**
 * Apply smart defaults to a single question
 *
 * Useful when adding new questions to an existing RFP
 */
export async function applySmartDefaultsToQuestion(
  questionId: string
): Promise<void> {
  console.log(`[Smart Defaults] Applying to question ${questionId}...`);

  // Get question
  const [question] = await db
    .select()
    .from(rfpQuestions)
    .where(eq(rfpQuestions.id, questionId));

  if (!question) {
    throw new Error(`Question ${questionId} not found`);
  }

  // Classify the question
  const { detectQuestionContentTypeAuto } = await import('./content-type-detector');
  const detection = await detectQuestionContentTypeAuto(question.questionText);

  // Update question
  await db.update(rfpQuestions)
    .set({
      contentTypes: detection.contentTypes,
      primaryContentType: detection.primaryContentType,
      detectionConfidence: Math.round(detection.confidence * 100),
      appliedFromSettings: true,
      updatedAt: new Date(),
    })
    .where(eq(rfpQuestions.id, questionId));

  // Get RFP preferences to set source
  const [prefs] = await db
    .select()
    .from(rfpSourcePreferences)
    .where(eq(rfpSourcePreferences.rfpId, question.rfpId));

  if (prefs && prefs.suggestedSources) {
    const sources = prefs.suggestedSources as Record<string, string[]>;
    const suggested = sources[detection.primaryContentType];

    if (suggested && suggested.length > 0) {
      // Use top suggestion
      await db.update(rfpQuestions)
        .set({
          selectedSourceRfpId: suggested[0],
          updatedAt: new Date(),
        })
        .where(eq(rfpQuestions.id, questionId));

      console.log(`[Smart Defaults] Applied source ${suggested[0]} to question`);
    }
  }

  console.log('[Smart Defaults] ✅ Question configured');
}

/**
 * Get current smart configuration for an RFP
 *
 * Returns null if not configured yet
 */
export async function getSmartConfiguration(rfpId: string): Promise<{
  preferences: typeof rfpSourcePreferences.$inferSelect;
  stats: {
    totalQuestions: number;
    classifiedQuestions: number;
    avgConfidence: number;
    contentTypes: Record<string, number>;
  };
} | null> {
  // Get preferences
  const [prefs] = await db
    .select()
    .from(rfpSourcePreferences)
    .where(eq(rfpSourcePreferences.rfpId, rfpId));

  if (!prefs) {
    return null;
  }

  // Get questions stats
  const questions = await db
    .select()
    .from(rfpQuestions)
    .where(eq(rfpQuestions.rfpId, rfpId));

  const classifiedQuestions = questions.filter(q => q.primaryContentType);

  const avgConfidence = classifiedQuestions.length > 0
    ? classifiedQuestions.reduce((sum, q) => sum + (q.detectionConfidence || 0), 0) / classifiedQuestions.length
    : 0;

  const contentTypes: Record<string, number> = {};
  for (const question of classifiedQuestions) {
    if (question.primaryContentType) {
      contentTypes[question.primaryContentType] =
        (contentTypes[question.primaryContentType] || 0) + 1;
    }
  }

  return {
    preferences: prefs,
    stats: {
      totalQuestions: questions.length,
      classifiedQuestions: classifiedQuestions.length,
      avgConfidence: Math.round(avgConfidence),
      contentTypes
    }
  };
}
