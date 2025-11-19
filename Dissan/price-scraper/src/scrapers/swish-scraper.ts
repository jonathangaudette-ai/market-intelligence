/**
 * Swish Scraper - Scraper for swish.ca
 */

import { BaseScraper } from './base-scraper';
import type { SearchResult, ProductDetails, CompetitorConfig } from '../types';
import { skusMatch } from '../matchers/sku-matcher';
import { findBestMatch } from '../matchers/name-matcher';
import { findBestCharacteristicMatch } from '../matchers/characteristic-matcher';

export class SwishScraper extends BaseScraper {
  constructor(config: CompetitorConfig) {
    super(config);
  }

  /**
   * Search for a product by SKU on Swish
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

      // Get product links
      const productLinks = await this.page.$$(this.config.selectors.productLink);

      if (productLinks.length === 0) {
        this.logger.debug('No product links found');
        return { found: false, matchType: 'none' };
      }

      // Check each product for SKU match
      for (const link of productLinks) {
        try {
          const productUrl = await link.getAttribute('href');
          const productNameEl = await link.$(this.config.selectors.productName);
          const productSkuEl = await link.$(this.config.selectors.productSku);

          if (!productUrl) continue;

          const fullUrl = productUrl.startsWith('http')
            ? productUrl
            : `${this.config.url}${productUrl}`;

          // Check if SKU matches
          if (productSkuEl) {
            const foundSku = await productSkuEl.textContent();
            if (foundSku && skusMatch(sku, foundSku.trim())) {
              this.logger.debug(`Found exact SKU match: ${foundSku}`);

              const productName = productNameEl
                ? await productNameEl.textContent()
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
          this.logger.warn(`Error checking product link: ${error}`);
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
   * Search for a product by name and brand on Swish
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

      // Get all product names
      const productElements = await this.page.$$(this.config.selectors.productList);

      if (productElements.length === 0) {
        this.logger.debug('No products found in results');
        return { found: false, matchType: 'none' };
      }

      // Extract product names and URLs
      const products: Array<{ name: string; url: string }> = [];

      for (const productEl of productElements) {
        try {
          const linkEl = await productEl.$(this.config.selectors.productLink);
          const nameEl = await productEl.$(this.config.selectors.productName);

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

      // Strategy 1: Try exact name matching first
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

      // Strategy 2: Try characteristic-based matching (fallback for different brands)
      this.logger.debug('No exact name match - trying characteristic matching...');

      const characteristicMatch = findBestCharacteristicMatch(
        name,
        productNames,
        0.5  // Lower threshold (50%) for characteristic matching
      );

      if (characteristicMatch) {
        const matchedProduct = products.find((p) => p.name === characteristicMatch.name);

        if (matchedProduct) {
          this.logger.debug(
            `Found characteristic match with confidence ${characteristicMatch.confidence.toFixed(2)}: ${matchedProduct.name}`
          );
          this.logger.debug(
            `  Matched types: ${characteristicMatch.matchResult.matchedTypes.join(', ')}`
          );
          this.logger.debug(
            `  Matched materials: ${characteristicMatch.matchResult.matchedMaterials.join(', ')}`
          );

          return {
            found: true,
            matchType: 'characteristic',
            productUrl: matchedProduct.url,
            productName: matchedProduct.name,
            confidence: characteristicMatch.confidence,
          };
        }
      }

      this.logger.debug('No confident match found (tried name + characteristic matching)');
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

      // Extract SKU
      const skuEl = await this.page.$(this.config.selectors.productSku);
      const sku = skuEl ? (await skuEl.textContent())?.trim() : undefined;

      // Extract price
      const priceEl = await this.page.$(this.config.selectors.productPrice);
      let price = 0;
      let currency = 'CAD';

      if (priceEl) {
        const priceText = (await priceEl.textContent())?.trim() || '';

        // Extract currency symbol
        if (priceText.includes('$')) {
          currency = 'CAD';
        } else if (priceText.includes('€')) {
          currency = 'EUR';
        } else if (priceText.includes('£')) {
          currency = 'GBP';
        }

        // Extract numeric price
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(/,/g, ''));
        }
      }

      this.logger.debug(`Extracted: ${name} - ${currency} ${price}`);

      return {
        url,
        name,
        sku,
        price,
        currency,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error in extractProductDetails: ${error}`);
      throw error;
    }
  }
}
