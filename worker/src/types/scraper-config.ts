/**
 * SCRAPER CONFIGURATION TYPES
 *
 * Comprehensive type definitions and Zod schemas for scraper configurations.
 * Supports 3 scraper types: Playwright, Apify, API
 *
 * Usage:
 * - Import interfaces for TypeScript type safety
 * - Import Zod schemas for runtime validation
 * - Use ScraperConfigSchema.parse(config) to validate configurations
 */

import { z } from 'zod';

// ============================================================================
// PLAYWRIGHT CONFIGURATION
// ============================================================================

// Search Configuration
export const PlaywrightSearchConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST']).default('GET'),
  param: z.string(), // Query param name (e.g., 'q', 'search', 'keyword')
  searchBoxSelector: z.string().optional(), // If search requires filling a form
  searchButtonSelector: z.string().optional(), // If search requires clicking submit
});

export type PlaywrightSearchConfig = z.infer<typeof PlaywrightSearchConfigSchema>;

// CSS Selectors (8 core selectors)
export const PlaywrightSelectorsSchema = z.object({
  productList: z.string(), // Container for product list items
  productLink: z.string(), // Link to product detail page
  productName: z.string(), // Product name
  productSku: z.string().optional(), // SKU/model number
  productPrice: z.string(), // Price
  productImage: z.string().optional(), // Product image URL
  inStockIndicator: z.string().optional(), // In-stock status
  noResults: z.string().optional(), // No results message
});

export type PlaywrightSelectors = z.infer<typeof PlaywrightSelectorsSchema>;

// Pagination Configuration
export const PlaywrightPaginationSchema = z.object({
  enabled: z.boolean().default(false),
  type: z.enum(['button-click', 'url-param', 'infinite-scroll']),
  selector: z.string().optional(), // Pagination button/link selector
  urlPattern: z.string().optional(), // URL pattern for page parameter (e.g., '&page={page}')
  maxPages: z.number().int().positive().default(5), // Safety limit
});

export type PlaywrightPagination = z.infer<typeof PlaywrightPaginationSchema>;

// Rate Limiting Configuration
export const PlaywrightRateLimitingSchema = z.object({
  requestDelay: z.number().int().min(0).default(2000), // Delay between requests in ms
  productDelay: z.number().int().min(0).default(1000), // Delay between products in ms
});

export type PlaywrightRateLimiting = z.infer<typeof PlaywrightRateLimitingSchema>;

// Advanced Options
export const PlaywrightAdvancedSchema = z.object({
  useStealthMode: z.boolean().optional().default(true), // NEW: Enable stealth mode to bypass Cloudflare
  useProxy: z.boolean().optional(),
  requiresAuth: z.boolean().optional(),
  userAgent: z.string().optional(),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).optional(),
  waitForSelector: z.string().optional(), // Wait for specific element before scraping
});

export type PlaywrightAdvanced = z.infer<typeof PlaywrightAdvancedSchema>;

// Complete Playwright Configuration
export const PlaywrightConfigSchema = z.object({
  search: PlaywrightSearchConfigSchema,
  selectors: PlaywrightSelectorsSchema,
  pagination: PlaywrightPaginationSchema.optional(),
  rateLimiting: PlaywrightRateLimitingSchema.optional(),
  advanced: PlaywrightAdvancedSchema.optional(),
});

export type PlaywrightConfig = z.infer<typeof PlaywrightConfigSchema>;

// ============================================================================
// APIFY CONFIGURATION
// ============================================================================

export const ApifyConfigSchema = z.object({
  actorId: z.string(), // Apify Actor ID (e.g., 'apify/web-scraper')
  inputSchema: z.record(z.any()), // Custom input for the actor
});

export type ApifyConfig = z.infer<typeof ApifyConfigSchema>;

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const ApiConfigSchema = z.object({
  endpoint: z.string().url(), // API base URL
  method: z.enum(['GET', 'POST']),
  headers: z.record(z.string()).optional(),
  auth: z.object({
    type: z.enum(['bearer', 'basic', 'api-key']),
    credentials: z.record(z.string()),
  }).optional(),
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

// ============================================================================
// COMPLETE SCRAPER CONFIGURATION (Union Type)
// ============================================================================

export const ScraperConfigSchema = z.discriminatedUnion('scraperType', [
  // Playwright Scraper
  z.object({
    scraperType: z.literal('playwright'),
    playwright: PlaywrightConfigSchema,
  }),
  // Apify Scraper
  z.object({
    scraperType: z.literal('apify'),
    apify: ApifyConfigSchema,
  }),
  // API Scraper
  z.object({
    scraperType: z.literal('api'),
    api: ApiConfigSchema,
  }),
]);

export type ScraperConfig = z.infer<typeof ScraperConfigSchema>;

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

export function isPlaywrightConfig(config: ScraperConfig): config is ScraperConfig & { scraperType: 'playwright' } {
  return config.scraperType === 'playwright';
}

export function isApifyConfig(config: ScraperConfig): config is ScraperConfig & { scraperType: 'apify' } {
  return config.scraperType === 'apify';
}

export function isApiConfig(config: ScraperConfig): config is ScraperConfig & { scraperType: 'api' } {
  return config.scraperType === 'api';
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_PLAYWRIGHT_CONFIG: Partial<PlaywrightConfig> = {
  rateLimiting: {
    requestDelay: 2000,
    productDelay: 1000,
  },
  pagination: {
    enabled: false,
    type: 'button-click',
    maxPages: 5,
  },
  advanced: {
    useStealthMode: true, // Enable stealth mode by default
    useProxy: false,
    requiresAuth: false,
    viewport: { width: 1920, height: 1080 },
  },
};

// ============================================================================
// EXAMPLE CONFIGURATIONS (for testing and documentation)
// ============================================================================

export const EXAMPLE_SWISH_CONFIG: ScraperConfig = {
  scraperType: 'playwright',
  playwright: {
    search: {
      url: 'https://swish.ca/search',
      method: 'GET',
      param: 'q',
    },
    selectors: {
      productList: 'li.klevuProduct',
      productLink: '.kuName a',
      productName: '.kuName',
      productSku: '.ku-sku',
      productPrice: '[class*="Price"]',
      noResults: '.kuNoResultMessage',
    },
    pagination: {
      enabled: true,
      type: 'button-click',
      selector: '.pagination .next-page',
      maxPages: 5,
    },
    rateLimiting: {
      requestDelay: 2000,
      productDelay: 1000,
    },
  },
};

export const EXAMPLE_APIFY_CONFIG: ScraperConfig = {
  scraperType: 'apify',
  apify: {
    actorId: 'apify/web-scraper',
    inputSchema: {
      startUrls: ['https://example.com'],
      pageFunction: 'async function pageFunction(context) { ... }',
    },
  },
};

export const EXAMPLE_API_CONFIG: ScraperConfig = {
  scraperType: 'api',
  api: {
    endpoint: 'https://api.example.com/products',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    auth: {
      type: 'bearer',
      credentials: {
        token: 'YOUR_API_TOKEN',
      },
    },
  },
};
