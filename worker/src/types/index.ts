import { z } from 'zod';

// ============================================================================
// Scraped Product Schema
// ============================================================================

export const ScrapedProductSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  sku: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().default('CAD'),
  inStock: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
  characteristics: z.record(z.any()).optional(),
});

export type ScrapedProduct = z.infer<typeof ScrapedProductSchema>;

// ============================================================================
// Scrape Request Schema
// ============================================================================

// Product schema for search mode (original)
const SearchProductSchema = z.object({
  type: z.literal('search').optional().default('search'),
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  category: z.string().nullable(),
});

// Product schema for direct URL mode (NEW - optimization)
const DirectProductSchema = z.object({
  type: z.literal('direct'),
  id: z.string(),
  url: z.string().url(), // Cached competitor product URL
});

// Union type for products
const ProductRequestSchema = z.discriminatedUnion('type', [
  SearchProductSchema,
  DirectProductSchema,
]);

// Export types
export type SearchProduct = z.infer<typeof SearchProductSchema>;
export type DirectProduct = z.infer<typeof DirectProductSchema>;
export type ProductRequest = z.infer<typeof ProductRequestSchema>;

export const ScrapeRequestSchema = z.object({
  companyId: z.string(),
  companySlug: z.string(),
  competitorId: z.string(),
  competitorName: z.string(),
  competitorUrl: z.string().url(),
  products: z.array(ProductRequestSchema),
  // NEW v2: Batch info for pagination
  batchInfo: z.object({
    batchNumber: z.number(),
    totalBatches: z.number(),
  }).optional(),
});

export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>;

// ============================================================================
// Scrape Response Schema
// ============================================================================

export const ScrapeResponseSchema = z.object({
  success: z.boolean(),
  scrapedProducts: z.array(ScrapedProductSchema),
  productsScraped: z.number(),
  productsFailed: z.number(),
  errors: z.array(z.object({
    url: z.string(),
    error: z.string(),
    timestamp: z.string(),
  })),
  metadata: z.object({
    duration: z.number(), // milliseconds
    scraperType: z.enum(['playwright', 'apify', 'api']),
    workerStatus: z.enum(['UP', 'DOWN']).optional(),
  }),
});

export type ScrapeResponse = z.infer<typeof ScrapeResponseSchema>;

// ============================================================================
// Product Input for Scraper
// ============================================================================

export interface ProductInput {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
}

// ============================================================================
// Scraper Result Interface
// ============================================================================

export interface ScraperResult {
  scrapedProducts: ScrapedProduct[];
  productsScraped: number;
  productsFailed: number;
  errors: Array<{
    url: string;
    error: string;
    timestamp: string;
  }>;
}

// ============================================================================
// Competitor Info
// ============================================================================

export interface CompetitorInfo {
  competitorId: string;
  competitorName: string;
  competitorUrl: string;
  products: ProductInput[];
}
