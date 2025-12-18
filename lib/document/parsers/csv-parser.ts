/**
 * CSV Parser - Parse CSV and TSV files
 * Supports various delimiters and encodings
 */

export interface CSVParseResult {
  text: string;
  data: string[][];
  headers: string[];
  rowCount: number;
  columnCount: number;
  delimiter: string;
}

export interface CSVParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
  trimValues?: boolean;
  encoding?: string;
}

const DEFAULT_OPTIONS: CSVParseOptions = {
  delimiter: undefined, // Auto-detect if not specified
  hasHeader: true,
  skipEmptyLines: true,
  trimValues: true,
};

/**
 * Detect delimiter from content
 */
export function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  
  const delimiters = [',', '\t', ';', '|'];
  const counts = delimiters.map((d) => ({
    delimiter: d,
    count: (firstLine.match(new RegExp(escapeRegex(d), 'g')) || []).length,
  }));

  // Sort by count descending
  counts.sort((a, b) => b.count - a.count);

  // Return the most common delimiter (if any found)
  return counts[0].count > 0 ? counts[0].delimiter : ',';
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse CSV content
 */
export function parseCSV(
  content: string,
  options: CSVParseOptions = {}
): CSVParseResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Auto-detect delimiter if not specified
  const delimiter = opts.delimiter || detectDelimiter(content);

  const lines = content.split(/\r?\n/);
  const data: string[][] = [];

  for (const line of lines) {
    // Skip empty lines if configured
    if (opts.skipEmptyLines && line.trim() === '') {
      continue;
    }

    const row = parseLine(line, delimiter, opts.trimValues ?? true);
    data.push(row);
  }

  // Extract headers
  const headers = opts.hasHeader && data.length > 0 ? data[0] : [];
  const dataWithoutHeader = opts.hasHeader ? data.slice(1) : data;

  // Calculate dimensions
  const columnCount = data.reduce((max, row) => Math.max(max, row.length), 0);

  // Generate text representation
  const text = generateText(headers, dataWithoutHeader, delimiter);

  return {
    text,
    data: opts.hasHeader ? dataWithoutHeader : data,
    headers,
    rowCount: dataWithoutHeader.length,
    columnCount,
    delimiter,
  };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseLine(line: string, delimiter: string, trim: boolean): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
          continue;
        } else {
          // End of quoted value
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        current += char;
        i++;
        continue;
      }
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (char === delimiter) {
      result.push(trim ? current.trim() : current);
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Add last value
  result.push(trim ? current.trim() : current);

  return result;
}

/**
 * Generate text representation of CSV data
 */
function generateText(
  headers: string[],
  data: string[][],
  delimiter: string
): string {
  const lines: string[] = [];
  const delimiterName = delimiter === '\t' ? 'TSV' : 'CSV';

  lines.push(`[${delimiterName} Data]`);

  if (headers.length > 0) {
    lines.push(`Columns: ${headers.join(', ')}`);
    lines.push(`Rows: ${data.length}`);
    lines.push('');

    // Table format
    lines.push('| ' + headers.join(' | ') + ' |');
    lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');

    for (const row of data.slice(0, 100)) { // Limit to first 100 rows for embedding
      const paddedRow = headers.map((_, i) => row[i] || '');
      lines.push('| ' + paddedRow.join(' | ') + ' |');
    }

    if (data.length > 100) {
      lines.push(`... and ${data.length - 100} more rows`);
    }
  } else {
    // No headers
    lines.push(`Rows: ${data.length}`);
    lines.push('');

    for (const row of data.slice(0, 100)) {
      lines.push(row.join(' | '));
    }

    if (data.length > 100) {
      lines.push(`... and ${data.length - 100} more rows`);
    }
  }

  return lines.join('\n');
}

/**
 * Parse CSV file
 */
export async function parseCSVFile(
  file: File,
  options: CSVParseOptions = {}
): Promise<CSVParseResult> {
  const content = await file.text();
  
  // Auto-detect TSV from extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'tsv' && !options.delimiter) {
    options.delimiter = '\t';
  }

  return parseCSV(content, options);
}

/**
 * Convert CSV data to JSON objects
 */
export function csvToJSON(result: CSVParseResult): Record<string, string>[] {
  if (result.headers.length === 0) {
    return result.data.map((row, i) => {
      const obj: Record<string, string> = {};
      row.forEach((cell, j) => {
        obj[`col${j + 1}`] = cell;
      });
      obj['_row'] = String(i + 1);
      return obj;
    });
  }

  return result.data.map((row, i) => {
    const obj: Record<string, string> = {};
    result.headers.forEach((header, j) => {
      obj[header] = row[j] || '';
    });
    obj['_row'] = String(i + 1);
    return obj;
  });
}

/**
 * Extract embeddable content from CSV
 */
export function extractCSVEmbeddableContent(result: CSVParseResult): string {
  return result.text;
}

/**
 * Generate statistics for CSV data
 */
export function getCSVStats(result: CSVParseResult): {
  rowCount: number;
  columnCount: number;
  emptyCount: number;
  numericColumns: string[];
} {
  const stats = {
    rowCount: result.rowCount,
    columnCount: result.columnCount,
    emptyCount: 0,
    numericColumns: [] as string[],
  };

  // Count empty cells
  for (const row of result.data) {
    for (const cell of row) {
      if (cell === '' || cell === null || cell === undefined) {
        stats.emptyCount++;
      }
    }
  }

  // Detect numeric columns
  if (result.headers.length > 0) {
    result.headers.forEach((header, colIndex) => {
      const values = result.data.map((row) => row[colIndex]).filter((v) => v !== '');
      const numericCount = values.filter((v) => !isNaN(Number(v))).length;
      
      if (numericCount > values.length * 0.8) {
        stats.numericColumns.push(header);
      }
    });
  }

  return stats;
}
