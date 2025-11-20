#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const sql = postgres(process.env.DATABASE_URL);

async function check() {
  console.log('🔍 Checking existing pricing matches...\n');

  // Check all products with their matches
  const results = await sql`
    SELECT
      pp.name,
      pp.sku,
      pm.competitor_product_url,
      pm.price,
      pm.last_scraped_at,
      pc.name as competitor
    FROM pricing_products pp
    LEFT JOIN pricing_matches pm ON pp.id = pm.product_id
    LEFT JOIN pricing_competitors pc ON pm.competitor_id = pc.id
    ORDER BY pp.sku, pm.last_scraped_at DESC
    LIMIT 20;
  `;

  console.log('All products and their matches:');
  results.forEach((r) => {
    console.log(`\n${r.name} (${r.sku})`);
    if (r.competitor) {
      console.log(`  → ${r.competitor}: ${r.competitor_product_url}`);
      console.log(`     Price: $${r.price}, Scraped: ${r.last_scraped_at}`);
    } else {
      console.log('  → No matches yet');
    }
  });

  await sql.end();
}

check();
