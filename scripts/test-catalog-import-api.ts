import { db } from '@/db';
import { companies, pricingCatalogImports } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function testCatalogImport() {
  try {
    console.log('\n🔍 Testing Catalog Import API...\n');

    // 1. Check if pricing_catalog_imports table exists
    console.log('1. Checking table structure...');
    const tableCheck = await db.select().from(pricingCatalogImports).limit(1);
    console.log('✅ pricing_catalog_imports table exists');

    // 2. Count existing jobs
    const existingJobs = await db.select().from(pricingCatalogImports);
    console.log(`📊 Found ${existingJobs.length} existing jobs in database`);

    if (existingJobs.length > 0) {
      console.log('\n📝 Recent jobs:');
      existingJobs.slice(0, 5).forEach((job, idx) => {
        console.log(`  ${idx + 1}. Job ID: ${job.id}`);
        console.log(`     Status: ${job.status}`);
        console.log(`     Company ID: ${job.companyId}`);
        console.log(`     Created: ${job.createdAt}`);
        console.log(`     Products Imported: ${job.productsImported}`);
        console.log('');
      });
    }

    // 3. Check companies
    const allCompanies = await db.select().from(companies);
    console.log(`\n🏢 Found ${allCompanies.length} companies in database`);
    if (allCompanies.length > 0) {
      console.log('First company:');
      console.log(`  Slug: ${allCompanies[0].slug}`);
      console.log(`  ID: ${allCompanies[0].id}`);
      console.log(`  Name: ${allCompanies[0].name}`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

testCatalogImport();
