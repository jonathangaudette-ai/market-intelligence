/**
 * DISSAN SCRAPER FACTORY
 *
 * Factory for Dissan (my-company) scrapers.
 * Routes to appropriate Playwright scraper based on competitor configuration.
 *
 * Pattern:
 * 1. Load competitor config from database (passed via ScraperFactory)
 * 2. Check scraperType (playwright, apify, api)
 * 3. For Playwright: Route to custom scraper if exists, else GenericPlaywrightScraper
 *
 * Custom scrapers (30% of sites):
 * - SwishScraper (swish.ca) - Klevu search customization
 * - Add more as needed...
 *
 * Generic scraper (70% of sites):
 * - GenericPlaywrightScraper - Configuration-only scraping
 */

import { BaseScraper } from '../base-scraper.js';
import { GenericPlaywrightScraper } from '../playwright/generic-scraper.js';
import { SwishScraper } from './swish-scraper.js';
import { isPlaywrightConfig } from '../../types/scraper-config.js';
import type { ScraperConfig } from '../../types/scraper-config.js';

export class DissanScraperFactory {
  /**
   * Get the appropriate scraper for a Dissan competitor
   * @param competitorName - Competitor name (e.g., 'Swish', 'Lalema', 'Sanitaire Dépôt')
   * @param competitorUrl - Competitor website URL
   * @param scraperConfig - Scraper configuration from database
   * @returns BaseScraper instance
   */
  static getScraper(
    competitorName: string,
    competitorUrl: string,
    scraperConfig: ScraperConfig
  ): BaseScraper {
    console.log(`[DissanScraperFactory] Selecting scraper for: ${competitorName}`);
    console.log(`[DissanScraperFactory] Scraper type: ${scraperConfig.scraperType}`);

    // Only handle Playwright scrapers (for now)
    if (!isPlaywrightConfig(scraperConfig)) {
      throw new Error(`Scraper type '${scraperConfig.scraperType}' not supported yet by DissanScraperFactory. Only 'playwright' is currently implemented.`);
    }

    const playwrightConfig = scraperConfig.playwright;

    // Route to custom scraper based on competitor URL/name
    if (competitorUrl.includes('swish.ca') || competitorName.toLowerCase().includes('swish')) {
      console.log('[DissanScraperFactory] Using SwishScraper (custom)');
      return new SwishScraper(playwrightConfig);
    }

    // TODO: Add more custom scrapers here
    // Example:
    // if (competitorUrl.includes('lalema.com')) {
    //   return new LalemaScraper(playwrightConfig);
    // }
    //
    // if (competitorUrl.includes('sanitairedepot.com')) {
    //   return new SanitaireDepotScraper(playwrightConfig);
    // }

    // Default: Use generic Playwright scraper (70% case)
    console.log('[DissanScraperFactory] Using GenericPlaywrightScraper (config-only)');
    return new GenericPlaywrightScraper(playwrightConfig);
  }

  /**
   * List all available custom scrapers
   */
  static listCustomScrapers(): string[] {
    return [
      'swish.ca', // SwishScraper
      // TODO: Add more as they are implemented
      // 'lalema.com',
      // 'sanitairedepot.com',
    ];
  }
}
