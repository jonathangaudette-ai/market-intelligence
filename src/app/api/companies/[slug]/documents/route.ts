import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents, competitors } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/companies/[slug]/documents
 * Returns list of documents for the company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
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
    const { slug } = await params;
    if (currentCompany.company.slug !== slug) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    // 4. Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // completed, processing, failed
    const competitorId = searchParams.get("competitorId");
    const documentType = searchParams.get("documentType");

    // 5. Build query
    let query = db
      .select({
        // Document fields
        id: documents.id,
        name: documents.name,
        type: documents.type,
        status: documents.status,
        sourceUrl: documents.sourceUrl,
        totalChunks: documents.totalChunks,
        vectorsCreated: documents.vectorsCreated,
        documentType: documents.documentType,
        analysisCompleted: documents.analysisCompleted,
        analysisConfidence: documents.analysisConfidence,
        metadata: documents.metadata,
        errorMessage: documents.errorMessage,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,

        // Competitor info (if linked)
        competitor: {
          id: competitors.id,
          name: competitors.name,
        },
      })
      .from(documents)
      .leftJoin(competitors, eq(documents.competitorId, competitors.id))
      .where(eq(documents.companyId, currentCompany.company.id))
      .orderBy(desc(documents.createdAt));

    // Apply filters (if needed, add more complex filtering logic here)
    const results = await query;

    // 6. Filter results in memory (simpler for now)
    let filteredResults = results;

    if (status) {
      filteredResults = filteredResults.filter((doc) => doc.status === status);
    }

    if (competitorId) {
      filteredResults = filteredResults.filter(
        (doc) => doc.competitor?.id === competitorId
      );
    }

    if (documentType) {
      filteredResults = filteredResults.filter(
        (doc) => doc.documentType === documentType
      );
    }

    // 7. Calculate stats
    const stats = {
      total: results.length,
      completed: results.filter((d) => d.status === "completed").length,
      processing: results.filter((d) => d.status === "processing").length,
      failed: results.filter((d) => d.status === "failed").length,
      totalChunks: results.reduce((sum, d) => sum + (d.totalChunks || 0), 0),
    };

    // 8. Transform results to match frontend expectations
    const transformedDocuments = filteredResults.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type as "pdf" | "website" | "linkedin",
      status: doc.status as "completed" | "processing" | "failed" | "pending",
      competitor: doc.competitor?.name,
      competitorId: doc.competitor?.id,
      uploadedAt: formatRelativeTime(doc.createdAt),
      chunks: doc.totalChunks || 0,
      size: (doc.metadata as any)?.fileSize
        ? formatFileSize((doc.metadata as any).fileSize)
        : undefined,
      documentType: doc.documentType,
      analysisCompleted: doc.analysisCompleted,
      analysisConfidence: doc.analysisConfidence,
      errorMessage: doc.errorMessage,
    }));

    return NextResponse.json({
      documents: transformedDocuments,
      stats,
    });
  } catch (error) {
    console.error("Documents API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  }
  const months = Math.floor(diffDays / 30);
  return `Il y a ${months} mois`;
}

// Helper: Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
