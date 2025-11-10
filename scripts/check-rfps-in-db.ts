import postgres from 'postgres';

async function checkRFPs() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔍 Checking RFPs in database...\n');

    const rfps = await sql`
      SELECT id, title, status, parsing_status, created_at
      FROM rfps
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    if (rfps.length === 0) {
      console.log('❌ No RFPs found in database');
    } else {
      console.log(`✅ Found ${rfps.length} RFP(s):\n`);
      rfps.forEach((rfp, i) => {
        console.log(`${i + 1}. ${rfp.title}`);
        console.log(`   ID: ${rfp.id}`);
        console.log(`   Status: ${rfp.status}`);
        console.log(`   Parsing: ${rfp.parsing_status}`);
        console.log(`   Created: ${rfp.created_at}`);
        console.log('');
      });
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkRFPs();
