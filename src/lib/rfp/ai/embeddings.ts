import OpenAI from 'openai';
import { getRFPNamespace, type RFPVectorMetadata } from '../pinecone';

// Lazy initialization to avoid connecting during build time
let _openai: OpenAI | null = null;

function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

/**
 * Generate embeddings for text using OpenAI text-embedding-3-small
 * This model produces 1536-dimension vectors
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();

  // OpenAI allows up to 2048 texts per batch, but we'll be conservative
  const batchSize = 100;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
      encoding_format: 'float',
    });

    embeddings.push(...response.data.map((d) => d.embedding));
  }

  return embeddings;
}

/**
 * Index a document in Pinecone with its embeddings
 */
export async function indexDocument(params: {
  documentId: string;
  text: string;
  documentType: RFPVectorMetadata['documentType'];
  metadata?: Omit<RFPVectorMetadata, 'text' | 'documentId' | 'createdAt' | 'documentType'>;
}): Promise<void> {
  const namespace = getRFPNamespace();

  // Generate embedding
  const embedding = await generateEmbedding(params.text);

  // Prepare metadata
  const metadata: RFPVectorMetadata = {
    documentId: params.documentId,
    documentType: params.documentType,
    text: params.text,
    createdAt: new Date().toISOString(),
    ...params.metadata,
  };

  // Upsert to Pinecone
  await namespace.upsert([
    {
      id: params.documentId,
      values: embedding,
      metadata: metadata as Record<string, any>,
    },
  ]);
}

/**
 * Index multiple document chunks in batch
 */
export async function indexDocumentChunks(
  chunks: Array<{
    id: string;
    text: string;
    documentType: RFPVectorMetadata['documentType'];
    metadata?: Omit<RFPVectorMetadata, 'text' | 'documentId' | 'createdAt' | 'documentType'>;
  }>
): Promise<void> {
  const namespace = getRFPNamespace();

  // Generate embeddings for all chunks
  const texts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(texts);

  // Prepare vectors for Pinecone
  const vectors = chunks.map((chunk, idx) => ({
    id: chunk.id,
    values: embeddings[idx],
    metadata: {
      documentId: chunk.id,
      documentType: chunk.documentType,
      text: chunk.text,
      createdAt: new Date().toISOString(),
      ...chunk.metadata,
    } as Record<string, any>,
  }));

  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await namespace.upsert(batch);
  }
}

/**
 * Search for similar documents in the RFP library
 */
export async function searchSimilarDocuments(params: {
  query: string;
  topK?: number;
  filter?: Record<string, any>;
}): Promise<
  Array<{
    id: string;
    score: number;
    metadata: RFPVectorMetadata;
  }>
> {
  const namespace = getRFPNamespace();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(params.query);

  // Search Pinecone
  const results = await namespace.query({
    vector: queryEmbedding,
    topK: params.topK || 10,
    includeMetadata: true,
    filter: params.filter,
  });

  return results.matches.map((match) => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as RFPVectorMetadata,
  }));
}

/**
 * Delete documents from the index
 */
export async function deleteDocuments(documentIds: string[]): Promise<void> {
  const namespace = getRFPNamespace();
  await namespace.deleteMany(documentIds);
}

/**
 * Delete all documents for a specific RFP
 */
export async function deleteRFPDocuments(rfpId: string): Promise<void> {
  const namespace = getRFPNamespace();
  await namespace.deleteMany({
    rfpId,
  });
}

/**
 * Get stats about the RFP library index
 */
export async function getIndexStats(): Promise<{
  totalVectors: number;
  dimension: number;
}> {
  const namespace = getRFPNamespace();

  const stats = await namespace.describeIndexStats();

  return {
    totalVectors: stats.namespaces?.['rfp-library']?.recordCount || 0,
    dimension: stats.dimension || 1536,
  };
}

/**
 * Test OpenAI embeddings connection
 */
export async function testEmbeddingsConnection(): Promise<boolean> {
  try {
    const embedding = await generateEmbedding('test');

    console.log('✅ OpenAI Embeddings API connection successful');
    console.log(`📊 Embedding dimension: ${embedding.length}`);

    return true;
  } catch (error) {
    console.error('❌ OpenAI Embeddings API connection failed:', error);
    return false;
  }
}
