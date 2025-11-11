import postgres from 'postgres';

async function cleanupDuplicates() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    const rfpId = 'a705f9ea-443a-439a-b924-09e3f908672d'; // Vercel Split

    console.log('🧹 Starting cleanup of duplicate questions\n');

    // Count before
    const beforeCount = await sql`
      SELECT COUNT(*) as count
      FROM rfp_questions
      WHERE rfp_id = ${rfpId}
    `;

    console.log(`📊 Before cleanup: ${beforeCount[0].count} questions`);

    // Delete all questions for this RFP (we'll need to re-run categorization)
    const deleted = await sql`
      DELETE FROM rfp_questions
      WHERE rfp_id = ${rfpId}
      RETURNING id
    `;

    console.log(`\n🗑️  Deleted ${deleted.length} questions`);

    // Reset RFP status to 'extracted' so categorization can run again
    await sql`
      UPDATE rfps
      SET
        parsing_status = 'extracted',
        parsing_stage = 'extracted',
        parsing_progress_current = 0,
        parsing_progress_total = 0,
        updated_at = NOW()
      WHERE id = ${rfpId}
    `;

    console.log('✅ RFP status reset to "extracted"');
    console.log('   → Ready for fresh categorization run\n');

    // Verify
    const afterCount = await sql`
      SELECT COUNT(*) as count
      FROM rfp_questions
      WHERE rfp_id = ${rfpId}
    `;

    console.log(`📊 After cleanup: ${afterCount[0].count} questions`);

    const rfp = await sql`
      SELECT
        parsing_status,
        parsing_stage,
        questions_extracted,
        CASE
          WHEN extracted_questions IS NULL THEN 'NULL'
          ELSE jsonb_array_length(extracted_questions)::text
        END as temp_questions
      FROM rfps
      WHERE id = ${rfpId}
    `;

    console.log('\n📄 RFP Status:');
    console.log(`   Status: ${rfp[0].parsing_status}`);
    console.log(`   Stage: ${rfp[0].parsing_stage}`);
    console.log(`   Questions to categorize: ${rfp[0].temp_questions}`);
    console.log('\n✅ Ready to test categorization again!');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

cleanupDuplicates();
