/**
 * Dual Query Retrieval Engine
 * Phase 0.5 - Support Docs RAG v4.0
 *
 * This engine implements the dual queries strategy to retrieve from multiple
 * document sources (support docs + historical RFPs) using separate Pinecone queries.
 */

import { getRFPNamespace, type RFPVectorMetadata } from '../rfp/pinecone';
import type { Index, RecordMetadata } from '@pinecone-database/pinecone';

export interface RetrievalResult {
  chunks: Array<{
    id: string;
    text: string;
    score: number;
    compositeScore: number;
    source: 'pinned' | 'support' | 'historical';
    metadata: RFPVectorMetadata;
    breakdown: {
      semanticScore: number;
      outcomeScore: number;
      recencyScore: number;
      qualityScore: number;
      sourceBoost: number;
    };
  }>;
  sources: Map<
    string,
    Array<{
      id: string;
      text: string;
      score: number;
      compositeScore: number;
    }>
  >;
  metadata: {
    totalResults: number;
    pinnedCount: number;
    supportCount: number;
    historicalCount: number;
  };
}

export interface DualQueryOptions {
  pinnedSourceRfpId?: string;
  depth?: 'basic' | 'detailed' | 'comprehensive';
}

export class DualQueryRetrievalEngine {
  private namespace: ReturnType<typeof getRFPNamespace>;

  constructor(namespace?: ReturnType<typeof getRFPNamespace>) {
    this.namespace = namespace || getRFPNamespace();
  }

  /**
   * Retrieve documents using dual queries strategy
   *
   * PHASE 1: Pinned Source (if specified) - 40% of budget
   * PHASE 2A: Support Documents - 30% of budget
   * PHASE 2B: Historical RFPs - 30% of budget
   *
   * All queries run in parallel for performance, then results are merged,
   * deduplicated, scored, and ranked.
   */
  async retrieve(
    queryEmbedding: number[],
    category: string,
    companyId: string,
    options: DualQueryOptions = {}
  ): Promise<RetrievalResult> {
    const { pinnedSourceRfpId, depth = 'detailed' } = options;
    const topK = depth === 'basic' ? 5 : depth === 'detailed' ? 10 : 20;

    // Calculate budget allocation
    const pinnedTopK = pinnedSourceRfpId ? Math.ceil(topK * 0.4) : 0;
    const supportTopK = Math.ceil(topK * 0.3);
    const historicalTopK = Math.ceil(topK * 0.3);

    // Execute queries in parallel
    const [pinnedResults, supportResults, historicalResults] = await Promise.all([
      // PHASE 1: Pinned Source
      pinnedSourceRfpId
        ? this.queryPinnedSource(queryEmbedding, companyId, pinnedSourceRfpId, pinnedTopK)
        : Promise.resolve([]),

      // PHASE 2A: Support Documents
      this.querySupportDocs(queryEmbedding, companyId, category, supportTopK),

      // PHASE 2B: Historical RFPs
      this.queryHistoricalRfps(queryEmbedding, companyId, historicalTopK),
    ]);

    // Merge results with source labels and boosts
    const allResults = [
      ...pinnedResults.map((r: any) => ({ ...r, source: 'pinned' as const, boost: 1.5 })),
      ...supportResults.map((r: any) => ({ ...r, source: 'support' as const, boost: 1.2 })),
      ...historicalResults.map((r: any) => ({ ...r, source: 'historical' as const, boost: 1.0 })),
    ];

    // Deduplicate by chunk ID
    const deduped = this.deduplicateByChunk(allResults);

    // Calculate composite scores
    const scored = this.calculateCompositeScores(deduped);

    // Sort by composite score (descending)
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    // Take top K results
    const topResults = scored.slice(0, topK);

    return {
      chunks: topResults,
      sources: this.groupByDocument(topResults),
      metadata: {
        totalResults: scored.length,
        pinnedCount: pinnedResults.length,
        supportCount: supportResults.length,
        historicalCount: historicalResults.length,
      },
    };
  }

  /**
   * Query pinned source RFP (PHASE 1)
   */
  private async queryPinnedSource(
    queryEmbedding: number[],
    companyId: string,
    pinnedSourceRfpId: string,
    topK: number
  ) {
    try {
      const results = await this.namespace.query({
        vector: queryEmbedding,
        topK,
        filter: {
          tenant_id: { $eq: companyId },
          documentPurpose: { $eq: 'rfp_response' },
          rfpId: { $eq: pinnedSourceRfpId },
        },
        includeMetadata: true,
      });

      return results.matches.map((match: any) => ({
        id: match.id,
        text: (match.metadata as RFPVectorMetadata)?.text || '',
        score: match.score || 0,
        metadata: match.metadata as RFPVectorMetadata,
      }));
    } catch (error) {
      console.error('[DualQueryEngine] Error querying pinned source:', error);
      return [];
    }
  }

