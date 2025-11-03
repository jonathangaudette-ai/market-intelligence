import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // 5. Get analysis from metadata
    const metadata = document.metadata as any;
    const analysis = metadata?.analysis;

    if (!analysis || !analysis.sections) {
      return NextResponse.json(
        { error: "No analysis found. Please run analysis first." },
        { status: 400 }
      );
    }

    // 6. Separate kept vs rejected sections based on shouldIndex flag
    const keptSections = analysis.sections.filter((s: any) => s.shouldIndex);
    const rejectedSections = analysis.sections.filter((s: any) => !s.shouldIndex);

    console.log(
      `[filter] Document ${documentId}: ${keptSections.length} kept, ${rejectedSections.length} rejected`
    );

    // 7. Update metadata with filtering results
    await db
      .update(documents)
      .set({
        metadata: {
          ...metadata,
          analysis: {
            ...analysis,
            filteringComplete: true,
            filteredAt: new Date().toISOString(),
          },
          // Store kept section IDs for later use in chunking
          keptSectionIds: keptSections.map((s: any) => s.id),
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 8. Return filtering results for UI display
    return NextResponse.json({
      success: true,
      keptSections: keptSections.length,
      rejectedSections: rejectedSections.length,
      sections: analysis.sections.map((s: any) => ({
        id: s.id,
        title: s.title,
        kept: s.shouldIndex,
        relevanceScore: s.relevanceScore,
        type: s.type,
      })),
    });
  } catch (error) {
    console.error("Filter API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
