# Révision Architecture Technique - Module Pricing

**Date:** 19 novembre 2025
**Auteur:** Architecte Technique
**Status:** Corrections Requises

---

## 🎯 Objectif

Aligner le plan du module Competitive Pricing Intelligence avec les composantes **déjà utilisées** dans la plateforme Market Intelligence existante pour assurer la cohérence technique et éviter la duplication d'infrastructure.

---

## 📊 Analyse de l'Architecture Existante

### Stack Technique Actuel (Confirmé via code)

#### Frontend ✅
```typescript
// Package.json confirmé
- Next.js 15.0.3 (App Router) ✅
- React 19.0.0-rc.1 ✅
- TypeScript 5.9.3 ✅
- TailwindCSS 3.4.15 ✅
- Radix UI (composants UI) ✅
  - @radix-ui/react-dialog
  - @radix-ui/react-dropdown-menu
  - @radix-ui/react-select
  - @radix-ui/react-tabs
  - etc.
- Recharts 3.4.1 (visualisations) ✅
- Lucide React 0.461.0 (icônes) ✅
- React Hook Form 7.53.2 + Zod 3.23.8 (formulaires) ✅
- Sonner 1.7.1 (toasts/notifications) ✅
- Class Variance Authority (styling patterns) ✅
```

**❌ NON UTILISÉ dans l'app actuelle:**
- TanStack Query (pas dans package.json)
- Zustand (pas dans package.json)
- shadcn/ui est utilisé mais via Radix UI + class-variance-authority

#### Backend ✅
```typescript
// Confirmé via src/app/api/**/*.ts
- Next.js API Routes (pattern: /api/companies/[slug]/...) ✅
- Drizzle ORM 0.36.4 ✅
- PostgreSQL (via postgres 3.4.5, pas pg-pool) ✅
- Next-Auth 5.0.0-beta.25 (auth) ✅
- Vercel Blob Storage (@vercel/blob 2.0.0) ✅
```

**❌ NON UTILISÉ:**
- tRPC (pas dans package.json ni code)
- Redis (pas dans package.json)
- BullMQ (pas dans package.json)
- Pattern utilisé: API Routes simples + polling pour async tasks

#### AI/ML ✅
```typescript
// Confirmé via src/lib/ai/unified-client.ts et src/lib/constants/ai-models.ts
- OpenAI SDK 4.75.0 (GPT-5, GPT-4o) ✅
- Anthropic SDK @anthropic-ai/sdk 0.32.1 ✅
- Claude Sonnet 4.5 (claude-sonnet-4-5-20250929) ✅
- Claude Haiku 4.5 (claude-haiku-4-5-20251001) ✅
- Pinecone Database 6.1.3 (RAG) ✅
- AI SDK @ai-sdk/anthropic 1.0.2 ✅

// Pattern: UnifiedAIClient (singleton)
// src/lib/ai/unified-client.ts
```

#### Scraping & Processing ✅
```typescript
// DÉJÀ INSTALLÉ dans package.json!
- Playwright 1.56.1 ✅
- @playwright/test 1.56.1 ✅
- ExcelJS 4.4.0 ✅
- PDF-parse 1.1.4 ✅
- Mammoth 1.11.0 (docx) ✅
- XLSX 0.18.5 ✅
```

**✅ EXCELLENT:** Tous les outils de scraping nécessaires sont déjà disponibles!

#### Database Schema Pattern ✅
```typescript
// Confirmé via src/db/schema.ts
- Drizzle ORM avec PostgreSQL dialect ✅
- Pattern IDs: createId() de @paralleldrive/cuid2 (VARCHAR 255) ✅
  Exemple: id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey()

- Pour certains modules (RFPs): uuid v4 (pgUuid)
  Exemple: id: pgUuid("id").$defaultFn(() => uuidv4()).primaryKey()

- Multi-tenancy: companyId references companies(id)
- JSONB pour données flexibles (settings, metadata) ✅
- Timestamps: timestamp("created_at").notNull().defaultNow() ✅
- Relations: relations() de drizzle-orm ✅
- Soft deletes: deletedAt: timestamp("deleted_at") ✅
```

#### Auth & Permissions Pattern ✅
```typescript
// Confirmé via src/lib/auth/helpers.ts et src/app/api/companies/[slug]/documents/upload/route.ts
- Next-Auth session-based ✅
- Multi-tenancy via companyMembers junction table ✅
- Roles: "admin", "editor", "viewer" ✅

// Pattern standard:
const { error: authError, session } = await verifyAuth();
const currentCompany = await getCurrentCompany();
if (!hasPermission(currentCompany.role, "editor")) {
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
}
```