  /**
   * Query support documents (PHASE 2A)
   */
  private async querySupportDocs(
    queryEmbedding: number[],
    companyId: string,
    category: string,
    topK: number
  ) {
    try {
      // Try with full filters first (including contentTypeTags)
      try {
        const results = await this.namespace.query({
          vector: queryEmbedding,
          topK,
          filter: {
            tenant_id: { $eq: companyId },
            documentPurpose: { $eq: 'rfp_support' },
            contentTypeTags: { $in: [category, 'general'] },
          },
          includeMetadata: true,
        });

        if (results.matches.length > 0) {
          return results.matches.map((match: any) => ({
            id: match.id,
            text: (match.metadata as RFPVectorMetadata)?.text || '',
            score: match.score || 0,
            metadata: match.metadata as RFPVectorMetadata,
          }));
        }
      } catch (filterError) {
        console.warn('[DualQueryEngine] contentTypeTags filter failed, trying fallback without it');
      }

      // Fallback: Query without contentTypeTags filter (for backward compatibility)
      const results = await this.namespace.query({
        vector: queryEmbedding,
        topK,
        filter: {
          tenant_id: { $eq: companyId },
          documentPurpose: { $eq: 'rfp_support' },
        },
        includeMetadata: true,
      });

      return results.matches.map((match: any) => ({
        id: match.id,
        text: (match.metadata as RFPVectorMetadata)?.text || '',
        score: match.score || 0,
        metadata: match.metadata as RFPVectorMetadata,
      }));
    } catch (error) {
      console.error('[DualQueryEngine] Error querying support docs:', error);
      return [];
    }
  }

  /**
   * Query historical RFPs (PHASE 2B)
   */
  private async queryHistoricalRfps(
    queryEmbedding: number[],
    companyId: string,
    topK: number
  ) {
    try {
      // Try with full filters first (including isHistoricalRfp)
      try {
        const results = await this.namespace.query({
          vector: queryEmbedding,
          topK,
          filter: {
            tenant_id: { $eq: companyId },
            documentPurpose: { $eq: 'rfp_response' },
            isHistoricalRfp: { $eq: true },
          },
          includeMetadata: true,
        });

        if (results.matches.length > 0) {
          return results.matches.map((match: any) => ({
            id: match.id,
            text: (match.metadata as RFPVectorMetadata)?.text || '',
            score: match.score || 0,
            metadata: match.metadata as RFPVectorMetadata,
          }));
        }
      } catch (filterError) {
        console.warn('[DualQueryEngine] isHistoricalRfp filter failed, trying fallback without it');
      }

      // Fallback: Query without isHistoricalRfp filter (for backward compatibility)
      const results = await this.namespace.query({
        vector: queryEmbedding,
        topK,
        filter: {
          tenant_id: { $eq: companyId },
          documentPurpose: { $eq: 'rfp_response' },
        },
        includeMetadata: true,
      });

      return results.matches.map((match: any) => ({
        id: match.id,
        text: (match.metadata as RFPVectorMetadata)?.text || '',
        score: match.score || 0,
        metadata: match.metadata as RFPVectorMetadata,
      }));
    } catch (error) {
      console.error('[DualQueryEngine] Error querying historical RFPs:', error);
      return [];
    }
  }

  /**
   * Deduplicate results by chunk ID
   */
  private deduplicateByChunk(results: any[]): any[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = r.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate composite scores using multiple factors
   *
   * Factors:
   * - Semantic score (40%): Cosine similarity from Pinecone
   * - Outcome score (25%): How successful was the RFP (won/lost)
   * - Recency score (15%): How recent is the content
   * - Quality score (20%): Quality rating of the document
   * - Source boost: Multiplier based on source type (pinned > support > historical)
   */
  private calculateCompositeScores(results: any[]): any[] {
    return results.map((result) => {
      const semanticScore = result.score; // 0-1 from Pinecone
      const outcomeScore = this.calculateOutcomeScore(result.metadata);
      const recencyScore = this.calculateRecencyScore(result.metadata.createdAt);
      const qualityScore = (result.metadata.qualityScore || 70) / 100; // Normalize to 0-1
      const sourceBoost = result.boost;

      const compositeScore =
        (semanticScore * 0.4 +
          outcomeScore * 0.25 +
          recencyScore * 0.15 +
          qualityScore * 0.2) *
        sourceBoost;

      return {
        ...result,
        compositeScore,
        breakdown: {
          semanticScore,
          outcomeScore,
          recencyScore,
          qualityScore,
          sourceBoost,
        },
      };
    });
  }

  /**
   * Calculate outcome score based on RFP result
   */
  private calculateOutcomeScore(metadata: RFPVectorMetadata): number {
    if (metadata.outcomeScore !== undefined) {
      return metadata.outcomeScore;
    }

    // Fallback to rfpOutcome
    switch (metadata.rfpOutcome) {
      case 'won':
        return 1.0;
      case 'lost':
        return 0.3;
      default:
        return 0.5;
    }
  }

  /**
   * Calculate recency score using exponential decay
   * Half-life: 180 days (6 months)
   */
  private calculateRecencyScore(createdAt?: string): number {
    if (!createdAt) return 0.5; // Default if no date

    const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const halfLife = 180; // 6 months
    return Math.exp((-Math.log(2) * ageInDays) / halfLife);
  }

  /**
   * Group results by document ID
   */
  private groupByDocument(results: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    for (const result of results) {
      const docId = result.metadata.documentId;
      if (!grouped.has(docId)) {
        grouped.set(docId, []);
      }
      grouped.get(docId)!.push({
        id: result.id,
        text: result.text,
        score: result.score,
        compositeScore: result.compositeScore,
      });
    }
    return grouped;
  }
}
