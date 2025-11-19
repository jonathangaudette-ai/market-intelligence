import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function checkDuplicates() {
  try {
    const result: any = await db.execute(sql`
      SELECT
        company_id,
        sku,
        COUNT(*) as count
      FROM pricing_products
      GROUP BY company_id, sku
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    const duplicates = result.rows || result || [];

    console.log(`\nFound ${duplicates.length} SKUs with duplicates:\n`);

    if (duplicates.length > 0) {
      duplicates.forEach((row: any, idx: number) => {
        console.log(`  ${idx + 1}. SKU "${row.sku}" appears ${row.count} times (Company: ${row.company_id})`);
      });
    } else {
      console.log('✅ No duplicate SKUs found!\n');
    }

    // Total count
    const totalResult: any = await db.execute(sql`SELECT COUNT(*) as count FROM pricing_products`);
    const total = (totalResult.rows || totalResult)[0];
    console.log(`\nTotal products in database: ${total.count}\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
    console.error(error);
    process.exit(1);
  }
}

checkDuplicates();
