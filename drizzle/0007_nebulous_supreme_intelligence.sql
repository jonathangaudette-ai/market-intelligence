ALTER TABLE "documents" ADD COLUMN "document_purpose" varchar(50);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "content_type" varchar(100);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "content_type_tags" text[];--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "is_historical_rfp" boolean DEFAULT false;