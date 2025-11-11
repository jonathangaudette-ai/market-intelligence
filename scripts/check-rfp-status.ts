import { db } from '../src/db';
import { rfps } from '../src/db/schema';
import { desc } from 'drizzle-orm';

async function checkStatus() {
  const allRfps = await db
    .select({
      id: rfps.id,
      title: rfps.title,
      parsingStatus: rfps.parsingStatus,
      parsingStage: rfps.parsingStage,
      progressCurrent: rfps.parsingProgressCurrent,
      progressTotal: rfps.parsingProgressTotal,
      questionsExtracted: rfps.questionsExtracted,
      createdAt: rfps.createdAt,
      updatedAt: rfps.updatedAt,
    })
    .from(rfps)
    .orderBy(desc(rfps.updatedAt))
    .limit(3);

  console.log('\n📊 RFP Status:\n');

  allRfps.forEach((rfp, idx) => {
    console.log(`${idx + 1}. ${rfp.title}`);
    console.log(`   ID: ${rfp.id}`);
    console.log(`   Status: ${rfp.parsingStatus}`);
    console.log(`   Stage: ${rfp.parsingStage || 'N/A'}`);
    console.log(`   Progress: ${rfp.progressCurrent || 0}/${rfp.progressTotal || 0}`);
    console.log(`   Questions extracted: ${rfp.questionsExtracted || 0}`);
    console.log(`   Updated: ${rfp.updatedAt}`);
    console.log('');
  });
}

checkStatus();
