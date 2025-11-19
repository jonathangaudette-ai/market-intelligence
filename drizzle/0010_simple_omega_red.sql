CREATE TABLE "pricing_catalog_imports" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"filename" varchar(500),
	"file_size" integer,
	"status" varchar(50) DEFAULT 'pending',
	"current_step" varchar(100),
	"progress_current" integer DEFAULT 0,
	"progress_total" integer DEFAULT 0,
	"products_imported" integer DEFAULT 0,
	"products_failed" integer DEFAULT 0,
	"error_message" text,
	"logs" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pricing_catalog_imports" ADD CONSTRAINT "pricing_catalog_imports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pricing_catalog_imports_company_id_idx" ON "pricing_catalog_imports" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pricing_catalog_imports_status_idx" ON "pricing_catalog_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pricing_catalog_imports_created_at_idx" ON "pricing_catalog_imports" USING btree ("created_at");