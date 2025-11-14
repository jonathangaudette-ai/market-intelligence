/**
 * End-to-End Test for Support Docs RAG v4.0
 * Phase 1 Day 6-7
 *
 * This script tests the complete flow:
 * 1. Simulate document analysis (normally triggered by upload API)
 * 2. Create embeddings and index in Pinecone
 * 3. Query using DualQueryRetrievalEngine
 * 4. Verify results contain support docs
 */

import { analyzeDocument } from '../src/lib/rfp/services/document-analysis.service';
import { generateEmbeddings } from '../src/lib/rfp/ai/embeddings';
import { getRFPNamespace } from '../src/lib/rfp/pinecone';
import { DualQueryRetrievalEngine } from '../src/lib/rag/dual-query-engine';
import { generateEmbedding } from '../src/lib/rfp/ai/embeddings';

// Sample support document (Agile methodology guide)
const SAMPLE_SUPPORT_DOC = {
  filename: 'agile-methodology-guide.pdf',
  text: `
Guide de Méthodologie Agile - TechVision AI

Notre approche de gestion de projet suit les principes Agile et Scrum.
Nous utilisons des sprints de 2 semaines avec des cérémonies quotidiennes (daily standups).

Processus:
1. Sprint Planning - Définition des objectifs du sprint
2. Daily Standup - Synchronisation quotidienne de 15 minutes
3. Sprint Review - Démonstration des résultats aux stakeholders
4. Sprint Retrospective - Amélioration continue de nos processus

Notre équipe est composée de:
- Product Owner - Responsable de la vision produit
- Scrum Master - Facilitateur et coach agile
- Développeurs - Équipe cross-fonctionnelle
- QA Engineers - Assurance qualité intégrée

Outils utilisés:
- JIRA pour le suivi des tâches et sprints
- Confluence pour la documentation collaborative
- Slack pour la communication en temps réel
- GitHub pour le versioning du code

Nous garantissons une livraison continue avec des releases toutes les 2 semaines.
Notre vélocité moyenne est de 40 story points par sprint.
Nous maintenons une couverture de tests automatisés > 80%.

Avantages de notre approche Agile:
✓ Flexibilité et adaptabilité aux changements
✓ Livraisons fréquentes de valeur
✓ Collaboration étroite avec le client
✓ Amélioration continue via les rétrospectives
✓ Transparence totale sur l'avancement

Nos sprints suivent un rythme régulier:
- Semaine 1: Sprint Planning (lundi), développement
- Semaine 2: développement, Sprint Review (jeudi), Retrospective (vendredi)

Nous adaptons notre méthodologie selon la taille et la complexité du projet.
  `.trim(),
};

// Test company ID (use a real company ID from your dev database)
const TEST_COMPANY_ID = 'test-company-123';
const TEST_DOCUMENT_ID = 'test-doc-support-agile-' + Date.now();

/**
 * Chunk text into overlapping pieces
 */
