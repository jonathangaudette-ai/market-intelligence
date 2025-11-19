/**
 * Mock Scraper - For testing and MVP
 *
 * Returns mock data instead of actual scraping.
 * Used as fallback when real scrapers aren't implemented yet.
 */

import { BaseScraper } from './base-scraper.js';
import { CompetitorInfo, ScraperResult, ScrapedProduct, DirectProduct } from '../types/index.js';

export class MockScraper extends BaseScraper {
  readonly scraperType = 'playwright' as const;

  async scrapeDirect(products: DirectProduct[]): Promise<ScraperResult> {
    this.log('Starting mock direct scraping (cached URLs)', {
      productsToScrape: products.length,
    });

    // Simulate faster scraping for direct URLs
    await new Promise((resolve) => setTimeout(resolve, 500)); // 4x faster than search

    const scrapedProducts: ScrapedProduct[] = [];
    const errors: Array<{ url: string; error: string; timestamp: string }> = [];

    // Mock: 95% success rate for direct URLs (higher than search)
    const successRate = 0.95;

    for (const product of products) {
      if (Math.random() < successRate) {
        // Success: Product found at cached URL
        const basePrice = 50;
        const variance = 0.15;
        const mockPrice = basePrice * (1 + (Math.random() * variance * 2 - variance));

        scrapedProducts.push({
          url: product.url,
          name: `Product ${product.id} (Direct from cached URL)`,
          sku: product.id,
          price: Math.round(mockPrice * 100) / 100,
          currency: 'CAD',
          inStock: Math.random() > 0.05, // 95% in stock
          characteristics: {
            scrapingMethod: 'direct-url',
          },
        });
      } else {
        // Failure: URL changed or product removed (404)
        errors.push(
          this.createError(
            product.url,
            'Product not found at cached URL (404 - needs revalidation)'
          )
        );
      }
    }

    this.log('Mock direct scraping completed', {
      productsScraped: scrapedProducts.length,
      productsFailed: errors.length,
    });

    return {
      scrapedProducts,
      productsScraped: scrapedProducts.length,
      productsFailed: errors.length,
      errors,
    };
  }

  async scrapeCompetitor(competitorInfo: CompetitorInfo): Promise<ScraperResult> {
    this.log('Starting mock scraping', {
      competitor: competitorInfo.competitorName,
      productsToScrape: competitorInfo.products.length,
    });

    // Simulate scraping delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const scrapedProducts: ScrapedProduct[] = [];
    const errors: Array<{ url: string; error: string; timestamp: string }> = [];

    // Mock: Scrape 30% of products successfully
    const successRate = 0.3;
    const numProductsToReturn = Math.max(
      1,
      Math.floor(competitorInfo.products.length * successRate)
    );

    // Create mock products
    for (let i = 0; i < numProductsToReturn; i++) {
      const sourceProduct = competitorInfo.products[i];

      // Simulate price variation (80% to 120% of a base price)
      const basePrice = 50;
      const variance = 0.2;
      const mockPrice = basePrice * (1 + (Math.random() * variance * 2 - variance));

      scrapedProducts.push({
        url: `${competitorInfo.competitorUrl}/product/${sourceProduct.sku}`,
        name: `${sourceProduct.name} (Competitor Version)`,
        sku: sourceProduct.sku,
        price: Math.round(mockPrice * 100) / 100, // Round to 2 decimals
        currency: 'CAD',
        inStock: Math.random() > 0.1, // 90% in stock
        imageUrl: `${competitorInfo.competitorUrl}/images/${sourceProduct.sku}.jpg`,
        characteristics: {
          brand: sourceProduct.brand || 'Generic',
          category: sourceProduct.category || 'Uncategorized',
        },
      });
    }

    // Mock: Create some errors for remaining products
    for (let i = numProductsToReturn; i < competitorInfo.products.length; i++) {
      const sourceProduct = competitorInfo.products[i];
      errors.push(
        this.createError(
          `${competitorInfo.competitorUrl}/product/${sourceProduct.sku}`,
          'Product not found on competitor website (mock error)'
        )
      );
    }

    this.log('Mock scraping completed', {
      productsScraped: scrapedProducts.length,
      productsFailed: errors.length,
    });

    return {
      scrapedProducts,
      productsScraped: scrapedProducts.length,
      productsFailed: errors.length,
      errors,
    };
  }
}
