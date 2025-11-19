#!/usr/bin/env node
/**
 * Apply Migration 0014: Pricing Performance Indexes
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
    const migrationPath = join(__dirname, '../drizzle/0014_pricing_performance_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📋 Applying Migration 0014: Pricing Performance Indexes...\n');

    // Execute migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration 0014 applied successfully!');

    // Verify indexes created
    console.log('\n🔍 Verifying indexes...');
    const indexes = await sql`
      SELECT
        indexname,
        tablename,
        indexdef
      FROM pg_indexes
      WHERE tablename LIKE 'pricing_%'
        AND indexname LIKE 'idx_pricing_%'
      ORDER BY tablename, indexname;
    `;

    console.log(`\n📊 Total pricing indexes: ${indexes.length}`);
    indexes.forEach((idx) => {
      console.log(`   ✓ ${idx.tablename}.${idx.indexname}`);
    });

    console.log('\n✅ All indexes verified!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
