import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDocumentAccess, errorResponse } from "@/lib/auth/middleware";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { chunkText } from "@/lib/rag/document-processor";
import {
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
    const analysis = metadata.analysis;
    const keptSectionIds = metadata.keptSectionIds || [];

    if (!analysis || !analysis.sections) {
      return errorResponse(
        "NO_ANALYSIS",
        "No analysis found. Please run analysis first.",
        400
      );
    }

    if (keptSectionIds.length === 0) {
      return errorResponse(
        "NO_KEPT_SECTIONS",
        "No kept sections found. Please run filtering first.",
        400
      );
    }

    // 4. Get kept sections and chunk their content
    const keptSections = analysis.sections.filter((s: any) =>
      keptSectionIds.includes(s.id)
    );

    console.log(`[chunk] Chunking ${keptSections.length} sections for document ${documentId}`);

    const chunks: Array<{
      sectionId: string;
      sectionTitle: string;
      sectionType: string;
      sectionTags?: string[];
      sectionRelevanceScore?: number;
      sectionConfidence?: number;
      chunkIndex: number;
      content: string;
      wordCount: number;
    }> = [];

    for (const section of keptSections) {
      const sectionChunks = chunkText(section.content, 1000, 200);

      sectionChunks.forEach((chunkContent, idx) => {
        chunks.push({
          sectionId: section.id,
          sectionTitle: section.title,
          sectionType: section.type,
          sectionTags: section.tags || [],
          sectionRelevanceScore: section.relevanceScore,
          sectionConfidence: section.confidence,
          chunkIndex: idx,
          content: chunkContent,
          wordCount: chunkContent.split(/\s+/).length,
        });
      });
    }

    console.log(`[chunk] Created ${chunks.length} chunks from ${keptSections.length} sections`);

    // 5. OPTIMIZED: Single update with chunks
    await db
      .update(documents)
      .set({
        totalChunks: chunks.length,
        metadata: {
          ...metadata,
          chunks: chunks,
          chunkedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 6. Return chunk statistics
    return NextResponse.json({
      success: true,
      totalChunks: chunks.length,
      totalSections: keptSections.length,
      avgChunksPerSection: Math.round((chunks.length / keptSections.length) * 10) / 10,
      chunkPreview: chunks.slice(0, 3).map((c) => ({
        section: c.sectionTitle,
        wordCount: c.wordCount,
        preview: c.content.substring(0, 100) + "...",
      })),
    });
  } catch (error) {
    console.error("Chunk API error:", error);

    try {
      await markDocumentFailed(
        documentId,
        error instanceof Error ? error.message : "Unknown error",
        "chunking"
      );
    } catch (updateError) {
      console.error("Failed to mark document as failed:", updateError);
    }

    return errorResponse(
      "CHUNKING_FAILED",
      "Failed to chunk document",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
