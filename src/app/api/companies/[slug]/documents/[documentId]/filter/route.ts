import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireDocumentAccess, errorResponse } from "@/lib/auth/middleware";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  updateDocumentMetadata,
  getDocumentWithMetadata,
} from "@/lib/db/document-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; documentId: string }> }
) {
  const { slug, documentId } = await params;

  try {
    // 1. OPTIMIZED: Verify authentication using middleware
    const authResult = await requireAuth("editor", slug);
    if (!authResult.success) return authResult.error;

    const { company } = authResult.data;

    // 2. OPTIMIZED: Verify document access
    const docAccessResult = await requireDocumentAccess(documentId, company.company.id);
    if (!docAccessResult.success) return docAccessResult.error!;

    // 3. OPTIMIZED: Fetch document with typed metadata
    const document = await getDocumentWithMetadata(documentId);
    if (!document) {
      return errorResponse("DOCUMENT_NOT_FOUND", "Document not found", 404);
    }

    const metadata = document.metadata;
    const analysis = metadata.analysis;

    if (!analysis || !analysis.sections) {
      return errorResponse(
        "NO_ANALYSIS",
        "No analysis found. Please run analysis first.",
        400
      );
    }

    // 4. Get validation data from request body
    const body = await request.json().catch(() => ({}));
    const {
      approvedSections = [],
      excludedSections = [],
      additionalInterests = "",
    } = body;

    // Validate section IDs
    const validSectionIds = new Set(analysis.sections.map((s: any) => s.id));
    const invalidApproved = approvedSections.filter((id: string) => !validSectionIds.has(id));
    const invalidExcluded = excludedSections.filter((id: string) => !validSectionIds.has(id));

    if (invalidApproved.length > 0 || invalidExcluded.length > 0) {
      return errorResponse(
        "INVALID_SECTION_IDS",
        "Invalid section IDs provided",
        400,
        { invalidApproved, invalidExcluded }
      );
    }

    console.log(
      `[filter] User validation: ${approvedSections.length} approved, ${excludedSections.length} excluded`
    );

    // 5. Apply user validation to override AI's shouldIndex flag
    const hasUserValidation = approvedSections.length > 0 || excludedSections.length > 0;

    const sectionsWithUserValidation = analysis.sections.map((section: any) => {
      if (hasUserValidation) {
        // User validation overrides AI decision
        const isApproved = approvedSections.includes(section.id);
        const isExcluded = excludedSections.includes(section.id);
        return {
          ...section,
          shouldIndex: isApproved && !isExcluded,
          userValidated: true,
        };
      } else {
        return {
          ...section,
          userValidated: false,
        };
      }
    });

    // 6. Separate kept vs rejected sections
    const keptSections = sectionsWithUserValidation.filter((s: any) => s.shouldIndex);
    const rejectedSections = sectionsWithUserValidation.filter((s: any) => !s.shouldIndex);

    console.log(
      `[filter] Document ${documentId}: ${keptSections.length} kept, ${rejectedSections.length} rejected`
    );

    // 7. OPTIMIZED: Single update with filtering results
    await db
      .update(documents)
      .set({
        metadata: {
          ...metadata,
          analysis: {
            ...analysis,
            sections: sectionsWithUserValidation,
            filteringComplete: true,
            filteredAt: new Date().toISOString(),
          },
          userValidation: hasUserValidation
            ? {
                approvedSections,
                excludedSections,
                additionalInterests,
                validatedAt: new Date().toISOString(),
              }
            : undefined,
          keptSectionIds: keptSections.map((s: any) => s.id),
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 8. Return filtering results
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
    return errorResponse(
      "FILTERING_FAILED",
      "Failed to filter document sections",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
