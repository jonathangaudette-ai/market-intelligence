import mammoth from 'mammoth';

export interface ParsedDOCX {
  text: string;
  html: string;
  messages: string[];
}

/**
 * Parse a DOCX file and extract text content
 */
export async function parseDOCX(buffer: Buffer): Promise<ParsedDOCX> {
  try {
    // Extract text
    const textResult = await mammoth.extractRawText({ buffer });

    // Extract HTML (preserves formatting)
    const htmlResult = await mammoth.convertToHtml({ buffer });

    return {
      text: textResult.value,
      html: htmlResult.value,
      messages: [...textResult.messages, ...htmlResult.messages].map((m) => m.message),
    };
  } catch (error) {
    console.error('[DOCX Parser Error]', error);
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse a DOCX from a URL
 */
export async function parseDOCXFromURL(url: string): Promise<ParsedDOCX> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch DOCX: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return parseDOCX(buffer);
  } catch (error) {
    console.error('[DOCX Parser URL Error]', error);
    throw new Error(`Failed to parse DOCX from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean and normalize extracted text from DOCX
 */
export function cleanDOCXText(text: string): string {
  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove multiple consecutive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim
      .trim()
  );
}
