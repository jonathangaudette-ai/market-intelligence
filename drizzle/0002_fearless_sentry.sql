-- Add enrichment fields to rfps table for AI context generation

ALTER TABLE "rfps" ADD COLUMN IF NOT EXISTS "extracted_text" text;
ALTER TABLE "rfps" ADD COLUMN IF NOT EXISTS "manual_enrichment" jsonb;
ALTER TABLE "rfps" ADD COLUMN IF NOT EXISTS "linkedin_enrichment" jsonb;

-- Add comments for documentation
COMMENT ON COLUMN "rfps"."extracted_text" IS 'Full text extracted from PDF for RAG context';
COMMENT ON COLUMN "rfps"."manual_enrichment" IS 'Manual context notes about the client/RFP';
COMMENT ON COLUMN "rfps"."linkedin_enrichment" IS 'LinkedIn/Proxycurl company enrichment data';
