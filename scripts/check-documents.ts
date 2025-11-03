import { db } from "../src/db";
import { documents } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function checkLatest() {
  const docs = await db
    .select({
      id: documents.id,
      name: documents.name,
      status: documents.status,
      document_type: documents.documentType,
      analysis_confidence: documents.analysisConfidence,
      error_message: documents.errorMessage,
      processing_steps: documents.processingSteps,
      created_at: documents.createdAt,
      updated_at: documents.updatedAt,
    })
    .from(documents)
    .orderBy(desc(documents.updatedAt))
    .limit(3);

  console.log("Latest Documents:\n");

  for (const doc of docs) {
    console.log("─".repeat(80));
    console.log(`Document: ${doc.name}`);
    console.log(`ID: ${doc.id}`);
    console.log(`Status: ${doc.status}`);
    console.log(`Type: ${doc.document_type || "N/A"}`);
    console.log(`Confidence: ${doc.analysis_confidence ? Math.round(doc.analysis_confidence * 100) + "%" : "N/A"}`);

    if (doc.error_message) {
      console.log(`❌ Error: ${doc.error_message}`);
    }

    if (doc.processing_steps) {
      const steps = doc.processing_steps as any[];
      console.log(`\nSteps (${steps.filter(s => s.status === 'completed').length}/${steps.length} completed):`);

      for (const step of steps) {
        const icon =
          step.status === 'completed' ? '✓' :
          step.status === 'in_progress' ? '⟳' :
          step.status === 'failed' ? '✗' :
          '○';

        console.log(`  ${icon} ${step.step} [${step.status}]`);
        if (step.details) {
          console.log(`    → ${step.details}`);
        }
      }
    }

    console.log(`\nCreated: ${new Date(doc.created_at).toLocaleString()}`);
    console.log(`Updated: ${new Date(doc.updated_at).toLocaleString()}`);
  }

  console.log("─".repeat(80));
}

checkLatest();
