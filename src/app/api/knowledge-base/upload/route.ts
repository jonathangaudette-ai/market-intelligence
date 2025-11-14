/**
 * Knowledge Base Upload API
 * Phase 1 - Day 5 - Support Docs RAG v4.0
 *
 * This endpoint handles:
 * 1. File upload (PDF, DOCX, TXT) with validation
 * 2. Vercel Blob storage
 * 3. Database record creation
 * 4. Async document analysis trigger
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@/db/drizzle';
import { documents, companyMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { analyzeDocument } from '@/lib/rfp/services/document-analysis.service';
import { generateEmbeddings } from '@/lib/rfp/ai/embeddings';
import { getRFPNamespace } from '@/lib/rfp/pinecone';

/**
 * Upload schema validation
 */
const uploadSchema = z.object({
  file: z.custom<File>((val) => val instanceof File, 'Must be a file'),
  documentPurpose: z
    .enum(['rfp_support', 'rfp_response', 'company_info'])
    .default('rfp_support'),
  contentType: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Allowed file types
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/msword', // DOC
  'text/plain',
] as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/knowledge-base/upload
 *
 * Upload a support document to the knowledge base
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's company
    const userCompany = await db.query.companyMembers.findFirst({
      where: eq(companyMembers.userId, session.user.id as string),
      with: {
        company: true,
      },
    });

    if (!userCompany?.company) {
      return NextResponse.json(
        { error: 'No company associated with user' },
        { status: 403 }
      );
    }

    const companyId = userCompany.company.id;

    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentPurpose = formData.get('documentPurpose') as string | null;
    const contentType = formData.get('contentType') as string | null;
    const tagsString = formData.get('tags') as string | null;
    const tags = tagsString ? JSON.parse(tagsString) : [];

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 4. Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    console.log(
      `[KnowledgeBaseUpload] Uploading ${file.name} for company ${companyId}`
    );

    // 5. Upload to Vercel Blob
    const blob = await put(`companies/${companyId}/support-docs/${crypto.randomUUID()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log(`[KnowledgeBaseUpload] Uploaded to blob: ${blob.url}`);

    // 6. Create document record
    const [document] = await db
      .insert(documents)
      .values({
        companyId,
        name: file.name,
        type: file.type,
        sourceUrl: blob.url,
        status: 'pending', // Will be updated after analysis
        documentPurpose: (documentPurpose as any) || 'rfp_support',
        contentType: contentType || undefined,
        contentTypeTags: tags.length > 0 ? tags : undefined,
        isHistoricalRfp: false,
        uploadedBy: session.user.id as string,
        metadata: {
          blobUrl: blob.url,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      })
      .returning();

    console.log(`[KnowledgeBaseUpload] Created document record: ${document.id}`);

    // 7. Trigger async analysis (don't wait for completion)
    triggerDocumentAnalysis(document.id, blob.url, file.name).catch((error) => {
      console.error(
        `[KnowledgeBaseUpload] Async analysis failed for ${document.id}:`,
        error
      );
    });

    // 8. Return success response
    return NextResponse.json(
      {
        documentId: document.id,
        name: file.name,
        status: 'pending',
        message: 'Document uploaded successfully. Analysis in progress.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[KnowledgeBaseUpload] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Validate uploaded file
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: PDF, DOCX, DOC, TXT`,
    };
  }

  // Check file name
  if (!file.name || file.name.trim() === '') {
    return {
      valid: false,
      error: 'File name is required',
    };
  }

  return { valid: true };
}

/**
 * Trigger async document analysis
 *
 * This function:
 * 1. Fetches the document from Blob storage
 * 2. Extracts text (using appropriate parser for file type)
 * 3. Runs Claude analysis
 * 4. Updates database with results
 * 5. Triggers embedding creation
 */
async function triggerDocumentAnalysis(
  documentId: string,
  blobUrl: string,
  filename: string
): Promise<void> {
  console.log(`[DocumentAnalysis] Starting analysis for ${documentId}`);

  try {
    // 1. Update status to processing
    await db
      .update(documents)
      .set({
        status: 'processing',
        metadata: {
          analysisStartedAt: new Date().toISOString(),
        },
      })
      .where(eq(documents.id, documentId));

    // 2. Fetch document from blob
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    // 3. Extract text (simplified - in production use proper PDF/DOCX parsers)
    const text = await extractText(buffer, filename);

    console.log(
      `[DocumentAnalysis] Extracted ${text.length} characters from ${filename}`
    );

    // 4. Analyze with Claude
    const analysis = await analyzeDocument(text, filename, {
      useCache: true,
      retryWithSonnet: true,
    });

    console.log(
      `[DocumentAnalysis] Analysis complete: ${analysis.documentType} (${analysis.confidence})`
    );

    // 5. Update document with analysis results
    await db
      .update(documents)
      .set({
        status: 'completed',
        documentPurpose: analysis.recommendedPurpose,
        contentType: analysis.documentType,
        contentTypeTags: analysis.contentTypeTags,
        analysisCompleted: true,
        analysisConfidence: Math.round(analysis.confidence * 100),
        metadata: {
          blobUrl,
          analysis: {
            documentType: analysis.documentType,
            confidence: analysis.confidence,
            suggestedCategories: analysis.suggestedCategories,
            executiveSummary: analysis.executiveSummary,
            analyzedAt: new Date().toISOString(),
          },
        },
      })
      .where(eq(documents.id, documentId));

    console.log(
      `[DocumentAnalysis] Document ${documentId} analysis saved to database`
    );

    // 6. Create embeddings and index in Pinecone (Phase 1 Day 6-7)
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (doc) {
      await createDocumentEmbeddings(
        documentId,
        doc.companyId,
        text,
        filename,
        analysis
      );
    }

  } catch (error) {
    console.error(`[DocumentAnalysis] Error analyzing ${documentId}:`, error);

    // Update status to failed
    await db
      .update(documents)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(documents.id, documentId));
  }
}

