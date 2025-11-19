/**
 * Test Characteristic Matching
 *
 * Tests the new characteristic-based matching against Swish.ca
 * to see if we can find similar products even with different brands
 */

import { SwishScraper } from './scrapers/swish-scraper';
import { getCompetitorConfig } from './config';
import { loadProducts } from './utils/product-loader';

async function testCharacteristicMatching() {
  console.log('🧪 Testing Characteristic-Based Matching on Swish.ca\n');
  console.log('Goal: Find similar products even with different brands\n');
  console.log('='.repeat(70) + '\n');

  const config = getCompetitorConfig('swish');
  const allProducts = await loadProducts();

  // Select products that are likely to have equivalents on Swish
  // Focus on generic product types (brushes, mops, etc.)
  const testProducts = allProducts.filter(p => {
    const name = p.name.toLowerCase();
    return (
      name.includes('bowl brush') ||
      name.includes('mop') ||
      name.includes('brush') ||
      name.includes('plunger') ||
      name.includes('duster') ||
      name.includes('squeegee') ||
      name.includes('handle')
    );
  }).slice(0, 20); // Test first 20 matching products

  console.log(`Testing ${testProducts.length} products (generic cleaning tools):\n`);
  testProducts.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.brand}] ${p.name.substring(0, 70)}...`);
  });
  console.log('\n' + '='.repeat(70) + '\n');

  const scraper = new SwishScraper(config);

  try {
    const results = await scraper.scrapeProducts(testProducts);

    console.log('\n' + '='.repeat(70));
    console.log('📊 Test Results:\n');

    const found = results.filter(r => r.found).length;
    const notFound = results.filter(r => !r.found && !r.error).length;
    const errors = results.filter(r => r.error).length;

    // Break down by match type
    const skuMatches = results.filter(r => r.matchType === 'sku').length;
    const nameMatches = results.filter(r => r.matchType === 'name').length;
    const characteristicMatches = results.filter(r => r.matchType === 'characteristic').length;

    console.log(`✅ Found: ${found}/${testProducts.length} (${(found / testProducts.length * 100).toFixed(1)}%)`);
    console.log(`   - SKU matches: ${skuMatches}`);
    console.log(`   - Name matches: ${nameMatches}`);
    console.log(`   - Characteristic matches: ${characteristicMatches} 🆕`);
    console.log(`❌ Not found: ${notFound}`);
    console.log(`⚠️  Errors: ${errors}`);

    console.log('\n📋 Detailed Results:\n');
    // Only show results for products we actually tested
    const actualResults = results.slice(0, testProducts.length);
    actualResults.forEach((r, i) => {
      const product = testProducts[i];
      if (!product) return; // Skip if product not found

      const status = r.found ? '✅' : (r.error ? '⚠️' : '❌');
      const price = r.price ? `$${r.price}` : 'N/A';
      const matchIcon = r.matchType === 'characteristic' ? '🔍' : '';

      console.log(`  ${status} ${matchIcon} [${product.brand}] ${product.skuCleaned}`);
      console.log(`     Dissan: ${product.name.substring(0, 60)}`);

      if (r.found && r.productName) {
        console.log(`     Swish:  ${r.productName.substring(0, 60)} (${r.matchType}, conf: ${r.confidence?.toFixed(2)}, ${price})`);
      }
      console.log('');
    });

    console.log('='.repeat(70));

    if (characteristicMatches > 0) {
      console.log(`\n🎉 SUCCESS! Found ${characteristicMatches} products using characteristic matching!`);
      console.log('This means we can now match similar products even from different brands.');
    } else if (found === 0) {
      console.log('\n⚠️  NO PRODUCTS FOUND - CSS Selectors may need adjustment');
    } else if (nameMatches > 0) {
      console.log(`\n✅ Found ${nameMatches} exact name matches, but no characteristic matches yet`);
      console.log('Swish may carry the same brands, or the characteristic threshold may need tuning');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testCharacteristicMatching().catch(console.error);
