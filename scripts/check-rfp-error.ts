import postgres from 'postgres';

async function checkError() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔍 Checking RFP for errors...\n');

    const [rfp] = await sql`
      SELECT
        id,
        title,
        parsing_status,
        parsing_error,
        original_file_url,
        file_type,
        created_at
      FROM rfps
      WHERE id = 'fefb1fb3-5057-4128-958f-c157c163d3e2';
    `;

    if (!rfp) {
      console.log('❌ RFP not found');
    } else {
      console.log('✅ RFP found:');
      console.log(`   Title: ${rfp.title}`);
      console.log(`   Status: ${rfp.parsing_status}`);
      console.log(`   File Type: ${rfp.file_type}`);
      console.log(`   File URL: ${rfp.original_file_url}`);
      console.log(`   Created: ${rfp.created_at}`);

      if (rfp.parsing_error) {
        console.log(`\n❌ Parsing Error:`);
        console.log(rfp.parsing_error);
      } else {
        console.log(`\n✅ No parsing error recorded`);
      }
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkError();