/**
 * Extract text from document buffer
 * TODO: Implement proper PDF/DOCX parsing in production
 */
async function extractText(buffer: ArrayBuffer, filename: string): Promise<string> {
  // For now, return a placeholder
  // In production, use libraries like:
  // - pdf-parse for PDF
  // - mammoth for DOCX
  // - For plain text, use TextDecoder

  const extension = filename.split('.').pop()?.toLowerCase();

  if (extension === 'txt') {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  }

  // For PDF/DOCX, would normally use proper parsers
  // For this POC, return placeholder
  return `[Text extracted from ${filename} - ${buffer.byteLength} bytes]\n\n(PDF/DOCX parsing to be implemented)`;
}

/**
 * Create embeddings for a support document and index in Pinecone
 * Phase 1 Day 6-7 - Support Docs RAG v4.0
 */
async function createDocumentEmbeddings(
  documentId: string,
  companyId: string,
  text: string,
  filename: string,
  analysis: {
    documentType: string;
    recommendedPurpose: 'rfp_support' | 'rfp_response' | 'company_info';
    contentTypeTags: string[];
    suggestedCategories: Array<{ category: string; confidence: number }>;
  }
): Promise<void> {
  console.log(`[CreateEmbeddings] Starting embedding creation for ${documentId}`);

  try {
    // 1. Chunk the text into smaller pieces (~1000 characters with overlap)
    const chunks = chunkText(text, 1000, 200);
    console.log(`[CreateEmbeddings] Created ${chunks.length} chunks`);

    // 2. Generate embeddings for all chunks
    const chunkTexts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddings(chunkTexts);
    console.log(`[CreateEmbeddings] Generated ${embeddings.length} embeddings`);

    // 3. Prepare vectors for Pinecone
    const namespace = getRFPNamespace();
    const primaryCategory = analysis.suggestedCategories[0]?.category || 'general';

    const vectors = chunks.map((chunk, idx) => ({
      id: `${documentId}-chunk-${idx}`,
      values: embeddings[idx],
      metadata: {
        // Core identifiers
        documentId,
        tenant_id: companyId,
        documentType: 'rfp_support_doc',

        // Support Docs RAG v4.0 fields
        documentPurpose: analysis.recommendedPurpose,
        contentType: analysis.documentType,
        // Add primary category and 'general' to ensure it's found by DualQueryEngine
        contentTypeTags: [primaryCategory, 'general', ...analysis.contentTypeTags],
        isHistoricalRfp: false,

        // Content
        text: chunk.text,
        title: filename,
        category: primaryCategory,

        // Metadata
        chunkIndex: idx,
        totalChunks: chunks.length,
        startChar: chunk.start,
        endChar: chunk.end,
        createdAt: new Date().toISOString(),
      } as Record<string, any>,
    }));

    // 4. Upsert to Pinecone in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await namespace.upsert(batch);
      console.log(`[CreateEmbeddings] Indexed batch ${i / batchSize + 1} (${batch.length} vectors)`);
    }

    console.log(`[CreateEmbeddings] Successfully indexed ${vectors.length} chunks for ${documentId}`);
  } catch (error) {
    console.error(`[CreateEmbeddings] Error creating embeddings for ${documentId}:`, error);
    throw error;
  }
}

/**
 * Chunk text into overlapping pieces
 */
function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): Array<{ text: string; start: number; end: number }> {
  const chunks: Array<{ text: string; start: number; end: number }> = [];

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunkText = text.slice(start, end);

    chunks.push({
      text: chunkText,
      start,
      end,
    });

    // Move forward by (chunkSize - overlap) to create overlapping chunks
    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * GET /api/knowledge-base/upload
 *
 * Get upload status for a specific document
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: document.id,
      name: document.name,
      status: document.status,
      documentPurpose: document.documentPurpose,
      contentType: document.contentType,
      contentTypeTags: document.contentTypeTags,
      analysisCompleted: document.analysisCompleted,
      analysisConfidence: document.analysisConfidence,
      metadata: document.metadata,
    });
  } catch (error) {
    console.error('[KnowledgeBaseUpload] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get document status' },
      { status: 500 }
    );
  }
}
