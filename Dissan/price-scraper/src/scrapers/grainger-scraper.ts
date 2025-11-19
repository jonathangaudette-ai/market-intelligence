/**
 * Grainger Scraper - Scraper for grainger.ca
 * Grainger is a major MRO supplier with 100,000+ products
 */

import { BaseScraper } from './base-scraper';
import type { SearchResult, ProductDetails, CompetitorConfig } from '../types';
import { skusMatch } from '../matchers/sku-matcher';
import { findBestMatch } from '../matchers/name-matcher';

export class GraingerScraper extends BaseScraper {
  constructor(config: CompetitorConfig) {
    super(config);
  }

  /**
   * Search for a product by SKU on Grainger
   */
  async searchBySku(sku: string): Promise<SearchResult> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      this.logger.debug(`Searching for SKU: ${sku}`);

      // Navigate to search page with SKU query
      const searchUrl = `${this.config.search.url}?${this.config.search.param}=${encodeURIComponent(sku)}`;
      await this.navigate(searchUrl);

      // Check for "no results" message
      const noResultsSelector = this.config.selectors.noResults;
      const hasNoResults = await this.page.$(noResultsSelector);

      if (hasNoResults) {
        this.logger.debug('No results found for SKU');
        return { found: false, matchType: 'none' };
      }

      // Get product list items
      const productItems = await this.page.$$(this.config.selectors.productList);

      if (productItems.length === 0) {
        this.logger.debug('No product items found');
        return { found: false, matchType: 'none' };
      }

      // Check each product for SKU match
      for (const item of productItems) {
        try {
          const linkEl = await item.$(this.config.selectors.productLink);
          const nameEl = await item.$(this.config.selectors.productName);
          const skuEl = await item.$(this.config.selectors.productSku);

          if (!linkEl) continue;

          const productUrl = await linkEl.getAttribute('href');
          if (!productUrl) continue;

          const fullUrl = productUrl.startsWith('http')
            ? productUrl
            : `${this.config.url}${productUrl}`;

          // Check if SKU matches
          if (skuEl) {
            const foundSku = await skuEl.textContent();
            if (foundSku && skusMatch(sku, foundSku.trim())) {
              this.logger.debug(`Found exact SKU match: ${foundSku}`);

              const productName = nameEl
                ? await nameEl.textContent()
                : undefined;

              return {
                found: true,
                matchType: 'sku',
                productUrl: fullUrl,
                productName: productName?.trim(),
                productSku: foundSku.trim(),
              };
            }
          }
        } catch (error) {
          this.logger.warn(`Error checking product item: ${error}`);
          continue;
        }
      }

      this.logger.debug('No SKU match found in results');
      return { found: false, matchType: 'none' };
    } catch (error) {
      this.logger.error(`Error in searchBySku: ${error}`);
      throw error;
    }
  }

  /**
   * Search for a product by name and brand on Grainger
   */
  async searchByName(name: string, brand: string): Promise<SearchResult> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      this.logger.debug(`Searching by name: ${name} (brand: ${brand})`);

      // Build search query (brand + name)
      const searchQuery = brand ? `${brand} ${name}` : name;
      const searchUrl = `${this.config.search.url}?${this.config.search.param}=${encodeURIComponent(searchQuery)}`;

      await this.navigate(searchUrl);

      // Check for "no results"
      const noResultsSelector = this.config.selectors.noResults;
      const hasNoResults = await this.page.$(noResultsSelector);

      if (hasNoResults) {
        this.logger.debug('No results found for name search');
        return { found: false, matchType: 'none' };
      }

      // Get all product items
      const productItems = await this.page.$$(this.config.selectors.productList);

      if (productItems.length === 0) {
        this.logger.debug('No products found in results');
        return { found: false, matchType: 'none' };
      }

      // Extract product names and URLs
      const products: Array<{ name: string; url: string }> = [];

      for (const item of productItems) {
        try {
          const linkEl = await item.$(this.config.selectors.productLink);
          const nameEl = await item.$(this.config.selectors.productName);

          if (!linkEl || !nameEl) continue;

          const productUrl = await linkEl.getAttribute('href');
          const productName = await nameEl.textContent();

          if (productUrl && productName) {
            const fullUrl = productUrl.startsWith('http')
              ? productUrl
              : `${this.config.url}${productUrl}`;

            products.push({
              name: productName.trim(),
              url: fullUrl,
            });
          }
        } catch (error) {
          this.logger.warn(`Error extracting product info: ${error}`);
          continue;
        }
      }

      if (products.length === 0) {
        this.logger.debug('No valid products extracted');
        return { found: false, matchType: 'none' };
      }

      // Find best matching product
      const productNames = products.map((p) => p.name);
      const bestMatch = findBestMatch(name, productNames, brand);

      if (bestMatch) {
        const matchedProduct = products.find((p) => p.name === bestMatch.name);

        if (matchedProduct) {
          this.logger.debug(
            `Found name match with confidence ${bestMatch.confidence.toFixed(2)}: ${matchedProduct.name}`
          );

          return {
            found: true,
            matchType: 'name',
            productUrl: matchedProduct.url,
            productName: matchedProduct.name,
            confidence: bestMatch.confidence,
          };
        }
      }

      this.logger.debug('No confident name match found');
      return { found: false, matchType: 'none' };
    } catch (error) {
      this.logger.error(`Error in searchByName: ${error}`);
      throw error;
    }
  }

  /**
   * Extract product details from product page
   */
  async extractProductDetails(url: string): Promise<ProductDetails> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      this.logger.debug(`Extracting details from: ${url}`);

      await this.navigate(url);

      // Extract product name
      const nameEl = await this.page.$(this.config.selectors.productName);
      const name = nameEl ? (await nameEl.textContent())?.trim() || '' : '';

      // Extract SKU (Grainger uses "Product Number" or "Item #")
      const skuEl = await this.page.$(this.config.selectors.productSku);
      let sku: string | undefined;

      if (skuEl) {
        const skuText = (await skuEl.textContent())?.trim() || '';
        // Extract SKU from text like "Item #: 12345" or "Product Number: 12345"
        const skuMatch = skuText.match(/(?:Item|Product|Model|SKU)[\s#:]+([A-Z0-9\-]+)/i);
        sku = skuMatch ? skuMatch[1] : skuText;
      }

      // Extract price
      const priceEl = await this.page.$(this.config.selectors.productPrice);
      let price = 0;
      let currency = 'CAD';

      if (priceEl) {
        const priceText = (await priceEl.textContent())?.trim() || '';

        // Grainger might display prices like "$123.45" or "CAD $123.45"
        if (priceText.includes('$')) {
          currency = 'CAD';
        } else if (priceText.includes('€')) {
          currency = 'EUR';
        }

        // Extract numeric price
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(/,/g, ''));
        }
      }

      // Extract availability (optional)
      let availability: string | undefined;
      try {
        const availabilityEl = await this.page.$('.availability, .stock-status, .in-stock');
        if (availabilityEl) {
          availability = (await availabilityEl.textContent())?.trim();
        }
      } catch (error) {
        // Availability is optional
      }

      this.logger.debug(`Extracted: ${name} - ${currency} ${price}`);

      return {
        url,
        name,
        sku,
        price,
        currency,
        availability,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error in extractProductDetails: ${error}`);
      throw error;
    }
  }
}
