import postgres from 'postgres';

async function checkDuplicates() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    const rfpId = 'a705f9ea-443a-439a-b924-09e3f908672d'; // Vercel Split

    console.log('🔍 Checking for duplicate questions\n');

    // Find duplicates by question text
    const duplicates = await sql`
      SELECT
        question_text,
        COUNT(*) as count
      FROM rfp_questions
      WHERE rfp_id = ${rfpId}
      GROUP BY question_text
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `;

    if (duplicates.length > 0) {
      console.log('❌ DUPLICATES FOUND!\n');
      duplicates.forEach((dup, i) => {
        console.log(`${i + 1}. "${dup.question_text.substring(0, 80)}..."`);
        console.log(`   Appears ${dup.count} times\n`);
      });

      // Count total duplicates
      const totalDuplicates = await sql`
        SELECT SUM(count - 1) as duplicate_count
        FROM (
          SELECT COUNT(*) as count
          FROM rfp_questions
          WHERE rfp_id = ${rfpId}
          GROUP BY question_text
          HAVING COUNT(*) > 1
        ) subquery
      `;

      console.log(`📊 Total duplicate entries: ${totalDuplicates[0].duplicate_count}`);
    } else {
      console.log('✅ No duplicates found - all questions are unique\n');
    }

    // Count unique questions
    const unique = await sql`
      SELECT COUNT(DISTINCT question_text) as unique_count
      FROM rfp_questions
      WHERE rfp_id = ${rfpId}
    `;

    const total = await sql`
      SELECT COUNT(*) as total_count
      FROM rfp_questions
      WHERE rfp_id = ${rfpId}
    `;

    console.log(`\n📈 Statistics:`);
    console.log(`   Total questions in DB: ${total[0].total_count}`);
    console.log(`   Unique questions: ${unique[0].unique_count}`);
    console.log(`   Expected (from extraction): 148`);

    if (parseInt(unique[0].unique_count) === 148) {
      console.log('\n✅ Unique question count matches expected!');
      console.log(`   But there are ${total[0].total_count} total entries`);
      console.log(`   → ${parseInt(total[0].total_count) - 148} duplicate entries need to be cleaned up`);
    }

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkDuplicates();
