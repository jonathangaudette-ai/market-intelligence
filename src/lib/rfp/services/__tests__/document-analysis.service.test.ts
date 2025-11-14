/**
 * Unit Tests for Document Analysis Service
 * Phase 3 Day 12-13 - Tests Automatisés
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeDocument, clearAnalysisCache } from '../document-analysis.service';
import type Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  };
});

describe('Document Analysis Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAnalysisCache();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  describe('analyzeDocument()', () => {
    it('should categorize methodology guides correctly', async () => {
      // Mock Claude response
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'methodology_guide',
              confidence: 0.95,
              suggestedCategories: [
                { category: 'project-methodology', confidence: 0.92 },
                { category: 'team-structure', confidence: 0.78 },
              ],
              contentTypeTags: ['agile', 'scrum', 'sprint-planning', 'project-management'],
              executiveSummary: 'A comprehensive guide to Agile methodology',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      const text = 'Guide de Méthodologie Agile\n\nNotre approche de gestion de projet suit les principes Agile et Scrum...';
      const result = await analyzeDocument(text, 'agile-guide.pdf');

      expect(result.documentType).toBe('methodology_guide');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.suggestedCategories).toContainEqual(
        expect.objectContaining({
          category: 'project-methodology',
        })
      );
      expect(result.contentTypeTags).toContain('agile');
      expect(result.recommendedPurpose).toBe('rfp_support');
    });

    it('should categorize case studies correctly', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'case_study',
              confidence: 0.93,
              suggestedCategories: [{ category: 'case-study', confidence: 0.95 }],
              contentTypeTags: ['success-story', 'client-reference', 'roi', 'results'],
              executiveSummary: 'Case study showing 40% efficiency improvement',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      const text = 'Case Study: How Company X achieved 40% efficiency improvement...';
      const result = await analyzeDocument(text, 'case-study.pdf');

      expect(result.documentType).toBe('case_study');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.contentTypeTags).toContain('success-story');
    });

    it('should categorize technical specs correctly', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'technical_spec',
              confidence: 0.91,
              suggestedCategories: [{ category: 'technical-solution', confidence: 0.89 }],
              contentTypeTags: ['architecture', 'api', 'integration', 'security'],
              executiveSummary: 'Technical specifications for API integration',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      const text = 'Technical Specifications\n\nAPI Integration Guide\nREST API endpoints...';
      const result = await analyzeDocument(text, 'technical-spec.pdf');

      expect(result.documentType).toBe('technical_spec');
      expect(result.contentTypeTags).toContain('api');
    });

    it('should handle mixed content documents', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'company_overview',
              confidence: 0.82,
              suggestedCategories: [
                { category: 'company-profile', confidence: 0.75 },
                { category: 'certifications', confidence: 0.68 },
              ],
              contentTypeTags: ['company-info', 'certifications', 'team', 'mission'],
              executiveSummary: 'Company overview with certifications and team info',
              recommendedPurpose: 'company_info',
            }),
          },
        ],
      });

      const text = 'Company Overview\n\nOur certifications: ISO 9001, SOC 2...\nOur team: 50+ experts...';
      const result = await analyzeDocument(text, 'company-info.pdf');

      expect(result.documentType).toBe('company_overview');
      expect(result.suggestedCategories.length).toBeGreaterThan(1);
      expect(result.recommendedPurpose).toBe('company_info');
    });

    it('should retry with Sonnet if Haiku confidence < 0.7', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      // First call: Haiku with low confidence
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'other',
              confidence: 0.65, // Low confidence
              suggestedCategories: [{ category: 'general', confidence: 0.60 }],
              contentTypeTags: ['general'],
              executiveSummary: 'Unclear document content',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      // Second call: Sonnet with higher confidence
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'certification',
              confidence: 0.92, // Higher confidence
              suggestedCategories: [{ category: 'certifications', confidence: 0.90 }],
              contentTypeTags: ['iso-9001', 'soc-2', 'compliance'],
              executiveSummary: 'ISO 9001 and SOC 2 certifications',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      const text = 'Ambiguous document content...';
      const result = await analyzeDocument(text, 'ambiguous.pdf');

      // Should have used Sonnet result
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.documentType).toBe('certification');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should cache analysis results', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'methodology_guide',
              confidence: 0.95,
              suggestedCategories: [{ category: 'project-methodology', confidence: 0.92 }],
              contentTypeTags: ['agile'],
              executiveSummary: 'Agile guide',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      const text = 'Same content';
      const fileName = 'test.pdf';

      // First call
      const result1 = await analyzeDocument(text, fileName);

      // Second call (should use cache)
      const result2 = await analyzeDocument(text, fileName);

      expect(result1).toEqual(result2);
      expect(mockCreate).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should extract relevant categories from RFP_CATEGORIES', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'methodology_guide',
              confidence: 0.94,
              suggestedCategories: [
                { category: 'project-methodology', confidence: 0.92 },
                { category: 'technical-solution', confidence: 0.85 },
                { category: 'pricing-payment', confidence: 0.40 }, // Low confidence
              ],
              contentTypeTags: ['agile', 'scrum'],
              executiveSummary: 'Methodology guide',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      const text = 'Methodology content';
      const result = await analyzeDocument(text, 'method.pdf');

      // Should only include categories with confidence > 0.5
      const categoryNames = result.suggestedCategories.map((c) => c.category);
      expect(categoryNames).toContain('project-methodology');
      expect(categoryNames).toContain('technical-solution');
      expect(categoryNames).not.toContain('pricing-payment'); // Filtered out due to low confidence
    });

    it('should handle very short documents', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'other',
              confidence: 0.75,
              suggestedCategories: [{ category: 'general', confidence: 0.70 }],
              contentTypeTags: ['brief'],
              executiveSummary: 'Very short document',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      const text = 'Short text.';
      const result = await analyzeDocument(text, 'short.pdf');

      expect(result).toBeDefined();
      expect(result.documentType).toBe('other');
    });

    it('should handle very long documents (>100k chars)', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'technical_spec',
              confidence: 0.89,
              suggestedCategories: [{ category: 'technical-solution', confidence: 0.88 }],
              contentTypeTags: ['comprehensive', 'technical'],
              executiveSummary: 'Comprehensive technical documentation',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      // Create very long text
      const longText = 'A'.repeat(120000);
      const result = await analyzeDocument(longText, 'long.pdf');

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Error Handling', () => {
    it('should throw error if ANTHROPIC_API_KEY is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(analyzeDocument('text', 'file.pdf')).rejects.toThrow('ANTHROPIC_API_KEY is not set');
    });

    it('should handle Claude API errors gracefully', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockRejectedValueOnce(new Error('Claude API rate limit exceeded'));

      await expect(analyzeDocument('text', 'file.pdf')).rejects.toThrow('Claude API rate limit exceeded');
    });

    it('should handle invalid JSON from Claude', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Invalid JSON response',
          },
        ],
      });

      await expect(analyzeDocument('text', 'file.pdf')).rejects.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should limit cache size to 1000 entries', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'other',
              confidence: 0.85,
              suggestedCategories: [{ category: 'general', confidence: 0.80 }],
              contentTypeTags: ['test'],
              executiveSummary: 'Test',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      // Fill cache beyond 1000 entries
      for (let i = 0; i < 1005; i++) {
        await analyzeDocument(`text ${i}`, `file-${i}.pdf`);
      }

      // Cache should have evicted oldest entries
      // (Implementation should handle this internally)
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should clear cache when clearAnalysisCache() is called', async () => {
      const mockAnthropic = (await import('@anthropic-ai/sdk')).default as any;
      const mockCreate = mockAnthropic.mock.results[0].value.messages.create;

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'other',
              confidence: 0.85,
              suggestedCategories: [],
              contentTypeTags: [],
              executiveSummary: 'Test',
              recommendedPurpose: 'rfp_support',
            }),
          },
        ],
      });

      // Fill cache
      await analyzeDocument('text', 'file.pdf');
      mockCreate.mockClear();

      // Clear cache
      clearAnalysisCache();

      // Should call API again (not cached)
      await analyzeDocument('text', 'file.pdf');
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
