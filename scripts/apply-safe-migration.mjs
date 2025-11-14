import postgres from 'postgres';
import fs from 'fs';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('🚀 Applying safe migration for Support Docs RAG v4.0...\n');

  // Read the migration file
  const migrationSQL = fs.readFileSync(
    './drizzle/0009_add_missing_support_docs_columns.sql',
    'utf8'
  );

  console.log('📝 Migration content loaded');
  console.log('⏳ Executing migration...\n');

  // Execute the migration
  await sql.unsafe(migrationSQL);

  console.log('✅ Migration applied successfully!\n');

  // Verify the changes
  console.log('🔍 Verifying schema changes...\n');

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

  console.log('Support Docs columns status:');
  const targetColumns = [
    'document_purpose',
    'content_type',
    'content_type_tags',
    'is_historical_rfp',
    'processing_metadata',
    'processing_steps'
  ];

  targetColumns.forEach((colName) => {
    const col = columns.find((c) => c.column_name === colName);
    if (col) {
      console.log(`  ✅ ${col.column_name} (${col.data_type})`);
    } else {
      console.log(`  ❌ ${colName} - MISSING`);
    }
  });

  // Check indexes
  console.log('\n📊 Checking indexes...\n');

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'documents'
    AND indexname LIKE 'idx_documents_%'
    ORDER BY indexname
  `;

  console.log('Performance indexes:');
  indexes.forEach((idx) => {
    console.log(`  ✅ ${idx.indexname}`);
  });

  console.log('\n✨ Migration complete! Database is ready for Support Docs RAG v4.0\n');

  await sql.end();
} catch (error) {
  console.error('❌ Migration failed:', error);
  await sql.end();
  process.exit(1);
}
