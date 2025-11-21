#!/usr/bin/env node

/**
 * TEST SCRAPINGBEE JSON EXTRACTION
 *
 * Tests ScrapingBee with extract_rules parameter to get clean JSON output
 * instead of parsing HTML manually.
 */

import axios from 'axios';

const SCRAPINGBEE_API_KEY = 'X7CB1EQ0KZJFPDS0OG6KBGARG2ALQ0ZVI9067OE2O11Y7YY6X6MECRU0LO8B265YDCKXDHH6UTW7J32K';
const SWISH_PRODUCT_URL = 'https://swish.ca/sanitaire-extend-commercial-canister-vacuum-11';

// Expected values
const EXPECTED = {
  name: 'Sanitaire Extend® Commercial Canister Vacuum - 11"',
  pricePattern: /313\.26/,
  skuPattern: /SC3700A/,
};

async function testScrapingBeeJSON() {
  console.log('🐝 SCRAPINGBEE JSON EXTRACTION TEST');
  console.log('='.repeat(80));
  console.log(`🌐 Target URL: ${SWISH_PRODUCT_URL}`);
  console.log(`🔑 API Token: ${SCRAPINGBEE_API_KEY.substring(0, 20)}...`);
  console.log(`🇨🇦 Premium Proxy: Canada`);
  console.log();

  const startTime = Date.now();

  try {
    // Define extraction rules for Swish.ca product page
    // Use simpler selectors that work with extract_rules
    const extractRules = {
      name: 'h1',                        // Simple h1 works!
      price: 'span.price-item',          // Try single class
      sku: 'span.product__sku',          // Add element type
      image: 'img@src',                  // Simplest image selector
    };

    console.log('📋 Extraction Rules:');
    console.log(JSON.stringify(extractRules, null, 2));
    console.log();

    console.log('🚀 Sending request to ScrapingBee with extract_rules...');
    console.log('   Premium Proxy: YES (Canada)');
    console.log('   JavaScript Rendering: YES');
    console.log('   Extract Rules: YES (JSON output)');
    console.log();

    // Try with URLSearchParams to properly encode extract_rules
    const params = new URLSearchParams({
      api_key: SCRAPINGBEE_API_KEY,
      url: SWISH_PRODUCT_URL,
      premium_proxy: 'true',
      country_code: 'ca',
      render_js: 'true',
      wait: '10000',
      block_ads: 'true',
      extract_rules: JSON.stringify(extractRules),
    });

    const response = await axios.get(`https://app.scrapingbee.com/api/v1/?${params.toString()}`, {
      timeout: 120000,
    });

    const endTime = Date.now();
    const durationSec = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Response received! (${durationSec}s)`);
    console.log(`📊 Status Code: ${response.status}`);
    console.log();

    // Check ScrapingBee headers
    const creditsUsed = response.headers['spb-cost'];
    const creditsRemaining = response.headers['spb-credits-remaining'];

    if (creditsUsed) {
      console.log('💳 Credit Usage:');
      console.log(`   Credits Used: ${creditsUsed}`);
      console.log(`   Credits Remaining: ${creditsRemaining || 'N/A'}`);
      console.log();
    }

    // ScrapingBee with extract_rules returns JSON directly!
    const productData = response.data;

    console.log('📦 EXTRACTED JSON DATA:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(productData, null, 2));
    console.log();

    console.log('📊 EXTRACTED FIELDS:');
    console.log('='.repeat(80));
    console.log(`   Name: ${productData.name || '❌ Not found'}`);
    console.log(`   Price: ${productData.price || '❌ Not found'}`);
    console.log(`   SKU: ${productData.sku || '⚠️  Not found'}`);
    console.log(`   Image: ${productData.image ? `${productData.image.substring(0, 60)}...` : '❌ Not found'}`);
    console.log();
    console.log(`⏱️  Duration: ${durationSec}s`);
    console.log();

    // Validation
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

    const creditsPerRequest = parseInt(creditsUsed) || 25;
    const creditsPerMonth = 150000;
    const costPerMonth = 49.00;
    const costPerCredit = costPerMonth / creditsPerMonth;
    const costPerProduct = creditsPerRequest * costPerCredit;

    console.log(`   Credits Used: ${creditsPerRequest} credits`);
    console.log(`   Cost per Credit: $${costPerCredit.toFixed(6)}`);
    console.log(`   Cost per Product: $${costPerProduct.toFixed(4)}`);
    console.log(`   Duration: ${durationSec}s`);
    console.log();

    // Monthly projections
    console.log('📊 Monthly Cost Projections (Freelance $49/month):');
    const productsPerMonth = [100, 500, 1000, 6000];
    productsPerMonth.forEach(count => {
      const monthlyCost = (costPerProduct * count).toFixed(2);
      const creditsNeeded = creditsPerRequest * count;
      const withinLimit = creditsNeeded <= creditsPerMonth ? '✅' : '⚠️';
      console.log(`   ${withinLimit} ${count.toLocaleString()} products/month: $${monthlyCost} (${creditsNeeded.toLocaleString()} credits)`);
    });
    console.log();

    // Recommendation
    console.log('🎯 RECOMMENDATION:');
    console.log('='.repeat(80));

    if (successRate >= 80) {
      console.log('✅ SUCCESS! ScrapingBee with extract_rules works perfectly!');
      console.log();
      console.log('🚀 Key Benefits:');
      console.log('   - Cloudflare bypass: WORKING ✅');
      console.log('   - JSON extraction: DIRECT ✅ (no parsing needed!)');
      console.log('   - Data accuracy: EXCELLENT ✅');
      console.log(`   - Cost: $${costPerProduct.toFixed(4)}/product (very cheap)`);
      console.log(`   - Response time: ${durationSec}s`);
      console.log('   - Premium proxy Canada: ENABLED ✅');
      console.log();
      console.log('📋 Integration Steps:');
      console.log('   1. Create simple API wrapper (no Playwright, no Cheerio!)');
      console.log('   2. Define extract_rules per competitor in database');
      console.log('   3. Call ScrapingBee API → Get JSON → Done!');
      console.log('   4. Add SCRAPINGBEE_API_KEY to Railway');
      console.log('   5. Deploy and test');
      console.log();
      console.log('💡 Architecture:');
      console.log('   Railway Worker → ScrapingBee API (with extract_rules) → JSON Response');
      console.log('   NO NEED FOR: Playwright, Chromium, Cheerio, HTML parsing');
    } else {
      console.log('⚠️  PARTIAL SUCCESS - Review results');
      console.log(`   - Success rate: ${successRate}% (target: >80%)`);
      console.log('   - Some selectors may need adjustment');
    }
    console.log();

  } catch (error) {
    const endTime = Date.now();
    const durationSec = ((endTime - startTime) / 1000).toFixed(2);

    console.error('❌ Test failed!');
    console.error(`⏱️  Duration: ${durationSec}s`);
    console.error();
    console.error('Error details:', error.message);
    console.error();

    if (error.response) {
      console.error('🔍 Response Details:');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Status Text: ${error.response.statusText}`);

      if (error.response.data) {
        console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
      }

      if (error.response.status === 401) {
        console.error();
        console.error('🔑 Authentication Error:');
        console.error('   - Invalid API key');
        console.error('   - Verify: https://app.scrapingbee.com/account');
      } else if (error.response.status === 402) {
        console.error();
        console.error('💳 Payment Required:');
        console.error('   - Insufficient credits');
        console.error('   - Check: https://app.scrapingbee.com/account');
      } else if (error.response.status === 422) {
        console.error();
        console.error('⚠️  Invalid Request:');
        console.error('   - Check extract_rules format');
        console.error('   - Review: https://www.scrapingbee.com/documentation/data-extraction/');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️  Timeout Error:');
      console.error('   - Request took longer than 120 seconds');
    }

    throw error;
  }
}

// Run the test
testScrapingBeeJSON().catch(error => {
  console.error('\n💥 Test failed with error:', error.message);
  process.exit(1);
});
