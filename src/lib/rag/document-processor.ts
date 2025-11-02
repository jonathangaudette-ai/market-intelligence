import pdf from "pdf-parse";

export interface ProcessedDocument {
  text: string;
  chunks: string[];
  metadata: {
    pageCount?: number;
    wordCount: number;
    chunkCount: number;
  };
}

/**
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.slice(startIndex, endIndex);
    chunks.push(chunk.trim());

    // Move forward by (chunkSize - overlap) to create overlapping chunks
    startIndex += chunkSize - overlap;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Process PDF file
 */
export async function processPDF(buffer: Buffer): Promise<ProcessedDocument> {
  const data = await pdf(buffer);

  const text = data.text;
  const chunks = chunkText(text);

  return {
    text,
    chunks,
    metadata: {
      pageCount: data.numpages,
      wordCount: text.split(/\s+/).length,
      chunkCount: chunks.length,
    },
  };
}

/**
 * Process plain text
 */
export function processText(text: string): ProcessedDocument {
  const chunks = chunkText(text);

  return {
    text,
    chunks,
    metadata: {
      wordCount: text.split(/\s+/).length,
      chunkCount: chunks.length,
    },
  };
}

/**
 * Clean text (remove extra whitespace, normalize)
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\n+/g, "\n") // Replace multiple newlines with single newline
    .trim();
}
