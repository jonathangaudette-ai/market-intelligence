import { db } from '@/db';
import { pricingCatalogImports } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function checkJob() {
  try {
    const jobId = 'mfs6freel1xut1k488zpbcoz';

    const [job] = await db
      .select()
      .from(pricingCatalogImports)
      .where(eq(pricingCatalogImports.id, jobId))
      .limit(1);

    if (!job) {
      console.error('❌ Job not found');
      process.exit(1);
    }

    console.log('\n📋 Job Details:');
    console.log(`   ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Error: ${job.errorMessage || 'None'}`);
    console.log(`   Products imported: ${job.productsImported}`);
    console.log(`   Products failed: ${job.productsFailed}`);
    console.log(`\n📝 Logs:${job.logs ? '' : ' None'}`);

    if (job.logs && Array.isArray(job.logs)) {
      job.logs.forEach((log: any, idx: number) => {
        console.log(`   ${idx + 1}. [${log.type}] ${log.message}`);
        if (log.metadata) {
          console.log(`      Metadata:`, JSON.stringify(log.metadata, null, 2));
        }
      });
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

checkJob();
