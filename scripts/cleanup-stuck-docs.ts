#!/usr/bin/env tsx
import "dotenv/config";
import { db } from "../src/db";
import { documents } from "../src/db/schema";
import { eq, and, lt } from "drizzle-orm";

async function cleanupStuckDocuments() {
  console.log('\n🧹 Nettoyage des documents bloqués...\n');

  // Find documents stuck in "processing" for more than 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  const stuckDocs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.status, "processing"),
        lt(documents.createdAt, twoMinutesAgo)
      )
    );

  if (stuckDocs.length === 0) {
    console.log('✅ Aucun document bloqué trouvé');
    process.exit(0);
  }

  console.log(`📋 ${stuckDocs.length} document(s) bloqué(s) trouvé(s):\n`);

  for (const doc of stuckDocs) {
    console.log(`   - ${doc.name} (ID: ${doc.id})`);
  }

  // Update all stuck documents to "failed"
  const updated = await db
    .update(documents)
    .set({
      status: "failed",
      errorMessage: "Processing timeout - document took more than 60 seconds to process. This usually happens with large documents or slow API responses.",
    })
    .where(
      and(
        eq(documents.status, "processing"),
        lt(documents.createdAt, twoMinutesAgo)
      )
    )
    .returning();

  console.log(`\n✅ ${updated.length} document(s) marqué(s) comme "failed"\n`);

  process.exit(0);
}

cleanupStuckDocuments().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
