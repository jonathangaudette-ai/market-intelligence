import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('🔍 Checking schema state...\n');

  // Check if drizzle migrations table exists
  const migrationTableExists = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'drizzle'
      AND table_name = '__drizzle_migrations'
    ) as exists
  `;

  console.log(`Migration table exists: ${migrationTableExists[0].exists ? '✅ Yes' : '❌ No'}`);

  if (migrationTableExists[0].exists) {
    const count = await sql`SELECT COUNT(*) FROM drizzle.__drizzle_migrations`;
    console.log(`Total migrations applied: ${count[0].count}\n`);
  } else {
    console.log('ℹ️  No migration tracking table found\n');
  }

  // Check all documents table columns
  console.log('📊 All documents table columns:\n');
  const allColumns = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'documents'
    ORDER BY ordinal_position
  `;

  allColumns.forEach((col) => {
    const nullable = col.is_nullable === 'YES' ? '?' : '';
    const defaultVal = col.column_default ? ` = ${col.column_default}` : '';
    console.log(`  ${col.column_name}: ${col.data_type}${nullable}${defaultVal}`);
  });

  // Check specifically for new Support Docs columns
  console.log('\n🆕 Support Docs RAG v4.0 columns status:\n');
  const targetColumns = [
    'document_purpose',
    'content_type',
    'content_type_tags',
    'is_historical_rfp',
    'processing_metadata',
    'processing_steps'
  ];

  for (const colName of targetColumns) {
    const exists = allColumns.some((c) => c.column_name === colName);
    console.log(`  ${exists ? '✅' : '❌'} ${colName}`);
  }

  await sql.end();
} catch (error) {
  console.error('Error:', error);
  await sql.end();
  process.exit(1);
}
