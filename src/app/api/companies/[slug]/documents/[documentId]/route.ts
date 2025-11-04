import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ragEngine } from "@/lib/rag/engine";
import { del } from "@vercel/blob";

export async function DELETE(
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

    console.log(`[delete] Hard deleting document ${documentId}`);

    // 5. Delete PDF from Vercel Blob Storage (if it's a PDF type)
    if (document.type === "pdf") {
      const metadata = document.metadata as any;
      const blobUrl = metadata?.blobUrl;

      if (blobUrl) {
        console.log(`[delete] Deleting blob from Vercel Blob Storage: ${blobUrl}`);
        try {
          await del(blobUrl);
          console.log(`[delete] Successfully deleted blob from Vercel Blob Storage`);
        } catch (error) {
          console.error(`[delete] Error deleting blob:`, error);
          // Continue even if blob deletion fails
        }
      }
    }

    // 6. Delete vectors from Pinecone if they exist
    if (document.vectorsCreated) {
      console.log(`[delete] Deleting vectors from Pinecone for document ${documentId}`);
      try {
        await ragEngine.deleteDocument(documentId);
        console.log(`[delete] Successfully deleted vectors from Pinecone`);
      } catch (error) {
        console.error(`[delete] Error deleting vectors from Pinecone:`, error);
        // Continue even if Pinecone deletion fails
      }
    }

    // 7. Hard delete the document from PostgreSQL
    await db.delete(documents).where(eq(documents.id, documentId));

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
      documentId: documentId,
    });
  } catch (error) {
    console.error("Delete document API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
