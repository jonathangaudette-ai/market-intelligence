import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('Running migration 0010...');

  const migrationSQL = readFileSync(
    join(__dirname, '../drizzle/0010_simple_omega_red.sql'),
    'utf-8'
  );

  // Execute the migration
  await sql.unsafe(migrationSQL);

  console.log('✅ Migration completed successfully!');

  // Verify table was created
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'pricing_catalog_imports'
  `;

  if (tables.length > 0) {
    console.log('✅ Table pricing_catalog_imports verified');
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  await sql.end();
}
