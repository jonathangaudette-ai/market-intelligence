import { Pinecone } from "@pinecone-database/pinecone";
import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface RAGSource {
  text: string;
  source: string;
  competitor?: string;
  relevance: number;
  metadata?: Record<string, any>;
}

export interface UpsertDocumentParams {
  companyId: string;
  documentId: string;
  chunks: string[];
  metadata: {
    documentName: string;
    documentType: string;
    competitorName?: string;
    competitorId?: string;
    sourceUrl?: string;
  };
}

export interface QueryParams {
  companyId: string;
  queryText: string;
  filters?: Record<string, any>;
  topK?: number;
}

export interface SynthesizeParams {
  query: string;
  retrievedDocs: Array<{ text: string; source: string; competitor?: string }>;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatParams {
  companyId: string;
  query: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  filters?: Record<string, any>;
  topK?: number;
}

export class MultiTenantRAGEngine {
  private index;

  constructor() {
    this.index = pinecone.index(process.env.PINECONE_INDEX_NAME || "market-intelligence-prod");
  }

  /**
   * Upsert document chunks with embeddings to Pinecone
   */
  async upsertDocument(params: UpsertDocumentParams): Promise<number> {
    const { companyId, documentId, chunks, metadata } = params;

    // Generate embeddings for all chunks in parallel
    const embeddingPromises = chunks.map((chunk, idx) =>
      openai.embeddings
        .create({
          model: "text-embedding-3-large",
          input: chunk,
          dimensions: 1536,
        })
        .then((response) => ({
          id: `${documentId}-chunk-${idx}`,
          values: response.data[0].embedding,
          metadata: {
            tenant_id: companyId, // ← CRITICAL: Multi-tenant isolation
            document_id: documentId,
            document_name: metadata.documentName,
            document_type: metadata.documentType,
            ...(metadata.competitorName && { competitor_name: metadata.competitorName }),
            ...(metadata.competitorId && { competitor_id: metadata.competitorId }),
            ...(metadata.sourceUrl && { source_url: metadata.sourceUrl }),
            text: chunk,
            chunk_index: idx,
          },
        }))
    );

    const vectors = await Promise.all(embeddingPromises);

    // Upsert to Pinecone
    await this.index.upsert(vectors);

    return vectors.length;
  }

  /**
   * Query RAG with automatic tenant filtering
   */
  async query(params: QueryParams): Promise<RAGSource[]> {
    const { companyId, queryText, filters = {}, topK = 5 } = params;

    // Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: queryText,
      dimensions: 1536,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone with tenant filtering
    const queryResponse = await this.index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: {
        tenant_id: { $eq: companyId }, // ← AUTOMATIC TENANT ISOLATION
        ...filters,
      },
    });

    // Transform to RAGSource format
    return queryResponse.matches.map((match) => ({
      text: (match.metadata?.text as string) || "",
      source: (match.metadata?.document_name as string) || "Unknown",
      competitor: (match.metadata?.competitor_name as string) || undefined,
      relevance: match.score || 0,
      metadata: match.metadata,
    }));
  }

  /**
   * Synthesize answer using Claude Sonnet 4.5
   */
  async synthesize(params: SynthesizeParams): Promise<{
    answer: string;
    model: string;
    tokensUsed?: number;
  }> {
    const { query, retrievedDocs, conversationHistory = [] } = params;

    // Format context from retrieved documents
    const context = retrievedDocs
      .map((doc, idx) => {
        const competitorTag = doc.competitor ? ` [${doc.competitor}]` : "";
        return `[Source ${idx + 1}${competitorTag}: ${doc.source}]\n${doc.text}`;
      })
      .join("\n\n---\n\n");

    // Build messages
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: `Voici des informations pertinentes extraites de nos documents :

${context}

Question : ${query}

Réponds en français de manière concise et professionnelle. Si les sources ne contiennent pas l'information nécessaire pour répondre, indique-le clairement. Cite tes sources en utilisant le format [Source X].`,
      },
    ];

    // Call Claude Sonnet 4.5
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages,
    });

    return {
      answer: response.content[0].type === "text" ? response.content[0].text : "",
      model: response.model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  /**
   * Full RAG pipeline: retrieve + synthesize
   */
  async chat(params: ChatParams): Promise<{
    answer: string;
    sources: RAGSource[];
    model: string;
    tokensUsed?: number;
  }> {
    const { companyId, query, conversationHistory, filters, topK } = params;

    // Step 1: Retrieve relevant documents
    const sources = await this.query({
      companyId,
      queryText: query,
      filters,
      topK,
    });

    // Step 2: Synthesize answer
    const result = await this.synthesize({
      query,
      retrievedDocs: sources,
      conversationHistory,
    });

    return {
      answer: result.answer,
      sources,
      model: result.model,
      tokensUsed: result.tokensUsed,
    };
  }

  /**
   * Delete all vectors for a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.index.deleteMany({
      filter: { document_id: { $eq: documentId } },
    });
  }

  /**
   * Delete all vectors for a company (use with caution!)
   */
  async deleteCompanyData(companyId: string): Promise<void> {
    await this.index.deleteMany({
      filter: { tenant_id: { $eq: companyId } },
    });
  }
}

// Export singleton instance
export const ragEngine = new MultiTenantRAGEngine();
