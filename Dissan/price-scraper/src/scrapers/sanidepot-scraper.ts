/**
 * SanidepotScraper - Scraper for sani-depot.ca
 * SaniDépôt Québec
 */

import { BaseScraper } from './base-scraper';
import type { SearchResult, ProductDetails, CompetitorConfig } from '../types';
import { skusMatch } from '../matchers/sku-matcher';
import { findBestMatch } from '../matchers/name-matcher';

export class SanidepotScraper extends BaseScraper {
  constructor(config: CompetitorConfig) {
    super(config);
  }

  async searchBySku(sku: string): Promise<SearchResult> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      this.logger.debug(`Searching for SKU: ${sku}`);

      const searchUrl = `${this.config.search.url}?${this.config.search.param}=${encodeURIComponent(sku)}`;
      await this.navigate(searchUrl);

      const noResultsSelector = this.config.selectors.noResults;
      const hasNoResults = await this.page.$(noResultsSelector);

      if (hasNoResults) {
        this.logger.debug('No results found for SKU');
        return { found: false, matchType: 'none' };
      }

      const productItems = await this.page.$$(this.config.selectors.productList);

      if (productItems.length === 0) {
        this.logger.debug('No product items found');
        return { found: false, matchType: 'none' };
      }

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

  async searchByName(name: string, brand: string): Promise<SearchResult> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      this.logger.debug(`Searching by name: ${name} (brand: ${brand})`);

      const searchQuery = brand ? `${brand} ${name}` : name;
      const searchUrl = `${this.config.search.url}?${this.config.search.param}=${encodeURIComponent(searchQuery)}`;

      await this.navigate(searchUrl);

      const noResultsSelector = this.config.selectors.noResults;
      const hasNoResults = await this.page.$(noResultsSelector);

      if (hasNoResults) {
        this.logger.debug('No results found for name search');
        return { found: false, matchType: 'none' };
      }

      const productItems = await this.page.$$(this.config.selectors.productList);

      if (productItems.length === 0) {
        this.logger.debug('No products found in results');
        return { found: false, matchType: 'none' };
      }

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

  async extractProductDetails(url: string): Promise<ProductDetails> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      this.logger.debug(`Extracting details from: ${url}`);

      await this.navigate(url);

      const nameEl = await this.page.$(this.config.selectors.productName);
      const name = nameEl ? (await nameEl.textContent())?.trim() || '' : '';

      const skuEl = await this.page.$(this.config.selectors.productSku);
      let sku: string | undefined;

      if (skuEl) {
        const skuText = (await skuEl.textContent())?.trim() || '';
        const skuMatch = skuText.match(/(?:SKU|Item|Product|Model)[s#:]+([A-Z0-9-]+)/i);
        sku = skuMatch ? skuMatch[1] : skuText;
      }

      const priceEl = await this.page.$(this.config.selectors.productPrice);
      let price = 0;
      let currency = 'CAD';

      if (priceEl) {
        const priceText = (await priceEl.textContent())?.trim() || '';

        if (priceText.includes('$')) {
          currency = 'CAD';
        } else if (priceText.includes('€')) {
          currency = 'EUR';
        }

        const priceMatch = priceText.match(/[d,]+.?d*/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(/,/g, ''));
        }
      }

      let availability: string | undefined;
      try {
        const availabilityEl = await this.page.$('.stock-status, .availability, .in-stock');
        if (availabilityEl) {
          availability = (await availabilityEl.textContent())?.trim();
        }
      } catch (error) {
        // Optional
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
