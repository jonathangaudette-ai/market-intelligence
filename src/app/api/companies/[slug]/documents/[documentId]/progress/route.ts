import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/companies/[slug]/documents/[documentId]/progress
 * Returns real-time progress of document processing
 */
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

    // 4. Get document with progress
    const [document] = await db
      .select({
        id: documents.id,
        name: documents.name,
        status: documents.status,
        processingSteps: documents.processingSteps,
        totalChunks: documents.totalChunks,
        documentType: documents.documentType,
        analysisConfidence: documents.analysisConfidence,
        errorMessage: documents.errorMessage,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.companyId, currentCompany.company.id)
        )
      )
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      documentId: document.id,
      name: document.name,
      status: document.status,
      steps: document.processingSteps || [],
      totalChunks: document.totalChunks,
      documentType: document.documentType,
      analysisConfidence: document.analysisConfidence,
      errorMessage: document.errorMessage,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error("Progress API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
