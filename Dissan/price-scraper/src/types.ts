/**
 * Types TypeScript pour le Price Scraper
 */

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  skuOriginal: string;
  skuCleaned: string;
  brand: string;
  name: string;
  nameCleaned: string;
  category: string;
  description: string;
  urlSource: string;
  stockStatus: string;
  images: string;
}

// ============================================================================
// Competitor Configuration Types
// ============================================================================

export interface CompetitorSearchConfig {
  url: string;
  method: 'GET' | 'POST';
  param: string;
}

export interface CompetitorSelectors {
  searchBox: string;
  searchButton: string;
  productList: string;
  productLink: string;
  productName: string;
  productSku: string;
  productPrice: string;
  noResults: string;
}

export interface CompetitorPagination {
  enabled: boolean;
  selector: string;
  maxPages: number;
}

export interface CompetitorRateLimiting {
  requestDelay: number;
  productDelay: number;
}

export interface CompetitorConfig {
  id: string;
  name: string;
  url: string;
  priority: number;
  enabled: boolean;
  coverage: string;
  notes: string;
  search: CompetitorSearchConfig;
  selectors: CompetitorSelectors;
  pagination: CompetitorPagination;
  rateLimiting: CompetitorRateLimiting;
}

export interface GlobalSettings {
  maxRetries: number;
  timeout: number;
  userAgents: string[];
  checkpointInterval: number;
  defaultRateLimiting: CompetitorRateLimiting;
}

export interface CompetitorsConfigFile {
  competitors: CompetitorConfig[];
  globalSettings: GlobalSettings;
}

// ============================================================================
// Search and Matching Types
// ============================================================================

export type MatchType = 'sku' | 'name' | 'characteristic' | 'none';

export interface SearchResult {
  found: boolean;
  matchType: MatchType;
  productUrl?: string;
  productName?: string;
  productSku?: string;
  price?: number;
  currency?: string;
  confidence?: number; // 0-1 for name matching
}

export interface ProductDetails {
  url: string;
  name: string;
  sku?: string;
  price: number;
  currency: string;
  availability?: string;
  description?: string;
  images?: string[];
  lastUpdated: Date;
}

// ============================================================================
// Scraping Results Types
// ============================================================================

export interface ScrapingResult {
  sku: string;
  competitorId: string;
  found: boolean;
  matchType: MatchType;
  price?: number;
  currency?: string;
  url?: string;
  productName?: string;
  availability?: string;
  confidence?: number;
  timestamp: Date;
  error?: string;
}

export interface CompetitorScrapingResults {
  competitorId: string;
  competitorName: string;
  startTime: Date;
  endTime?: Date;
  totalProducts: number;
  productsScraped: number;
  productsFound: number;
  productsNotFound: number;
  errors: number;
  results: ScrapingResult[];
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export interface Checkpoint {
  competitorId: string;
  lastProcessedProductIndex: number;
  lastProcessedSku: string;
  totalProducts: number;
  successCount: number;
  notFoundCount: number;
  errorCount: number;
  timestamp: Date;
  results: ScrapingResult[];
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface ScrapingStats {
  competitorId: string;
  totalProducts: number;
  productsScraped: number;
  productsFound: number;
  productsNotFound: number;
  errors: number;
  successRate: number; // percentage
  avgTimePerProduct: number; // milliseconds
  totalDuration: number; // milliseconds
  matchTypesBreakdown: {
    sku: number;
    name: number;
    none: number;
  };
}

// ============================================================================
// Consolidated Price Data Types
// ============================================================================

export interface CompetitorPrice {
  price: number | null;
  url: string | null;
  found: boolean;
  matchType?: MatchType;
  timestamp?: Date;
}

export interface ConsolidatedProduct {
  sku: string;
  name: string;
  brand: string;
  category: string;
  prices: {
    [competitorId: string]: CompetitorPrice;
  };
  stats: {
    priceMin: number | null;
    priceMax: number | null;
    priceAvg: number | null;
    nbSources: number;
    ecartPct: number | null; // percentage difference min-max
    sitesVendeurs: string[];
  };
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExcelExportOptions {
  outputFile: string;
  includeStats: boolean;
  includeSummarySheets: boolean;
  autoFilter: boolean;
  freezePanes: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  competitorId?: string;
  sku?: string;
  message: string;
  error?: Error;
  data?: any;
}

export interface RateLimitConfig {
  requestDelay: number;
  productDelay: number;
  lastRequestTime: number;
}
