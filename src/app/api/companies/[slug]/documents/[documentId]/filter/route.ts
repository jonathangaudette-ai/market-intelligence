import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents } from "@/db/schema";
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

    // 5. Get analysis from metadata
    const metadata = document.metadata as any;
    const analysis = metadata?.analysis;

    if (!analysis || !analysis.sections) {
      return NextResponse.json(
        { error: "No analysis found. Please run analysis first." },
        { status: 400 }
      );
    }

    // 6. Get validation data from request body
    const body = await request.json().catch(() => ({}));
    const {
      approvedSections = [],
      excludedSections = [],
      additionalInterests = "",
    } = body;

    console.log(
      `[filter] User validation: ${approvedSections.length} approved, ${excludedSections.length} excluded`
    );

    // 7. Apply user validation to override AI's shouldIndex flag
    // If user provided validation data, use it; otherwise fall back to AI's shouldIndex
    const hasUserValidation = approvedSections.length > 0 || excludedSections.length > 0;

    const sectionsWithUserValidation = analysis.sections.map((section: any) => {
      if (hasUserValidation) {
        // User validation overrides AI decision
        const isApproved = approvedSections.includes(section.id);
        const isExcluded = excludedSections.includes(section.id);
        return {
          ...section,
          shouldIndex: isApproved && !isExcluded, // Keep if approved AND not excluded
          userValidated: true,
        };
      } else {
        // No user validation, use AI's decision
        return {
          ...section,
          userValidated: false,
        };
      }
    });

    // 8. Separate kept vs rejected sections
    const keptSections = sectionsWithUserValidation.filter((s: any) => s.shouldIndex);
    const rejectedSections = sectionsWithUserValidation.filter((s: any) => !s.shouldIndex);

    console.log(
      `[filter] Document ${documentId}: ${keptSections.length} kept, ${rejectedSections.length} rejected`
    );

    // 9. Update metadata with filtering results and user validation
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
          // Store user validation preferences
          userValidation: hasUserValidation
            ? {
                approvedSections,
                excludedSections,
                additionalInterests,
                validatedAt: new Date().toISOString(),
              }
            : undefined,
          // Store kept section IDs for later use in chunking
          keptSectionIds: keptSections.map((s: any) => s.id),
        },
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // 8. Return filtering results for UI display
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
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
