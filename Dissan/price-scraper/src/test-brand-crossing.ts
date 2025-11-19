/**
 * Test Brand-Crossing Characteristic Matching
 *
 * Tests matching ATL products to their Rubbermaid equivalents on Swish
 * This requires characteristic-based matching since brand names are different
 */

import { SwishScraper } from './scrapers/swish-scraper';
import { getCompetitorConfig } from './config';

async function testBrandCrossing() {
  console.log('🧪 Testing Brand-Crossing Characteristic Matching\n');
  console.log('Goal: Match ATL products to Rubbermaid equivalents on Swish\n');
  console.log('='.repeat(70) + '\n');

  const config = getCompetitorConfig('swish');

  // ATL products that likely have Rubbermaid equivalents
  // We search by ATL brand + product characteristics
  const testProducts = [
    {
      skuCleaned: 'ATL-WASTEBASKET',
      nameCleaned: 'wastebasket plastic 13 quart',
      name: 'Wastebasket plastic rectangular 13 quart beige',
      brand: 'ATL',  // Searching for ATL...
    },
    {
      skuCleaned: 'ATL-TRASH-CAN',
      nameCleaned: 'trash can 23 gallon',
      name: 'Trash can with lid plastic 23 gallon gray',
      brand: 'ATL',  // ...but expecting Rubbermaid results
    },
    {
      skuCleaned: 'ATL-LOBBY-BROOM',
      nameCleaned: 'lobby broom',
      name: 'Lobby broom angled flagged bristles',
      brand: 'ATL',
    },
    {
      skuCleaned: 'ATL-SPRAY-BOTTLE',
      nameCleaned: 'spray bottle 32 oz',
      name: 'Spray bottle trigger sprayer 32 oz plastic',
      brand: 'ATL',
    },
    {
      skuCleaned: 'ATL-CADDY',
      nameCleaned: 'utility caddy',
      name: 'Utility cleaning caddy divided compartments',
      brand: 'ATL',
    },
  ];

  console.log('Testing ATL products (expecting Rubbermaid matches):');
  testProducts.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.brand}] ${p.name}`);
  });
  console.log('\n' + '='.repeat(70) + '\n');

  const scraper = new SwishScraper(config);

  try {
    const results = await scraper.scrapeProducts(testProducts as any);

    console.log('\n' + '='.repeat(70));
    console.log('📊 Results:\n');

    const characteristicMatches = results.filter(r => r.matchType === 'characteristic').length;
    const nameMatches = results.filter(r => r.matchType === 'name').length;
    const found = results.filter(r => r.found).length;

    console.log(`✅ Found: ${found}/5 (${(found/5*100).toFixed(0)}%)`);
    console.log(`   - Exact name matches: ${nameMatches}`);
    console.log(`   - Characteristic matches (brand-crossing): ${characteristicMatches} 🆕\n`);

    results.forEach((r, i) => {
      const p = testProducts[i];
      const status = r.found ? '✅' : '❌';
      const icon = r.matchType === 'characteristic' ? '🔍' : '';

      console.log(`${status} ${icon} [${p.brand}] ${p.name}`);
      if (r.found && r.productName) {
        const conf = r.confidence ? (r.confidence * 100).toFixed(0) : 'N/A';
        const price = r.price || 'N/A';
        console.log(`   → ${r.productName.substring(0, 70)}`);
        console.log(`   → Match: ${r.matchType} (${conf}% confidence) | Price: $${price}`);
      }
      console.log('');
    });

    console.log('='.repeat(70));

    if (characteristicMatches > 0) {
      console.log(`\n🎉 SUCCESS! ${characteristicMatches} ATL products matched to Rubbermaid equivalents!`);
      console.log('Characteristic matching is working across brands!');
    } else if (nameMatches > 0) {
      console.log(`\n✅ Found ${nameMatches} exact name matches`);
      console.log('No characteristic matches - products may have identical names despite different brands');
    } else {
      console.log('\n⚠️  No matches found - may need to adjust characteristic matching threshold');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testBrandCrossing().catch(console.error);
