/**
 * Scraper Factory - Multi-tenant scraper selection
 *
 * Selects the appropriate scraper implementation based on company_slug.
 * This enables different clients (Dissan, Akonovia, etc.) to have customized scrapers.
 */

import { BaseScraper } from './base-scraper.js';
import { MockScraper } from './mock-scraper.js';
// TODO: Import DissanScraper once implemented
// import { DissanScraper } from './dissan-scraper.js';

export class ScraperFactory {
  /**
   * Get the appropriate scraper for a company
   * @param companySlug - The company slug (e.g., 'dissan', 'akonovia')
   * @returns A scraper instance configured for that company
   */
  static getScraperForCompany(companySlug: string): BaseScraper {
    console.log(`[ScraperFactory] Selecting scraper for company: ${companySlug}`);

    switch (companySlug.toLowerCase()) {
      case 'dissan':
        // TODO: Return DissanScraper once Playwright scrapers are ported
        // return new DissanScraper();
        console.log('[ScraperFactory] Using MockScraper (DissanScraper not yet implemented)');
        return new MockScraper();

      case 'akonovia':
        // TODO: Implement AkonoviaScraper
        console.log('[ScraperFactory] Using MockScraper (AkonoviaScraper not yet implemented)');
        return new MockScraper();

      case 'acme-corp':
        // Example test company
        return new MockScraper();

      default:
        console.log(`[ScraperFactory] Unknown company slug: ${companySlug}, using MockScraper`);
        return new MockScraper();
    }
  }

  /**
   * List all available scrapers
   */
  static listAvailableScrapers(): string[] {
    return [
      'mock', // MVP - returns mock data
      // 'dissan', // TODO: Implement
      // 'akonovia', // TODO: Implement
    ];
  }
}
