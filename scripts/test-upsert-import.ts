import { db } from '@/db';
import { companies, pricingCatalogImports, pricingProducts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://market-intelligence-kappa.vercel.app';

async function testUpsertImport() {
  try {
    console.log('\n🧪 Testing UPSERT Import Flow...\n');
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

    // 2. Create test CSV with 3 products
    const testCsv1 = `SKU,Nom,Prix,Marque,Categorie
UPSERT-TEST-001,Produit UPSERT Test 1 Original,15.99,BrandA,CatA
UPSERT-TEST-002,Produit UPSERT Test 2 Original,25.50,BrandB,CatB
UPSERT-TEST-003,Produit UPSERT Test 3 Original,8.75,BrandC,CatC`;

    fs.writeFileSync('/tmp/test-upsert-1.csv', testCsv1);
    console.log('✅ Test CSV 1 created with 3 products\n');

    // 3. First Import - All new products
    console.log('=== FIRST IMPORT (All new products) ===\n');
    await runImport('/tmp/test-upsert-1.csv', 'test-upsert-1.csv');

    // 4. Verify products after first import
    console.log('\n📦 Checking products after first import...');
    let products = await db
      .select()
      .from(pricingProducts)
      .where(eq(pricingProducts.companyId, company.id));

    let upsertTestProducts = products.filter(p => p.sku?.startsWith('UPSERT-TEST-'));
    console.log(`Found ${upsertTestProducts.length} UPSERT-TEST products:\n`);
    upsertTestProducts.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.sku} - ${p.name} - ${p.currentPrice} ${p.currency} - Brand: ${p.brand}`);
    });

    if (upsertTestProducts.length !== 3) {
      console.error(`\n❌ Expected 3 products, found ${upsertTestProducts.length}`);
      process.exit(1);
    }

    // 5. Create second CSV with UPDATED data (same SKUs, different prices and names)
    const testCsv2 = `SKU,Nom,Prix,Marque,Categorie
UPSERT-TEST-001,Produit UPSERT Test 1 UPDATED,19.99,BrandA-Updated,CatA-Updated
UPSERT-TEST-002,Produit UPSERT Test 2 UPDATED,29.99,BrandB-Updated,CatB-Updated
UPSERT-TEST-003,Produit UPSERT Test 3 UPDATED,12.99,BrandC-Updated,CatC-Updated`;

    fs.writeFileSync('/tmp/test-upsert-2.csv', testCsv2);
    console.log('\n✅ Test CSV 2 created with UPDATED data for same 3 SKUs\n');

    // 6. Second Import - Should UPDATE existing products
    console.log('=== SECOND IMPORT (Should UPSERT existing products) ===\n');
    await runImport('/tmp/test-upsert-2.csv', 'test-upsert-2.csv');

    // 7. Verify NO duplicates created, and products were updated
    console.log('\n📦 Checking products after second import...');
    products = await db
      .select()
      .from(pricingProducts)
      .where(eq(pricingProducts.companyId, company.id));

    upsertTestProducts = products.filter(p => p.sku?.startsWith('UPSERT-TEST-'));
    console.log(`Found ${upsertTestProducts.length} UPSERT-TEST products:\n`);
    upsertTestProducts.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.sku} - ${p.name} - ${p.currentPrice} ${p.currency} - Brand: ${p.brand}`);
    });

    // Verify still only 3 products (no duplicates)
    if (upsertTestProducts.length !== 3) {
      console.error(`\n❌ UPSERT FAILED! Expected 3 products, found ${upsertTestProducts.length} (duplicates created!)`);
      process.exit(1);
    }

    // Verify products were updated (check prices and names)
    const product1 = upsertTestProducts.find(p => p.sku === 'UPSERT-TEST-001');
    const product2 = upsertTestProducts.find(p => p.sku === 'UPSERT-TEST-002');
    const product3 = upsertTestProducts.find(p => p.sku === 'UPSERT-TEST-003');

    let allUpdated = true;

    if (!product1 || !product1.name?.includes('UPDATED') || product1.currentPrice !== '19.99') {
      console.error(`\n❌ Product 1 NOT updated correctly`);
      allUpdated = false;
    }

    if (!product2 || !product2.name?.includes('UPDATED') || product2.currentPrice !== '29.99') {
      console.error(`\n❌ Product 2 NOT updated correctly`);
      allUpdated = false;
    }

    if (!product3 || !product3.name?.includes('UPDATED') || product3.currentPrice !== '12.99') {
      console.error(`\n❌ Product 3 NOT updated correctly`);
      allUpdated = false;
    }

    if (!allUpdated) {
      process.exit(1);
    }

    console.log('\n✅ UPSERT test passed!');
    console.log('   - No duplicates created');
    console.log('   - All 3 products updated successfully');
    console.log('   - Prices and names changed from original to updated values\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ UPSERT test failed:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

async function runImport(filePath: string, filename: string) {
  try {
    // Preview API
    console.log(`Step 1: Testing Preview API for ${filename}...`);
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: filename,
      contentType: 'text/csv',
    });

    const previewResponse = await fetch(`${PRODUCTION_URL}/api/companies/my-company/pricing/catalog/preview`, {
      method: 'POST',
      body: formData as any,
    });

    if (!previewResponse.ok) {
      const errorText = await previewResponse.text();
      console.error('❌ Preview API failed:', errorText);
      throw new Error('Preview failed');
    }

    const previewData: any = await previewResponse.json();
    console.log(`✅ Preview successful: ${previewData.rowCount} rows`);

    if (previewData.existingSkusCount > 0) {
      console.log(`   📌 Existing SKUs detected: ${previewData.existingSkusCount}`);
      console.log(`   📌 New SKUs: ${previewData.newSkusCount}`);
    }

    // Build column mapping
    const columnMapping: any = {};
    previewData.columns.forEach((col: any) => {
      if (col.mappedTo !== 'ignore') {
        columnMapping[col.detectedColumn] = col.mappedTo;
      }
    });

    // Import API
    console.log(`\nStep 2: Testing Import API for ${filename}...`);

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
      throw new Error('Import failed');
    }

    const importData: any = await importResponse.json();
    console.log(`✅ Import completed: jobId: ${importData.jobId}`);
    console.log(`   Products imported: ${importData.productsImported}`);
    console.log(`   Products failed: ${importData.productsFailed}\n`);

    if (importData.productsFailed > 0) {
      throw new Error(`Import had ${importData.productsFailed} failures`);
    }
  } catch (error: any) {
    console.error('Import error:', error.message);
    throw error;
  }
}

testUpsertImport();
