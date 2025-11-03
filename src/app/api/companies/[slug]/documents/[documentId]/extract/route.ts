import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { processPDF } from "@/lib/rag/document-processor";

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

    // 5. Get blobUrl from metadata
    const metadata = document.metadata as any;
    const blobUrl = metadata?.blobUrl;

    if (!blobUrl) {
      return NextResponse.json(
        { error: "No blob URL found in document metadata" },
        { status: 400 }
      );
    }

    // 6. Fetch PDF from Vercel Blob Storage
    const blobResponse = await fetch(blobUrl);
    if (!blobResponse.ok) {
      throw new Error(`Failed to fetch blob: ${blobResponse.statusText}`);
    }

    const arrayBuffer = await blobResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 7. Extract text using processPDF
    const processed = await processPDF(buffer);

    // 8. Update document with extraction results
    await db
      .update(documents)
      .set({
        metadata: {
          ...metadata,
          pageCount: processed.metadata.pageCount,
          wordCount: processed.metadata.wordCount,
          extractedText: processed.text,
          extractedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 9. Return extraction results
    return NextResponse.json({
      success: true,
      pages: processed.metadata.pageCount,
      wordCount: processed.metadata.wordCount,
      textPreview: processed.text.substring(0, 500),
    });
  } catch (error) {
    console.error("Extract API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
