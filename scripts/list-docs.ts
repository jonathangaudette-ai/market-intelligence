import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { companies, documents } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const [company] = await db.select().from(companies).where(eq(companies.slug, 'my-company')).limit(1);
  console.log('Company:', company.name, 'ID:', company.id);

  const docs = await db.select().from(documents).where(eq(documents.companyId, company.id)).orderBy(desc(documents.createdAt)).limit(10);
  console.log('\n📄 Documents récents:\n');
  docs.forEach((doc, i) => {
    const meta = doc.metadata as any;
    console.log(`[${i+1}] ${doc.name}`);
    console.log(`    Status: ${doc.status}`);
    console.log(`    documentPurpose: ${doc.documentPurpose}`);
    console.log(`    documentType: ${doc.documentType || 'N/A'}`);
    console.log(`    isHistoricalRfp: ${doc.isHistoricalRfp}`);
    console.log(`    Chunks: ${doc.totalChunks || 0}`);
    console.log(`    Vectors: ${doc.vectorsCreated ? 'YES' : 'NO'}`);
    console.log(`    Created: ${doc.createdAt}`);
    console.log('');
  });
}

main();
