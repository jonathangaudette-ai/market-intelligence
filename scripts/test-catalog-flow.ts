import { db } from '@/db';
import { companies, pricingCatalogImports } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function testCatalogFlow() {
  try {
    console.log('\n🧪 Testing Catalog Import Flow...\n');

    // 1. Check company exists
    console.log('1. Checking for Dissan company...');
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, 'my-company'))
      .limit(1);

    if (!company) {
      console.error('❌ Company "my-company" (Dissan) not found');
      process.exit(1);
    }

    console.log(`✅ Company found: ${company.name} (ID: ${company.id})\n`);

    // 2. Check table schema (try to select rawData)
    console.log('2. Checking table schema...');
    const [testJob] = await db
      .select({
        id: pricingCatalogImports.id,
        status: pricingCatalogImports.status,
        rawData: pricingCatalogImports.rawData,
      })
      .from(pricingCatalogImports)
      .limit(1);

    console.log('✅ Table schema is correct (rawData field exists)\n');

    // 3. Check for recent draft or running jobs
    console.log('3. Checking for recent jobs...');
    const recentJobs = await db
      .select()
      .from(pricingCatalogImports)
      .where(eq(pricingCatalogImports.companyId, company.id))
      .limit(5);

    console.log(`📊 Found ${recentJobs.length} jobs for this company\n`);

    if (recentJobs.length > 0) {
      console.log('Recent jobs:');
      recentJobs.forEach((job, idx) => {
        console.log(`  ${idx + 1}. Job ID: ${job.id}`);
        console.log(`     Status: ${job.status}`);
        console.log(`     Filename: ${job.filename || 'N/A'}`);
        console.log(`     Has rawData: ${job.rawData ? 'Yes (' + job.rawData.length + ' rows)' : 'No'}`);
        console.log(`     Created: ${job.createdAt}`);
        console.log(`     Products Imported: ${job.productsImported || 0}`);
        console.log('');
      });
    }

    console.log('\n✅ All checks passed! Ready to test in browser.\n');
    console.log('Next steps:');
    console.log('  1. Go to http://localhost:3010/companies/my-company/pricing/catalog');
    console.log('  2. Upload a CSV/Excel file');
    console.log('  3. Map columns and start import');
    console.log('  4. Watch for progress updates\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

testCatalogFlow();
