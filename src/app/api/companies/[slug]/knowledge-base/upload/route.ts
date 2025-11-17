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
import { z } from 'zod';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/middleware';
import { put } from '@vercel/blob';
import { analyzeDocument } from '@/lib/rfp/services/document-analysis.service';
import { generateEmbeddings } from '@/lib/rfp/ai/embeddings';
import { getRFPNamespace } from '@/lib/rfp/pinecone';

// Allow long execution time for document analysis and embedding creation (5 minutes)
// This is especially important for larger documents (PDFs >1MB)
export const maxDuration = 300;

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
 * POST /api/companies/[slug]/knowledge-base/upload
 *
 * Upload a support document to the knowledge base with real-time streaming progress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1. Extract slug from params
    const { slug } = await params;
    console.log('[KnowledgeBaseUpload] POST Request - Slug:', slug);

    // 2. Authentication with slug verification
    const authResult = await requireAuth('viewer', slug);
    console.log('[KnowledgeBaseUpload] Auth result:', authResult.success ? 'SUCCESS' : 'FAILED');
    if (!authResult.success) {
      console.error('[KnowledgeBaseUpload] Auth failed, returning error');
      return authResult.error;
    }

    const { company, session } = authResult.data;
    const companyId = company.company.id;
    console.log('[KnowledgeBaseUpload] Company ID:', companyId);

    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentPurpose = formData.get('documentPurpose') as string | null;
    const documentType = formData.get('documentType') as string | null;
    const isHistoricalRfp = formData.get('isHistoricalRfp') === 'true';
    const rfpOutcome = formData.get('rfpOutcome') as string | null;
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
        documentType: documentType || undefined,
        sourceUrl: blob.url,
        status: 'pending',
        documentPurpose: (documentPurpose as any) || 'rfp_support',
        contentType: contentType || undefined,
        contentTypeTags: tags.length > 0 ? tags : undefined,
        isHistoricalRfp: isHistoricalRfp || false,
        uploadedBy: session!.user.id as string,
        metadata: {
          blobUrl: blob.url,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          rfpOutcome: rfpOutcome || undefined,
        },
      })
      .returning();

    console.log(`[KnowledgeBaseUpload] Created document record: ${document.id}`);

    // 7. Setup SSE (Server-Sent Events) for real-time progress
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper to send SSE event
    const sendEvent = async (data: any) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    // 8. Process document with real-time events
    (async () => {
      try {
        await processDocumentWithEvents(
          document.id,
          blob.url,
          file.name,
          sendEvent
        );
      } catch (error) {
        console.error('[KnowledgeBaseUpload] Processing error:', error);
        await sendEvent({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        await writer.close();
      }
    })();

    // 9. Return SSE response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
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
 * Process document with real-time SSE events
 *
 * This function:
 * 1. Fetches the document from Blob storage
 * 2. Extracts text (with progress events)
 * 3. Runs Claude analysis (with progress events)
 * 4. Creates embeddings (with progress events)
 * 5. Indexes in Pinecone (with progress events)
 */
async function processDocumentWithEvents(
  documentId: string,
  blobUrl: string,
  filename: string,
  sendEvent: (data: any) => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  console.log(`[DocumentAnalysis] Starting analysis for ${documentId}`);

  try {
    // Emit upload_complete event
    await sendEvent({
      type: 'upload_complete',
      documentId,
      blobUrl,
    });

    // Update status to processing
    await db
      .update(documents)
      .set({
        status: 'processing',
        metadata: {
          analysisStartedAt: new Date().toISOString(),
        },
      })
      .where(eq(documents.id, documentId));

    // STEP 1: Extract text
    await sendEvent({ type: 'step_start', step: 'extracting' });

    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const text = await extractText(buffer, filename);

    console.log(`[DocumentAnalysis] Extracted ${text.length} characters from ${filename}`);

    const wordCount = text.split(/\s+/).length;
    const pageCount = Math.ceil(text.length / 3000);

    await sendEvent({
      type: 'step_complete',
      step: 'extracting',
      result: {
        textLength: text.length,
        pageCount,
        wordCount,
      },
    });

    // STEP 2: Analyze with Claude
    await sendEvent({
      type: 'step_start',
      step: 'analyzing',
      model: 'claude-haiku-4-5-20251001',
    });

    const analysis = await analyzeDocument(text, filename, {
      useCache: true,
      retryWithSonnet: true,
    });

    console.log(`[DocumentAnalysis] Analysis complete: ${analysis.documentType} (${analysis.confidence})`);

    await sendEvent({
      type: 'step_complete',
      step: 'analyzing',
      result: {
        documentType: analysis.documentType,
        confidence: analysis.confidence,
      },
    });

    // Read current document to preserve user-selected values
    const [currentDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    const finalDocumentPurpose = currentDoc?.documentPurpose || analysis.recommendedPurpose;
    const finalContentType = currentDoc?.contentType || analysis.documentType;
    const finalContentTypeTags = currentDoc?.contentTypeTags || analysis.contentTypeTags;

    // Update document with analysis results
    await db
      .update(documents)
      .set({
        status: 'processing',
        documentPurpose: finalDocumentPurpose as any,
        contentType: finalContentType,
        contentTypeTags: finalContentTypeTags,
        analysisCompleted: true,
        analysisConfidence: Math.round(analysis.confidence * 100),
        metadata: {
          blobUrl,
          extractedText: text,
          pageCount,
          wordCount,
          extractedAt: new Date().toISOString(),
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

    // STEP 3: Create embeddings and index in Pinecone
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (doc) {
      await createDocumentEmbeddingsWithEvents(
        documentId,
        doc.companyId,
        text,
        filename,
        analysis,
        sendEvent
      );

      // Mark document as completed
      await db
        .update(documents)
        .set({
          status: 'completed',
        })
        .where(eq(documents.id, documentId));

      console.log(`[DocumentAnalysis] Document ${documentId} completed successfully`);

      // Emit completion event
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      await sendEvent({
        type: 'complete',
        documentId,
        totalTime,
      });
    }

  } catch (error) {
    console.error(`[DocumentAnalysis] Error processing ${documentId}:`, error);

    // Update status to failed
    await db
      .update(documents)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(documents.id, documentId));

    // Emit error event
    await sendEvent({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Extract text from document buffer
 */
async function extractText(buffer: ArrayBuffer, filename: string): Promise<string> {
  const extension = filename.split('.').pop()?.toLowerCase();

  // Plain text
  if (extension === 'txt') {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  }

  // PDF extraction
  if (extension === 'pdf') {
    try {
      // Dynamic import to avoid bundling issues
      const pdfParse = (await import('pdf-parse')).default;
      const pdfBuffer = Buffer.from(buffer);
      const data = await pdfParse(pdfBuffer);

      console.log(`[ExtractText] PDF extracted: ${data.numpages} pages, ${data.text.length} chars`);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error('PDF contains no extractable text');
      }

      return data.text;
    } catch (error) {
      console.error('[ExtractText] PDF parsing failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // DOCX/DOC - Not implemented yet
  if (extension === 'docx' || extension === 'doc') {
    throw new Error('DOCX/DOC parsing not yet implemented. Please convert to PDF or TXT.');
  }

  throw new Error(`Unsupported file type: ${extension}`);
}

/**
 * Create embeddings for a support document and index in Pinecone with real-time events
 */
async function createDocumentEmbeddingsWithEvents(
  documentId: string,
  companyId: string,
  text: string,
  filename: string,
  analysis: {
    documentType: string;
    recommendedPurpose: 'rfp_support' | 'rfp_response' | 'company_info';
    contentTypeTags: string[];
    suggestedCategories: Array<{ category: string; confidence: number }>;
  },
  sendEvent: (data: any) => Promise<void>
): Promise<void> {
  console.log(`[CreateEmbeddings] Starting embedding creation for ${documentId}`);

  try {
    // Fetch document from DB to get REAL metadata
    const [dbDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!dbDoc) {
      throw new Error(`Document ${documentId} not found in database`);
    }

    const realDocumentPurpose = dbDoc.documentPurpose || analysis.recommendedPurpose;
    const realDocumentType = dbDoc.documentType || 'rfp_support_doc';
    const realIsHistoricalRfp = dbDoc.isHistoricalRfp || false;
    const realRfpOutcome = (dbDoc.metadata as any)?.rfpOutcome;

    // Chunk the text
    const chunks = chunkText(text, 1000, 200);
    console.log(`[CreateEmbeddings] Created ${chunks.length} chunks`);

    // STEP 3: Generate embeddings
    await sendEvent({
      type: 'step_start',
      step: 'embedding',
      chunkCount: chunks.length,
    });

    const chunkTexts = chunks.map(c => c.text);

    // Generate embeddings in batches with progress updates
    const embeddings: number[][] = [];
    const embeddingBatchSize = 10;

    for (let i = 0; i < chunkTexts.length; i += embeddingBatchSize) {
      const batch = chunkTexts.slice(i, i + embeddingBatchSize);
      const batchEmbeddings = await generateEmbeddings(batch);
      embeddings.push(...batchEmbeddings);

      const progress = Math.min(Math.round(((i + embeddingBatchSize) / chunkTexts.length) * 100), 100);
      await sendEvent({
        type: 'step_progress',
        step: 'embedding',
        progress,
        current: Math.min(i + embeddingBatchSize, chunkTexts.length),
        total: chunkTexts.length,
      });
    }

    console.log(`[CreateEmbeddings] Generated ${embeddings.length} embeddings`);

    await sendEvent({
      type: 'step_complete',
      step: 'embedding',
      result: {
        embeddingCount: embeddings.length,
      },
    });

    // STEP 4: Index in Pinecone
    const namespace = getRFPNamespace();
    const primaryCategory = analysis.suggestedCategories[0]?.category || 'general';

    const vectors = chunks.map((chunk, idx) => ({
      id: `${documentId}-chunk-${idx}`,
      values: embeddings[idx],
      metadata: {
        documentId,
        tenant_id: companyId,
        documentType: realDocumentType,
        documentPurpose: realDocumentPurpose,
        isHistoricalRfp: realIsHistoricalRfp,
        ...(realRfpOutcome && { rfpOutcome: realRfpOutcome }),
        contentType: analysis.documentType,
        contentTypeTags: [primaryCategory, 'general', ...analysis.contentTypeTags],
        text: chunk.text,
        title: filename,
        category: primaryCategory,
        chunkIndex: idx,
        totalChunks: chunks.length,
        startChar: chunk.start,
        endChar: chunk.end,
        createdAt: new Date().toISOString(),
      } as Record<string, any>,
    }));

    await sendEvent({
      type: 'step_start',
      step: 'indexing',
      vectorCount: vectors.length,
    });

    // Upsert to Pinecone in batches with progress
    const pineBatchSize = 100;
    for (let i = 0; i < vectors.length; i += pineBatchSize) {
      const batch = vectors.slice(i, i + pineBatchSize);
      await namespace.upsert(batch);

      const progress = Math.min(Math.round(((i + pineBatchSize) / vectors.length) * 100), 100);
      await sendEvent({
        type: 'step_progress',
        step: 'indexing',
        progress,
        current: Math.min(i + pineBatchSize, vectors.length),
        total: vectors.length,
      });

      console.log(`[CreateEmbeddings] Indexed batch ${i / pineBatchSize + 1} (${batch.length} vectors)`);
    }

    await sendEvent({
      type: 'step_complete',
      step: 'indexing',
    });

    console.log(`[CreateEmbeddings] Successfully indexed ${vectors.length} chunks for ${documentId}`);

    // Update document metadata
    const [currentDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (currentDoc) {
      const currentMetadata = currentDoc.metadata as any || {};

      await db
        .update(documents)
        .set({
          totalChunks: chunks.length,
          vectorsCreated: true,
          metadata: {
            ...currentMetadata,
            chunks: chunks.map((chunk, idx) => ({
              chunkId: `${documentId}-chunk-${idx}`,
              startIndex: chunk.start,
              endIndex: chunk.end,
              content: chunk.text,
              tokens: Math.ceil(chunk.text.length / 4),
            })),
            chunkedAt: new Date().toISOString(),
            embeddedAt: new Date().toISOString(),
            vectorsCreated: chunks.length,
            embeddingModel: 'text-embedding-3-small',
          },
        })
        .where(eq(documents.id, documentId));

      console.log(`[CreateEmbeddings] Saved ${chunks.length} chunks to database for ${documentId}`);
    }

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
 * GET /api/companies/[slug]/knowledge-base/upload
 *
 * DEPRECATED: This endpoint is no longer needed since we use SSE streaming.
 * Kept for backward compatibility but will be removed in future version.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await requireAuth('viewer', slug);
    if (!authResult.success) return authResult.error;

    const { company } = authResult.data;
    const companyId = company.company.id;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.companyId !== companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
