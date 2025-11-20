#!/usr/bin/env node
/**
 * Test GPT-5 Search Integration in Production
 *
 * Triggers a scan and monitors for GPT-5 discovery logs
 */
import fetch from 'node-fetch';

const DEPLOYMENT_URL = 'https://market-intelligence-kappa.vercel.app';
const COMPANY_SLUG = 'my-company';

async function testIntegration() {
  console.log('🧪 Testing GPT-5 Search Integration in Production\n');
  console.log(`Deployment: ${DEPLOYMENT_URL}`);
  console.log(`Company: ${COMPANY_SLUG}\n`);

  try {
    // 1. Trigger scan
    console.log('1️⃣ Triggering competitor scan...\n');

    const scanResponse = await fetch(
      `${DEPLOYMENT_URL}/api/companies/${COMPANY_SLUG}/pricing/scans`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Scan all competitors
      }
    );

    if (!scanResponse.ok) {
      const error = await scanResponse.text();
      throw new Error(`Scan API failed (${scanResponse.status}): ${error}`);
    }

    const scanData = await scanResponse.json();
    console.log('✅ Scan triggered successfully!');
    console.log(`   Total competitors: ${scanData.totalCompetitors || 0}`);
    console.log(`   Successful scans: ${scanData.successfulScans || 0}`);
    console.log(`   Failed scans: ${scanData.failedScans || 0}\n`);

    if (!scanData.scans || scanData.scans.length === 0) {
      console.log('⚠️  No scans returned. Check if competitors are configured.\n');
      return;
    }

    // 2. Monitor first scan for GPT-5 discovery logs
    const firstScan = scanData.scans[0];
    const scanId = firstScan.scanId;

    console.log(`2️⃣ Monitoring scan ${scanId.slice(0, 8)}... for GPT-5 discovery\n`);

    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    let foundGPT5Log = false;
    let scanComplete = false;

    while (attempts < maxAttempts && !scanComplete) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s

      const statusResponse = await fetch(
        `${DEPLOYMENT_URL}/api/companies/${COMPANY_SLUG}/pricing/scans/${scanId}`
      );

      if (!statusResponse.ok) {
        console.error(`   ⚠️  Failed to fetch scan status (${statusResponse.status})`);
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      const scan = statusData.scan;

      if (!scan) {
        console.error('   ⚠️  Scan data not found in response');
        break;
      }

      // Log current status
      console.log(`   📊 [${attempts * 2}s] Status: ${scan.status} | Step: ${scan.currentStep || 'N/A'} | Progress: ${scan.progressCurrent || 0}%`);

      // Check for GPT-5 discovery log
      if (scan.logs && !foundGPT5Log) {
        const gpt5Log = scan.logs.find(log =>
          log.message && (
            log.message.includes('Discovering') && log.message.includes('GPT-5')
          ) || (
            log.message.includes('GPT-5 discovered')
          )
        );

        if (gpt5Log) {
          foundGPT5Log = true;
          console.log('\n   ✅ GPT-5 DISCOVERY LOG FOUND!');
          console.log(`   📝 Message: ${gpt5Log.message}`);
          if (gpt5Log.metadata) {
            console.log(`   📊 Metadata:`, JSON.stringify(gpt5Log.metadata, null, 2));
          }
          console.log('');
        }
      }

      // Check if scan completed
      if (scan.status === 'completed' || scan.status === 'failed') {
        scanComplete = true;
        console.log(`\n   ✅ Scan ${scan.status.toUpperCase()}!`);
        console.log(`   📊 Results:`);
        console.log(`      Products scraped: ${scan.productsScraped || 0}`);
        console.log(`      Products matched: ${scan.productsMatched || 0}`);
        console.log(`      Products failed: ${scan.productsFailed || 0}`);

        // Show all GPT-5 related logs
        if (scan.logs) {
          const gpt5Logs = scan.logs.filter(log =>
            log.message && (
              log.message.includes('GPT-5') ||
              log.message.includes('Discovering') ||
              log.message.includes('URLs discovered')
            )
          );

          if (gpt5Logs.length > 0) {
            console.log(`\n   📝 GPT-5 Discovery Logs (${gpt5Logs.length}):`);
            gpt5Logs.forEach((log, i) => {
              console.log(`      ${i + 1}. [${log.type}] ${log.message}`);
              if (log.metadata) {
                console.log(`         Metadata:`, JSON.stringify(log.metadata));
              }
            });
          }
        }
      }

      attempts++;
    }

    if (!foundGPT5Log) {
      console.log('\n   ⚠️  No GPT-5 discovery logs found.');
      console.log('   This could mean:');
      console.log('   - All products already have cached URLs (100% cache hit)');
      console.log('   - GPT-5 Search step was skipped');
      console.log('   - Deployment is still using old code\n');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Test completed!');

    if (foundGPT5Log) {
      console.log('✅ GPT-5 Search integration is working correctly!\n');
    } else {
      console.log('⚠️  GPT-5 Search integration status unclear. Check logs above.\n');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testIntegration();
