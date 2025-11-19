#!/usr/bin/env node
import postgres from 'postgres';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

try {
  console.log('🔄 Running migration 0016: add needs_revalidation to pricing_matches...');

  const migrationPath = join(__dirname, '../drizzle/0016_add_needs_revalidation_to_matches.sql');
  const migrationSQL = await readFile(migrationPath, 'utf-8');

  await sql.unsafe(migrationSQL);

  console.log('✅ Migration completed successfully!');

  // Verify the column was added
  const result = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'pricing_matches'
    AND column_name = 'needs_revalidation'
  `;

  if (result.length > 0) {
    console.log('\n✓ Column added:', result[0]);
  } else {
    console.log('\n⚠️  Warning: Could not verify column was added');
  }

  await sql.end();
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  await sql.end();
  process.exit(1);
}
