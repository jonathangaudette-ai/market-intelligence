-- Migration: Add needs_revalidation to pricing_matches
-- Purpose: Enable URL caching optimization to skip GPT-5 on subsequent scans

ALTER TABLE "pricing_matches"
ADD COLUMN "needs_revalidation" boolean DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "pricing_matches"."needs_revalidation" IS 'Flag to force re-searching and re-matching with GPT-5 on next scan (manual trigger only)';
