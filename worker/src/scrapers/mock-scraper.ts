/**
 * Mock Scraper - For testing and MVP
 *
 * Returns mock data instead of actual scraping.
 * Used as fallback when real scrapers aren't implemented yet.
 */

import { BaseScraper } from './base-scraper.js';
import { CompetitorInfo, ScraperResult, ScrapedProduct } from '../types/index.js';

export class MockScraper extends BaseScraper {
  readonly scraperType = 'playwright' as const;

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
