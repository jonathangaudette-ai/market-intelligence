import postgres from 'postgres';

async function resetParsing() {
  const rfpId = process.argv[2] || '24e6302c-bba9-4f65-95e6-0f18627a9da2';

  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log(`🔄 Resetting RFP parsing status for ${rfpId}...\n`);

    // Delete existing questions for this RFP
    const deletedQuestions = await sql`
      DELETE FROM rfp_questions
      WHERE rfp_id = ${rfpId}
      RETURNING id;
    `;

    console.log(`✅ Deleted ${deletedQuestions.length} existing questions`);

    // Reset RFP status to pending (including new progress fields)
    await sql`
      UPDATE rfps
      SET
        parsing_status = 'pending',
        parsing_stage = NULL,
        parsing_progress_current = 0,
        parsing_progress_total = 0,
        questions_extracted = 0,
        parsing_error = NULL,
        parsed_at = NULL,
        updated_at = NOW()
      WHERE id = ${rfpId};
    `;

    console.log('✅ Reset RFP status to pending');
    console.log('\n🎯 RFP is ready to be parsed again!');
    console.log('💡 Refresh your browser (Cmd+Shift+R to clear cache) and restart the analysis');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

resetParsing();
