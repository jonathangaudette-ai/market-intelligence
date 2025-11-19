-- Migration 0015: Add company_slug to pricing_competitors
-- Date: 2025-01-19
-- Purpose: Enable Railway worker to select appropriate scraper via ScraperFactory

-- 1. Add column (nullable initially to allow data population)
ALTER TABLE pricing_competitors
ADD COLUMN IF NOT EXISTS company_slug VARCHAR(255);

-- 2. Populate company_slug from companies table
UPDATE pricing_competitors pc
SET company_slug = c.slug
FROM companies c
WHERE pc.company_id = c.id
  AND pc.company_slug IS NULL;

-- 3. Make column NOT NULL (after population)
ALTER TABLE pricing_competitors
ALTER COLUMN company_slug SET NOT NULL;

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_pricing_competitors_company_slug
ON pricing_competitors(company_slug);

-- Verification query (commented out for automated runs)
-- SELECT
--   pc.id,
--   pc.name AS competitor_name,
--   pc.company_slug,
--   c.slug AS company_slug_from_join
-- FROM pricing_competitors pc
-- INNER JOIN companies c ON pc.company_id = c.id
-- LIMIT 5;
