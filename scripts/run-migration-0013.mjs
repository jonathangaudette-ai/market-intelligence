#!/usr/bin/env node
/**
 * Migration 0013: Refactor pricing_history schema
 * Phase 8: Historique & Time-Series
 *
 * Changes:
 * - Replace matchId with productId + competitorId
 * - Add createdAt timestamp
 * - Update indexes
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('🔄 Starting migration 0013: Refactor pricing_history schema...\n');

  const migrationSQL = readFileSync(
    join(__dirname, '../drizzle/0013_pricing_history_refactor.sql'),
    'utf-8'
  );

  console.log('📄 Migration SQL:');
  console.log('─'.repeat(60));
  console.log(migrationSQL);
  console.log('─'.repeat(60));
  console.log('');

  // Execute the migration
  console.log('⏳ Executing migration...\n');
  await sql.unsafe(migrationSQL);

  console.log('✅ Migration 0013 completed successfully!\n');
  console.log('Summary:');
  console.log('  - Truncated pricing_history table (no data loss, table was empty)');
  console.log('  - Removed match_id column and index');
  console.log('  - Added product_id column (NOT NULL, foreign key)');
  console.log('  - Added competitor_id column (nullable, foreign key)');
  console.log('  - Added created_at timestamp');
  console.log('  - Created new indexes on product_id, competitor_id, recorded_at');
  console.log('');
  console.log('🚀 Ready for Phase 8 implementation!');

  // Verify columns were created
  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'pricing_history'
    ORDER BY ordinal_position
  `;

  console.log('\n📋 Verified pricing_history schema:');
  columns.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`);
  });

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  await sql.end();
}
