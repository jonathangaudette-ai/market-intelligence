-- Add prompt_templates table for configurable AI prompts
CREATE TABLE IF NOT EXISTS "prompt_templates" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"prompt_key" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"system_prompt" text,
	"user_prompt_template" text NOT NULL,
	"model_id" varchar(100),
	"temperature" numeric(3, 2),
	"max_tokens" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"variables" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_prompt_idx" ON "prompt_templates" USING btree ("company_id","prompt_key");
