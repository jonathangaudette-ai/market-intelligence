import pdfParse from 'pdf-parse';

export interface ParsedPDF {
  text: string;
  numPages: number;
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
  };
}

/**
 * Parse a PDF file and extract text content
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const data = await pdfParse(buffer);

    return {
      text: data.text,
      numPages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
      },
    };
  } catch (error) {
    console.error('[PDF Parser Error]', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse a PDF from a URL
 */
export async function parsePDFFromURL(url: string): Promise<ParsedPDF> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return parsePDF(buffer);
  } catch (error) {
    console.error('[PDF Parser URL Error]', error);
    throw new Error(`Failed to parse PDF from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean and normalize extracted text
 */
export function cleanPDFText(text: string): string {
  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page numbers (common patterns)
      .replace(/\bPage \d+ of \d+\b/gi, '')
      .replace(/\b\d+\s*\/\s*\d+\b/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove multiple consecutive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim
      .trim()
  );
}
