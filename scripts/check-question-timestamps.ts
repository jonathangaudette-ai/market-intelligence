import postgres from 'postgres';

async function checkQuestionTimestamps() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    const rfpId = 'a705f9ea-443a-439a-b924-09e3f908672d'; // Vercel Split

    console.log('🔍 Checking question timestamps for Vercel Split RFP\n');

    // Check when questions were created
    const questions = await sql`
      SELECT
        COUNT(*) as total,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created,
        COUNT(*) FILTER (WHERE category IS NOT NULL) as with_category
      FROM rfp_questions
      WHERE rfp_id = ${rfpId}
    `;

    console.log('📋 Questions for this RFP:');
    console.log(`   Total: ${questions[0].total}`);
    console.log(`   First created: ${questions[0].first_created}`);
    console.log(`   Last created: ${questions[0].last_created}`);
    console.log(`   With category: ${questions[0].with_category}\n`);

    // Check the RFP creation time
    const rfp = await sql`
      SELECT created_at, parsing_status, parsing_stage, questions_extracted
      FROM rfps
      WHERE id = ${rfpId}
    `;

    console.log('📄 RFP Details:');
    console.log(`   Created: ${rfp[0].created_at}`);
    console.log(`   Status: ${rfp[0].parsing_status}`);
    console.log(`   Stage: ${rfp[0].parsing_stage}`);
    console.log(`   Questions Extracted: ${rfp[0].questions_extracted}\n`);

    // Check if questions were created BEFORE the RFP (data corruption indicator)
    const rfpCreated = new Date(rfp[0].created_at);
    const firstQuestionCreated = new Date(questions[0].first_created);

    if (firstQuestionCreated < rfpCreated) {
      console.log('⚠️  WARNING: Questions created BEFORE the RFP!');
      console.log('   This indicates data corruption or incorrect rfp_id assignment');
      console.log(`   RFP created: ${rfpCreated.toISOString()}`);
      console.log(`   First question: ${firstQuestionCreated.toISOString()}\n`);

      // Find questions created AFTER the RFP (legitimate ones)
      const legitimateQuestions = await sql`
        SELECT COUNT(*) as count
        FROM rfp_questions
        WHERE rfp_id = ${rfpId}
          AND created_at >= ${rfp[0].created_at}
      `;

      console.log(`✅ Legitimate questions (created after RFP): ${legitimateQuestions[0].count}`);
      console.log(`❌ Corrupted questions (created before RFP): ${questions[0].total - legitimateQuestions[0].count}\n`);
    } else {
      console.log('✅ All questions created after RFP - data looks good!\n');
    }

    // Check categorization status
    if (rfp[0].parsing_status === 'extracted') {
      console.log('🎯 Current Status: EXTRACTED');
      console.log('   → Phase 1 (extraction) completed');
      console.log('   → Phase 2 (categorization) needs to be triggered');
      console.log('   → Frontend should call POST /categorize automatically\n');
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkQuestionTimestamps();
