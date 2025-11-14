/**
 * Unit Tests for DualQueryEngine
 * Phase 3 Day 12-13 - Tests Automatisés
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DualQueryEngine } from '../dual-query-engine';
import type { Pinecone } from '@pinecone-database/pinecone';

// Mock Pinecone
vi.mock('@/lib/rfp/pinecone', () => ({
  getPineconeIndex: vi.fn(() => ({
    namespace: vi.fn(() => ({
      query: vi.fn(),
    })),
  })),
  getRFPNamespace: vi.fn(() => ({
    query: vi.fn(),
  })),
}));

describe('DualQueryEngine', () => {
  let engine: DualQueryEngine;
  let mockPineconeQuery: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Pinecone query function
    mockPineconeQuery = vi.fn();

    // Create engine instance with mock
    engine = new DualQueryEngine();
    (engine as any).namespace = {
      query: mockPineconeQuery,
    };
  });

  describe('retrieve()', () => {
    it('should execute dual queries (support docs + historical RFPs)', async () => {
      // Mock responses
      mockPineconeQuery
        .mockResolvedValueOnce({
          // Support docs query
          matches: [
            {
              id: 'support-1',
              score: 0.85,
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-1',
                documentPurpose: 'rfp_support',
                contentType: 'methodology_guide',
                category: 'project-methodology',
                text: 'Agile methodology content',
                createdAt: Date.now() - 86400000, // 1 day ago
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          // Historical RFPs query
          matches: [
            {
              id: 'historical-1',
              score: 0.80,
              metadata: {
                documentId: 'doc-2',
                tenant_id: 'company-1',
                isHistoricalRfp: true,
                category: 'project-methodology',
                text: 'Historical RFP response',
                outcomeScore: 0.9,
                timesUsed: 5,
                createdAt: Date.now() - 172800000, // 2 days ago
              },
            },
          ],
        });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'project-methodology', 'company-1', {});

      // Should have called query twice
      expect(mockPineconeQuery).toHaveBeenCalledTimes(2);

      // Should return merged and ranked results
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('source');
      expect(results[0]).toHaveProperty('metadata');
    });

    it('should apply source-specific boosts (pinned: 1.5x, support: 1.2x, historical: 1.0x)', async () => {
      mockPineconeQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'support-1',
              score: 0.75,
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-1',
                documentPurpose: 'rfp_support',
                isPinned: false,
                category: 'test',
                text: 'Support doc',
                createdAt: Date.now(),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'historical-1',
              score: 0.75,
              metadata: {
                documentId: 'doc-2',
                tenant_id: 'company-1',
                isHistoricalRfp: true,
                category: 'test',
                text: 'Historical RFP',
                createdAt: Date.now(),
              },
            },
          ],
        });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-1', {});

      // Support doc should have higher composite score due to 1.2x boost
      const supportResult = results.find((r) => r.metadata.documentPurpose === 'rfp_support');
      const historicalResult = results.find((r) => r.metadata.isHistoricalRfp === true);

      expect(supportResult!.score).toBeGreaterThan(historicalResult!.score);
    });

    it('should calculate composite score correctly', async () => {
      const now = Date.now();
      mockPineconeQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'test-1',
              score: 0.8, // semantic score
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-1',
                documentPurpose: 'rfp_support',
                category: 'test',
                text: 'Test content',
                outcomeScore: 0.9, // outcome
                timesUsed: 10, // usage
                analysisConfidence: 0.95, // quality
                createdAt: now - 86400000, // 1 day ago (recency)
              },
            },
          ],
        })
        .mockResolvedValueOnce({ matches: [] });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-1', {});

      expect(results).toHaveLength(1);

      // Composite score should be weighted combination
      // Formula: (semantic * 0.4) + (outcome * 0.25) + (recency * 0.15) + (quality * 0.2)
      const result = results[0];
      expect(result.score).toBeGreaterThan(0.7); // Should be high due to good metrics
      expect(result.score).toBeLessThan(1.0);
    });

    it('should deduplicate results by documentId', async () => {
      mockPineconeQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'support-1',
              score: 0.85,
              metadata: {
                documentId: 'doc-1', // Same document
                tenant_id: 'company-1',
                documentPurpose: 'rfp_support',
                category: 'test',
                text: 'Content',
                createdAt: Date.now(),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'historical-1',
              score: 0.80,
              metadata: {
                documentId: 'doc-1', // Same document (duplicate)
                tenant_id: 'company-1',
                isHistoricalRfp: true,
                category: 'test',
                text: 'Content',
                createdAt: Date.now(),
              },
            },
          ],
        });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-1', {});

      // Should keep only one (higher scoring)
      expect(results).toHaveLength(1);
      expect(results[0].metadata.documentId).toBe('doc-1');
    });

    it('should respect topK limit', async () => {
      const manyMatches = Array.from({ length: 20 }, (_, i) => ({
        id: `match-${i}`,
        score: 0.8 - i * 0.01,
        metadata: {
          documentId: `doc-${i}`,
          tenant_id: 'company-1',
          category: 'test',
          text: `Content ${i}`,
          createdAt: Date.now(),
        },
      }));

      mockPineconeQuery
        .mockResolvedValueOnce({ matches: manyMatches.slice(0, 10) })
        .mockResolvedValueOnce({ matches: manyMatches.slice(10, 20) });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-1', { topK: 5 });

      expect(results).toHaveLength(5);
    });

    it('should filter by tenant_id for multi-tenant isolation', async () => {
      const embedding = new Array(1536).fill(0.1);
      await engine.retrieve(embedding, 'test', 'company-1', {});

      // Both queries should have tenant_id filter
      expect(mockPineconeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            tenant_id: { $eq: 'company-1' },
          }),
        })
      );
    });

    it('should handle empty results gracefully', async () => {
      mockPineconeQuery.mockResolvedValueOnce({ matches: [] }).mockResolvedValueOnce({ matches: [] });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-1', {});

      expect(results).toHaveLength(0);
    });

    it('should prioritize pinned documents with 1.5x boost', async () => {
      mockPineconeQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'pinned-1',
              score: 0.70, // Lower base score
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-1',
                isPinned: true, // Pinned
                category: 'test',
                text: 'Pinned content',
                createdAt: Date.now(),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'historical-1',
              score: 0.85, // Higher base score
              metadata: {
                documentId: 'doc-2',
                tenant_id: 'company-1',
                isHistoricalRfp: true,
                category: 'test',
                text: 'Historical content',
                createdAt: Date.now(),
              },
            },
          ],
        });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-1', {});

      // Pinned doc should rank higher despite lower base score
      expect(results[0].metadata.isPinned).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Pinecone API errors', async () => {
      mockPineconeQuery.mockRejectedValueOnce(new Error('Pinecone API error'));

      const embedding = new Array(1536).fill(0.1);

      await expect(engine.retrieve(embedding, 'test', 'company-1', {})).rejects.toThrow('Pinecone API error');
    });

    it('should handle invalid embeddings', async () => {
      const invalidEmbedding: any = null;

      await expect(engine.retrieve(invalidEmbedding, 'test', 'company-1', {})).rejects.toThrow();
    });
  });
});
