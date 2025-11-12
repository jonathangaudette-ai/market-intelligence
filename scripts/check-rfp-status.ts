import { db } from '../src/db';
import { rfps, rfpQuestions } from '../src/db/schema';
import { eq, like, desc, count } from 'drizzle-orm';

async function checkRFPStatus() {
  try {
    console.log('🔍 Checking RFP status...\n');

    // Find RFP by title
    const [rfp] = await db
      .select()
      .from(rfps)
      .where(like(rfps.title, '%testtttttt%'))
      .orderBy(desc(rfps.createdAt))
      .limit(1);

    if (!rfp) {
      console.log('❌ No RFP found with title containing "testtttttt"');
      return;
    }

    // Count questions
    const [questionCount] = await db
      .select({ count: count() })
      .from(rfpQuestions)
      .where(eq(rfpQuestions.rfpId, rfp.id));

    console.log('📄 RFP Details:');
    console.log('  ID:', rfp.id);
    console.log('  Title:', rfp.title);
    console.log('  Parsing Status:', rfp.parsingStatus);
    console.log('  Parsing Stage:', rfp.parsingStage);
    console.log('  Question Count:', questionCount?.count || 0);
    console.log('  Completion %:', rfp.completionPercentage);
    console.log('  Intelligence Brief:', rfp.intelligenceBrief ? '✅ Generated' : '❌ Not generated');
    console.log('\n');

    if (rfp.parsingStatus === 'completed') {
      console.log('✅ RFP parsing is COMPLETED');
      console.log('👉 The CTA section should be visible on the page');
    } else {
      console.log('⚠️  RFP parsing status is:', rfp.parsingStatus);
      console.log('   Expected: "completed"');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRFPStatus();
