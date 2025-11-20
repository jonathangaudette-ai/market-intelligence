#!/usr/bin/env node
/**
 * Check products deletion status
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

try {
  // Get company ID
  const [company] = await sql`
    SELECT id FROM companies WHERE slug = 'dissan'
  `;

  if (!company) {
    console.log('❌ Company "dissan" not found');
    process.exit(1);
  }

  console.log(`✅ Company ID: ${company.id}\n`);

  // Check products status
  const [stats] = await sql`
    SELECT
      COUNT(*)::int as total,
      COUNT(deleted_at)::int as deleted,
      (COUNT(*) - COUNT(deleted_at))::int as active
    FROM pricing_products
    WHERE company_id = ${company.id}
  `;

  console.log('📊 Products Status:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Active: ${stats.active}`);
  console.log(`   Deleted: ${stats.deleted}\n`);

  // Show sample of products
  const products = await sql`
    SELECT id, name, sku, deleted_at, created_at
    FROM pricing_products
    WHERE company_id = ${company.id}
    ORDER BY created_at DESC
    LIMIT 5
  `;

  if (products.length > 0) {
    console.log('📦 Sample Products:');
    products.forEach((p, i) => {
      const status = p.deleted_at ? '🗑️  DELETED' : '✅ ACTIVE';
      console.log(`   ${i + 1}. ${status} - ${p.name} (${p.sku})`);
      if (p.deleted_at) {
        console.log(`      Deleted at: ${p.deleted_at}`);
      }
    });
  }

  await sql.end();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
