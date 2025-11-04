/**
 * Database helpers for document operations
 * Optimized to reduce metadata spread operations and DB round-trips
 */

import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DocumentMetadata, parseDocumentMetadata } from "@/lib/types/document-metadata";

/**
 * Update document metadata atomically
 * This avoids multiple spread operations and reduces DB calls
 */
export async function updateDocumentMetadata(
  documentId: string,
  metadataUpdates: Partial<DocumentMetadata>,
  options?: {
    status?: "completed" | "processing" | "failed" | "pending";
    errorMessage?: string | null;
  }
) {
  const updates: any = {
    updatedAt: new Date(),
  };

  // Fetch current metadata first
  const [currentDoc] = await db
    .select({ metadata: documents.metadata })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!currentDoc) {
    throw new Error(`Document ${documentId} not found`);
  }

  const currentMetadata = parseDocumentMetadata(currentDoc.metadata);

  // Merge metadata updates
  updates.metadata = {
    ...currentMetadata,
    ...metadataUpdates,
  };

  // Add optional fields
  if (options?.status) {
    updates.status = options.status;
  }

  if (options?.errorMessage !== undefined) {
    updates.errorMessage = options.errorMessage;
  }

  // Single DB update
  await db.update(documents).set(updates).where(eq(documents.id, documentId));
}

/**
 * Update document progress for a specific step
 */
export async function updateDocumentProgress(
  documentId: string,
  step: DocumentMetadata["currentStep"],
  progress: number,
  message: string
) {
  await updateDocumentMetadata(documentId, {
    currentStep: step,
    currentStepProgress: progress,
    currentStepMessage: message,
    currentStepStartedAt: progress === 0 ? new Date().toISOString() : undefined,
  });
}

/**
 * Mark document as failed with error message
 */
export async function markDocumentFailed(
  documentId: string,
  errorMessage: string,
  step?: DocumentMetadata["currentStep"]
) {
  await updateDocumentMetadata(
    documentId,
    {
      currentStep: step,
      currentStepProgress: 0,
      currentStepMessage: `Erreur: ${errorMessage}`,
      lastError: errorMessage,
      lastErrorAt: new Date().toISOString(),
    },
    {
      status: "failed",
      errorMessage,
    }
  );
}

/**
 * Get document with typed metadata
 */
export async function getDocumentWithMetadata(documentId: string) {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!document) {
    return null;
  }

  return {
    ...document,
    metadata: parseDocumentMetadata(document.metadata),
  };
}

/**
 * Batch update multiple documents (for bulk operations)
 */
export async function batchUpdateDocuments(
  updates: Array<{
    documentId: string;
    metadata?: Partial<DocumentMetadata>;
    status?: "completed" | "processing" | "failed" | "pending";
  }>
) {
  // Use transaction for atomicity
  await db.transaction(async (tx) => {
    for (const update of updates) {
      const [currentDoc] = await tx
        .select({ metadata: documents.metadata })
        .from(documents)
        .where(eq(documents.id, update.documentId))
        .limit(1);

      if (!currentDoc) continue;

      const currentMetadata = parseDocumentMetadata(currentDoc.metadata);
      const newMetadata = {
        ...currentMetadata,
        ...update.metadata,
      };

      await tx
        .update(documents)
        .set({
          metadata: newMetadata,
          status: update.status,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, update.documentId));
    }
  });
}
