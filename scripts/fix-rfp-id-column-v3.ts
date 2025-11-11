import postgres from 'postgres';

async function fixRfpIdColumn() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔧 Fixing rfps table ID column type...\n');

    // 1. List all views that depend on rfps
    console.log('1. Listing views that depend on rfps...');
    const views = await sql`
      SELECT viewname
      FROM pg_views
      WHERE schemaname = 'public'
      AND viewname LIKE '%rfp%';
    `;

    console.log(`Found ${views.length} RFP-related views:`, views.map(v => v.viewname));

    // 2. Drop all RFP views
    console.log('\n2. Dropping all RFP views...');
    for (const view of views) {
      await sql`DROP VIEW IF EXISTS ${sql(view.viewname)} CASCADE;`;
      console.log(`  ✅ Dropped ${view.viewname}`);
    }

    // 3. Drop foreign key constraints
    console.log('\n3. Dropping foreign key constraints...');
    await sql`ALTER TABLE rfp_questions DROP CONSTRAINT IF EXISTS rfp_questions_rfp_id_fkey;`;
    await sql`ALTER TABLE rfp_sections DROP CONSTRAINT IF EXISTS rfp_sections_rfp_id_fkey;`;
    await sql`ALTER TABLE rfp_responses DROP CONSTRAINT IF EXISTS rfp_responses_question_id_fkey;`;
    await sql`ALTER TABLE rfp_exports DROP CONSTRAINT IF EXISTS rfp_exports_rfp_id_fkey;`;
    await sql`ALTER TABLE rfp_analytics_events DROP CONSTRAINT IF EXISTS rfp_analytics_events_rfp_id_fkey;`;
    console.log('✅ Dropped foreign key constraints');

    // 4. Change rfps.id from uuid to varchar
    console.log('\n4. Changing rfps.id from uuid to varchar...');
    await sql`ALTER TABLE rfps ALTER COLUMN id TYPE VARCHAR(255);`;
    console.log('✅ Changed rfps.id');

    // 5. Change owner_id from uuid to varchar
    console.log('\n5. Changing rfps.owner_id from uuid to varchar...');
    await sql`ALTER TABLE rfps ALTER COLUMN owner_id TYPE VARCHAR(255);`;
    console.log('✅ Changed rfps.owner_id');

    // 6. Change related tables' foreign key columns
    console.log('\n6. Changing foreign key columns in related tables...');
    await sql`ALTER TABLE rfp_questions ALTER COLUMN rfp_id TYPE VARCHAR(255);`;
    await sql`ALTER TABLE rfp_questions ALTER COLUMN id TYPE VARCHAR(255);`;
    console.log('✅ Changed rfp_questions columns');

    // 7. Recreate foreign key constraints
    console.log('\n7. Recreating foreign key constraints...');
    await sql`
      ALTER TABLE rfp_questions
      ADD CONSTRAINT rfp_questions_rfp_id_fkey
      FOREIGN KEY (rfp_id) REFERENCES rfps(id) ON DELETE CASCADE;
    `;
    console.log('✅ Recreated foreign key constraints');

    console.log('\n🎉 Migration completed successfully!');
    console.log('Note: All RFP views have been dropped and need to be recreated if needed.');

    await sql.end();
  } catch (error) {
    console.error('\n❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

fixRfpIdColumn();
