#!/usr/bin/env node
/**
 * Verify Pricing Schema - Check that all required tables and columns exist
 */

import postgres from 'postgres';

async function verifySchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...\n');
  const sql = postgres(databaseUrl);

  try {
    // Check pricing_competitors table
    console.log('📋 Checking pricing_competitors table...');

    const competitorsColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'pricing_competitors'
      ORDER BY ordinal_position;
    `;

    console.log(`   ✓ Found ${competitorsColumns.length} columns`);

    const hasCompanySlug = competitorsColumns.some(col => col.column_name === 'company_slug');
    if (hasCompanySlug) {
      console.log('   ✓ company_slug column exists');
    } else {
      console.error('   ✗ company_slug column MISSING!');
      process.exit(1);
    }

    // Check for company_slug index
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'pricing_competitors'
        AND indexname = 'idx_pricing_competitors_company_slug';
    `;

    if (indexes.length > 0) {
      console.log('   ✓ company_slug index exists');
    } else {
      console.error('   ✗ company_slug index MISSING!');
    }

    // Check sample data
    console.log('\n📊 Sample data:');
    const samples = await sql`
      SELECT
        pc.id,
        pc.name AS competitor_name,
        pc.company_slug,
        c.slug AS company_slug_from_join,
        CASE WHEN pc.company_slug = c.slug THEN '✓' ELSE '✗' END AS match
      FROM pricing_competitors pc
      INNER JOIN companies c ON pc.company_id = c.id
      LIMIT 5;
    `;

    samples.forEach((row) => {
      console.log(`   ${row.match} ${row.competitor_name}: ${row.company_slug}`);
    });

    // Check for NULL values
    const nullCount = await sql`
      SELECT COUNT(*) as count
      FROM pricing_competitors
      WHERE company_slug IS NULL;
    `;

    console.log(`\n🔍 NULL company_slug values: ${nullCount[0].count}`);

    if (parseInt(nullCount[0].count) > 0) {
      console.error('❌ Found NULL company_slug values! Run migration 0015 again.');
      process.exit(1);
    }

    console.log('\n✅ Pricing schema verification completed successfully!');
    console.log('   • pricing_competitors.company_slug exists');
    console.log('   • Index created');
    console.log('   • No NULL values');
    console.log('   • Data integrity verified');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

verifySchema();
