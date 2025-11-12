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
 */
export interface RFPVectorMetadata {
  documentId: string;
  companyId: string; // For multi-tenant isolation
  documentType: 'company_info' | 'product_doc' | 'past_rfp' | 'answer_library' | 'competitive_intel' | 'rfp_content';
  text: string;
  source?: string;
  createdAt: string;

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

  // NEW: Surgical Retrieval System fields
  contentType?: string; // 'project-methodology', 'technical-solution', etc.
  isHistorical?: boolean; // true for historical RFPs
  rfpOutcome?: 'won' | 'lost' | 'pending'; // Outcome of the RFP
  qualityScore?: number; // 0-100 quality score
  industry?: string; // Client industry
  submittedAt?: string; // Submission date
  chunkIndex?: number; // Index of chunk within document

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
        companyId: metadata.companyId,
        rfpId,
        documentType: 'rfp_content',
        text: chunks[i].text,
        contentType: chunks[i].contentType,
        isHistorical: metadata.isHistorical,
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
    companyId: filters.companyId,
    contentType: filters.contentType,
    isHistorical: true
  };

  if (filters.onlyWon) {
    filter.rfpOutcome = 'won';
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
