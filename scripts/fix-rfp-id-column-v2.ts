import postgres from 'postgres';

async function fixRfpIdColumn() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔧 Fixing rfps table ID column type...\n');

    // 1. Drop the view
    console.log('1. Dropping v_rfp_completion view...');
    await sql`DROP VIEW IF EXISTS v_rfp_completion CASCADE;`;
    console.log('✅ Dropped view');

    // 2. Drop foreign key constraints
    console.log('2. Dropping foreign key constraints...');
    await sql`ALTER TABLE rfp_questions DROP CONSTRAINT IF EXISTS rfp_questions_rfp_id_fkey;`;
    await sql`ALTER TABLE rfp_sections DROP CONSTRAINT IF EXISTS rfp_sections_rfp_id_fkey;`;
    await sql`ALTER TABLE rfp_exports DROP CONSTRAINT IF EXISTS rfp_exports_rfp_id_fkey;`;
    await sql`ALTER TABLE rfp_analytics_events DROP CONSTRAINT IF EXISTS rfp_analytics_events_rfp_id_fkey;`;
    console.log('✅ Dropped foreign key constraints');

    // 3. Change rfps.id from uuid to varchar
    console.log('3. Changing rfps.id from uuid to varchar...');
    await sql`ALTER TABLE rfps ALTER COLUMN id TYPE VARCHAR(255);`;
    console.log('✅ Changed rfps.id');

    // 4. Change owner_id from uuid to varchar
    console.log('4. Changing rfps.owner_id from uuid to varchar...');
    await sql`ALTER TABLE rfps ALTER COLUMN owner_id TYPE VARCHAR(255);`;
    console.log('✅ Changed rfps.owner_id');

    // 5. Change rfp_questions.rfp_id from uuid to varchar
    console.log('5. Changing rfp_questions.rfp_id from uuid to varchar...');
    await sql`ALTER TABLE rfp_questions ALTER COLUMN rfp_id TYPE VARCHAR(255);`;
    console.log('✅ Changed rfp_questions.rfp_id');

    // 6. Recreate foreign key constraints
    console.log('6. Recreating foreign key constraints...');
    await sql`
      ALTER TABLE rfp_questions
      ADD CONSTRAINT rfp_questions_rfp_id_fkey
      FOREIGN KEY (rfp_id) REFERENCES rfps(id) ON DELETE CASCADE;
    `;
    console.log('✅ Recreated foreign key constraints');

    console.log('\n🎉 Migration completed successfully!');
    console.log('Note: The view v_rfp_completion has been dropped and needs to be recreated if needed.');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

fixRfpIdColumn();
