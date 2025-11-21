/**
 * PRICING MODULE - DRIZZLE SCHEMA
 *
 * ✅ Aligné avec l'architecture existante Market Intelligence
 * ✅ Pattern CUID2 pour IDs (cohérence)
 * ✅ Multi-tenancy via companyId
 * ✅ JSONB pour flexibilité
 * ✅ Soft deletes avec deletedAt
 *
 * Fichier destination: src/db/schema-pricing.ts
 */

import { pgTable, varchar, timestamp, boolean, integer, text, jsonb, decimal, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { companies, users } from "./schema"; // Import existing tables

// ============================================
// Products Catalog
// ============================================
export const pricingProducts = pgTable("pricing_products", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // Product Identity
  sku: varchar("sku", { length: 255 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  nameCleaned: varchar("name_cleaned", { length: 500 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  category: varchar("category", { length: 255 }),

  // Pricing
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("CAD"),
  unit: varchar("unit", { length: 50 }),

  // Characteristics (for matching)
  characteristics: jsonb("characteristics").$type<{
    types: string[];
    materials: string[];
    sizes: string[];
    features: string[];
  }>(),

  // Metadata
  imageUrl: varchar("image_url", { length: 1000 }),
  productUrl: varchar("product_url", { length: 1000 }),
  notes: text("notes"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete
}, (table) => ({
  // Unique constraint: one SKU per company
  companySkuUnique: unique("pricing_products_company_sku_unique").on(table.companyId, table.sku),
  // Indexes for performance
  categoryIdx: index("pricing_products_category_idx").on(table.category),
  brandIdx: index("pricing_products_brand_idx").on(table.brand),
  activeIdx: index("pricing_products_active_idx").on(table.isActive),
}));

// ============================================
// Competitors Configuration
// ============================================
export const pricingCompetitors = pgTable("pricing_competitors", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  companySlug: varchar("company_slug", { length: 255 }).notNull(),

  // Competitor Info
  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: varchar("website_url", { length: 1000 }).notNull(),
  logoUrl: varchar("logo_url", { length: 1000 }),

  // Scraping Config (Extended for Playwright, Apify, API, ScrapingBee)
  scraperConfig: jsonb("scraper_config").$type<{
    // Scraper Type Selection
    scraperType: 'playwright' | 'apify' | 'api' | 'scrapingbee';

    // ========================================
    // PLAYWRIGHT CONFIGURATION
    // ========================================
    playwright?: {
      // Search Configuration
      search: {
        url: string;              // e.g., https://swish.ca/search
        method: 'GET' | 'POST';   // Usually GET
        param: string;            // Query param name (e.g., 'q', 'search', 'keyword')
        searchBoxSelector?: string;   // If search requires filling a form
        searchButtonSelector?: string; // If search requires clicking submit
      };

      // CSS Selectors (8 core selectors)
      selectors: {
        productList: string;        // Container for product list items (e.g., 'li.product')
        productLink: string;        // Link to product detail page (e.g., 'a.product-link')
        productName: string;        // Product name (e.g., '.product-name')
        productSku?: string;        // SKU/model number (e.g., '.sku')
        productPrice: string;       // Price (e.g., '.price')
        productImage?: string;      // Product image URL (e.g., 'img.product-image')
        inStockIndicator?: string;  // In-stock status (e.g., '.in-stock')
        noResults?: string;         // No results message (e.g., '.no-results')
      };

      // Pagination Strategy
      pagination?: {
        enabled: boolean;
        type: 'button-click' | 'url-param' | 'infinite-scroll';
        selector?: string;          // Pagination button/link selector
        urlPattern?: string;        // URL pattern for page parameter (e.g., '&page={page}')
        maxPages: number;           // Safety limit (default: 5)
      };

      // Rate Limiting
      rateLimiting?: {
        requestDelay: number;   // Delay between requests in ms (default: 2000)
        productDelay: number;   // Delay between products in ms (default: 1000)
      };

      // Advanced Options
      advanced?: {
        useProxy?: boolean;
        requiresAuth?: boolean;
        userAgent?: string;
        viewport?: { width: number; height: number };
        waitForSelector?: string;   // Wait for specific element before scraping
      };
    };

    // ========================================
    // APIFY CONFIGURATION
    // ========================================
    apify?: {
      actorId: string;          // Apify Actor ID (e.g., 'apify/web-scraper')
      inputSchema: Record<string, any>; // Custom input for the actor
    };

    // ========================================
    // API CONFIGURATION
    // ========================================
    api?: {
      endpoint: string;         // API base URL
      method: 'GET' | 'POST';
      headers?: Record<string, string>;
      auth?: {
        type: 'bearer' | 'basic' | 'api-key';
        credentials: Record<string, string>;
      };
    };

    // ========================================
    // SCRAPINGBEE CONFIGURATION
    // ========================================
    scrapingbee?: {
      // API Parameters
      api: {
        premium_proxy: boolean;          // Default: true (required for Cloudflare)
        country_code: string;            // Default: 'ca'
        render_js: boolean;              // Default: true
        wait: number;                    // Default: 10000 (ms)
        block_ads: boolean;              // Default: true
        block_resources: boolean;        // Default: false
        wait_for?: string;               // Optional CSS selector to wait for
        timeout: number;                 // Default: 120000 (ms)
      };

      // CSS Selectors (with fallback support)
      selectors: {
        productName: string[];           // Fallback selectors for product name
        productPrice: string[];          // Fallback selectors for price
        productSku?: string[];           // Optional: SKU selectors
        productImage?: string[];         // Optional: Image selectors
        availability?: string[];         // Optional: Stock status selectors
      };

      // Search Configuration
      search: {
        url: string;                     // Base search URL
        method: 'GET' | 'POST';          // Default: 'GET'
        param: string;                   // Query parameter name (e.g., 'q')
      };
    };
  }>().notNull(),

  isActive: boolean("is_active").notNull().default(true),

  // Scheduling
  scanFrequency: varchar("scan_frequency", { length: 50 }).default("weekly"),
  customCron: text("custom_cron"),
  lastScanAt: timestamp("last_scan_at"),
  nextScanAt: timestamp("next_scan_at"),

  // Stats
  totalScans: integer("total_scans").default(0),
  successfulScans: integer("successful_scans").default(0),
  failedScans: integer("failed_scans").default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  companyNameIdx: index("pricing_competitors_company_name_idx").on(table.companyId, table.name),
  companySlugIdx: index("pricing_competitors_company_slug_idx").on(table.companySlug),
}));

// ============================================
// Competitor Product Matches
// ============================================
export const pricingMatches = pgTable("pricing_matches", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  productId: varchar("product_id", { length: 255 })
    .notNull()
    .references(() => pricingProducts.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id", { length: 255 })
    .notNull()
    .references(() => pricingCompetitors.id, { onDelete: "cascade" }),

  // Match Info
  competitorProductName: varchar("competitor_product_name", { length: 500 }).notNull(),
  competitorProductUrl: varchar("competitor_product_url", { length: 1000 }),
  competitorSku: varchar("competitor_sku", { length: 255 }),

  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("CAD"),

  // Matching Details
  matchType: varchar("match_type", { length: 50 }).notNull(), // sku, name, characteristic, ai
  matchSource: varchar("match_source", { length: 50 }).default("manual"), // gpt5-search, manual, gpt5-post-scrape, existing-cache
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).notNull(),
  matchDetails: jsonb("match_details").$type<{
    matchedTypes?: string[];
    matchedMaterials?: string[];
    matchedSizes?: string[];
    matchedFeatures?: string[];
  }>(),

  // Metadata
  inStock: boolean("in_stock").default(true),
  promoActive: boolean("promo_active").default(false),
  promoDetails: text("promo_details"),

  // Cache & Revalidation
  needsRevalidation: boolean("needs_revalidation").default(false).notNull(),

  // Timestamps
  lastScrapedAt: timestamp("last_scraped_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  productCompetitorIdx: index("pricing_matches_product_competitor_idx").on(table.productId, table.competitorId),
  matchTypeIdx: index("pricing_matches_match_type_idx").on(table.matchType),
  scrapedAtIdx: index("pricing_matches_scraped_at_idx").on(table.lastScrapedAt),
}));

// ============================================
// Price History (Time-Series)
// ============================================
export const pricingHistory = pgTable("pricing_history", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  productId: varchar("product_id", { length: 255 })
    .notNull()
    .references(() => pricingProducts.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id", { length: 255 })
    .references(() => pricingCompetitors.id, { onDelete: "cascade" }), // nullable for your own prices

  // Historical Data
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("CAD"),
  inStock: boolean("in_stock").default(true),
  promoActive: boolean("promo_active").default(false),

  // Event Metadata
  changePercentage: decimal("change_percentage", { precision: 5, scale: 2 }),
  changeReason: varchar("change_reason", { length: 50 }), // price_drop, price_increase, promo_start

  // Timestamps
  recordedAt: timestamp("recorded_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  productIdIdx: index("pricing_history_product_id_idx").on(table.productId),
  competitorIdIdx: index("pricing_history_competitor_id_idx").on(table.competitorId),
  recordedAtIdx: index("pricing_history_recorded_at_idx").on(table.recordedAt),
}));

// ============================================
// Scan Jobs (Async Task Tracking - Polling Pattern)
// ============================================
export const pricingScans = pgTable("pricing_scans", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id", { length: 255 })
    .notNull()
    .references(() => pricingCompetitors.id, { onDelete: "cascade" }),

  // Status tracking (polling pattern like RFPs)
  status: varchar("status", { length: 50 }).default("pending"), // pending, running, completed, failed
  currentStep: varchar("current_step", { length: 100 }),
  progressCurrent: integer("progress_current").default(0),
  progressTotal: integer("progress_total").default(0),

  // Results
  productsScraped: integer("products_scraped").default(0),
  productsMatched: integer("products_matched").default(0),
  productsFailed: integer("products_failed").default(0),

  // Logs (real-time updates)
  logs: jsonb("logs").$type<Array<{
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'progress';
    message: string;
    metadata?: Record<string, any>;
  }>>().default([]),

  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index("pricing_scans_company_id_idx").on(table.companyId),
  competitorIdIdx: index("pricing_scans_competitor_id_idx").on(table.competitorId),
  statusIdx: index("pricing_scans_status_idx").on(table.status),
  createdAtIdx: index("pricing_scans_created_at_idx").on(table.createdAt),
}));

