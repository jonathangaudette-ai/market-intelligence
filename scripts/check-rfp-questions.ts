import postgres from 'postgres';

async function checkQuestions() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔍 Checking RFP questions...\n');

    const questions = await sql`
      SELECT id, rfp_id, section_title, question_number, question_text, status
      FROM rfp_questions
      WHERE rfp_id = 'fefb1fb3-5057-4128-958f-c157c163d3e2'
      ORDER BY question_number
      LIMIT 10;
    `;

    if (questions.length === 0) {
      console.log('❌ No questions found for this RFP');
    } else {
      console.log(`✅ Found ${questions.length} questions:\n`);
      questions.forEach((q, i) => {
        console.log(`${i + 1}. ${q.question_number || 'N/A'} - ${q.question_text?.substring(0, 80)}...`);
        console.log(`   Section: ${q.section_title || 'N/A'}`);
        console.log(`   Status: ${q.status}`);
        console.log('');
      });
    }

    // Count total questions
    const [count] = await sql`
      SELECT COUNT(*) as total
      FROM rfp_questions
      WHERE rfp_id = 'fefb1fb3-5057-4128-958f-c157c163d3e2';
    `;
    console.log(`\nTotal questions: ${count.total}`);

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkQuestions();
