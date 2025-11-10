import { parsePDFFromURL, cleanPDFText } from './pdf-parser';
import { parseDOCXFromURL, cleanDOCXText } from './docx-parser';
import { parseXLSXFromURL } from './xlsx-parser';

export interface ParsedDocument {
  text: string;
  html?: string;
  metadata?: {
    numPages?: number;
    title?: string;
    author?: string;
    [key: string]: any;
  };
}

/**
 * Parse a document from a URL based on its file type
 */
export async function parseDocument(
  fileUrl: string,
  fileType: string
): Promise<ParsedDocument> {
  try {
    switch (fileType.toLowerCase()) {
      case 'pdf': {
        const pdfData = await parsePDFFromURL(fileUrl);
        return {
          text: cleanPDFText(pdfData.text),
          metadata: {
            numPages: pdfData.numPages,
            ...pdfData.metadata,
          },
        };
      }

      case 'docx':
      case 'doc': {
        const docxData = await parseDOCXFromURL(fileUrl);
        return {
          text: cleanDOCXText(docxData.text),
          html: docxData.html,
        };
      }

      case 'xlsx':
      case 'xls': {
        const xlsxData = await parseXLSXFromURL(fileUrl);
        return {
          text: xlsxData.text,
          metadata: {
            sheets: xlsxData.sheets.map((s) => s.name),
          },
        };
      }

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error('[Parser Service Error]', error);
    throw error;
  }
}

/**
 * Extract sections from parsed text
 * Tries to identify sections based on common RFP patterns
 */
export function extractSections(text: string): Array<{
  title: string;
  content: string;
  startIndex: number;
}> {
  const sections: Array<{ title: string; content: string; startIndex: number }> = [];

  // Common section patterns in RFPs
  const sectionPatterns = [
    /^(SECTION\s+\d+[:.])(.+?)$/gim,
    /^(\d+\.\s+)([A-Z][^.\n]+)$/gm,
    /^([A-Z\s]{3,}:)/gm,
  ];

  let matches: RegExpExecArray | null;
  const allMatches: Array<{ title: string; index: number }> = [];

  // Find all potential section headers
  for (const pattern of sectionPatterns) {
    pattern.lastIndex = 0;
    while ((matches = pattern.exec(text)) !== null) {
      allMatches.push({
        title: matches[0].trim(),
        index: matches.index,
      });
    }
  }

  // Sort by position in document
  allMatches.sort((a, b) => a.index - b.index);

  // Extract content between sections
  for (let i = 0; i < allMatches.length; i++) {
    const current = allMatches[i];
    const next = allMatches[i + 1];

    const content = text
      .substring(current.index, next?.index ?? text.length)
      .trim();

    sections.push({
      title: current.title,
      content,
      startIndex: current.index,
    });
  }

  return sections;
}

/**
 * Estimate the number of questions in parsed text
 * Looks for common question patterns
 */
export function estimateQuestionCount(text: string): number {
  const questionPatterns = [
    /\?\s*$/gm, // Sentences ending with ?
    /^(\d+\.|\d+\)|\([a-z]\))\s+/gm, // Numbered/lettered lists
    /please\s+(provide|describe|explain|list|specify)/gi,
    /requirement[s]?:/gi,
  ];

  let count = 0;
  for (const pattern of questionPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }

  // Return a reasonable estimate (questions might overlap patterns)
  return Math.floor(count / 2);
}
