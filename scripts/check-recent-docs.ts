#!/usr/bin/env tsx
import "dotenv/config";
import { db } from "../src/db";
import { documents } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function checkDocuments() {
  const docs = await db.select().from(documents).orderBy(desc(documents.createdAt)).limit(10);

  console.log('\n📄 Derniers documents uploadés:');
  console.log('================================\n');

  if (docs.length === 0) {
    console.log('❌ Aucun document trouvé dans la base de données');
  } else {
    docs.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.name}`);
      console.log(`   📊 Status: ${doc.status}`);
      console.log(`   🕐 Créé: ${doc.createdAt.toLocaleString('fr-FR')}`);
      console.log(`   📦 Chunks: ${doc.totalChunks || 0}`);
      console.log(`   🏷️  Type: ${doc.documentType || 'N/A'}`);
      console.log(`   ✅ Analyse complétée: ${doc.analysisCompleted ? 'Oui' : 'Non'}`);
      if (doc.errorMessage) {
        console.log(`   ❌ Erreur: ${doc.errorMessage}`);
      }
      console.log('');
    });
  }

  process.exit(0);
}

checkDocuments().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
