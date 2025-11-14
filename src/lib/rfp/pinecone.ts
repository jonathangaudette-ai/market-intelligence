import { Pinecone } from '@pinecone-database/pinecone';

// Lazy initialization to avoid connecting during build time
let _pinecone: Pinecone | null = null;

function getPinecone() {
  if (!_pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not set');
    }
    _pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return _pinecone;
}

/**
 * Get the Pinecone index for the market intelligence platform
 * The index is shared across all modules using different namespaces
 */
export function getPineconeIndex() {
  const pinecone = getPinecone();
  const indexName = process.env.PINECONE_INDEX || 'market-intelligence';
  return pinecone.index(indexName);
}

/**
 * Get the RFP-specific namespace in the shared Pinecone index
 * This namespace is used to store:
 * - Company knowledge base documents
 * - Past RFP responses
 * - Product documentation
 * - Reusable answer library
 */
export function getRFPNamespace() {
  const index = getPineconeIndex();
  return index.namespace('rfp-library');
}

/**
 * Get namespace for a specific RFP's context
 * This allows for RFP-specific embeddings if needed
 */
export function getRFPContextNamespace(rfpId: string) {
  const index = getPineconeIndex();
  return index.namespace(`rfp-context-${rfpId}`);
}

/**
 * Metadata structure for RFP library vectors
 * Updated for Support Docs RAG v4.0 (Phase 0.5)
 */
export interface RFPVectorMetadata {
  // Core fields
  documentId: string;
  tenant_id: string; // Multi-tenant isolation (renamed from companyId for consistency)
  documentType: 'company_info' | 'product_doc' | 'past_rfp' | 'answer_library' | 'competitive_intel' | 'rfp_content';
  text: string;
  source?: string;
  createdAt: string;

  // NEW: Support Docs RAG v4 fields
  documentPurpose?: 'rfp_support' | 'rfp_response' | 'company_info'; // Purpose classification
  contentType?: string; // Specific type: methodology_guide, case_study, technical_spec, etc.
  contentTypeTags?: string[]; // Array of tags for categorization
  isHistoricalRfp?: boolean; // True for historical RFP responses
  category?: string; // RFP category for matching

  // Optional fields for answer library
  questionCategory?: string;
  questionTags?: string[];
  responseQuality?: number; // 1-5 rating
  timesUsed?: number;

  // Optional fields for past RFPs
  rfpId?: string;
  rfpTitle?: string;
  clientName?: string;
  wonLost?: 'won' | 'lost';

  // Optional fields for competitive intel
  competitor?: string;

  // Surgical Retrieval System fields
  rfpOutcome?: 'won' | 'lost' | 'pending'; // Outcome of the RFP
  qualityScore?: number; // 0-100 quality score
  outcomeScore?: number; // Normalized outcome score (0-1)
  industry?: string; // Client industry
  submittedAt?: string; // Submission date
  chunkIndex?: number; // Index of chunk within document
  lastUsedAt?: string; // Last time used as source

  // Flexible additional metadata
  [key: string]: any;
}

/**
 * Index RFP content with enriched metadata (Surgical Retrieval System)
 *
 * This function indexes RFP content chunks into Pinecone with full metadata
 * for the surgical retrieval system.
 */
export async function indexRfpContent(
  rfpId: string,
  chunks: Array<{ text: string; contentType?: string }>,
  metadata: {
    companyId: string;
    isHistorical: boolean;
    rfpOutcome?: string;
    qualityScore?: number;
    industry?: string;
    submittedAt?: string;
    rfpTitle?: string;
    clientName?: string;
  }
): Promise<number> {
  const { generateEmbedding } = await import('./ai/embeddings');
  const namespace = getRFPNamespace();

  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i].text);

    vectors.push({
      id: `${rfpId}-chunk-${i}`,
      values: embedding,
      metadata: {
        documentId: rfpId,
        tenant_id: metadata.companyId, // Use tenant_id for consistency
        rfpId,
        documentType: 'rfp_content',
        documentPurpose: metadata.isHistorical ? 'rfp_response' : undefined,
        text: chunks[i].text,
        contentType: chunks[i].contentType,
        isHistoricalRfp: metadata.isHistorical,
        rfpOutcome: metadata.rfpOutcome,
        qualityScore: metadata.qualityScore,
        industry: metadata.industry,
        submittedAt: metadata.submittedAt,
        rfpTitle: metadata.rfpTitle,
        clientName: metadata.clientName,
        chunkIndex: i,
        createdAt: new Date().toISOString(),
        source: `rfp-${rfpId}`
      } as RFPVectorMetadata
    });
  }

  // Batch upsert to Pinecone
  await namespace.upsert(vectors);

  console.log(`[Pinecone] Indexed ${vectors.length} chunks for RFP ${rfpId}`);

  return vectors.length;
}

