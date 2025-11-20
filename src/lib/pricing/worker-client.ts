import { z } from 'zod';

// ============================================================================
// Types & Validation
// ============================================================================

const ScrapedProductSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  sku: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().default('CAD'),
  inStock: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
  characteristics: z.record(z.any()).optional(),
});

const ScrapeRequestSchema = z.object({
  companyId: z.string(),
  companySlug: z.string(),
  competitorId: z.string(),
  competitorName: z.string(),
  competitorUrl: z.string().url(),
  products: z.array(z.object({
    id: z.string(),
    sku: z.string(),
    name: z.string(),
    brand: z.string().nullable(),
    category: z.string().nullable(),
  })),
  // NEW v2: Batch info for pagination
  batchInfo: z.object({
    batchNumber: z.number(),
    totalBatches: z.number(),
  }).optional(),
  // NEW v3: Scraper configuration from database
  scraperConfig: z.any(),
});

const ScrapeResponseSchema = z.object({
  success: z.boolean(),
  scrapedProducts: z.array(ScrapedProductSchema),
  productsScraped: z.number(),
  productsFailed: z.number(),
  errors: z.array(z.object({
    url: z.string(),
    error: z.string(),
    timestamp: z.string(),
  })),
  metadata: z.object({
    duration: z.number(), // milliseconds
    scraperType: z.enum(['playwright', 'apify', 'api']),
    workerStatus: z.enum(['UP', 'DOWN']).optional(), // NEW v2
  }),
});

export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>;
export type ScrapeResponse = z.infer<typeof ScrapeResponseSchema>;
export type ScrapedProduct = z.infer<typeof ScrapedProductSchema>;

// ============================================================================
// Worker Client
// ============================================================================

export class WorkerClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;

  constructor() {
    this.baseUrl = process.env.RAILWAY_WORKER_URL || 'http://localhost:3001';
    this.apiKey = process.env.RAILWAY_WORKER_API_KEY || '';
    this.timeout = 1800000; // 30 minutes (safe for 576 products)
    this.maxRetries = 2; // Retry failed requests
  }

  /**
   * Trigger scraping job on Railway worker
   * NEW v2: Automatic pagination if >100 products
   */
  async scrape(request: ScrapeRequest): Promise<ScrapeResponse> {
    const BATCH_SIZE = 100;

    // Pagination logic (NEW v2)
    if (request.products.length > BATCH_SIZE) {
      console.log(`[WorkerClient] Paginating ${request.products.length} products into batches of ${BATCH_SIZE}`);

      const allResults: ScrapedProduct[] = [];
      const allErrors: any[] = [];
      let totalScraped = 0;
      let totalFailed = 0;

      const totalBatches = Math.ceil(request.products.length / BATCH_SIZE);

      for (let i = 0; i < request.products.length; i += BATCH_SIZE) {
        const batch = request.products.slice(i, i + BATCH_SIZE);
        const batchNumber = i / BATCH_SIZE;

        console.log(`[WorkerClient] Processing batch ${batchNumber + 1}/${totalBatches}`);

        const batchRequest = {
          ...request,
          products: batch,
          batchInfo: {
            batchNumber,
            totalBatches,
          },
        };

        const batchResult = await this.scrapeInternal(batchRequest);

        allResults.push(...batchResult.scrapedProducts);
        allErrors.push(...batchResult.errors);
        totalScraped += batchResult.productsScraped;
        totalFailed += batchResult.productsFailed;
      }

      return {
        success: true,
        scrapedProducts: allResults,
        productsScraped: totalScraped,
        productsFailed: totalFailed,
        errors: allErrors,
        metadata: {
          duration: 0, // Aggregated duration not tracked
          scraperType: 'playwright',
        },
      };
    } else {
      return this.scrapeInternal(request);
    }
  }

  /**
   * Internal scrape method (single batch)
   * NEW v2: Retry logic + graceful error handling
   */
  private async scrapeInternal(request: ScrapeRequest, retryCount = 0): Promise<ScrapeResponse> {
    console.log(`[WorkerClient] Calling Railway worker for ${request.competitorName}`);
    console.log(`[WorkerClient] Products to scrape: ${request.products.length}`);

    // Validate request
    const validatedRequest = ScrapeRequestSchema.parse(request);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(validatedRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Railway worker error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      // Validate response
      const validatedResponse = ScrapeResponseSchema.parse(data);

      console.log(`[WorkerClient] Success! Scraped ${validatedResponse.productsScraped} products`);
      console.log(`[WorkerClient] Duration: ${validatedResponse.metadata.duration}ms`);

      return validatedResponse;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`[WorkerClient] Timeout after ${this.timeout}ms`);
      }

      // NEW v2: Retry logic
      if (retryCount < this.maxRetries) {
        console.log(`[WorkerClient] Retrying (${retryCount + 1}/${this.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return this.scrapeInternal(request, retryCount + 1);
      }

      console.error('[WorkerClient] Error calling Railway worker:', error);

      // NEW v2: Return graceful error response instead of throwing
      return {
        success: false,
        scrapedProducts: [],
        productsScraped: 0,
        productsFailed: request.products.length,
        errors: [{
          url: 'WORKER_ERROR',
          error: error.message,
          timestamp: new Date().toISOString(),
        }],
        metadata: {
          duration: 0,
          scraperType: 'playwright',
          workerStatus: 'DOWN',
        },
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'X-API-Key': this.apiKey },
        signal: AbortSignal.timeout(5000), // 5s timeout
      });
      return response.ok;
    } catch (error) {
      console.error('[WorkerClient] Health check failed:', error);
      return false;
    }
  }
}
