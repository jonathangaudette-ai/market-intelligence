/**
 * BASE PLAYWRIGHT SCRAPER
 *
 * Abstract base class for Playwright-based scrapers.
 * Provides common functionality for browser automation, navigation, extraction, pagination.
 *
 * Architecture:
 * - Configuration-driven: Uses PlaywrightConfig from database
 * - Retry logic: Automatic retries with exponential backoff
 * - Rate limiting: Respects requestDelay and productDelay
 * - Stealth mode: Uses playwright-extra with stealth plugin
 *
 * Subclasses can override methods for site-specific logic.
 */

import { Browser, Page, chromium } from 'playwright';
import { chromium as chromiumExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { BaseScraper } from '../base-scraper.js';
import { CompetitorInfo, ScraperResult, ScrapedProduct, DirectProduct } from '../../types/index.js';
import type { PlaywrightConfig } from '../../types/scraper-config.js';

export abstract class BasePlaywrightScraper extends BaseScraper {
  readonly scraperType = 'playwright' as const;

  // Playwright instances
  protected browser: Browser | null = null;
  protected page: Page | null = null;

  // Configuration (must be set by subclass)
  protected abstract config: PlaywrightConfig;

  // ============================================================================
  // LIFECYCLE METHODS
  // ============================================================================

  /**
   * Initialize browser and page
   * NEW: Supports stealth mode to bypass Cloudflare and other bot detection
   */
  protected async init(): Promise<void> {
    this.log('Initializing Playwright browser');

    // Check if stealth mode is enabled
    const useStealthMode = this.config.advanced?.useStealthMode !== false; // Default to true

    if (useStealthMode) {
      this.log('🥷 Stealth mode ENABLED - Using playwright-extra with stealth plugin');

      // Add stealth plugin to chromium-extra
      chromiumExtra.use(StealthPlugin());

      // Launch browser with ENHANCED anti-detection args (Cloudflare bypass)
      this.browser = await chromiumExtra.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--window-size=1920,1080',
          // Additional Cloudflare bypass args
          '--disable-infobars',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
      }) as unknown as Browser;
    } else {
      this.log('Using standard Playwright (stealth disabled)');

      // Launch standard browser
      this.browser = await chromium.launch({
        headless: true,
      });
    }

    // Create context with ENHANCED anti-detection settings
    const viewport = this.config.advanced?.viewport || { width: 1920, height: 1080 };
    const userAgent = this.config.advanced?.userAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const context = await this.browser.newContext({
      userAgent,
      viewport,
      locale: 'en-CA',
      timezoneId: 'America/Toronto',
      permissions: [],
      geolocation: { latitude: 45.5017, longitude: -73.5673 }, // Montreal
      colorScheme: 'light',
      // ENHANCED HTTP headers for Cloudflare bypass
      extraHTTPHeaders: {
        'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
    });

    // ENHANCED: Add init script to hide webdriver properties (Cloudflare detection)
    await context.addInitScript(() => {
      // Hide webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override the chrome property
      (window as any).chrome = {
        runtime: {},
      };

      // Override permissions query
      const originalQuery = (window.navigator.permissions as any).query;
      (window.navigator.permissions as any).query = (parameters: any) => (
        parameters.name === 'notifications'
          ? Promise.resolve({ state: (Notification as any).permission })
          : originalQuery(parameters)
      );

      // Override plugins to make it look real
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-CA', 'en-US', 'en'],
      });
    });

    this.page = await context.newPage();

    // Set timeouts
    this.page.setDefaultTimeout(30000); // 30s for elements
    this.page.setDefaultNavigationTimeout(60000); // 60s for navigation

    this.log(`Browser initialized successfully (stealth: ${useStealthMode})`);
  }

  /**
   * Close browser and page
   */
  protected async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.log('Browser closed');
  }

  // ============================================================================
  // NAVIGATION METHODS
  // ============================================================================

  /**
   * Navigate to URL with retry logic
   */
  protected async navigate(url: string, maxRetries: number = 3): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized. Call init() first.');
    }

    this.log(`Navigating to ${url}`);

    // Apply rate limiting
    const delay = this.config.rateLimiting?.requestDelay || 2000;
    await this.delay(delay);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });

        // ENHANCED: Wait longer for Cloudflare to resolve and page to load
        // Cloudflare JavaScript challenge can take 5-15 seconds to complete
        await this.delay(5000); // Initial wait for Cloudflare challenge

        // Wait for selector if specified (with longer timeout)
        if (this.config.advanced?.waitForSelector) {
          this.log(`Waiting for selector: ${this.config.advanced.waitForSelector}`);
          await this.page.waitForSelector(this.config.advanced.waitForSelector, {
            timeout: 45000, // INCREASED from 10s to 45s for Cloudflare
          });
        }

        // Wait a bit more for dynamic content to settle
        await this.delay(2000);

        this.log(`Successfully navigated to ${url}`);
        return;

      } catch (error: any) {
        this.logError(`Navigation attempt ${attempt}/${maxRetries} failed`, error);

        if (attempt < maxRetries) {
          const retryDelay = Math.min(2000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          this.log(`Retrying in ${retryDelay}ms...`);
          await this.delay(retryDelay);
        } else {
          throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Search for a product (constructs search URL)
   */
  protected async searchProduct(searchQuery: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const searchConfig = this.config.search;
    let searchUrl: string;

    if (searchConfig.method === 'GET') {
      // GET method: Append query param to URL
      const separator = searchConfig.url.includes('?') ? '&' : '?';
      searchUrl = `${searchConfig.url}${separator}${searchConfig.param}=${encodeURIComponent(searchQuery)}`;
    } else {
      // POST method: Navigate to search page, fill form, submit
      await this.navigate(searchConfig.url);

      if (searchConfig.searchBoxSelector && searchConfig.searchButtonSelector) {
        await this.page.fill(searchConfig.searchBoxSelector, searchQuery);
        await this.page.click(searchConfig.searchButtonSelector);
        await this.page.waitForLoadState('domcontentloaded');
        return;
      } else {
        throw new Error('POST search requires searchBoxSelector and searchButtonSelector');
      }
    }

    await this.navigate(searchUrl);
  }

  // ============================================================================
  // EXTRACTION METHODS (Can be overridden by subclasses)
  // ============================================================================

  /**
   * Extract products from search results page
   */
  protected async extractProductsFromPage(): Promise<ScrapedProduct[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const selectors = this.config.selectors;

    // Check for "no results" message
    if (selectors.noResults) {
      const noResults = await this.page.$(selectors.noResults);
      if (noResults) {
        this.log('No results found on page');
        return [];
      }
    }

    // Get all product containers
    const productElements = await this.page.$$(selectors.productList);
    this.log(`Found ${productElements.length} product elements`);

    const products: ScrapedProduct[] = [];

    for (const element of productElements) {
      try {
        // Extract URL
        const linkElement = await element.$(selectors.productLink);
        if (!linkElement) {
          this.log('Skipping product: no link found');
          continue;
        }

        const relativeUrl = await linkElement.getAttribute('href');
        if (!relativeUrl) continue;

        // Convert relative URL to absolute
        const url = relativeUrl.startsWith('http')
          ? relativeUrl
          : new URL(relativeUrl, this.config.search.url).href;

        // Extract name
        const nameElement = await element.$(selectors.productName);
        const name = nameElement ? (await nameElement.textContent())?.trim() || '' : '';

        // Extract price
        const priceElement = await element.$(selectors.productPrice);
        const priceText = priceElement ? (await priceElement.textContent())?.trim() || '' : '';
        const price = this.parsePrice(priceText);

        if (!price) {
          this.log(`Skipping product: no price found (${name})`);
          continue;
        }

        // Extract SKU (optional)
        let sku: string | undefined;
        if (selectors.productSku) {
          const skuElement = await element.$(selectors.productSku);
          sku = skuElement ? (await skuElement.textContent())?.trim() : undefined;
        }

        // Extract image (optional)
        let imageUrl: string | undefined;
        if (selectors.productImage) {
          const imgElement = await element.$(selectors.productImage);
          if (imgElement) {
            const src = await imgElement.getAttribute('src');
            if (src) {
              imageUrl = src.startsWith('http') ? src : new URL(src, this.config.search.url).href;
            }
          }
        }

        // Extract in-stock status (optional)
        let inStock = true; // Default to true
        if (selectors.inStockIndicator) {
          const inStockElement = await element.$(selectors.inStockIndicator);
          inStock = !!inStockElement;
        }

        // Create product
        const product: ScrapedProduct = {
          url,
          name,
          sku,
          price,
          currency: 'CAD',
          inStock,
          imageUrl,
        };

        products.push(product);

      } catch (error: any) {
        this.logError('Error extracting product from element', error);
        continue;
      }
    }

    return products;
  }

  /**
   * Extract product details from product detail page (for direct scraping)
   */
  protected async extractProductDetailsFromPage(url: string): Promise<ScrapedProduct> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const selectors = this.config.selectors;

    // Navigate to product page
    await this.navigate(url);

    // Extract name
    const nameElement = await this.page.$(selectors.productName);
    const name = nameElement ? (await nameElement.textContent())?.trim() || 'Unknown Product' : 'Unknown Product';

    // Extract price
    const priceElement = await this.page.$(selectors.productPrice);
    const priceText = priceElement ? (await priceElement.textContent())?.trim() || '' : '';
    const price = this.parsePrice(priceText);

    if (!price) {
      throw new Error(`Failed to extract price from ${url}`);
    }

    // Extract SKU (optional)
    let sku: string | undefined;
    if (selectors.productSku) {
      const skuElement = await this.page.$(selectors.productSku);
      sku = skuElement ? (await skuElement.textContent())?.trim() : undefined;
    }

    // Extract image (optional)
    let imageUrl: string | undefined;
    if (selectors.productImage) {
      const imgElement = await this.page.$(selectors.productImage);
      if (imgElement) {
        const src = await imgElement.getAttribute('src');
        if (src) {
          imageUrl = src.startsWith('http') ? src : new URL(src, url).href;
        }
      }
    }

    // Extract in-stock status (optional)
    let inStock = true; // Default to true
    if (selectors.inStockIndicator) {
      const inStockElement = await this.page.$(selectors.inStockIndicator);
      inStock = !!inStockElement;
    }

    return {
      url,
      name,
      sku,
      price,
      currency: 'CAD',
      inStock,
      imageUrl,
    };
  }

  // ============================================================================
  // PAGINATION METHODS
  // ============================================================================

  /**
   * Handle pagination (extract products from all pages)
   */
  protected async extractAllProducts(searchQuery: string): Promise<ScrapedProduct[]> {
    const allProducts: ScrapedProduct[] = [];

    // Search for product
    await this.searchProduct(searchQuery);

    // Extract products from first page
    const firstPageProducts = await this.extractProductsFromPage();
    allProducts.push(...firstPageProducts);

    // Check if pagination is enabled
    const paginationConfig = this.config.pagination;
    if (!paginationConfig || !paginationConfig.enabled) {
      return allProducts;
    }

    // Handle pagination
    const maxPages = paginationConfig.maxPages || 5;

    for (let currentPage = 2; currentPage <= maxPages; currentPage++) {
      try {
        const hasNextPage = await this.goToNextPage(currentPage, paginationConfig.type);

        if (!hasNextPage) {
          this.log(`No more pages available (stopped at page ${currentPage - 1})`);
          break;
        }

        // Extract products from current page
        const pageProducts = await this.extractProductsFromPage();

        if (pageProducts.length === 0) {
          this.log(`No products found on page ${currentPage}, stopping pagination`);
          break;
        }

        allProducts.push(...pageProducts);
        this.log(`Extracted ${pageProducts.length} products from page ${currentPage}`);

        // Rate limiting between pages
        const delay = this.config.rateLimiting?.requestDelay || 2000;
        await this.delay(delay);

      } catch (error: any) {
        this.logError(`Pagination failed at page ${currentPage}`, error);
        break; // Stop pagination on error
      }
    }

    return allProducts;
  }

  /**
   * Go to next page based on pagination type
   */
  protected async goToNextPage(pageNumber: number, type: 'button-click' | 'url-param' | 'infinite-scroll'): Promise<boolean> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const paginationConfig = this.config.pagination;
    if (!paginationConfig) {
      throw new Error('Pagination config not set');
    }

    switch (type) {
      case 'button-click':
        // Click on next button/link
        if (!paginationConfig.selector) {
          throw new Error('Pagination selector required for button-click type');
        }

        const nextButton = await this.page.$(paginationConfig.selector);
        if (!nextButton) {
          return false; // No next button found
        }

        await nextButton.click();
        await this.page.waitForLoadState('domcontentloaded');
        return true;

      case 'url-param':
        // Modify URL with page parameter
        if (!paginationConfig.urlPattern) {
          throw new Error('URL pattern required for url-param type');
        }

        const currentUrl = this.page.url();
        const nextUrl = paginationConfig.urlPattern.replace('{page}', pageNumber.toString());

        // If pattern is relative, append to current URL
        const finalUrl = nextUrl.includes('://') ? nextUrl : currentUrl + nextUrl;

        await this.navigate(finalUrl);
        return true;

      case 'infinite-scroll':
        // Scroll to bottom to load more
        // @ts-ignore - window and document are available in browser context
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await this.delay(2000); // Wait for content to load
        return true; // Assume success (can't easily detect if more loaded)

      default:
        throw new Error(`Unknown pagination type: ${type}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Parse price from text (handles various formats)
   */
  protected parsePrice(priceText: string): number | null {
    if (!priceText) return null;

    // Remove currency symbols, spaces, and extract number
    const cleaned = priceText
      .replace(/[$CAD\s]/gi, '')
      .replace(/,/g, '')
      .trim();

    const match = cleaned.match(/(\d+\.?\d*)/);
    if (!match) return null;

    const price = parseFloat(match[1]);
    return isNaN(price) ? null : price;
  }

  /**
   * Delay execution
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // MAIN INTERFACE METHODS (Implement BaseScraper)
  // ============================================================================

  /**
   * Scrape competitor using search (slow path - with GPT-5 matching)
   */
  async scrapeCompetitor(competitorInfo: CompetitorInfo): Promise<ScraperResult> {
    this.log('Starting competitor scraping (search mode)', {
      competitor: competitorInfo.competitorName,
      productsCount: competitorInfo.products.length,
    });

    const scrapedProducts: ScrapedProduct[] = [];
    const errors: Array<{ url: string; error: string; timestamp: string }> = [];

    try {
      await this.init();

      for (const product of competitorInfo.products) {
        try {
          this.log(`Searching for product: ${product.name}`);

          // Search for product and extract all matching products
          const results = await this.extractAllProducts(product.name);

          if (results.length === 0) {
            this.log(`No products found for: ${product.name}`);
            errors.push(
              this.createError(
                competitorInfo.competitorUrl,
                `No search results for: ${product.name}`
              )
            );
            continue;
          }

          // Take the first result (GPT-5 matching will happen later in the main app)
          scrapedProducts.push(results[0]);

          // Rate limiting between products
          const delay = this.config.rateLimiting?.productDelay || 1000;
          await this.delay(delay);

        } catch (error: any) {
          this.logError(`Error scraping product ${product.name}`, error);
          errors.push(
            this.createError(
              competitorInfo.competitorUrl,
              `Error: ${error.message}`
            )
          );
        }
      }

    } finally {
      await this.close();
    }

    return {
      scrapedProducts,
      productsScraped: scrapedProducts.length,
      productsFailed: errors.length,
      errors,
    };
  }

  /**
   * Scrape products directly from cached URLs (fast path - no GPT-5 needed)
   */
  async scrapeDirect(products: DirectProduct[]): Promise<ScraperResult> {
    this.log('Starting direct scraping (cached URLs)', {
      productsCount: products.length,
    });

    const scrapedProducts: ScrapedProduct[] = [];
    const errors: Array<{ url: string; error: string; timestamp: string }> = [];

    try {
      await this.init();

      for (const product of products) {
        try {
          this.log(`Scraping direct URL: ${product.url}`);

          const details = await this.extractProductDetailsFromPage(product.url);
          scrapedProducts.push(details);

          // Rate limiting between products
          const delay = this.config.rateLimiting?.productDelay || 1000;
          await this.delay(delay);

        } catch (error: any) {
          this.logError(`Error scraping direct URL ${product.url}`, error);
          errors.push(
            this.createError(
              product.url,
              `Failed to scrape direct URL: ${error.message}`
            )
          );
        }
      }

    } finally {
      await this.close();
    }

    return {
      scrapedProducts,
      productsScraped: scrapedProducts.length,
      productsFailed: errors.length,
      errors,
    };
  }
}