// ============================================
// Catalog Import Jobs (Async Task Tracking - Polling Pattern)
// ============================================
export const pricingCatalogImports = pgTable("pricing_catalog_imports", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // File info
  filename: varchar("filename", { length: 500 }),
  fileSize: integer("file_size"),

  // Status tracking (polling pattern like RFPs)
  status: varchar("status", { length: 50 }).default("pending"), // pending, running, completed, failed
  currentStep: varchar("current_step", { length: 100 }),
  progressCurrent: integer("progress_current").default(0),
  progressTotal: integer("progress_total").default(0),

  // Results
  productsImported: integer("products_imported").default(0),
  productsFailed: integer("products_failed").default(0),

  // Error tracking
  errorMessage: text("error_message"),

  // Logs (real-time updates)
  logs: jsonb("logs").$type<Array<{
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'progress';
    message: string;
    metadata?: Record<string, any>;
  }>>().default([]),

  // Raw data from preview (avoids Vercel Blob dependency)
  rawData: jsonb("raw_data").$type<Array<Record<string, any>>>(),

  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index("pricing_catalog_imports_company_id_idx").on(table.companyId),
  statusIdx: index("pricing_catalog_imports_status_idx").on(table.status),
  createdAtIdx: index("pricing_catalog_imports_created_at_idx").on(table.createdAt),
}));

