#!/usr/bin/env node
/**
 * Apply pricing tables migration (Phase 1)
 * Applies only the 9 pricing tables, skipping prompt_templates that already exists
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read DATABASE_URL from env
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

// Connect to database
const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

try {
  console.log('🔗 Connecting to database...');

  // Read the clean migration SQL
  const migrationSQL = readFileSync('/tmp/pricing_clean.sql', 'utf-8');

  console.log('📄 Applying pricing tables migration...');
  console.log('   Creating 9 pricing tables:');
  console.log('   - pricing_ai_recommendations');
  console.log('   - pricing_alert_events');
  console.log('   - pricing_alert_rules');
  console.log('   - pricing_cache');
  console.log('   - pricing_competitors');
  console.log('   - pricing_history');
  console.log('   - pricing_matches');
  console.log('   - pricing_products');
  console.log('   - pricing_scans');
  console.log('');

  // Execute migration
  await sql.unsafe(migrationSQL);

  console.log('✅ Migration applied successfully!');
  console.log('');

  // Verify tables were created
  console.log('🔍 Verifying tables...');
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'pricing_%'
    ORDER BY table_name
  `;

  console.log(`✅ Found ${tables.length} pricing tables:`);
  tables.forEach(({ table_name }) => {
    console.log(`   ✓ ${table_name}`);
  });

  // Count indexes
  const indexes = await sql`
    SELECT COUNT(*) as count
    FROM pg_indexes
    WHERE tablename LIKE 'pricing_%'
  `;
  console.log(`✅ Created ${indexes[0].count} indexes for performance`);

  console.log('');
  console.log('🎉 Phase 1 migration complete!');

  await sql.end();
  process.exit(0);

} catch (error) {
  console.error('❌ Migration failed:');
  console.error(error);
  await sql.end();
  process.exit(1);
}
