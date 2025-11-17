import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

async function syncMigrations() {
  console.log('\n🔄 Syncing migration history with database state...\n');

  try {
    // Read journal to get migration hashes
    const journalPath = join(process.cwd(), 'drizzle', 'meta', '_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));

    console.log(`Found ${journal.entries.length} migrations in journal\n`);

    // Mark migrations 0000-0007 as applied (they already exist in DB)
    for (const entry of journal.entries) {
      const hash = entry.tag;
      const when = entry.when;

      console.log(`Marking migration as applied: ${hash}`);

      await db.execute(sql`
        INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
        VALUES (${entry.idx}, ${hash}, ${when})
        ON CONFLICT (id) DO NOTHING
      `);
    }

    console.log('\n✅ Migration history synced!\n');

    // Verify
    const result = await db.execute(sql`
      SELECT id, hash 
      FROM drizzle.__drizzle_migrations 
      ORDER BY id
    `);

    console.log('Applied migrations in database:');
    console.log('================================');
    for (const row of result) {
      console.log(`  ${row.id}: ${row.hash}`);
    }
    console.log('\n');

  } catch (error) {
    console.error('Error syncing migrations:', error);
    process.exit(1);
  }

  process.exit(0);
}

syncMigrations();
