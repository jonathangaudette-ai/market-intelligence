#!/usr/bin/env node

/**
 * DEBUG API KEY TEST
 *
 * Minimal test to debug the API key authentication issue
 */

const RAILWAY_WORKER_URL = 'https://pricing-worker-production.up.railway.app';
const API_KEY = 'SXf4Qt3ebnq7qlEXLr5UrnBmWci6GDXl84Jhppi';

console.log('🔍 API Key Debug Test\n');
console.log('='.repeat(80));
console.log(`Railway Worker URL: ${RAILWAY_WORKER_URL}`);
console.log(`API Key Length: ${API_KEY.length}`);
console.log(`API Key (first 10 chars): ${API_KEY.substring(0, 10)}...`);
console.log(`API Key (last 10 chars): ...${API_KEY.substring(API_KEY.length - 10)}`);
console.log(`API Key Full: ${API_KEY}`);
console.log('');

// Test health endpoint (no auth required)
console.log('📊 Testing /health (no auth)...');
const healthResponse = await fetch(`${RAILWAY_WORKER_URL}/health`);
console.log(`   Status: ${healthResponse.status}`);
const healthData = await healthResponse.json();
console.log(`   Response: ${JSON.stringify(healthData)}`);
console.log('');

// Test /api/scrape with API key
console.log('🔐 Testing /api/scrape with API key...');
const scrapeResponse = await fetch(`${RAILWAY_WORKER_URL}/api/scrape`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
  body: JSON.stringify({
    companySlug: 'test',
    urls: ['https://example.com'],
  }),
});

console.log(`   Status: ${scrapeResponse.status}`);
console.log(`   Status Text: ${scrapeResponse.statusText}`);

const responseHeaders = {};
scrapeResponse.headers.forEach((value, key) => {
  responseHeaders[key] = value;
});
console.log(`   Response Headers: ${JSON.stringify(responseHeaders, null, 2)}`);

const responseText = await scrapeResponse.text();
console.log(`   Response Body: ${responseText}`);
