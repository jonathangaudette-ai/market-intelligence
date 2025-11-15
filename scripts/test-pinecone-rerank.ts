/**
 * Test Pinecone Inference API - Reranking
 * Validates that pinecone.inference.rerank() works with SDK v6+
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function testReranking() {
  console.log('🧪 Test Pinecone Inference API - Reranking\n');

  // Initialize Pinecone client
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  try {
    console.log('📡 Calling pinecone.inference.rerank()...');

    // Pinecone SDK v6 uses positional parameters: rerank(model, query, documents, options)
    const model = 'bge-reranker-v2-m3';
    const query = 'What is the capital of France?';
    const documents = [
      'Paris is the capital and most populous city of France.',
      'The Eiffel Tower is a famous landmark in Paris.',
      'Lyon is the third-largest city in France.',
      'Berlin is the capital of Germany.',
      'France is a country in Western Europe.',
    ];

    const result = await pinecone.inference.rerank(
      model,
      query,
      documents,
      {
        topN: 3,
        returnDocuments: true,
      }
    );

    console.log('\n✅ SUCCESS - API Inference works!\n');
    console.log('Model:', result.model);
    console.log('Rerank Units:', result.usage?.rerankUnits || 0);
    console.log('\nTop 3 Results:\n');

    result.data.forEach((item, idx) => {
      console.log(`${idx + 1}. [Score: ${item.score.toFixed(4)}]`);
      console.log(`   Index: ${item.index}`);
      if (item.document) {
        console.log(`   Text: "${item.document.text || item.document}"`);
      }
      console.log('');
    });

    console.log('✅ PHASE 1 VALIDATION COMPLETE');
    console.log('✅ pinecone.inference.rerank() is functional');
    console.log(`✅ Cost per request: ~$0.002 (${result.usage?.rerankUnits} units)`);

  } catch (error) {
    console.error('\n❌ FAILED - API Inference error:');
    console.error(error);
    console.error('\nPossible causes:');
    console.error('- PINECONE_API_KEY not set in .env.local');
    console.error('- SDK version incompatible (needs v4.0+)');
    console.error('- Inference API not enabled for your Pinecone account');
    process.exit(1);
  }
}

testReranking();
