/**
 * Google Sheets Export - Export data in formats compatible with Google Sheets
 * Supports CSV export, clipboard copy, and opening in Google Sheets
 */

import type { TableData } from './excel-export';
import type { UIMessage, Session } from '@/types';

export interface GoogleSheetsExportOptions {
  delimiter?: string;
  includeHeaders?: boolean;
  quoteStrings?: boolean;
}

export interface CSVExportResult {
  success: boolean;
  content?: string;
  filename?: string;
  error?: string;
}

const DEFAULT_OPTIONS: GoogleSheetsExportOptions = {
  delimiter: ',',
  includeHeaders: true,
  quoteStrings: true,
};

/**
 * Convert table data to CSV format
 */
export function tableToCSV(
  tableData: TableData,
  options: GoogleSheetsExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  // Add headers
  if (opts.includeHeaders && tableData.headers.length > 0) {
    lines.push(formatCSVRow(tableData.headers, opts));
  }

  // Add data rows
  for (const row of tableData.rows) {
    lines.push(formatCSVRow(row, opts));
  }

  return lines.join('\n');
}

/**
 * Format a single CSV row
 */
function formatCSVRow(
  row: (string | number | boolean | null | undefined)[],
  options: GoogleSheetsExportOptions
): string {
  return row
    .map((cell) => {
      const value = cell === null || cell === undefined ? '' : String(cell);

      // Quote strings that contain delimiter, quotes, or newlines
      if (options.quoteStrings) {
        if (
          value.includes(options.delimiter || ',') ||
          value.includes('"') ||
          value.includes('\n') ||
          value.includes('\r')
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
      }

      return value;
    })
    .join(options.delimiter || ',');
}

/**
 * Export table data to CSV file
 */
export function exportTableToCSV(
  tableData: TableData,
  filename: string,
  options: GoogleSheetsExportOptions = {}
): CSVExportResult {
  try {
    const content = tableToCSV(tableData, options);

    return {
      success: true,
      content,
      filename: ensureCSVExtension(filename),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export CSV',
    };
  }
}

/**
 * Export chat messages to CSV format
 */
export function exportChatToCSV(
  session: Session,
  messages: UIMessage[],
  filename?: string
): CSVExportResult {
  try {
    const headers = ['#', 'Role', 'Content', 'Model', 'Timestamp', 'Tokens'];
    const rows = messages.map((msg, index) => [
      index + 1,
      msg.role,
      msg.content.replace(/\n/g, '\\n'), // Escape newlines
      msg.model || '',
      msg.createdAt.toISOString(),
      msg.tokens?.total || '',
    ]);

    const tableData: TableData = { headers, rows };
    const content = tableToCSV(tableData);

    const exportFilename = filename || generateCSVFilename(session.title);

    return {
      success: true,
      content,
      filename: ensureCSVExtension(exportFilename),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export chat to CSV',
    };
  }
}

/**
 * Download CSV content as file
 */
export function downloadCSV(content: string, filename: string): void {
  // Add BOM for Excel compatibility with UTF-8
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ensureCSVExtension(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy table data to clipboard in TSV format (for pasting into Google Sheets)
 */
export async function copyTableToClipboard(
  tableData: TableData,
  options: GoogleSheetsExportOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use TSV for clipboard (tabs are better for spreadsheet pasting)
    const tsvOptions = { ...options, delimiter: '\t', quoteStrings: false };
    const content = tableToCSV(tableData, tsvOptions);

    await navigator.clipboard.writeText(content);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
    };
  }
}

/**
 * Copy table as HTML (for rich pasting into Google Sheets)
 */
export async function copyTableAsHTML(
  tableData: TableData
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = tableToHTML(tableData);
    const plainText = tableToCSV(tableData, { delimiter: '\t', quoteStrings: false });

    // Create clipboard items with both HTML and plain text
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([plainText], { type: 'text/plain' });

    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      }),
    ]);

    return { success: true };
  } catch (_error) {
    // Fallback to plain text if HTML clipboard fails
    try {
      const plainText = tableToCSV(tableData, { delimiter: '\t', quoteStrings: false });
      await navigator.clipboard.writeText(plainText);
      return { success: true };
    } catch (fallbackError) {
      return {
        success: false,
        error: fallbackError instanceof Error ? fallbackError.message : 'Failed to copy to clipboard',
      };
    }
  }
}

