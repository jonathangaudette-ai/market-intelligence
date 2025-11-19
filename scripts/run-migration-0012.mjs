import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  try {
    console.log('\nRunning migration 0012 (UNIQUE constraint on company_id, sku)...\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'drizzle', '0012_thankful_midnight.sql'),
      'utf-8'
    );

    await sql.unsafe(migrationSQL);

    console.log('✅ Migration 0012 applied successfully\n');
    console.log('   - Removed old index pricing_products_company_sku_idx');
    console.log('   - Added UNIQUE constraint on (company_id, sku)\n');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await sql.end();
    process.exit(1);
  }
}

runMigration();
