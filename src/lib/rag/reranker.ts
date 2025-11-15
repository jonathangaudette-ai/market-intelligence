/**
 * Pinecone Reranker Module
 * Provides reranking functionality using Pinecone Inference API
 *
 * IMPORTANT: Requires Pinecone SDK v4.0+ with Inference API support
 * Cost: ~$0.002 per request (1 rerank unit) for bge-reranker-v2-m3
 */

import { Pinecone } from '@pinecone-database/pinecone';

// ============================================================================
// TYPE DEFINITIONS (Strict TypeScript)
// ============================================================================

export interface RerankCandidate {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  score: number; // Original similarity score from vector search
}

export interface RerankResult {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  originalScore: number;  // Original vector similarity score
  rerankScore: number;    // Reranked relevance score (0-1)
  index: number;          // Original index in candidate list
}

export interface RerankMetrics {
  model: string;
  candidatesCount: number;
  topK: number;
  latencyMs: number;
  rerankUnits: number;
}

export interface RerankParams {
  query: string;
  candidates: RerankCandidate[];
  topK: number;
  model?: 'bge-reranker-v2-m3' | 'pinecone-rerank-v0';
}

export interface RerankResponse {
  results: RerankResult[];
  metrics: RerankMetrics;
}

// ============================================================================
// PINECONE RERANKER CLASS
// ============================================================================

export class PineconeReranker {
  private pinecone: Pinecone;

  constructor() {
    // Lazy initialization from environment variable
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not set');
    }

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }

  /**
   * Rerank candidates using Pinecone Inference API
   *
   * @param params - Reranking parameters
   * @returns Reranked results with metrics
   * @throws Error if Pinecone API call fails (caller should handle fallback)
   *
   * @example
   * ```typescript
   * const reranker = new PineconeReranker();
   * const { results, metrics } = await reranker.rerank({
   *   query: 'capital of France',
   *   candidates: [{ id: '1', text: 'Paris is...', metadata: {}, score: 0.85 }],
   *   topK: 5,
   * });
   * ```
   */
  async rerank(params: RerankParams): Promise<RerankResponse> {
    const { query, candidates, topK, model = 'bge-reranker-v2-m3' } = params;

    // Handle empty candidates gracefully
    if (candidates.length === 0) {
      return {
        results: [],
        metrics: this.emptyMetrics(),
      };
    }

    const start = Date.now();

    try {
      // Pinecone SDK v6 signature: rerank(model, query, documents, options)
      const documents = candidates.map(c => c.text);

      const response = await this.pinecone.inference.rerank(
        model,
        query,
        documents,
        {
          topN: Math.min(topK, candidates.length),
          returnDocuments: true,
        }
      );

      // Build O(1) lookup map for candidate metadata
      const candidateMap = new Map(
        candidates.map((c, idx) => [idx, c])
      );

      // Transform response to RerankResult format
      const results: RerankResult[] = response.data
        .map((item): RerankResult | null => {
          const original = candidateMap.get(item.index);
          if (!original) {
            console.warn(`[Reranker] Index mismatch: ${item.index}`);
            return null;
          }

          return {
            id: original.id,
            text: original.text,
            metadata: original.metadata,
            originalScore: original.score,
            rerankScore: item.score,
            index: item.index,
          };
        })
        .filter((item): item is RerankResult => item !== null);

      const metrics: RerankMetrics = {
        model: response.model,
        candidatesCount: candidates.length,
        topK,
        latencyMs: Date.now() - start,
        rerankUnits: response.usage?.rerankUnits || 1,
      };

      console.log(
        `[Reranker] ${candidates.length} → ${results.length} in ${metrics.latencyMs}ms ` +
        `(${metrics.rerankUnits} units, model: ${model})`
      );

      return { results, metrics };

    } catch (error) {
      const latencyMs = Date.now() - start;
      console.error(`[Reranker] API call failed after ${latencyMs}ms:`, error);

      // Throw error to let caller handle fallback strategy
      throw new Error(
        `Pinecone rerank failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Empty metrics for when there are no candidates
   */
  private emptyMetrics(): RerankMetrics {
    return {
      model: '',
      candidatesCount: 0,
      topK: 0,
      latencyMs: 0,
      rerankUnits: 0,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE (Optional - can be imported directly)
// ============================================================================

let _reranker: PineconeReranker | null = null;

/**
 * Get singleton instance of PineconeReranker
 * Lazy initialization to avoid connecting during build time
 */
export function getReranker(): PineconeReranker {
  if (!_reranker) {
    _reranker = new PineconeReranker();
  }
  return _reranker;
}
