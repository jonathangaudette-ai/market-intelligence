-- Migration: Add description column to pricing_products table
-- Date: 2025-01-21

ALTER TABLE "pricing_products" ADD COLUMN "description" text;
