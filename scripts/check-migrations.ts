import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function checkMigrations() {
  console.log('\n📋 Checking applied migrations in database:\n');

  try {
    const result = await db.execute(sql`
      SELECT id, hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('Applied migrations:');
    console.log('==================');
    console.log(result);
    console.log('\n');
  } catch (error) {
    console.error('Error checking migrations:', error);
  }

  process.exit(0);
}

checkMigrations();
