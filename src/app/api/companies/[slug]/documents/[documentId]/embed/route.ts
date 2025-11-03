import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MultiTenantRAGEngine } from "@/lib/rag/engine";

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

    // 5. Get chunks from metadata
    const metadata = document.metadata as any;
    const chunks = metadata?.chunks || [];

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No chunks found. Please run chunking first." },
        { status: 400 }
      );
    }

    console.log(`[embed] Creating embeddings for ${chunks.length} chunks for document ${documentId}`);

    // 6. Extract chunk content for embedding
    const chunkTexts = chunks.map((c: any) => c.content);

    // 7. Create RAG engine and upsert embeddings to Pinecone
    const ragEngine = new MultiTenantRAGEngine();

    const vectorCount = await ragEngine.upsertDocument({
      companyId: currentCompany.company.id,
      documentId: documentId,
      chunks: chunkTexts,
      metadata: {
        documentName: document.name,
        documentType: document.documentType || "unknown",
        competitorId: document.competitorId || undefined,
        competitorName: undefined, // Will be populated if needed
        sourceUrl: document.sourceUrl || undefined,
      },
    });

    console.log(`[embed] Successfully created ${vectorCount} embeddings in Pinecone`);

    // 8. Update document to mark vectors as created
    await db
      .update(documents)
      .set({
        vectorsCreated: true,
        metadata: {
          ...metadata,
          embeddedAt: new Date().toISOString(),
          vectorCount: vectorCount,
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 9. Return embedding statistics
    return NextResponse.json({
      success: true,
      vectorsCreated: vectorCount,
      totalChunks: chunks.length,
      model: "text-embedding-3-large",
      dimensions: 1536,
    });
  } catch (error) {
    console.error("Embed API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
