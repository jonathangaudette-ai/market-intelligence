ALTER TABLE "documents" ADD COLUMN "processing_steps" jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "deleted_at" timestamp;