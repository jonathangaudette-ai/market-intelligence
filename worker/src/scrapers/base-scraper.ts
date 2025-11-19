/**
 * Base Scraper - Abstract class for all scrapers
 *
 * Provides common interface and utilities for scrapers.
 * All company-specific scrapers extend this class.
 */

import { CompetitorInfo, ScraperResult, ScrapedProduct, DirectProduct } from '../types/index.js';

export abstract class BaseScraper {
  /**
   * Scraper type identifier
   */
  abstract readonly scraperType: 'playwright' | 'apify' | 'api';

  /**
   * Main scraping method - must be implemented by each scraper
   */
  abstract scrapeCompetitor(competitorInfo: CompetitorInfo): Promise<ScraperResult>;

  /**
   * Direct URL scraping - optimized for cached URLs (NEW v3)
   * Goes directly to product URL to get updated price (skips search)
   * This method is 10x faster and skips GPT-5 matching
   */
  abstract scrapeDirect(products: DirectProduct[]): Promise<ScraperResult>;

  /**
   * Log helper with scraper name prefix
   */
  protected log(message: string, metadata?: Record<string, any>): void {
    const logEntry = {
      scraper: this.constructor.name,
      message,
      ...metadata,
    };
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Error helper
   */
  protected logError(message: string, error: any): void {
    const errorEntry = {
      scraper: this.constructor.name,
      error: message,
      details: error.message,
      stack: error.stack,
    };
    console.error(JSON.stringify(errorEntry));
  }

  /**
   * Create error entry
   */
  protected createError(url: string, error: string): {
    url: string;
    error: string;
    timestamp: string;
  } {
    return {
      url,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate scraped product
   */
  protected validateProduct(product: Partial<ScrapedProduct>): product is ScrapedProduct {
    return !!(
      product.url &&
      product.name &&
      typeof product.price === 'number' &&
      product.price > 0
    );
  }
}
