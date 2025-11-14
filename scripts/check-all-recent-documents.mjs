import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('📄 Checking ALL recent documents...\n');

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
      vectors_created,
      metadata,
      created_at
    FROM documents
    ORDER BY created_at DESC
    LIMIT 10
  `;

  if (docs.length === 0) {
    console.log('❌ No documents found at all');
  } else {
    console.log(`✅ Found ${docs.length} recent document(s):\n`);

    docs.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name}`);
      console.log(`   ID: ${doc.id.substring(0, 20)}...`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Purpose: ${doc.document_purpose || 'NOT SET'}`);
      console.log(`   Content Type: ${doc.content_type || 'N/A'}`);
      console.log(`   Tags: ${doc.content_type_tags?.join(', ') || 'N/A'}`);
      console.log(`   Confidence: ${doc.analysis_confidence || 0}%`);
      console.log(`   Chunks: ${doc.total_chunks || 0}`);
      console.log(`   Vectors: ${doc.vectors_created ? 'YES' : 'NO'}`);
      console.log(`   Uploaded: ${new Date(doc.created_at).toLocaleString()}`);

      if (doc.metadata?.analysis) {
        console.log(`   📝 Analysis:`);
        console.log(`      Summary: ${doc.metadata.analysis.executiveSummary || 'N/A'}`);
        console.log(`      Doc Type: ${doc.metadata.analysis.documentType || 'N/A'}`);
        if (doc.metadata.analysis.suggestedCategories) {
          console.log(`      Categories:`);
          doc.metadata.analysis.suggestedCategories.forEach(cat => {
            console.log(`        - ${cat.category} (${Math.round(cat.confidence * 100)}%)`);
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
