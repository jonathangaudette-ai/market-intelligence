import { db } from '@/db';
import { pricingCatalogImports } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function cleanupStuckJobs() {
  try {
    console.log('\n🧹 Cleaning up stuck jobs...\n');

    // Find all jobs with status 'running' and 0 products imported
    const stuckJobs = await db
      .select()
      .from(pricingCatalogImports)
      .where(eq(pricingCatalogImports.status, 'running'));

    console.log(`Found ${stuckJobs.length} jobs with status 'running'\n`);

    for (const job of stuckJobs) {
      console.log(`Job ${job.id}:`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Products Imported: ${job.productsImported || 0}`);
      console.log(`  Has rawData: ${job.rawData ? 'Yes (' + job.rawData.length + ' rows)' : 'No'}`);
      console.log(`  Created: ${job.createdAt}`);

      // Update stuck jobs to 'failed' status
      if ((job.productsImported || 0) === 0) {
        await db
          .update(pricingCatalogImports)
          .set({
            status: 'failed',
            errorMessage: 'Job stuck - cleaned up by script',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pricingCatalogImports.id, job.id));

        console.log(`  ✅ Marked as failed\n`);
      }
    }

    console.log('\n✅ Cleanup complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

cleanupStuckJobs();
