/**
 * Scraping Service for Pricing Intelligence
 *
 * Handles scraping of competitor websites and storage of results
 */

import { db } from "@/db";
import { companies, pricingCompetitors, pricingScans, pricingProducts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { MatchingService } from "./matching-service";
import { WorkerClient, ScrapedProduct as WorkerScrapedProduct } from "./worker-client";

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
  private workerClient: WorkerClient;

  constructor() {
    this.matchingService = new MatchingService();
    this.workerClient = new WorkerClient();
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
   * Execute the actual scraping logic via Railway worker
   * NEW v2: Calls Railway worker with WorkerClient
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
    try {
      logs.push({
        timestamp: new Date().toISOString(),
        type: "info",
        message: `Calling Railway worker for ${competitor.name}`,
      });

      // Update scan progress
      await db
        .update(pricingScans)
        .set({
          currentStep: "Fetching active products",
          progressCurrent: 10,
          logs: logs,
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      // Fetch active products for this company
      const activeProducts = await db
        .select({
          id: pricingProducts.id,
          sku: pricingProducts.sku,
          name: pricingProducts.name,
          brand: pricingProducts.brand,
          category: pricingProducts.category,
        })
        .from(pricingProducts)
        .where(
          and(
            eq(pricingProducts.companyId, competitor.companyId),
            eq(pricingProducts.isActive, true)
          )
        );

      console.log(
        `[ScrapingService] Sending ${activeProducts.length} products to Railway worker`
      );

      logs.push({
        timestamp: new Date().toISOString(),
        type: "info",
        message: `Sending ${activeProducts.length} products to Railway worker`,
      });

      await db
        .update(pricingScans)
        .set({
          currentStep: `Scraping ${competitor.name} via Railway worker`,
          progressCurrent: 20,
          logs: logs,
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      // Call Railway worker
      const result = await this.workerClient.scrape({
        companyId: competitor.companyId,
        companySlug: competitor.companySlug,
        competitorId: competitor.id,
        competitorName: competitor.name,
        competitorUrl: competitor.websiteUrl,
        products: activeProducts,
      });

      logs.push({
        timestamp: new Date().toISOString(),
        type: result.success ? "success" : "error",
        message: result.success
          ? `Railway worker completed: ${result.productsScraped} products scraped`
          : `Railway worker completed with errors`,
        metadata: {
          productsFound: result.productsScraped,
          duration: result.metadata.duration,
          scraperType: result.metadata.scraperType,
          workerStatus: result.metadata.workerStatus,
        },
      });

      await db
        .update(pricingScans)
        .set({
          currentStep: "Processing scraped data",
          progressCurrent: 80,
          productsScraped: result.productsScraped,
          logs: logs,
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      // Convert WorkerScrapedProduct to ScrapedProduct
      const scrapedProducts: ScrapedProduct[] = result.scrapedProducts.map((p) => ({
        url: p.url,
        name: p.name,
        sku: p.sku,
        price: p.price,
        currency: p.currency,
        inStock: p.inStock,
        imageUrl: p.imageUrl,
        characteristics: p.characteristics,
      }));

      return {
        success: result.success,
        scrapedProducts: scrapedProducts,
        productsScraped: result.productsScraped,
        productsFailed: result.productsFailed,
        errors: result.errors.map((e) => ({
          url: e.url,
          error: e.error,
          timestamp: new Date(e.timestamp),
        })),
      };
    } catch (error: any) {
      const scrapingError: ScrapingError = {
        url: competitor.websiteUrl,
        error: error.message,
        timestamp: new Date(),
      };

      logs.push({
        timestamp: new Date().toISOString(),
        type: "error",
        message: `Railway worker error: ${error.message}`,
      });

      return {
        success: false,
        scrapedProducts: [],
        productsScraped: 0,
        productsFailed: 1,
        errors: [scrapingError],
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
