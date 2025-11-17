import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function checkTables() {
  console.log('\n📋 Checking existing tables in database:\n');

  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('Existing tables:');
    console.log('================');
    for (const row of result) {
      console.log(`- ${row.table_name}`);
    }
    console.log('\n');

    // Check documents table columns
    const docsColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'documents'
      ORDER BY ordinal_position
    `);

    console.log('Documents table columns:');
    console.log('========================');
    for (const col of docsColumns) {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    }
    console.log('\n');
  } catch (error) {
    console.error('Error checking tables:', error);
  }

  process.exit(0);
}

checkTables();