/**
 * Query by content type with enriched filters (Surgical Retrieval System)
 */
export async function queryByContentType(
  embedding: number[],
  filters: {
    companyId: string;
    contentType: string;
    onlyWon?: boolean;
    minQualityScore?: number;
    excludeRfpIds?: string[];
  }
): Promise<any> {
  const namespace = getRFPNamespace();

  const filter: any = {
    tenant_id: { $eq: filters.companyId }, // Use tenant_id with $eq operator
    contentType: { $eq: filters.contentType }, // Use $eq for consistency
    isHistoricalRfp: { $eq: true } // Updated field name
  };

  if (filters.onlyWon) {
    filter.rfpOutcome = { $eq: 'won' };
  }

  if (filters.minQualityScore) {
    filter.qualityScore = { $gte: filters.minQualityScore };
  }

  if (filters.excludeRfpIds && filters.excludeRfpIds.length > 0) {
    filter.rfpId = { $nin: filters.excludeRfpIds };
  }

  return await namespace.query({
    vector: embedding,
    filter,
    topK: 5,
    includeMetadata: true
  });
}

/**
 * Delete RFP content from Pinecone
 * This is used when an RFP or its responses are deleted
 */
export async function deleteRfpContent(rfpId: string): Promise<void> {
  const namespace = getRFPNamespace();

  try {
    // Delete all vectors for this RFP by filtering on rfpId metadata
    // Pinecone doesn't support bulk delete by metadata, so we need to delete by ID pattern
    // Since we use pattern: ${rfpId}-chunk-${i}, we need to fetch and delete all matching IDs

    // Query all vectors for this RFP
    const queryResult = await namespace.query({
      vector: Array(1536).fill(0), // Dummy vector
      filter: { rfpId },
      topK: 10000, // Max to get all vectors for this RFP
      includeMetadata: false,
    });

    if (queryResult.matches && queryResult.matches.length > 0) {
      const vectorIds = queryResult.matches.map((match) => match.id);

      // Delete in batches of 100 (Pinecone limit)
      const batchSize = 100;
      for (let i = 0; i < vectorIds.length; i += batchSize) {
        const batch = vectorIds.slice(i, i + batchSize);
        await namespace.deleteMany(batch);
      }

      console.log(`[Pinecone] Deleted ${vectorIds.length} vectors for RFP ${rfpId}`);
    } else {
      console.log(`[Pinecone] No vectors found for RFP ${rfpId}`);
    }
  } catch (error) {
    console.error(`[Pinecone] Error deleting vectors for RFP ${rfpId}:`, error);
    throw error;
  }
}

/**
 * Delete specific response chunks from Pinecone
 * This is used when a specific response is deleted but the RFP remains
 */
export async function deleteResponseContent(
  rfpId: string,
  questionId: string
): Promise<void> {
  const namespace = getRFPNamespace();

  try {
    // Query vectors for this specific question/response
    // We filter by rfpId and look for vectors that match this question
    const queryResult = await namespace.query({
      vector: Array(1536).fill(0), // Dummy vector
      filter: {
        rfpId,
        questionId, // Assuming we store questionId in metadata
      },
      topK: 1000,
      includeMetadata: false,
    });

    if (queryResult.matches && queryResult.matches.length > 0) {
      const vectorIds = queryResult.matches.map((match) => match.id);
      await namespace.deleteMany(vectorIds);

      console.log(
        `[Pinecone] Deleted ${vectorIds.length} vectors for question ${questionId} in RFP ${rfpId}`
      );
    } else {
      console.log(
        `[Pinecone] No vectors found for question ${questionId} in RFP ${rfpId}`
      );
    }
  } catch (error) {
    console.error(
      `[Pinecone] Error deleting vectors for question ${questionId}:`,
      error
    );
    // Don't throw - we want to continue even if Pinecone deletion fails
    console.warn('[Pinecone] Continuing despite Pinecone deletion error');
  }
}

/**
 * Test Pinecone connection and namespace access
 */
export async function testPineconeConnection(): Promise<boolean> {
  try {
    const namespace = getRFPNamespace();

    // Try to query the namespace (this will work even if empty)
    const result = await namespace.query({
      vector: Array(1536).fill(0), // Dummy vector for text-embedding-3-small
      topK: 1,
      includeMetadata: false,
    });

    console.log('✅ Pinecone connection successful');
    console.log(`📊 Index: ${process.env.PINECONE_INDEX || 'market-intelligence'}`);
    console.log(`📁 Namespace: rfp-library`);

    return true;
  } catch (error) {
    console.error('❌ Pinecone connection failed:', error);
    return false;
  }
}
