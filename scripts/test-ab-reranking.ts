/**
 * A/B Test: Compare Semantic Search vs Reranked Results
 *
 * This script tests the same queries with and without reranking
 * to measure the quality improvement.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

// Import RAG engine
import { MultiTenantRAGEngine } from '../src/lib/rag/engine';

// Test queries about SANIDÉPÔT (adjust to your actual company)
const TEST_QUERIES = [
  'Qui est le fondateur de SANIDÉPÔT ?',
  'Quels sont les services offerts par l\'entreprise ?',
  'Quelle est l\'histoire de l\'entreprise ?',
  'Quelles sont les valeurs de l\'entreprise ?',
  'Où se trouve SANIDÉPÔT ?',
];

const COMPANY_ID = 'company_1762968795076'; // Your test company ID

async function runABTest() {
  console.log('🧪 A/B Test: Semantic Search vs Reranked Results\n');
  console.log('='.repeat(80));

  const engine = new MultiTenantRAGEngine(
    process.env.PINECONE_INDEX || 'market-intelligence-prod',
    'rfp-library'
  );

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const query = TEST_QUERIES[i];

    console.log(`\n📊 Query ${i + 1}/${TEST_QUERIES.length}: "${query}"\n`);
    console.log('-'.repeat(80));

    // Test WITHOUT reranking (pure semantic search)
    console.log('\n🔵 SANS Reranking (Semantic Search):');
    process.env.NEXT_PUBLIC_ENABLE_RERANKING = 'false';

    const semanticStart = Date.now();
    const semanticResults = await engine.query({
      companyId: COMPANY_ID,
      queryText: query,
      topK: 5,
    });
    const semanticLatency = Date.now() - semanticStart;

    semanticResults.slice(0, 3).forEach((result, idx) => {
      console.log(`  ${idx + 1}. [Score: ${result.relevance.toFixed(4)}] ${result.source}`);
      console.log(`     "${result.text.slice(0, 100)}..."`);
    });
    console.log(`  ⏱️  Latency: ${semanticLatency}ms`);

    // Test WITH reranking
    console.log('\n🟢 AVEC Reranking (2-Stage Retrieval):');
    process.env.NEXT_PUBLIC_ENABLE_RERANKING = 'true';

    const rerankStart = Date.now();
    const rerankedResults = await engine.query({
      companyId: COMPANY_ID,
      queryText: query,
      topK: 5,
    });
    const rerankLatency = Date.now() - rerankStart;

    rerankedResults.slice(0, 3).forEach((result, idx) => {
      console.log(`  ${idx + 1}. [Score: ${result.relevance.toFixed(4)}] ${result.source}`);
      console.log(`     "${result.text.slice(0, 100)}..."`);
    });
    console.log(`  ⏱️  Latency: ${rerankLatency}ms (+${rerankLatency - semanticLatency}ms)`);

    // Compare results
    console.log('\n📈 Analyse:');

    // Check if top result is the same
    const sameTopResult = semanticResults[0]?.documentId === rerankedResults[0]?.documentId;
    console.log(`  - Top result identique: ${sameTopResult ? '✅ Oui' : '❌ Non (reranking a changé l\'ordre)'}`);

    // Check score improvement
    const semanticTopScore = semanticResults[0]?.relevance || 0;
    const rerankTopScore = rerankedResults[0]?.relevance || 0;
    const scoreImprovement = ((rerankTopScore - semanticTopScore) / semanticTopScore * 100).toFixed(1);
    console.log(`  - Score top résultat: ${semanticTopScore.toFixed(4)} → ${rerankTopScore.toFixed(4)} (${scoreImprovement}% change)`);

    // Latency impact
    const latencyIncrease = ((rerankLatency - semanticLatency) / semanticLatency * 100).toFixed(1);
    console.log(`  - Impact latence: +${rerankLatency - semanticLatency}ms (+${latencyIncrease}%)`);

    console.log('\n' + '='.repeat(80));
  }

  // Summary
  console.log('\n\n📊 RÉSUMÉ DU TEST A/B');
  console.log('='.repeat(80));
  console.log('\n✅ Le reranking a été testé avec succès sur toutes les requêtes.');
  console.log('\n💡 Observations attendues:');
  console.log('  - Scores de reranking généralement plus élevés (0.8-1.0 vs 0.6-0.8)');
  console.log('  - Ordre des résultats peut changer (les plus pertinents remontent)');
  console.log('  - Latence augmente de ~50-150ms');
  console.log('  - Qualité perçue devrait être meilleure (documents plus pertinents en top 3)');
  console.log('\n🎯 Action recommandée:');
  console.log('  - Vérifiez manuellement si les résultats reranked sont plus pertinents');
  console.log('  - Si oui, gardez NEXT_PUBLIC_ENABLE_RERANKING=true');
  console.log('  - Si non, désactivez et signalez le problème');
}

// Run test
runABTest().catch((error) => {
  console.error('\n❌ Test échoué:', error);
  process.exit(1);
});
