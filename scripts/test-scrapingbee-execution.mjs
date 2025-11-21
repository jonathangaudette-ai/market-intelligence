/**
 * Test script to reproduce the ScrapingBee execution issue
 */

import postgres from 'postgres';
import axios from 'axios';
import * as cheerio from 'cheerio';

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('🔍 Fetching Swish competitor and match...\n');

  // Get competitor
  const [competitor] = await sql`
    SELECT * FROM pricing_competitors
    WHERE name = 'Swish'
  `;

  // Get match with URL
  const [match] = await sql`
    SELECT
      pm.*,
      pp.id as product_id,
      pp.sku,
      pp.name as product_name
    FROM pricing_matches pm
    JOIN pricing_products pp ON pm.product_id = pp.id
    WHERE pm.competitor_id = ${competitor.id}
    AND pm.competitor_product_url IS NOT NULL
    LIMIT 1
  `;

  if (!match) {
    console.error('❌ No match with URL found');
    process.exit(1);
  }

  console.log('✅ Found match:');
  console.log('   Product:', match.product_name);
  console.log('   URL:', match.competitor_product_url);
  console.log('');

  // Parse scraper config (simulate production)
  let scraperConfig = competitor.scraper_config;
  if (typeof scraperConfig === 'string') {
    scraperConfig = JSON.parse(scraperConfig);
    console.log('✅ Parsed scraperConfig from string');
  }

  console.log('📋 ScraperConfig:');
  console.log('   Type:', scraperConfig.scraperType);
  console.log('   Has scrapingbee:', !!scraperConfig.scrapingbee);
  console.log('');

  if (scraperConfig.scraperType !== 'scrapingbee') {
    console.error('❌ scraperType is not scrapingbee');
    process.exit(1);
  }

  const config = scraperConfig.scrapingbee;

  if (!config) {
    console.error('❌ scrapingbee config is missing');
    process.exit(1);
  }

  console.log('🚀 Testing ScrapingBee API call...\n');

  const productUrl = match.competitor_product_url;
  const startTime = Date.now();

  // Build ScrapingBee API request (exactly like production code)
  const params = new URLSearchParams({
    api_key: process.env.SCRAPINGBEE_API_KEY,
    url: productUrl,
    premium_proxy: config.api.premium_proxy.toString(),
    country_code: config.api.country_code,
    render_js: config.api.render_js.toString(),
    wait: config.api.wait.toString(),
    block_ads: config.api.block_ads.toString(),
    block_resources: config.api.block_resources.toString(),
  });

  console.log('📤 Request params:', params.toString().substring(0, 200) + '...');
  console.log('');

  const response = await axios.get(
    `https://app.scrapingbee.com/api/v1/?${params.toString()}`,
    {
      timeout: config.api.timeout,
    }
  );

  const duration = Date.now() - startTime;
  const creditsUsed = response.headers['spb-cost'];

  console.log(`✅ ScrapingBee response received in ${duration}ms`);
  console.log(`   Credits used: ${creditsUsed}`);
  console.log(`   HTML length: ${response.data.length} chars`);
  console.log('');

  // Parse HTML
  const $ = cheerio.load(response.data);

  // Extract data
  const extractWithFallback = (selectors) => {
    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text) return text;
      }
    }
    return null;
  };

  const name = extractWithFallback(config.selectors.productName);
  const priceText = extractWithFallback(config.selectors.productPrice);

  console.log('📊 Extracted data:');
  console.log('   Name:', name);
  console.log('   Price text:', priceText);

  if (priceText) {
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[0].replace(/,/g, ''));
      console.log('   Price parsed:', price);
    }
  }

  console.log('\n✅ Test completed successfully!');

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
} finally {
  await sql.end();
}
