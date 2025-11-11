import postgres from 'postgres';

async function resetParsing() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔄 Resetting RFP parsing status...\n');

    // Delete existing questions for this RFP
    const deletedQuestions = await sql`
      DELETE FROM rfp_questions
      WHERE rfp_id = 'fefb1fb3-5057-4128-958f-c157c163d3e2'
      RETURNING id;
    `;

    console.log(`✅ Deleted ${deletedQuestions.length} existing questions`);

    // Reset RFP status to pending
    await sql`
      UPDATE rfps
      SET
        parsing_status = 'pending',
        parsing_error = NULL,
        parsed_at = NULL,
        updated_at = NOW()
      WHERE id = 'fefb1fb3-5057-4128-958f-c157c163d3e2';
    `;

    console.log('✅ Reset RFP status to pending');
    console.log('\n🎯 RFP is ready to be parsed again!');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

resetParsing();
