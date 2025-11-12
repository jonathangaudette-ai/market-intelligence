CREATE TABLE "rfp_source_preferences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rfp_id" uuid NOT NULL,
	"default_source_strategy" varchar(20) DEFAULT 'hybrid',
	"default_adaptation_level" varchar(20) DEFAULT 'contextual',
	"suggested_sources" jsonb DEFAULT '{}'::jsonb,
	"global_mandate_context" text,
	"prefer_won_rfps" boolean DEFAULT true,
	"min_quality_score" integer DEFAULT 70,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rfp_source_preferences_rfp_id_unique" UNIQUE("rfp_id")
);
--> statement-breakpoint
ALTER TABLE "rfp_questions" ADD COLUMN "content_types" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "rfp_questions" ADD COLUMN "primary_content_type" varchar(100);--> statement-breakpoint
ALTER TABLE "rfp_questions" ADD COLUMN "detection_confidence" integer;--> statement-breakpoint
ALTER TABLE "rfp_questions" ADD COLUMN "selected_source_rfp_id" uuid;--> statement-breakpoint
ALTER TABLE "rfp_questions" ADD COLUMN "adaptation_level" varchar(20) DEFAULT 'contextual';--> statement-breakpoint
ALTER TABLE "rfp_questions" ADD COLUMN "applied_from_settings" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "rfp_responses" ADD COLUMN "source_rfp_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "rfp_responses" ADD COLUMN "adaptation_used" varchar(20);--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "mode" varchar(20) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "is_historical" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "submitted_document" text;--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "outcome_notes" text;--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "quality_score" integer;--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "usage_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "last_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "deal_value" integer;--> statement-breakpoint
ALTER TABLE "rfp_source_preferences" ADD CONSTRAINT "rfp_source_preferences_rfp_id_rfps_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfps"("id") ON DELETE cascade ON UPDATE no action;