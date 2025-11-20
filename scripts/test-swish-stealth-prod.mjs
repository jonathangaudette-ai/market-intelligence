#!/usr/bin/env node

/**
 * TEST SWISH STEALTH MODE IN PRODUCTION
 *
 * Tests the Playwright stealth mode implementation by:
 * 1. Calling the production API endpoints
 * 2. Scraping a known Swish product
 * 3. Verifying Cloudflare bypass
 * 4. Validating price extraction
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = postgres(databaseUrl);
const db = drizzle(sql);

// Test product: Brosse à cuvette polypropylène (has existing URL on Swish)
const TEST_PRODUCT_SKU = 'ATL-2024';

// API Configuration
const API_BASE_URL = process.env.DEPLOYMENT_URL || 'https://market-intelligence-kappa.vercel.app';
const COMPANY_SLUG = 'my-company';

async function testSwishStealth() {
  console.log('🧪 Testing Swish Stealth Mode in Production\n');
  console.log('='.repeat(80));
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  try {
    // ========================================================================
    // 1. Get Swish competitor configuration from database
    // ========================================================================
    console.log('📋 Step 1: Fetching Swish competitor configuration...');

    const swishCompetitor = await sql`
      SELECT id, name, scraper_config
      FROM pricing_competitors
      WHERE name = 'Swish'
      LIMIT 1;
    `;

    if (swishCompetitor.length === 0) {
      console.error('❌ Swish competitor not found in database');
      process.exit(1);
    }

    const competitor = swishCompetitor[0];
    console.log(`✅ Found competitor: ${competitor.name} (ID: ${competitor.id})`);

    const config = competitor.scraper_config;
    console.log(`   Scraper Type: ${config.scraperType}`);
    console.log(`   Search URL: ${config.playwright.search.url}`);
    console.log(`   Stealth Mode: ${config.playwright.advanced?.useStealthMode ? '🥷 ENABLED' : '❌ DISABLED'}`);

    if (!config.playwright.advanced?.useStealthMode) {
      console.warn('⚠️  WARNING: Stealth mode is disabled! This test may fail.');
    }

    // ========================================================================
    // 2. Get test product
    // ========================================================================
    console.log('\n📦 Step 2: Fetching test product...');

    const products = await sql`
      SELECT id, name, sku
      FROM pricing_products
      WHERE sku = ${TEST_PRODUCT_SKU}
      LIMIT 1;
    `;

    if (products.length === 0) {
      console.error(`❌ Test product with SKU ${TEST_PRODUCT_SKU} not found`);
      process.exit(1);
    }

    const product = products[0];
    console.log(`✅ Found product: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   ID: ${product.id}`);

    // ========================================================================
    // 3. Test URL Discovery (GPT-5 Search) via API
    // ========================================================================
    console.log('\n🔍 Step 3: Testing URL Discovery (GPT-5) via API...');

    const discoveryUrl = `${API_BASE_URL}/api/companies/${COMPANY_SLUG}/pricing/discover`;
    console.log(`   Endpoint: ${discoveryUrl}`);

    const discoveryStart = Date.now();

    const discoveryResponse = await fetch(discoveryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        competitorId: competitor.id,
        productId: product.id,
      }),
    });

    const discoveryTime = Date.now() - discoveryStart;

    if (!discoveryResponse.ok) {
      const error = await discoveryResponse.text();
      console.error(`❌ Discovery API failed: ${discoveryResponse.status}`);
      console.error(`   Error: ${error}`);
      process.exit(1);
    }

    const discoveryResult = await discoveryResponse.json();

    console.log(`\n📊 Discovery Results (${discoveryTime}ms):`);
    console.log(`   Success: ${discoveryResult.success ? '✅' : '❌'}`);
    console.log(`   URLs Discovered: ${discoveryResult.urlsDiscovered || 0}`);

    if (discoveryResult.discoveredUrls && discoveryResult.discoveredUrls.length > 0) {
      console.log('\n   Discovered URLs:');
      discoveryResult.discoveredUrls.forEach((url, i) => {
        console.log(`   ${i + 1}. ${url.url}`);
        console.log(`      Confidence: ${(url.confidence * 100).toFixed(0)}%`);
        console.log(`      Source: ${url.source}`);
      });
    }

    if (!discoveryResult.success) {
      console.error('\n❌ URL discovery failed');
      process.exit(1);
    }

    // ========================================================================
    // 4. Test Price Scraping with Stealth Mode via API
    // ========================================================================
    console.log('\n\n💰 Step 4: Testing Price Scraping with Stealth Mode via API...');
    console.log('   This will use the Railway worker with Playwright + Stealth');

    const scanUrl = `${API_BASE_URL}/api/companies/${COMPANY_SLUG}/pricing/scans`;
    console.log(`   Endpoint: ${scanUrl}`);

    const scanStart = Date.now();

    const scanResponse = await fetch(scanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        competitorId: competitor.id,
        skipDiscovery: true, // Use already discovered URLs
      }),
    });

    const scanTime = Date.now() - scanStart;

    if (!scanResponse.ok) {
      const error = await scanResponse.text();
      console.error(`❌ Scan API failed: ${scanResponse.status}`);
      console.error(`   Error: ${error}`);

      // Check Railway worker logs
      console.log('\n📜 Checking Railway worker logs...');
      console.log('   Run: railway logs --tail 50');

      process.exit(1);
    }

    const scanResult = await scanResponse.json();

    console.log(`\n📊 Scan Results (${scanTime}ms):`);
    console.log(`   Success: ${scanResult.success ? '✅' : '❌'}`);
    console.log(`   Total Scanned: ${scanResult.totalScanned || 0}`);
    console.log(`   Successful: ${scanResult.successfulScans || 0}`);
    console.log(`   Failed: ${scanResult.failedScans || 0}`);

    if (scanResult.results && scanResult.results.length > 0) {
      console.log('\n   Detailed Results:');
      scanResult.results.forEach((result, i) => {
        console.log(`\n   ${i + 1}. ${result.competitorName}`);
        console.log(`      URL: ${result.url}`);
        console.log(`      Status: ${result.success ? '✅ Success' : '❌ Failed'}`);

        if (result.success && result.scrapedData) {
          console.log(`      Price: $${result.scrapedData.price}`);
          console.log(`      Product Name: ${result.scrapedData.productName}`);
          console.log(`      In Stock: ${result.scrapedData.inStock ? '✅' : '❌'}`);
          if (result.scrapedData.sku) {
            console.log(`      SKU: ${result.scrapedData.sku}`);
          }
        } else if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      });
    }

    // ========================================================================
    // 5. Verify Database Updates
    // ========================================================================
    console.log('\n\n📝 Step 5: Verifying database updates...');

    const matches = await sql`
      SELECT
        pm.id,
        pm.competitor_product_url,
        pm.price,
        pm.last_scraped_at,
        pc.name as competitor_name
      FROM pricing_matches pm
      JOIN pricing_competitors pc ON pm.competitor_id = pc.id
      WHERE pm.product_id = ${product.id}
        AND pm.competitor_id = ${competitor.id}
      ORDER BY pm.last_scraped_at DESC
      LIMIT 1;
    `;

    if (matches.length > 0) {
      const match = matches[0];
      console.log('✅ Found pricing match in database:');
      console.log(`   Competitor: ${match.competitor_name}`);
      console.log(`   URL: ${match.competitor_product_url}`);
      console.log(`   Price: $${match.price}`);
      console.log(`   Last Scraped: ${match.last_scraped_at}`);

      // Check if price is valid (not 0.00)
      if (parseFloat(match.price) > 0) {
        console.log('   💰 Valid price extracted!');
      } else {
        console.warn('   ⚠️  Price is $0.00 - scraping may have failed');
      }
    } else {
      console.log('⚠️  No pricing match found in database');
    }

    // ========================================================================
    // 6. Summary
    // ========================================================================
    console.log('\n\n' + '='.repeat(80));
    console.log('🎯 TEST SUMMARY\n');

    const hasValidPrice = matches.length > 0 && parseFloat(matches[0].price) > 0;
    const allSuccess =
      discoveryResult.success &&
      scanResult.success &&
      scanResult.successfulScans > 0 &&
      hasValidPrice;

    if (allSuccess) {
      console.log('✅ STEALTH MODE TEST PASSED!');
      console.log('   - GPT-5 URL discovery: ✅');
      console.log('   - Cloudflare bypass: ✅ (no errors reported)');
      console.log('   - Price extraction: ✅');
      console.log('   - Database update: ✅');
      console.log('   - Valid price: ✅');
      console.log('\n🥷 Stealth mode is working correctly in production!');
    } else {
      console.log('❌ STEALTH MODE TEST FAILED');
      console.log(`   - GPT-5 URL discovery: ${discoveryResult.success ? '✅' : '❌'}`);
      console.log(`   - Price scraping: ${scanResult.success ? '✅' : '❌'}`);
      console.log(`   - Successful scans: ${scanResult.successfulScans || 0}`);
      console.log(`   - Valid price: ${hasValidPrice ? '✅' : '❌'}`);

      if (scanResult.failedScans > 0) {
        console.log('\n⚠️  Check Railway worker logs for Cloudflare errors:');
        console.log('   railway logs --tail 100');
      }
    }

    console.log('\n📊 Performance:');
    console.log(`   - Discovery Time: ${discoveryTime}ms`);
    console.log(`   - Scan Time: ${scanTime}ms`);
    console.log(`   - Total Time: ${discoveryTime + scanTime}ms`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the test
testSwishStealth().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
