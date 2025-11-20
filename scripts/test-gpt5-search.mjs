#!/usr/bin/env node
/**
 * Test GPT-5 Search API for Product Discovery
 *
 * Tests if GPT-5 can find Dissan products on swish.ca using web search
 */

import OpenAI from 'openai';
import fetch from 'node-fetch';

const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || 'https://market-intelligence-kappa.vercel.app';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Search for a product on swish.ca using GPT-5 Search API
 */
async function searchProductOnSwish(product) {
  const startTime = Date.now();

  try {
    console.log(`\n🔍 Searching for: ${product.name} (SKU: ${product.sku})`);

    const response = await openai.responses.create({
      model: "gpt-5",
      tools: [{ type: "web_search" }],
      tool_choice: { type: "web_search" },
      reasoning: { effort: "medium" },
      input: `Find the product "${product.name}" (SKU: ${product.sku}) on swish.ca website.

Instructions:
1. Search specifically on swish.ca for this exact product or very similar product
2. Return ONLY the direct product URL if found (e.g., https://swish.ca/products/...)
3. If you find the product, respond with just the URL
4. If you cannot find the product, respond with "NOT_FOUND"
5. Be confident - only return a URL if you're sure it's the right product (>70% confidence)

Product details:
- Name: ${product.name}
- SKU: ${product.sku}
${product.brand ? `- Brand: ${product.brand}` : ''}
${product.category ? `- Category: ${product.category}` : ''}`
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const answer = response.output_text?.trim() || response.output?.trim() || 'N/A';

    // Parse response
    const isUrl = answer.startsWith('http') && answer.includes('swish.ca');
    const url = isUrl ? answer : null;

    // Calculate confidence (simplified for now)
    const confidence = url ? 0.85 : 0.30;

    return {
      product: product.name,
      sku: product.sku,
      url,
      found: !!url,
      confidence,
      duration: parseFloat(duration),
      rawResponse: answer
    };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.error(`   ❌ Error: ${error.message}`);

    return {
      product: product.name,
      sku: product.sku,
      url: null,
      found: false,
      confidence: 0,
      duration: parseFloat(duration),
      error: error.message
    };
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🧪 GPT-5 Search API Test - Product Discovery\n');
  console.log(`Deployment: ${DEPLOYMENT_URL}`);
  console.log(`Model: gpt-5-search-api`);
  console.log(`Target: swish.ca\n`);

  try {
    // 1. Fetch 5 random products from production
    console.log('📦 Fetching 5 products from catalog...\n');

    const productsResponse = await fetch(
      `${DEPLOYMENT_URL}/api/companies/my-company/pricing/products?limit=5`
    );

    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch products: ${productsResponse.status}`);
    }

    const { products } = await productsResponse.json();

    if (!products || products.length === 0) {
      throw new Error('No products found in catalog');
    }

    console.log(`✅ Loaded ${products.length} products\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 2. Search for each product
    const results = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`[${i + 1}/${products.length}] Testing: ${product.name}`);

      const result = await searchProductOnSwish(product);
      results.push(result);

      // Display result
      if (result.found) {
        console.log(`   ✅ FOUND`);
        console.log(`   📍 URL: ${result.url}`);
        console.log(`   ⏱️  Time: ${result.duration}s | Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      } else {
        console.log(`   ❌ NOT FOUND`);
        console.log(`   💬 Response: ${result.rawResponse || 'N/A'}`);
        console.log(`   ⏱️  Time: ${result.duration}s`);
      }

      // Small delay between requests to avoid rate limiting
      if (i < products.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 3. Generate report
    const found = results.filter(r => r.found).length;
    const notFound = results.filter(r => !r.found).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const avgConfidence = results.filter(r => r.found).reduce((sum, r) => sum + r.confidence, 0) / Math.max(found, 1);

    // Estimated cost (very rough estimate)
    // GPT-5 Search API: ~$0.10 per search (approximate)
    const estimatedCost = results.length * 0.10;

    console.log('📊 TEST RESULTS\n');
    console.log(`✅ Products found: ${found}/${results.length} (${(found / results.length * 100).toFixed(0)}%)`);
    console.log(`❌ Products not found: ${notFound}/${results.length} (${(notFound / results.length * 100).toFixed(0)}%)`);
    console.log(`⏱️  Average duration: ${avgDuration.toFixed(1)}s`);
    console.log(`🎯 Average confidence (found): ${(avgConfidence * 100).toFixed(0)}%`);
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(2)}\n`);

    // Detailed results
    console.log('📋 DETAILED RESULTS:\n');
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.found ? '✅' : '❌'} ${r.product} (${r.sku})`);
      if (r.found) {
        console.log(`   ${r.url}`);
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. Recommendations
    const discoveryRate = found / results.length;

    console.log('💡 RECOMMENDATIONS:\n');

    if (discoveryRate >= 0.6) {
      console.log('✅ SUCCESS: Discovery rate is good (≥60%)');
      console.log('   → Proceed with full implementation for all 53 products');
      console.log('   → Expected matches: ~' + Math.round(53 * discoveryRate) + '/53 products\n');
    } else if (discoveryRate >= 0.4) {
      console.log('⚠️  MODERATE: Discovery rate is acceptable (40-60%)');
      console.log('   → Consider adjusting search strategy');
      console.log('   → Try reasoning.effort: "high" for better accuracy');
      console.log('   → Refine product descriptions in catalog\n');
    } else {
      console.log('❌ LOW: Discovery rate is poor (<40%)');
      console.log('   → Review search approach');
      console.log('   → Check if swish.ca product names match your catalog');
      console.log('   → Consider hybrid approach (GPT-5 Search + fallback)\n');
    }

    // Projection for all 53 products
    console.log('📈 PROJECTION FOR ALL 53 PRODUCTS:\n');
    const projectedMatches = Math.round(53 * discoveryRate);
    const projectedTime = Math.ceil((53 * avgDuration) / 60);
    const projectedCost = (53 * 0.10).toFixed(2);

    console.log(`   Estimated matches: ${projectedMatches}/53 (${(discoveryRate * 100).toFixed(0)}%)`);
    console.log(`   Estimated time: ~${projectedTime} minutes`);
    console.log(`   Estimated cost: $${projectedCost}\n`);

    console.log('✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
runTest();
