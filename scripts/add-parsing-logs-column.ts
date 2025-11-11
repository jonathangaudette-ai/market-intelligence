import postgres from 'postgres';

async function addParsingLogsColumn() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔄 Adding parsing_logs column to rfps table...\n');

    // Add parsing_logs column as JSONB for storing event logs
    await sql`
      ALTER TABLE rfps
      ADD COLUMN IF NOT EXISTS parsing_logs JSONB DEFAULT '[]'::jsonb;
    `;

    console.log('✅ Column parsing_logs added successfully');
    console.log('   Type: JSONB (array of log events)');
    console.log('   Default: []');
    
    // Add index for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_rfps_parsing_logs 
      ON rfps USING GIN (parsing_logs);
    `;
    
    console.log('✅ Index created for better performance');
    console.log('\n🎉 Migration completed successfully!');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

addParsingLogsColumn().catch(console.error);
