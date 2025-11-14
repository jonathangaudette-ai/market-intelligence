import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('📄 Checking latest uploaded documents...\n');

  const docs = await sql`
    SELECT
      id,
      name,
      status,
      document_purpose,
      content_type,
      content_type_tags,
      analysis_confidence,
      total_chunks,
      metadata,
      created_at
    FROM documents
    WHERE document_purpose = 'rfp_support'
    ORDER BY created_at DESC
    LIMIT 5
  `;

  if (docs.length === 0) {
    console.log('❌ No support documents found');
  } else {
    console.log(`✅ Found ${docs.length} recent support document(s):\n`);

    docs.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Purpose: ${doc.document_purpose}`);
      console.log(`   Content Type: ${doc.content_type || 'N/A'}`);
      console.log(`   Tags: ${doc.content_type_tags?.join(', ') || 'N/A'}`);
      console.log(`   Confidence: ${doc.analysis_confidence || 0}%`);
      console.log(`   Chunks Created: ${doc.total_chunks || 0}`);
      console.log(`   Uploaded: ${new Date(doc.created_at).toLocaleString()}`);

      if (doc.metadata?.analysis) {
        console.log(`   Executive Summary: ${doc.metadata.analysis.executiveSummary || 'N/A'}`);
        if (doc.metadata.analysis.suggestedCategories) {
          console.log(`   Suggested Categories:`);
          doc.metadata.analysis.suggestedCategories.forEach(cat => {
            console.log(`     - ${cat.category} (${Math.round(cat.confidence * 100)}%)`);
          });
        }
      }
      console.log('');
    });
  }

  await sql.end();
} catch (error) {
  console.error('Error:', error);
  await sql.end();
  process.exit(1);
}
