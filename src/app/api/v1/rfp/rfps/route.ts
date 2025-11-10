import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { requireRFPAuth } from '@/lib/rfp/auth';
import { eq, and, desc } from 'drizzle-orm';

/**
 * POST /api/v1/rfp/rfps
 * Upload a new RFP document
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const authResult = await requireRFPAuth();
    if (authResult.error) return authResult.error;

    const { user, company } = authResult;

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const clientName = formData.get('clientName') as string | null;
    const clientIndustry = formData.get('clientIndustry') as string | null;
    const submissionDeadline = formData.get('submissionDeadline') as string | null;
    const estimatedDealValue = formData.get('estimatedDealValue') as string | null;

    // 3. Validation
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
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
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

    // 4. Upload file to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // 5. Create RFP record in database
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
        ownerId: user.id,
        companyId: company.id,
      })
      .returning();

    // 6. TODO: Trigger async parsing job
    // This will be implemented with Inngest or similar
    // await triggerParsingJob(newRfp.id);

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
    return NextResponse.json(
      { error: 'Failed to upload RFP. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/rfp/rfps
 * Get list of RFPs for the current company
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const authResult = await requireRFPAuth();
    if (authResult.error) return authResult.error;

    const { company } = authResult;

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as string | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // 3. Build where conditions
    const whereConditions = [eq(rfps.companyId, company.id)];

    if (status) {
      whereConditions.push(eq(rfps.status, status));
    }

    // 4. Query database
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
