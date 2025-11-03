import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";
import { db } from "@/db";
import { documents, competitors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";

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

    // 6. Upload file to Vercel Blob Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = await put(`documents/${currentCompany.company.id}/${Date.now()}-${file.name}`, buffer, {
      access: 'public',
      contentType: file.type,
    });

    // 7. Create document record with blob URL
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
          blobUrl: blob.url, // Store blob URL for later processing
        },
      })
      .returning();

    return NextResponse.json({
      documentId: document.id,
      name: file.name,
      fileSize: file.size,
      status: "uploaded",
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
