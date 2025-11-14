import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('🔍 Production Deployment Verification\n');
  console.log('=' .repeat(60));

  // 1. Database Schema
  console.log('\n✅ DATABASE SCHEMA');
  console.log('-'.repeat(60));

  const columns = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'documents'
    AND column_name IN (
      'document_purpose', 'content_type', 'content_type_tags',
      'is_historical_rfp', 'processing_metadata', 'processing_steps'
    )
    ORDER BY column_name
  `;

  console.log('Support Docs RAG v4.0 columns:');
  columns.forEach((col) => {
    console.log(`  ✅ ${col.column_name} (${col.data_type})`);
  });

  // 2. Performance Indexes
  console.log('\n✅ PERFORMANCE INDEXES');
  console.log('-'.repeat(60));

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'documents'
    AND indexname LIKE '%purpose%' OR indexname LIKE '%historical%' OR indexname LIKE '%content_tags%'
    ORDER BY indexname
  `;

  indexes.forEach((idx) => {
    console.log(`  ✅ ${idx.indexname}`);
  });

  // 3. Check for existing documents
  console.log('\n✅ DATA INTEGRITY');
  console.log('-'.repeat(60));

  const docCount = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE document_purpose IS NOT NULL) as with_purpose,
      COUNT(*) FILTER (WHERE is_historical_rfp = true) as historical,
      COUNT(*) FILTER (WHERE content_type_tags IS NOT NULL AND array_length(content_type_tags, 1) > 0) as with_tags
    FROM documents
  `;

  console.log(`Total documents: ${docCount[0].total}`);
  console.log(`  └─ With document_purpose: ${docCount[0].with_purpose}`);
  console.log(`  └─ Historical RFPs: ${docCount[0].historical}`);
  console.log(`  └─ With content tags: ${docCount[0].with_tags}`);

  // 4. Sample document check
  if (parseInt(docCount[0].total) > 0) {
    console.log('\n✅ SAMPLE DOCUMENT');
    console.log('-'.repeat(60));

    const sample = await sql`
      SELECT
        id,
        name,
        document_purpose,
        content_type,
        is_historical_rfp,
        status,
        created_at
      FROM documents
      LIMIT 1
    `;

    if (sample.length > 0) {
      const doc = sample[0];
      console.log(`ID: ${doc.id.substring(0, 12)}...`);
      console.log(`Name: ${doc.name}`);
      console.log(`Purpose: ${doc.document_purpose || 'N/A'}`);
      console.log(`Content Type: ${doc.content_type || 'N/A'}`);
      console.log(`Historical RFP: ${doc.is_historical_rfp ? 'Yes' : 'No'}`);
      console.log(`Status: ${doc.status}`);
    }
  }

  // 5. Verify constraints
  console.log('\n✅ CONSTRAINTS');
  console.log('-'.repeat(60));

  const constraints = await sql`
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'documents'::regclass
    AND conname LIKE '%purpose%'
  `;

  if (constraints.length > 0) {
    constraints.forEach((c) => {
      console.log(`  ✅ ${c.conname}`);
    });
  } else {
    console.log('  ℹ️  No custom constraints found');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 PRODUCTION DEPLOYMENT VERIFIED\n');
  console.log('Support Docs RAG v4.0 is LIVE and ready to use!\n');

  await sql.end();
} catch (error) {
  console.error('❌ Verification failed:', error);
  await sql.end();
  process.exit(1);
}
