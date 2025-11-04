import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDocumentAccess, errorResponse } from "@/lib/auth/middleware";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { analyzeDocument } from "@/lib/rag/intelligent-preprocessor";
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
    const extractedText = metadata.extractedText;

    if (!extractedText) {
      return errorResponse(
        "NO_EXTRACTED_TEXT",
        "No extracted text found. Please run extraction first.",
        400
      );
    }

    // 4. Analyze document with Claude Sonnet 4.5
    console.log(`[analyze] Starting Claude analysis for document ${documentId}`);

    // OPTIMIZED: Single progress update
    await updateDocumentProgress(
      documentId,
      "analysis",
      0,
      "Préparation de l'analyse avec Claude Sonnet 4.5..."
    );

    // Update: Analyzing
    await updateDocumentProgress(
      documentId,
      "analysis",
      25,
      `Analyse en cours avec Claude Sonnet 4.5 (${Math.round(extractedText.length / 1000)}K mots)...`
    );

    const analysis = await analyzeDocument(extractedText, company.company.id, {
      fileName: document.name,
      fileType: document.type,
    });

    console.log(`[analyze] Claude analysis completed. Document type: ${analysis.documentType}`);

    // 5. OPTIMIZED: Single update with all analysis results
    await db
      .update(documents)
      .set({
        documentType: analysis.documentType,
        analysisCompleted: true,
        analysisConfidence: Math.round(analysis.confidence * 100),
        metadata: {
          ...metadata,
          currentStep: "analysis",
          currentStepProgress: 100,
          currentStepMessage: `Analyse terminée: ${analysis.sections.length} sections détectées`,
          // Store full analysis
          analysis: {
            documentType: analysis.documentType,
            industry: analysis.industry,
            language: analysis.language,
            confidence: analysis.confidence,
            sections: analysis.sections.map((s) => ({
              id: s.id,
              title: s.title,
              type: s.type,
              relevanceScore: s.relevanceScore,
              shouldIndex: s.shouldIndex,
              tags: s.tags,
              reasoning: s.reasoning,
              content: s.content,
            })),
            metadata: analysis.metadata,
            signals: analysis.signals,
            excludedSections: analysis.excludedSections,
            reasoning: analysis.reasoning,
          },
          analyzedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 6. Return analysis results for UI display
    return NextResponse.json({
      success: true,
      documentType: analysis.documentType,
      confidence: analysis.confidence,
      sections: analysis.sections.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        relevanceScore: s.relevanceScore,
        preview: s.content.substring(0, 150) + "...",
      })),
      totalSections: analysis.sections.length,
      signalsDetected: analysis.signals.length,
    });
  } catch (error) {
    console.error("Analyze API error:", error);

    // OPTIMIZED: Mark document as failed using helper
    try {
      await markDocumentFailed(
        documentId,
        error instanceof Error ? error.message : "Unknown error",
        "analysis"
      );
    } catch (updateError) {
      console.error("Failed to mark document as failed:", updateError);
    }

    return errorResponse(
      "ANALYSIS_FAILED",
      "Failed to analyze document",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
