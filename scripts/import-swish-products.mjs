#!/usr/bin/env node
/**
 * Script to import Swish products for Dissan company
 * Usage: node scripts/import-swish-products.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTION_URL = 'https://market-intelligence-kappa.vercel.app';
const COMPANY_SLUG = 'dissan';

async function importProducts() {
  console.log('🚀 Starting Swish products import for Dissan\n');

  // Load products from JSON
  const productsFile = path.join(__dirname, '../Dissan/products-import-swish.json');
  const data = JSON.parse(fs.readFileSync(productsFile, 'utf-8'));

  console.log(`📦 Loaded ${data.products.length} products from ${path.basename(productsFile)}`);
  console.log(`🎯 Target: ${PRODUCTION_URL}/companies/${COMPANY_SLUG}\n`);

  // 1. First, ensure Swish competitor exists
  console.log('1️⃣  Checking if Swish competitor exists...');

  const competitorData = {
    name: data.competitor.name,
    websiteUrl: data.competitor.websiteUrl,
    isActive: true,
    scanFrequency: 'weekly'
  };

  try {
    const competitorRes = await fetch(
      `${PRODUCTION_URL}/api/companies/${COMPANY_SLUG}/pricing/competitors`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(competitorData)
      }
    );

    if (competitorRes.ok) {
      const result = await competitorRes.json();
      console.log(`   ✅ Competitor created/found: ${result.competitor?.name || 'Swish'}\n`);
    } else if (competitorRes.status === 409 || competitorRes.status === 400) {
      console.log(`   ℹ️  Competitor already exists (OK)\n`);
    } else {
      const error = await competitorRes.text();
      console.log(`   ⚠️  Competitor check: ${competitorRes.status} - ${error}\n`);
    }
  } catch (error) {
    console.error(`   ❌ Error creating competitor: ${error.message}\n`);
  }

  // 2. Import products in batches
  console.log(`2️⃣  Importing ${data.products.length} products...\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of data.products) {
    try {
      const productData = {
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        category: product.category,
        isActive: product.isActive
      };

      const res = await fetch(
        `${PRODUCTION_URL}/api/companies/${COMPANY_SLUG}/pricing/products`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        }
      );

      if (res.ok) {
        imported++;
        process.stdout.write(`   ✅ ${product.sku} - ${product.name.substring(0, 40)}\n`);
      } else if (res.status === 409) {
        skipped++;
        process.stdout.write(`   ⏭️  ${product.sku} - Already exists\n`);
      } else {
        failed++;
        const error = await res.text();
        process.stdout.write(`   ❌ ${product.sku} - Error: ${error.substring(0, 50)}\n`);
      }
    } catch (error) {
      failed++;
      console.error(`   ❌ ${product.sku} - Exception: ${error.message}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped (already exist): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📦 Total: ${data.products.length}`);
  console.log('='.repeat(80));

  if (imported > 0 || skipped > 0) {
    console.log('\n✨ Next steps:');
    console.log(`   1. Go to: ${PRODUCTION_URL}/companies/${COMPANY_SLUG}/pricing`);
    console.log('   2. Click "Scan Now" to scrape prices from Swish');
    console.log('   3. Watch the Railway worker logs for scraping progress');
    console.log('\n🎉 Ready to test the scraping workflow!\n');
  }
}

// Run import
importProducts().catch(console.error);
