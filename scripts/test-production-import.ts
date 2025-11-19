import { db } from '@/db';
import { companies, pricingCatalogImports, pricingProducts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://market-intelligence-kappa.vercel.app';

async function testProductionImport() {
  try {
    console.log('\n🚀 Testing Production Import Flow...\n');
    console.log(`Production URL: ${PRODUCTION_URL}\n`);

    // 1. Get company from DB
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

    // 2. Create test CSV
    const testCsv = `SKU,Nom,Prix,Marque,Categorie
PROD-TEST-001,Produit Production Test 1,15.99,ProdBrand,ProdCat
PROD-TEST-002,Produit Production Test 2,25.50,ProdBrand,ProdCat
PROD-TEST-003,Produit Production Test 3,8.75,ProdBrand,ProdCat
PROD-TEST-004,Produit Production Test 4,12.00,ProdBrand,ProdCat`;

    fs.writeFileSync('/tmp/test-prod-catalog.csv', testCsv);
    console.log('✅ Test CSV created with 4 products\n');

    // 3. Test Preview API
    console.log('Step 1: Testing Preview API (production)...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('/tmp/test-prod-catalog.csv'), {
      filename: 'test-prod-catalog.csv',
      contentType: 'text/csv',
    });

    const previewResponse = await fetch(`${PRODUCTION_URL}/api/companies/my-company/pricing/catalog/preview`, {
      method: 'POST',
      body: formData as any,
    });

    if (!previewResponse.ok) {
      const errorText = await previewResponse.text();
      console.error('❌ Preview API failed:', errorText);
      process.exit(1);
    }

    const previewData: any = await previewResponse.json();
    console.log(`✅ Preview successful: ${previewData.rowCount} rows, fileId: ${previewData.fileId}\n`);
    console.log(`   Columns detected:`);
    previewData.columns.forEach((col: any) => {
      console.log(`     - ${col.detectedColumn} → ${col.mappedTo} (confidence: ${col.confidence})`);
    });

    // 4. Verify draft job in DB
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
    console.log(`   Filename: ${draftJob.filename}`);

    if (!draftJob.rawData || draftJob.rawData.length === 0) {
      console.error('❌ Draft job has no rawData');
      process.exit(1);
    }

    // 5. Build column mapping
    const columnMapping: any = {};
    previewData.columns.forEach((col: any) => {
      if (col.mappedTo !== 'ignore') {
        columnMapping[col.detectedColumn] = col.mappedTo;
      }
    });

    // 6. Test Import API
    console.log('\nStep 3: Testing Import API (production)...');
    console.log(`   Column mapping:`, columnMapping);

    const importResponse = await fetch(`${PRODUCTION_URL}/api/companies/my-company/pricing/catalog/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: previewData.fileId,
        columnMapping,
      }),
    });

    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      console.error('❌ Import API failed:', errorText);
      process.exit(1);
    }

    const importData: any = await importResponse.json();
    console.log(`✅ Import started: jobId: ${importData.jobId}\n`);

    // 7. Poll for progress
    console.log('Step 4: Polling for progress (production)...\n');
    let maxAttempts = 60; // 2 minutes max
    let attempt = 0;
    let lastStatus = '';
    let lastProgressCurrent = -1;

    while (attempt < maxAttempts) {
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const progressResponse = await fetch(`${PRODUCTION_URL}/api/companies/my-company/pricing/catalog/jobs/${importData.jobId}/progress`);

      if (!progressResponse.ok) {
        const errorText = await progressResponse.text();
        console.error(`❌ Progress check failed: ${errorText}`);
        break;
      }

      const progress: any = await progressResponse.json();

      // Only log if something changed
      if (progress.status !== lastStatus || progress.progressCurrent !== lastProgressCurrent) {
        console.log(`[${attempt}] Status: ${progress.status} | Step: ${progress.currentStep} | Progress: ${progress.progressCurrent}/${progress.progressTotal} | Imported: ${progress.productsImported} | Failed: ${progress.productsFailed}`);

        if (progress.logs && progress.logs.length > 0) {
          const lastLog = progress.logs[progress.logs.length - 1];
          console.log(`     Last log: [${lastLog.type}] ${lastLog.message}`);
        }

        lastStatus = progress.status;
        lastProgressCurrent = progress.progressCurrent;
      }

      if (progress.status === 'completed') {
        console.log(`\n✅ Import completed successfully!`);
        console.log(`   Products imported: ${progress.productsImported}`);
        console.log(`   Products failed: ${progress.productsFailed}`);
        console.log(`   Time taken: ~${attempt * 2} seconds`);
        break;
      }

      if (progress.status === 'failed') {
        console.error(`\n❌ Import failed: ${progress.error}`);
        if (progress.logs) {
          console.log('\nAll logs:');
          progress.logs.forEach((log: any, idx: number) => {
            console.log(`  ${idx + 1}. [${log.type}] ${log.message}`);
          });
        }
        process.exit(1);
      }
    }

    if (attempt >= maxAttempts) {
      console.error(`\n❌ Timeout: Import did not complete in ${maxAttempts * 2} seconds`);
      process.exit(1);
    }

    // 8. Verify products in DB
    console.log('\nStep 5: Verifying imported products in database...');
    const testProducts = await db
      .select()
      .from(pricingProducts)
      .where(eq(pricingProducts.companyId, company.id));

    const prodTestProducts = testProducts.filter(p => p.sku?.startsWith('PROD-TEST-'));

    console.log(`\n📦 Found ${prodTestProducts.length} test products for this company:`);
    prodTestProducts.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.sku} - ${p.name} - ${p.currentPrice} ${p.currency}`);
    });

    if (prodTestProducts.length === 4) {
      console.log('\n✅ All 4 test products imported successfully!\n');
    } else {
      console.log(`\n⚠️ Expected 4 products, found ${prodTestProducts.length}\n`);
    }

    console.log('✅ Production test complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Production test failed:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

testProductionImport();
