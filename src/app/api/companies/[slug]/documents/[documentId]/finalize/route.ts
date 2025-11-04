import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDocumentAccess, errorResponse } from "@/lib/auth/middleware";
import { db } from "@/db";
import { documents, signals } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  updateDocumentMetadata,
  getDocumentWithMetadata,
} from "@/lib/db/document-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; documentId: string }> }
) {
  const { slug, documentId } = await params;

  try {
    // 1. OPTIMIZED: Verify authentication using middleware
    const authResult = await requireAuth("editor", slug);
    if (!authResult.success) return authResult.error;

    const { company } = authResult.data;

    // 2. OPTIMIZED: Verify document access
    const docAccessResult = await requireDocumentAccess(documentId, company.company.id);
    if (!docAccessResult.success) return docAccessResult.error!;

    // 3. OPTIMIZED: Fetch document with typed metadata
    const document = await getDocumentWithMetadata(documentId);
    if (!document) {
      return errorResponse("DOCUMENT_NOT_FOUND", "Document not found", 404);
    }

    const metadata = document.metadata;
    const analysis = metadata.analysis;

    // 4. Save signals using transaction for atomicity
    let signalsSaved = 0;

    if (analysis && analysis.signals && analysis.signals.length > 0) {
      console.log(`[finalize] Saving ${analysis.signals.length} signals for document ${documentId}`);

      // OPTIMIZED: Use transaction for batch insert
      await db.transaction(async (tx) => {
        for (const signal of analysis.signals) {
          await tx.insert(signals).values({
            companyId: company.company.id,
            documentId: documentId,
            competitorId: document.competitorId || null,
            type: signal.type,
            severity: signal.severity,
            summary: signal.summary,
            details: signal.details,
            relatedEntities: signal.relatedEntities,
            status: "new",
          });
          signalsSaved++;
        }
      });

      console.log(`[finalize] Successfully saved ${signalsSaved} signals`);
    } else {
      console.log(`[finalize] No signals found for document ${documentId}, skipping signal creation`);
    }

    // 5. OPTIMIZED: Single update to mark as completed
    await db
      .update(documents)
      .set({
        status: "completed",
        metadata: {
          ...metadata,
          finalizedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    console.log(`[finalize] Document ${documentId} marked as completed`);

    // 6. Return finalization summary
    return NextResponse.json({
      success: true,
      status: "completed",
      signalsSaved,
      documentType: document.documentType || "unknown",
      totalChunks: document.totalChunks || 0,
    });
  } catch (error) {
    console.error("Finalize API error:", error);
    return errorResponse(
      "FINALIZATION_FAILED",
      "Failed to finalize document",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
