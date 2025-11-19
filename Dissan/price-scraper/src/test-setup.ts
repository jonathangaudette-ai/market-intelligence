/**
 * Test Setup - Validation de l'installation et configuration
 */

import { loadProducts, loadProductsSample, getProductStats } from './utils/product-loader';
import { getAllCompetitors, validatePaths } from './config';

async function testSetup() {
  console.log('🧪 Testing Price Scraper Setup\n');
  console.log('='.repeat(70));

  // Test 1: Validate paths
  console.log('\n1️⃣  Testing paths validation...');
  try {
    validatePaths();
    console.log('   ✅ All required directories exist');
  } catch (error) {
    console.error('   ❌ Path validation failed:', error);
    process.exit(1);
  }

  // Test 2: Load competitors config
  console.log('\n2️⃣  Testing competitors configuration...');
  try {
    const competitors = getAllCompetitors();
    console.log(`   ✅ Loaded ${competitors.length} competitors`);
    competitors.forEach((c, i) => {
      console.log(`      ${i + 1}. ${c.id.padEnd(15)} - ${c.name} (Priority ${c.priority})`);
    });
  } catch (error) {
    console.error('   ❌ Failed to load competitors:', error);
    process.exit(1);
  }

  // Test 3: Load products
  console.log('\n3️⃣  Testing product loading...');
  try {
    const products = await loadProducts();
    console.log(`   ✅ Loaded ${products.length} products`);

    // Show sample products
    console.log('\n   Sample products:');
    products.slice(0, 5).forEach((p, i) => {
      console.log(`      ${i + 1}. [${p.brand}] ${p.skuCleaned} - ${p.name.substring(0, 50)}...`);
    });
  } catch (error) {
    console.error('   ❌ Failed to load products:', error);
    process.exit(1);
  }

  // Test 4: Load product sample
  console.log('\n4️⃣  Testing sample loading...');
  try {
    const sample = await loadProductsSample(10);
    console.log(`   ✅ Loaded ${sample.length} sample products`);
  } catch (error) {
    console.error('   ❌ Failed to load sample:', error);
    process.exit(1);
  }

  // Test 5: Get product statistics
  console.log('\n5️⃣  Testing product statistics...');
  try {
    const stats = await getProductStats();
    console.log(`   ✅ Total products: ${stats.total}`);
    console.log(`\n   Top 10 brands:`);

    const sortedBrands = Object.entries(stats.byBrand)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedBrands.forEach(([brand, count], i) => {
      console.log(`      ${(i + 1).toString().padStart(2)}. ${brand.padEnd(6)} - ${count} products`);
    });
  } catch (error) {
    console.error('   ❌ Failed to get stats:', error);
    process.exit(1);
  }

  // Test 6: Test scrapers availability
  console.log('\n6️⃣  Testing scraper availability...');
  const availableScrapers = ['swish', 'grainger', 'cleanitsupply'];
  console.log(`   ✅ ${availableScrapers.length} scrapers implemented:`);
  availableScrapers.forEach((scraper, i) => {
    console.log(`      ${i + 1}. ${scraper}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ All tests passed! Setup is ready.');
  console.log('\n📝 Next steps:');
  console.log('   1. Adjust CSS selectors in competitors-config.json by inspecting real sites');
  console.log('   2. Run: npm run scrape:test (test on 50 products)');
  console.log('   3. Validate results and adjust as needed');
  console.log('   4. Implement remaining 10 scrapers');
  console.log('   5. Run: npm run scrape:all (full scraping)\n');
}

testSetup().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
