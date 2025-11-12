/**
 * POST /api/companies/[slug]/rfps/import-historical
 *
 * Import a historical RFP with its submitted response for use as a content source
 * in the surgical retrieval system.
 *
 * Accepts:
 * - rfpPdf: The original RFP document
 * - responsePdf: The submitted response document
 * - metadata: JSON string with RFP metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { importHistoricalRfp } from '@/lib/rfp/historical-import';

// Allow long execution time for import process (10 minutes)
export const maxDuration = 600;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get company by slug and verify access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    const { company, role, userId } = companyContext;

    // 3. Check permission (editor or admin required)
    const roleHierarchy: Record<string, number> = { admin: 3, editor: 2, viewer: 1 };
    if (roleHierarchy[role] < roleHierarchy['editor']) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Editor or admin role required.' },
        { status: 403 }
      );
    }

    // 4. Parse multipart form data
    const formData = await request.formData();
    const rfpPdf = formData.get('rfpPdf') as File | null;
    const responsePdf = formData.get('responsePdf') as File | null;
    const metadataStr = formData.get('metadata') as string | null;

    // 5. Validation
    if (!rfpPdf || !responsePdf) {
      return NextResponse.json(
        { error: 'Both rfpPdf and responsePdf are required' },
        { status: 400 }
      );
    }

    if (!metadataStr) {
      return NextResponse.json(
        { error: 'Metadata is required' },
        { status: 400 }
      );
    }

    let metadata: any;
    try {
      metadata = JSON.parse(metadataStr);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid metadata JSON' },
        { status: 400 }
      );
    }

    // Validate metadata fields
    if (!metadata.title || !metadata.clientName || !metadata.industry || !metadata.submittedAt || !metadata.result) {
      return NextResponse.json(
        { error: 'Missing required metadata fields: title, clientName, industry, submittedAt, result' },
        { status: 400 }
      );
    }

    // Validate file sizes (100MB max each)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (rfpPdf.size > MAX_FILE_SIZE || responsePdf.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file types (PDF only)
    if (rfpPdf.type !== 'application/pdf' || responsePdf.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Both files must be PDF format' },
        { status: 400 }
      );
    }

    // 6. Import historical RFP
    console.log(`[Import Historical API] Starting import for company ${company.id}...`);

    const result = await importHistoricalRfp({
      rfpPdf,
      responsePdf,
      metadata: {
        ...metadata,
        submittedAt: new Date(metadata.submittedAt),
      },
      companyId: company.id,
      ownerId: userId,
    });

    console.log(`[Import Historical API] ✅ Import successful! RFP ID: ${result.rfpId}`);

    return NextResponse.json({
      success: true,
      rfpId: result.rfpId,
      autoAccepted: result.autoAccepted,
      needsReview: result.needsReview,
      message: result.needsReview
        ? `Import successful! ${result.autoAccepted} questions auto-accepted, ${result.needsReview.length} need manual review.`
        : `Import successful! All ${result.autoAccepted} questions auto-accepted.`
    });
  } catch (error) {
    console.error('[Import Historical API Error]', error);

    return NextResponse.json(
      {
        error: 'Failed to import historical RFP',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
