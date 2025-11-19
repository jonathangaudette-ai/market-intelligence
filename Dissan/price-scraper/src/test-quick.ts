/**
 * Quick Test - 5 products only for fast testing
 */

import { SwishScraper } from './scrapers/swish-scraper';
import { getCompetitorConfig } from './config';

async function quickTest() {
  console.log('🧪 Quick Characteristic Matching Test (5 products)\n');

  const config = getCompetitorConfig('swish');

  // Manual test products - generic items likely to be on Swish
  const testProducts = [
    {
      skuCleaned: 'TEST-001',
      nameCleaned: 'bowl brush polypropylene',
      name: 'Bowl brush polypropylene turks head',
      brand: 'ATL',
    },
    {
      skuCleaned: 'TEST-002',
      nameCleaned: 'toilet plunger',
      name: 'Toilet plunger heavy duty',
      brand: 'ATL',
    },
    {
      skuCleaned: 'TEST-003',
      nameCleaned: 'mop handle',
      name: 'Mop handle aluminium 60 inch',
      brand: 'ATL',
    },
    {
      skuCleaned: 'TEST-004',
      nameCleaned: 'rubber gloves',
      name: 'Rubber gloves latex medium',
      brand: 'ATL',
    },
    {
      skuCleaned: 'TEST-005',
      nameCleaned: 'trash can',
      name: 'Trash can plastic 23 gallon',
      brand: 'Rubbermaid',
    },
  ];

  console.log('Testing 5 generic products:');
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

    console.log(`✅ Found: ${found}/5`);
    console.log(`   - Name matches: ${nameMatches}`);
    console.log(`   - Characteristic matches: ${characteristicMatches} 🆕\n`);

    results.forEach((r, i) => {
      const p = testProducts[i];
      const status = r.found ? '✅' : '❌';
      console.log(`${status} ${p.name}`);
      if (r.found && r.productName) {
        console.log(`   → ${r.productName} (${r.matchType}, ${(r.confidence! * 100).toFixed(0)}% conf, $${r.price})`);
      }
    });

    console.log('\n' + '='.repeat(70));

    if (characteristicMatches > 0) {
      console.log(`\n🎉 SUCCESS! Characteristic matching found ${characteristicMatches} similar products!`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

quickTest().catch(console.error);
