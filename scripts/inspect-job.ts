import { db } from '@/db';
import { pricingCatalogImports } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function inspectJob() {
  const jobId = process.argv[2];

  if (!jobId) {
    console.error('Usage: npx tsx scripts/inspect-job.ts <jobId>');
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Inspecting job ${jobId}...\n`);

    const [job] = await db
      .select()
      .from(pricingCatalogImports)
      .where(eq(pricingCatalogImports.id, jobId))
      .limit(1);

    if (!job) {
      console.error('❌ Job not found');
      process.exit(1);
    }

    console.log('Job Details:');
    console.log('============');
    console.log(`ID: ${job.id}`);
    console.log(`Company ID: ${job.companyId}`);
    console.log(`Status: ${job.status}`);
    console.log(`Current Step: ${job.currentStep}`);
    console.log(`Filename: ${job.filename || 'N/A'}`);
    console.log(`File Size: ${job.fileSize ? `${(job.fileSize / 1024).toFixed(2)} KB` : 'N/A'}`);
    console.log(`\nProgress:`);
    console.log(`  Current: ${job.progressCurrent || 0}`);
    console.log(`  Total: ${job.progressTotal || 0}`);
    console.log(`  Percentage: ${job.progressTotal ? Math.round((job.progressCurrent || 0) / job.progressTotal * 100) : 0}%`);
    console.log(`\nProducts:`);
    console.log(`  Imported: ${job.productsImported || 0}`);
    console.log(`  Failed: ${job.productsFailed || 0}`);
    console.log(`\nRaw Data:`);
    console.log(`  Has Data: ${job.rawData ? 'Yes' : 'No'}`);
    console.log(`  Rows: ${job.rawData ? job.rawData.length : 0}`);

    if (job.rawData && job.rawData.length > 0) {
      console.log(`\nFirst Row Sample:`);
      console.log(JSON.stringify(job.rawData[0], null, 2));
    }

    console.log(`\nTimestamps:`);
    console.log(`  Created: ${job.createdAt}`);
    console.log(`  Started: ${job.startedAt || 'N/A'}`);
    console.log(`  Completed: ${job.completedAt || 'N/A'}`);
    console.log(`  Updated: ${job.updatedAt}`);

    console.log(`\nError: ${job.errorMessage || 'None'}`);

    console.log(`\nLogs (${job.logs?.length || 0} entries):`);
    if (job.logs && job.logs.length > 0) {
      job.logs.forEach((log: any, idx: number) => {
        console.log(`  ${idx + 1}. [${log.type}] ${log.message}`);
        if (log.metadata) {
          console.log(`     Metadata: ${JSON.stringify(log.metadata)}`);
        }
      });
    }

    console.log('\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Inspection failed:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

inspectJob();
