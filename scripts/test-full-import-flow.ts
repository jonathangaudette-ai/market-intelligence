import { db } from '@/db';
import { companies, pricingCatalogImports, pricingProducts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testFullFlow() {
  try {
    console.log('\n🧪 Testing Full Import Flow...\n');

    // 1. Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, 'my-company'))
      .limit(1);

    if (!company) {
      console.error('❌ Company not found');
      process.exit(1);
    }

    console.log(`✅ Company: ${company.name} (${company.id})\n`);

    // 2. Test Preview API
    console.log('Step 1: Testing Preview API...');
    const csvContent = fs.readFileSync('/tmp/test-catalog.csv');
    const formData = new FormData();
    formData.append('file', csvContent, {
      filename: 'test-catalog.csv',
      contentType: 'text/csv',
    });

    const previewResponse = await fetch('http://localhost:3010/api/companies/my-company/pricing/catalog/preview', {
      method: 'POST',
      body: formData as any,
    });

    if (!previewResponse.ok) {
      console.error('❌ Preview API failed:', await previewResponse.text());
      process.exit(1);
    }

    const previewData: any = await previewResponse.json();
    console.log(`✅ Preview successful: ${previewData.rowCount} rows, fileId: ${previewData.fileId}\n`);
    console.log(`   Columns detected:`);
    previewData.columns.forEach((col: any) => {
      console.log(`     - ${col.detectedColumn} → ${col.mappedTo} (confidence: ${col.confidence})`);
    });

    // 3. Verify draft job in DB
    console.log('\nStep 2: Verifying draft job in database...');
    const [draftJob] = await db
      .select()
      .from(pricingCatalogImports)
      .where(eq(pricingCatalogImports.id, previewData.fileId))
      .limit(1);

    if (!draftJob) {
      console.error('❌ Draft job not found in database');
      process.exit(1);
    }

    console.log(`✅ Draft job found:`);
    console.log(`   Status: ${draftJob.status}`);
    console.log(`   Has rawData: ${draftJob.rawData ? 'Yes (' + draftJob.rawData.length + ' rows)' : 'No'}`);

    if (!draftJob.rawData || draftJob.rawData.length === 0) {
      console.error('❌ Draft job has no rawData');
      process.exit(1);
    }

    // 4. Test Import API
    console.log('\nStep 3: Testing Import API...');
    const columnMapping: any = {};
    previewData.columns.forEach((col: any) => {
      if (col.mappedTo !== 'ignore') {
        columnMapping[col.detectedColumn] = col.mappedTo;
      }
    });

    console.log(`   Column mapping:`, columnMapping);

    const importResponse = await fetch('http://localhost:3010/api/companies/my-company/pricing/catalog/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: previewData.fileId,
        columnMapping,
      }),
    });

    if (!importResponse.ok) {
      console.error('❌ Import API failed:', await importResponse.text());
      process.exit(1);
    }

    const importData: any = await importResponse.json();
    console.log(`✅ Import started: jobId: ${importData.jobId}\n`);

    // 5. Poll for progress
    console.log('Step 4: Polling for progress...\n');
    let maxAttempts = 30;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const progressResponse = await fetch(`http://localhost:3010/api/companies/my-company/pricing/catalog/jobs/${importData.jobId}/progress`);

      if (!progressResponse.ok) {
        console.error(`❌ Progress check failed: ${await progressResponse.text()}`);
        break;
      }

      const progress: any = await progressResponse.json();
      console.log(`[${attempt}] Status: ${progress.status} | Step: ${progress.currentStep} | Progress: ${progress.progressCurrent}/${progress.progressTotal} | Imported: ${progress.productsImported} | Failed: ${progress.productsFailed}`);

      if (progress.logs && progress.logs.length > 0) {
        const lastLog = progress.logs[progress.logs.length - 1];
        console.log(`     Last log: [${lastLog.type}] ${lastLog.message}`);
      }

      if (progress.status === 'completed') {
        console.log(`\n✅ Import completed successfully!`);
        console.log(`   Products imported: ${progress.productsImported}`);
        console.log(`   Products failed: ${progress.productsFailed}`);
        break;
      }

      if (progress.status === 'failed') {
        console.error(`\n❌ Import failed: ${progress.error}`);
        break;
      }
    }

    if (attempt >= maxAttempts) {
      console.error(`\n❌ Timeout: Import did not complete in ${maxAttempts * 2} seconds`);
    }

    // 6. Check imported products
    console.log('\nStep 5: Checking imported products...');
    const products = await db
      .select()
      .from(pricingProducts)
      .where(eq(pricingProducts.companyId, company.id))
      .limit(10);

    console.log(`\n📦 Found ${products.length} products for this company:`);
    products.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.sku} - ${p.name} - ${p.currentPrice} ${p.currency}`);
    });

    console.log('\n✅ Full flow test complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

testFullFlow();
