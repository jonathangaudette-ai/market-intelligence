-- Migration: Refactor pricing_history to use productId + competitorId instead of matchId
-- Phase 8: Historique & Time-Series

-- Drop existing data (safe since no historical data exists yet in Phase 7)
TRUNCATE TABLE "pricing_history";

-- Drop old foreign key constraint and index
DROP INDEX IF EXISTS "pricing_history_match_id_idx";
ALTER TABLE "pricing_history" DROP COLUMN IF EXISTS "match_id";

-- Add new columns
ALTER TABLE "pricing_history" ADD COLUMN "product_id" varchar(255) NOT NULL REFERENCES "pricing_products"("id") ON DELETE CASCADE;
ALTER TABLE "pricing_history" ADD COLUMN "competitor_id" varchar(255) REFERENCES "pricing_competitors"("id") ON DELETE CASCADE;
ALTER TABLE "pricing_history" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;

-- Create new indexes
CREATE INDEX IF NOT EXISTS "pricing_history_product_id_idx" ON "pricing_history" ("product_id");
CREATE INDEX IF NOT EXISTS "pricing_history_competitor_id_idx" ON "pricing_history" ("competitor_id");
CREATE INDEX IF NOT EXISTS "pricing_history_recorded_at_idx" ON "pricing_history" ("recorded_at");
