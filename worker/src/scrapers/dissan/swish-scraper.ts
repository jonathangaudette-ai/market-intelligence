/**
 * SWISH SCRAPER (swish.ca)
 *
 * Custom Playwright scraper for Swish Maintenance (swish.ca).
 *
 * For MVP, this scraper demonstrates the pattern for creating custom scrapers.
 * Swish uses Klevu search which follows standard patterns, so it works with
 * GenericPlaywrightScraper. This file shows where you would add custom logic
 * if needed in the future.
 *
 * Custom logic that COULD be added (examples):
 * - Special price extraction (Klevu sometimes hides original prices)
 * - Product variant handling (Klevu groups variants)
 * - Stock status extraction (complex in-stock indicators)
 */

import { BasePlaywrightScraper } from '../playwright/base-playwright-scraper.js';
import type { PlaywrightConfig } from '../../types/scraper-config.js';

export class SwishScraper extends BasePlaywrightScraper {
  protected config: PlaywrightConfig;

  constructor(config: PlaywrightConfig) {
    super();
    this.config = config;

    this.log('Swish scraper initialized', {
      searchUrl: config.search.url,
      competitorName: 'Swish Maintenance',
    });
  }

  // ============================================================================
  // CUSTOM OVERRIDES (Optional - examples commented out)
  // ============================================================================

  // EXAMPLE 1: Custom price parsing for Klevu's special format
  // protected parsePrice(priceText: string): number | null {
  //   // Klevu sometimes shows prices like "Price: $12.99 CAD"
  //   const match = priceText.match(/Price:\s*\$?([\d,.]+)/i);
  //   if (match) {
  //     return parseFloat(match[1].replace(/,/g, ''));
  //   }
  //   return super.parsePrice(priceText);
  // }

  // EXAMPLE 2: Custom product extraction to handle Klevu variants
  // protected async extractProductsFromPage(): Promise<ScrapedProduct[]> {
  //   const products = await super.extractProductsFromPage();
  //
  //   // Filter out variant duplicates (Klevu sometimes shows same product multiple times)
  //   const uniqueProducts = new Map<string, ScrapedProduct>();
  //   for (const product of products) {
  //     if (!uniqueProducts.has(product.name)) {
  //       uniqueProducts.set(product.name, product);
  //     }
  //   }
  //
  //   return Array.from(uniqueProducts.values());
  // }

  // EXAMPLE 3: Custom navigation with Klevu-specific handling
  // protected async searchProduct(searchQuery: string): Promise<void> {
  //   // Klevu search sometimes requires special encoding
  //   const cleanQuery = searchQuery.replace(/[^\w\s-]/g, '');
  //   await super.searchProduct(cleanQuery);
  //
  //   // Wait for Klevu results to fully load (dynamic content)
  //   if (this.page) {
  //     await this.page.waitForSelector('.kuResultsStatus', { timeout: 5000 });
  //   }
  // }
}
