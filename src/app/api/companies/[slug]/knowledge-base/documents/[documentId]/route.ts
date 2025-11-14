/**
 * Knowledge Base Support Document Detail API
 * GET endpoint to retrieve full details of a support document
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/db';
import { documents, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseDocumentMetadata } from '@/lib/types/document-metadata';
import { formatRelativeTime, formatFileSize } from '@/lib/utils/formatting';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; documentId: string }> }
) {
  try {
    // 1. Extract params and verify authentication
    const { slug, documentId } = await params;

    const authResult = await requireAuth('viewer', slug);
    if (!authResult.success) return authResult.error;

    const { company } = authResult.data;

    // 2. Fetch document with user info
    const [result] = await db
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
        isHistoricalRfp: documents.isHistoricalRfp,
        processingSteps: documents.processingSteps,

        // User info
        uploadedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .where(eq(documents.id, documentId))
      .limit(1);

    // 3. Check if document exists
    if (!result) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // 4. Verify document belongs to the company
    const [ownershipCheck] = await db
      .select({ companyId: documents.companyId })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (ownershipCheck.companyId !== company.company.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to document' },
        { status: 403 }
      );
    }

    // 5. Parse metadata with type safety
    const metadata = parseDocumentMetadata(result.metadata);

    // 6. Format response
    const documentDetail = {
      // Basic info
      id: result.id,
      name: result.name,
      type: result.type as 'pdf' | 'website' | 'linkedin' | 'manual',
      status: result.status as 'completed' | 'processing' | 'failed' | 'pending',
      documentPurpose: result.documentPurpose as 'rfp_support' | 'rfp_response' | 'company_info' | null,
      contentType: result.contentType,
      contentTypeTags: result.contentTypeTags || [],

      // Analysis results
      analysisCompleted: result.analysisCompleted,
      analysisConfidence: result.analysisConfidence,
      analysis: metadata.analysis,

      // Extraction & indexing
      totalChunks: result.totalChunks || 0,
      vectorsCreated: result.vectorsCreated || false,
      pageCount: metadata.pageCount,
      wordCount: metadata.wordCount,
      extractedAt: metadata.extractedAt,

      // Chunks data
      chunks: metadata.chunks || [],
      extractedText: metadata.extractedText,

      // File access
      blobUrl: metadata.blobUrl,
      fileSize: metadata.fileSize,
      fileSizeFormatted: metadata.fileSize ? formatFileSize(metadata.fileSize) : null,

      // Processing
      processingSteps: result.processingSteps || [],
      errorMessage: result.errorMessage,

      // Metadata
      uploadedBy: result.uploadedBy,
      createdAt: result.createdAt,
      createdAtRelative: formatRelativeTime(result.createdAt),
      updatedAt: result.updatedAt,

      // Additional metadata
      isHistoricalRfp: result.isHistoricalRfp,
      sourceUrl: result.sourceUrl,
    };

    return NextResponse.json(documentDetail);
  } catch (error) {
    console.error('[Knowledge Base Document Detail] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch document details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
