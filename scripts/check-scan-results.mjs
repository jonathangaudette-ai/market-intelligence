#!/usr/bin/env node
/**
 * Check scan results and matches for my-company
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

  // Check products
  const [productStats] = await sql`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE deleted_at IS NULL)::int as active
    FROM pricing_products
    WHERE company_id = ${company.id}
  `;

  console.log('📦 Products:');
  console.log(`   Total: ${productStats.total}`);
  console.log(`   Active: ${productStats.active}\n`);

  // Check competitors
  const competitors = await sql`
    SELECT id, name, website_url, is_active
    FROM pricing_competitors
    WHERE company_id = ${company.id}
  `;

  console.log('🎯 Competitors:');
  if (competitors.length === 0) {
    console.log('   ❌ No competitors configured\n');
  } else {
    competitors.forEach((c, i) => {
      const status = c.is_active ? '✅ Active' : '⚠️  Inactive';
      console.log(`   ${i + 1}. ${status} - ${c.name} (${c.website_url})`);
    });
    console.log('');
  }

  // Check scans
  const scans = await sql`
    SELECT
      id,
      competitor_id,
      status,
      products_scraped,
      products_matched,
      products_failed,
      created_at
    FROM pricing_scans
    WHERE company_id = ${company.id}
    ORDER BY created_at DESC
    LIMIT 5
  `;

  console.log('🔍 Recent Scans (last 5):');
  if (scans.length === 0) {
    console.log('   ❌ No scans found\n');
  } else {
    for (const scan of scans) {
      const competitor = competitors.find(c => c.id === scan.competitor_id);
      const competitorName = competitor ? competitor.name : 'Unknown';

      console.log(`   📊 Scan ${scan.id.slice(0, 8)}... (${competitorName})`);
      console.log(`      Status: ${scan.status}`);
      console.log(`      Products scraped: ${scan.products_scraped}`);
      console.log(`      Products matched: ${scan.products_matched}`);
      console.log(`      Products failed: ${scan.products_failed}`);
      console.log(`      Date: ${scan.created_at.toISOString()}`);
    }
    console.log('');
  }

  // Check matches
  const [matchStats] = await sql`
    SELECT
      COUNT(*)::int as total_matches,
      COUNT(DISTINCT product_id)::int as unique_products,
      COUNT(DISTINCT competitor_id)::int as unique_competitors
    FROM pricing_matches pm
    INNER JOIN pricing_products pp ON pm.product_id = pp.id
    WHERE pp.company_id = ${company.id}
      AND pp.deleted_at IS NULL
  `;

  console.log('🔗 Matches:');
  console.log(`   Total matches: ${matchStats.total_matches}`);
  console.log(`   Unique products matched: ${matchStats.unique_products}`);
  console.log(`   Competitors with matches: ${matchStats.unique_competitors}\n`);

  // If no matches, show sample of products and scan logs
  if (matchStats.total_matches === 0) {
    console.log('❌ No matches found. Let\'s investigate...\n');

    // Show sample products
    const sampleProducts = await sql`
      SELECT id, name, sku
      FROM pricing_products
      WHERE company_id = ${company.id}
        AND deleted_at IS NULL
      LIMIT 5
    `;

    if (sampleProducts.length > 0) {
      console.log('📦 Sample products in catalog:');
      sampleProducts.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (SKU: ${p.sku})`);
      });
      console.log('');
    }

    // Show latest scan logs
    if (scans.length > 0) {
      const latestScan = scans[0];
      const logs = await sql`
        SELECT type, message, metadata, created_at
        FROM pricing_scan_logs
        WHERE scan_id = ${latestScan.id}
        ORDER BY created_at DESC
        LIMIT 10
      `;

      if (logs.length > 0) {
        console.log('📝 Latest scan logs:');
        logs.forEach((log) => {
          const icon = log.type === 'error' ? '❌' : log.type === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`   ${icon} [${log.type}] ${log.message}`);
          if (log.metadata && Object.keys(log.metadata).length > 0) {
            console.log(`      ${JSON.stringify(log.metadata)}`);
          }
        });
      }
    }
  }

  await sql.end();
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
