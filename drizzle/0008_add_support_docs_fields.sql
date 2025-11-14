-- Migration: Add Support Documents RAG Fields
-- Phase 0.5 - Support Docs RAG v4.0
-- Date: 2025-11-13

-- ============================================================================
-- STEP 1: Add new columns to documents table
-- ============================================================================

-- Add document_purpose column (nullable initially for backward compatibility)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "document_purpose" varchar(50);

-- Add content_type column (optional metadata)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "content_type" varchar(100);

-- Add content_type_tags array column
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "content_type_tags" text[];

-- Add is_historical_rfp boolean flag
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "is_historical_rfp" boolean DEFAULT false;

--> statement-breakpoint

-- ============================================================================
-- STEP 2: Backfill existing documents with default values
-- ============================================================================

-- Backfill document_purpose based on documentType
-- Assume existing documents are RFP responses if they have rfpId metadata
UPDATE "documents"
SET
  "document_purpose" = CASE
    WHEN "metadata"::jsonb ? 'rfpId' THEN 'rfp_response'
    ELSE 'company_info'
  END,
  "is_historical_rfp" = CASE
    WHEN "metadata"::jsonb ? 'rfpId' THEN true
    ELSE false
  END,
  "content_type_tags" = ARRAY['legacy']::text[]
WHERE "document_purpose" IS NULL;

--> statement-breakpoint

-- ============================================================================
-- STEP 3: Create indexes for performance
-- ============================================================================

-- Index on document_purpose for filtering support docs vs responses
CREATE INDEX IF NOT EXISTS "idx_documents_purpose"
ON "documents"("document_purpose");

-- GIN index on content_type_tags array for fast tag lookups
CREATE INDEX IF NOT EXISTS "idx_documents_content_tags"
ON "documents" USING GIN("content_type_tags");

-- Partial index on is_historical_rfp (only index TRUE values for efficiency)
CREATE INDEX IF NOT EXISTS "idx_documents_historical"
ON "documents"("is_historical_rfp")
WHERE "is_historical_rfp" = true;

-- Composite index for common query patterns (companyId + documentPurpose)
CREATE INDEX IF NOT EXISTS "idx_documents_company_purpose"
ON "documents"("company_id", "document_purpose");

--> statement-breakpoint

-- ============================================================================
-- STEP 4: Add check constraint for document_purpose values
-- ============================================================================

-- Ensure document_purpose only contains valid values
ALTER TABLE "documents"
ADD CONSTRAINT "check_document_purpose"
CHECK ("document_purpose" IN ('rfp_response', 'rfp_support', 'company_info'));

--> statement-breakpoint

-- ============================================================================
-- STEP 5: Create rollback script (DOWN migration)
-- ============================================================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_documents_purpose;
-- DROP INDEX IF EXISTS idx_documents_content_tags;
-- DROP INDEX IF EXISTS idx_documents_historical;
-- DROP INDEX IF EXISTS idx_documents_company_purpose;
-- ALTER TABLE documents DROP CONSTRAINT IF EXISTS check_document_purpose;
-- ALTER TABLE documents DROP COLUMN IF EXISTS document_purpose;
-- ALTER TABLE documents DROP COLUMN IF EXISTS content_type;
-- ALTER TABLE documents DROP COLUMN IF EXISTS content_type_tags;
-- ALTER TABLE documents DROP COLUMN IF EXISTS is_historical_rfp;
