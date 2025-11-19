CREATE TABLE "prompt_templates" (
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
CREATE TABLE "pricing_ai_recommendations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"recommendations" jsonb NOT NULL,
	"generated_by_model" varchar(100) NOT NULL,
	"confidence_score" numeric(3, 2),
	"based_on_data_until" timestamp NOT NULL,
	"user_action" varchar(50),
	"user_action_at" timestamp,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pricing_alert_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"rule_id" varchar(255) NOT NULL,
	"product_id" varchar(255),
	"competitor_id" varchar(255),
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb NOT NULL,
	"severity" varchar(20) NOT NULL,
	"notification_sent" boolean DEFAULT false,
	"notification_sent_at" timestamp,
	"notification_channels_used" jsonb,
	"is_read" boolean DEFAULT false,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" varchar(255),
	"resolution_note" text,
	"triggered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_alert_rules" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"rule_type" varchar(50) NOT NULL,
	"conditions" jsonb NOT NULL,
	"notification_channels" jsonb NOT NULL,
	"notification_frequency" varchar(50) DEFAULT 'realtime',
	"is_active" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp,
	"trigger_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_cache" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"cache_key" varchar(255) NOT NULL,
	"cache_value" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_competitors" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"website_url" varchar(1000) NOT NULL,
	"logo_url" varchar(1000),
	"scraper_config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"scan_frequency" varchar(50) DEFAULT 'weekly',
	"custom_cron" text,
	"last_scan_at" timestamp,
	"next_scan_at" timestamp,
	"total_scans" integer DEFAULT 0,
	"successful_scans" integer DEFAULT 0,
	"failed_scans" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_history" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"match_id" varchar(255) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CAD',
	"in_stock" boolean DEFAULT true,
	"promo_active" boolean DEFAULT false,
	"change_percentage" numeric(5, 2),
	"change_reason" varchar(50),
	"recorded_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_matches" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"competitor_id" varchar(255) NOT NULL,
	"competitor_product_name" varchar(500) NOT NULL,
	"competitor_product_url" varchar(1000),
	"competitor_sku" varchar(255),
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CAD',
	"match_type" varchar(50) NOT NULL,
	"confidence_score" numeric(3, 2) NOT NULL,
	"match_details" jsonb,
	"in_stock" boolean DEFAULT true,
	"promo_active" boolean DEFAULT false,
	"promo_details" text,
	"last_scraped_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_products" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"sku" varchar(255) NOT NULL,
	"name" varchar(500) NOT NULL,
	"name_cleaned" varchar(500) NOT NULL,
	"brand" varchar(255),
	"category" varchar(255),
	"current_price" numeric(10, 2),
	"cost" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'CAD',
	"unit" varchar(50),
	"characteristics" jsonb,
	"image_url" varchar(1000),
	"product_url" varchar(1000),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pricing_scans" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"competitor_id" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"current_step" varchar(100),
	"progress_current" integer DEFAULT 0,
	"progress_total" integer DEFAULT 0,
	"products_scraped" integer DEFAULT 0,
	"products_matched" integer DEFAULT 0,
	"products_failed" integer DEFAULT 0,
	"logs" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_ai_recommendations" ADD CONSTRAINT "pricing_ai_recommendations_product_id_pricing_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pricing_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_alert_events" ADD CONSTRAINT "pricing_alert_events_rule_id_pricing_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."pricing_alert_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_alert_events" ADD CONSTRAINT "pricing_alert_events_product_id_pricing_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pricing_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_alert_events" ADD CONSTRAINT "pricing_alert_events_competitor_id_pricing_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."pricing_competitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_alert_events" ADD CONSTRAINT "pricing_alert_events_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_alert_rules" ADD CONSTRAINT "pricing_alert_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_cache" ADD CONSTRAINT "pricing_cache_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_competitors" ADD CONSTRAINT "pricing_competitors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_history" ADD CONSTRAINT "pricing_history_match_id_pricing_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."pricing_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_matches" ADD CONSTRAINT "pricing_matches_product_id_pricing_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pricing_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_matches" ADD CONSTRAINT "pricing_matches_competitor_id_pricing_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."pricing_competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_products" ADD CONSTRAINT "pricing_products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_scans" ADD CONSTRAINT "pricing_scans_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_scans" ADD CONSTRAINT "pricing_scans_competitor_id_pricing_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."pricing_competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_prompt_idx" ON "prompt_templates" USING btree ("company_id","prompt_key");--> statement-breakpoint
CREATE INDEX "pricing_ai_recommendations_product_id_idx" ON "pricing_ai_recommendations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pricing_ai_recommendations_generated_at_idx" ON "pricing_ai_recommendations" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "pricing_alert_events_rule_id_idx" ON "pricing_alert_events" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "pricing_alert_events_triggered_at_idx" ON "pricing_alert_events" USING btree ("triggered_at");--> statement-breakpoint
CREATE INDEX "pricing_alert_events_read_idx" ON "pricing_alert_events" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "pricing_alert_events_resolved_idx" ON "pricing_alert_events" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "pricing_alert_rules_company_id_idx" ON "pricing_alert_rules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pricing_alert_rules_active_idx" ON "pricing_alert_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "pricing_cache_company_key_idx" ON "pricing_cache" USING btree ("company_id","cache_key");--> statement-breakpoint
CREATE INDEX "pricing_cache_expires_at_idx" ON "pricing_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pricing_competitors_company_name_idx" ON "pricing_competitors" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "pricing_history_match_id_idx" ON "pricing_history" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "pricing_history_recorded_at_idx" ON "pricing_history" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "pricing_matches_product_competitor_idx" ON "pricing_matches" USING btree ("product_id","competitor_id");--> statement-breakpoint
CREATE INDEX "pricing_matches_match_type_idx" ON "pricing_matches" USING btree ("match_type");--> statement-breakpoint
CREATE INDEX "pricing_matches_scraped_at_idx" ON "pricing_matches" USING btree ("last_scraped_at");--> statement-breakpoint
CREATE INDEX "pricing_products_company_sku_idx" ON "pricing_products" USING btree ("company_id","sku");--> statement-breakpoint
CREATE INDEX "pricing_products_category_idx" ON "pricing_products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "pricing_products_brand_idx" ON "pricing_products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "pricing_products_active_idx" ON "pricing_products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "pricing_scans_company_id_idx" ON "pricing_scans" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pricing_scans_competitor_id_idx" ON "pricing_scans" USING btree ("competitor_id");--> statement-breakpoint
CREATE INDEX "pricing_scans_status_idx" ON "pricing_scans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pricing_scans_created_at_idx" ON "pricing_scans" USING btree ("created_at");