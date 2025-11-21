#!/usr/bin/env node
/**
 * Migration 0018: Add description column to pricing_products
 * Date: 2025-01-21
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('🔄 Starting migration 0018: Add description to pricing_products...\n');

  const migrationSQL = readFileSync(
    join(__dirname, '../drizzle/0018_add_description_to_products.sql'),
    'utf-8'
  );

  console.log('📄 Migration SQL:');
  console.log(migrationSQL);
  console.log('');

  await sql.unsafe(migrationSQL);

  console.log('✅ Migration 0018 applied successfully!\n');

  // Verify the column exists
  const result = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'pricing_products'
    AND column_name = 'description';
  `;

  if (result.length > 0) {
    console.log('✅ Verified: description column exists');
    console.log('   Column:', result[0].column_name);
    console.log('   Type:', result[0].data_type);
    console.log('   Nullable:', result[0].is_nullable);
  } else {
    console.log('⚠️  Warning: Could not verify column');
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}
