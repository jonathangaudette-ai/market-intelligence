/**
 * Scraping Service for Pricing Intelligence
 *
 * Handles scraping of competitor websites and storage of results
 */

import { db } from "@/db";
import { companies, pricingCompetitors, pricingScans, pricingProducts, pricingMatches } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { MatchingService } from "./matching-service";
import { WorkerClient, ScrapedProduct as WorkerScrapedProduct } from "./worker-client";
import { gpt5SearchService } from "./gpt5-search-service";

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

export interface DiscoveredUrl {
  productId: string;
  url: string | null;
  confidence: number;
  searchDuration: number;
}

export interface DiscoveryResult {
  success: boolean;
  urlsDiscovered: number;
  urlsFailed: number;
  discoveredUrls: DiscoveredUrl[];
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
   * Discover product URLs using GPT-5 Search (without scraping prices)
   * @param competitorId - ID of the competitor
   * @param productId - Optional: ID of a specific product (if not provided, discovers all products without URLs)
   * @returns DiscoveryResult with discovered URLs
   */
  async discoverUrls(
    competitorId: string,
    productId?: string
  ): Promise<DiscoveryResult> {
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

    console.log(`[ScrapingService] Discovering URLs for ${competitor.name}`);

    // Fetch active products for this company
    const productFilters = [
      eq(pricingProducts.companyId, competitor.companyId),
      eq(pricingProducts.isActive, true),
      isNull(pricingProducts.deletedAt),
    ];

    if (productId) {
      productFilters.push(eq(pricingProducts.id, productId));
    }

    const activeProducts = await db
      .select({
        id: pricingProducts.id,
        sku: pricingProducts.sku,
        name: pricingProducts.name,
        brand: pricingProducts.brand,
        category: pricingProducts.category,
      })
      .from(pricingProducts)
      .where(and(...productFilters));

    if (activeProducts.length === 0) {
      return {
        success: true,
        urlsDiscovered: 0,
        urlsFailed: 0,
        discoveredUrls: [],
      };
    }

    console.log(`[ScrapingService] Discovering URLs for ${activeProducts.length} products`);

    // Call GPT-5 Search Service
    const discoveredUrls = await gpt5SearchService.discoverProductUrls(
      {
        id: competitor.id,
        name: competitor.name,
        websiteUrl: competitor.websiteUrl,
      },
      activeProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category,
      }))
    );

    // Filter valid URLs (confidence >= 0.7)
    const validUrls = discoveredUrls.filter((d) => d.url && d.confidence >= 0.7);

    console.log(
      `[ScrapingService] GPT-5 discovered ${validUrls.length}/${discoveredUrls.length} URLs`
    );

    // Cache discovered URLs in pricingMatches
    for (const discovered of validUrls) {
      const product = activeProducts.find((p) => p.id === discovered.productId);
      if (product && discovered.url) {
        try {
          await db
            .insert(pricingMatches)
            .values({
              productId: product.id,
              competitorId: competitor.id,
              competitorProductUrl: discovered.url,
              competitorProductName: "", // Will be updated after scraping
              price: "0.00", // No price yet - discovery only
              currency: "CAD",
              matchType: "ai",
              matchSource: "gpt5-search",
              confidenceScore: discovered.confidence.toString(),
              matchDetails: {
                searchDuration: discovered.searchDuration,
                discoveredAt: new Date().toISOString(),
              } as any,
              needsRevalidation: false,
              lastScrapedAt: new Date(), // Set to now, even though not scraped yet
            })
            .onConflictDoUpdate({
              target: [pricingMatches.productId, pricingMatches.competitorId],
              set: {
                competitorProductUrl: discovered.url,
                matchSource: "gpt5-search",
                confidenceScore: discovered.confidence.toString(),
                matchDetails: {
                  searchDuration: discovered.searchDuration,
                  discoveredAt: new Date().toISOString(),
                } as any,
                needsRevalidation: false,
                updatedAt: new Date(),
              },
            });
        } catch (cacheError: any) {
          console.error(
            `[ScrapingService] Failed to cache URL for product ${product.id}:`,
            cacheError.message
          );
          // Continue even if cache fails
        }
      }
    }

    return {
      success: true,
      urlsDiscovered: validUrls.length,
      urlsFailed: discoveredUrls.length - validUrls.length,
      discoveredUrls: discoveredUrls,
    };
  }

  /**
   * Scrape a specific competitor website
   * @param competitorId - ID of the competitor to scrape
   * @param productId - Optional: ID of a specific product to scan (if not provided, scans all products)
   * @param skipDiscovery - Optional: Skip GPT-5 URL discovery and only scrape known URLs (default: false)
   */
  async scrapeCompetitor(
    competitorId: string,
    productId?: string,
    skipDiscovery: boolean = false
  ): Promise<ScrapingResult> {
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

    // IMPORTANT: Parse scraperConfig if it's a string (postgres-js sometimes returns JSONB as string)
    if (typeof competitor.scraperConfig === 'string') {
      try {
        (competitor as any).scraperConfig = JSON.parse(competitor.scraperConfig);
        console.log('[ScrapingService] Parsed scraperConfig from string to object');
      } catch (e) {
        console.error('[ScrapingService] Failed to parse scraperConfig:', e);
      }
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
        logs,
        productId,
        skipDiscovery
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
   * NEW v3: Optional skipDiscovery parameter
   */
  private async executeScraping(
    competitor: any,
    scanId: string,
    logs: LogEvent[],
    productId?: string,
    skipDiscovery: boolean = false
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

      // Fetch active products for this company (exclude soft-deleted)
      // If productId is provided, only fetch that specific product
      const productFilters = [
        eq(pricingProducts.companyId, competitor.companyId),
        eq(pricingProducts.isActive, true),
        isNull(pricingProducts.deletedAt), // Exclude soft-deleted products
      ];

      if (productId) {
        productFilters.push(eq(pricingProducts.id, productId));
      }

      const activeProducts = await db
        .select({
          id: pricingProducts.id,
          sku: pricingProducts.sku,
          name: pricingProducts.name,
          brand: pricingProducts.brand,
          category: pricingProducts.category,
        })
        .from(pricingProducts)
        .where(and(...productFilters));

      // NEW v3: Fetch existing matches to use cached URLs
      const existingMatches = await db
        .select({
          productId: pricingMatches.productId,
          url: pricingMatches.competitorProductUrl,
          needsRevalidation: pricingMatches.needsRevalidation,
        })
        .from(pricingMatches)
        .where(eq(pricingMatches.competitorId, competitor.id));

      console.log(
        `[ScrapingService] DEBUG: Found ${existingMatches.length} existing matches for competitor ${competitor.id}`,
        JSON.stringify(existingMatches, null, 2)
      );
      console.log(
        `[ScrapingService] DEBUG: Processing ${activeProducts.length} active products`,
        JSON.stringify(activeProducts.map(p => ({ id: p.id, sku: p.sku, name: p.name })), null, 2)
      );

      // Separate products into direct (with cached URL) vs search (without)
      const productsWithUrl: any[] = [];
      const productsWithoutUrl: any[] = [];

      for (const product of activeProducts) {
        const match = existingMatches.find(m => m.productId === product.id);
        console.log(
          `[ScrapingService] DEBUG: Product ${product.sku} - Match found: ${!!match}, Has URL: ${!!match?.url}, Needs revalidation: ${match?.needsRevalidation}`
        );

        if (match && match.url && !match.needsRevalidation) {
          // Has cached URL - use direct scraping
          console.log(`[ScrapingService] DEBUG: ✅ Using DIRECT scraping for ${product.sku} -> ${match.url}`);
          productsWithUrl.push({
            type: 'direct',
            id: product.id,
            sku: product.sku,
            name: product.name,
            brand: product.brand,
            category: product.category,
            url: match.url,
          });
        } else {
          // No cached URL or needs revalidation - use search
          const reason = !match ? 'No match found' : !match.url ? 'No URL' : 'Needs revalidation';
          console.log(`[ScrapingService] DEBUG: ⚠️  Using SEARCH for ${product.sku} - Reason: ${reason}`);
          productsWithoutUrl.push({
            type: 'search',
            id: product.id,
            sku: product.sku,
            name: product.name,
            brand: product.brand,
            category: product.category,
          });
        }
      }

      console.log(
        `[ScrapingService] Optimization: ${productsWithUrl.length} direct URLs, ${productsWithoutUrl.length} search`
      );

      logs.push({
        timestamp: new Date().toISOString(),
        type: "info",
        message: `Cache optimization: ${productsWithUrl.length} direct URLs, ${productsWithoutUrl.length} search`,
        metadata: {
          directUrls: productsWithUrl.length,
          search: productsWithoutUrl.length,
          optimizationRate: `${Math.round((productsWithUrl.length / activeProducts.length) * 100)}%`,
        },
      });

      // NEW: GPT-5 Search Discovery for products without cached URLs
      // NEW v3: Skip if skipDiscovery = true (price-only scan)
      // DISABLED: User doesn't want to scrape products without URLs
      if (false && !skipDiscovery && productsWithoutUrl.length > 0) {
        logs.push({
          timestamp: new Date().toISOString(),
          type: "progress",
          message: `Discovering ${productsWithoutUrl.length} product URLs with GPT-5 Search API`,
          metadata: {
            totalProducts: productsWithoutUrl.length,
            step: "gpt5-search",
          },
        });

        await db
          .update(pricingScans)
          .set({
            currentStep: "Discovering product URLs with GPT-5",
            progressCurrent: 15,
            logs: logs,
            updatedAt: new Date(),
          })
          .where(eq(pricingScans.id, scanId));

        // Call GPT-5 Search Service
        const discoveredUrls = await gpt5SearchService.discoverProductUrls(
          {
            id: competitor.id,
            name: competitor.name,
            websiteUrl: competitor.websiteUrl,
          },
          productsWithoutUrl.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            brand: p.brand,
            category: p.category,
          }))
        );

        // Filter valid URLs (confidence >= 0.7)
        const validUrls = discoveredUrls.filter((d) => d.url && d.confidence >= 0.7);

        console.log(
          `[ScrapingService] GPT-5 discovered ${validUrls.length}/${discoveredUrls.length} URLs`
        );

        // Convert discovered URLs to productsWithUrl format and cache
        for (const discovered of validUrls) {
          const product = productsWithoutUrl.find((p) => p.id === discovered.productId);
          if (product && discovered.url) {
            // Add to productsWithUrl for direct scraping
            productsWithUrl.push({
              type: "direct",
              id: product.id,
              sku: product.sku,
              name: product.name,
              brand: product.brand,
              category: product.category,
              url: discovered.url,
            });

            // Remove from productsWithoutUrl
            const index = productsWithoutUrl.indexOf(product);
            if (index > -1) {
              productsWithoutUrl.splice(index, 1);
            }

            // Cache discovered URL in pricingMatches (upsert)
            try {
              await db
                .insert(pricingMatches)
                .values({
                  id: createId(),
                  productId: product.id,
                  competitorId: competitor.id,
                  competitorProductUrl: discovered.url,
                  competitorProductName: "", // Will be updated after scraping
                  price: "0.00", // Will be updated after scraping
                  currency: "CAD",
                  matchType: "ai",
                  matchSource: "gpt5-search", // NEW: Track discovery source
                  confidenceScore: discovered.confidence.toString(),
                  matchDetails: {
                    searchDuration: discovered.searchDuration,
                    discoveredAt: new Date().toISOString(),
                  } as any,
                  needsRevalidation: false,
                  lastScrapedAt: new Date(),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: [pricingMatches.productId, pricingMatches.competitorId],
                  set: {
                    competitorProductUrl: discovered.url,
                    matchSource: "gpt5-search", // NEW: Update source on conflict
                    confidenceScore: discovered.confidence.toString(),
                    matchDetails: {
                      searchDuration: discovered.searchDuration,
                      discoveredAt: new Date().toISOString(),
                    } as any,
                    needsRevalidation: false,
                    updatedAt: new Date(),
                  },
                });
            } catch (cacheError: any) {
              console.error(
                `[ScrapingService] Failed to cache URL for product ${product.id}:`,
                cacheError.message
              );
              // Continue even if cache fails
            }
          }
        }

        // Log GPT-5 discovery results
        const avgConfidence =
          validUrls.length > 0
            ? validUrls.reduce((sum, d) => sum + d.confidence, 0) / validUrls.length
            : 0;

        logs.push({
          timestamp: new Date().toISOString(),
          type: "success",
          message: `GPT-5 discovered ${validUrls.length}/${discoveredUrls.length} product URLs`,
          metadata: {
            discovered: validUrls.length,
            total: discoveredUrls.length,
            failed: discoveredUrls.length - validUrls.length,
            avgConfidence: parseFloat((avgConfidence * 100).toFixed(0)),
            discoveryRate: parseFloat(
              ((validUrls.length / discoveredUrls.length) * 100).toFixed(1)
            ),
          },
        });

        await db
          .update(pricingScans)
          .set({
            currentStep: "URLs discovered, preparing to scrape",
            progressCurrent: 25,
            logs: logs,
            updatedAt: new Date(),
          })
          .where(eq(pricingScans.id, scanId));
      }

      // Only scrape products with cached URLs (no search mode)
      console.log(`[ScrapingService] Scraping ONLY ${productsWithUrl.length} products with URLs (skipping ${productsWithoutUrl.length} without URLs)`);

      // Route based on scraperType
      let result: {
        success: boolean;
        scrapedProducts: any[];
        productsScraped: number;
        productsFailed: number;
        errors: any[];
        metadata?: any;
      };

      if (competitor.scraperConfig.scraperType === 'scrapingbee') {
        // Use ScrapingBee API
        console.log(`[ScrapingService] ✅ Using ScrapingBee for ${competitor.name}`);
        console.log(`[ScrapingService] Products to scrape: ${productsWithUrl.length}`);
        console.log(`[ScrapingService] ScrapingBee config:`, JSON.stringify(competitor.scraperConfig.scrapingbee, null, 2));

        logs.push({
          timestamp: new Date().toISOString(),
          type: "info",
          message: `Using ScrapingBee API for ${competitor.name} (${productsWithUrl.length} products)`,
        });

        await db
          .update(pricingScans)
          .set({
            currentStep: `Scraping ${competitor.name} via ScrapingBee`,
            progressCurrent: 30,
            logs: logs,
            updatedAt: new Date(),
          })
          .where(eq(pricingScans.id, scanId));

        const scrapingBeeResult = await this.scrapeWithScrapingBee(competitor, productsWithUrl);

        console.log(`[ScrapingService] ScrapingBee result:`, {
          success: scrapingBeeResult.success,
          productsScraped: scrapingBeeResult.productsScraped,
          productsFailed: scrapingBeeResult.productsFailed,
          errorsCount: scrapingBeeResult.errors.length,
        });

        result = {
          ...scrapingBeeResult,
          metadata: {
            duration: 0,
            scraperType: 'scrapingbee',
            workerStatus: 'completed',
          },
        };
      } else {
        // Use Railway worker (Playwright)
        await db
          .update(pricingScans)
          .set({
            currentStep: `Scraping ${competitor.name} via Railway worker`,
            progressCurrent: 30,
            logs: logs,
            updatedAt: new Date(),
          })
          .where(eq(pricingScans.id, scanId));

        result = await this.workerClient.scrape({
          companyId: competitor.companyId,
          companySlug: competitor.companySlug,
          competitorId: competitor.id,
          competitorName: competitor.name,
          competitorUrl: competitor.websiteUrl,
          products: productsWithUrl, // ONLY products with URLs
          scraperConfig: competitor.scraperConfig, // NEW v3: Pass scraper configuration
        });
      }

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
   * @param companyId - Company ID
   * @param productId - Optional: if provided, scan only this specific product across all competitors
   */
  async scrapeAllCompetitors(companyId: string, productId?: string, skipDiscovery: boolean = false): Promise<{
    totalCompetitors: number;
    successfulScans: number;
    failedScans: number;
    totalProductsMatched: number;
    scans?: Array<{ scanId: string; competitorId: string }>;
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
    const scans: Array<{ scanId: string; competitorId: string }> = [];

    for (const competitor of activeCompetitors) {
      try {
        const result = await this.scrapeCompetitor(competitor.id, productId, skipDiscovery);
        successfulScans++;
        totalProductsMatched += result.productsMatched;
        scans.push({ scanId: result.scanId, competitorId: competitor.id });
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
      scans,
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

  /**
   * Scrape products using ScrapingBee API
   * @param competitor - Competitor configuration
   * @param products - Products to scrape with URLs
   * @returns Scraping result
   */
  private async scrapeWithScrapingBee(
    competitor: any,
    products: any[]
  ): Promise<{
    success: boolean;
    scrapedProducts: ScrapedProduct[];
    productsScraped: number;
    productsFailed: number;
    errors: ScrapingError[];
  }> {
    const axios = require('axios');
    const cheerio = require('cheerio');

    const scrapedProducts: ScrapedProduct[] = [];
    const errors: ScrapingError[] = [];
    const config = competitor.scraperConfig.scrapingbee;

    if (!process.env.SCRAPINGBEE_API_KEY) {
      throw new Error('SCRAPINGBEE_API_KEY not configured');
    }

    console.log(`[ScrapingBee] Starting scraping for ${products.length} products`);

    for (const product of products) {
      const startTime = Date.now();
      const productUrl = product.url;

      try {
        console.log(`[ScrapingBee] Scraping: ${productUrl}`);

        // Build ScrapingBee API request
        const params = new URLSearchParams({
          api_key: process.env.SCRAPINGBEE_API_KEY,
          url: productUrl,
          premium_proxy: config.api.premium_proxy.toString(),
          country_code: config.api.country_code,
          render_js: config.api.render_js.toString(),
          wait: config.api.wait.toString(),
          block_ads: config.api.block_ads.toString(),
          block_resources: config.api.block_resources.toString(),
        });

        if (config.api.wait_for) {
          params.append('wait_for', config.api.wait_for);
        }

        const response = await axios.get(
          `https://app.scrapingbee.com/api/v1/?${params.toString()}`,
          {
            timeout: config.api.timeout,
          }
        );

        const html = response.data;
        const creditsUsed = response.headers['spb-cost'];

        console.log(`[ScrapingBee] Response received (${creditsUsed} credits)`);

        // Check for Cloudflare challenge
        if (
          typeof html === 'string' &&
          (html.includes('Just a moment...') ||
            html.includes('Checking your browser') ||
            html.includes('Cloudflare'))
        ) {
          throw new Error('Cloudflare challenge detected - bypass failed');
        }

        // Parse HTML with Cheerio
        const $ = cheerio.load(html);

        // Extract product data using fallback selectors
        const name = this.extractWithFallback($, config.selectors.productName);
        const priceText = this.extractWithFallback($, config.selectors.productPrice);
        const sku = config.selectors.productSku
          ? this.extractWithFallback($, config.selectors.productSku)
          : null;
        const imageUrl = config.selectors.productImage
          ? this.extractImageWithFallback($, config.selectors.productImage)
          : null;

        const duration = Date.now() - startTime;
        console.log(`[ScrapingBee] Extraction completed in ${duration}ms`);

        // Validate and parse price
        if (!name || !priceText) {
          console.warn('[ScrapingBee] Missing required fields:', { name, priceText });
          errors.push({
            url: productUrl,
            error: 'Missing required fields (name or price)',
            timestamp: new Date(),
          });
          continue;
        }

        // Parse price from text (remove currency symbols, commas, etc.)
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        if (!priceMatch) {
          errors.push({
            url: productUrl,
            error: `Could not parse price from: ${priceText}`,
            timestamp: new Date(),
          });
          continue;
        }

        const price = parseFloat(priceMatch[0].replace(/,/g, ''));

        scrapedProducts.push({
          url: productUrl,
          name,
          sku: sku || undefined,
          price,
          currency: 'CAD',
          inStock: true,
          imageUrl: imageUrl || undefined,
        });

        console.log(`[ScrapingBee] ✅ Success: ${name} - $${price}`);
      } catch (error: any) {
        console.error('[ScrapingBee] Error:', error.message);
        errors.push({
          url: productUrl,
          error: error.message,
          timestamp: new Date(),
        });
      }
    }

    return {
      success: scrapedProducts.length > 0,
      scrapedProducts,
      productsScraped: scrapedProducts.length,
      productsFailed: errors.length,
      errors,
    };
  }

  /**
   * Extract text using fallback selectors
   */
  private extractWithFallback($: any, selectors: string[]): string | null {
    for (const selector of selectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          const text = element.text().trim();
          if (text) {
            return text;
          }
        }
      } catch (error) {
        console.warn(`[ScrapingBee] Selector failed: ${selector}`);
      }
    }
    return null;
  }

  /**
   * Extract image src using fallback selectors
   */
  private extractImageWithFallback($: any, selectors: string[]): string | null {
    for (const selector of selectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          const src = element.attr('src') || element.attr('data-src');
          if (src) {
            return src;
          }
        }
      } catch (error) {
        console.warn(`[ScrapingBee] Image selector failed: ${selector}`);
      }
    }
    return null;
  }
}
