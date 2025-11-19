# Architecture Multi-Tenant Pricing Intelligence avec Railway Worker - v2

**Date**: 2025-01-19
**Version**: 2.0 (Révisée - Production Ready)
**Auteur**: Architecture Technique - Module Pricing
**Status**: ✅ Plan Validé - Corrections Critiques Intégrées
**Révision**: Corrections post-revue architecturale

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Changelog v2](#changelog-v2)
3. [Contexte et Problématique](#contexte-et-problématique)
4. [Architecture Proposée](#architecture-proposée)
5. [Phase 0: Préparation Database](#phase-0-préparation-database)
6. [Composants Détaillés](#composants-détaillés)
7. [Sécurité & Authentification](#sécurité--authentification)
8. [Monitoring & Observabilité](#monitoring--observabilité)
9. [Gestion des Risques](#gestion-des-risques)
10. [Flux de Données](#flux-de-données)
11. [Implémentation Technique](#implémentation-technique)
12. [Déploiement Railway](#déploiement-railway)
13. [Tests et Validation](#tests-et-validation)
14. [Coûts et Performance](#coûts-et-performance)
15. [Roadmap](#roadmap)
16. [Checklist Implémentation](#checklist-implémentation)

---

## 🎯 Vue d'Ensemble

### Objectif

Créer une **architecture multi-tenant production-ready** permettant:
- ✅ Des **scrapers Playwright personnalisés par client** (Dissan, Akonovia, etc.)
- ✅ **Pas de limitations Vercel** (timeout, taille, environnement)
- ✅ **Interface unifiée** dans l'application Next.js
- ✅ **Format de données standardisé** pour tous les clients
- ✅ **Réutilisation du code Dissan existant** (13 scrapers Playwright)
- ✅ **Monitoring et observabilité** intégrés (Sentry, logs structurés)
- ✅ **Sécurité renforcée** (rate limiting, IP whitelist)
- ✅ **Gestion d'erreurs robuste** (circuit breaker, retry, checkpointing)

### Solution

**Architecture hybride** avec worker externe:
```
Next.js (Vercel)  →  Railway Worker (Playwright)  →  PostgreSQL
     UI/API            Scraping Engine                Database
```

**Note Importante**: Cette v2 intègre des **corrections critiques** identifiées lors de la revue architecturale, notamment le batching logic (1 appel Railway = 1 concurrent, pas tous les concurrents).

---

## 📝 Changelog v2

### Corrections Critiques

#### 1. **Architecture de Batching (CORRIGÉ)**
- ❌ **v1**: 1 call Railway = TOUS les concurrents (impossible avec timeout)
- ✅ **v2**: 1 call Railway = 1 concurrent, avec pagination si >100 produits

#### 2. **Database Schema (AJOUTÉ)**
- 🆕 Migration SQL pour ajouter `company_slug` à `pricing_competitors`
- 🆕 Phase 0 dédiée à la préparation database

#### 3. **Sécurité (AJOUTÉ)**
- 🆕 Section complète: Rate limiting, IP whitelist, JWT tokens
- 🆕 Code samples pour express-rate-limit

#### 4. **Monitoring (AJOUTÉ)**
- 🆕 Structured logging avec Pino
- 🆕 Error tracking avec Sentry
- 🆕 Metrics endpoint pour Railway

#### 5. **Gestion des Risques (AJOUTÉ)**
- 🆕 Circuit breaker pattern
- 🆕 Timeout management strategy
- 🆕 Checkpointing pour recovery

#### 6. **Coûts Révisés (CORRIGÉ)**
- ❌ **v1**: $0.06/mois (calcul incorrect)
- ✅ **v2**: $0.69/mois (calcul réaliste: 6.24h/scan × 4 scans/mois)

#### 7. **Roadmap Révisée (AMÉLIORÉE)**
- 🆕 Phase 0: Migration database (0.5h)
- 🆕 Phase 1.5: Batching logic (1h)
- 🔄 Temps estimés réalistes: MVP = 8h (au lieu de 6h)

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
│  │  - scrapeAllCompetitors(companyId)                        │  │
│  │  - scrapeCompetitor(competitorId) ← LOOP PER COMPETITOR   │  │
│  │  - executeScraping() ← MODIFIED HERE                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  WorkerClient (NEW)                                        │  │
│  │  - scrape(competitorId, products[])                       │  │
│  │  - POST https://worker.railway.app/api/scrape             │  │
│  │  - Pagination if products.length > 100                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               │ HTTPS Request (PER COMPETITOR)
                               │ { competitorId, products[0..100] }
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│               RAILWAY WORKER (Node.js + Playwright)              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Express Server + Middleware                               │  │
│  │  - Rate Limiting (100 req/15min per IP)                   │  │
│  │  - API Key validation                                      │  │
│  │  - Structured Logging (Pino)                               │  │
│  │  - Error Tracking (Sentry)                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  POST /api/scrape                                          │  │
│  │  - Validates request (Zod)                                 │  │
│  │  - Logs to Sentry transaction                              │  │
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
│  │  - scrapeCompetitor(competitor, products[])                │  │
│  │  - Returns: ScrapedProduct[]                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Playwright Browser                                        │  │
│  │  - Chromium (headless)                                     │  │
│  │  - Scrapes competitor website                              │  │
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
│  │  - pricing_competitors (with company_slug)                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Principes Clés

1. **Séparation des responsabilités**
   - Next.js: UI, API, business logic, AI matching
   - Railway: Heavy compute (Playwright scraping)

2. **Scraping séquentiel par concurrent** (CORRECTION v2)
   - ✅ 1 appel Railway = 1 concurrent
   - ✅ Loop SÉQUENTIEL dans `scrapeAllCompetitors()`
   - ✅ Pagination automatique si >100 produits/concurrent

3. **Interface contractuelle**
   - HTTP API avec types stricts (Zod validation)
   - Format de données standardisé `ScrapedProduct[]`

4. **Flexibilité multi-tenant**
   - Chaque client peut avoir son scraper (Playwright, Apify, API)
   - ScraperFactory sélectionne dynamiquement

5. **Observabilité intégrée** (NOUVEAU v2)
   - Structured logging (Pino)
   - Error tracking (Sentry)
   - Metrics endpoint (/metrics)

6. **Sécurité renforcée** (NOUVEAU v2)
   - Rate limiting
   - IP whitelist
   - API Key validation

---

## 🗄️ Phase 0: Préparation Database

### ⚠️ CRITIQUE: Migration `company_slug`

**Problème**: Le schema `pricing_competitors` n'a pas de champ `company_slug`, mais le Railway worker en a besoin pour sélectionner le bon scraper via `ScraperFactory`.

**Solution**: Migration SQL AVANT toute implémentation.

#### Migration SQL

```sql
-- migrations/0015_add_company_slug_to_competitors.sql

-- 1. Add column (nullable initially)
ALTER TABLE pricing_competitors
ADD COLUMN company_slug VARCHAR(255);

-- 2. Populate from companies table
UPDATE pricing_competitors pc
SET company_slug = c.slug
FROM companies c
WHERE pc.company_id = c.id;

-- 3. Verify all rows have value
SELECT COUNT(*) FROM pricing_competitors WHERE company_slug IS NULL;
-- Should return 0

-- 4. Make it NOT NULL
ALTER TABLE pricing_competitors
ALTER COLUMN company_slug SET NOT NULL;

-- 5. Add index for performance
CREATE INDEX idx_pricing_competitors_company_slug
ON pricing_competitors(company_slug);

-- 6. Verify
SELECT
  pc.id,
  pc.name AS competitor_name,
  pc.company_slug,
  c.slug AS company_slug_from_join
FROM pricing_competitors pc
INNER JOIN companies c ON pc.company_id = c.id
LIMIT 5;
```

#### Script Node.js pour Migration

```javascript
// scripts/run-migration-0015.mjs
import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🔄 Running migration: Add company_slug to pricing_competitors');

  try {
    // 1. Add column
    await db.execute(sql`
      ALTER TABLE pricing_competitors
      ADD COLUMN IF NOT EXISTS company_slug VARCHAR(255)
    `);
    console.log('✅ Column added');

    // 2. Populate
    await db.execute(sql`
      UPDATE pricing_competitors pc
      SET company_slug = c.slug
      FROM companies c
      WHERE pc.company_id = c.id
      AND pc.company_slug IS NULL
    `);
    console.log('✅ Data populated');

    // 3. Verify
    const nullCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM pricing_competitors
      WHERE company_slug IS NULL
    `);

    if (nullCount.rows[0].count > 0) {
      throw new Error(`Found ${nullCount.rows[0].count} rows with NULL company_slug`);
    }
    console.log('✅ No NULL values');

    // 4. Make NOT NULL
    await db.execute(sql`
      ALTER TABLE pricing_competitors
      ALTER COLUMN company_slug SET NOT NULL
    `);
    console.log('✅ Column set to NOT NULL');

    // 5. Add index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_pricing_competitors_company_slug
      ON pricing_competitors(company_slug)
    `);
    console.log('✅ Index created');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

#### Exécution

```bash
# Dev
npm run db:generate
npm run db:migrate

# Production (Vercel)
node scripts/run-migration-0015.mjs
```

**⏱️ Durée estimée**: 30 minutes (inclus tests)

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
  // NEW v2: Batch info for pagination
  batchInfo: z.object({
    batchNumber: z.number(),
    totalBatches: z.number(),
  }).optional(),
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
  private maxRetries: number; // NEW v2

  constructor() {
    this.baseUrl = process.env.RAILWAY_WORKER_URL || 'http://localhost:3001';
    this.apiKey = process.env.RAILWAY_WORKER_API_KEY || '';
    this.timeout = 600000; // 10 minutes per competitor
    this.maxRetries = 2; // NEW v2: Retry failed requests
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
   * NEW v2: Retry logic + circuit breaker
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
```

---

### 2. ScrapingService Modifié (CORRECTION v2)

**Fichier**: `src/lib/pricing/scraping-service.ts`

**Changements critiques**:
- ✅ Loop SÉQUENTIEL dans `scrapeAllCompetitors()` (1 concurrent à la fois)
- ✅ Appel WorkerClient par concurrent (pas tous ensemble)
- ✅ Gestion d'erreurs améliorée

```typescript
import { WorkerClient, ScrapedProduct } from './worker-client';
import { MatchingService } from './matching-service';
import { db } from '@/db';
import {
  pricingScans,
  pricingCompetitors,
  pricingProducts
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export class ScrapingService {
  private matchingService: MatchingService;
  private workerClient: WorkerClient;

  constructor() {
    this.matchingService = new MatchingService();
    this.workerClient = new WorkerClient();
  }

  /**
   * Scrape ALL active competitors for a company
   * NEW v2: SEQUENTIAL scraping (1 competitor at a time)
   */
  async scrapeAllCompetitors(companyId: string): Promise<{
    success: boolean;
    totalCompetitors: number;
    successfulScans: number;
    failedScans: number;
  }> {
    console.log(`[ScrapingService] Starting scrape for all competitors (company: ${companyId})`);

    // Fetch active competitors
    const competitors = await db
      .select()
      .from(pricingCompetitors)
      .where(
        and(
          eq(pricingCompetitors.companyId, companyId),
          eq(pricingCompetitors.isActive, true)
        )
      );

    console.log(`[ScrapingService] Found ${competitors.length} active competitors`);

    if (competitors.length === 0) {
      return {
        success: true,
        totalCompetitors: 0,
        successfulScans: 0,
        failedScans: 0,
      };
    }

    let successfulScans = 0;
    let failedScans = 0;

    // CRITICAL v2: SEQUENTIAL loop (not parallel!)
    // 1 call Railway = 1 competitor
    for (const competitor of competitors) {
      try {
        console.log(`[ScrapingService] Scraping competitor: ${competitor.name}`);

        const result = await this.scrapeCompetitor(competitor.id);

        if (result.success) {
          successfulScans++;
          console.log(`[ScrapingService] ✅ Success: ${competitor.name} (${result.productsScraped} products)`);
        } else {
          failedScans++;
          console.log(`[ScrapingService] ❌ Failed: ${competitor.name}`);
        }
      } catch (error: any) {
        failedScans++;
        console.error(`[ScrapingService] ❌ Error scraping ${competitor.name}:`, error);
      }
    }

    console.log(`[ScrapingService] Completed all competitors`);
    console.log(`[ScrapingService] Successful: ${successfulScans}, Failed: ${failedScans}`);

    return {
      success: true,
      totalCompetitors: competitors.length,
      successfulScans,
      failedScans,
    };
  }

  /**
   * Scrape a single competitor
   */
  async scrapeCompetitor(competitorId: string): Promise<{
    success: boolean;
    scanId: string;
    productsScraped: number;
    productsFailed: number;
    errors: any[];
  }> {
    // Fetch competitor with company info
    const [competitor] = await db
      .select({
        id: pricingCompetitors.id,
        name: pricingCompetitors.name,
        websiteUrl: pricingCompetitors.websiteUrl,
        companyId: pricingCompetitors.companyId,
        companySlug: pricingCompetitors.companySlug, // NEW: from Phase 0 migration
      })
      .from(pricingCompetitors)
      .where(eq(pricingCompetitors.id, competitorId))
      .limit(1);

    if (!competitor) {
      throw new Error(`Competitor not found: ${competitorId}`);
    }

    // Create scan record
    const scanId = createId();
    const logs: LogEvent[] = [];

    await db.insert(pricingScans).values({
      id: scanId,
      companyId: competitor.companyId,
      status: 'in_progress',
      currentStep: 'Initializing scan',
      progressCurrent: 0,
      progressTotal: 100,
      logs: logs,
    });

    try {
      // Execute scraping via Railway worker
      const result = await this.executeScraping(competitor, scanId, logs);

      // If scraping succeeded, run AI matching
      if (result.success && result.scrapedProducts.length > 0) {
        logs.push({
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `Running GPT-5 matching for ${result.scrapedProducts.length} products`,
        });

        await db
          .update(pricingScans)
          .set({
            currentStep: 'AI Matching with GPT-5',
            progressCurrent: 85,
            logs: logs,
            updatedAt: new Date(),
          })
          .where(eq(pricingScans.id, scanId));

        const matches = await this.matchingService.matchProducts(
          competitor.companyId,
          competitor.id,
          result.scrapedProducts
        );

        logs.push({
          timestamp: new Date().toISOString(),
          type: 'success',
          message: `AI Matching completed: ${matches.length} matches found`,
        });

        await db
          .update(pricingScans)
          .set({
            status: 'completed',
            currentStep: 'Completed',
            progressCurrent: 100,
            productsScraped: result.productsScraped,
            productsMatched: matches.length,
            errors: result.errors,
            logs: logs,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pricingScans.id, scanId));

        return {
          success: true,
          scanId,
          productsScraped: result.productsScraped,
          productsFailed: result.productsFailed,
          errors: result.errors,
        };
      } else {
        // Scraping failed
        await db
          .update(pricingScans)
          .set({
            status: 'failed',
            currentStep: 'Failed',
            errors: result.errors,
            logs: logs,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pricingScans.id, scanId));

        return {
          success: false,
          scanId,
          productsScraped: result.productsScraped,
          productsFailed: result.productsFailed,
          errors: result.errors,
        };
      }
    } catch (error: any) {
      logs.push({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: `Fatal error: ${error.message}`,
      });

      await db
        .update(pricingScans)
        .set({
          status: 'failed',
          currentStep: 'Error',
          logs: logs,
          errors: [{ url: 'SYSTEM', error: error.message, timestamp: new Date() }],
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      throw error;
    }
  }

  /**
   * Execute the actual scraping logic
   * MODIFIED v2: Calls Railway worker instead of mock data
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
        companySlug: competitor.companySlug,
        competitorId: competitor.id,
        competitorName: competitor.name,
        competitorUrl: competitor.websiteUrl,
        products: activeProducts,
      });

      logs.push({
        timestamp: new Date().toISOString(),
        type: result.success ? 'success' : 'warning',
        message: result.success
          ? `Railway worker completed: ${result.productsScraped} products scraped`
          : `Railway worker completed with errors`,
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
        errors: result.errors.map(e => ({
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

interface LogEvent {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

interface ScrapingError {
  url: string;
  error: string;
  timestamp: Date;
}
```

---

### 3. Railway Worker - Express Server (NOUVEAU v2: Monitoring)

**Fichier**: `worker/src/index.ts`

```typescript
import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit'; // NEW v2
import pino from 'pino'; // NEW v2
import * as Sentry from '@sentry/node'; // NEW v2
import { ScraperFactory } from './scrapers/factory';
import { ScrapeRequestSchema, ScrapeResponseSchema } from './types';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// NEW v2: Structured Logging
// ============================================================================

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

// ============================================================================
// NEW v2: Sentry Error Tracking
// ============================================================================

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// ============================================================================
// Middleware
// ============================================================================

app.use(express.json({ limit: '10mb' }));

// NEW v2: Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/scrape', limiter);

// Auth middleware
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn({ ip: req.ip, path: req.path }, 'Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// NEW v2: Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
  }, 'Incoming request');
  next();
});

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// NEW v2: Metrics endpoint (Prometheus format)
app.get('/metrics', (req, res) => {
  // TODO: Implement prometheus metrics
  res.send('# Metrics placeholder');
});

// Main scraping endpoint
app.post('/api/scrape', async (req, res) => {
  const startTime = Date.now();

  // NEW v2: Sentry transaction
  const transaction = Sentry.startTransaction({
    op: 'scrape',
    name: 'POST /api/scrape',
  });

  try {
    logger.info('Received scrape request');

    // Validate request
    const request = ScrapeRequestSchema.parse(req.body);

    logger.info({
      companySlug: request.companySlug,
      competitorName: request.competitorName,
      productsCount: request.products.length,
      batchInfo: request.batchInfo,
    }, 'Scrape request validated');

    // Get appropriate scraper
    const scraper = ScraperFactory.getScraperForCompany(request.companySlug);

    logger.info({
      scraperType: scraper.constructor.name,
    }, 'Scraper selected');

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

    logger.info({
      duration,
      productsScraped: result.productsScraped,
      productsFailed: result.productsFailed,
    }, 'Scraping completed successfully');

    transaction.setStatus('ok');
    transaction.finish();

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error({
      error: error.message,
      stack: error.stack,
      duration,
    }, 'Scraping failed');

    // NEW v2: Report to Sentry
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/scrape',
      },
    });

    transaction.setStatus('internal_error');
    transaction.finish();

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

// ============================================================================
// Error Handler
// ============================================================================

// NEW v2: Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
  }, 'Unhandled error');

  Sentry.captureException(err);

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  logger.info({
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  }, 'Server started');
});
```

---

## 🔐 Sécurité & Authentification

### 1. Rate Limiting

**Objectif**: Prévenir les abus et attaques DDoS.

**Implémentation**:

```typescript
// worker/src/middleware/rate-limiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis'; // Optional: For distributed rate limiting
import { createClient } from 'redis';

// Option 1: In-memory (simple, for single Railway instance)
export const scraperRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP
  message: 'Too many scraping requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // NEW: Custom key generator (per API key instead of IP)
  keyGenerator: (req) => {
    return req.headers['x-api-key'] as string || req.ip;
  },
});

// Option 2: Redis-backed (scalable, for multiple Railway instances)
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

export const scraperRateLimiterRedis = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    // @ts-ignore
    client: redisClient,
    prefix: 'rl:scraper:',
  }),
});

// Usage in index.ts
app.use('/api/scrape', scraperRateLimiter);
```

### 2. IP Whitelist (Vercel IPs Only)

**Objectif**: N'autoriser que les requêtes provenant de Vercel.

**Implémentation**:

```typescript
// worker/src/middleware/ip-whitelist.ts
import { Request, Response, NextFunction } from 'express';

// Vercel IP ranges (updated 2024)
// Source: https://vercel.com/docs/concepts/edge-network/headers#x-forwarded-for
const VERCEL_IP_RANGES = [
  '76.76.21.0/24',
  '76.76.21.21', // Example specific IP
  // Add all Vercel IPs from their docs
];

// Helper: Check if IP is in CIDR range
function ipInRange(ip: string, cidr: string): boolean {
  // Simplified implementation
  // Use library like 'ip-range-check' for production
  return cidr.includes(ip);
}

export function ipWhitelistMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;

  console.log(`[IP Whitelist] Checking IP: ${clientIP}`);

  // Allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Check against whitelist
  const isAllowed = VERCEL_IP_RANGES.some(range => {
    if (range.includes('/')) {
      return ipInRange(clientIP as string, range);
    }
    return clientIP === range;
  });

  if (!isAllowed) {
    console.warn(`[IP Whitelist] Rejected IP: ${clientIP}`);
    return res.status(403).json({ error: 'Forbidden: IP not whitelisted' });
  }

  next();
}

// Usage in index.ts
app.use('/api/scrape', ipWhitelistMiddleware);
```

### 3. JWT Tokens (Phase 2 - Roadmap)

**Avantages sur API Key statique**:
- ✅ Expiration automatique (1 heure)
- ✅ Claims contextuels (companyId, userId)
- ✅ Rotation facile des secrets

**Implémentation**:

```typescript
// Next.js: Generate JWT
import jwt from 'jsonwebtoken';

export async function generateWorkerToken(companyId: string): Promise<string> {
  const payload = {
    companyId,
    iat: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '1h', // 1 hour expiration
    issuer: 'market-intelligence-vercel',
  });

  return token;
}

// Railway Worker: Verify JWT
import jwt from 'jsonwebtoken';

export function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      companyId: string;
      iat: number;
    };

    // Attach payload to request
    (req as any).auth = payload;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Usage
app.use('/api/scrape', jwtAuthMiddleware);
```

**Roadmap**: Implémenter JWT en Phase 2 après validation du MVP avec API Key.

---

## 📊 Monitoring & Observabilité

### 1. Structured Logging avec Pino

**Objectif**: Logs structurés et facilement searchables.

**Configuration complète**:

```typescript
// worker/src/utils/logger.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export default logger;

// Usage examples
logger.info('Server started');

logger.info({
  competitorId: 'xxx',
  productsCount: 100,
  duration: 5432,
}, 'Scraping completed');

logger.error({
  error: error.message,
  stack: error.stack,
  competitorUrl: 'https://...',
}, 'Scraping failed');
```

**Avantages**:
- ✅ Logs JSON facilement parsables
- ✅ Contexte riche (metadata)
- ✅ Pretty print en dev, JSON en prod

### 2. Error Tracking avec Sentry

**Configuration complète**:

```bash
# Install Sentry
npm install @sentry/node @sentry/tracing
```

```typescript
// worker/src/utils/sentry.ts
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Express } from 'express';

export function initSentry(app: Express) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: 1.0,

    // Attach Express integration
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove API keys from logs
      if (event.request?.headers) {
        delete event.request.headers['x-api-key'];
        delete event.request.headers['authorization'];
      }
      return event;
    },
  });

  // Request handler (must be first middleware)
  app.use(Sentry.Handlers.requestHandler());

  // Tracing handler
  app.use(Sentry.Handlers.tracingHandler());
}

// Error handler (must be last middleware)
export function sentryErrorHandler(app: Express) {
  app.use(Sentry.Handlers.errorHandler());
}

// Usage in index.ts
import { initSentry, sentryErrorHandler } from './utils/sentry';

const app = express();
initSentry(app);

// ... routes ...

sentryErrorHandler(app);
app.listen(PORT);
```

**Features Sentry**:
- ✅ Error tracking avec stack traces
- ✅ Performance monitoring (transactions)
- ✅ Release tracking
- ✅ Source maps support
- ✅ Free tier: 5,000 errors/mois

### 3. Metrics Endpoint (Prometheus)

**Objectif**: Métriques pour monitoring (Grafana, Railway metrics).

```bash
npm install prom-client
```

```typescript
// worker/src/utils/metrics.ts
import prometheus from 'prom-client';

// Register
export const register = new prometheus.Registry();

// Default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Custom metrics
export const scrapeDuration = new prometheus.Histogram({
  name: 'scrape_duration_seconds',
  help: 'Duration of scraping jobs in seconds',
  labelNames: ['competitor', 'company_slug', 'status'],
  buckets: [1, 5, 15, 30, 60, 120, 300, 600], // seconds
  registers: [register],
});

export const scrapeTotal = new prometheus.Counter({
  name: 'scrape_total',
  help: 'Total number of scrape requests',
  labelNames: ['competitor', 'company_slug', 'status'],
  registers: [register],
});

export const productsScrapedTotal = new prometheus.Counter({
  name: 'products_scraped_total',
  help: 'Total number of products scraped',
  labelNames: ['competitor', 'company_slug', 'found'],
  registers: [register],
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Usage in scraping
const end = scrapeDuration.startTimer({
  competitor: competitorName,
  company_slug: companySlug,
});

try {
  const result = await scraper.scrapeCompetitor(...);

  scrapeTotal.inc({
    competitor: competitorName,
    company_slug: companySlug,
    status: 'success',
  });

  productsScrapedTotal.inc({
    competitor: competitorName,
    company_slug: companySlug,
    found: 'true',
  }, result.productsScraped);

  end({ status: 'success' });
} catch (error) {
  scrapeTotal.inc({
    competitor: competitorName,
    company_slug: companySlug,
    status: 'error',
  });

  end({ status: 'error' });
}
```

**Railway Integration**: Railway peut scraper `/metrics` automatiquement pour monitoring.

---

## ⚠️ Gestion des Risques

### 1. Circuit Breaker Pattern

**Problème**: Si Railway worker tombe, toutes les requêtes échouent pendant des minutes.

**Solution**: Circuit breaker qui détecte les failures et stoppe temporairement les appels.

```bash
npm install opossum
```

```typescript
// src/lib/pricing/circuit-breaker.ts
import CircuitBreaker from 'opossum';

export function createWorkerCircuitBreaker(workerClient: WorkerClient) {
  const options = {
    timeout: 600000, // 10 minutes
    errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
    resetTimeout: 30000, // Try again after 30 seconds
    rollingCountTimeout: 60000, // 1 minute window
    rollingCountBuckets: 10,
  };

  const breaker = new CircuitBreaker(
    async (request: ScrapeRequest) => {
      return await workerClient.scrape(request);
    },
    options
  );

  // Event handlers
  breaker.on('open', () => {
    console.error('[Circuit Breaker] OPEN - Railway worker appears down');
    // TODO: Send alert (Slack, email)
  });

  breaker.on('halfOpen', () => {
    console.log('[Circuit Breaker] HALF_OPEN - Testing Railway worker');
  });

  breaker.on('close', () => {
    console.log('[Circuit Breaker] CLOSED - Railway worker healthy');
  });

  breaker.fallback(() => {
    console.log('[Circuit Breaker] Fallback triggered');
    return {
      success: false,
      scrapedProducts: [],
      productsScraped: 0,
      productsFailed: 0,
      errors: [{
        url: 'CIRCUIT_BREAKER',
        error: 'Railway worker unavailable (circuit open)',
        timestamp: new Date().toISOString(),
      }],
      metadata: {
        duration: 0,
        scraperType: 'playwright' as const,
        workerStatus: 'DOWN' as const,
      },
    };
  });

  return breaker;
}

// Usage in ScrapingService
constructor() {
  this.matchingService = new MatchingService();
  this.workerClient = new WorkerClient();
  this.workerBreaker = createWorkerCircuitBreaker(this.workerClient);
}

private async executeScraping(...) {
  // Use circuit breaker instead of direct call
  const result = await this.workerBreaker.fire(request);
}
```

### 2. Checkpointing & Resume

**Problème**: Si scraping crash après 4 heures, tout est perdu.

**Solution**: Sauvegarder état intermédiaire dans PostgreSQL.

```typescript
// Add to schema
export const pricingScrapingCheckpoints = pgTable('pricing_scraping_checkpoints', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull().references(() => pricingScans.id),
  competitorId: text('competitor_id').notNull(),
  lastProductIndex: integer('last_product_index').notNull(),
  scrapedProducts: jsonb('scraped_products').notNull(), // Partial results
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Save checkpoint every 50 products
const CHECKPOINT_INTERVAL = 50;

for (let i = startIndex; i < products.length; i++) {
  const result = await this.scrapeProduct(products[i]);
  results.push(result);

  if (i % CHECKPOINT_INTERVAL === 0) {
    await db.insert(pricingScrapingCheckpoints).values({
      id: createId(),
      scanId,
      competitorId,
      lastProductIndex: i,
      scrapedProducts: results,
    });

    console.log(`[Checkpoint] Saved progress: ${i}/${products.length}`);
  }
}

// Resume from checkpoint
async function resumeFromCheckpoint(scanId: string): Promise<number> {
  const [checkpoint] = await db
    .select()
    .from(pricingScrapingCheckpoints)
    .where(eq(pricingScrapingCheckpoints.scanId, scanId))
    .orderBy(desc(pricingScrapingCheckpoints.lastProductIndex))
    .limit(1);

  if (checkpoint) {
    console.log(`[Resume] Resuming from index ${checkpoint.lastProductIndex}`);
    return checkpoint.lastProductIndex + 1;
  }

  return 0; // Start from beginning
}
```

### 3. Timeout Management Strategy

**Problème Identifié v2**:
- 1 concurrent = 576 produits × 3s = **28.8 minutes**
- Timeout WorkerClient = 10 minutes ❌

**Solutions**:

**Option A: Augmenter timeout (RECOMMANDÉ pour Phase 1)**
```typescript
export class WorkerClient {
  constructor() {
    this.timeout = 1800000; // 30 minutes (safe pour 576 produits)
  }
}
```

**Option B: Pagination automatique (RECOMMANDÉ pour Phase 2)**
- Déjà implémentée dans `WorkerClient.scrape()` (batches de 100)
- 100 produits × 3s = 5 minutes (bien en dessous de 10 min)

**Option C: Railway timeout configuration**
```json
// railway.json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300, // 5 minutes
    "restartPolicyType": "ON_FAILURE",
    "sleepAfter": "30m" // Keep alive 30 minutes
  }
}
```

**Recommandation**: Combiner Option A + B pour maximum fiabilité.

---

## 🔄 Flux de Données (CORRIGÉ v2)

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
│    - Fetches active competitors from DB (13 competitors)            │
│    - SEQUENTIAL loop: for (competitor of competitors)               │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. LOOP ITERATION 1: Scrape Swish                                  │
│    ScrapingService.scrapeCompetitor(swishId)                        │
│    - Fetches 576 active products                                    │
│    - Calls executeScraping(swish, scanId, logs)                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. executeScraping() calls WorkerClient.scrape()                   │
│    Request: {                                                        │
│      competitorId: 'swish-id',                                      │
│      products: [576 products],                                      │
│      companySlug: 'dissan'                                          │
│    }                                                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. WorkerClient detects 576 products > 100                         │
│    - Splits into 6 batches (100 each)                               │
│    - Batch 1: products[0..99]                                       │
│    - Batch 2: products[100..199]                                    │
│    - ... (6 batches total)                                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 7. BATCH 1: POST to Railway Worker                                 │
│    POST https://worker.railway.app/api/scrape                       │
│    Body: { competitorId, products[0..99], batchInfo: {1/6} }        │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 8. Railway Worker receives batch 1                                 │
│    - Validates request (Zod)                                        │
│    - ScraperFactory.getScraperForCompany('dissan')                  │
│    - Returns DissanScraper instance                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 9. DissanScraper.scrapeCompetitor(batch 1)                         │
│    - Launches Playwright browser                                    │
│    - For product in products[0..99]:                                │
│      • Navigate to swish.ca/search?q={sku}                          │
│      • Extract price, name, image                                   │
│      • Add to scrapedProducts[]                                     │
│    - Close browser                                                  │
│    Duration: ~5 minutes (100 × 3s)                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 10. Railway responds batch 1                                       │
│     { success: true, scrapedProducts: [87], errors: [13] }          │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 11. WorkerClient processes batch 1 response                        │
│     - Aggregates results                                             │
│     - Proceeds to batch 2...                                        │
│     (Repeat steps 7-11 for batches 2-6)                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 12. All 6 batches completed (Swish done)                           │
│     Total duration: ~30 minutes                                      │
│     Aggregated: { scrapedProducts: [485], errors: [91] }            │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 13. MatchingService.matchProducts(swishProducts)                   │
│     - Calls GPT-5 with your catalog + Swish products                │
│     - Returns matches with confidence scores                         │
│     - Saves to pricing_matches table                                 │
│     Duration: ~2 minutes                                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 14. ScrapingService updates pricingScans                           │
│     - status: 'completed' for Swish                                  │
│     - productsScraped: 485, productsMatched: 123                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 15. LOOP ITERATION 2: Scrape Grainger                              │
│     (Repeat steps 4-14 for Grainger)                                │
│     Duration: ~30 minutes                                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ ... LOOP ITERATIONS 3-13 ...                                       │
│     (Uline, Amazon, Staples, etc.)                                  │
│     Total: 13 competitors × 30 min = 6.5 hours                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 16. scrapeAllCompetitors() completes                               │
│     Returns: { totalCompetitors: 13, successfulScans: 12, failed: 1}│
└───────────────────────────────┬─────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 17. Frontend receives success response                             │
│     - Shows alert "Scan lancé avec succès!"                          │
│     - Refreshes matches via GET /api/pricing/matches                 │
│     - Displays 12 competitor cards with prices                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Temps estimé total** (CORRIGÉ v2):
- 100 produits × 1 concurrent: ~5 minutes (scraping) + 2 min (matching) = **7 min**
- 576 produits × 1 concurrent: ~30 minutes (scraping) + 2 min (matching) = **32 min**
- 576 produits × 13 concurrents: 32 min × 13 = **6.9 heures**

---

## 🚀 Implémentation Technique

### Phase 0: Préparation Database (0.5 heure)

#### Étape 0.1: Créer migration SQL

```bash
touch migrations/0015_add_company_slug_to_competitors.sql
```

Voir section "Phase 0: Préparation Database" pour le contenu SQL.

#### Étape 0.2: Créer script Node.js

```bash
touch scripts/run-migration-0015.mjs
```

Voir section "Phase 0" pour le code.

#### Étape 0.3: Exécuter migration

```bash
# Dev
node scripts/run-migration-0015.mjs

# Vérifier
psql $DATABASE_URL -c "SELECT id, name, company_slug FROM pricing_competitors LIMIT 5;"
```

**✅ Phase 0 complétée**: Database prête avec `company_slug`.

---

### Phase 1: Setup Railway Worker (3 heures)

#### Étape 1.1: Créer structure worker

```bash
mkdir -p worker/src/{scrapers,types,utils,middleware}
cd worker
npm init -y
```

#### Étape 1.2: Installer dépendances

```bash
npm install express playwright zod dotenv pino @sentry/node prom-client
npm install -D @types/express @types/node typescript tsx nodemon
npm install express-rate-limit # Security
```

#### Étape 1.3: package.json

```json
{
  "name": "pricing-worker",
  "version": "2.0.0",
  "scripts": {
    "dev": "nodemon --watch src --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "echo \"No tests yet\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "playwright": "^1.40.0",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1",
    "pino": "^8.16.0",
    "pino-pretty": "^10.2.0",
    "@sentry/node": "^7.80.0",
    "prom-client": "^15.0.0",
    "express-rate-limit": "^7.1.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.2"
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
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Étape 1.5: Copier code Dissan

```bash
# Copier les scrapers Dissan dans worker
cp -r ../Dissan/price-scraper/src/scrapers/* worker/src/scrapers/dissan/
cp -r ../Dissan/price-scraper/src/matchers worker/src/matchers/
cp -r ../Dissan/price-scraper/src/utils worker/src/utils/

# Adapter les imports si nécessaire
```

#### Étape 1.6: Créer fichiers types

```bash
touch worker/src/types/index.ts
touch worker/src/types/scraper-interface.ts
```

```typescript
// worker/src/types/scraper-interface.ts
export interface ICompetitorScraper {
  scraperType: 'playwright' | 'apify' | 'api';

  scrapeCompetitor(request: ScrapeCompetitorRequest): Promise<ScrapeCompetitorResponse>;
}

export interface ScrapeCompetitorRequest {
  competitorId: string;
  competitorName: string;
  competitorUrl: string;
  products: Array<{
    id: string;
    sku: string;
    name: string;
    brand: string | null;
    category: string | null;
  }>;
}

export interface ScrapeCompetitorResponse {
  scrapedProducts: Array<{
    url: string;
    name: string;
    sku?: string;
    price: number;
    currency: string;
    inStock: boolean;
    imageUrl?: string;
    characteristics?: Record<string, any>;
  }>;
  productsScraped: number;
  productsFailed: number;
  errors: Array<{
    url: string;
    error: string;
    timestamp: Date;
  }>;
}
```

#### Étape 1.7: Créer index.ts

Voir section "Composants Détaillés - Railway Worker" pour le code complet.

#### Étape 1.8: Tester localement

```bash
cd worker
npm run dev

# Test health check
curl http://localhost:3001/health
```

---

### Phase 1.5: Batching Logic (1 heure)

Déjà implémenté dans le code ci-dessus:
- ✅ `WorkerClient.scrape()` avec pagination automatique
- ✅ `ScrapingService.scrapeAllCompetitors()` avec loop séquentiel

**Tests à effectuer**:

```bash
# Test 1: Small batch (10 products)
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "companySlug": "dissan",
    "competitorId": "test",
    "competitorName": "Test Competitor",
    "competitorUrl": "https://example.com",
    "products": [...10 products...]
  }'

# Test 2: Large batch (150 products) - should auto-paginate
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "companySlug": "dissan",
    "products": [...150 products...]
  }'
# Should see logs: "Paginating 150 products into batches of 100"
```

---

## 📦 Déploiement Railway

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
# Choose: "Create new project"
# Name: "pricing-worker-dissan"

railway up
```

#### Étape 2.3: Configurer variables d'environnement

```bash
# Generate secure API key
openssl rand -hex 32
# Output: a1b2c3d4e5f6...

railway variables set API_KEY=a1b2c3d4e5f6...
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info

# Sentry (optional Phase 3)
railway variables set SENTRY_DSN=https://...@sentry.io/...

# Database (if needed for checkpointing)
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
```

#### Étape 2.4: railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx playwright install --with-deps chromium && npm run build"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepAfter": "30m",
    "restartPolicyType": "ON_FAILURE",
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

#### Étape 2.5: Obtenir URL Railway

```bash
railway domain
# Output: https://pricing-worker-dissan-production.up.railway.app
```

#### Étape 2.6: Tester déploiement

```bash
curl https://pricing-worker-dissan-production.up.railway.app/health \
  -H "X-API-Key: a1b2c3d4e5f6..."

# Expected response:
# {"status":"healthy","timestamp":"2025-01-19T...","uptime":123.45}
```

---

### Phase 2.5: Modifier Next.js (2 heures)

#### Étape 2.5.1: Créer WorkerClient

```bash
touch src/lib/pricing/worker-client.ts
```

Copier le code de la section "Composants Détaillés - WorkerClient".

#### Étape 2.5.2: Modifier ScrapingService

Éditer `src/lib/pricing/scraping-service.ts`:
- Importer `WorkerClient`
- Modifier `scrapeAllCompetitors()` (loop séquentiel)
- Modifier `executeScraping()` (appel Railway)

Voir code complet dans section "Composants Détaillés - ScrapingService".

#### Étape 2.5.3: Ajouter variables d'environnement

```bash
# .env.local (dev)
RAILWAY_WORKER_URL=http://localhost:3001
RAILWAY_WORKER_API_KEY=test-key

# Production (Vercel)
# Settings → Environment Variables
RAILWAY_WORKER_URL=https://pricing-worker-dissan-production.up.railway.app
RAILWAY_WORKER_API_KEY=a1b2c3d4e5f6...
```

Dans Vercel dashboard:
1. Settings → Environment Variables
2. Add: `RAILWAY_WORKER_URL` = `https://pricing-worker-dissan-production.up.railway.app`
3. Add: `RAILWAY_WORKER_API_KEY` = `a1b2c3d4e5f6...`
4. Redeploy

#### Étape 2.5.4: Tester en local

```bash
# Terminal 1: Railway worker
cd worker
npm run dev

# Terminal 2: Next.js
npm run dev

# Browser: http://localhost:3000/companies/dissan/pricing
# Click "Lancer scan" button
# Check logs in both terminals
```

---

## 🧪 Tests et Validation

### Phase 3: Tests (2 heures)

#### Test 1: Health Check Railway

```bash
curl -H "X-API-Key: a1b2c3d4e5f6..." \
  https://pricing-worker-dissan-production.up.railway.app/health

# Expected: {"status":"healthy",...}
```

#### Test 2: Scrape 10 produits

```bash
# Create test data
cat > test-10-products.json <<EOF
{
  "companyId": "test-company",
  "companySlug": "dissan",
  "competitorId": "test-competitor",
  "competitorName": "Swish Test",
  "competitorUrl": "https://swish.ca",
  "products": [
    {"id": "1", "sku": "TEST-001", "name": "Test Product 1", "brand": "Test", "category": "Test"},
    ...
  ]
}
EOF

curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: a1b2c3d4e5f6..." \
  https://pricing-worker-dissan-production.up.railway.app/api/scrape \
  -d @test-10-products.json

# Check response time (should be <1 minute for 10 products)
```

#### Test 3: Scrape 150 produits (pagination)

```bash
# Create 150 products test data
# ... (similar to above, 150 items)

curl -X POST ... -d @test-150-products.json

# Check logs for pagination:
# "Paginating 150 products into batches of 100"
# "Processing batch 1/2"
# "Processing batch 2/2"
```

#### Test 4: End-to-end depuis UI

1. Login: http://localhost:3000 (ou production)
2. Navigate: `/companies/dissan/pricing`
3. Click: "Lancer scan"
4. Monitor:
   - Railway logs: `railway logs --tail`
   - Next.js terminal
   - Browser network tab
5. Verify:
   - Scan record créé dans `pricing_scans`
   - Matches créées dans `pricing_matches`
   - UI affiche les résultats

#### Test 5: Error Handling

```bash
# Test 5.1: Invalid API Key
curl -X POST ... -H "X-API-Key: wrong-key"
# Expected: 401 Unauthorized

# Test 5.2: Invalid request (missing field)
curl -X POST ... -d '{"invalid": "data"}'
# Expected: 400 Bad Request, Zod validation errors

# Test 5.3: Timeout simulation
# Modify worker to sleep 15 minutes
# Expected: WorkerClient retries, then fallback

# Test 5.4: Railway worker down
# Stop Railway worker
# Expected: Circuit breaker opens, fallback response
```

#### Test 6: Performance Test

```bash
# Measure duration for 576 products
time curl -X POST ... -d @dissan-576-products.json

# Expected: ~30 minutes (576 products × 3s/product)
```

---

## 💰 Coûts et Performance (RÉVISÉ v2)

### Coûts Railway

**Free Tier**: $5 crédit/mois

**Pricing Model Railway** (2024):
- Hobby Plan: $0.000463/minute de runtime
- Includes: 500MB RAM, 1 vCPU
- Auto-sleep après 30 minutes d'inactivité

**Estimation Dissan** (CORRIGÉ v2):

```
Hypothèses:
- 576 produits dans votre catalogue
- 13 concurrents actifs
- Scraping: 3 secondes/produit (moyenne)
- Fréquence: 1 scan complet par semaine

Calcul par scan:
1. Scraping d'un concurrent:
   - 576 produits × 3s = 1,728s = 28.8 minutes
   - Pagination: 6 batches × 5 min = 30 minutes
   - Total par concurrent: ~30 minutes

2. Scraping de tous les concurrents (séquentiel):
   - 13 concurrents × 30 min = 390 minutes = 6.5 heures

3. Coût par scan:
   - 390 min × $0.000463 = $0.18/scan

4. Coût mensuel:
   - 4 scans/mois × $0.18 = $0.72/mois

Avec $5 gratuit: 5 / 0.72 = 6.9 mois d'utilisation ✅
```

**Comparaison v1 vs v2**:
- ❌ **v1**: $0.06/mois (calcul incorrect, assumait parallel)
- ✅ **v2**: $0.72/mois (calcul réaliste, scraping séquentiel)

**Scaling pour d'autres clients**:
```
Akonovia (hypothèse: 200 produits, 5 concurrents):
- 200 × 3s × 5 = 3,000s = 50 minutes/scan
- 4 scans/mois = 200 min/mois
- 200 min × $0.000463 = $0.09/mois

Total (Dissan + Akonovia):
- $0.72 + $0.09 = $0.81/mois
- Avec $5 gratuit = 6 mois d'utilisation ✅
```

**Note**: Railway auto-sleep réduit coûts si pas d'activité.

---

### Performance

**Scraping**:
- 10 produits: ~30 secondes
- 100 produits: ~5 minutes
- 576 produits (Dissan): ~30 minutes
- 576 × 13 concurrents: ~6.5 heures

**Matching GPT-5**:
- 10 produits: ~10 secondes
- 100 produits: ~2 minutes
- 576 produits: ~2-3 minutes (batches de 10)

**Total End-to-End** (Dissan complet):
- Scraping: 6.5 heures
- Matching: 13 × 2 min = 26 minutes
- **Total: ~7 heures**

**Optimisations futures** (Phase 4):
- Parallel browsers (3 concurrent): 6.5h → 2.2h
- Caching intelligent: Réduire scraping répété
- Incremental updates: Scraper seulement produits nouveaux/modifiés

---

## 🛣️ Roadmap (RÉVISÉE v2)

### Phase 0: Préparation Database ✅ (0.5 heure)
- [x] Migration SQL: Add `company_slug` to `pricing_competitors`
- [x] Script Node.js pour migration
- [x] Tests et validation

**Livrables**: Database schema updated, migration tested.

---

### Phase 1: MVP Railway Worker (3 heures)
- [x] Setup projet worker (`/worker`)
- [x] Install dependencies (Express, Playwright, Zod, Pino)
- [x] Create Express server avec middleware
- [x] Copy Dissan scraper code
- [x] Create ScraperFactory
- [x] Test localement (`npm run dev`)

**Livrables**: Worker fonctionnel en local.

---

### Phase 1.5: Batching Logic (1 heure)
- [x] Implement `WorkerClient` avec pagination
- [x] Modify `ScrapingService.scrapeAllCompetitors()` (loop séquentiel)
- [x] Test avec 10, 100, 150 produits
- [x] Valider timeouts

**Livrables**: Batching logic validé.

---

### Phase 2: Déploiement Production (2 heures)
- [ ] Deploy Railway worker (`railway up`)
- [ ] Configure env vars (API_KEY, NODE_ENV)
- [ ] Obtenir URL Railway
- [ ] Modifier Next.js (WorkerClient, ScrapingService)
- [ ] Configure Vercel env vars
- [ ] Deploy Vercel
- [ ] Test end-to-end production

**Livrables**: Production deployed, end-to-end fonctionnel.

---

### Phase 3: Monitoring & Tests (2 heures)
- [ ] Setup Sentry error tracking
- [ ] Structured logging (Pino)
- [ ] Metrics endpoint (`/metrics`)
- [ ] Test suite:
  - Health check
  - 10 produits
  - 150 produits (pagination)
  - Error scenarios
- [ ] Performance benchmarks

**Livrables**: Monitoring actif, tests passants.

---

### Phase 4: Sécurité & UX (3 heures)
- [ ] Rate limiting (express-rate-limit)
- [ ] IP whitelist (Vercel IPs)
- [ ] Progress polling (UI)
  - Endpoint: `GET /api/scans/{scanId}`
  - Frontend: Poll toutes les 5s
  - Display: Progress bar + ETA
- [ ] Circuit breaker (opossum)

**Livrables**: Sécurité renforcée, UX améliorée.

---

### Phase 5: Robustesse & Recovery (4 heures)
- [ ] Checkpointing system (PostgreSQL)
  - Table: `pricing_scraping_checkpoints`
  - Save every 50 products
- [ ] Resume logic
- [ ] Retry avec exponential backoff
- [ ] Error recovery tests

**Livrables**: System résilient aux failures.

---

### Phase 6: Multi-Tenant & Scaling (Futur)
- [ ] Table `pricing_scraper_configs` (config DB)
- [ ] ScraperFactory dynamique (config-driven)
- [ ] Akonovia scraper (client 2)
- [ ] Admin UI pour configurer scrapers
- [ ] Queue system (BullMQ)
- [ ] Parallel scraping (multiple browsers)

**Livrables**: Fully multi-tenant, scalable.

---

**Total Temps MVP (Phases 0-3)**: ~8 heures
**Total Temps Production-Ready (Phases 0-4)**: ~14 heures
**Total Temps Fully Featured (Phases 0-5)**: ~18 heures

---

## ✅ Checklist Implémentation

### Phase 0: Database
- [ ] Créer migration SQL (`0015_add_company_slug_to_competitors.sql`)
- [ ] Créer script Node.js (`run-migration-0015.mjs`)
- [ ] Exécuter migration en dev
- [ ] Vérifier données (tous les rows ont `company_slug`)
- [ ] Tester query avec JOIN

### Phase 1: Railway Worker
- [ ] Créer répertoire `/worker`
- [ ] `npm init` + installer dépendances
- [ ] Créer `tsconfig.json`
- [ ] Créer `src/index.ts` (Express server)
- [ ] Créer `src/types/scraper-interface.ts`
- [ ] Créer `src/scrapers/factory.ts`
- [ ] Copier code Dissan dans `src/scrapers/dissan/`
- [ ] Adapter imports Dissan si nécessaire
- [ ] Créer `.env` avec API_KEY
- [ ] Tester localement (`npm run dev`)
- [ ] Test health check (`curl /health`)
- [ ] Test scraping mock data

### Phase 1.5: Batching
- [ ] Implement pagination dans `WorkerClient`
- [ ] Modify `scrapeAllCompetitors()` (sequential)
- [ ] Test avec 10 produits
- [ ] Test avec 150 produits (pagination)
- [ ] Valider logs "Paginating..."

### Phase 2: Deployment
- [ ] Install Railway CLI (`npm i -g @railway/cli`)
- [ ] `railway init`
- [ ] Create `railway.json` config
- [ ] `railway up` (first deploy)
- [ ] Configure env vars Railway
- [ ] Test deployed health check
- [ ] Créer `src/lib/pricing/worker-client.ts` (Next.js)
- [ ] Modifier `src/lib/pricing/scraping-service.ts`
- [ ] Add env vars Vercel dashboard
- [ ] Deploy Vercel
- [ ] Test end-to-end production

### Phase 3: Monitoring
- [ ] Install Sentry (`npm install @sentry/node`)
- [ ] Configure Sentry DSN (Railway env var)
- [ ] Add Sentry middleware to Express
- [ ] Install Pino (`npm install pino pino-pretty`)
- [ ] Replace `console.log` with `logger.info`
- [ ] Create `/metrics` endpoint
- [ ] Test error reporting (trigger error)
- [ ] Test logs in Railway dashboard

### Phase 4: Security & UX
- [ ] Install rate-limit (`npm install express-rate-limit`)
- [ ] Add rate limiter middleware
- [ ] Test rate limiting (exceed 100 req/15min)
- [ ] Implement IP whitelist (Vercel IPs)
- [ ] Create progress polling endpoint
- [ ] Frontend: Poll `/api/scans/{scanId}` every 5s
- [ ] Display progress bar + ETA
- [ ] Install opossum (`npm install opossum`)
- [ ] Implement circuit breaker
- [ ] Test circuit breaker (kill Railway worker)

### Phase 5: Recovery
- [ ] Create `pricing_scraping_checkpoints` table
- [ ] Implement checkpoint save (every 50 products)
- [ ] Implement resume logic
- [ ] Test: Kill scraping mid-process, resume
- [ ] Implement retry with exponential backoff
- [ ] Test retry logic

---

## 🎓 Conclusion

Cette architecture v2 permet:

✅ **Playwright fonctionne** - Plus de limitations Vercel
✅ **Code Dissan réutilisé** - 13 scrapers déjà testés
✅ **Multi-tenant ready** - Facile d'ajouter nouveaux clients
✅ **Interface unifiée** - UI/API inchangées
✅ **Coût minimal** - $0.72/mois pour Dissan (dans $5 gratuit)
✅ **Scalable** - Railway peut scaler automatiquement
✅ **Monitoring intégré** - Sentry + Pino + Metrics
✅ **Sécurité renforcée** - Rate limiting + IP whitelist
✅ **Résilient** - Circuit breaker + Checkpointing + Retry

### Différences Critiques v1 → v2

| Aspect | v1 | v2 |
|--------|----|----|
| **Batching** | ❌ 1 call = ALL competitors | ✅ 1 call = 1 competitor |
| **Pagination** | ❌ Pas de pagination | ✅ Auto-pagination >100 products |
| **Database** | ❌ Manque company_slug | ✅ Phase 0: Migration SQL |
| **Monitoring** | ❌ Pas de monitoring | ✅ Sentry + Pino + Metrics |
| **Sécurité** | ❌ API Key seulement | ✅ Rate limiting + IP whitelist |
| **Recovery** | ❌ Pas de checkpointing | ✅ Checkpoints + Resume |
| **Coûts** | ❌ $0.06/mois (faux) | ✅ $0.72/mois (réaliste) |
| **Roadmap** | ❌ 4 phases | ✅ 6 phases (+ Phase 0, 1.5) |

---

## 📚 Ressources

- Railway Docs: https://docs.railway.app
- Playwright Docs: https://playwright.dev
- Sentry Node.js: https://docs.sentry.io/platforms/node/
- Pino Logging: https://github.com/pinojs/pino
- Opossum Circuit Breaker: https://github.com/nodeshift/opossum

---

**Next Step**: Implémenter Phase 0 (Migration Database) puis Phase 1 (Setup Railway Worker)

**Contact**: Pour questions ou clarifications sur cette architecture, référer à ce document (v2).

**Version History**:
- v1.0 (2025-01-19): Version initiale
- v2.0 (2025-01-19): Corrections critiques post-revue architecturale