// ============================================
// Alert Rules
// ============================================
export const pricingAlertRules = pgTable("pricing_alert_rules", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // Rule Definition
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Conditions (JSONB for flexibility)
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // price_drop, price_increase, new_product, out_of_stock
  conditions: jsonb("conditions").$type<{
    competitors?: string[];
    categories?: string[];
    threshold?: number;
    operator?: '>' | '<' | '=' | '>=' | '<=';
  }>().notNull(),

  // Actions
  notificationChannels: jsonb("notification_channels").$type<{
    email?: boolean;
    slack?: boolean;
    webhook?: string;
  }>().notNull(),
  notificationFrequency: varchar("notification_frequency", { length: 50 }).default("realtime"),

  // State
  isActive: boolean("is_active").notNull().default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  triggerCount: integer("trigger_count").default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index("pricing_alert_rules_company_id_idx").on(table.companyId),
  activeIdx: index("pricing_alert_rules_active_idx").on(table.isActive),
}));

// ============================================
// Alert Events (Log)
// ============================================
export const pricingAlertEvents = pgTable("pricing_alert_events", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  ruleId: varchar("rule_id", { length: 255 })
    .notNull()
    .references(() => pricingAlertRules.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 255 })
    .references(() => pricingProducts.id, { onDelete: "set null" }),
  competitorId: varchar("competitor_id", { length: 255 })
    .references(() => pricingCompetitors.id, { onDelete: "set null" }),

  // Event Details
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical

  // Notification Status
  notificationSent: boolean("notification_sent").default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  notificationChannelsUsed: jsonb("notification_channels_used"),

  // User Actions
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 255 })
    .references(() => users.id, { onDelete: "set null" }),
  resolutionNote: text("resolution_note"),

  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
}, (table) => ({
  ruleIdIdx: index("pricing_alert_events_rule_id_idx").on(table.ruleId),
  triggeredAtIdx: index("pricing_alert_events_triggered_at_idx").on(table.triggeredAt),
  readIdx: index("pricing_alert_events_read_idx").on(table.isRead),
  resolvedIdx: index("pricing_alert_events_resolved_idx").on(table.isResolved),
}));

