#!/usr/bin/env node
/**
 * Apply Migration 0015: Add company_slug to pricing_competitors
 * Purpose: Enable Railway worker to select appropriate scraper via ScraperFactory
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  const sql = postgres(databaseUrl);

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../drizzle/0015_add_company_slug_to_competitors.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📋 Applying Migration 0015: Add company_slug to pricing_competitors...\n');

    // Execute migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration 0015 applied successfully!');

    // Verify company_slug populated
    console.log('\n🔍 Verifying company_slug column...');

    // Check for NULL values
    const nullCount = await sql`
      SELECT COUNT(*) as count
      FROM pricing_competitors
      WHERE company_slug IS NULL;
    `;

    console.log(`   NULL values: ${nullCount[0].count}`);

    if (parseInt(nullCount[0].count) > 0) {
      console.error(`\n❌ Found ${nullCount[0].count} rows with NULL company_slug`);
      console.error('   This indicates some competitors are not linked to valid companies.');
      process.exit(1);
    }

    // Show sample data
    console.log('\n📊 Sample data with company_slug:');
    const samples = await sql`
      SELECT
        pc.id,
        pc.name AS competitor_name,
        pc.company_slug,
        c.slug AS company_slug_from_join
      FROM pricing_competitors pc
      INNER JOIN companies c ON pc.company_id = c.id
      LIMIT 5;
    `;

    samples.forEach((row) => {
      const match = row.company_slug === row.company_slug_from_join ? '✓' : '✗';
      console.log(`   ${match} ${row.competitor_name}: ${row.company_slug}`);
    });

    // Verify index created
    console.log('\n🔍 Verifying index created...');
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'pricing_competitors'
        AND indexname = 'idx_pricing_competitors_company_slug';
    `;

    if (indexes.length > 0) {
      console.log('   ✓ Index idx_pricing_competitors_company_slug created');
    } else {
      console.error('   ✗ Index not found!');
      process.exit(1);
    }

    console.log('\n✅ Migration 0015 completed successfully!');
    console.log('   • company_slug column added');
    console.log('   • Data populated from companies table');
    console.log('   • NOT NULL constraint applied');
    console.log('   • Performance index created');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
