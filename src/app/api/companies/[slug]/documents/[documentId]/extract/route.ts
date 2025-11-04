import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDocumentAccess, errorResponse } from "@/lib/auth/middleware";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { processPDF } from "@/lib/rag/document-processor";
import {
  updateDocumentProgress,
  updateDocumentMetadata,
  markDocumentFailed,
  getDocumentWithMetadata,
} from "@/lib/db/document-helpers";
import { parseDocumentMetadata } from "@/lib/types/document-metadata";

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

    // 4. Validate blob URL
    const blobUrl = metadata.blobUrl;
    if (!blobUrl) {
      return errorResponse(
        "NO_BLOB_URL",
        "No blob URL found in document metadata",
        400
      );
    }

    // Validate blob URL is from Vercel Blob (SECURITY: prevent SSRF)
    const BLOB_URL_PATTERN = /^https:\/\/[a-z0-9]+\.(?:blob\.vercel-storage\.com|public\.blob\.vercel-storage\.com)/;
    if (!BLOB_URL_PATTERN.test(blobUrl)) {
      return errorResponse("INVALID_BLOB_URL", "Invalid blob URL", 400);
    }

    // 5. OPTIMIZED: Update progress using helper (single DB call)
    await updateDocumentProgress(
      documentId,
      "extraction",
      0,
      "Téléchargement du PDF depuis le stockage..."
    );

    // 6. Fetch PDF from Vercel Blob Storage
    const blobResponse = await fetch(blobUrl);
    if (!blobResponse.ok) {
      throw new Error(`Failed to fetch blob: ${blobResponse.statusText}`);
    }

    const arrayBuffer = await blobResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 7. OPTIMIZED: Update progress (single DB call)
    await updateDocumentProgress(
      documentId,
      "extraction",
      50,
      "Extraction du texte du PDF en cours..."
    );

    // 8. Extract text using processPDF
    const processed = await processPDF(buffer);

    // 9. OPTIMIZED: Update document with extraction results (single DB call)
    await updateDocumentMetadata(documentId, {
      pageCount: processed.metadata.pageCount,
      wordCount: processed.metadata.wordCount,
      extractedText: processed.text,
      extractedAt: new Date().toISOString(),
      currentStep: "extraction",
      currentStepProgress: 100,
      currentStepMessage: `Extraction terminée: ${processed.metadata.pageCount} pages, ${processed.metadata.wordCount} mots`,
    });

    // 10. Return extraction results
    return NextResponse.json({
      success: true,
      pages: processed.metadata.pageCount,
      wordCount: processed.metadata.wordCount,
      text: processed.text,
    });
  } catch (error) {
    console.error("Extract API error:", error);

    // OPTIMIZED: Mark document as failed using helper
    try {
      await markDocumentFailed(
        documentId,
        error instanceof Error ? error.message : "Unknown error",
        "extraction"
      );
    } catch (updateError) {
      console.error("Failed to mark document as failed:", updateError);
    }

    return errorResponse(
      "EXTRACTION_FAILED",
      "Failed to extract text from document",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
