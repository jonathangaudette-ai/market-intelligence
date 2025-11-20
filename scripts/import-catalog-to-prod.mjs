#!/usr/bin/env node
/**
 * Import catalog to production
 */
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || 'https://market-intelligence-kappa.vercel.app';
const COMPANY_SLUG = 'dissan';
const CATALOG_FILE = 'Dissan/products-catalog-import.xlsx';

async function importCatalog() {
  console.log('\n📦 Importing catalog to production...\n');

  try {
    // Check file exists
    if (!fs.existsSync(CATALOG_FILE)) {
      throw new Error(`File not found: ${CATALOG_FILE}`);
    }

    const stats = fs.statSync(CATALOG_FILE);
    console.log(`✅ File found: ${CATALOG_FILE} (${(stats.size / 1024).toFixed(1)} KB)\n`);

    // Upload file
    const form = new FormData();
    form.append('file', fs.createReadStream(CATALOG_FILE));

    console.log(`🔄 Uploading to ${DEPLOYMENT_URL}...`);

    const response = await fetch(
      `${DEPLOYMENT_URL}/api/companies/${COMPANY_SLUG}/pricing/catalog/import`,
      {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json();

    console.log('\n✅ Import started successfully!');
    console.log(`   Job ID: ${result.jobId}`);
    console.log(`   Status: ${result.status}\n`);

    // Poll for completion
    console.log('⏳ Waiting for import to complete...\n');

    let attempts = 0;
    const maxAttempts = 60; // 2 minutes

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusRes = await fetch(
        `${DEPLOYMENT_URL}/api/companies/${COMPANY_SLUG}/pricing/catalog/jobs/${result.jobId}/progress`
      );

      if (!statusRes.ok) {
        console.log('⚠️  Failed to fetch progress, retrying...');
        attempts++;
        continue;
      }

      const status = await statusRes.json();

      console.log(`   [${status.status}] ${status.currentStep || 'Processing...'} (${status.progressCurrent}/${status.progressTotal})`);

      if (status.status === 'completed') {
        console.log(`\n🎉 Import completed successfully!`);
        console.log(`   Products imported: ${status.productsImported}`);
        console.log(`   Products failed: ${status.productsFailed}\n`);
        return;
      }

      if (status.status === 'failed') {
        console.log(`\n❌ Import failed: ${status.errorMessage}\n`);
        process.exit(1);
      }

      attempts++;
    }

    console.log('\n⚠️  Import timed out after 2 minutes\n');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

importCatalog();
