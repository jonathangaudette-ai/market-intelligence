import postgres from 'postgres';

async function checkSpecificRFP() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔍 Checking specific RFP...\n');

    // Get all RFPs with Vercel in title
    const rfps = await sql`
      SELECT
        id,
        title,
        parsing_status,
        parsing_stage,
        questions_extracted,
        created_at,
        (SELECT COUNT(*) FROM rfp_questions WHERE rfp_id = rfps.id) as saved_questions
      FROM rfps
      WHERE title LIKE '%Vercel%'
      ORDER BY created_at DESC
    `;

    console.log('📋 All Vercel RFPs:');
    rfps.forEach((rfp, i) => {
      console.log(`\n${i + 1}. ${rfp.title}`);
      console.log(`   ID: ${rfp.id}`);
      console.log(`   Created: ${rfp.created_at}`);
      console.log(`   Status: ${rfp.parsing_status} / Stage: ${rfp.parsing_stage}`);
      console.log(`   Questions: ${rfp.questions_extracted} extracted, ${rfp.saved_questions} saved in DB`);
    });

    // Focus on the latest one
    if (rfps.length > 0) {
      const latest = rfps[0];
      console.log(`\n\n🎯 Latest RFP Details: ${latest.title}`);
      console.log('━'.repeat(60));

      // Check if it's still in extracted state
      if (latest.parsing_status === 'extracted') {
        console.log('\n⚠️  RFP is in EXTRACTED state - categorization needs to be triggered!');
        console.log('   This means:');
        console.log('   ✅ Phase 1 (extraction) completed successfully');
        console.log('   ❌ Phase 2 (categorization) not started yet');
        console.log('\n   The frontend should auto-trigger /categorize when it detects "extracted" status');
      }

      // Check extracted_questions column
      const extracted = await sql`
        SELECT
          CASE
            WHEN extracted_questions IS NULL THEN 'NULL'
            WHEN jsonb_array_length(extracted_questions) = 0 THEN 'EMPTY'
            ELSE jsonb_array_length(extracted_questions)::text
          END as extracted_count
        FROM rfps
        WHERE id = ${latest.id}
      `;

      console.log(`\n📦 Temporary Storage (extracted_questions column):`);
      const count = extracted[0].extracted_count;
      if (count === 'NULL') {
        console.log('   ❌ NULL - no questions stored');
      } else if (count === 'EMPTY') {
        console.log('   ⚠️  EMPTY array - questions were cleared');
      } else {
        console.log(`   ✅ ${count} questions waiting to be categorized`);
      }

      // Check if questions were saved for THIS specific RFP
      console.log(`\n💾 Questions in rfp_questions table for this RFP:`);
      console.log(`   Total: ${latest.saved_questions}`);

      if (latest.saved_questions === 0) {
        console.log('\n❌ NO QUESTIONS SAVED YET');
        console.log('   → Categorization phase has not completed');
      } else if (latest.saved_questions < latest.questions_extracted) {
        console.log(`\n⚠️  INCOMPLETE: ${latest.saved_questions}/${latest.questions_extracted} saved`);
      } else if (latest.saved_questions === latest.questions_extracted) {
        console.log('\n✅ ALL QUESTIONS SAVED AND CATEGORIZED');
      }
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkSpecificRFP();
