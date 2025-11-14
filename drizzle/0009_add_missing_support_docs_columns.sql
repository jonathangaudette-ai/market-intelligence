-- Migration: Add missing Support Docs RAG v4.0 columns
-- Safe migration that checks for existing columns before adding

-- Add missing columns with IF NOT EXISTS safety
DO $$
BEGIN
  -- Add document_purpose if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'document_purpose'
  ) THEN
    ALTER TABLE "documents" ADD COLUMN "document_purpose" varchar(50);
  END IF;

  -- Add content_type if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE "documents" ADD COLUMN "content_type" varchar(100);
  END IF;

  -- Add content_type_tags if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'content_type_tags'
  ) THEN
    ALTER TABLE "documents" ADD COLUMN "content_type_tags" text[];
  END IF;

  -- Add is_historical_rfp if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'is_historical_rfp'
  ) THEN
    ALTER TABLE "documents" ADD COLUMN "is_historical_rfp" boolean DEFAULT false;
  END IF;

  -- Add processing_metadata if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'processing_metadata'
  ) THEN
    ALTER TABLE "documents" ADD COLUMN "processing_metadata" jsonb;
  END IF;
END$$;

-- Backfill existing documents based on metadata patterns
UPDATE "documents"
SET
  "document_purpose" = CASE
    WHEN "type" IN ('contract', 'case_study', 'methodology', 'pricing') THEN 'rfp_support'
    WHEN "metadata"->>'isHistoricalRFP' = 'true' THEN 'rfp_response'
    WHEN "competitor_id" IS NOT NULL THEN 'competitive_intel'
    ELSE 'company_info'
  END,
  "content_type" = COALESCE("metadata"->>'contentType', "type"),
  "content_type_tags" = CASE
    WHEN "metadata"->'contentTypeTags' IS NOT NULL
    THEN ARRAY(SELECT jsonb_array_elements_text("metadata"->'contentTypeTags'))
    ELSE ARRAY[]::text[]
  END,
  "is_historical_rfp" = COALESCE(("metadata"->>'isHistoricalRFP')::boolean, false)
WHERE "document_purpose" IS NULL;

-- Create performance indexes if not exists
CREATE INDEX IF NOT EXISTS "idx_documents_purpose_category" ON "documents"("document_purpose", "content_type");
CREATE INDEX IF NOT EXISTS "idx_documents_historical_rfp" ON "documents"("is_historical_rfp") WHERE "is_historical_rfp" = true;
CREATE INDEX IF NOT EXISTS "idx_documents_content_tags" ON "documents" USING GIN("content_type_tags");
CREATE INDEX IF NOT EXISTS "idx_documents_company_purpose" ON "documents"("company_id", "document_purpose", "status");

-- Add CHECK constraint for document_purpose if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_document_purpose'
  ) THEN
    ALTER TABLE "documents"
    ADD CONSTRAINT "check_document_purpose"
    CHECK ("document_purpose" IN ('rfp_support', 'rfp_response', 'competitive_intel', 'company_info'));
  END IF;
END$$;
