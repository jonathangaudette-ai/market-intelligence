import postgres from 'postgres';

async function checkRFPTables() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔍 Checking RFP tables...\n');

    // Check if tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'rfp%'
      ORDER BY table_name;
    `;

    if (tables.length === 0) {
      console.log('❌ No RFP tables found!');
      console.log('✨ Run: npm run migrate:rfp to create them\n');
    } else {
      console.log(`✅ Found ${tables.length} RFP tables:\n`);
      tables.forEach((t: any) => {
        console.log(`  - ${t.table_name}`);
      });
      console.log();

      // Check columns in rfps table
      const columns = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'rfps'
        ORDER BY ordinal_position;
      `;

      if (columns.length > 0) {
        console.log('📋 Columns in rfps table:');
        columns.forEach((c: any) => {
          console.log(`  - ${c.column_name}: ${c.data_type}`);
        });
      }
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkRFPTables();
