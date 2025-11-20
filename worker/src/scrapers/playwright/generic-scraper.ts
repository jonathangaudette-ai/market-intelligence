/**
 * GENERIC PLAYWRIGHT SCRAPER
 *
 * Configuration-only Playwright scraper (no custom code required).
 * Works for ~70% of competitor sites that follow standard HTML patterns.
 *
 * This scraper uses only the PlaywrightConfig from the database and doesn't
 * override any methods from BasePlaywrightScraper. It's the "fallback" scraper
 * when no custom implementation is needed.
 *
 * Use Cases:
 * - Standard e-commerce sites with predictable HTML structure
 * - Sites without complex JavaScript interactions
 * - Sites without authentication or CAPTCHA
 *
 * When to create a custom scraper instead:
 * - Site requires login/authentication
 * - Site has CAPTCHA protection
 * - Site uses complex JavaScript (React, Vue, Angular with dynamic loading)
 * - Site requires special navigation logic
 * - Selectors need runtime adjustments
 */

import { BasePlaywrightScraper } from './base-playwright-scraper.js';
import type { PlaywrightConfig } from '../../types/scraper-config.js';

export class GenericPlaywrightScraper extends BasePlaywrightScraper {
  protected config: PlaywrightConfig;

  constructor(config: PlaywrightConfig) {
    super();
    this.config = config;

    this.log('Generic Playwright scraper initialized', {
      searchUrl: config.search.url,
      paginationEnabled: config.pagination?.enabled || false,
      maxPages: config.pagination?.maxPages || 0,
    });
  }

  // ============================================================================
  // NO OVERRIDES NEEDED
  // ============================================================================

  // This scraper uses all default implementations from BasePlaywrightScraper:
  //
  // ✓ init() - Standard browser initialization
  // ✓ close() - Standard cleanup
  // ✓ navigate() - Navigation with retry logic
  // ✓ searchProduct() - Constructs search URL and navigates
  // ✓ extractProductsFromPage() - Uses config.selectors to extract products
  // ✓ extractProductDetailsFromPage() - Extracts details from product page
  // ✓ extractAllProducts() - Handles pagination using config.pagination
  // ✓ scrapeCompetitor() - Main search-based scraping method
  // ✓ scrapeDirect() - Direct URL scraping method
  //
  // All extraction logic is driven by the PlaywrightConfig passed to constructor.

  // ============================================================================
  // EXAMPLE: OVERRIDING METHODS (Optional)
  // ============================================================================

  // If needed for a specific site, you can override any method:
  //
  // Example 1: Custom price parsing
  // protected parsePrice(priceText: string): number | null {
  //   // Custom logic for unusual price formats
  //   const match = priceText.match(/Special: \$(\d+\.\d{2})/);
  //   return match ? parseFloat(match[1]) : super.parsePrice(priceText);
  // }
  //
  // Example 2: Custom product extraction (for complex HTML)
  // protected async extractProductsFromPage(): Promise<ScrapedProduct[]> {
  //   // Site-specific extraction logic
  //   const products = await super.extractProductsFromPage();
  //   // Additional filtering or transformation
  //   return products.filter(p => p.price && p.price > 0);
  // }
  //
  // Example 3: Custom navigation (for special redirects)
  // protected async navigate(url: string): Promise<void> {
  //   // Handle redirects or special pages before calling super.navigate
  //   if (url.includes('special-redirect')) {
  //     // Custom logic
  //   }
  //   await super.navigate(url);
  // }
}
