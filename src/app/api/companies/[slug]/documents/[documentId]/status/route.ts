import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; documentId: string }> }
) {
  try {
    // 1. Verify authentication
    const { error: authError, session } = await verifyAuth();
    if (!session) return authError;

    // 2. Verify company context
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) {
      return NextResponse.json({ error: "No active company" }, { status: 403 });
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

    // 5. Extract progress information from metadata
    const metadata = document.metadata as any;

    return NextResponse.json({
      documentId: document.id,
      name: document.name,
      status: document.status,

      // Progress tracking
      progress: {
        uploaded: !!metadata?.blobUrl,
        extracted: !!metadata?.extractedText,
        analyzed: document.analysisCompleted || false,
        chunked: !!metadata?.chunks,
        embedded: document.vectorsCreated || false,
        finalized: document.status === "completed",

        // Current step details
        currentStep: metadata?.currentStep || null,
        currentStepProgress: metadata?.currentStepProgress || null,
        currentStepMessage: metadata?.currentStepMessage || null,
      },

      // Statistics
      stats: {
        pageCount: metadata?.pageCount || 0,
        wordCount: metadata?.wordCount || 0,
        sectionsTotal: metadata?.analysis?.sections?.length || 0,
        sectionsKept: metadata?.keptSectionIds?.length || 0,
        totalChunks: document.totalChunks || 0,
        vectorCount: metadata?.vectorCount || 0,
      },

      // Document type and analysis
      documentType: document.documentType,
      analysisConfidence: document.analysisConfidence,

      // Analysis sections (for view mode)
      analysis: metadata?.analysis ? {
        sections: metadata.analysis.sections?.map((s: any) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          relevanceScore: s.relevanceScore,
          shouldIndex: s.shouldIndex,
          tags: s.tags,
          preview: s.content?.substring(0, 150) || "",
        })) || [],
      } : null,

      // Filtering sections (for view mode)
      filtering: metadata?.keptSectionIds ? {
        keptSectionIds: metadata.keptSectionIds,
        sections: metadata.analysis?.sections?.map((s: any) => ({
          id: s.id,
          title: s.title,
          kept: metadata.keptSectionIds.includes(s.id),
        })) || [],
      } : null,

      // Chunks preview (for view mode)
      chunks: metadata?.chunks ? {
        preview: metadata.chunks.slice(0, 5).map((c: any, index: number) => ({
          index: index,
          content: c.content?.substring(0, 200) || c.substring(0, 200) || "",
          wordCount: (c.content || c).split(/\s+/).length,
        })),
      } : null,

      // Timestamps
      uploadedAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error("Status API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
