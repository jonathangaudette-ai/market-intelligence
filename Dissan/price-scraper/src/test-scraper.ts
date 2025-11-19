/**
 * Test Scraper - Quick test on 5 products
 */

import { getCompetitorConfig } from './config';
import { loadProducts } from './utils/product-loader';
import { SwishScraper } from './scrapers/swish-scraper';

async function testScraper() {
  console.log('🧪 Testing Swish Scraper on 5 products\n');

  const config = getCompetitorConfig('swish');
  const allProducts = await loadProducts();

  // Take only first 5 products for quick test
  const testProducts = allProducts.slice(0, 5);

  console.log(`Testing with ${testProducts.length} products:\n`);
  testProducts.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.brand}] ${p.skuCleaned} - ${p.name.substring(0, 60)}...`);
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

    console.log(`✅ Found: ${found}/${testProducts.length} (${(found / testProducts.length * 100).toFixed(1)}%)`);
    console.log(`❌ Not found: ${notFound}`);
    console.log(`⚠️  Errors: ${errors}`);

    console.log('\nDetailed results:');
    results.forEach((r, i) => {
      const status = r.found ? '✅' : (r.error ? '⚠️' : '❌');
      const price = r.price ? `$${r.price}` : 'N/A';
      console.log(`  ${status} ${testProducts[i].skuCleaned} - ${r.matchType} - ${price}`);
      if (r.error) {
        console.log(`     Error: ${r.error}`);
      }
    });

    console.log('\n' + '='.repeat(70));

    if (found === 0) {
      console.log('\n⚠️  NO PRODUCTS FOUND - CSS Selectors need adjustment!');
      console.log('Next steps:');
      console.log('1. Open https://swish.ca in browser');
      console.log('2. Search for a product (e.g., "ATL-12600")');
      console.log('3. Inspect elements with DevTools (F12)');
      console.log('4. Update selectors in competitors-config.json');
    } else if (found < testProducts.length * 0.5) {
      console.log('\n⚠️  Low success rate - CSS Selectors may need adjustment');
    } else {
      console.log('\n✅ Good success rate! Ready to test on more products');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testScraper().catch(console.error);
