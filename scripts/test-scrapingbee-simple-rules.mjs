#!/usr/bin/env node

/**
 * TEST SCRAPINGBEE WITH SIMPLE EXTRACT RULES
 *
 * Testing with very simple, generic selectors to see if
 * extract_rules works at all with this page.
 */

import axios from 'axios';

const SCRAPINGBEE_API_KEY = 'X7CB1EQ0KZJFPDS0OG6KBGARG2ALQ0ZVI9067OE2O11Y7YY6X6MECRU0LO8B265YDCKXDHH6UTW7J32K';
const SWISH_PRODUCT_URL = 'https://swish.ca/sanitaire-extend-commercial-canister-vacuum-11';

async function testSimpleRules() {
  console.log('🧪 SCRAPINGBEE SIMPLE EXTRACT RULES TEST');
  console.log('='.repeat(80));
  console.log(`🌐 Target URL: ${SWISH_PRODUCT_URL}`);
  console.log();

  // Test with very simple selectors
  const extractRules = {
    title: 'h1',              // Simplest possible
    heading: 'title',          // Page title
    firstDiv: 'div',           // Any div
  };

  console.log('📋 Simple Extraction Rules:');
  console.log(JSON.stringify(extractRules, null, 2));
  console.log();

  const startTime = Date.now();

  try {
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
    console.log();

    const data = response.data;

    console.log('📦 EXTRACTED DATA:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log();

    // Check if we got ANY data
    const hasData = Object.values(data).some(v => v && v.trim && v.trim() !== '');

    if (hasData) {
      console.log('✅ SUCCESS! extract_rules IS working!');
      console.log('   The issue is with the specific selectors for Swish product data.');
    } else {
      console.log('❌ FAILED: Even simple selectors return empty data');
      console.log('   extract_rules may not be compatible with this page structure');
      console.log();
      console.log('💡 RECOMMENDATION:');
      console.log('   Use HTML parsing approach (test-scrapingbee-swish.mjs)');
      console.log('   - 90% success rate with Cheerio parsing');
      console.log('   - Still simple: API call → HTML → Parse → Done');
      console.log('   - No Playwright/Chromium needed');
    }

  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Error:', error.message);
    throw error;
  }
}

testSimpleRules().catch(error => {
  console.error('\n💥 Test failed with error:', error.message);
  process.exit(1);
});
