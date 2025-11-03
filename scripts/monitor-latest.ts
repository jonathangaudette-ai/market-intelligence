import { db } from "../src/db";
import { documents } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function monitorLatest() {
  console.log("🔄 Monitoring latest document (refreshing every 10s)...\n");

  let lastId: string | null = null;

  while (true) {
    const [latest] = await db
      .select({
        id: documents.id,
        name: documents.name,
        status: documents.status,
        documentType: documents.documentType,
        analysisConfidence: documents.analysisConfidence,
        errorMessage: documents.errorMessage,
        processingSteps: documents.processingSteps,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .orderBy(desc(documents.updatedAt))
      .limit(1);

    if (!latest) {
      console.log("No documents found");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      continue;
    }

    // Show update if document changed or status changed
    if (lastId !== latest.id) {
      const now = new Date().toLocaleTimeString();
      console.log(`\n${"=".repeat(80)}`);
      console.log(`[${now}] NEW DOCUMENT DETECTED`);
      console.log(`${"=".repeat(80)}`);
      lastId = latest.id;
    }

    const now = new Date().toLocaleTimeString();
    console.log(`\n[${now}] ${latest.name}`);
    console.log(`Status: ${latest.status}`);

    if (latest.documentType) {
      console.log(`Type: ${latest.documentType} (${Math.round((latest.analysisConfidence || 0) * 100)}%)`);
    }

    if (latest.errorMessage) {
      console.log(`\n❌ ERROR:`);
      console.log(latest.errorMessage);
    }

    if (latest.processingSteps) {
      const steps = latest.processingSteps as any[];
      const completed = steps.filter((s) => s.status === "completed").length;
      console.log(`\nProgress: ${completed}/${steps.length} steps completed`);

      for (const step of steps) {
        const icon =
          step.status === "completed"
            ? "✓"
            : step.status === "in_progress"
            ? "⟳"
            : step.status === "failed"
            ? "✗"
            : "○";

        console.log(`  ${icon} ${step.step}`);
        if (step.details) {
          console.log(`    → ${step.details}`);
        }
      }
    }

    // Stop if completed or failed
    if (latest.status === "completed") {
      console.log(`\n${"=".repeat(80)}`);
      console.log("✅ DOCUMENT COMPLETED SUCCESSFULLY!");
      console.log(`${"=".repeat(80)}`);
      break;
    } else if (latest.status === "failed") {
      console.log(`\n${"=".repeat(80)}`);
      console.log("❌ DOCUMENT FAILED");
      console.log(`${"=".repeat(80)}`);
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

monitorLatest();
