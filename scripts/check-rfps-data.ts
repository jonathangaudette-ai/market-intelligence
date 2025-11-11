import postgres from 'postgres';

async function checkRfpsData() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    const count = await sql`SELECT COUNT(*) as count FROM rfps;`;
    console.log(`📊 rfps table contains ${count[0].count} rows`);

    if (count[0].count > 0) {
      const rows = await sql`SELECT id, title, client_name, created_at FROM rfps LIMIT 5;`;
      console.log('\nSample data:');
      rows.forEach(row => {
        console.log(`  - ${row.id}: ${row.title} (${row.client_name})`);
      });
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkRfpsData();
