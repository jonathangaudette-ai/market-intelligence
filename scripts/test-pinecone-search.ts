import { config } from 'dotenv';
import { resolve } from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

config({ path: resolve(process.cwd(), '.env.local') });

const companyId = 'company_1762968795076';
const searchTerm = 'sanidépôt';

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});
const index = pinecone.index(process.env.PINECONE_INDEX_NAME || 'market-intelligence-prod');
const namespace = index.namespace('rfp-library'); // ← Le bon namespace!

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function main() {
  console.log(`\n🔎 Test recherche Pinecone pour "${searchTerm}"\n`);

  // Generate embedding
  console.log('Génération embedding...');
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: searchTerm,
    dimensions: 1536,
  });
  const queryVector = embeddingResponse.data[0].embedding;
  console.log('✅ Embedding généré\n');

  // Test with company_info filter (like "Informations Entreprise")
  const filter = {
    $and: [
      { tenant_id: { $eq: companyId } },
      { documentPurpose: { $eq: 'company_info' } },
    ],
  };

  console.log('Filtre utilisé:');
  console.log(JSON.stringify(filter, null, 2));
  console.log('');

  const queryResponse = await namespace.query({
    vector: queryVector,
    topK: 5,
    includeMetadata: true,
    filter: filter,
  });

  console.log(`\n📊 Résultats: ${queryResponse.matches.length} match(es)\n`);

  if (queryResponse.matches.length > 0) {
    queryResponse.matches.forEach((match, idx) => {
      console.log(`[${idx + 1}] Score: ${match.score?.toFixed(4)}`);
      console.log(`    Document: ${match.metadata?.title || 'N/A'}`);
      console.log(`    documentPurpose: ${match.metadata?.documentPurpose || 'N/A'}`);
      console.log(`    documentType: ${match.metadata?.documentType || 'N/A'}`);
      console.log(`    Extrait: "${(match.metadata?.text as string || '').slice(0, 200)}..."`);
      console.log('');
    });
  } else {
    console.log('❌ Aucun résultat trouvé');
    console.log('\nVérification: récupération de TOUS les vecteurs pour ce tenant...');

    // Try without additional filters
    const allDocsResponse = await namespace.query({
      vector: queryVector,
      topK: 10,
      includeMetadata: true,
      filter: {
        tenant_id: { $eq: companyId },
      },
    });

    console.log(`\nTous les documents du tenant: ${allDocsResponse.matches.length}\n`);
    allDocsResponse.matches.forEach((match, idx) => {
      console.log(`[${idx + 1}] ${match.metadata?.title || 'N/A'}`);
      console.log(`    documentPurpose: ${match.metadata?.documentPurpose || 'N/A'}`);
      console.log(`    documentType: ${match.metadata?.documentType || 'N/A'}`);
      console.log('');
    });
  }
}

main();
