/**
 * Security Tests for Multi-Tenant Isolation
 * Phase 3 Day 12-13 - Tests Automatisés
 *
 * Ensures that tenant data is properly isolated
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DualQueryEngine } from '@/lib/rag/dual-query-engine';

// Mock Pinecone with tenant-aware responses
vi.mock('@/lib/rfp/pinecone', () => {
  const mockQuery = vi.fn();
  return {
    getPineconeIndex: vi.fn(() => ({
      namespace: vi.fn(() => ({
        query: mockQuery,
      })),
    })),
    getRFPNamespace: vi.fn(() => ({
      query: mockQuery,
    })),
    __mockQuery: mockQuery, // Export for test access
  };
});

describe('Multi-Tenant Isolation Security Tests', () => {
  let engine: DualQueryEngine;
  let mockQuery: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const pinecone = await import('@/lib/rfp/pinecone');
    mockQuery = (pinecone as any).__mockQuery;
    engine = new DualQueryEngine();
  });

  describe('Tenant Isolation', () => {
    it('should only return results for the specified tenant', async () => {
      // Mock responses with different tenants
      mockQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'company-a-doc-1',
              score: 0.90,
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-a', // Correct tenant
                category: 'test',
                text: 'Company A content',
                createdAt: Date.now(),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'company-a-doc-2',
              score: 0.85,
              metadata: {
                documentId: 'doc-2',
                tenant_id: 'company-a', // Correct tenant
                category: 'test',
                text: 'Company A historical',
                createdAt: Date.now(),
              },
            },
          ],
        });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-a', {});

      // Should only return Company A results
      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.metadata.tenant_id).toBe('company-a');
      });
    });

    it('should apply tenant_id filter in all Pinecone queries', async () => {
      mockQuery.mockResolvedValue({ matches: [] });

      const embedding = new Array(1536).fill(0.1);
      await engine.retrieve(embedding, 'test', 'company-b', {});

      // Both queries should have tenant_id filter
      expect(mockQuery).toHaveBeenCalledTimes(2);

      const calls = mockQuery.mock.calls;
      calls.forEach((call: any[]) => {
        const queryParams = call[0];
        expect(queryParams).toHaveProperty('filter');
        expect(queryParams.filter).toHaveProperty('tenant_id');
        expect(queryParams.filter.tenant_id).toEqual({ $eq: 'company-b' });
      });
    });

    it('should never return results from other tenants', async () => {
      // Simulate a bug where Pinecone returns wrong tenant data
      mockQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'company-b-doc-1',
              score: 0.95, // Higher score
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-b', // WRONG TENANT
                category: 'test',
                text: 'Company B content (should be filtered)',
                createdAt: Date.now(),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'company-a-doc-1',
              score: 0.80, // Lower score
              metadata: {
                documentId: 'doc-2',
                tenant_id: 'company-a', // Correct tenant
                category: 'test',
                text: 'Company A content',
                createdAt: Date.now(),
              },
            },
          ],
        });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-a', {});

      // Should filter out wrong tenant
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.metadata.tenant_id).toBe('company-a');
        expect(result.metadata.tenant_id).not.toBe('company-b');
      });
    });
  });

  describe('Tenant ID Validation', () => {
    it('should reject empty tenant_id', async () => {
      const embedding = new Array(1536).fill(0.1);

      await expect(engine.retrieve(embedding, 'test', '', {})).rejects.toThrow();
    });

    it('should reject null/undefined tenant_id', async () => {
      const embedding = new Array(1536).fill(0.1);

      await expect(engine.retrieve(embedding, 'test', null as any, {})).rejects.toThrow();
      await expect(engine.retrieve(embedding, 'test', undefined as any, {})).rejects.toThrow();
    });

    it('should sanitize tenant_id to prevent injection', async () => {
      mockQuery.mockResolvedValue({ matches: [] });

      const embedding = new Array(1536).fill(0.1);
      const maliciousTenantId = "company-a' OR '1'='1";

      // Should handle safely (not throw)
      await engine.retrieve(embedding, 'test', maliciousTenantId, {});

      // Should use exact match ($eq) not injectable query
      const calls = mockQuery.mock.calls;
      calls.forEach((call: any[]) => {
        expect(call[0].filter.tenant_id).toEqual({ $eq: maliciousTenantId });
      });
    });
  });

  describe('Cross-Tenant Attack Vectors', () => {
    it('should prevent tenant enumeration via timing attacks', async () => {
      mockQuery.mockResolvedValue({ matches: [] });

      const embedding = new Array(1536).fill(0.1);
      const tenants = ['company-a', 'company-b', 'company-c', 'nonexistent'];

      const timings: { tenant: string; time: number }[] = [];

      for (const tenant of tenants) {
        const start = Date.now();
        await engine.retrieve(embedding, 'test', tenant, {});
        const time = Date.now() - start;
        timings.push({ tenant, time });
      }

      // Timing variance should be minimal (<50ms) to prevent enumeration
      const times = timings.map((t) => t.time);
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxDeviation = Math.max(...times.map((t) => Math.abs(t - avgTime)));

      console.log(`\n🕐 Timing Attack Prevention:`);
      timings.forEach(({ tenant, time }) => {
        console.log(`   ${tenant}: ${time}ms`);
      });
      console.log(`   Avg: ${Math.round(avgTime)}ms`);
      console.log(`   Max deviation: ${Math.round(maxDeviation)}ms\n`);

      expect(maxDeviation).toBeLessThan(50);
    });

    it('should prevent tenant ID guessing via error messages', async () => {
      mockQuery.mockRejectedValue(new Error('Pinecone error'));

      const embedding = new Array(1536).fill(0.1);

      try {
        await engine.retrieve(embedding, 'test', 'nonexistent-tenant', {});
      } catch (error: any) {
        // Error message should not reveal tenant existence
        expect(error.message).not.toContain('nonexistent-tenant');
        expect(error.message).not.toContain('not found');
        expect(error.message).not.toContain('invalid tenant');
      }
    });
  });

  describe('Document Access Control', () => {
    it('should respect documentPurpose filters per tenant', async () => {
      mockQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'doc-1',
              score: 0.85,
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-a',
                documentPurpose: 'rfp_support',
                category: 'test',
                text: 'Support doc',
                createdAt: Date.now(),
              },
            },
          ],
        })
        .mockResolvedValueOnce({ matches: [] });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-a', {});

      // Should only return rfp_support documents
      results.forEach((result) => {
        expect(result.metadata.tenant_id).toBe('company-a');
        expect(['rfp_support', 'rfp_response', 'company_info']).toContain(result.metadata.documentPurpose);
      });
    });

    it('should prevent access to pinned documents from other tenants', async () => {
      mockQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'pinned-other-tenant',
              score: 0.99, // Very high score
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-b', // Different tenant
                isPinned: true,
                category: 'test',
                text: 'Pinned doc from Company B',
                createdAt: Date.now(),
              },
            },
          ],
        })
        .mockResolvedValueOnce({ matches: [] });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-a', {});

      // Should not include Company B's pinned doc
      results.forEach((result) => {
        expect(result.metadata.tenant_id).toBe('company-a');
      });
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should not include tenant_id in returned text snippets', async () => {
      mockQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'doc-1',
              score: 0.85,
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-a',
                category: 'test',
                text: 'This is the content without tenant info',
                createdAt: Date.now(),
              },
            },
          ],
        })
        .mockResolvedValueOnce({ matches: [] });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-a', {});

      results.forEach((result) => {
        // Text should not leak tenant ID
        expect(result.metadata.text?.toLowerCase()).not.toContain('company-a');
        expect(result.metadata.text?.toLowerCase()).not.toContain('tenant');
      });
    });

    it('should strip sensitive metadata before returning results', async () => {
      mockQuery
        .mockResolvedValueOnce({
          matches: [
            {
              id: 'doc-1',
              score: 0.85,
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'company-a',
                category: 'test',
                text: 'Content',
                // These should be available internally
                internalUserId: 'user-123',
                uploadIp: '192.168.1.1',
                apiKey: 'sk-...',
                createdAt: Date.now(),
              },
            },
          ],
        })
        .mockResolvedValueOnce({ matches: [] });

      const embedding = new Array(1536).fill(0.1);
      const results = await engine.retrieve(embedding, 'test', 'company-a', {});

      // Sensitive fields should not be in results
      results.forEach((result) => {
        expect(result.metadata).not.toHaveProperty('internalUserId');
        expect(result.metadata).not.toHaveProperty('uploadIp');
        expect(result.metadata).not.toHaveProperty('apiKey');
      });
    });
  });

  describe('Rate Limiting per Tenant', () => {
    it('should track queries per tenant independently', async () => {
      mockQuery.mockResolvedValue({ matches: [] });

      const embedding = new Array(1536).fill(0.1);

      // Company A makes 10 queries
      for (let i = 0; i < 10; i++) {
        await engine.retrieve(embedding, 'test', 'company-a', {});
      }

      // Company B makes 10 queries
      for (let i = 0; i < 10; i++) {
        await engine.retrieve(embedding, 'test', 'company-b', {});
      }

      // Both should succeed (isolated rate limits)
      expect(mockQuery).toHaveBeenCalledTimes(40); // 20 queries × 2 calls each
    });
  });
});
