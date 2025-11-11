import postgres from 'postgres';

async function fixRfpIdColumn() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔧 Fixing rfps table ID column type...\n');

    // Drop foreign key constraints that reference rfps.id
    console.log('1. Dropping foreign key constraints...');
    await sql`
      ALTER TABLE rfp_questions
      DROP CONSTRAINT IF EXISTS rfp_questions_rfp_id_fkey;
    `;

    await sql`
      ALTER TABLE rfp_sections
      DROP CONSTRAINT IF EXISTS rfp_sections_rfp_id_fkey;
    `;

    await sql`
      ALTER TABLE rfp_responses
      DROP CONSTRAINT IF EXISTS rfp_responses_rfp_id_fkey;
    `;

    await sql`
      ALTER TABLE rfp_comments
      DROP CONSTRAINT IF EXISTS rfp_comments_rfp_id_fkey;
    `;

    await sql`
      ALTER TABLE rfp_exports
      DROP CONSTRAINT IF EXISTS rfp_exports_rfp_id_fkey;
    `;

    await sql`
      ALTER TABLE rfp_analytics_events
      DROP CONSTRAINT IF EXISTS rfp_analytics_events_rfp_id_fkey;
    `;

    console.log('✅ Dropped foreign key constraints');

    // Change column type from uuid to varchar
    console.log('2. Changing id column type from uuid to varchar...');
    await sql`
      ALTER TABLE rfps
      ALTER COLUMN id TYPE VARCHAR(255);
    `;

    console.log('✅ Changed id column type');

    // Change owner_id column type from uuid to varchar
    console.log('3. Changing owner_id column type from uuid to varchar...');
    await sql`
      ALTER TABLE rfps
      ALTER COLUMN owner_id TYPE VARCHAR(255);
    `;

    console.log('✅ Changed owner_id column type');

    // Recreate foreign key constraints
    console.log('4. Recreating foreign key constraints...');
    await sql`
      ALTER TABLE rfp_questions
      ADD CONSTRAINT rfp_questions_rfp_id_fkey
      FOREIGN KEY (rfp_id) REFERENCES rfps(id) ON DELETE CASCADE;
    `;

    await sql`
      ALTER TABLE rfp_sections
      ADD CONSTRAINT rfp_sections_rfp_id_fkey
      FOREIGN KEY (rfp_id) REFERENCES rfps(id) ON DELETE CASCADE;
    `;

    console.log('✅ Recreated foreign key constraints');

    console.log('\n🎉 Migration completed successfully!');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

fixRfpIdColumn();
