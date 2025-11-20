#!/usr/bin/env node
/**
 * Test URL Cache Optimization with Swish
 *
 * This script tests the optimization by running 2 scans:
 * 1. First scan: Full search + GPT-5 (establishes cache)
 * 2. Second scan: Direct URLs + skip GPT-5 (uses cache)
 */

const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || 'https://market-intelligence-kappa.vercel.app';
const COMPANY_SLUG = 'dissan';

async function testOptimization() {
  console.log('\n🧪 Testing URL Cache Optimization with Swish\n');
  console.log(`Deployment: ${DEPLOYMENT_URL}`);
  console.log(`Company: ${COMPANY_SLUG}\n`);

  try {
    // Step 1: Get competitor ID
    console.log('📋 Step 1: Fetching Swish competitor ID...');
    const competitorsRes = await fetch(
      `${DEPLOYMENT_URL}/api/companies/${COMPANY_SLUG}/pricing/competitors`
    );

    if (!competitorsRes.ok) {
      throw new Error(`Failed to fetch competitors: ${competitorsRes.status}`);
    }

    const { competitors } = await competitorsRes.json();
    const swish = competitors.find(c => c.name.toLowerCase().includes('swish'));

    if (!swish) {
      console.log('⚠️  Swish competitor not found. Creating...');

      const createRes = await fetch(
        `${DEPLOYMENT_URL}/api/companies/${COMPANY_SLUG}/pricing/competitors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Swish',
            websiteUrl: 'https://swish.ca',
            scanFrequency: 'daily',
            isActive: true,
          }),
        }
      );

      if (!createRes.ok) {
        throw new Error(`Failed to create Swish: ${createRes.status}`);
      }

      const newSwish = await createRes.json();
      console.log(`✅ Swish competitor created: ${newSwish.id}\n`);
      return testOptimization(); // Retry
    }

    console.log(`✅ Swish competitor found: ${swish.id}`);
    console.log(`   Products matched: ${swish.productsMatched || 0}\n`);

    // Step 2: Run first scan
    console.log('🔄 Step 2: Running FIRST scan (establishes cache)...');
    const scan1Start = Date.now();

    const scan1Res = await fetch(
      `${DEPLOYMENT_URL}/api/companies/${COMPANY_SLUG}/pricing/scans`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId: swish.id }),
      }
    );

    if (!scan1Res.ok) {
      const error = await scan1Res.json();
      throw new Error(`Scan 1 failed: ${error.error}`);
    }

    const scan1 = await scan1Res.json();
    const scan1Duration = Date.now() - scan1Start;

    console.log(`\n📊 SCAN #1 Results:`);
    console.log(`   Duration: ${(scan1Duration / 1000).toFixed(1)}s`);
    console.log(`   Products scraped: ${scan1.productsScraped}`);
    console.log(`   Products matched: ${scan1.productsMatched || 0}`);
    console.log(`   Products failed: ${scan1.productsFailed}`);
    console.log(`   Scan ID: ${scan1.scanId}\n`);

    // Wait a bit before second scan
    console.log('⏳ Waiting 3 seconds before second scan...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Run second scan (should use cache)
    console.log('🚀 Step 3: Running SECOND scan (uses cache)...');
    const scan2Start = Date.now();

    const scan2Res = await fetch(
      `${DEPLOYMENT_URL}/api/companies/${COMPANY_SLUG}/pricing/scans`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId: swish.id }),
      }
    );

    if (!scan2Res.ok) {
      const error = await scan2Res.json();
      throw new Error(`Scan 2 failed: ${error.error}`);
    }

    const scan2 = await scan2Res.json();
    const scan2Duration = Date.now() - scan2Start;

    console.log(`\n📊 SCAN #2 Results:`);
    console.log(`   Duration: ${(scan2Duration / 1000).toFixed(1)}s`);
    console.log(`   Products scraped: ${scan2.productsScraped}`);
    console.log(`   Products matched: ${scan2.productsMatched || 0}`);
    console.log(`   Products failed: ${scan2.productsFailed}`);
    console.log(`   Scan ID: ${scan2.scanId}\n`);

    // Step 4: Fetch scan details to see optimization logs
    console.log('📝 Step 4: Fetching scan logs for optimization metrics...\n');

    const scanDetailsRes = await fetch(
      `${DEPLOYMENT_URL}/api/companies/${COMPANY_SLUG}/pricing/scans/${scan2.scanId}`
    );

    if (scanDetailsRes.ok) {
      const scanDetails = await scanDetailsRes.json();

      console.log('🔍 Scan Logs (showing optimization info):');
      if (scanDetails.logs) {
        scanDetails.logs
          .filter(log => log.message.includes('optimization') || log.message.includes('cache'))
          .forEach(log => {
            console.log(`   [${log.type}] ${log.message}`);
            if (log.metadata) {
              console.log(`          `, log.metadata);
            }
          });
      }
      console.log('');
    }

    // Step 5: Calculate savings
    console.log('💰 OPTIMIZATION RESULTS:\n');

    const speedup = scan1Duration / scan2Duration;
    const speedupPercent = ((1 - scan2Duration / scan1Duration) * 100).toFixed(1);

    console.log(`   ⏱️  Speed Improvement:`);
    console.log(`      Scan #1: ${(scan1Duration / 1000).toFixed(1)}s`);
    console.log(`      Scan #2: ${(scan2Duration / 1000).toFixed(1)}s`);
    console.log(`      Speedup: ${speedup.toFixed(1)}x faster (${speedupPercent}% reduction)\n`);

    const scan1Cost = (scan1.productsScraped || 0) * 0.02; // $0.02 per GPT-5 call
    const scan2Cost = ((scan2.productsMatched || 0) - (scan1.productsMatched || 0)) * 0.02;
    const savings = scan1Cost - scan2Cost;
    const savingsPercent = scan1Cost > 0 ? ((savings / scan1Cost) * 100).toFixed(1) : 0;

    console.log(`   💵 Cost Savings (estimated):`);
    console.log(`      Scan #1 GPT-5: ~$${scan1Cost.toFixed(2)} (${scan1.productsScraped} products)`);
    console.log(`      Scan #2 GPT-5: ~$${scan2Cost.toFixed(2)} (cached: ${(scan1.productsMatched || 0)} products)`);
    console.log(`      Savings: ~$${savings.toFixed(2)} (${savingsPercent}% reduction)\n`);

    if (scan1.productsMatched > 0) {
      const monthlySavings = savings * 30; // Daily scans
      const annualSavings = monthlySavings * 12;

      console.log(`   📈 Projected Savings (daily scans):`);
      console.log(`      Monthly: ~$${monthlySavings.toFixed(2)}`);
      console.log(`      Annual: ~$${annualSavings.toFixed(2)}\n`);
    }

    console.log('✅ Optimization test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run test
testOptimization();
