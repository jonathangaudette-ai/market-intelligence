import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDocumentAccess, errorResponse } from "@/lib/auth/middleware";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MultiTenantRAGEngine } from "@/lib/rag/engine";
import {
  updateDocumentProgress,
  updateDocumentMetadata,
  markDocumentFailed,
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
    const chunks = metadata.chunks || [];

    if (chunks.length === 0) {
      return errorResponse(
        "NO_CHUNKS",
        "No chunks found. Please run chunking first.",
        400
      );
    }

    console.log(`[embed] Creating embeddings for ${chunks.length} chunks for document ${documentId}`);

    // 4. OPTIMIZED: Progress updates
    await updateDocumentProgress(
      documentId,
      "embedding",
      0,
      `Préparation de ${chunks.length} chunks pour l'embedding...`
    );

    // 5. Transform chunks to enriched format with metadata
    const enrichedChunks = chunks.map((c: any) => ({
      content: c.content,
      metadata: {
        sectionId: c.sectionId,
        sectionTitle: c.sectionTitle,
        sectionType: c.sectionType,
        sectionTags: c.sectionTags,
        sectionRelevanceScore: c.sectionRelevanceScore,
        sectionConfidence: c.sectionConfidence,
      },
    }));

    await updateDocumentProgress(
      documentId,
      "embedding",
      33,
      `Génération des embeddings avec OpenAI (batching ${chunks.length} chunks)...`
    );

    // 6. OPTIMIZED: Create RAG engine with batch embedding
    const ragEngine = new MultiTenantRAGEngine();

    await updateDocumentProgress(
      documentId,
      "embedding",
      66,
      "Upload des vecteurs vers Pinecone..."
    );

    const vectorCount = await ragEngine.upsertDocument({
      companyId: company.company.id,
      companyName: company.company.name,
      documentId: documentId,
      chunks: enrichedChunks,
      metadata: {
        documentName: document.name,
        documentType: document.documentType || "unknown",
        competitorId: document.competitorId || undefined,
        competitorName: undefined,
        sourceUrl: document.sourceUrl || undefined,
        createdAt: document.createdAt.toISOString(),
      },
    });

    console.log(`[embed] Successfully created ${vectorCount} embeddings with batching`);

    // 7. OPTIMIZED: Single update to mark vectors as created
    await db
      .update(documents)
      .set({
        vectorsCreated: true,
        metadata: {
          ...metadata,
          embeddedAt: new Date().toISOString(),
          vectorCount: vectorCount,
          currentStep: "embedding",
          currentStepProgress: 100,
          currentStepMessage: `${vectorCount} vecteurs créés et indexés avec succès (batched)`,
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 8. Return embedding statistics
    return NextResponse.json({
      success: true,
      vectorsCreated: vectorCount,
      totalChunks: chunks.length,
      model: "text-embedding-3-large",
      dimensions: 1536,
      batched: true,
      estimatedApiCalls: Math.ceil(chunks.length / 100), // vs chunks.length before
    });
  } catch (error) {
    console.error("Embed API error:", error);

    try {
      await markDocumentFailed(
        documentId,
        error instanceof Error ? error.message : "Unknown error",
        "embedding"
      );
    } catch (updateError) {
      console.error("Failed to mark document as failed:", updateError);
    }

    return errorResponse(
      "EMBEDDING_FAILED",
      "Failed to create embeddings",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
