import postgres from 'postgres';
import { parseDocument } from '../src/lib/rfp/parser/parser-service';
import { extractQuestionsInBatches, validateQuestions } from '../src/lib/rfp/parser/question-extractor';

async function testParsing() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  const rfpId = 'fefb1fb3-5057-4128-958f-c157c163d3e2';

  try {
    console.log('🔍 Fetching RFP from database...\n');

    const [rfp] = await sql`
      SELECT id, title, original_file_url, file_type, parsing_status
      FROM rfps
      WHERE id = ${rfpId};
    `;

    if (!rfp) {
      console.error('❌ RFP not found');
      process.exit(1);
    }

    console.log('✅ RFP found:');
    console.log(`   Title: ${rfp.title}`);
    console.log(`   Status: ${rfp.parsing_status}`);
    console.log(`   File: ${rfp.file_type}`);
    console.log(`   URL: ${rfp.original_file_url}\n`);

    // Update to processing
    console.log('🔄 Setting status to processing...');
    await sql`
      UPDATE rfps
      SET parsing_status = 'processing', updated_at = NOW()
      WHERE id = ${rfpId};
    `;

    // Parse document
    console.log('📄 Parsing PDF document...');
    const parsedDoc = await parseDocument(rfp.original_file_url, rfp.file_type);
    console.log(`✅ Document parsed: ${parsedDoc.text.length} characters extracted\n`);

    // Show first 500 chars
    console.log('📝 First 500 characters of extracted text:');
    console.log(parsedDoc.text.substring(0, 500));
    console.log('...\n');

    // Extract questions
    console.log('🤖 Extracting questions with GPT-5...');
    const extractedQuestions = await extractQuestionsInBatches(parsedDoc.text);
    console.log(`✅ Extracted ${extractedQuestions.length} raw questions\n`);

    // Validate
    const validQuestions = validateQuestions(extractedQuestions);
    console.log(`✅ Validated ${validQuestions.length} questions\n`);

    if (validQuestions.length > 0) {
      console.log('📋 Sample questions:');
      validQuestions.slice(0, 3).forEach((q, i) => {
        console.log(`\n${i + 1}. [${q.questionNumber || 'N/A'}] ${q.questionText.substring(0, 100)}...`);
        console.log(`   Section: ${q.sectionTitle || 'N/A'}`);
        if (q.wordLimit) console.log(`   Word limit: ${q.wordLimit}`);
        if (q.characterLimit) console.log(`   Char limit: ${q.characterLimit}`);
      });
    }

    // Update to completed
    console.log('\n✅ Updating RFP status to completed...');
    await sql`
      UPDATE rfps
      SET
        parsing_status = 'completed',
        parsed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${rfpId};
    `;

    console.log('\n🎉 Parsing completed successfully!');
    console.log(`   Total questions: ${validQuestions.length}`);

    await sql.end();
  } catch (error) {
    console.error('\n❌ Error during parsing:', error);

    // Update to failed
    await sql`
      UPDATE rfps
      SET
        parsing_status = 'failed',
        parsing_error = ${error instanceof Error ? error.message : 'Unknown error'},
        updated_at = NOW()
      WHERE id = ${rfpId};
    `;

    await sql.end();
    process.exit(1);
  }
}

console.log('🚀 Testing RFP Parsing Backend\n');
console.log('='.repeat(50));
console.log();

testParsing().catch(console.error);
