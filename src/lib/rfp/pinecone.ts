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
  documentType: 'company_info' | 'product_doc' | 'past_rfp' | 'answer_library' | 'competitive_intel';
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

  // Flexible additional metadata
  [key: string]: any;
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
