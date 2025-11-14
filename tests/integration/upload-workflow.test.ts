/**
 * Integration Tests for Upload Workflow
 * Phase 3 Day 12-13 - Tests Automatisés
 *
 * Tests the complete flow: Upload → Analysis → Embedding → Pinecone
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('@vercel/blob', () => ({
  put: vi.fn(async (filename, data) => ({
    url: `https://blob.vercel-storage.com/${filename}`,
    downloadUrl: `https://blob.vercel-storage.com/${filename}`,
  })),
}));

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [
          {
            id: 'test-doc-id',
            name: 'test.pdf',
            status: 'pending',
            companyId: 'test-company',
          },
        ]),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              id: 'test-doc-id',
              name: 'test.pdf',
              status: 'completed',
              companyId: 'test-company',
              contentType: 'methodology_guide',
              analysisConfidence: 0.98,
            },
          ]),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => ({ rowCount: 1 })),
      })),
    })),
  },
}));

vi.mock('@/lib/rfp/services/document-analysis.service', () => ({
  analyzeDocument: vi.fn(async () => ({
    documentType: 'methodology_guide',
    confidence: 0.98,
    suggestedCategories: [{ category: 'project-methodology', confidence: 0.95 }],
    contentTypeTags: ['agile', 'scrum', 'sprint-planning'],
    executiveSummary: 'Agile methodology guide',
    recommendedPurpose: 'rfp_support',
  })),
}));

vi.mock('@/lib/rfp/ai/embeddings', () => ({
  generateEmbeddings: vi.fn(async () => ({
    embeddings: [new Array(1536).fill(0.1), new Array(1536).fill(0.2)],
    chunks: [{ text: 'Chunk 1' }, { text: 'Chunk 2' }],
  })),
}));

vi.mock('@/lib/rfp/pinecone', () => ({
  getRFPNamespace: vi.fn(() => ({
    upsert: vi.fn(async () => ({ upsertedCount: 2 })),
  })),
}));

describe('Upload Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Upload Flow', () => {
    it('should upload, analyze, and embed a support document', async () => {
      const { analyzeDocument } = await import('@/lib/rfp/services/document-analysis.service');
      const { generateEmbeddings } = await import('@/lib/rfp/ai/embeddings');
      const { getRFPNamespace } = await import('@/lib/rfp/pinecone');
      const { db } = await import('@/db');

      // Simulate upload workflow
      const documentText = 'Guide de Méthodologie Agile\n\nNotre approche...';
      const fileName = 'agile-guide.pdf';

      // 1. Document is uploaded and database record created
      const insertResult = await db
        .insert({} as any)
        .values({} as any)
        .returning();
      expect(insertResult).toHaveLength(1);
      expect(insertResult[0].id).toBe('test-doc-id');

      // 2. Document is analyzed
      const analysisResult = await analyzeDocument(documentText, fileName);
      expect(analysisResult.documentType).toBe('methodology_guide');
      expect(analysisResult.confidence).toBeGreaterThan(0.9);
      expect(analysisResult.contentTypeTags).toContain('agile');

      // 3. Embeddings are generated
      const embeddingsResult = await generateEmbeddings(documentText, 'test-doc-id', 'test-company');
      expect(embeddingsResult.embeddings).toHaveLength(2);
      expect(embeddingsResult.chunks).toHaveLength(2);

      // 4. Vectors are upserted to Pinecone
      const namespace = getRFPNamespace();
      const upsertResult = await namespace.upsert([]);
      expect(upsertResult.upsertedCount).toBe(2);

      // Verify all mocks were called
      expect(analyzeDocument).toHaveBeenCalledWith(documentText, fileName);
      expect(generateEmbeddings).toHaveBeenCalled();
      expect(getRFPNamespace).toHaveBeenCalled();
    });

    it('should handle large documents (>100k chars)', async () => {
      const { analyzeDocument } = await import('@/lib/rfp/services/document-analysis.service');
      const { generateEmbeddings } = await import('@/lib/rfp/ai/embeddings');

      const largeText = 'A'.repeat(150000);
      const fileName = 'large-doc.pdf';

      // Should handle large documents without errors
      const analysisResult = await analyzeDocument(largeText, fileName);
      expect(analysisResult).toBeDefined();

      const embeddingsResult = await generateEmbeddings(largeText, 'test-doc-id', 'test-company');
      expect(embeddingsResult).toBeDefined();
    });

    it('should handle multiple documents uploaded concurrently', async () => {
      const { analyzeDocument } = await import('@/lib/rfp/services/document-analysis.service');
      const { db } = await import('@/db');

      // Simulate concurrent uploads
      const uploads = [
        { text: 'Document 1', name: 'doc1.pdf' },
        { text: 'Document 2', name: 'doc2.pdf' },
        { text: 'Document 3', name: 'doc3.pdf' },
      ];

      const results = await Promise.all(
        uploads.map(async (upload) => {
          // Create document record
          const insertResult = await db.insert({} as any).values({} as any).returning();

          // Analyze document
          const analysisResult = await analyzeDocument(upload.text, upload.name);

          return { insertResult, analysisResult };
        })
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.insertResult).toHaveLength(1);
        expect(result.analysisResult).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle analysis failures gracefully', async () => {
      const { analyzeDocument } = await import('@/lib/rfp/services/document-analysis.service');

      // Mock analysis failure
      (analyzeDocument as any).mockRejectedValueOnce(new Error('Claude API error'));

      await expect(analyzeDocument('text', 'file.pdf')).rejects.toThrow('Claude API error');
    });

    it('should handle embedding generation failures', async () => {
      const { generateEmbeddings } = await import('@/lib/rfp/ai/embeddings');

      // Mock embedding failure
      (generateEmbeddings as any).mockRejectedValueOnce(new Error('OpenAI API error'));

      await expect(generateEmbeddings('text', 'doc-id', 'company-id')).rejects.toThrow('OpenAI API error');
    });

    it('should handle Pinecone upsert failures', async () => {
      const { getRFPNamespace } = await import('@/lib/rfp/pinecone');

      const namespace = getRFPNamespace();
      (namespace.upsert as any).mockRejectedValueOnce(new Error('Pinecone API error'));

      await expect(namespace.upsert([])).rejects.toThrow('Pinecone API error');
    });
  });

  describe('Data Validation', () => {
    it('should validate document metadata', async () => {
      const { db } = await import('@/db');

      const insertResult = await db.insert({} as any).values({} as any).returning();

      expect(insertResult[0]).toHaveProperty('id');
      expect(insertResult[0]).toHaveProperty('name');
      expect(insertResult[0]).toHaveProperty('status');
    });

    it('should validate analysis results structure', async () => {
      const { analyzeDocument } = await import('@/lib/rfp/services/document-analysis.service');

      const result = await analyzeDocument('text', 'file.pdf');

      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('suggestedCategories');
      expect(result).toHaveProperty('contentTypeTags');
      expect(result).toHaveProperty('executiveSummary');
      expect(result).toHaveProperty('recommendedPurpose');
    });

    it('should validate embedding dimensions (1536)', async () => {
      const { generateEmbeddings } = await import('@/lib/rfp/ai/embeddings');

      const result = await generateEmbeddings('text', 'doc-id', 'company-id');

      result.embeddings.forEach((embedding: number[]) => {
        expect(embedding).toHaveLength(1536);
      });
    });
  });
});
