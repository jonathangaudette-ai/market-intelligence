#!/usr/bin/env node

import { config } from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const sql = postgres(process.env.DATABASE_URL);

async function check() {
  console.log('🔍 Checking Swish configuration in database...\n');

  const results = await sql`
    SELECT id, name, website_url, scraper_config
    FROM pricing_competitors
    WHERE name = 'Swish'
    LIMIT 1;
  `;

  if (results.length === 0) {
    console.log('❌ No Swish competitor found in database');
    process.exit(1);
  }

  const swish = results[0];
  console.log('✅ Swish competitor found:');
  console.log(`   ID: ${swish.id}`);
  console.log(`   Name: ${swish.name}`);
  console.log(`   Website: ${swish.website_url}`);
  console.log(`\n📝 Configuration:`);
  console.log(JSON.stringify(swish.scraper_config, null, 2));

  // Validate configuration structure
  const config = swish.scraper_config;

  console.log('\n🔍 Configuration validation:');
  console.log(`   ✓ scraperType: ${config.scraperType}`);
  console.log(`   ✓ playwright: ${config.playwright ? 'present' : 'MISSING'}`);

  if (config.playwright) {
    console.log(`   ✓ search: ${config.playwright.search ? 'present' : 'MISSING'}`);
    console.log(`   ✓ selectors: ${config.playwright.selectors ? 'present' : 'MISSING'}`);
    console.log(`   ✓ advanced: ${config.playwright.advanced ? 'present' : 'MISSING'}`);

    if (config.playwright.advanced) {
      console.log(`   ✓ useStealthMode: ${config.playwright.advanced.useStealthMode}`);
    }
  }

  await sql.end();
}

check().catch(console.error);
