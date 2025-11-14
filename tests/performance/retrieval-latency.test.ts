/**
 * Performance Tests for Retrieval Latency
 * Phase 3 Day 12-13 - Tests Automatisés
 *
 * Target: P95 latency < 300ms for dual query retrieval
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DualQueryEngine } from '@/lib/rag/dual-query-engine';

// Mock Pinecone with realistic latency simulation
vi.mock('@/lib/rfp/pinecone', () => ({
  getPineconeIndex: vi.fn(() => ({
    namespace: vi.fn(() => ({
      query: vi.fn(async () => {
        // Simulate realistic Pinecone latency (50-150ms)
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50));
        return {
          matches: [
            {
              id: 'test-1',
              score: 0.85,
              metadata: {
                documentId: 'doc-1',
                tenant_id: 'test-company',
                category: 'test',
                text: 'Test content',
                createdAt: Date.now(),
              },
            },
          ],
        };
      }),
    })),
  })),
  getRFPNamespace: vi.fn(() => ({
    query: vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50));
      return { matches: [] };
    }),
  })),
}));

describe('Retrieval Performance Tests', () => {
  let engine: DualQueryEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new DualQueryEngine();
  });

  describe('Latency Benchmarks', () => {
    it('should retrieve results in <300ms (P95)', async () => {
      const latencies: number[] = [];
      const testEmbedding = new Array(1536).fill(0.1);

      // Run 100 queries to get P95
      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await engine.retrieve(testEmbedding, 'test-category', 'test-company', {});
        const latency = Date.now() - start;
        latencies.push(latency);
      }

      // Calculate percentiles
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];

      console.log(`\n📊 Latency Percentiles:`);
      console.log(`   P50: ${p50}ms`);
      console.log(`   P95: ${p95}ms`);
      console.log(`   P99: ${p99}ms`);
      console.log(`   Min: ${Math.min(...latencies)}ms`);
      console.log(`   Max: ${Math.max(...latencies)}ms`);
      console.log(`   Avg: ${Math.round(latencies.reduce((a, b) => a + b) / latencies.length)}ms\n`);

      // P95 should be < 300ms
      expect(p95).toBeLessThan(300);
    }, 60000); // 60s timeout for 100 queries

    it('should handle concurrent queries efficiently', async () => {
      const testEmbedding = new Array(1536).fill(0.1);
      const concurrentQueries = 10;

      const start = Date.now();
      const results = await Promise.all(
        Array.from({ length: concurrentQueries }, () => engine.retrieve(testEmbedding, 'test', 'test-company', {}))
      );
      const totalTime = Date.now() - start;

      console.log(`\n🚀 Concurrent Query Performance:`);
      console.log(`   Queries: ${concurrentQueries}`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Avg per query: ${Math.round(totalTime / concurrentQueries)}ms\n`);

      // Should complete all queries in reasonable time
      expect(totalTime).toBeLessThan(concurrentQueries * 300); // Not strictly sequential
      expect(results).toHaveLength(concurrentQueries);
    });

    it('should scale with increasing topK parameter', async () => {
      const testEmbedding = new Array(1536).fill(0.1);
      const topKValues = [5, 10, 20, 50];
      const results: { topK: number; latency: number }[] = [];

      for (const topK of topKValues) {
        const start = Date.now();
        await engine.retrieve(testEmbedding, 'test', 'test-company', { topK });
        const latency = Date.now() - start;
        results.push({ topK, latency });
      }

      console.log(`\n📈 Scaling with topK:`);
      results.forEach(({ topK, latency }) => {
        console.log(`   topK=${topK}: ${latency}ms`);
      });
      console.log('');

      // Latency should scale sub-linearly with topK
      results.forEach(({ latency }) => {
        expect(latency).toBeLessThan(500); // Should still be fast
      });
    });
  });

  describe('Throughput Tests', () => {
    it('should handle 100 queries per minute', async () => {
      const testEmbedding = new Array(1536).fill(0.1);
      const targetQueries = 100;

      const start = Date.now();
      const results = await Promise.all(
        Array.from({ length: targetQueries }, () => engine.retrieve(testEmbedding, 'test', 'test-company', {}))
      );
      const totalTime = Date.now() - start;

      const qpm = Math.round((targetQueries / totalTime) * 60000);

      console.log(`\n⚡ Throughput Test:`);
      console.log(`   Queries: ${targetQueries}`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   QPM (Queries Per Minute): ${qpm}\n`);

      // Should achieve > 100 QPM
      expect(qpm).toBeGreaterThan(100);
      expect(results).toHaveLength(targetQueries);
    }, 120000); // 2 minute timeout
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated queries', async () => {
      const testEmbedding = new Array(1536).fill(0.1);
      const iterations = 1000;

      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        await engine.retrieve(testEmbedding, 'test', 'test-company', {});

        // Force GC every 100 iterations
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = (memAfter - memBefore) / 1024 / 1024; // MB

      console.log(`\n💾 Memory Usage:`);
      console.log(`   Before: ${Math.round(memBefore / 1024 / 1024)}MB`);
      console.log(`   After: ${Math.round(memAfter / 1024 / 1024)}MB`);
      console.log(`   Increase: ${Math.round(memIncrease)}MB\n`);

      // Memory increase should be minimal (<50MB for 1000 queries)
      expect(memIncrease).toBeLessThan(50);
    }, 120000);
  });

  describe('Cold Start Performance', () => {
    it('should have acceptable cold start latency (<500ms)', async () => {
      // Create new engine to simulate cold start
      const freshEngine = new DualQueryEngine();
      const testEmbedding = new Array(1536).fill(0.1);

      const start = Date.now();
      await freshEngine.retrieve(testEmbedding, 'test', 'test-company', {});
      const coldStartLatency = Date.now() - start;

      console.log(`\n🥶 Cold Start Latency: ${coldStartLatency}ms\n`);

      expect(coldStartLatency).toBeLessThan(500);
    });
  });
});
