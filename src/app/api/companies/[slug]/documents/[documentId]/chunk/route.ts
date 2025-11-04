import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { chunkText } from "@/lib/rag/document-processor";

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

    // 5. Get analysis and kept section IDs from metadata
    const metadata = document.metadata as any;
    const analysis = metadata?.analysis;
    const keptSectionIds = metadata?.keptSectionIds || [];

    if (!analysis || !analysis.sections) {
      return NextResponse.json(
        { error: "No analysis found. Please run analysis first." },
        { status: 400 }
      );
    }

    if (keptSectionIds.length === 0) {
      return NextResponse.json(
        { error: "No kept sections found. Please run filtering first." },
        { status: 400 }
      );
    }

    // 6. Get kept sections and chunk their content
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

    // 7. Update document with chunks
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

    // 8. Return chunk statistics
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
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
