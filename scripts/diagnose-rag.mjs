#!/usr/bin/env node
/**
 * Script de diagnostic RAG
 * Vérifie les documents, métadonnées, et simule une recherche Pinecone
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc } from 'drizzle-orm';
import { documents } from '../src/db/schema.js';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const companyId = process.argv[2] || '6f0e6d06-69dd-45dc-945b-f4ba6e8e8e98';
const searchTerm = process.argv[3] || 'sanidépôt';

console.log(`\n🔍 Diagnostic RAG pour companyId: ${companyId}`);
console.log(`🔎 Recherche: "${searchTerm}"\n`);

// Initialize DB
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const index = pinecone.index(process.env.PINECONE_INDEX_NAME || 'market-intelligence-prod');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  try {
    // 1. Liste des documents récents
    console.log('📄 DOCUMENTS RÉCENTS DANS POSTGRESQL:');
    console.log('=====================================\n');

    const recentDocs = await db
      .select({
        id: documents.id,
        name: documents.name,
        status: documents.status,
        documentPurpose: documents.documentPurpose,
        documentType: documents.documentType,
        isHistoricalRfp: documents.isHistoricalRfp,
        totalChunks: documents.totalChunks,
        vectorsCreated: documents.vectorsCreated,
        createdAt: documents.createdAt,
        metadata: documents.metadata,
      })
      .from(documents)
      .where(eq(documents.companyId, companyId))
      .orderBy(desc(documents.createdAt))
      .limit(10);

    recentDocs.forEach((doc, idx) => {
      console.log(`[${idx + 1}] ${doc.name}`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    Status: ${doc.status}`);
      console.log(`    documentPurpose: ${doc.documentPurpose}`);
      console.log(`    documentType: ${doc.documentType || 'N/A'}`);
      console.log(`    isHistoricalRfp: ${doc.isHistoricalRfp}`);
      console.log(`    Chunks: ${doc.totalChunks || 0}`);
      console.log(`    Vectors: ${doc.vectorsCreated ? 'YES' : 'NO'}`);
      console.log(`    rfpOutcome: ${doc.metadata?.rfpOutcome || 'N/A'}`);
      console.log(`    Created: ${doc.createdAt}`);

      // Check if name contains search term
      if (doc.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        console.log(`    ✅ MATCH! Contains "${searchTerm}"`);
      }
      console.log('');
    });

    // 2. Recherche dans le texte extrait
    console.log('\n🔍 RECHERCHE DANS LE TEXTE EXTRAIT:');
    console.log('====================================\n');

    const docsWithText = recentDocs.filter(doc => doc.metadata?.extractedText);
    console.log(`Documents avec texte extrait: ${docsWithText.length}\n`);

    docsWithText.forEach(doc => {
      const text = doc.metadata.extractedText;
      const lowerText = text.toLowerCase();
      const lowerSearch = searchTerm.toLowerCase();

      if (lowerText.includes(lowerSearch)) {
        const matches = (text.match(new RegExp(searchTerm, 'gi')) || []).length;
        console.log(`✅ TROUVÉ dans "${doc.name}": ${matches} occurrence(s)`);

        // Show context
        const idx = lowerText.indexOf(lowerSearch);
        const start = Math.max(0, idx - 50);
        const end = Math.min(text.length, idx + searchTerm.length + 50);
        const context = text.slice(start, end);
        console.log(`   Contexte: "...${context}..."`);
        console.log('');
      }
    });

    // 3. Test de recherche vectorielle Pinecone
    console.log('\n🔮 TEST RECHERCHE VECTORIELLE PINECONE:');
    console.log('========================================\n');

    // Generate embedding for search term
    console.log(`Génération de l'embedding pour: "${searchTerm}"...`);
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: searchTerm,
      dimensions: 1536,
    });
    const queryVector = embeddingResponse.data[0].embedding;
    console.log('✅ Embedding généré\n');

    // Test différents filtres
    const filterTests = [
      {
        name: 'Sans filtre (tous documents)',
        filter: {
          tenant_id: { $eq: companyId },
        },
      },
      {
        name: 'Base de Connaissances',
        filter: {
          $and: [
            { tenant_id: { $eq: companyId } },
            { documentPurpose: { $eq: 'rfp_support' } },
            { documentType: { $eq: 'product_doc' } },
          ],
        },
      },
      {
        name: 'Informations Entreprise',
        filter: {
          $and: [
            { tenant_id: { $eq: companyId } },
            { documentPurpose: { $eq: 'company_info' } },
          ],
        },
      },
      {
        name: 'RFPs Historiques Gagnés',
        filter: {
          $and: [
            { tenant_id: { $eq: companyId } },
            { documentPurpose: { $eq: 'rfp_response' } },
            { isHistoricalRfp: { $eq: true } },
            { rfpOutcome: { $eq: 'won' } },
          ],
        },
      },
    ];

    for (const test of filterTests) {
      console.log(`\n📊 Test: ${test.name}`);
      console.log(`Filtre: ${JSON.stringify(test.filter, null, 2)}`);

      const queryResponse = await index.query({
        vector: queryVector,
        topK: 5,
        includeMetadata: true,
        filter: test.filter,
      });

      console.log(`\nRésultats: ${queryResponse.matches.length} match(es)`);

      if (queryResponse.matches.length > 0) {
        queryResponse.matches.forEach((match, idx) => {
          console.log(`\n[${idx + 1}] Score: ${match.score?.toFixed(4)}`);
          console.log(`    Document: ${match.metadata?.title || 'N/A'}`);
          console.log(`    documentPurpose: ${match.metadata?.documentPurpose || 'N/A'}`);
          console.log(`    documentType: ${match.metadata?.documentType || 'N/A'}`);
          console.log(`    isHistoricalRfp: ${match.metadata?.isHistoricalRfp || 'N/A'}`);
          console.log(`    rfpOutcome: ${match.metadata?.rfpOutcome || 'N/A'}`);
          console.log(`    Extrait: "${(match.metadata?.text || '').slice(0, 150)}..."`);
        });
      } else {
        console.log('❌ Aucun résultat trouvé');
      }
    }

    console.log('\n\n✅ Diagnostic terminé\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

main();
