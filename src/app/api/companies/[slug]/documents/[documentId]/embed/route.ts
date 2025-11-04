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

    // Update progress: Starting embeddings
    await db.update(documents).set({
      metadata: {
        ...metadata,
        currentStep: "embeddings",
        currentStepProgress: 0,
        currentStepMessage: `Préparation de ${chunks.length} chunks pour l'embedding...`,
      },
      updatedAt: new Date(),
    }).where(eq(documents.id, documentId));

    // 6. Transform chunks to enriched format with metadata
    const enrichedChunks = chunks.map((c: any) => ({
      content: c.content,
      metadata: {
        sectionId: c.sectionId,
        sectionTitle: c.sectionTitle,
        sectionType: c.sectionType,
        sectionTags: c.sectionTags,
        sectionRelevanceScore: c.sectionRelevanceScore,
        sectionConfidence: c.sectionConfidence,
      },
    }));

    // Update progress: Creating embeddings
    await db.update(documents).set({
      metadata: {
        ...metadata,
        currentStep: "embeddings",
        currentStepProgress: 33,
        currentStepMessage: `Génération des embeddings avec OpenAI (${chunks.length} chunks)...`,
      },
      updatedAt: new Date(),
    }).where(eq(documents.id, documentId));

    // 7. Create RAG engine and upsert embeddings to Pinecone
    const ragEngine = new MultiTenantRAGEngine();

    // Update progress: Uploading to Pinecone
    await db.update(documents).set({
      metadata: {
        ...metadata,
        currentStep: "embeddings",
        currentStepProgress: 66,
        currentStepMessage: "Upload des vecteurs vers Pinecone...",
      },
      updatedAt: new Date(),
    }).where(eq(documents.id, documentId));

    const vectorCount = await ragEngine.upsertDocument({
      companyId: currentCompany.company.id,
      companyName: currentCompany.company.name,
      documentId: documentId,
      chunks: enrichedChunks,
      metadata: {
        documentName: document.name,
        documentType: document.documentType || "unknown",
        competitorId: document.competitorId || undefined,
        competitorName: undefined, // Will be populated if needed
        sourceUrl: document.sourceUrl || undefined,
        createdAt: document.createdAt.toISOString(),
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
          currentStep: "embeddings",
          currentStepProgress: 100,
          currentStepMessage: `${vectorCount} vecteurs créés et indexés avec succès`,
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
