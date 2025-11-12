/**
 * Source Scoring Service
 *
 * Scores and ranks past RFPs for use as content sources in the surgical retrieval system.
 *
 * Scoring factors (weighted):
 * - Semantic similarity (40%): Via Pinecone vector search
 * - Outcome (30%): Won > Pending > Lost
 * - Recency (15%): Recent RFPs are more relevant
 * - Industry match (10%): Same industry preferred
 * - Content quality (5%): Based on quality_score in DB
 */

import { db } from '@/db';
import { rfps, rfpQuestions, rfpResponses } from '@/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { differenceInMonths } from 'date-fns';
import { generateEmbedding } from './ai/embeddings';
import { getRFPNamespace } from './pinecone';
import type { ContentType } from '@/types/content-types';
import type { RfpScore } from '@/types/content-types';

/**
 * Score and rank past RFPs for a specific content type
 *
 * Returns top N RFPs sorted by relevance score
 */
export async function scoreAndRankRfps(
  currentRfp: any,
  contentType: ContentType,
  companyId: string,
  options: {
    onlyWon?: boolean;
    minQualityScore?: number;
    limit?: number;
  } = {}
): Promise<RfpScore[]> {
  console.log(`[Source Scoring] Scoring RFPs for content-type: ${contentType}`);

  // 1. Get past RFPs (filtered)
  const conditions = [
    eq(rfps.companyId, companyId),
    ne(rfps.id, currentRfp.id),
    eq(rfps.isHistorical, true)
  ];

  if (options.onlyWon) {
    conditions.push(eq(rfps.result, 'won'));
  }

  const pastRfps = await db
    .select()
    .from(rfps)
    .where(and(...conditions));

  if (pastRfps.length === 0) {
    console.log('[Source Scoring] No historical RFPs found');
    return [];
  }

  console.log(`[Source Scoring] Found ${pastRfps.length} historical RFPs to score`);

  // 2. Score each RFP
  const scored: RfpScore[] = [];

  for (const pastRfp of pastRfps) {
    try {
      // Semantic similarity via Pinecone
      const semanticScore = await calculateSemanticSimilarity(
        currentRfp,
        pastRfp,
        contentType
      );

      // Outcome score (won > pending > lost)
      const outcomeScore = pastRfp.result === 'won' ? 100 :
                           pastRfp.result === 'pending' ? 50 : 30;

      // Recency score (decay 5% per month)
      const monthsAgo = pastRfp.createdAt
        ? differenceInMonths(new Date(), new Date(pastRfp.createdAt))
        : 12; // Default to 1 year if no date
      const recencyScore = Math.max(0, 100 - (monthsAgo * 5));

      // Industry match
      const industryScore = currentRfp.clientIndustry === pastRfp.clientIndustry ? 100 : 50;

      // Content quality (from DB)
      const contentQualityScore = pastRfp.qualityScore || 50;

      // Weighted total score
      const totalScore = (
        semanticScore * 0.40 +      // 40% semantic
        outcomeScore * 0.30 +        // 30% outcome
        recencyScore * 0.15 +        // 15% recency
        industryScore * 0.10 +       // 10% industry
        contentQualityScore * 0.05   // 5% quality
      );

      // Skip if below min quality threshold
      if (options.minQualityScore && totalScore < options.minQualityScore) {
        continue;
      }

      scored.push({
        rfpId: pastRfp.id,
        rfp: pastRfp,
        scores: {
          semantic: Math.round(semanticScore),
          outcome: outcomeScore,
          recency: Math.round(recencyScore),
          industry: industryScore,
          contentQuality: contentQualityScore
        },
        totalScore: Math.round(totalScore),
        preview: pastRfp.extractedText?.substring(0, 200) || ''
      });
    } catch (error) {
      console.error(`[Source Scoring] Error scoring RFP ${pastRfp.id}:`, error);
      // Continue with other RFPs
    }
  }

  // 3. Sort by score and limit
  const sorted = scored
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, options.limit || 3);

  console.log(`[Source Scoring] ✅ Scored ${scored.length} RFPs, returning top ${sorted.length}`);
  if (sorted.length > 0) {
    console.log(`[Source Scoring] Top score: ${sorted[0].totalScore} for RFP: ${sorted[0].rfp.title}`);
  }

  return sorted;
}

