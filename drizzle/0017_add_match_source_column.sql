-- Migration: Add match_source column to pricing_matches
-- Created: 2025-01-19
-- Description: Track the source of product URL discovery (gpt5-search, manual, gpt5-post-scrape, existing-cache)

ALTER TABLE "pricing_matches" ADD COLUMN "match_source" varchar(50) DEFAULT 'manual';
