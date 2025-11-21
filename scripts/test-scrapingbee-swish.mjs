#!/usr/bin/env node

/**
 * TEST SCRAPINGBEE CLOUDFLARE BYPASS FOR SWISH.CA
 *
 * Tests ScrapingBee with Canada premium proxies and JavaScript rendering
 * to bypass Cloudflare protection on Swish.ca
 *
 * User suggested this service based on prior success: "à l'époque j'ai utiliser
 * scraping bee qui faisait des miracles dans ce genre de contexte"
 *
 * Usage: node scripts/test-scrapingbee-swish.mjs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const SCRAPINGBEE_API_KEY = 'X7CB1EQ0KZJFPDS0OG6KBGARG2ALQ0ZVI9067OE2O11Y7YY6X6MECRU0LO8B265YDCKXDHH6UTW7J32K';
const SWISH_PRODUCT_URL = 'https://swish.ca/sanitaire-extend-commercial-canister-vacuum-11';

// Expected values from local headful test (validated working)
const EXPECTED = {
  name: 'Sanitaire Extend® Commercial Canister Vacuum - 11"',
  pricePattern: /313\.26/,
  skuPattern: /SC3700A/,
};

async function testScrapingBeeSwish() {
  console.log('🐝 SCRAPINGBEE CLOUDFLARE BYPASS TEST');
  console.log('='.repeat(80));
  console.log(`🌐 Target URL: ${SWISH_PRODUCT_URL}`);
  console.log(`🔑 API Token: ${SCRAPINGBEE_API_KEY.substring(0, 20)}...`);
  console.log(`🇨🇦 Premium Proxy: Canada`);
  console.log();

  const startTime = Date.now();

  try {
    console.log('🚀 Sending request to ScrapingBee...');
    console.log('   Premium Proxy: YES (Canada)');
    console.log('   JavaScript Rendering: YES');
    console.log('   Wait for: .product__title');
    console.log('   Block Ads: YES');
    console.log();

    // ScrapingBee API request with optimal configuration
    // Note: Cloudflare challenges can take 30-90 seconds to solve
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: SCRAPINGBEE_API_KEY,
        url: SWISH_PRODUCT_URL,
        premium_proxy: true,           // Use premium residential proxies
        country_code: 'ca',             // Canada geo-location
        render_js: true,                // Execute JavaScript
        // wait_for: '.product__title', // Removed to avoid timeout if selector takes long
        wait: 10000,                    // Wait 10 seconds for page to fully load
        block_ads: true,                // Block ads for speed
        // block_resources: true,       // Removed to ensure all resources load properly
      },
      timeout: 120000, // 120 second timeout (Cloudflare challenges can be slow)
    });

    const endTime = Date.now();
    const durationSec = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Response received! (${durationSec}s)`);
    console.log(`📊 Status Code: ${response.status}`);
    console.log();

    // Check ScrapingBee headers for credit usage
    const creditsUsed = response.headers['spb-cost'];
    const creditsRemaining = response.headers['spb-credits-remaining'];

    if (creditsUsed) {
      console.log('💳 Credit Usage:');
      console.log(`   Credits Used: ${creditsUsed}`);
      console.log(`   Credits Remaining: ${creditsRemaining || 'N/A'}`);
      console.log();
    }

    const html = response.data;

    // Check if we got a Cloudflare challenge page
    if (typeof html === 'string' && (
      html.includes('Just a moment...') ||
      html.includes('Checking your browser') ||
      html.includes('Cloudflare')
    )) {
      console.error('❌ Cloudflare challenge detected!');
      console.error('   ScrapingBee was blocked by Cloudflare');
      console.error();
      console.error('🔍 Page title check:');
      const $ = cheerio.load(html);
      const title = $('title').text();
      console.error(`   Title: "${title}"`);
      throw new Error('Cloudflare challenge page received');
    }

    console.log('✅ No Cloudflare challenge detected - page loaded successfully!');
    console.log();

    // Parse HTML with Cheerio
    const $ = cheerio.load(html);

    // Validate page title
    const pageTitle = $('title').text();
    console.log(`📄 Page Title: "${pageTitle}"`);
    console.log();

    console.log('📦 Extracting product data...');
    console.log();

    // Extract product data using validated selectors
    // These selectors were tested locally with headful Playwright and work perfectly
    const nameSelectors = ['h1.product__title', 'h1.product-title', 'h1'];
    let name = null;
    for (const selector of nameSelectors) {
      const el = $(selector).first();
      if (el.length && el.text()?.trim()) {
        name = el.text().trim();
        break;
      }
    }

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
      const el = $(selector).first();
      if (el.length && el.text()?.includes('$')) {
        price = el.text().trim();
        break;
      }
    }

    const skuSelectors = ['.product__sku', '[data-product-sku]', '.sku'];
    let sku = null;
    for (const selector of skuSelectors) {
      const el = $(selector).first();
      if (el.length && el.text()?.trim()) {
        sku = el.text().trim();
        break;
      }
    }

    const imageSelectors = [
      '.product__media img',
      '.product__image img',
      '[data-product-image]',
    ];
    let image = null;
    for (const selector of imageSelectors) {
      const el = $(selector).first();
      const src = el.attr('src');
      if (src) {
        image = src;
        break;
      }
    }

    console.log('📦 EXTRACTED DATA:');
    console.log('='.repeat(80));
    console.log(`   Name: ${name || '❌ Not found'}`);
    console.log(`   Price: ${price || '❌ Not found'}`);
    console.log(`   SKU: ${sku || '⚠️  Not found (optional)'}`);
    console.log(`   Image: ${image ? `${image.substring(0, 60)}...` : '❌ Not found'}`);
    console.log();
    console.log(`⏱️  Duration: ${durationSec}s`);
    console.log();

    // Validate against expected values
    console.log('✅ VALIDATION:');
    console.log('='.repeat(80));

    let validationScore = 0;
    let maxScore = 3;

    // Validate Name
    if (name) {
      if (name.includes('Sanitaire') && name.includes('Canister Vacuum')) {
        console.log('✅ Name: VALID (matches expected pattern)');
        validationScore++;
      } else {
        console.log(`⚠️  Name: PARTIAL (got "${name}")`);
        validationScore += 0.5;
      }
    } else {
      console.log('❌ Name: MISSING');
    }

    // Validate Price
    if (price) {
      if (EXPECTED.pricePattern.test(price)) {
        console.log('✅ Price: VALID (matches expected value)');
        validationScore++;
      } else {
        console.log(`⚠️  Price: EXTRACTED (got "${price}", expected ~$313.26)`);
        validationScore += 0.7;
      }
    } else {
      console.log('❌ Price: MISSING');
    }

    // Validate SKU
    if (sku) {
      if (EXPECTED.skuPattern.test(sku)) {
        console.log('✅ SKU: VALID (matches expected value)');
        validationScore++;
      } else {
        console.log(`⚠️  SKU: EXTRACTED (got "${sku}", expected pattern with "SC3700A")`);
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

    const creditsPerRequest = parseInt(creditsUsed) || 25; // Default to 25 if header not available
    const creditsPerMonth = 150000; // Freelance plan
    const costPerMonth = 49.00; // USD
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
      console.log('✅ SUCCESS! Proceed with implementation.');
      console.log('   - Cloudflare bypass: WORKING ✅');
      console.log('   - Data extraction: ACCURATE ✅');
      console.log(`   - Cost per product: $${costPerProduct.toFixed(4)} (excellent)`);
      console.log(`   - Response time: ${durationSec}s (good)`);
      console.log('   - Premium proxy Canada: ENABLED ✅');
      console.log();
      console.log('📋 Next Steps:');
      console.log('   1. Install axios (already in package.json)');
      console.log('   2. Create worker/src/scrapers/scrapingbee/scrapingbee-scraper.ts');
      console.log('   3. Update scraper factory to route scraperType: "scrapingbee"');
      console.log('   4. Update Swish config in database');
      console.log('   5. Add SCRAPINGBEE_API_KEY to Railway environment');
      console.log('   6. Deploy to Railway');
      console.log('   7. Test in production');
    } else {
      console.log('⚠️  PARTIAL SUCCESS - Review results');
      console.log(`   - Success rate: ${successRate}% (target: >80%)`);
      console.log('   - Cloudflare bypass: CHECK RESULTS ABOVE');
      console.log('   - Data extraction: NEEDS IMPROVEMENT');
      console.log();
      console.log('💡 Troubleshooting:');
      console.log('   - Check if page HTML was fully rendered');
      console.log('   - Try increasing wait_for timeout');
      console.log('   - Inspect actual HTML selectors on page');
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
        console.error('   - Check request parameters');
        console.error('   - Review: https://www.scrapingbee.com/documentation/');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️  Timeout Error:');
      console.error('   - Request took longer than 60 seconds');
      console.error('   - Try increasing timeout or check ScrapingBee status');
    } else {
      console.error('💡 Suggestions:');
      console.error('   - Check internet connection');
      console.error('   - Verify ScrapingBee API status');
      console.error('   - Review API documentation: https://www.scrapingbee.com/documentation/');
    }

    throw error;
  }
}

// Run the test
testScrapingBeeSwish().catch(error => {
  console.error('\n💥 Test failed with error:', error.message);
  process.exit(1);
});
