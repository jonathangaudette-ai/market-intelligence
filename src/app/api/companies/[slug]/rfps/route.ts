import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { auth } from '@/lib/auth/config';
import { eq, and, desc } from 'drizzle-orm';

/**
 * POST /api/companies/[slug]/rfps
 * Upload a new RFP document (slug-based, no cookies)
 */
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

    // 3. Check permission to create RFPs (editor or admin)
    const roleHierarchy: Record<string, number> = { admin: 3, editor: 2, viewer: 1 };
    if (roleHierarchy[role] < roleHierarchy['editor']) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 4. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const clientName = formData.get('clientName') as string | null;
    const clientIndustry = formData.get('clientIndustry') as string | null;
    const submissionDeadline = formData.get('submissionDeadline') as string | null;
    const estimatedDealValue = formData.get('estimatedDealValue') as string | null;

    // 5. Validation
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!title || !clientName) {
      return NextResponse.json(
        { error: 'Title and client name are required' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported. Please upload PDF, DOCX, or XLSX.' },
        { status: 400 }
      );
    }

    // Determine file type extension
    const fileTypeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
    };

    const fileType = fileTypeMap[file.type] || 'unknown';

    // 6. Upload file to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // 7. Create RFP record in database
    const [newRfp] = await db
      .insert(rfps)
      .values({
        title,
        clientName,
        clientIndustry: clientIndustry || null,
        originalFilename: file.name,
        originalFileUrl: blob.url,
        fileSizeBytes: file.size,
        fileType,
        parsingStatus: 'pending',
        submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null,
        estimatedDealValue: estimatedDealValue ? parseInt(estimatedDealValue, 10) : null,
        status: 'draft',
        completionPercentage: 0,
        ownerId: userId,
        companyId: company.id,
      })
      .returning();

    return NextResponse.json(
      {
        rfp: {
          id: newRfp.id,
          title: newRfp.title,
          clientName: newRfp.clientName,
          status: newRfp.status,
          parsingStatus: newRfp.parsingStatus,
          fileUrl: newRfp.originalFileUrl,
        },
        message: 'RFP uploaded successfully. Parsing will begin shortly.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[RFP Upload Error]', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = process.env.NODE_ENV === 'development'
      ? { stack: error instanceof Error ? error.stack : undefined }
      : {};

    return NextResponse.json(
      {
        error: 'Failed to upload RFP. Please try again.',
        details: errorMessage,
        ...errorDetails
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companies/[slug]/rfps
 * Get list of RFPs for the company (slug-based, no cookies)
 */
export async function GET(
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

    const { company } = companyContext;

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as string | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // 4. Build where conditions
    const whereConditions = [eq(rfps.companyId, company.id)];

    if (status) {
      whereConditions.push(eq(rfps.status, status));
    }

    // 5. Query database
    const results = await db
      .select({
        id: rfps.id,
        title: rfps.title,
        clientName: rfps.clientName,
        clientIndustry: rfps.clientIndustry,
        status: rfps.status,
        parsingStatus: rfps.parsingStatus,
        completionPercentage: rfps.completionPercentage,
        submissionDeadline: rfps.submissionDeadline,
        createdAt: rfps.createdAt,
        updatedAt: rfps.updatedAt,
      })
      .from(rfps)
      .where(and(...whereConditions))
      .orderBy(desc(rfps.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      rfps: results,
      pagination: {
        page,
        limit,
        total: results.length,
      },
    });
  } catch (error) {
    console.error('[RFP List Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch RFPs' },
      { status: 500 }
    );
  }
}
