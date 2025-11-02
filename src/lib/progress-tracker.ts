import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ProcessingStep {
  step: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  timestamp: number;
  details?: string;
}

export class DocumentProgressTracker {
  private documentId: string;
  private steps: ProcessingStep[];

  constructor(documentId: string) {
    this.documentId = documentId;
    this.steps = [
      { step: "Extraction du PDF", status: "pending", timestamp: Date.now() },
      { step: "Analyse intelligente avec Claude", status: "pending", timestamp: Date.now() },
      { step: "Filtrage des sections", status: "pending", timestamp: Date.now() },
      { step: "Création des chunks", status: "pending", timestamp: Date.now() },
      { step: "Génération des embeddings", status: "pending", timestamp: Date.now() },
      { step: "Indexation dans Pinecone", status: "pending", timestamp: Date.now() },
      { step: "Sauvegarde des signaux", status: "pending", timestamp: Date.now() },
      { step: "Finalisation", status: "pending", timestamp: Date.now() },
    ];
  }

  async updateStep(stepName: string, status: "in_progress" | "completed" | "failed", details?: string) {
    const stepIndex = this.steps.findIndex((s) => s.step === stepName);
    if (stepIndex !== -1) {
      this.steps[stepIndex] = {
        ...this.steps[stepIndex],
        status,
        timestamp: Date.now(),
        details,
      };

      // Save to database
      try {
        await db
          .update(documents)
          .set({
            processingSteps: this.steps as any,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, this.documentId));
      } catch (error) {
        console.error(`Failed to update progress for ${this.documentId}:`, error);
      }
    }
  }

  getSteps(): ProcessingStep[] {
    return this.steps;
  }
}
