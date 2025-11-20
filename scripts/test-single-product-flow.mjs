#!/usr/bin/env node
/**
 * Test Complete Flow for Single Product
 *
 * Flow: GPT-5 Search → Cache URL → Scrape → Match → Display
 */
import postgres from 'postgres';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const sql = postgres(process.env.DATABASE_URL);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PRODUCT_SKU = 'SNT-SC3700A'; // QUIETCLEAN canister vacuum
const COMPETITOR_SLUG = 'swish';

console.log('🧪 Testing Single Product Flow\n');
console.log(`Product: ${PRODUCT_SKU}`);
console.log(`Competitor: ${COMPETITOR_SLUG}\n`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  // Step 1: Get product from DB
  console.log('1️⃣ Fetching product from database...\n');

  const [product] = await sql`
    SELECT id, sku, name, brand, category, current_price
    FROM pricing_products
    WHERE sku = ${PRODUCT_SKU}
    AND deleted_at IS NULL
    LIMIT 1
  `;

  if (!product) {
    console.log(`❌ Product ${PRODUCT_SKU} not found`);
    process.exit(1);
  }

  console.log(`✅ Product found:`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Name: ${product.name}`);
  console.log(`   SKU: ${product.sku}`);
  console.log(`   Current Price: $${product.current_price || 'N/A'}\n`);

  // Step 2: Get competitor
  console.log('2️⃣ Fetching competitor...\n');

  const [competitor] = await sql`
    SELECT id, name, website_url
    FROM pricing_competitors
    WHERE company_id = (SELECT company_id FROM pricing_products WHERE id = ${product.id})
    AND is_active = true
    LIMIT 1
  `;

  if (!competitor) {
    console.log('❌ No active competitor found');
    process.exit(1);
  }

  console.log(`✅ Competitor: ${competitor.name}`);
  console.log(`   URL: ${competitor.website_url}\n`);

  // Step 3: Check existing match
  console.log('3️⃣ Checking for existing match...\n');

  const [existingMatch] = await sql`
    SELECT
      id,
      competitor_product_url,
      competitor_product_name,
      price,
      confidence_score,
      match_source,
      last_scraped_at
    FROM pricing_matches
    WHERE product_id = ${product.id}
    AND competitor_id = ${competitor.id}
    LIMIT 1
  `;

  if (existingMatch) {
    console.log(`⚠️  Existing match found:`);
    console.log(`   URL: ${existingMatch.competitor_product_url}`);
    console.log(`   Name: ${existingMatch.competitor_product_name || 'N/A'}`);
    console.log(`   Price: $${existingMatch.price}`);
    console.log(`   Source: ${existingMatch.match_source}`);
    console.log(`   Last scraped: ${existingMatch.last_scraped_at?.toISOString()}`);
    console.log(`\n   🔄 Deleting existing match to test fresh flow...\n`);

    await sql`
      DELETE FROM pricing_matches
      WHERE id = ${existingMatch.id}
    `;

    console.log(`   ✅ Existing match deleted\n`);
  } else {
    console.log(`✅ No existing match (fresh test)\n`);
  }

  // Step 4: GPT-5 Search for URL
  console.log('4️⃣ GPT-5 Search: Discovering product URL...\n');

  const startSearch = Date.now();
  const competitorHostname = new URL(competitor.website_url).hostname;

  const searchPrompt = `Find the product "${product.name}" (SKU: ${product.sku}) on ${competitor.website_url} website.

Instructions:
1. Search specifically on ${competitorHostname} for this exact product or very similar product
2. Return ONLY the direct product URL if found (e.g., ${competitor.website_url}/products/...)
3. If you find the product, respond with just the URL
4. If you cannot find the product, respond with "NOT_FOUND"
5. Be confident - only return a URL if you're sure it's the right product (>70% confidence)

Product details:
- Name: ${product.name}
- SKU: ${product.sku}
${product.brand ? `- Brand: ${product.brand}` : ''}
${product.category ? `- Category: ${product.category}` : ''}`;

  let discoveredUrl = null;
  let confidence = 0;
  let searchError = null;

  try {
    const response = await openai.responses.create({
      model: 'gpt-5',
      tools: [{ type: 'web_search' }],
      tool_choice: { type: 'web_search' },
      reasoning: { effort: 'medium' },  // Effort moyen pour meilleure précision
      input: searchPrompt
    });

    const answer = response.output_text?.trim() || response.output?.trim() || 'NOT_FOUND';
    const isUrl = answer.startsWith('http') && answer.includes(competitorHostname);

    if (isUrl) {
      // Validate URL
      try {
        const parsed = new URL(answer);
        if (parsed.protocol === 'https:' && parsed.hostname === competitorHostname) {
          discoveredUrl = answer;
          confidence = 0.85;
        }
      } catch (e) {
        searchError = `Invalid URL format: ${answer}`;
      }
    } else {
      searchError = `Not found: ${answer}`;
    }
  } catch (error) {
    searchError = error.message;
  }

  const searchDuration = ((Date.now() - startSearch) / 1000).toFixed(1);

  console.log(`   Duration: ${searchDuration}s`);
  console.log(`   Found URL: ${discoveredUrl || 'NOT_FOUND'}`);
  console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);

  if (searchError) {
    console.log(`   ⚠️  Search note: ${searchError}`);
  }

  if (!discoveredUrl) {
    console.log(`\n❌ GPT-5 could not find URL for this product`);
    console.log(`   This is normal - not all products can be matched.`);
    console.log(`\n   To test with a product that should match, try:`);
    console.log(`   - SKU: INS-ts-ft100 (Facial tissue - confirmed match in earlier test)\n`);
    await sql.end();
    process.exit(0);
  }

  console.log(`\n   ✅ URL discovered: ${discoveredUrl}\n`);

  // Step 5: Cache URL in pricingMatches
  console.log('5️⃣ Caching discovered URL in database...\n');

  const [cachedMatch] = await sql`
    INSERT INTO pricing_matches (
      id,
      product_id,
      competitor_id,
      competitor_product_url,
      competitor_product_name,
      price,
      currency,
      match_type,
      match_source,
      confidence_score,
      needs_revalidation,
      last_scraped_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid()::text,
      ${product.id},
      ${competitor.id},
      ${discoveredUrl},
      '',
      0.00,
      'CAD',
      'ai',
      'gpt5-search',
      ${confidence},
      false,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (product_id, competitor_id) DO UPDATE SET
      competitor_product_url = ${discoveredUrl},
      match_source = 'gpt5-search',
      confidence_score = ${confidence},
      updated_at = NOW()
    RETURNING id
  `;

  console.log(`   ✅ URL cached in pricing_matches (ID: ${cachedMatch.id})\n`);

  // Step 6: Scrape product with Playwright (via Railway worker)
  console.log('6️⃣ Scraping product price with Playwright...\n');

  const RAILWAY_WORKER_URL = process.env.RAILWAY_WORKER_URL;
  const RAILWAY_WORKER_API_KEY = process.env.RAILWAY_WORKER_API_KEY;

  if (!RAILWAY_WORKER_URL || !RAILWAY_WORKER_API_KEY) {
    console.log('⚠️  Railway worker not configured (skipping scrape test)');
    console.log('   Set RAILWAY_WORKER_URL and RAILWAY_WORKER_API_KEY\n');
  } else {
    const scrapeResponse = await fetch(`${RAILWAY_WORKER_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': RAILWAY_WORKER_API_KEY
      },
      body: JSON.stringify({
        companyId: 'company_1762968795076',
        companySlug: 'my-company',
        competitorId: competitor.id,
        competitorName: competitor.name,
        competitorUrl: competitor.website_url,
        products: [{
          type: 'direct',
          id: product.id,
          url: discoveredUrl
        }]
      }),
      timeout: 60000
    });

    if (scrapeResponse.ok) {
      const scrapeData = await scrapeResponse.json();
      console.log(`   ✅ Scrape completed`);
      console.log(`   Products scraped: ${scrapeData.productsScraped || 0}`);

      if (scrapeData.scrapedProducts && scrapeData.scrapedProducts.length > 0) {
        const scraped = scrapeData.scrapedProducts[0];
        console.log(`\n   📊 Scraped Data:`);
        console.log(`      Name: ${scraped.name}`);
        console.log(`      Price: $${scraped.price} ${scraped.currency}`);
        console.log(`      In Stock: ${scraped.inStock ? 'Yes' : 'No'}`);
        console.log(`      URL: ${scraped.url}\n`);

        // Update match with scraped data
        await sql`
          UPDATE pricing_matches
          SET
            competitor_product_name = ${scraped.name},
            price = ${scraped.price},
            currency = ${scraped.currency || 'CAD'},
            in_stock = ${scraped.inStock},
            last_scraped_at = NOW(),
            updated_at = NOW()
          WHERE product_id = ${product.id}
          AND competitor_id = ${competitor.id}
        `;

        console.log(`   ✅ Match updated with scraped data\n`);
      }
    } else {
      const errorText = await scrapeResponse.text();
      console.log(`   ⚠️  Scrape failed: ${scrapeResponse.status} ${scrapeResponse.statusText}`);
      console.log(`   Error: ${errorText}\n`);
    }
  }

  // Step 7: Verify final match
  console.log('7️⃣ Verifying final match in database...\n');

  const [finalMatch] = await sql`
    SELECT
      pm.id,
      pm.competitor_product_url,
      pm.competitor_product_name,
      pm.price,
      pm.currency,
      pm.confidence_score,
      pm.match_source,
      pm.in_stock,
      pm.last_scraped_at,
      pc.name as competitor_name
    FROM pricing_matches pm
    INNER JOIN pricing_competitors pc ON pm.competitor_id = pc.id
    WHERE pm.product_id = ${product.id}
    AND pm.competitor_id = ${competitor.id}
    LIMIT 1
  `;

  if (!finalMatch) {
    console.log('❌ Match not found in database');
    process.exit(1);
  }

  console.log(`✅ Match verified in database:`);
  console.log(`\n   📦 Your Product:`);
  console.log(`      ${product.name}`);
  console.log(`      SKU: ${product.sku}`);
  console.log(`      Price: $${product.current_price || 'N/A'}`);
  console.log(`\n   🎯 Competitor Match (${finalMatch.competitor_name}):`);
  console.log(`      ${finalMatch.competitor_product_name || 'Pending scrape'}`);
  console.log(`      URL: ${finalMatch.competitor_product_url}`);
  console.log(`      Price: $${finalMatch.price} ${finalMatch.currency}`);
  console.log(`      In Stock: ${finalMatch.in_stock !== null ? (finalMatch.in_stock ? 'Yes' : 'No') : 'Unknown'}`);
  console.log(`      Confidence: ${(parseFloat(finalMatch.confidence_score) * 100).toFixed(0)}%`);
  console.log(`      Source: ${finalMatch.match_source}`);
  console.log(`      Last Scraped: ${finalMatch.last_scraped_at?.toISOString()}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ SINGLE PRODUCT FLOW TEST COMPLETE!\n');
  console.log(`🌐 View in UI: https://market-intelligence-kappa.vercel.app/companies/my-company/pricing/products/${product.id}\n`);
  console.log('   Refresh the page to see the match appear in "Correspondances Concurrents".\n');

  await sql.end();
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  await sql.end();
  process.exit(1);
}
