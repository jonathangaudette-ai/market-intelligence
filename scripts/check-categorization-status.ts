import postgres from 'postgres';

async function checkCategorizationStatus() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔍 Checking categorization status...\n');

    // Get the latest RFP
    const rfps = await sql`
      SELECT
        id,
        title,
        parsing_status,
        parsing_stage,
        questions_extracted,
        extracted_questions
      FROM rfps
      WHERE title LIKE '%Vercel%'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (rfps.length === 0) {
      console.log('❌ No RFP found');
      await sql.end();
      return;
    }

    const rfp = rfps[0];
    console.log('📄 RFP Information:');
    console.log(`   ID: ${rfp.id}`);
    console.log(`   Title: ${rfp.title}`);
    console.log(`   Status: ${rfp.parsing_status}`);
    console.log(`   Stage: ${rfp.parsing_stage}`);
    console.log(`   Questions Extracted: ${rfp.questions_extracted}`);
    console.log(`   Has Temp Questions: ${rfp.extracted_questions ? 'Yes' : 'No'}\n`);

    // Count saved questions
    const questionCounts = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE category IS NOT NULL) as with_category,
        COUNT(*) FILTER (WHERE tags IS NOT NULL) as with_tags,
        COUNT(*) FILTER (WHERE difficulty IS NOT NULL) as with_difficulty
      FROM rfp_questions
      WHERE rfp_id = ${rfp.id}
    `;

    const counts = questionCounts[0];
    console.log('💾 Questions Saved in Database:');
    console.log(`   Total: ${counts.total}`);
    console.log(`   With Category: ${counts.with_category}`);
    console.log(`   With Tags: ${counts.with_tags}`);
    console.log(`   With Difficulty: ${counts.with_difficulty}\n`);

    // Sample questions with categorization
    const sampleQuestions = await sql`
      SELECT
        question_number,
        LEFT(question_text, 80) as question_preview,
        category,
        difficulty,
        estimated_minutes,
        tags
      FROM rfp_questions
      WHERE rfp_id = ${rfp.id}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('📋 Sample Questions (last 5):');
    sampleQuestions.forEach((q, i) => {
      console.log(`\n${i + 1}. [${q.question_number || 'N/A'}] ${q.question_preview}...`);
      console.log(`   Category: ${q.category || 'NOT SET'}`);
      console.log(`   Difficulty: ${q.difficulty || 'NOT SET'} (${q.estimated_minutes || 0} min)`);
      console.log(`   Tags: ${q.tags ? JSON.stringify(q.tags) : 'NOT SET'}`);
    });

    // Check completion status
    if (counts.total === rfp.questions_extracted && counts.with_category === counts.total) {
      console.log('\n✅ CATEGORIZATION COMPLETE: All questions have been categorized!');
    } else if (counts.total === 0) {
      console.log('\n⚠️  WARNING: No questions saved yet. Categorization phase may not have started.');
    } else if (counts.with_category < counts.total) {
      console.log(`\n⚠️  WARNING: Only ${counts.with_category}/${counts.total} questions have been categorized.`);
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkCategorizationStatus();
