# Architecture Multi-Tenant Pricing Intelligence avec Railway Worker

**Date**: 2025-01-19
**Version**: 1.0
**Auteur**: Architecture Technique - Module Pricing
**Status**: ✅ Plan Approuvé - Prêt pour Implémentation

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Contexte et Problématique](#contexte-et-problématique)
3. [Architecture Proposée](#architecture-proposée)
4. [Composants Détaillés](#composants-détaillés)
5. [Flux de Données](#flux-de-données)
6. [Implémentation Technique](#implémentation-technique)
7. [Déploiement Railway](#déploiement-railway)
8. [Migration depuis Mock Data](#migration-depuis-mock-data)
9. [Tests et Validation](#tests-et-validation)
10. [Coûts et Performance](#coûts-et-performance)
11. [Roadmap](#roadmap)

---

## 🎯 Vue d'Ensemble

### Objectif

Créer une **architecture multi-tenant flexible** permettant:
- ✅ Des **scrapers Playwright personnalisés par client** (Dissan, Akonovia, etc.)
- ✅ **Pas de limitations Vercel** (timeout, taille, environnement)
- ✅ **Interface unifiée** dans l'application Next.js
- ✅ **Format de données standardisé** pour tous les clients
- ✅ **Réutilisation du code Dissan existant** (13 scrapers Playwright)

### Solution

**Architecture hybride** avec worker externe:
```
Next.js (Vercel)  →  Railway Worker (Playwright)  →  PostgreSQL
     UI/API            Scraping Engine                Database
```

---

## 🔍 Contexte et Problématique

### Problème Initial

**Vercel Serverless Functions ne supportent PAS Playwright** à cause de:

1. **Limite de taille**: 50 MB (Playwright + Chromium = 200 MB)
2. **Timeout**: 10s (hobby), 300s max (pro) - pas assez pour scraper 500+ produits
3. **Environnement read-only**: Impossible d'installer binaires Chromium
4. **Cold starts**: Chaque invocation redémarre tout

### Architecture Actuelle

```typescript
// src/lib/pricing/scraping-service.ts - ligne 274
private async executeScraping() {
  // TODO: Integrate with real scraper from /Dissan/price-scraper
  // For now, simulate scraping with mock data

  const mockProducts: ScrapedProduct[] = [
    { url: "...", name: "Mock Product 1", price: 9.99, ... }
  ];

  return { success: true, scrapedProducts: mockProducts };
}
```

**Problème**: Mock data ne scrappe pas les vrais sites concurrents.

### Ce que nous avons déjà

1. ✅ **Code Dissan Playwright fonctionnel** (`/Dissan/price-scraper`)
   - 13 scrapers implémentés (Swish, Grainger, Uline, etc.)
   - Architecture mature (base class, retry, checkpoints)
   - 576 produits × 13 concurrents testés

2. ✅ **ScrapingService en place** (`src/lib/pricing/scraping-service.ts`)
   - Workflow complet (scan → scrape → match → save)
   - MatchingService GPT-5 fonctionnel
   - UI dashboard prête

3. ✅ **Database schema** (`pricing_scans`, `pricing_matches`)

**Missing Link**: Connecter le scraper Playwright au ScrapingService.

---

## 🏗️ Architecture Proposée

### Diagramme Global

```
┌──────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP (VERCEL)                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  UI Dashboard (React)                                      │  │
│  │  - /companies/[slug]/pricing                               │  │
│  │  - Products List                                           │  │
│  │  - Product Detail Page                                     │  │
│  │  - "Lancer scan" button                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  API Routes                                                │  │
│  │  POST /api/companies/[slug]/pricing/scans                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ScrapingService                                           │  │
│  │  - scrapeCompetitor(competitorId)                         │  │
│  │  - executeScraping() ← MODIFIED HERE                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  WorkerClient (NEW)                                        │  │
│  │  - HTTP client to call Railway worker                     │  │
│  │  - POST https://worker.railway.app/api/scrape             │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               │ HTTPS Request
                               │ { competitorId, companyId, products[] }
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│               RAILWAY WORKER (Node.js + Playwright)              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Express Server                                            │  │
│  │  POST /api/scrape                                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ScraperFactory                                            │  │
│  │  - getScraperForCompany(companySlug)                      │  │
│  │  - Returns: DissanScraper | AkonoviaScraper | ...         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  DissanScraper extends BasePlaywrightScraper               │  │
│  │  - Code from /Dissan/price-scraper (reused)               │  │
│  │  - scrapeCompetitor(competitor, products)                  │  │
│  │  - Returns: ScrapedProduct[]                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Playwright Browser                                        │  │
│  │  - Chromium (headless)                                     │  │
│  │  - Scrapes competitor websites                             │  │
│  │  - SKU matching, name matching                             │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               │ HTTP Response
                               │ { success, scrapedProducts[] }
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP (VERCEL)                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  MatchingService (GPT-5)                                   │  │
│  │  - matchProducts(scrapedProducts)                          │  │
│  │  - AI matching with confidence scores                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Vercel Postgres)                              │  │
│  │  - pricing_scans                                           │  │
│  │  - pricing_matches                                         │  │
│  │  - pricing_products                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Principes Clés

1. **Séparation des responsabilités**
   - Next.js: UI, API, business logic, AI matching
   - Railway: Heavy compute (Playwright scraping)

2. **Interface contractuelle**
   - HTTP API avec types stricts (Zod validation)
   - Format de données standardisé `ScrapedProduct[]`

3. **Flexibilité multi-tenant**
   - Chaque client peut avoir son scraper (Playwright, Apify, API)
   - ScraperFactory sélectionne dynamiquement

4. **Pas de changement UI**
   - L'utilisateur voit la même interface
   - Migration transparente depuis mock data

---

## 🔧 Composants Détaillés

### 1. WorkerClient (Nouveau - Next.js)

**Fichier**: `src/lib/pricing/worker-client.ts`

```typescript
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
});

const ScrapeResponseSchema = z.object({
  success: z.boolean(),
  scrapedProducts: z.array(ScrapedProductSchema),
  productsScraped: z.number(),
  productsFailed: z.number(),
  errors: z.array(z.object({
    url: z.string(),
    error: z.string(),
    timestamp: z.date(),
  })),
  metadata: z.object({
    duration: z.number(), // milliseconds
    scraperType: z.enum(['playwright', 'apify', 'api']),
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

  constructor() {
    this.baseUrl = process.env.RAILWAY_WORKER_URL || 'http://localhost:3001';
    this.apiKey = process.env.RAILWAY_WORKER_API_KEY || '';
    this.timeout = 600000; // 10 minutes (enough for large scans)
  }

  /**
   * Trigger scraping job on Railway worker
   */
  async scrape(request: ScrapeRequest): Promise<ScrapeResponse> {
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
        throw new Error(`Railway worker timeout after ${this.timeout}ms`);
      }

      console.error('[WorkerClient] Error calling Railway worker:', error);
      throw error;
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
      });
      return response.ok;
    } catch (error) {
      console.error('[WorkerClient] Health check failed:', error);
      return false;
    }
  }
}
```

### 2. ScrapingService Modifié

**Fichier**: `src/lib/pricing/scraping-service.ts` (ligne 242-339)

```typescript
import { WorkerClient, ScrapedProduct } from './worker-client';

export class ScrapingService {
  private matchingService: MatchingService;
  private workerClient: WorkerClient; // NEW

  constructor() {
    this.matchingService = new MatchingService();
    this.workerClient = new WorkerClient(); // NEW
  }

  /**
   * Execute the actual scraping logic
   * MODIFIED: Calls Railway worker instead of mock data
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
        type: 'info',
        message: `Calling Railway worker for ${competitor.name}`,
      });

      await db
        .update(pricingScans)
        .set({
          currentStep: 'Fetching products from Railway worker',
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

      // Call Railway worker
      const result = await this.workerClient.scrape({
        companyId: competitor.companyId,
        companySlug: competitor.companySlug, // Need to add this to competitor table
        competitorId: competitor.id,
        competitorName: competitor.name,
        competitorUrl: competitor.websiteUrl,
        products: activeProducts,
      });

      logs.push({
        timestamp: new Date().toISOString(),
        type: 'success',
        message: `Railway worker completed: ${result.productsScraped} products scraped`,
        metadata: {
          productsFound: result.productsScraped,
          duration: result.metadata.duration,
          scraperType: result.metadata.scraperType,
        },
      });

      await db
        .update(pricingScans)
        .set({
          currentStep: 'Processing scraped data',
          progressCurrent: 80,
          productsScraped: result.productsScraped,
          logs: logs,
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      return {
        success: result.success,
        scrapedProducts: result.scrapedProducts,
        productsScraped: result.productsScraped,
        productsFailed: result.productsFailed,
        errors: result.errors,
      };
    } catch (error: any) {
      const scrapingError: ScrapingError = {
        url: competitor.websiteUrl,
        error: error.message,
        timestamp: new Date(),
      };

      logs.push({
        timestamp: new Date().toISOString(),
        type: 'error',
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
}
```

### 3. Railway Worker - Express Server

**Fichier**: `worker/src/index.ts`

```typescript
import express from 'express';
import { z } from 'zod';
import { ScraperFactory } from './scrapers/factory';
import { ScrapeRequestSchema, ScrapeResponseSchema } from './types';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Auth middleware
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main scraping endpoint
app.post('/api/scrape', async (req, res) => {
  const startTime = Date.now();

  try {
    console.log('[Worker] Received scrape request');

    // Validate request
    const request = ScrapeRequestSchema.parse(req.body);

    console.log(`[Worker] Company: ${request.companySlug}`);
    console.log(`[Worker] Competitor: ${request.competitorName}`);
    console.log(`[Worker] Products: ${request.products.length}`);

    // Get appropriate scraper
    const scraper = ScraperFactory.getScraperForCompany(request.companySlug);

    console.log(`[Worker] Using scraper: ${scraper.constructor.name}`);

    // Execute scraping
    const result = await scraper.scrapeCompetitor({
      competitorId: request.competitorId,
      competitorName: request.competitorName,
      competitorUrl: request.competitorUrl,
      products: request.products,
    });

    const duration = Date.now() - startTime;

    // Build response
    const response = {
      success: true,
      scrapedProducts: result.scrapedProducts,
      productsScraped: result.productsScraped,
      productsFailed: result.productsFailed,
      errors: result.errors,
      metadata: {
        duration,
        scraperType: scraper.scraperType,
      },
    };

    console.log(`[Worker] Scraping completed in ${duration}ms`);
    console.log(`[Worker] Products scraped: ${result.productsScraped}`);

    res.json(response);
  } catch (error: any) {
    console.error('[Worker] Error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Worker] Server listening on port ${PORT}`);
  console.log(`[Worker] Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

### 4. ScraperFactory

**Fichier**: `worker/src/scrapers/factory.ts`

```typescript
import { ICompetitorScraper } from '../types/scraper-interface';
import { DissanScraper } from './dissan-scraper';
// Future: import { AkonoviaScraper } from './akonovia-scraper';

/**
 * Registry mapping company slugs to scraper classes
 */
const SCRAPER_REGISTRY: Record<string, new () => ICompetitorScraper> = {
  'dissan': DissanScraper,
  // Future:
  // 'akonovia': AkonoviaScraper,
  // 'default': DefaultScraper,
};

export class ScraperFactory {
  /**
   * Get appropriate scraper for a company
   */
  static getScraperForCompany(companySlug: string): ICompetitorScraper {
    const ScraperClass = SCRAPER_REGISTRY[companySlug];

    if (!ScraperClass) {
      throw new Error(
        `No scraper registered for company: ${companySlug}. ` +
        `Available: ${Object.keys(SCRAPER_REGISTRY).join(', ')}`
      );
    }

    return new ScraperClass();
  }

  /**
   * Register a new scraper
   */
  static register(companySlug: string, scraperClass: new () => ICompetitorScraper) {
    SCRAPER_REGISTRY[companySlug] = scraperClass;
    console.log(`[ScraperFactory] Registered scraper for: ${companySlug}`);
  }
}
```

### 5. DissanScraper (Railway Worker)

**Fichier**: `worker/src/scrapers/dissan-scraper.ts`

```typescript
import { ICompetitorScraper, ScrapeCompetitorRequest, ScrapeCompetitorResponse } from '../types/scraper-interface';
import { chromium } from 'playwright';

/**
 * Dissan-specific Playwright scraper
 * Reuses code from /Dissan/price-scraper
 */
export class DissanScraper implements ICompetitorScraper {
  scraperType = 'playwright' as const;

  async scrapeCompetitor(request: ScrapeCompetitorRequest): Promise<ScrapeCompetitorResponse> {
    console.log(`[DissanScraper] Starting scrape for ${request.competitorName}`);

    // TODO: Import and adapt code from /Dissan/price-scraper
    // For now, simplified implementation

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    const scrapedProducts: any[] = [];
    const errors: any[] = [];

    try {
      // Example: Navigate to competitor search
      await page.goto(request.competitorUrl, { timeout: 30000 });

      // Loop through products to scrape
      for (const product of request.products) {
        try {
          // Search by SKU
          const searchUrl = `${request.competitorUrl}/search?q=${encodeURIComponent(product.sku)}`;
          await page.goto(searchUrl, { timeout: 15000 });

          // Extract price (competitor-specific selectors)
          const priceElement = await page.$('.price'); // Example selector
          if (priceElement) {
            const priceText = await priceElement.textContent();
            const price = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');

            scrapedProducts.push({
              url: page.url(),
              name: product.name,
              sku: product.sku,
              price,
              currency: 'CAD',
              inStock: true,
            });
          }
        } catch (productError: any) {
          errors.push({
            url: `${request.competitorUrl}/search?q=${product.sku}`,
            error: productError.message,
            timestamp: new Date(),
          });
        }
      }
    } finally {
      await browser.close();
    }

    console.log(`[DissanScraper] Completed: ${scrapedProducts.length} products found`);

    return {
      scrapedProducts,
      productsScraped: scrapedProducts.length,
      productsFailed: errors.length,
      errors,
    };
  }
}
```

---

## 🔄 Flux de Données

### Séquence Complète: User Click → Results Displayed

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Lancer scan" button                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Frontend calls POST /api/companies/dissan/pricing/scans         │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. ScrapingService.scrapeAllCompetitors(companyId)                 │
│    - Fetches active competitors from DB                             │
│    - For each competitor: scrapeCompetitor(competitorId)            │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. ScrapingService.executeScraping(competitor, scanId, logs)       │
│    - Fetches active products from pricingProducts table             │
│    - Calls WorkerClient.scrape(request)                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. WorkerClient sends HTTP POST to Railway                         │
│    POST https://worker.railway.app/api/scrape                       │
│    Body: { companyId, competitorId, products[] }                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. Railway Worker receives request                                 │
│    - Validates request (Zod)                                        │
│    - ScraperFactory.getScraperForCompany('dissan')                  │
│    - Returns DissanScraper instance                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 7. DissanScraper.scrapeCompetitor(request)                         │
│    - Launches Playwright browser                                    │
│    - For each product:                                              │
│      • Navigate to competitor search                                │
│      • Extract price, SKU, name                                     │
│      • Save to scrapedProducts[]                                    │
│    - Close browser                                                  │
│    - Return { scrapedProducts, productsScraped, errors }            │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 8. Railway Worker responds                                         │
│    HTTP 200 { success, scrapedProducts[], metadata }                │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 9. WorkerClient receives response                                  │
│    - Validates response (Zod)                                       │
│    - Returns to ScrapingService                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 10. ScrapingService calls MatchingService                          │
│     - matchProducts(scrapedProducts)                                 │
│     - GPT-5 matches competitor products with your catalog            │
│     - Saves matches to pricing_matches table                         │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 11. ScrapingService updates pricingScans                           │
│     - status: 'completed'                                            │
│     - productsScraped: N                                             │
│     - productsMatched: M                                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 12. Frontend receives success response                             │
│     - Shows alert "Scan lancé avec succès!"                          │
│     - Refreshes matches via GET /api/pricing/matches                 │
│     - Displays competitor cards with prices                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Temps estimé total**:
- 100 produits: ~5 minutes
- 576 produits (Dissan): ~30 minutes

---

## 🚀 Implémentation Technique

### Phase 1: Setup Railway Worker (2-3 heures)

#### Étape 1.1: Créer structure worker

```bash
mkdir -p worker/src/{scrapers,types,utils}
cd worker
npm init -y
```

#### Étape 1.2: Installer dépendances

```bash
npm install express playwright zod dotenv
npm install -D @types/express @types/node typescript tsx
```

#### Étape 1.3: package.json

```json
{
  "name": "pricing-worker",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "echo \"No tests yet\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "playwright": "^1.40.0",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

#### Étape 1.4: tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Étape 1.5: Copier code Dissan

```bash
# Copier les scrapers Dissan dans worker
cp -r /Dissan/price-scraper/src/scrapers worker/src/scrapers/dissan/
cp -r /Dissan/price-scraper/src/matchers worker/src/matchers/
cp -r /Dissan/price-scraper/src/utils worker/src/utils/
```

### Phase 2: Déployer sur Railway (1 heure)

#### Étape 2.1: Installer Railway CLI

```bash
npm i -g @railway/cli
railway login
```

#### Étape 2.2: Créer projet Railway

```bash
cd worker
railway init
railway up
```

#### Étape 2.3: Configurer variables d'environnement

```bash
railway variables set API_KEY=your-secret-api-key-here
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}  # Shared DB
```

#### Étape 2.4: railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepAfter": "300s",
    "restartPolicyType": "ON_FAILURE",
    "startCommand": "npm start"
  }
}
```

#### Étape 2.5: Obtenir URL Railway

```bash
railway domain
# Output: https://pricing-worker-production.up.railway.app
```

### Phase 3: Modifier Next.js (1-2 heures)

#### Étape 3.1: Créer WorkerClient

Créer fichier `src/lib/pricing/worker-client.ts` (voir code ci-dessus)

#### Étape 3.2: Modifier ScrapingService

Remplacer méthode `executeScraping()` (voir code ci-dessus)

#### Étape 3.3: Ajouter variables d'environnement Vercel

```bash
# .env.local
RAILWAY_WORKER_URL=https://pricing-worker-production.up.railway.app
RAILWAY_WORKER_API_KEY=your-secret-api-key-here
```

Puis dans Vercel dashboard:
- Settings → Environment Variables
- Ajouter `RAILWAY_WORKER_URL` et `RAILWAY_WORKER_API_KEY`

### Phase 4: Tests (2 heures)

#### Test 1: Health check

```bash
curl -H "X-API-Key: your-api-key" \
  https://pricing-worker-production.up.railway.app/health
```

#### Test 2: Scrape 10 produits

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  https://pricing-worker-production.up.railway.app/api/scrape \
  -d '{
    "companyId": "xxx",
    "companySlug": "dissan",
    "competitorId": "yyy",
    "competitorName": "Swish",
    "competitorUrl": "https://swish.ca",
    "products": [...]
  }'
```

#### Test 3: End-to-end depuis UI

1. Login à l'application
2. Aller sur `/companies/dissan/pricing`
3. Cliquer "Lancer scan"
4. Vérifier logs Railway: `railway logs`
5. Vérifier résultats dans UI

---

## 📊 Coûts et Performance

### Coûts Railway

**Free Tier**: $5 crédit/mois

**Estimation Dissan**:
- 576 produits × 13 concurrents = 7,488 produits
- ~3 secondes/produit = 6.24 heures de compute
- Coût: ~$0.002/jour = **$0.06/mois**

**Avec $5 gratuit** = **83 mois** d'utilisation Dissan ✅

### Performance

**Scraping**:
- 100 produits: ~5 minutes
- 500 produits: ~25 minutes
- 1000 produits: ~50 minutes

**Matching GPT-5**:
- 100 produits: ~2 minutes
- 500 produits: ~10 minutes

**Total (100 produits)**: ~7 minutes end-to-end

---

## 🛣️ Roadmap

### Phase 1: MVP (Semaine 1-2)
- ✅ Setup Railway worker
- ✅ Migrer code Dissan
- ✅ Modifier ScrapingService
- ✅ Tests avec 10-50 produits

### Phase 2: Production (Semaine 3-4)
- ✅ Tests avec 576 produits Dissan complets
- ✅ Monitoring et logs Railway
- ✅ Error handling robuste
- ✅ Deploy en production

### Phase 3: Multi-Tenant (Semaine 5-6)
- 🔲 Table `pricing_scraper_configs`
- 🔲 ScraperFactory dynamique (config DB)
- 🔲 Akonovia scraper (client 2)
- 🔲 Admin UI pour configurer scrapers

### Phase 4: Optimisations (Futur)
- 🔲 Queue system (BullMQ)
- 🔲 Parallel scraping (multiple browsers)
- 🔲 Caching intelligent
- 🔲 Rate limiting par concurrent
- 🔲 Retry avec exponential backoff

---

## ✅ Checklist Implémentation

### Railway Worker
- [ ] Créer répertoire `/worker`
- [ ] Installer dépendances (Express, Playwright)
- [ ] Créer `src/index.ts` (Express server)
- [ ] Créer `src/scrapers/factory.ts`
- [ ] Copier code Dissan dans `src/scrapers/dissan/`
- [ ] Créer types (`scraper-interface.ts`)
- [ ] Tester localement (`npm run dev`)
- [ ] Déployer sur Railway (`railway up`)
- [ ] Configurer variables env Railway
- [ ] Tester health check

### Next.js
- [ ] Créer `src/lib/pricing/worker-client.ts`
- [ ] Modifier `src/lib/pricing/scraping-service.ts`
- [ ] Ajouter env vars Vercel (`RAILWAY_WORKER_URL`, `API_KEY`)
- [ ] Tester en local avec worker Railway
- [ ] Deploy Vercel
- [ ] Test end-to-end production

### Tests
- [ ] Test health check worker
- [ ] Test scraping 10 produits
- [ ] Test scraping 100 produits
- [ ] Test scraping 576 produits (Dissan full)
- [ ] Test error handling (timeout, invalid data)
- [ ] Test UI: click "Lancer scan" → voir résultats

---

## 🎓 Conclusion

Cette architecture permet:

✅ **Playwright fonctionne** - Plus de limitations Vercel
✅ **Code Dissan réutilisé** - 13 scrapers déjà testés
✅ **Multi-tenant ready** - Facile d'ajouter nouveaux clients
✅ **Interface unifiée** - UI/API inchangées
✅ **Coût minimal** - $5 gratuit = des mois d'utilisation
✅ **Scalable** - Railway peut scaler automatiquement

**Next Step**: Implémenter Phase 1 (Setup Railway Worker)
