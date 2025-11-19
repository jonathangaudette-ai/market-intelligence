/**
 * Main Entry Point - Price Scraper
 */

import fs from 'fs';
import path from 'path';
import type { CompetitorConfig, CompetitorScrapingResults } from './types';
import {
  getAllCompetitors,
  getCompetitorConfig,
  getCompetitorsByPriority,
  PATHS,
} from './config';
import { loadProducts, loadProductsSample } from './utils/product-loader';
import { SwishScraper } from './scrapers/swish-scraper';
import { GraingerScraper } from './scrapers/grainger-scraper';
import { CleanItSupplyScraper } from './scrapers/cleanitsupply-scraper';
import { UlineScraper } from './scrapers/uline-scraper';
import { BunzlScraper } from './scrapers/bunzl-scraper';
import { ImperialDadeScraper } from './scrapers/imperial-dade-scraper';
import { UnitedCanadaScraper } from './scrapers/united-canada-scraper';
import { NexdayScraper } from './scrapers/nexday-scraper';
import { CleanspotScraper } from './scrapers/cleanspot-scraper';
import { CheckersScraper } from './scrapers/checkers-scraper';
import { VtoScraper } from './scrapers/vto-scraper';
import { LalemaScraper } from './scrapers/lalema-scraper';
import { SanidepotScraper } from './scrapers/sanidepot-scraper';

// Map of scraper classes - All 13 scrapers implemented
const SCRAPERS: Record<string, any> = {
  swish: SwishScraper,
  grainger: GraingerScraper,
  cleanitsupply: CleanItSupplyScraper,
  uline: UlineScraper,
  bunzl: BunzlScraper,
  'imperial-dade': ImperialDadeScraper,
  'united-canada': UnitedCanadaScraper,
  nexday: NexdayScraper,
  cleanspot: CleanspotScraper,
  checkers: CheckersScraper,
  vto: VtoScraper,
  lalema: LalemaScraper,
  sanidepot: SanidepotScraper,
};

/**
 * Scrape a single competitor site
 */
async function scrapeCompetitor(
  competitorId: string,
  testMode: boolean = false
): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Starting scraper for: ${competitorId.toUpperCase()}`);
  console.log('='.repeat(70));

  const config = getCompetitorConfig(competitorId);

  // Check if scraper is implemented
  const ScraperClass = SCRAPERS[competitorId];
  if (!ScraperClass) {
    console.error(`❌ Scraper not implemented for: ${competitorId}`);
    console.log('Available scrapers:', Object.keys(SCRAPERS).join(', '));
    return;
  }

  // Load products
  const products = testMode
    ? await loadProductsSample(50)
    : await loadProducts();

  console.log(`📦 Loaded ${products.length} products\n`);

  // Initialize scraper
  const scraper = new ScraperClass(config);

  // Scrape products
  const results = await scraper.scrapeProducts(products);

  // Save results
  const outputFile = path.join(
    PATHS.resultsBySite,
    `${competitorId}-results.json`
  );

  const scrapingResults: CompetitorScrapingResults = {
    competitorId,
    competitorName: config.name,
    startTime: new Date(),
    endTime: new Date(),
    totalProducts: products.length,
    productsScraped: results.length,
    productsFound: results.filter((r: any) => r.found).length,
    productsNotFound: results.filter((r: any) => !r.found && !r.error).length,
    errors: results.filter((r: any) => r.error).length,
    results,
  };

  fs.writeFileSync(outputFile, JSON.stringify(scrapingResults, null, 2));

  console.log(`\n✅ Results saved to: ${outputFile}`);
  console.log(`\n${'='.repeat(70)}\n`);
}

/**
 * Scrape all competitors (or by priority)
 */
async function scrapeAll(priority?: number): Promise<void> {
  const competitors = priority
    ? getCompetitorsByPriority(priority)
    : getAllCompetitors();

  console.log(`\n🚀 Starting scraping for ${competitors.length} competitors`);
  if (priority) {
    console.log(`   Priority: ${priority}`);
  }

  for (const competitor of competitors) {
    try {
      await scrapeCompetitor(competitor.id, false);
    } catch (error) {
      console.error(`❌ Failed to scrape ${competitor.id}: ${error}`);
    }
  }

  console.log('\n✅ All scraping completed!');
}

/**
 * Main function - Parse CLI arguments and run scraper
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  if (args.length === 0) {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    DISSAN PRICE SCRAPER                          ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
  npm run dev                         Run in development mode
  npm run scrape:test                 Test on 50 products sample
  npm run scrape:all                  Scrape all competitors (576 products)
  npm run scrape:priority1            Scrape priority 1 sites only
  npm run scrape:priority2            Scrape priority 2 sites only
  npm run scrape:priority3            Scrape priority 3 sites only
  npm run scrape:site <site-id>       Scrape a specific site
  npm run scrape:update               Update prices (incremental)

Available competitors:
${getAllCompetitors()
  .map((c) => `  - ${c.id.padEnd(20)} (${c.name})`)
  .join('\n')}

Examples:
  npm run scrape:site swish
  npm run scrape:test
  npm run scrape:all
    `);
    return;
  }

  // Handle commands
  const command = args[0];

  switch (command) {
    case '--test':
      console.log('🧪 Running in TEST mode (50 products sample)\n');
      await scrapeCompetitor('swish', true);
      break;

    case '--all':
      await scrapeAll();
      break;

    case '--priority':
      const priority = parseInt(args[1]);
      if (isNaN(priority) || priority < 1 || priority > 3) {
        console.error('❌ Invalid priority. Use 1, 2, or 3');
        process.exit(1);
      }
      await scrapeAll(priority);
      break;

    case '--site':
      const siteId = args[1];
      if (!siteId) {
        console.error('❌ Please specify a site ID');
        process.exit(1);
      }
      await scrapeCompetitor(siteId, false);
      break;

    case '--update':
      console.log('🔄 Update mode not yet implemented');
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run without arguments to see usage');
      process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
