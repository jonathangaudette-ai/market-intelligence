/**
 * Strict TypeScript types for document metadata
 * Replaces unsafe `any` casts throughout the codebase
 */

export interface DocumentAnalysisSection {
  id: string;
  title: string;
  type: string;
  content: string;
  relevanceScore: number;
  shouldIndex: boolean;
  tags?: string[];
  reasoning?: string;
  pageNumbers?: number[];
  confidence?: number;
  keyTopics?: string[];
  entities?: string[];
}

export interface DocumentAnalysisSignal {
  type: "competitor_mention" | "price_change" | "hiring_spike" | "new_product" | "contract_win";
  severity: "low" | "medium" | "high";
  summary: string;
  details: string;
  confidence: number;
  relatedEntities?: string[];
  competitorName?: string;
}

export interface DocumentAnalysis {
  documentType?: string;
  primaryCompetitor?: string;
  confidenceScore?: number;
  summary?: string;
  keyTopics?: string[];
  extractedEntities?: string[];
  sections: DocumentAnalysisSection[];
  signals: DocumentAnalysisSignal[];
  analyzedAt?: string;
  modelUsed?: string;
  processingTimeMs?: number;
}

export interface ChunkMetadata {
  chunkId: string;
  startIndex: number;
  endIndex: number;
  content: string;
  tokens?: number;
}

export interface DocumentMetadata {
  // Upload & Storage
  blobUrl?: string;
  fileSize?: number;
  fileName?: string;

  // Extraction
  pageCount?: number;
  wordCount?: number;
  extractedText?: string;
  extractedAt?: string;

  // Analysis
  analysis?: DocumentAnalysis;
  analyzedAt?: string;

  // Filtering
  keptSectionIds?: string[];
  filteringComplete?: boolean;
  filteredAt?: string;

  // Chunking
  chunks?: ChunkMetadata[];
  chunkedAt?: string;

  // Embedding
  embeddedAt?: string;
  vectorsCreated?: number;
  embeddingModel?: string;

  // Progress tracking
  currentStep?: "upload" | "extraction" | "analysis" | "chunking" | "embedding" | "finalization";
  currentStepProgress?: number;
  currentStepMessage?: string;
  currentStepStartedAt?: string;

  // Error tracking
  lastError?: string;
  lastErrorAt?: string;
}

/**
 * Type guard to check if metadata is valid
 */
export function isValidDocumentMetadata(metadata: unknown): metadata is DocumentMetadata {
  if (typeof metadata !== "object" || metadata === null) {
    return false;
  }
  return true;
}

/**
 * Safely parse metadata from database
 */
export function parseDocumentMetadata(metadata: unknown): DocumentMetadata {
  if (isValidDocumentMetadata(metadata)) {
    return metadata;
  }
  return {};
}