// ============================================
// AI Recommendations Cache
// ============================================
export const pricingAIRecommendations = pgTable("pricing_ai_recommendations", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  productId: varchar("product_id", { length: 255 })
    .notNull()
    .references(() => pricingProducts.id, { onDelete: "cascade" }),

  // Recommendations (Array of strategies)
  recommendations: jsonb("recommendations").$type<Array<{
    strategy: string;
    suggestedPrice: number;
    impact: {
      volumeChange?: number;
      revenueChange?: number;
      marginChange?: number;
    };
    justification: string;
    confidence: number;
  }>>().notNull(),

  // Metadata
  generatedByModel: varchar("generated_by_model", { length: 100 }).notNull(),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  basedOnDataUntil: timestamp("based_on_data_until").notNull(),

  // User Actions
  userAction: varchar("user_action", { length: 50 }), // applied, dismissed, modified
  userActionAt: timestamp("user_action_at"),

  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Cache expiry (default 7 days)
}, (table) => ({
  productIdIdx: index("pricing_ai_recommendations_product_id_idx").on(table.productId),
  generatedAtIdx: index("pricing_ai_recommendations_generated_at_idx").on(table.generatedAt),
}));

// ============================================
// Cache Table (PostgreSQL-based cache for MVP)
// ============================================
export const pricingCache = pgTable("pricing_cache", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  cacheKey: varchar("cache_key", { length: 255 }).notNull(),
  cacheValue: jsonb("cache_value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  companyKeyIdx: index("pricing_cache_company_key_idx").on(table.companyId, table.cacheKey),
  expiresAtIdx: index("pricing_cache_expires_at_idx").on(table.expiresAt),
}));

// ============================================
// Relations
// ============================================
export const pricingProductsRelations = relations(pricingProducts, ({ one, many }) => ({
  company: one(companies, {
    fields: [pricingProducts.companyId],
    references: [companies.id],
  }),
  matches: many(pricingMatches),
  history: many(pricingHistory),
  aiRecommendations: many(pricingAIRecommendations),
}));

export const pricingCompetitorsRelations = relations(pricingCompetitors, ({ one, many }) => ({
  company: one(companies, {
    fields: [pricingCompetitors.companyId],
    references: [companies.id],
  }),
  matches: many(pricingMatches),
  history: many(pricingHistory),
  scans: many(pricingScans),
}));

export const pricingMatchesRelations = relations(pricingMatches, ({ one }) => ({
  product: one(pricingProducts, {
    fields: [pricingMatches.productId],
    references: [pricingProducts.id],
  }),
  competitor: one(pricingCompetitors, {
    fields: [pricingMatches.competitorId],
    references: [pricingCompetitors.id],
  }),
}));

export const pricingHistoryRelations = relations(pricingHistory, ({ one }) => ({
  product: one(pricingProducts, {
    fields: [pricingHistory.productId],
    references: [pricingProducts.id],
  }),
  competitor: one(pricingCompetitors, {
    fields: [pricingHistory.competitorId],
    references: [pricingCompetitors.id],
  }),
}));

export const pricingScansRelations = relations(pricingScans, ({ one }) => ({
  company: one(companies, {
    fields: [pricingScans.companyId],
    references: [companies.id],
  }),
  competitor: one(pricingCompetitors, {
    fields: [pricingScans.competitorId],
    references: [pricingCompetitors.id],
  }),
}));

export const pricingAlertRulesRelations = relations(pricingAlertRules, ({ one, many }) => ({
  company: one(companies, {
    fields: [pricingAlertRules.companyId],
    references: [companies.id],
  }),
  events: many(pricingAlertEvents),
}));

export const pricingAlertEventsRelations = relations(pricingAlertEvents, ({ one }) => ({
  rule: one(pricingAlertRules, {
    fields: [pricingAlertEvents.ruleId],
    references: [pricingAlertRules.id],
  }),
  product: one(pricingProducts, {
    fields: [pricingAlertEvents.productId],
    references: [pricingProducts.id],
  }),
  competitor: one(pricingCompetitors, {
    fields: [pricingAlertEvents.competitorId],
    references: [pricingCompetitors.id],
  }),
  resolvedByUser: one(users, {
    fields: [pricingAlertEvents.resolvedBy],
    references: [users.id],
  }),
}));

export const pricingAIRecommendationsRelations = relations(pricingAIRecommendations, ({ one }) => ({
  product: one(pricingProducts, {
    fields: [pricingAIRecommendations.productId],
    references: [pricingProducts.id],
  }),
}));
