import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  console.log('\n🔧 Applying prompt_templates migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'drizzle', '0008_add_prompt_templates.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration SQL...');
    
    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration executed successfully!\n');

    // Mark migration as applied
    console.log('Marking migration as applied in __drizzle_migrations...');
    await db.execute(sql`
      INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
      VALUES (8, '0008_add_prompt_templates', 1763088500000)
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✅ Migration marked as applied!\n');

    // Verify table exists
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'prompt_templates'
    `);

    if (result.length > 0) {
      console.log('✅ Table prompt_templates created successfully!\n');
    } else {
      console.log('❌ Table prompt_templates was not created\n');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }

  process.exit(0);
}

applyMigration();
