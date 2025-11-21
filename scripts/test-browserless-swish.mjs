#!/usr/bin/env node

/**
 * TEST BROWSERLESS.IO WITH SWISH.CA
 *
 * Tests Browserless.io's remote browser service with Cloudflare bypass
 * to scrape Swish.ca product data.
 *
 * Setup:
 * 1. Sign up for free at https://www.browserless.io/sign-up
 * 2. Get your API token from dashboard
 * 3. Run: BROWSERLESS_TOKEN=your_token node scripts/test-browserless-swish.mjs
 */

import { chromium } from 'playwright-core';

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const SWISH_PRODUCT_URL = 'https://swish.ca/sanitaire-extend-commercial-canister-vacuum-11';

// Expected values from local test
const EXPECTED = {
  name: 'Sanitaire Extend® Commercial Canister Vacuum - 11"',
  pricePattern: /313\.26/,
  skuPattern: /SC3700A/,
};

async function testBrowserlessSwish() {
  console.log('🧪 BROWSERLESS.IO CLOUDFLARE BYPASS TEST');
  console.log('='.repeat(80));

  if (!BROWSERLESS_TOKEN) {
    console.error('❌ BROWSERLESS_TOKEN not found in environment');
    console.error('');
    console.error('📝 Setup Instructions:');
    console.error('   1. Sign up (FREE): https://www.browserless.io/sign-up');
    console.error('   2. Get your token: https://cloud.browserless.io/account');
    console.error('   3. Run with token:');
    console.error('      BROWSERLESS_TOKEN=your_token node scripts/test-browserless-swish.mjs');
    console.error('');
    console.error('💰 Free Plan: 1,000 units/month (enough for testing)');
    process.exit(1);
  }

  console.log(`🌐 Target URL: ${SWISH_PRODUCT_URL}`);
  console.log(`🔑 API Token: ${BROWSERLESS_TOKEN.substring(0, 20)}...`);
  console.log();

  const startTime = Date.now();

  try {
    console.log('🔌 Connecting to Browserless.io remote browser...');

    // Connect to Browserless using CDP (Chrome DevTools Protocol)
    const browserWSEndpoint = `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}&stealth&blockAds`;

    const browser = await chromium.connectOverCDP(browserWSEndpoint);

    console.log('✅ Connected to remote browser');
    console.log('');

    const context = browser.contexts()[0];
    const page = await context.newPage();

    console.log(`🚀 Navigating to: ${SWISH_PRODUCT_URL}`);

    // Navigate to the product page
    await page.goto(SWISH_PRODUCT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    console.log('⏳ Waiting for product page to load...');

    // Wait for product title (indicates page loaded)
    try {
      await page.waitForSelector('h1.product__title, h1.product-title, h1', {
        timeout: 30000,
      });
      console.log('✅ H1 element found');
    } catch (error) {
      console.error('❌ Product page failed to load (likely Cloudflare blocked)');
      throw error;
    }

    // Additional wait for JavaScript to fully render the page
    console.log('⏳ Waiting for page content to fully load...');
    await page.waitForTimeout(5000); // Wait 5 more seconds for dynamic content

    // Check page title to verify we're on the right page
    const pageTitle = await page.title();
    console.log(`📄 Page Title: "${pageTitle}"`);

    // Check if we're on a Cloudflare challenge page
    const bodyText = await page.evaluate(() => document.body.innerText);
    const isCloudflare = bodyText.includes('Cloudflare') || bodyText.includes('Verify you are human') || bodyText.includes('Just a moment');
    if (isCloudflare) {
      console.log('⚠️  Cloudflare challenge detected - page not fully loaded');
      console.log('   Waiting additional 10 seconds...');
      await page.waitForTimeout(10000);
    } else {
      console.log('✅ Product page loaded successfully (no Cloudflare challenge detected)');
    }

    console.log('');
    console.log('📊 Extracting product data...');
    console.log('');

    // Extract product data using validated selectors
    const productData = await page.evaluate(() => {
      // Product Name
      const nameSelectors = ['h1.product__title', 'h1.product-title', 'h1'];
      let name = null;
      for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent?.trim()) {
          name = el.textContent.trim();
          break;
        }
      }

      // Product Price
      const priceSelectors = [
        '.price-item.price-item--regular',
        '.price__regular .price-item',
        'span.price-item',
        '.product__price span',
        '.price',
        '.money',
      ];
      let price = null;
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent?.includes('$')) {
          price = el.textContent.trim();
          break;
        }
      }

      // Product SKU
      const skuSelectors = ['.product__sku', '[data-product-sku]', '.sku'];
      let sku = null;
      for (const selector of skuSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent?.trim()) {
          sku = el.textContent.trim();
          break;
        }
      }

      // Product Image
      const imageSelectors = [
        '.product__media img',
        '.product__image img',
        '[data-product-image]',
      ];
      let image = null;
      for (const selector of imageSelectors) {
        const el = document.querySelector(selector);
        if (el && el.src) {
          image = el.src;
          break;
        }
      }

      return {
        name,
        price,
        sku,
        image,
        url: window.location.href,
      };
    });

    const endTime = Date.now();
    const durationSec = ((endTime - startTime) / 1000).toFixed(2);

    console.log('📦 EXTRACTED DATA:');
    console.log('='.repeat(80));
    console.log(`   Name: ${productData.name || '❌ Not found'}`);
    console.log(`   Price: ${productData.price || '❌ Not found'}`);
    console.log(`   SKU: ${productData.sku || '⚠️  Not found (optional)'}`);
    console.log(`   Image: ${productData.image ? `${productData.image.substring(0, 60)}...` : '❌ Not found'}`);
    console.log(`   URL: ${productData.url}`);
    console.log();
    console.log(`⏱️  Duration: ${durationSec}s`);
    console.log();

    // Validate against expected values
    console.log('✅ VALIDATION:');
    console.log('='.repeat(80));

    let validationScore = 0;
    let maxScore = 3;

    // Validate Name
    if (productData.name) {
      if (productData.name.includes('Sanitaire') && productData.name.includes('Canister Vacuum')) {
        console.log('✅ Name: VALID (matches expected pattern)');
        validationScore++;
      } else {
        console.log(`⚠️  Name: PARTIAL (got "${productData.name}")`);
        validationScore += 0.5;
      }
    } else {
      console.log('❌ Name: MISSING');
    }

    // Validate Price
    if (productData.price) {
      if (EXPECTED.pricePattern.test(productData.price)) {
        console.log('✅ Price: VALID (matches expected value)');
        validationScore++;
      } else {
        console.log(`⚠️  Price: EXTRACTED (got "${productData.price}", expected ~$313.26)`);
        validationScore += 0.7;
      }
    } else {
      console.log('❌ Price: MISSING');
    }

    // Validate SKU
    if (productData.sku) {
      if (EXPECTED.skuPattern.test(productData.sku)) {
        console.log('✅ SKU: VALID (matches expected value)');
        validationScore++;
      } else {
        console.log(`⚠️  SKU: EXTRACTED (got "${productData.sku}", expected pattern with "SC3700A")`);
        validationScore += 0.7;
      }
    } else {
      console.log('⚠️  SKU: MISSING (optional field)');
      validationScore += 0.3;
    }

    const successRate = ((validationScore / maxScore) * 100).toFixed(1);
    console.log();
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log();

    // Cost analysis
    console.log('💰 COST ANALYSIS:');
    console.log('='.repeat(80));

    // Calculate units used (1 unit = 30 seconds)
    const units = Math.ceil(parseFloat(durationSec) / 30);
    const costPerUnit = 0.0020; // $0.0020 per unit (Hobby tier overage)
    const totalCost = units * costPerUnit;

    console.log(`   Duration: ${durationSec}s`);
    console.log(`   Units Used: ${units} units (${units * 30}s max)`);
    console.log(`   Cost per Unit: $${costPerUnit.toFixed(4)}`);
    console.log(`   Total Cost: $${totalCost.toFixed(4)} per product`);
    console.log();

    // Monthly projections
    console.log('📊 Monthly Cost Projections:');
    const productsPerMonth = [100, 500, 1000];
    productsPerMonth.forEach(count => {
      const monthlyCost = (totalCost * count).toFixed(2);
      console.log(`   ${count} products/month: $${monthlyCost}`);
    });
    console.log();

    // Recommendation
    console.log('🎯 RECOMMENDATION:');
    console.log('='.repeat(80));

    if (successRate >= 80) {
      console.log('✅ SUCCESS! Proceed with implementation.');
      console.log('   - Cloudflare bypass: WORKING');
      console.log('   - Data extraction: ACCURATE');
      console.log(`   - Cost per product: $${totalCost.toFixed(4)} (excellent)`);
      console.log('   - Stealth mode: ENABLED (built-in)');
      console.log();
      console.log('📋 Next Steps:');
      console.log('   1. Install playwright-core: npm install playwright-core');
      console.log('   2. Integrate Browserless in playwright-scraper.ts');
      console.log('   3. Add BROWSERLESS_TOKEN to Railway environment');
      console.log('   4. Deploy to Railway');
      console.log('   5. Test in production');
    } else {
      console.log('⚠️  PARTIAL SUCCESS - Review results');
      console.log(`   - Success rate: ${successRate}% (target: >80%)`);
      console.log('   - Cloudflare bypass: CHECK RESULTS ABOVE');
      console.log('   - Data extraction: NEEDS IMPROVEMENT');
    }
    console.log();

    await browser.close();

  } catch (error) {
    const endTime = Date.now();
    const durationSec = ((endTime - startTime) / 1000).toFixed(2);

    console.error('❌ Test failed!');
    console.error(`⏱️  Duration: ${durationSec}s`);
    console.error();
    console.error('Error details:', error.message);
    console.error();

    if (error.message.includes('connect')) {
      console.error('🔑 Connection Error:');
      console.error('   - Invalid Browserless token');
      console.error('   - Verify: https://cloud.browserless.io/account');
    } else if (error.message.includes('timeout')) {
      console.error('⏱️  Timeout Error:');
      console.error('   - Cloudflare challenge may have taken too long');
      console.error('   - Try increasing timeout');
    } else {
      console.error('💡 Suggestions:');
      console.error('   - Check Browserless dashboard for session logs');
      console.error('   - Verify account has available units');
      console.error('   - https://cloud.browserless.io/');
    }

    throw error;
  }
}

// Run the test
testBrowserlessSwish().catch(error => {
  console.error('\n💥 Test failed with error:', error);
  process.exit(1);
});
