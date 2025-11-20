#!/usr/bin/env node
/**
 * Check products for my-company
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

try {
  // Get company ID
  const [company] = await sql`
    SELECT id, name, slug FROM companies WHERE slug = 'my-company'
  `;

  if (!company) {
    console.log('❌ Company "my-company" not found');
    process.exit(1);
  }

  console.log(`✅ Company: ${company.name} (${company.slug})`);
  console.log(`   ID: ${company.id}\n`);

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
  console.log(`   Deleted (soft): ${stats.deleted}\n`);

  // Show ALL products (including deleted)
  const allProducts = await sql`
    SELECT id, name, sku, deleted_at, created_at, updated_at
    FROM pricing_products
    WHERE company_id = ${company.id}
    ORDER BY created_at DESC
    LIMIT 20
  `;

  if (allProducts.length > 0) {
    console.log('📦 All Products (including deleted):');
    allProducts.forEach((p, i) => {
      const status = p.deleted_at ? '🗑️  DELETED' : '✅ ACTIVE';
      console.log(`   ${i + 1}. ${status} - ${p.name} (SKU: ${p.sku})`);
      if (p.deleted_at) {
        console.log(`      ⏱️  Deleted: ${p.deleted_at.toISOString()}`);
      }
      console.log(`      📅 Created: ${p.created_at.toISOString()}`);
    });
  } else {
    console.log('❌ No products found');
  }

  await sql.end();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