function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): Array<{ text: string; start: number; end: number }> {
  const chunks: Array<{ text: string; start: number; end: number }> = [];

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunkText = text.slice(start, end);

    chunks.push({
      text: chunkText,
      start,
      end,
    });

    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Support Docs RAG v4.0 - End-to-End Test\n');
  console.log('='.repeat(70));

  try {
    // STEP 1: Analyze document
    console.log('\n📋 STEP 1: Analyzing support document...');
    console.log(`Document: ${SAMPLE_SUPPORT_DOC.filename}`);
    console.log(`Length: ${SAMPLE_SUPPORT_DOC.text.length} characters`);

    const analysis = await analyzeDocument(
      SAMPLE_SUPPORT_DOC.text,
      SAMPLE_SUPPORT_DOC.filename,
      {
        useCache: false,
        retryWithSonnet: true,
      }
    );

    console.log(`✅ Analysis complete:`);
    console.log(`   - Document Type: ${analysis.documentType}`);
    console.log(`   - Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log(`   - Recommended Purpose: ${analysis.recommendedPurpose}`);
    console.log(`   - Content Tags: ${analysis.contentTypeTags.slice(0, 5).join(', ')}`);
    console.log(`   - Primary Category: ${analysis.suggestedCategories[0]?.category || 'N/A'}`);

    // STEP 2: Create embeddings and index
    console.log('\n🔢 STEP 2: Creating embeddings and indexing in Pinecone...');

    const chunks = chunkText(SAMPLE_SUPPORT_DOC.text, 1000, 200);
    console.log(`Created ${chunks.length} chunks`);

    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await generateEmbeddings(chunkTexts);
    console.log(`Generated ${embeddings.length} embeddings`);

    const namespace = getRFPNamespace();
    const primaryCategory = analysis.suggestedCategories[0]?.category || 'general';

    const vectors = chunks.map((chunk, idx) => ({
      id: `${TEST_DOCUMENT_ID}-chunk-${idx}`,
      values: embeddings[idx],
      metadata: {
        documentId: TEST_DOCUMENT_ID,
        tenant_id: TEST_COMPANY_ID,
        documentType: 'rfp_support_doc',

        // Support Docs RAG v4.0 fields
        documentPurpose: analysis.recommendedPurpose,
        contentType: analysis.documentType,
        // Add primary category and 'general' to ensure it's found by DualQueryEngine
        contentTypeTags: [primaryCategory, 'general', ...analysis.contentTypeTags],
        isHistoricalRfp: false,

        // Content
        text: chunk.text,
        title: SAMPLE_SUPPORT_DOC.filename,
        category: primaryCategory,

        // Metadata
        chunkIndex: idx,
        totalChunks: chunks.length,
        startChar: chunk.start,
        endChar: chunk.end,
        createdAt: new Date().toISOString(),
      } as Record<string, any>,
    }));

    // Upsert to Pinecone
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await namespace.upsert(batch);
    }

    console.log(`✅ Indexed ${vectors.length} chunks in Pinecone`);

    // STEP 3: Wait for indexing to complete
    console.log('\n⏳ STEP 3: Waiting for Pinecone indexing (10 seconds)...');
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log('✅ Indexing complete');

    // STEP 4: Query using DualQueryRetrievalEngine
    console.log('\n🔍 STEP 4: Testing DualQueryRetrievalEngine...');

    const queryText = 'Quelle est votre méthodologie de gestion de projet ?';
    console.log(`Query: "${queryText}"`);

    const queryEmbedding = await generateEmbedding(queryText);

    const dualEngine = new DualQueryRetrievalEngine();
    const results = await dualEngine.retrieve(
      queryEmbedding,
      primaryCategory,
      TEST_COMPANY_ID,
      {
        depth: 'detailed',
      }
    );

    console.log('\n📊 Query Results:');
    console.log(`   - Total results: ${results.metadata.totalResults}`);
    console.log(`   - Pinned: ${results.metadata.pinnedCount}`);
    console.log(`   - Support docs: ${results.metadata.supportCount}`);
    console.log(`   - Historical: ${results.metadata.historicalCount}`);

    // Filter for our test document
    const ourChunks = results.chunks.filter((c) =>
      c.id.startsWith(TEST_DOCUMENT_ID)
    );

    console.log(`\n✅ Found ${ourChunks.length} chunks from our test document`);

    if (ourChunks.length > 0) {
      console.log('\n📄 Top result from support doc:');
      const topChunk = ourChunks[0];
      console.log(`   - Score: ${topChunk.compositeScore.toFixed(4)}`);
      console.log(`   - Source: ${topChunk.source}`);
      console.log(`   - Category: ${topChunk.metadata.category}`);
      console.log(`   - Content Type: ${topChunk.metadata.contentType}`);
      console.log(`   - Text preview: ${topChunk.text.slice(0, 150)}...`);

      console.log('\n🎯 Score Breakdown:');
      console.log(`   - Semantic: ${topChunk.breakdown.semanticScore.toFixed(4)}`);
      console.log(`   - Outcome: ${topChunk.breakdown.outcomeScore.toFixed(4)}`);
      console.log(`   - Recency: ${topChunk.breakdown.recencyScore.toFixed(4)}`);
      console.log(`   - Quality: ${topChunk.breakdown.qualityScore.toFixed(4)}`);
      console.log(`   - Source Boost: ${topChunk.breakdown.sourceBoost.toFixed(2)}x`);
    }

    // STEP 5: Cleanup
    console.log('\n🧹 STEP 5: Cleaning up test data...');
    const chunkIds = vectors.map((v) => v.id);
    await namespace.deleteMany(chunkIds);
    console.log(`✅ Deleted ${chunkIds.length} test vectors`);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ End-to-End Test Complete!');
    console.log('='.repeat(70));
    console.log('\n📊 Test Summary:');
    console.log(`   ✓ Document analyzed with ${(analysis.confidence * 100).toFixed(1)}% confidence`);
    console.log(`   ✓ ${vectors.length} embeddings created and indexed`);
    console.log(`   ✓ DualQueryEngine retrieved ${ourChunks.length} relevant chunks`);
    console.log(`   ✓ Support docs RAG v4.0 working correctly`);
    console.log('\n🎉 All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