/**
 * Convert table data to HTML table string
 */
export function tableToHTML(tableData: TableData): string {
  const lines: string[] = [];

  lines.push('<table>');

  // Headers
  if (tableData.headers.length > 0) {
    lines.push('  <thead>');
    lines.push('    <tr>');
    for (const header of tableData.headers) {
      lines.push(`      <th>${escapeHtml(String(header))}</th>`);
    }
    lines.push('    </tr>');
    lines.push('  </thead>');
  }

  // Body
  lines.push('  <tbody>');
  for (const row of tableData.rows) {
    lines.push('    <tr>');
    for (const cell of row) {
      lines.push(`      <td>${escapeHtml(String(cell ?? ''))}</td>`);
    }
    lines.push('    </tr>');
  }
  lines.push('  </tbody>');

  lines.push('</table>');

  return lines.join('\n');
}

/**
 * Open CSV data in Google Sheets (via data URL)
 */
export function openInGoogleSheets(tableData: TableData): void {
  const csvContent = tableToCSV(tableData);
  
  // Encode CSV content for URL
  const encodedCSV = encodeURIComponent(csvContent);
  
  // Create a data URL (for future use with direct import APIs)
  const _dataUrl = `data:text/csv;charset=utf-8,${encodedCSV}`;
  
  // Google Sheets import URL (user will need to import manually)
  // This opens Google Sheets with a new blank spreadsheet
  const googleSheetsUrl = 'https://docs.google.com/spreadsheets/create';
  
  // Open in new tab
  window.open(googleSheetsUrl, '_blank');
  
  // Also download the CSV for easy import
  downloadCSV(csvContent, 'spreadsheet-data.csv');
}

/**
 * Generate a Google Sheets importable link with CSV data
 * Note: This creates a downloadable CSV that user can import
 */
export function generateGoogleSheetsImportLink(tableData: TableData): string {
  const csvContent = tableToCSV(tableData);
  const encodedCSV = encodeURIComponent(csvContent);
  return `data:text/csv;charset=utf-8,${encodedCSV}`;
}

/**
 * Export and download CSV in one step
 */
export function exportAndDownloadCSV(
  tableData: TableData,
  filename: string,
  options?: GoogleSheetsExportOptions
): CSVExportResult {
  const result = exportTableToCSV(tableData, filename, options);

  if (result.success && result.content && result.filename) {
    downloadCSV(result.content, result.filename);
  }

  return result;
}

/**
 * Parse CSV content to TableData
 */
export function parseCSVToTableData(
  csvContent: string,
  options: { hasHeaders?: boolean; delimiter?: string } = {}
): TableData {
  const { hasHeaders = true, delimiter = ',' } = options;
  
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  const rows: string[][] = [];

  for (const line of lines) {
    const row = parseCSVLine(line, delimiter);
    rows.push(row);
  }

  if (hasHeaders && rows.length > 0) {
    const headers = rows.shift()!;
    return { headers, rows };
  }

  return { headers: [], rows };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
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
          current += '"';
          i += 2;
          continue;
        } else {
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
      result.push(current.trim());
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  result.push(current.trim());
  return result;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Ensure filename has .csv extension
 */
function ensureCSVExtension(filename: string): string {
  if (!filename.toLowerCase().endsWith('.csv')) {
    return `${filename}.csv`;
  }
  return filename;
}

/**
 * Generate filename from title
 */
function generateCSVFilename(title: string): string {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const timestamp = new Date().toISOString().slice(0, 10);
  return `${safeTitle}-${timestamp}.csv`;
}

/**
 * Convert JSON array to TableData
 */
export function jsonToTableData(data: Record<string, unknown>[]): TableData {
  if (data.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((item) =>
    headers.map((header) => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    })
  );

  return { headers, rows };
}
