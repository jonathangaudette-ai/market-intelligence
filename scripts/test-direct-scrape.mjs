#!/usr/bin/env node

/**
 * DIRECT SCRAPE TEST
 *
 * Tests scraping a known Swish URL directly to validate:
 * - Railway worker is reachable
 * - Stealth mode bypasses Cloudflare
 * - Price extraction works
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const RAILWAY_WORKER_URL = process.env.RAILWAY_WORKER_URL || 'https://pricing-worker-production.up.railway.app';
const RAILWAY_WORKER_API_KEY = process.env.RAILWAY_WORKER_API_KEY || 'SXf4Qt3ebnq7qlEXLr5UrnBmWci6GDXl84Jhppi';
const TEST_URL = 'https://swish.ca/products/bowl-brush-pp';
const COMPANY_SLUG = 'my-company';

async function testDirectScrape() {
  console.log('🧪 Testing Direct Scrape with Stealth Mode\n');
  console.log('='.repeat(80));
  console.log(`Railway Worker URL: ${RAILWAY_WORKER_URL}`);
  console.log(`Test URL: ${TEST_URL}\n`);

  try {
    // ========================================================================
    // 1. Test Railway Worker Health
    // ========================================================================
    console.log('💓 Step 1: Checking Railway worker health...');

    const healthResponse = await fetch(`${RAILWAY_WORKER_URL}/health`);

    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Worker is healthy');
      console.log(`   Status: ${health.status}`);
      console.log(`   Server: ${health.server}\n`);
    } else {
      console.error('❌ Worker health check failed');
      process.exit(1);
    }

    // ========================================================================
    // 2. Test Direct Scrape
    // ========================================================================
    console.log('🔍 Step 2: Testing direct scrape...');
    console.log(`   Company: ${COMPANY_SLUG}`);
    console.log(`   URL: ${TEST_URL}`);

    const scrapeStart = Date.now();

    const scrapeResponse = await fetch(`${RAILWAY_WORKER_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': RAILWAY_WORKER_API_KEY,
      },
      body: JSON.stringify({
        companySlug: COMPANY_SLUG,
        urls: [TEST_URL],
      }),
    });

    const scrapeTime = Date.now() - scrapeStart;

    if (!scrapeResponse.ok) {
      const error = await scrapeResponse.text();
      console.error(`❌ Scrape failed: ${scrapeResponse.status}`);
      console.error(`   Error: ${error}`);
      process.exit(1);
    }

    const result = await scrapeResponse.json();

    console.log(`\n📊 Scrape Results (${scrapeTime}ms):`);
    console.log(`   Total URLs: ${result.results?.length || 0}`);

    if (result.results && result.results.length > 0) {
      result.results.forEach((item, i) => {
        console.log(`\n   ${i + 1}. ${item.url}`);
        console.log(`      Success: ${item.success ? '✅' : '❌'}`);

        if (item.success) {
          console.log(`      Product Name: ${item.productName}`);
          console.log(`      Price: $${item.price}`);
          console.log(`      In Stock: ${item.inStock ? '✅' : '❌'}`);
          if (item.sku) {
            console.log(`      SKU: ${item.sku}`);
          }
          if (item.imageUrl) {
            console.log(`      Image: ${item.imageUrl.substring(0, 60)}...`);
          }
        } else {
          console.log(`      Error: ${item.error}`);

          // Check for Cloudflare-specific errors
          if (item.error && item.error.toLowerCase().includes('cloudflare')) {
            console.log('\n⚠️  CLOUDFLARE DETECTED - Stealth mode may not be working!');
          }
        }
      });
    }

    // ========================================================================
    // 3. Summary
    // ========================================================================
    console.log('\n\n' + '='.repeat(80));
    console.log('🎯 TEST SUMMARY\n');

    const hasResults = result.results && result.results.length > 0;
    const firstResult = hasResults ? result.results[0] : null;
    const success = firstResult && firstResult.success;
    const hasValidPrice = success && parseFloat(firstResult.price) > 0;
    const hasCloudflareError = firstResult && firstResult.error && firstResult.error.toLowerCase().includes('cloudflare');

    if (success && hasValidPrice) {
      console.log('✅ STEALTH MODE TEST PASSED!');
      console.log('   - Railway worker: ✅');
      console.log('   - Cloudflare bypass: ✅');
      console.log('   - Price extraction: ✅');
      console.log(`   - Extracted price: $${firstResult.price}`);
      console.log('\n🥷 Stealth mode is working correctly!');
    } else {
      console.log('❌ STEALTH MODE TEST FAILED');
      console.log(`   - Railway worker: ${hasResults ? '✅' : '❌'}`);
      console.log(`   - Scraping success: ${success ? '✅' : '❌'}`);
      console.log(`   - Valid price: ${hasValidPrice ? '✅' : '❌'}`);
      console.log(`   - Cloudflare blocked: ${hasCloudflareError ? '❌ YES' : '✅ NO'}`);

      if (hasCloudflareError) {
        console.log('\n⚠️  Cloudflare is still blocking the scraper!');
        console.log('   Possible issues:');
        console.log('   - Stealth mode not properly configured');
        console.log('   - Railway worker not redeployed with new code');
        console.log('   - Additional anti-bot measures needed');
      } else if (!success && firstResult) {
        console.log(`\n⚠️  Error: ${firstResult.error}`);
      }
    }

    console.log('\n📊 Performance:');
    console.log(`   - Scrape Time: ${scrapeTime}ms`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    throw error;
  }
}

// Run the test
testDirectScrape().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
