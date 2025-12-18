/**
 * Office Parser - Extract content from Word (.docx) and Excel (.xlsx) files
 * Uses mammoth for Word and xlsx for Excel
 */

export interface WordParseResult {
  text: string;
  html: string;
  messages: WordMessage[];
  images: WordImage[];
}

export interface WordMessage {
  type: 'warning' | 'error';
  message: string;
}

export interface WordImage {
  contentType: string;
  base64: string;
}

export interface ExcelParseResult {
  text: string;
  sheets: ExcelSheet[];
  sheetNames: string[];
}

export interface ExcelSheet {
  name: string;
  data: (string | number | boolean | null)[][];
  rowCount: number;
  columnCount: number;
}

export interface ExcelCell {
  value: string | number | boolean | null;
  type: 'string' | 'number' | 'boolean' | 'date' | 'empty';
}

/**
 * Parse Word document from ArrayBuffer
 */
export async function parseWord(data: ArrayBuffer): Promise<WordParseResult> {
  const mammoth = await import('mammoth');

  const result = await mammoth.default.convertToHtml({ arrayBuffer: data });
  const textResult = await mammoth.default.extractRawText({ arrayBuffer: data });

  const messages: WordMessage[] = result.messages.map((msg) => ({
    type: msg.type as 'warning' | 'error',
    message: msg.message,
  }));

  return {
    text: textResult.value,
    html: result.value,
    messages,
    images: [], // mammoth doesn't extract images by default
  };
}

/**
 * Parse Word document from File object
 */
export async function parseWordFile(file: File): Promise<WordParseResult> {
  const buffer = await file.arrayBuffer();
  return parseWord(buffer);
}

/**
 * Parse Excel file from ArrayBuffer
 */
export async function parseExcel(data: ArrayBuffer): Promise<ExcelParseResult> {
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(data, { type: 'array' });
  const sheets: ExcelSheet[] = [];
  const textParts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON array
    const jsonData = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
      header: 1,
      defval: null,
    });

    // Calculate dimensions
    const rowCount = jsonData.length;
    const columnCount = jsonData.reduce((max, row) => Math.max(max, row.length), 0);

    sheets.push({
      name: sheetName,
      data: jsonData,
      rowCount,
      columnCount,
    });

    // Convert to text for embedding
    const sheetText = convertSheetToText(sheetName, jsonData);
    textParts.push(sheetText);
  }

  return {
    text: textParts.join('\n\n'),
    sheets,
    sheetNames: workbook.SheetNames,
  };
}

/**
 * Parse Excel file from File object
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const buffer = await file.arrayBuffer();
  return parseExcel(buffer);
}

/**
 * Convert Excel sheet data to readable text
 */
function convertSheetToText(
  sheetName: string,
  data: (string | number | boolean | null)[][]
): string {
  const lines: string[] = [`## Sheet: ${sheetName}`];

  if (data.length === 0) {
    lines.push('(empty sheet)');
    return lines.join('\n');
  }

  // Use first row as header if it looks like headers
  const hasHeader = data.length > 1 && data[0].every((cell) => typeof cell === 'string');

  if (hasHeader) {
    const headers = data[0] as string[];
    lines.push(headers.join(' | '));
    lines.push(headers.map(() => '---').join(' | '));

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const cells = row.map((cell) => formatCellValue(cell));
      lines.push(cells.join(' | '));
    }
  } else {
    // No header, just convert rows
    for (const row of data) {
      const cells = row.map((cell) => formatCellValue(cell));
      lines.push(cells.join(' | '));
    }
  }

  return lines.join('\n');
}

/**
 * Format cell value for text output
 */
function formatCellValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    // Format numbers with reasonable precision
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(2);
  }
  return String(value);
}

/**
 * Extract embeddable content from Word document
 */
export function extractWordEmbeddableContent(result: WordParseResult): string {
  return result.text;
}

/**
 * Extract embeddable content from Excel file
 */
export function extractExcelEmbeddableContent(result: ExcelParseResult): string {
  return result.text;
}

/**
 * Detect Office file type from extension
 */
export function detectOfficeType(filename: string): 'word' | 'excel' | 'unknown' {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (['docx', 'doc'].includes(ext)) {
    return 'word';
  }
  if (['xlsx', 'xls'].includes(ext)) {
    return 'excel';
  }

  return 'unknown';
}
