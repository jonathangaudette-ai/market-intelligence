import { db } from '@/db';
import { companies, pricingCatalogImports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

async function testJobCreation() {
  try {
    console.log('\n🧪 Testing Job Creation...\n');

    // 1. Get first company
    const [company] = await db.select().from(companies).limit(1);
    if (!company) {
      console.error('❌ No companies found in database');
      process.exit(1);
    }
    console.log(`✅ Found company: ${company.name} (${company.slug})`);

    // 2. Try to create a test job
    const jobId = createId();
    console.log(`\n📝 Creating test job with ID: ${jobId}`);

    try {
      await db.insert(pricingCatalogImports).values({
        id: jobId,
        companyId: company.id,
        status: 'pending',
        currentStep: 'test',
        progressCurrent: 0,
        progressTotal: 0,
        productsImported: 0,
        productsFailed: 0,
        logs: [{
          timestamp: new Date().toISOString(),
          type: 'info',
          message: 'Test job creation'
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Job created successfully');
    } catch (insertError: any) {
      console.error('❌ Job creation failed:', insertError.message);
      console.error('Full error:', insertError);
      process.exit(1);
    }

    // 3. Verify job was created
    const [job] = await db.select().from(pricingCatalogImports).where(eq(pricingCatalogImports.id, jobId)).limit(1);
    if (!job) {
      console.error('❌ Job not found after creation');
      process.exit(1);
    }
    console.log('✅ Job found in database');
    console.log(`   Status: ${job.status}`);
    console.log(`   Step: ${job.currentStep}`);
    console.log(`   Logs: ${JSON.stringify(job.logs)}`);

    // 4. Clean up test job
    await db.delete(pricingCatalogImports).where(eq(pricingCatalogImports.id, jobId));
    console.log('\n✅ Test job cleaned up');

    console.log('\n✨ All tests passed!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

testJobCreation();
