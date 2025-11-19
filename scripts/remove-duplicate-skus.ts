import { db } from '@/db';
import { pricingProducts } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function removeDuplicates() {
  try {
    console.log('\n🔍 Looking for duplicate SKUs...\n');

    // Find duplicates: Keep oldest product per (company_id, sku)
    const result: any = await db.execute(sql`
      WITH duplicates AS (
        SELECT
          id,
          company_id,
          sku,
          created_at,
          ROW_NUMBER() OVER (PARTITION BY company_id, sku ORDER BY created_at ASC) as rn
        FROM pricing_products
      )
      SELECT id, company_id, sku, created_at
      FROM duplicates
      WHERE rn > 1
    `);

    const duplicates = result.rows || result || [];

    console.log(`Found ${duplicates.length} duplicate products to remove\n`);

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!\n');
      process.exit(0);
    }

    // Show duplicates
    console.log('Duplicates to remove:');
    duplicates.forEach((row: any, idx: number) => {
      console.log(`  ${idx + 1}. ${row.sku} (Company: ${row.company_id}) - ${row.created_at}`);
    });

    // Delete duplicates (keep oldest)
    console.log(`\n🗑️  Removing ${duplicates.length} duplicate products...`);

    const idsToDelete = duplicates.map((row: any) => row.id);

    await db.execute(sql`
      DELETE FROM pricing_products
      WHERE id = ANY(ARRAY[${sql.join(idsToDelete.map((id: string) => sql`${id}`), sql`, `)}])
    `);

    console.log(`✅ Removed ${duplicates.length} duplicate products\n`);
    console.log('Database is now ready for UNIQUE constraint!\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error removing duplicates:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

removeDuplicates();
