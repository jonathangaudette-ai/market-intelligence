import postgres from 'postgres';

async function addProgressColumns() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('📊 Adding progress tracking columns to rfps table...\n');

    await sql`
      ALTER TABLE rfps
      ADD COLUMN IF NOT EXISTS parsing_stage VARCHAR(50),
      ADD COLUMN IF NOT EXISTS parsing_progress_current INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS parsing_progress_total INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS questions_extracted INTEGER DEFAULT 0;
    `;

    console.log('✅ Columns added successfully!');
    console.log('   - parsing_stage (VARCHAR 50)');
    console.log('   - parsing_progress_current (INTEGER, default 0)');
    console.log('   - parsing_progress_total (INTEGER, default 0)');
    console.log('   - questions_extracted (INTEGER, default 0)');

    await sql.end();
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    await sql.end();
    process.exit(1);
  }
}

addProgressColumns().catch(console.error);