/**
 * Calculate semantic similarity using Pinecone vector search
 *
 * Queries Pinecone with the current RFP's context and filters by:
 * - Past RFP ID
 * - Content type
 *
 * Returns average similarity score (0-100)
 */
async function calculateSemanticSimilarity(
  currentRfp: any,
  pastRfp: any,
  contentType: ContentType
): Promise<number> {
  try {
    // Create query text from current RFP
    const queryText = `${currentRfp.title} ${currentRfp.clientName} ${currentRfp.clientIndustry || ''}`;

    // Generate embedding
    const queryEmbedding = await generateEmbedding(queryText);

    // Query Pinecone in RFP library namespace
    const namespace = getRFPNamespace();

    // Build filter for the specific past RFP and content type
    const filter: any = {
      rfpId: pastRfp.id
    };

    // Add content type filter if metadata supports it
    if (contentType) {
      filter.contentType = contentType;
    }

    const results = await namespace.query({
      vector: queryEmbedding,
      filter,
      topK: 5,
      includeMetadata: true
    });

    if (results.matches.length === 0) {
      // No matches found, return low score but not zero
      // (RFP might still be valuable based on other factors)
      return 40;
    }

    // Calculate average similarity score (Pinecone returns 0-1, convert to 0-100)
    const avgScore = results.matches.reduce((sum, match) => sum + (match.score || 0), 0)
                     / results.matches.length;

    return avgScore * 100;
  } catch (error) {
    console.error('[Semantic Similarity Error]', error);
    // Return neutral score on error
    return 50;
  }
}

/**
 * Get top sources for each content type in a single call
 *
 * Useful for the smart configuration flow to get all suggestions at once
 */
export async function scoreRfpsForAllContentTypes(
  currentRfp: any,
  contentTypes: ContentType[],
  companyId: string,
  options: {
    onlyWon?: boolean;
    minQualityScore?: number;
    limitPerType?: number;
  } = {}
): Promise<Record<ContentType, RfpScore[]>> {
  console.log(`[Source Scoring] Scoring for ${contentTypes.length} content types...`);

  const results: Record<string, RfpScore[]> = {};

  // Score in parallel for better performance
  await Promise.all(
    contentTypes.map(async (contentType) => {
      try {
        const scores = await scoreAndRankRfps(
          currentRfp,
          contentType,
          companyId,
          {
            ...options,
            limit: options.limitPerType || 3
          }
        );
        results[contentType] = scores;
      } catch (error) {
        console.error(`[Source Scoring] Error for content-type ${contentType}:`, error);
        results[contentType] = [];
      }
    })
  );

  return results as Record<ContentType, RfpScore[]>;
}

/**
 * Get statistics about available historical RFPs
 *
 * Useful for UI to show user what sources are available
 */
export async function getHistoricalRfpStats(companyId: string): Promise<{
  total: number;
  won: number;
  lost: number;
  pending: number;
  avgQualityScore: number;
}> {
  const historicalRfps = await db
    .select()
    .from(rfps)
    .where(and(
      eq(rfps.companyId, companyId),
      eq(rfps.isHistorical, true)
    ));

  const stats = {
    total: historicalRfps.length,
    won: historicalRfps.filter(r => r.result === 'won').length,
    lost: historicalRfps.filter(r => r.result === 'lost').length,
    pending: historicalRfps.filter(r => r.result === 'pending').length,
    avgQualityScore: historicalRfps.length > 0
      ? Math.round(
          historicalRfps.reduce((sum, r) => sum + (r.qualityScore || 50), 0) / historicalRfps.length
        )
      : 0
  };

  return stats;
}
