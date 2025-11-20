#!/usr/bin/env node
/**
 * Manually apply migration 0017: Add match_source column
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('📊 Applying migration 0017: Add match_source column\n');

  // Check if column already exists
  const [columnExists] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'pricing_matches'
      AND column_name = 'match_source'
    ) as exists
  `;

  if (columnExists.exists) {
    console.log('✅ Column match_source already exists. Skipping migration.');
  } else {
    // Apply migration
    await sql`
      ALTER TABLE pricing_matches
      ADD COLUMN match_source varchar(50) DEFAULT 'manual'
    `;

    console.log('✅ Column match_source added successfully!');

    // Record migration in Drizzle migrations table
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
      VALUES (
        17,
        'add-match-source-column-' || floor(extract(epoch from now()))::text,
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `;

    console.log('✅ Migration recorded in __drizzle_migrations');
  }

  await sql.end();
  console.log('\n✅ Migration 0017 completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
}
