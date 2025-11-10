import * as XLSX from 'xlsx';

export interface ParsedXLSX {
  text: string;
  sheets: {
    name: string;
    data: any[][];
  }[];
}

/**
 * Parse an XLSX file and extract content
 */
export async function parseXLSX(buffer: Buffer): Promise<ParsedXLSX> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheets = workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      return {
        name: sheetName,
        data: data as any[][],
      };
    });

    // Convert sheets to text representation
    const text = sheets
      .map((sheet) => {
        const sheetText = [`Sheet: ${sheet.name}`, ''];

        sheet.data.forEach((row) => {
          const rowText = row.map((cell) => String(cell || '')).join(' | ');
          if (rowText.trim()) {
            sheetText.push(rowText);
          }
        });

        return sheetText.join('\n');
      })
      .join('\n\n');

    return {
      text,
      sheets,
    };
  } catch (error) {
    console.error('[XLSX Parser Error]', error);
    throw new Error(`Failed to parse XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse an XLSX from a URL
 */
export async function parseXLSXFromURL(url: string): Promise<ParsedXLSX> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch XLSX: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return parseXLSX(buffer);
  } catch (error) {
    console.error('[XLSX Parser URL Error]', error);
    throw new Error(`Failed to parse XLSX from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
