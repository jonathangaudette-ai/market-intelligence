import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { db } from "@/db";
import { documents, competitors } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { formatRelativeTime, formatFileSize } from "@/lib/utils/formatting";
import { parseDocumentMetadata } from "@/lib/types/document-metadata";

/**
 * GET /api/companies/[slug]/documents
 * Returns list of documents for the company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1. Verify authentication using middleware
    const { slug } = await params;
    const authResult = await requireAuth("viewer", slug);
    if (!authResult.success) return authResult.error;

    const { company } = authResult.data;

    // 2. Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "completed" | "processing" | "failed" | "pending" | null;
    const competitorId = searchParams.get("competitorId");
    const documentType = searchParams.get("documentType");
    const purpose = searchParams.get("purpose") as "rfp_support" | "rfp_response" | "company_info" | null;

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // 3. Build WHERE conditions for SQL filtering (OPTIMIZED - no in-memory filtering)
    const whereConditions = [eq(documents.companyId, company.company.id)];

    if (status) {
      whereConditions.push(eq(documents.status, status));
    }

    if (competitorId) {
      whereConditions.push(eq(documents.competitorId, competitorId));
    }

    if (documentType) {
      whereConditions.push(eq(documents.documentType, documentType));
    }

    // Support Docs RAG v4.0 - Filter by documentPurpose (supports comma-separated values)
    if (purpose) {
      const purposes = purpose.split(',').map(p => p.trim());
      whereConditions.push(sql`${documents.documentPurpose} IN (${sql.join(purposes.map(p => sql`${p}`), sql`, `)})`);
    }

    // 4. Get total count for pagination
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(and(...whereConditions));

    // 5. Execute optimized query with SQL-level filtering + pagination
    const results = await db
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

        // Support Docs RAG v4.0 fields
        documentPurpose: documents.documentPurpose,
        contentType: documents.contentType,
        contentTypeTags: documents.contentTypeTags,

        // Competitor info (if linked)
        competitor: {
          id: competitors.id,
          name: competitors.name,
        },
      })
      .from(documents)
      .leftJoin(competitors, eq(documents.competitorId, competitors.id))
      .where(and(...whereConditions))
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset);

    // 5. Calculate stats from filtered results
    const stats = {
      total: results.length,
      completed: results.filter((d) => d.status === "completed").length,
      processing: results.filter((d) => d.status === "processing").length,
      failed: results.filter((d) => d.status === "failed").length,
      totalChunks: results.reduce((sum, d) => sum + (d.totalChunks || 0), 0),
    };

    // 6. Transform results with type-safe metadata parsing
    const transformedDocuments = results.map((doc) => {
      const metadata = parseDocumentMetadata(doc.metadata);

      return {
        id: doc.id,
        name: doc.name,
        type: doc.type as "pdf" | "website" | "linkedin",
        status: doc.status as "completed" | "processing" | "failed" | "pending",
        competitor: doc.competitor?.name,
        competitorId: doc.competitor?.id,
        uploadedAt: formatRelativeTime(doc.createdAt),
        chunks: doc.totalChunks || 0,
        size: metadata.fileSize ? formatFileSize(metadata.fileSize) : undefined,
        documentType: doc.documentType,
        analysisCompleted: doc.analysisCompleted,
        analysisConfidence: doc.analysisConfidence,
        errorMessage: doc.errorMessage,

        // Support Docs RAG v4.0 fields
        documentPurpose: doc.documentPurpose,
        contentType: doc.contentType,
        contentTypeTags: doc.contentTypeTags,
        createdAt: doc.createdAt, // Full date for support docs list
      };
    });

    return NextResponse.json({
      documents: transformedDocuments,
      stats,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / limit),
        hasNext: page < Math.ceil(totalCount.count / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Documents API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
