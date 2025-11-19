/**
 * Base Scraper - Classe abstraite pour tous les scrapers de compétiteurs
 */

import { Browser, Page } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type {
  CompetitorConfig,
  Product,
  SearchResult,
  ProductDetails,
  ScrapingResult,
} from '../types';
import { RateLimiter } from '../utils/rate-limiter';
import { CheckpointManager } from '../utils/checkpoint-manager';
import { Logger } from '../utils/logger';
import { getRandomUserAgent, SCRAPING_CONFIG } from '../config';

// Add stealth plugin to chromium
chromium.use(StealthPlugin());

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected competitorId: string;
  protected config: CompetitorConfig;
  protected rateLimiter: RateLimiter;
  protected checkpointManager: CheckpointManager;
  protected logger: Logger;
  protected userAgent: string;

  constructor(config: CompetitorConfig) {
    this.config = config;
    this.competitorId = config.id;
    this.rateLimiter = new RateLimiter(config.rateLimiting);
    this.checkpointManager = new CheckpointManager(config.id);
    this.logger = new Logger(config.id);
    this.userAgent = getRandomUserAgent();
  }

  // ============================================================================
  // Abstract Methods - Must be implemented by specific scrapers
  // ============================================================================

  /**
   * Search for a product by SKU
   * @param sku - The product SKU to search for
   * @returns SearchResult with product details if found
   */
  abstract searchBySku(sku: string): Promise<SearchResult>;

  /**
   * Search for a product by name and brand
   * @param name - The product name
   * @param brand - The product brand
   * @returns SearchResult with product details if found
   */
  abstract searchByName(name: string, brand: string): Promise<SearchResult>;

  /**
   * Extract product details from a product page
   * @param url - The product page URL
   * @returns ProductDetails with price, availability, etc.
   */
  abstract extractProductDetails(url: string): Promise<ProductDetails>;

  // ============================================================================
  // Common Methods - Shared functionality for all scrapers
  // ============================================================================

  /**
   * Initialize the browser and page
   */
  async init(): Promise<void> {
    this.logger.info('Initializing browser...');

    this.browser = await chromium.launch({
      headless: SCRAPING_CONFIG.headless,
      slowMo: SCRAPING_CONFIG.slowMo,
      devtools: SCRAPING_CONFIG.devtools,
    });

    const context = await this.browser.newContext({
      userAgent: this.userAgent,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-CA',
      timezoneId: 'America/Toronto',
    });

    this.page = await context.newPage();

    // Set default timeouts
    this.page.setDefaultTimeout(SCRAPING_CONFIG.elementTimeout);
    this.page.setDefaultNavigationTimeout(SCRAPING_CONFIG.navigationTimeout);

    this.logger.info('Browser initialized successfully');
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.logger.info('Browser closed');
  }

  /**
   * Navigate to a URL with retry logic
   */
  protected async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized. Call init() first.');
    }

    await this.rateLimiter.waitIfNeeded();

    const maxRetries = SCRAPING_CONFIG.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Navigating to ${url} (attempt ${attempt}/${maxRetries})`);

        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: SCRAPING_CONFIG.pageLoadTimeout,
        });

        // Wait a bit for dynamic content
        await this.delay(1000);

        this.logger.debug(`Successfully navigated to ${url}`);
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Navigation attempt ${attempt}/${maxRetries} failed: ${error}`
        );

        if (attempt < maxRetries) {
          const delay = SCRAPING_CONFIG.retryDelays[attempt - 1] || 2000;
          this.logger.info(`Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    throw new Error(
      `Failed to navigate to ${url} after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Delay execution for a specified number of milliseconds
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = SCRAPING_CONFIG.maxRetries,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`${context} (attempt ${attempt}/${maxRetries})`);
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `${context} attempt ${attempt}/${maxRetries} failed: ${error}`
        );

        if (attempt < maxRetries) {
          const delay = SCRAPING_CONFIG.retryDelays[attempt - 1] || 2000;
          this.logger.info(`Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    throw new Error(
      `${context} failed after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Scrape a single product
   */
  async scrapeProduct(product: Product): Promise<ScrapingResult> {
    this.logger.info(`Scraping product: ${product.skuCleaned} - ${product.name}`);

    const startTime = Date.now();

    try {
      // Step 1: Try searching by SKU (priority)
      this.logger.debug('Step 1: Searching by SKU...');
      const skuResult = await this.searchBySku(product.skuCleaned);

      if (skuResult.found && skuResult.productUrl) {
        this.logger.info(`✓ Found by SKU: ${skuResult.productUrl}`);

        const details = await this.extractProductDetails(skuResult.productUrl);

        const result: ScrapingResult = {
          sku: product.skuCleaned,
          competitorId: this.competitorId,
          found: true,
          matchType: 'sku',
          price: details.price,
          currency: details.currency,
          url: details.url,
          productName: details.name,
          availability: details.availability,
          timestamp: new Date(),
        };

        this.logger.info(
          `✓ Product scraped successfully in ${Date.now() - startTime}ms - Price: ${details.currency} ${details.price}`
        );

        return result;
      }

      // Step 2: Try searching by name + brand (fallback)
      this.logger.debug('Step 2: Searching by name + brand...');
      const nameResult = await this.searchByName(
        product.nameCleaned,
        product.brand
      );

      if (nameResult.found && nameResult.productUrl) {
        this.logger.info(
          `✓ Found by name (confidence: ${nameResult.confidence?.toFixed(2)}): ${nameResult.productUrl}`
        );

        const details = await this.extractProductDetails(nameResult.productUrl);

        const result: ScrapingResult = {
          sku: product.skuCleaned,
          competitorId: this.competitorId,
          found: true,
          matchType: 'name',
          price: details.price,
          currency: details.currency,
          url: details.url,
          productName: details.name,
          availability: details.availability,
          confidence: nameResult.confidence,
          timestamp: new Date(),
        };

        this.logger.info(
          `✓ Product scraped successfully in ${Date.now() - startTime}ms - Price: ${details.currency} ${details.price}`
        );

        return result;
      }

      // Not found
      this.logger.info(`✗ Product not found on ${this.config.name}`);

      return {
        sku: product.skuCleaned,
        competitorId: this.competitorId,
        found: false,
        matchType: 'none',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error scraping product ${product.skuCleaned}: ${error}`);

      return {
        sku: product.skuCleaned,
        competitorId: this.competitorId,
        found: false,
        matchType: 'none',
        timestamp: new Date(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Scrape multiple products
   */
  async scrapeProducts(products: Product[]): Promise<ScrapingResult[]> {
    this.logger.info(
      `Starting scraping of ${products.length} products on ${this.config.name}...`
    );

    const results: ScrapingResult[] = [];
    const startTime = Date.now();

    try {
      await this.init();

      // Load checkpoint if exists
      const checkpoint = await this.checkpointManager.load();
      let startIndex = 0;

      if (checkpoint) {
        this.logger.info(
          `Resuming from checkpoint: ${checkpoint.lastProcessedProductIndex + 1}/${products.length}`
        );
        startIndex = checkpoint.lastProcessedProductIndex + 1;
        results.push(...checkpoint.results);
      }

      // Scrape products
      for (let i = startIndex; i < products.length; i++) {
        const product = products[i];

        this.logger.info(`\n[${i + 1}/${products.length}] Processing: ${product.skuCleaned}`);

        const result = await this.scrapeProduct(product);
        results.push(result);

        // Save checkpoint every N products
        if ((i + 1) % SCRAPING_CONFIG.checkpointInterval === 0) {
          await this.checkpointManager.save({
            competitorId: this.competitorId,
            lastProcessedProductIndex: i,
            lastProcessedSku: product.skuCleaned,
            totalProducts: products.length,
            successCount: results.filter((r) => r.found).length,
            notFoundCount: results.filter((r) => !r.found && !r.error).length,
            errorCount: results.filter((r) => r.error).length,
            timestamp: new Date(),
            results,
          });

          this.logger.info(`✓ Checkpoint saved (${i + 1}/${products.length})`);
        }

        // Rate limiting between products
        await this.delay(this.config.rateLimiting.productDelay);
      }

      const duration = Date.now() - startTime;
      const found = results.filter((r) => r.found).length;
      const notFound = results.filter((r) => !r.found && !r.error).length;
      const errors = results.filter((r) => r.error).length;

      this.logger.info('\n' + '='.repeat(60));
      this.logger.info(`Scraping completed for ${this.config.name}`);
      this.logger.info(`Total products: ${products.length}`);
      this.logger.info(`Found: ${found} (${((found / products.length) * 100).toFixed(1)}%)`);
      this.logger.info(`Not found: ${notFound} (${((notFound / products.length) * 100).toFixed(1)}%)`);
      this.logger.info(`Errors: ${errors} (${((errors / products.length) * 100).toFixed(1)}%)`);
      this.logger.info(`Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
      this.logger.info(`Avg time/product: ${(duration / products.length / 1000).toFixed(1)}s`);
      this.logger.info('='.repeat(60) + '\n');

      // Clear checkpoint on success
      await this.checkpointManager.clear();

      return results;
    } finally {
      await this.close();
    }
  }
}
