DROP INDEX "pricing_products_company_sku_idx";--> statement-breakpoint
ALTER TABLE "pricing_products" ADD CONSTRAINT "pricing_products_company_sku_unique" UNIQUE("company_id","sku");