#### API Routes Pattern ✅
```typescript
// Pattern confirmé: /api/companies/[slug]/...
✅ /api/companies/[slug]/documents/upload
✅ /api/companies/[slug]/rfps/[id]/...
✅ /api/companies/[slug]/analytics
✅ /api/companies/[slug]/settings

// Tous les endpoints pricing devraient suivre:
/api/companies/[slug]/pricing/...
```

#### Storage Pattern ✅
```typescript
// Confirmé via upload route
- Vercel Blob Storage (@vercel/blob) ✅

const blob = await put(
  `documents/${companyId}/${timestamp}-${filename}`,
  buffer,
  { access: 'public', contentType: file.type }
);
```

**❌ NON UTILISÉ:**
- AWS S3 (plan mentionne S3, mais l'app utilise Vercel Blob)

---

## ⚠️ Divergences Critiques Identifiées

### 1. **Job Queue System** ❌

**Plan actuel:**
```typescript
- BullMQ (job queue)
- Redis (required for BullMQ)
```

**Problème:** BullMQ et Redis ne sont **PAS** installés ni utilisés dans la plateforme.

**Solution recommandée:**

**Option A (Recommandée - Alignement existant):** Polling Pattern comme RFP Module
```typescript
// Pattern déjà utilisé pour RFPs (async parsing)
// src/db/schema.ts - rfps table

export const pricingScans = pgTable("pricing_scans", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .references(() => companies.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id", { length: 255 })
    .references(() => pricingCompetitors.id, { onDelete: "cascade" }),

  // Status tracking (NO BullMQ needed)
  status: varchar("status", { length: 50 }).default("pending"), // pending, running, completed, failed

  // Progress tracking (real-time updates via API polling)
  currentStep: varchar("current_step", { length: 100 }),
  progressCurrent: integer("progress_current").default(0),
  progressTotal: integer("progress_total").default(0),

  // Results
  productsScraped: integer("products_scraped").default(0),
  productsMatched: integer("products_matched").default(0),
  productsFailed: integer("products_failed").default(0),

  // Logs
  logs: jsonb("logs").$type<Array<{
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'progress';
    message: string;
  }>>().default([]),

  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// API Pattern: Long-running task with polling
// POST /api/companies/[slug]/pricing/scans - Start scan
// GET /api/companies/[slug]/pricing/scans/[id]/progress - Poll progress
```

**Option B (Si jobs complexes requis):** Vercel Cron + Edge Functions
```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/pricing-scans",
    "schedule": "0 7 * * *" // Daily at 7am
  }]
}

// Background processing via Vercel Functions (10min max execution)
// Pour scans longs: Split en batches + checkpointing
```

### 2. **State Management** ❌

**Plan actuel:**
```typescript
- Zustand (state management)
```

**Problème:** Zustand n'est **PAS** utilisé. L'app utilise React state + server state via fetch.

**Solution:**
```typescript
// Pattern existant: React state + server fetching
// Pas de global state manager nécessaire

// Pour data fetching, utiliser le pattern existant:
const [data, setData] = useState<PricingData | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch(`/api/companies/${slug}/pricing/overview`)
    .then(res => res.json())
    .then(setData)
    .finally(() => setLoading(false));
}, [slug]);

// Pour real-time updates (polling pattern comme RFPs):
useEffect(() => {
  if (status === 'running') {
    const interval = setInterval(() => {
      fetch(`/api/companies/${slug}/pricing/scans/${scanId}/progress`)
        .then(res => res.json())
        .then(updateProgress);
    }, 2000);
    return () => clearInterval(interval);
  }
}, [status]);
```

### 3. **Type-Safe APIs** ❌

**Plan actuel:**
```typescript
- tRPC (type-safe APIs)
```

**Problème:** tRPC n'est **PAS** utilisé. L'app utilise Next.js API Routes simples.

**Solution:**
```typescript
// Pattern existant: Next.js API Routes + Zod validation
// src/app/api/companies/[slug]/pricing/products/route.ts

import { z } from 'zod';

const ProductUploadSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  category: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // 1. Auth
  const { session } = await verifyAuth();
  const currentCompany = await getCurrentCompany();

  // 2. Validate input
  const body = await request.json();
  const validation = ProductUploadSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // 3. Process
  const product = await db.insert(pricingProducts).values({
    companyId: currentCompany.company.id,
    ...validation.data
  });

  return NextResponse.json({ product });
}
```

### 4. **Database IDs** ⚠️

**Plan actuel:**
```sql
CREATE TABLE pricing_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ...
);
```

**Problème:** Le plan utilise UUID partout, mais l'app utilise principalement **CUID2** (createId).

**Solution (Cohérence avec pattern existant):**
```typescript
// Pattern recommandé: CUID2 comme le reste de l'app
export const pricingProducts = pgTable("pricing_products", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // OU si vraiment besoin UUID (comme RFPs):
  // id: pgUuid("id").$defaultFn(() => uuidv4()).primaryKey(),

  sku: varchar("sku", { length: 255 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  // ...
});
```

**Recommandation:** Utiliser CUID2 (createId) pour cohérence, sauf raison spécifique pour UUID.

### 5. **Storage Backend** ❌

**Plan actuel:**
```typescript
Infrastructure:
- S3 (AWS) - $100/mois - File storage (exports)
```

**Problème:** L'app utilise **Vercel Blob Storage**, pas S3.

**Solution:**
```typescript
// Utiliser Vercel Blob pour exports Excel
import { put } from '@vercel/blob';

// Export pricing report
const blob = await put(
  `pricing-exports/${companyId}/${timestamp}-report.xlsx`,
  excelBuffer,
  {
    access: 'public',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
);

// Return download URL
return NextResponse.json({ downloadUrl: blob.url });
```

### 6. **Cache Layer** ⚠️

**Plan actuel:**
```typescript
- Redis (caching, sessions)
```

**Problème:** Redis n'est **PAS** installé.

**Solutions:**

**Option A (Recommandée):** PostgreSQL comme cache
```typescript
// Table de cache simple
export const pricingCache = pgTable("pricing_cache", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 }).notNull(),
  cacheKey: varchar("cache_key", { length: 255 }).notNull(),
  cacheValue: jsonb("cache_value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Helper
async function getCached<T>(companyId: string, key: string): Promise<T | null> {
  const [cached] = await db
    .select()
    .from(pricingCache)
    .where(
      and(
        eq(pricingCache.companyId, companyId),
        eq(pricingCache.cacheKey, key),
        gt(pricingCache.expiresAt, new Date())
      )
    )
    .limit(1);

  return cached ? (cached.cacheValue as T) : null;
}
```

**Option B (Si performance critique):** Ajouter Upstash Redis
```typescript
// Seulement si vraiment nécessaire (coût additionnel)
// Upstash Redis (serverless, Vercel-friendly)
import { Redis } from '@upstash/redis';
```

**Recommandation:** Commencer avec PostgreSQL cache (Option A), migrer vers Redis seulement si bottleneck identifié.

### 7. **Monitoring & Observability** ⚠️

**Plan actuel:**
```typescript
Infrastructure:
- Sentry - $100/mois - Error tracking
- Datadog - $300/mois - APM, logs, metrics
```

**Problème:** Ni Sentry ni Datadog ne sont installés dans package.json.

**Solution:**

**Phase MVP:** Logs natifs + Vercel Analytics
```typescript
// Pattern: Console.log avec structure
console.log(`[pricing-scan] Starting scan for competitor ${competitorId}`, {
  companyId,
  productsCount,
  timestamp: new Date().toISOString()
});

// Vercel fournit:
// - Logs automatiques
// - Analytics
// - Performance metrics
// - Error tracking basique
```

**Phase 2 (si budget disponible):** Ajouter Sentry
```bash
npm install @sentry/nextjs
```

**Recommandation:** MVP sans monitoring externe, ajouter Phase 2 si justifié par volume.

---

## ✅ Stack Technologique Révisé - Module Pricing

### Frontend (Aligné avec existant)
```typescript
✅ Next.js 15.0.3 (App Router)
✅ React 19.0.0-rc.1
✅ TypeScript 5.9.3
✅ TailwindCSS 3.4.15
✅ Radix UI (composants: Dialog, Dropdown, Select, Tabs, Toast, etc.)
✅ Recharts 3.4.1 (graphiques)
✅ Lucide React 0.461.0 (icônes)
✅ React Hook Form 7.53.2 + Zod 3.23.8 (forms)
✅ Sonner 1.7.1 (notifications)
✅ Class Variance Authority (styling patterns)

❌ RETIRER:
- TanStack Query
- Zustand
- shadcn/ui (déjà via Radix UI)
```

### Backend (Aligné avec existant)
```typescript
✅ Next.js API Routes (pattern: /api/companies/[slug]/pricing/...)
✅ Drizzle ORM 0.36.4
✅ PostgreSQL (postgres 3.4.5)
✅ Next-Auth 5.0.0-beta.25
✅ Vercel Blob Storage 2.0.0
✅ CUID2 IDs (@paralleldrive/cuid2)
✅ UUID v4 (uuid 13.0.0) - si besoin spécifique

🆕 AJOUTER (optionnel Phase 2):
- Upstash Redis (seulement si cache haute performance requis)

❌ RETIRER:
- tRPC
- Redis (dans MVP)
- BullMQ
- S3
```

### Scraping & Processing (Déjà disponible!)
```typescript
✅ Playwright 1.56.1 (DÉJÀ INSTALLÉ)
✅ @playwright/test 1.56.1 (DÉJÀ INSTALLÉ)
✅ ExcelJS 4.4.0 (DÉJÀ INSTALLÉ)
✅ String-similarity (ou alternative pour matching)

🆕 Pattern: playwright-extra pour stealth (si anti-bot detecté)
npm install playwright-extra puppeteer-extra-plugin-stealth
```

### AI/ML (Déjà configuré!)
```typescript
✅ OpenAI SDK 4.75.0 (GPT-5, GPT-4o)
✅ Anthropic SDK 0.32.1 (Claude Sonnet 4.5, Haiku 4.5)
✅ Pattern: UnifiedAIClient (src/lib/ai/unified-client.ts)
✅ Models constants (src/lib/constants/ai-models.ts)

// Utiliser le même pattern pour pricing recommendations:
import { getUnifiedAIClient } from '@/lib/ai/unified-client';
import { CLAUDE_MODELS } from '@/lib/constants/ai-models';

const aiClient = getUnifiedAIClient();
const response = await aiClient.generate(companyId, {
  promptKey: 'pricing_recommendation',
  variables: { productData, competitorPrices },
  model: CLAUDE_MODELS.sonnet
});
```

### Database Pattern (Drizzle ORM)
```typescript
// src/db/schema-pricing.ts (nouveau fichier)
import { pgTable, varchar, timestamp, boolean, integer, text, jsonb, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { companies } from "./schema"; // Import existing

export const pricingProducts = pgTable("pricing_products", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  sku: varchar("sku", { length: 255 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  nameCleaned: varchar("name_cleaned", { length: 500 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  category: varchar("category", { length: 255 }),

  currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("CAD"),
  unit: varchar("unit", { length: 50 }),

  characteristics: jsonb("characteristics").$type<{
    types: string[];
    materials: string[];
    sizes: string[];
    features: string[];
  }>(),

  imageUrl: varchar("image_url", { length: 1000 }),
  productUrl: varchar("product_url", { length: 1000 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete
}, (table) => ({
  companySkuIdx: index("pricing_products_company_sku_idx").on(table.companyId, table.sku),
  categoryIdx: index("pricing_products_category_idx").on(table.category),
  brandIdx: index("pricing_products_brand_idx").on(table.brand),
  activeIdx: index("pricing_products_active_idx").on(table.isActive),
}));

export const pricingCompetitors = pgTable("pricing_competitors", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: varchar("website_url", { length: 1000 }).notNull(),
  logoUrl: varchar("logo_url", { length: 1000 }),

  scraperConfig: jsonb("scraper_config").$type<{
    baseUrl: string;
    selectors: {
      productName: string;
      price: string;
      sku?: string;
    };
    pagination?: object;
  }>().notNull(),

  isActive: boolean("is_active").notNull().default(true),
  scanFrequency: varchar("scan_frequency", { length: 50 }).default("weekly"), // daily, weekly, monthly

  lastScanAt: timestamp("last_scan_at"),
  nextScanAt: timestamp("next_scan_at"),

  totalScans: integer("total_scans").default(0),
  successfulScans: integer("successful_scans").default(0),
  failedScans: integer("failed_scans").default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pricingMatches = pgTable("pricing_matches", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  productId: varchar("product_id", { length: 255 })
    .notNull()
    .references(() => pricingProducts.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id", { length: 255 })
    .notNull()
    .references(() => pricingCompetitors.id, { onDelete: "cascade" }),

  competitorProductName: varchar("competitor_product_name", { length: 500 }).notNull(),
  competitorProductUrl: varchar("competitor_product_url", { length: 1000 }),
  competitorSku: varchar("competitor_sku", { length: 255 }),

  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("CAD"),

  matchType: varchar("match_type", { length: 50 }).notNull(), // sku, name, characteristic
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).notNull(),
  matchDetails: jsonb("match_details"),

  inStock: boolean("in_stock").default(true),
  promoActive: boolean("promo_active").default(false),
  promoDetails: text("promo_details"),

  lastScrapedAt: timestamp("last_scraped_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  productCompetitorIdx: index("pricing_matches_product_competitor_idx").on(table.productId, table.competitorId),
}));

export const pricingScans = pgTable("pricing_scans", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id", { length: 255 })
    .notNull()
    .references(() => pricingCompetitors.id, { onDelete: "cascade" }),

  status: varchar("status", { length: 50 }).default("pending"), // pending, running, completed, failed
  currentStep: varchar("current_step", { length: 100 }),
  progressCurrent: integer("progress_current").default(0),
  progressTotal: integer("progress_total").default(0),

  productsScraped: integer("products_scraped").default(0),
  productsMatched: integer("products_matched").default(0),
  productsFailed: integer("products_failed").default(0),

  logs: jsonb("logs").$type<Array<{
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'progress';
    message: string;
  }>>().default([]),

  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const pricingProductsRelations = relations(pricingProducts, ({ one, many }) => ({
  company: one(companies, {
    fields: [pricingProducts.companyId],
    references: [companies.id],
  }),
  matches: many(pricingMatches),
}));

export const pricingCompetitorsRelations = relations(pricingCompetitors, ({ one, many }) => ({
  company: one(companies, {
    fields: [pricingCompetitors.companyId],
    references: [companies.id],
  }),
  matches: many(pricingMatches),
  scans: many(pricingScans),
}));
```

### API Routes Pattern
```typescript
// Structure: /api/companies/[slug]/pricing/...

✅ /api/companies/[slug]/pricing/products
   - GET: List products (paginated, filtered)
   - POST: Upload catalog (CSV/Excel)

✅ /api/companies/[slug]/pricing/products/[id]
   - GET: Product details + matches
   - PATCH: Update product
   - DELETE: Delete product (soft delete)

✅ /api/companies/[slug]/pricing/competitors
   - GET: List competitors
   - POST: Add competitor

✅ /api/companies/[slug]/pricing/competitors/[id]
   - GET: Competitor config
   - PATCH: Update config
   - DELETE: Remove competitor

✅ /api/companies/[slug]/pricing/scans
   - POST: Launch scan (async task)
   - GET: List scan history

✅ /api/companies/[slug]/pricing/scans/[id]/progress
   - GET: Poll scan progress (real-time updates)

✅ /api/companies/[slug]/pricing/analytics/overview
   - GET: Dashboard KPIs

✅ /api/companies/[slug]/pricing/export
   - POST: Generate Excel report
```

---

## 📋 Checklist de Migration

### Phase 1 MVP - Corrections Immédiates

#### Database Schema
- [ ] Créer `src/db/schema-pricing.ts` avec Drizzle tables
- [ ] Utiliser `createId()` pour IDs (cohérence CUID2)
- [ ] Pattern `companyId` references pour multi-tenancy
- [ ] JSONB pour `characteristics`, `scraperConfig`, `logs`
- [ ] Indexes sur colonnes fréquemment requêtées
- [ ] Soft delete avec `deletedAt` timestamp

#### Backend Services
- [ ] **RETIRER** mentions de BullMQ/Redis du plan
- [ ] Implémenter pattern polling pour scans async (comme RFPs)
- [ ] Utiliser Next.js API Routes (pas tRPC)
- [ ] Auth: `verifyAuth()` + `getCurrentCompany()` + `hasPermission()`
- [ ] Vercel Blob Storage pour exports Excel (pas S3)
- [ ] PostgreSQL cache table (pas Redis dans MVP)

#### Frontend Components
- [ ] **RETIRER** mentions de Zustand
- [ ] **RETIRER** mentions de TanStack Query
- [ ] Utiliser Radix UI (Dialog, Select, Tabs, etc.)
- [ ] Sonner pour toasts
- [ ] Recharts pour graphiques
- [ ] Lucide React pour icônes
- [ ] React Hook Form + Zod pour formulaires

#### AI Integration
- [ ] Utiliser `UnifiedAIClient` existant
- [ ] Import de `CLAUDE_MODELS` constants
- [ ] Créer prompts pricing dans table `promptTemplates`
- [ ] Pattern: `aiClient.generate(companyId, { promptKey, variables })`

#### Scraping Engine
- [ ] ✅ Playwright déjà installé (1.56.1)
- [ ] ✅ ExcelJS déjà installé (4.4.0)
- [ ] Considérer `playwright-extra` si anti-bot détecté
- [ ] Réutiliser code Dissan/price-scraper si applicable
- [ ] Checkpointing dans DB (pas fichiers JSON)

### Phase 2 - Optimisations (Si Nécessaire)

#### Performance
- [ ] Évaluer besoin Redis cache (Upstash serverless)
- [ ] Monitoring: Ajouter Sentry si volume justifie
- [ ] Index DB optimization basé sur query patterns réels

#### Scaling
- [ ] Vercel Cron pour scans schedulés
- [ ] Edge Functions si latence critique
- [ ] CDN Cloudflare pour assets statiques

---

## 💰 Budget Infrastructure Révisé

### Année 1 (Aligné avec stack existant)

| Catégorie | Service | Coût Mensuel | Coût An 1 | Notes |
|-----------|---------|--------------|-----------|-------|
| **Compute** | Vercel Pro | Inclus | $0 | Déjà payé pour plateforme |
| **Database** | PostgreSQL (Vercel/Supabase) | Inclus | $0 | Scaling si nécessaire |
| **AI APIs** | OpenAI (GPT-5) | $500 | $6K | Pricing recommendations |
| | Anthropic (Claude) | $200 | $2.4K | Long-context analysis |
| **Storage** | Vercel Blob | $50 | $600 | Exports, scraping cache |
| **Scraping** | Proxies rotatifs | $150 | $1.8K | Anti-bot bypass |
| **Monitoring** | Vercel Analytics | Inclus | $0 | Basique suffit MVP |
| **TOTAL INFRA** | | **$900/mois** | **$10.8K/an** | ✅ **-74% vs plan initial ($42K)** |

**Économies réalisées:** $31.2K/an en réutilisant infrastructure existante!

### Coûts Évités (vs Plan Initial)

| Service Retiré | Économie Annuelle |
|----------------|-------------------|
| Redis (Upstash) | -$1.2K |
| Render Workers (BullMQ) | -$3.6K |
| Sentry | -$1.2K |
| Datadog | -$3.6K |
| AWS S3 | -$1.2K |
| PostgreSQL séparé | -$2.4K |
| Autres (Cloudflare Pro, SendGrid reduction) | -$2K |
| **TOTAL ÉCONOMIES** | **-$15.2K/an** |

---

## 🎯 Recommandations Finales

### 1. **Prioriser Réutilisation**
✅ **90% de la stack nécessaire est déjà installée**
- Playwright, ExcelJS, Drizzle ORM, AI clients, Auth
- Pas besoin d'ajouter Redis, BullMQ, tRPC, Zustand

### 2. **Pattern Consistency**
✅ **Suivre exactement les patterns RFP module**
- Async tasks: Polling pattern (pas job queue)
- Database: CUID2 IDs + JSONB + soft deletes
- APIs: `/api/companies/[slug]/...`
- Auth: verifyAuth() → getCurrentCompany() → hasPermission()

### 3. **MVP Lean**
✅ **Commencer minimal, scaler si nécessaire**
- PostgreSQL cache (pas Redis tout de suite)
- Vercel logs (pas Sentry/Datadog tout de suite)
- Server state simple (pas Zustand/TanStack Query)

### 4. **Budget Réaliste**
✅ **Infrastructure: $10.8K/an (vs $42K planifié)**
- Focus budget sur développeurs (ressources humaines)
- Infrastructure incrémentale selon adoption réelle

### 5. **Timeline Réaliste**
✅ **Réutilisation accélère développement**
- Phase 1 MVP: 10 semaines (vs 12) grâce à composants existants
- Scraper engine: Code Dissan réutilisable directement

---

## 📎 Prochaines Étapes

1. **Valider cette révision** avec Product + Engineering Lead
2. **Mettre à jour** `plan-initial-pricing.md` sections 5, 9, 10
3. **Créer** `src/db/schema-pricing.ts` avec schema corrigé
4. **Documenter** API endpoints pattern avec exemples concrets
5. **Spike technique** (2 jours):
   - Tester polling pattern pour async scans
   - Valider Playwright stealth mode sur 3 sites concurrents
   - Confirmer Vercel Blob pour exports >10MB

**Date cible correction plan:** 22 novembre 2025
**Kickoff développement:** 2 décembre 2025 (après validation)

---

**Auteur:** Architecte Technique
**Reviewers requis:** Product Lead, Engineering Lead, DevOps
**Status:** ⚠️ Corrections requises avant développement
