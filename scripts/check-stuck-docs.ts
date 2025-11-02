#!/usr/bin/env tsx
import "dotenv/config";
import { db } from "../src/db";
import { documents } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function checkStuckDocuments() {
  // Find all documents in processing status
  const processingDocs = await db
    .select()
    .from(documents)
    .where(eq(documents.status, "processing"));

  console.log('\n🔄 Documents en cours de traitement:');
  console.log('====================================\n');

  if (processingDocs.length === 0) {
    console.log('✅ Aucun document bloqué en "processing"');
  } else {
    processingDocs.forEach((doc, idx) => {
      const now = new Date();
      const createdAt = new Date(doc.createdAt);
      const ageMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);

      console.log(`${idx + 1}. ${doc.name}`);
      console.log(`   📌 ID: ${doc.id}`);
      console.log(`   🕐 Créé: ${doc.createdAt.toLocaleString('fr-FR')}`);
      console.log(`   ⏱️  Âge: ${ageMinutes} minutes`);
      console.log(`   📊 Status: ${doc.status}`);

      if (ageMinutes > 2) {
        console.log(`   ⚠️  BLOQUÉ - devrait être marqué comme "failed"`);
      }
      console.log('');
    });

    // Offer to mark them as failed
    console.log('\n💡 Ces documents sont probablement bloqués.');
    console.log('   Raisons possibles:');
    console.log('   - Timeout Vercel (60s)');
    console.log('   - Erreur Claude API non catchée');
    console.log('   - Interruption réseau\n');
  }

  process.exit(0);
}

checkStuckDocuments().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
