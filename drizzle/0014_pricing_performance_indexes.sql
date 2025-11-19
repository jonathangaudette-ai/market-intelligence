-- Migration 0014: Add Performance Indexes for Pricing Module
-- Created: 2025-11-19
-- Purpose: Optimize frequent queries on pricing tables
-- Note: Many indexes already exist in schema, this adds the missing ones

-- Composite index for product-specific history queries (time-series charts)
-- Optimizes: SELECT * FROM pricing_history WHERE product_id = X ORDER BY recorded_at DESC
CREATE INDEX IF NOT EXISTS idx_pricing_history_product_date
ON pricing_history(product_id, recorded_at DESC);

-- Composite index for active products by company (catalog listing)
-- Optimizes: SELECT * FROM pricing_products WHERE company_id = X AND is_active = true
CREATE INDEX IF NOT EXISTS idx_pricing_products_company_active
ON pricing_products(company_id, is_active);

-- Composite index for matches sorted by confidence (match results page)
-- Optimizes: SELECT * FROM pricing_matches WHERE product_id = X ORDER BY confidence_score DESC
CREATE INDEX IF NOT EXISTS idx_pricing_matches_product_confidence
ON pricing_matches(product_id, confidence_score DESC);

-- Index on alert event severity (filter critical/warning alerts)
-- Optimizes: SELECT * FROM pricing_alert_events WHERE severity = 'critical'
CREATE INDEX IF NOT EXISTS idx_pricing_alert_events_severity
ON pricing_alert_events(severity, triggered_at DESC);

-- Composite index for competitor-specific price history
-- Optimizes: SELECT * FROM pricing_history WHERE competitor_id = X ORDER BY recorded_at DESC
CREATE INDEX IF NOT EXISTS idx_pricing_history_competitor_date
ON pricing_history(competitor_id, recorded_at DESC)
WHERE competitor_id IS NOT NULL;
