import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { analyzeDocument } from "@/lib/rag/intelligent-preprocessor";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; documentId: string }> }
) {
  try {
    // 1. Verify authentication
    const { error: authError, session } = await verifyAuth();
    if (!session) return authError;

    // 2. Verify company context and permissions
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) {
      return NextResponse.json({ error: "No active company" }, { status: 403 });
    }

    // Check permission (editor or admin required)
    if (!hasPermission(currentCompany.role, "editor")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // 3. Verify company slug matches
    const { slug, documentId } = await params;
    if (currentCompany.company.slug !== slug) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    // 4. Fetch document from database
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify document belongs to the company
    if (document.companyId !== currentCompany.company.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 5. Get extracted text from metadata
    const metadata = document.metadata as any;
    const extractedText = metadata?.extractedText;

    if (!extractedText) {
      return NextResponse.json(
        { error: "No extracted text found. Please run extraction first." },
        { status: 400 }
      );
    }

    // 6. Analyze document with Claude Sonnet 4.5
    console.log(`[analyze] Starting Claude analysis for document ${documentId}`);

    // Update progress: Starting analysis
    await db.update(documents).set({
      metadata: {
        ...metadata,
        currentStep: "analysis",
        currentStepProgress: 0,
        currentStepMessage: "Préparation de l'analyse avec Claude Sonnet 4.5...",
      },
      updatedAt: new Date(),
    }).where(eq(documents.id, documentId));

    // Update: Analyzing
    await db.update(documents).set({
      metadata: {
        ...metadata,
        currentStep: "analysis",
        currentStepProgress: 25,
        currentStepMessage: `Analyse en cours avec Claude Sonnet 4.5 (${Math.round(extractedText.length / 1000)}K mots)...`,
      },
      updatedAt: new Date(),
    }).where(eq(documents.id, documentId));

    const analysis = await analyzeDocument(
      extractedText,
      currentCompany.company.id,
      {
        fileName: document.name,
        fileType: document.type,
      }
    );
    console.log(`[analyze] Claude analysis completed. Document type: ${analysis.documentType}`);

    // 7. Update document with analysis results
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
              // Store content in sections for later use
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

    // 8. Return analysis results for UI display
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
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
