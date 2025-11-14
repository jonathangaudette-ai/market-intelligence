import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('📋 Checking applied migrations...\n');

  const migrations = await sql`
    SELECT * FROM drizzle.__drizzle_migrations
    ORDER BY created_at DESC
    LIMIT 10
  `;

  console.log('Applied migrations:');
  migrations.forEach((m) => {
    console.log(`- ${m.hash} (${new Date(m.created_at).toISOString()})`);
  });

  console.log('\n📊 Checking documents table schema...\n');

  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'documents'
    AND column_name IN (
      'processing_steps',
      'document_purpose',
      'content_type',
      'content_type_tags',
      'is_historical_rfp',
      'processing_metadata'
    )
    ORDER BY column_name
  `;

  console.log('Support Docs columns in documents table:');
  if (columns.length === 0) {
    console.log('  ❌ None found');
  } else {
    columns.forEach((col) => {
      console.log(`  ✅ ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
  }

  await sql.end();
} catch (error) {
  console.error('Error:', error);
  await sql.end();
  process.exit(1);
}
