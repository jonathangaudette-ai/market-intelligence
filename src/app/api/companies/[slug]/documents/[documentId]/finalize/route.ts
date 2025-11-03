import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents, signals } from "@/db/schema";
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

    // 5. Get analysis and signals from metadata
    const metadata = document.metadata as any;
    const analysis = metadata?.analysis;

    if (!analysis || !analysis.signals) {
      console.log(`[finalize] No signals found for document ${documentId}, skipping signal creation`);
    } else {
      // 6. Save detected signals to signals table
      console.log(`[finalize] Saving ${analysis.signals.length} signals for document ${documentId}`);

      for (const signal of analysis.signals) {
        await db.insert(signals).values({
          companyId: currentCompany.company.id,
          documentId: documentId,
          competitorId: document.competitorId || null,
          type: signal.type,
          severity: signal.severity,
          summary: signal.summary,
          details: signal.details,
          relatedEntities: signal.relatedEntities,
          status: "new",
        });
      }

      console.log(`[finalize] Successfully saved ${analysis.signals.length} signals`);
    }

    // 7. Update document status to completed
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

    // 8. Return finalization summary
    return NextResponse.json({
      success: true,
      status: "completed",
      signalsSaved: analysis?.signals?.length || 0,
      documentType: document.documentType || "unknown",
      totalChunks: document.totalChunks || 0,
    });
  } catch (error) {
    console.error("Finalize API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
