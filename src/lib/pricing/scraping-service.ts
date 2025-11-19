/**
 * Scraping Service for Pricing Intelligence
 *
 * Handles scraping of competitor websites and storage of results
 */

import { db } from "@/db";
import { companies, pricingCompetitors, pricingScans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { MatchingService } from "./matching-service";

// ============================================================================
// Types
// ============================================================================

export interface ScrapedProduct {
  url: string;
  name: string;
  sku?: string;
  price: number;
  currency: string;
  inStock: boolean;
  imageUrl?: string;
  characteristics?: Record<string, any>;
}

export interface ScrapingError {
  url: string;
  error: string;
  timestamp: Date;
}

export interface ScrapingResult {
  success: boolean;
  scanId: string;
  productsScraped: number;
  productsMatched: number;
  productsFailed: number;
  errors: ScrapingError[];
}

export interface LogEvent {
  timestamp: string;
  type: "info" | "success" | "error" | "progress";
  message: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Scraping Service
// ============================================================================

export class ScrapingService {
  private matchingService: MatchingService;

  constructor() {
    this.matchingService = new MatchingService();
  }

  /**
   * Scrape a specific competitor website
   */
  async scrapeCompetitor(competitorId: string): Promise<ScrapingResult> {
    // Fetch competitor config
    const [competitor] = await db
      .select()
      .from(pricingCompetitors)
      .where(eq(pricingCompetitors.id, competitorId))
      .limit(1);

    if (!competitor) {
      throw new Error(`Competitor ${competitorId} not found`);
    }

    if (!competitor.isActive) {
      throw new Error(`Competitor ${competitor.name} is not active`);
    }

    // Create scan job
    const scanId = createId();
    const logs: LogEvent[] = [];

    try {
      // Initialize scan record
      await db.insert(pricingScans).values({
        id: scanId,
        companyId: competitor.companyId,
        competitorId: competitor.id,
        status: "running",
        currentStep: "Initializing scan",
        progressCurrent: 0,
        progressTotal: 100,
        productsScraped: 0,
        productsMatched: 0,
        productsFailed: 0,
        logs: [
          {
            timestamp: new Date().toISOString(),
            type: "info",
            message: `Starting scan of ${competitor.name}`,
          },
        ],
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logs.push({
        timestamp: new Date().toISOString(),
        type: "info",
        message: `Scan initialized for ${competitor.name}`,
      });

      // Execute scraping
      const scrapingResult = await this.executeScraping(
        competitor,
        scanId,
        logs
      );

      let productsMatched = 0;

      // If scraping was successful and products found, trigger AI matching
      if (scrapingResult.success && scrapingResult.scrapedProducts.length > 0) {
        logs.push({
          timestamp: new Date().toISOString(),
          type: "info",
          message: `Starting AI matching with GPT-5 for ${scrapingResult.scrapedProducts.length} products`,
        });

        await db
          .update(pricingScans)
          .set({
            currentStep: "Matching products with AI",
            progressCurrent: 85,
            logs: logs,
            updatedAt: new Date(),
          })
          .where(eq(pricingScans.id, scanId));

        try {
          const matches = await this.matchingService.matchProducts(
            competitor.companyId,
            competitor.id,
            scrapingResult.scrapedProducts
          );

          productsMatched = matches.filter((m) => m.confidence >= 0.7).length;

          logs.push({
            timestamp: new Date().toISOString(),
            type: "success",
            message: `AI matching completed: ${productsMatched} high-confidence matches found`,
            metadata: {
              totalMatches: matches.length,
              highConfidenceMatches: productsMatched,
            },
          });
        } catch (matchingError: any) {
          logs.push({
            timestamp: new Date().toISOString(),
            type: "error",
            message: `AI matching failed: ${matchingError.message}`,
          });
          console.error("[ScrapingService] Matching error:", matchingError);
        }
      }

      // Update final scan status
      await db
        .update(pricingScans)
        .set({
          status: scrapingResult.success ? "completed" : "failed",
          currentStep: "Scan completed",
          progressCurrent: 100,
          productsScraped: scrapingResult.productsScraped,
          productsMatched: productsMatched,
          productsFailed: scrapingResult.productsFailed,
          logs: logs,
          completedAt: new Date(),
          updatedAt: new Date(),
          errorMessage:
            scrapingResult.errors.length > 0
              ? `${scrapingResult.errors.length} errors occurred`
              : null,
        })
        .where(eq(pricingScans.id, scanId));

      // Update competitor stats
      await db
        .update(pricingCompetitors)
        .set({
          lastScanAt: new Date(),
          totalScans: (competitor.totalScans || 0) + 1,
          successfulScans: scrapingResult.success
            ? (competitor.successfulScans || 0) + 1
            : (competitor.successfulScans || 0),
          failedScans: scrapingResult.success
            ? (competitor.failedScans || 0)
            : (competitor.failedScans || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(pricingCompetitors.id, competitorId));

      return {
        success: scrapingResult.success,
        scanId,
        productsScraped: scrapingResult.productsScraped,
        productsMatched: productsMatched,
        productsFailed: scrapingResult.productsFailed,
        errors: scrapingResult.errors,
      };
    } catch (error: any) {
      // Mark scan as failed
      await db
        .update(pricingScans)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage: error.message,
          logs: [
            ...logs,
            {
              timestamp: new Date().toISOString(),
              type: "error",
              message: `Scan failed: ${error.message}`,
            },
          ],
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      throw error;
    }
  }

  /**
   * Execute the actual scraping logic
   * This is a MVP implementation that will be replaced with real scraping
   */
  private async executeScraping(
    competitor: any,
    scanId: string,
    logs: LogEvent[]
  ): Promise<{
    success: boolean;
    scrapedProducts: ScrapedProduct[];
    productsScraped: number;
    productsFailed: number;
    errors: ScrapingError[];
  }> {
    const scrapedProducts: ScrapedProduct[] = [];
    const errors: ScrapingError[] = [];

    try {
      logs.push({
        timestamp: new Date().toISOString(),
        type: "info",
        message: `Connecting to ${competitor.websiteUrl}`,
      });

      // Update scan progress
      await db
        .update(pricingScans)
        .set({
          currentStep: "Fetching product list",
          progressCurrent: 10,
          logs: logs,
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      // TODO: Integrate with real scraper from /Dissan/price-scraper
      // For now, simulate scraping with mock data

      // Simulate scraping delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock scraped products
      const mockProducts: ScrapedProduct[] = [
        {
          url: `${competitor.websiteUrl}/product/mock-1`,
          name: "Mock Product 1",
          sku: "MOCK-001",
          price: 9.99,
          currency: "CAD",
          inStock: true,
        },
        {
          url: `${competitor.websiteUrl}/product/mock-2`,
          name: "Mock Product 2",
          sku: "MOCK-002",
          price: 19.99,
          currency: "CAD",
          inStock: true,
        },
        {
          url: `${competitor.websiteUrl}/product/mock-3`,
          name: "Mock Product 3",
          sku: "MOCK-003",
          price: 29.99,
          currency: "CAD",
          inStock: false,
        },
      ];

      scrapedProducts.push(...mockProducts);

      logs.push({
        timestamp: new Date().toISOString(),
        type: "success",
        message: `Successfully scraped ${mockProducts.length} products`,
        metadata: {
          productsFound: mockProducts.length,
        },
      });

      // Update progress
      await db
        .update(pricingScans)
        .set({
          currentStep: "Processing scraped data",
          progressCurrent: 80,
          productsScraped: scrapedProducts.length,
          logs: logs,
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      // TODO: Store scraped products in pricing_competitor_products table (Phase 8 - Historique)

      return {
        success: true,
        scrapedProducts: scrapedProducts,
        productsScraped: scrapedProducts.length,
        productsFailed: errors.length,
        errors,
      };
    } catch (error: any) {
      const scrapingError: ScrapingError = {
        url: competitor.websiteUrl,
        error: error.message,
        timestamp: new Date(),
      };

      errors.push(scrapingError);

      logs.push({
        timestamp: new Date().toISOString(),
        type: "error",
        message: `Scraping error: ${error.message}`,
      });

      return {
        success: false,
        scrapedProducts: scrapedProducts,
        productsScraped: scrapedProducts.length,
        productsFailed: 1,
        errors,
      };
    }
  }

  /**
   * Scrape all active competitors for a company
   */
  async scrapeAllCompetitors(companyId: string): Promise<{
    totalCompetitors: number;
    successfulScans: number;
    failedScans: number;
    totalProductsMatched: number;
  }> {
    // Fetch all active competitors
    const activeCompetitors = await db
      .select()
      .from(pricingCompetitors)
      .where(
        and(
          eq(pricingCompetitors.companyId, companyId),
          eq(pricingCompetitors.isActive, true)
        )
      );

    let successfulScans = 0;
    let failedScans = 0;
    let totalProductsMatched = 0;

    for (const competitor of activeCompetitors) {
      try {
        const result = await this.scrapeCompetitor(competitor.id);
        successfulScans++;
        totalProductsMatched += result.productsMatched;
      } catch (error: any) {
        console.error(
          `Error scraping competitor ${competitor.name}:`,
          error.message
        );
        failedScans++;
      }
    }

    return {
      totalCompetitors: activeCompetitors.length,
      successfulScans,
      failedScans,
      totalProductsMatched,
    };
  }

  /**
   * Get scan status by ID
   */
  async getScanStatus(scanId: string) {
    const [scan] = await db
      .select()
      .from(pricingScans)
      .where(eq(pricingScans.id, scanId))
      .limit(1);

    return scan;
  }
}
