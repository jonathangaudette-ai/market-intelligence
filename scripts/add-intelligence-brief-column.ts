import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function addIntelligenceBriefColumn() {
  try {
    console.log('Adding intelligence_brief column to rfps table...');

    await db.execute(sql`
      ALTER TABLE rfps
      ADD COLUMN IF NOT EXISTS intelligence_brief jsonb;
    `);

    console.log('✅ Column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  }
}

addIntelligenceBriefColumn();
