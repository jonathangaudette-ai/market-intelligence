import postgres from 'postgres';

async function addColumn() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔄 Adding extracted_questions column to rfps table...\n');

    await sql`
      ALTER TABLE rfps
      ADD COLUMN IF NOT EXISTS extracted_questions JSONB;
    `;

    console.log('✅ Column added successfully!');
    console.log('💡 Column: extracted_questions (JSONB)');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

addColumn();
