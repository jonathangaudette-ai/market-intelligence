/**
 * Scraper Factory - Multi-tenant scraper selection
 *
 * Selects the appropriate scraper implementation based on company_slug and scraper configuration.
 * This enables different clients (Dissan, Akonovia, etc.) to have customized scrapers.
 *
 * NEW v3 Architecture:
 * - Uses scraperConfig from database (passed in request)
 * - Routes to company-specific factory (DissanScraperFactory, etc.)
 * - Company factories handle Playwright/Apify/API routing
 */

import { BaseScraper } from './base-scraper.js';
import { MockScraper } from './mock-scraper.js';
import { DissanScraperFactory } from './dissan/dissan-scraper.js';
import type { ScraperConfig } from '../types/scraper-config.js';

export class ScraperFactory {
  /**
   * Get the appropriate scraper for a company and competitor
   * @param companySlug - The company slug (e.g., 'my-company', 'acme-corp')
   * @param competitorName - The competitor name (e.g., 'Swish')
   * @param competitorUrl - The competitor URL (e.g., 'https://swish.ca')
   * @param scraperConfig - The scraper configuration from database
   * @returns A scraper instance configured for that company/competitor
   */
  static getScraper(
    companySlug: string,
    competitorName: string,
    competitorUrl: string,
    scraperConfig: ScraperConfig
  ): BaseScraper {
    console.log(`[ScraperFactory] Selecting scraper for company: ${companySlug}`);
    console.log(`[ScraperFactory] Competitor: ${competitorName} (${competitorUrl})`);
    console.log(`[ScraperFactory] Scraper type: ${scraperConfig.scraperType}`);

    // Route to company-specific factory
    switch (companySlug.toLowerCase()) {
      case 'my-company':
      case 'dissan':
        // Dissan/My-Company: Use DissanScraperFactory
        console.log('[ScraperFactory] Routing to DissanScraperFactory');
        return DissanScraperFactory.getScraper(competitorName, competitorUrl, scraperConfig);

      case 'akonovia':
        // TODO: Implement AkonoviaScraperFactory
        console.log('[ScraperFactory] AkonoviaScraperFactory not yet implemented, using MockScraper');
        return new MockScraper();

      case 'acme-corp':
        // Example test company
        console.log('[ScraperFactory] Test company acme-corp, using MockScraper');
        return new MockScraper();

      default:
        console.log(`[ScraperFactory] Unknown company slug: ${companySlug}, using MockScraper`);
        return new MockScraper();
    }
  }

  /**
   * Legacy method for backward compatibility (deprecated)
   * @deprecated Use getScraper() instead
   */
  static getScraperForCompany(companySlug: string): BaseScraper {
    console.warn('[ScraperFactory] getScraperForCompany() is deprecated. Use getScraper() instead.');
    return new MockScraper();
  }

  /**
   * List all available company factories
   */
  static listAvailableFactories(): string[] {
    return [
      'my-company', // DissanScraperFactory
      'dissan',     // DissanScraperFactory
      // 'akonovia', // TODO: Implement
    ];
  }
}
