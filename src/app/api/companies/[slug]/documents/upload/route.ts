import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { ragEngine } from "@/lib/rag/engine";
import { processPDF } from "@/lib/rag/document-processor";
import { analyzeDocument, getIndexableContent, getEnrichedMetadata } from "@/lib/rag/intelligent-preprocessor";
import { db } from "@/db";
import { documents, competitors, signals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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
    const { slug } = await params;
    if (currentCompany.company.slug !== slug) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    // 4. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const competitorId = formData.get("competitorId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    // 5. Get competitor info if provided
    let competitorInfo = null;
    if (competitorId) {
      const [competitor] = await db
        .select()
        .from(competitors)
        .where(eq(competitors.id, competitorId))
        .limit(1);

      if (competitor && competitor.companyId === currentCompany.company.id) {
        competitorInfo = competitor;
      }
    }

    // 6. Create document record
    const [document] = await db
      .insert(documents)
      .values({
        companyId: currentCompany.company.id,
        competitorId: competitorInfo?.id || null,
        name: file.name,
        type: "pdf",
        status: "processing",
        uploadedBy: session.user.id,
        metadata: {
          fileSize: file.size,
          mimeType: file.type,
        },
      })
      .returning();

    // 7. Process PDF with intelligent analysis
    // For production, use a queue (BullMQ, Inngest, etc.)
    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      // 7a. Extract raw text from PDF
      const processed = await processPDF(buffer);
      const rawText = processed.text;

      // 7b. ⭐ INTELLIGENT ANALYSIS with Claude Sonnet 4 (thinking)
      console.log(`[${document.id}] Starting intelligent analysis...`);
      const analysis = await analyzeDocument(rawText, currentCompany.company.id, {
        fileName: file.name,
        fileType: "pdf",
      });
      console.log(`[${document.id}] Analysis complete. Type: ${analysis.documentType}, Confidence: ${analysis.confidence}`);

      // 7c. Get only indexable content (filtered sections)
      const indexableContent = getIndexableContent(analysis);
      console.log(`[${document.id}] Indexable sections: ${analysis.sections.filter(s => s.shouldIndex).length}/${analysis.sections.length}`);

      // 7d. Chunk the filtered content
      const { chunkText } = await import("@/lib/rag/document-processor");
      const allChunks = indexableContent.flatMap((content) => chunkText(content));
      console.log(`[${document.id}] Created ${allChunks.length} chunks from filtered content`);

      // 7e. Get enriched metadata for vector storage
      const enrichedMetadata = getEnrichedMetadata(analysis);

      // 8. Upsert to RAG with enriched metadata
      const vectorsCreated = await ragEngine.upsertDocument({
        companyId: currentCompany.company.id,
        documentId: document.id,
        chunks: allChunks,
        metadata: {
          documentName: file.name,
          documentType: analysis.documentType,
          competitorName: competitorInfo?.name,
          competitorId: competitorInfo?.id,
          ...enrichedMetadata, // Spread enriched metadata (competitors, pricing, etc.)
        },
      });

      // 9. Save detected signals
      if (analysis.signals && analysis.signals.length > 0) {
        console.log(`[${document.id}] Saving ${analysis.signals.length} detected signals...`);

        for (const signal of analysis.signals) {
          // Try to match competitor from relatedEntities
          let signalCompetitorId = competitorInfo?.id || null;

          if (!signalCompetitorId && signal.relatedEntities.length > 0) {
            // Try to find competitor by name
            const possibleCompetitor = await db
              .select()
              .from(competitors)
              .where(eq(competitors.companyId, currentCompany.company.id))
              .limit(1);

            if (possibleCompetitor.length > 0) {
              signalCompetitorId = possibleCompetitor[0].id;
            }
          }

          await db.insert(signals).values({
            companyId: currentCompany.company.id,
            documentId: document.id,
            competitorId: signalCompetitorId,
            type: signal.type,
            severity: signal.severity,
            summary: signal.summary,
            details: signal.details,
            relatedEntities: signal.relatedEntities,
            status: "new",
          });
        }
      }

      // 10. Update document with complete analysis
      await db
        .update(documents)
        .set({
          status: "completed",
          totalChunks: allChunks.length,
          vectorsCreated: true,
          documentType: analysis.documentType,
          analysisCompleted: true,
          analysisConfidence: Math.round(analysis.confidence * 100),
          metadata: {
            // File info
            fileSize: file.size,
            mimeType: file.type,
            pageCount: processed.metadata.pageCount,
            wordCount: processed.metadata.wordCount,

            // Analysis results
            sectionsAnalyzed: analysis.sections.length,
            sectionsIndexed: analysis.sections.filter((s) => s.shouldIndex).length,
            signalsDetected: analysis.signals.length,

            // Extracted metadata (full DocumentMetadata)
            ...analysis.metadata,
            // Override with top-level analysis fields if different
            language: analysis.language,
            industry: analysis.industry,
          },
        })
        .where(eq(documents.id, document.id));

      return NextResponse.json({
        documentId: document.id,
        name: file.name,
        status: "completed",
        chunksCreated: vectorsCreated,
        analysis: {
          documentType: analysis.documentType,
          confidence: analysis.confidence,
          sectionsAnalyzed: analysis.sections.length,
          sectionsIndexed: analysis.sections.filter((s) => s.shouldIndex).length,
          signalsDetected: analysis.signals.length,
          competitors: analysis.metadata.competitors || [],
          strategicThemes: analysis.metadata.strategicThemes || [],
        },
      });
    } catch (processingError) {
      console.error("Document processing error:", processingError);

      // Update document status to failed
      await db
        .update(documents)
        .set({
          status: "failed",
          errorMessage: processingError instanceof Error ? processingError.message : "Unknown error",
        })
        .where(eq(documents.id, document.id));

      return NextResponse.json(
        { error: "Failed to process document", details: processingError instanceof Error ? processingError.message : "Unknown error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
