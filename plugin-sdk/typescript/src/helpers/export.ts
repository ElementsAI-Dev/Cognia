/**
 * Data Export Helpers
 *
 * @description Utilities for exporting data to various formats (JSON, CSV, HTML, Markdown).
 */

/**
 * CSV export options
 */
export interface CsvExportOptions {
  /** Column delimiter (default: ',') */
  delimiter?: string;
  /** Include header row (default: true) */
  includeHeaders?: boolean;
  /** Quote all fields (default: false) */
  quoteAll?: boolean;
  /** Line ending (default: '\n') */
  lineEnding?: '\n' | '\r\n';
  /** Columns to include (default: all) */
  columns?: string[];
  /** Column header mapping */
  headerMap?: Record<string, string>;
  /** Transform value before export */
  transform?: (value: unknown, column: string, row: Record<string, unknown>) => string;
}

/**
 * JSON export options
 */
export interface JsonExportOptions {
  /** Pretty print with indentation */
  pretty?: boolean;
  /** Indentation spaces (default: 2) */
  indent?: number;
  /** Include metadata */
  includeMetadata?: boolean;
  /** Metadata to include */
  metadata?: Record<string, unknown>;
  /** Transform data before export */
  transform?: (data: unknown) => unknown;
}

/**
 * HTML table export options
 */
export interface HtmlExportOptions {
  /** Table CSS class */
  tableClass?: string;
  /** Header row CSS class */
  headerClass?: string;
  /** Row CSS class */
  rowClass?: string;
  /** Cell CSS class */
  cellClass?: string;
  /** Include inline styles */
  includeStyles?: boolean;
  /** Custom styles */
  styles?: string;
  /** Title for the table */
  title?: string;
  /** Include full HTML document */
  fullDocument?: boolean;
  /** Document title */
  documentTitle?: string;
  /** Theme */
  theme?: 'light' | 'dark';
}

/**
 * Markdown table export options
 */
export interface MarkdownExportOptions {
  /** Alignment for columns */
  alignment?: Record<string, 'left' | 'center' | 'right'>;
  /** Default alignment (default: 'left') */
  defaultAlignment?: 'left' | 'center' | 'right';
  /** Include title */
  title?: string;
  /** Title level (default: 2) */
  titleLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Max column width (truncate if exceeded) */
  maxColumnWidth?: number;
}

/**
 * Data export result
 */
export interface DataExportResult {
  /** Exported content as string */
  content: string;
  /** Content MIME type */
  mimeType: string;
  /** Suggested file extension */
  extension: string;
  /** Number of records exported */
  recordCount: number;
  /** Export timestamp */
  timestamp: string;
}

/**
 * Progress callback for export operations
 */
export type ExportProgressCallback = (progress: {
  current: number;
  total: number;
  percent: number;
  message?: string;
}) => void;

/**
 * Escape CSV value
 */
function escapeCsvValue(value: unknown, delimiter: string, quoteAll: boolean): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);
  const needsQuoting = quoteAll || str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r');

  if (needsQuoting) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape Markdown special characters in table cells
 */
function escapeMarkdown(str: string): string {
  return str.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Get value from object by path (supports nested paths like 'a.b.c')
 */
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Export data to CSV format
 *
 * @example
 * ```typescript
 * const data = [
 *   { name: 'Model A', price: 0.001, provider: 'OpenAI' },
 *   { name: 'Model B', price: 0.002, provider: 'Anthropic' },
 * ];
 *
 * const csv = exportToCsv(data, {
 *   columns: ['name', 'price', 'provider'],
 *   headerMap: { name: 'Model Name', price: 'Price ($/1K tokens)' },
 * });
 * ```
 */
export function exportToCsv(
  data: Record<string, unknown>[],
  options: CsvExportOptions = {},
  onProgress?: ExportProgressCallback
): DataExportResult {
  const {
    delimiter = ',',
    includeHeaders = true,
    quoteAll = false,
    lineEnding = '\n',
    columns,
    headerMap = {},
    transform,
  } = options;

  if (data.length === 0) {
    return {
      content: '',
      mimeType: 'text/csv',
      extension: 'csv',
      recordCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Determine columns
  const cols = columns || Object.keys(data[0]);
  const lines: string[] = [];

  // Add header row
  if (includeHeaders) {
    const headerRow = cols.map((col) => escapeCsvValue(headerMap[col] || col, delimiter, quoteAll));
    lines.push(headerRow.join(delimiter));
  }

  // Add data rows
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const values = cols.map((col) => {
      let value = getValueByPath(row, col);

      if (transform) {
        value = transform(value, col, row);
      }

      return escapeCsvValue(value, delimiter, quoteAll);
    });

    lines.push(values.join(delimiter));

    if (onProgress && i % 100 === 0) {
      onProgress({
        current: i + 1,
        total: data.length,
        percent: Math.round(((i + 1) / data.length) * 100),
        message: `Exporting row ${i + 1} of ${data.length}`,
      });
    }
  }

  return {
    content: lines.join(lineEnding),
    mimeType: 'text/csv',
    extension: 'csv',
    recordCount: data.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export data to JSON format
 *
 * @example
 * ```typescript
 * const data = { models: [...], providers: [...] };
 *
 * const json = exportToJson(data, {
 *   pretty: true,
 *   includeMetadata: true,
 *   metadata: { version: '1.0', source: 'API' },
 * });
 * ```
 */
export function exportToJson(
  data: unknown,
  options: JsonExportOptions = {}
): DataExportResult {
  const {
    pretty = true,
    indent = 2,
    includeMetadata = false,
    metadata = {},
    transform,
  } = options;

  let exportData = data;

  if (transform) {
    exportData = transform(data);
  }

  if (includeMetadata) {
    exportData = {
      ...metadata,
      generated_at: new Date().toISOString(),
      data: exportData,
    };
  }

  const content = pretty
    ? JSON.stringify(exportData, null, indent)
    : JSON.stringify(exportData);

  const recordCount = Array.isArray(data) ? data.length : 1;

  return {
    content,
    mimeType: 'application/json',
    extension: 'json',
    recordCount,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export data to HTML table format
 *
 * @example
 * ```typescript
 * const html = exportToHtml(data, {
 *   title: 'Model Pricing',
 *   theme: 'dark',
 *   fullDocument: true,
 * });
 * ```
 */
export function exportToHtml(
  data: Record<string, unknown>[],
  columns: string[],
  options: HtmlExportOptions = {}
): DataExportResult {
  const {
    tableClass = 'data-table',
    headerClass = 'header-row',
    rowClass = 'data-row',
    cellClass = 'data-cell',
    includeStyles = true,
    styles,
    title,
    fullDocument = false,
    documentTitle = 'Data Export',
    theme = 'light',
  } = options;

  const defaultStyles = theme === 'dark'
    ? `
      .data-table { border-collapse: collapse; width: 100%; background: #1e1e1e; color: #e0e0e0; }
      .data-table th, .data-table td { border: 1px solid #444; padding: 8px 12px; text-align: left; }
      .data-table th { background: #333; font-weight: bold; }
      .data-table tr:nth-child(even) { background: #2a2a2a; }
      .data-table tr:hover { background: #363636; }
    `
    : `
      .data-table { border-collapse: collapse; width: 100%; }
      .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
      .data-table th { background: #f5f5f5; font-weight: bold; }
      .data-table tr:nth-child(even) { background: #fafafa; }
      .data-table tr:hover { background: #f0f0f0; }
    `;

  let html = '';

  if (title) {
    html += `<h2>${escapeHtml(title)}</h2>\n`;
  }

  html += `<table class="${tableClass}">\n`;
  html += `  <thead>\n    <tr class="${headerClass}">\n`;

  for (const col of columns) {
    html += `      <th>${escapeHtml(col)}</th>\n`;
  }

  html += `    </tr>\n  </thead>\n`;
  html += `  <tbody>\n`;

  for (const row of data) {
    html += `    <tr class="${rowClass}">\n`;

    for (const col of columns) {
      const value = getValueByPath(row, col);
      html += `      <td class="${cellClass}">${escapeHtml(String(value ?? ''))}</td>\n`;
    }

    html += `    </tr>\n`;
  }

  html += `  </tbody>\n</table>`;

  if (fullDocument) {
    const styleBlock = includeStyles ? `<style>${styles || defaultStyles}</style>` : '';
    html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(documentTitle)}</title>
  ${styleBlock}
</head>
<body>
${html}
</body>
</html>`;
  }

  return {
    content: html,
    mimeType: 'text/html',
    extension: 'html',
    recordCount: data.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export data to Markdown table format
 *
 * @example
 * ```typescript
 * const markdown = exportToMarkdown(data, ['name', 'price', 'provider'], {
 *   title: 'Model Pricing',
 *   alignment: { price: 'right' },
 * });
 * ```
 */
export function exportToMarkdown(
  data: Record<string, unknown>[],
  columns: string[],
  options: MarkdownExportOptions = {}
): DataExportResult {
  const {
    alignment = {},
    defaultAlignment = 'left',
    title,
    titleLevel = 2,
    maxColumnWidth,
  } = options;

  let md = '';

  if (title) {
    md += `${'#'.repeat(titleLevel)} ${title}\n\n`;
  }

  // Header row
  md += '| ' + columns.map((col) => escapeMarkdown(col)).join(' | ') + ' |\n';

  // Alignment row
  md += '| ' + columns.map((col) => {
    const align = alignment[col] || defaultAlignment;
    switch (align) {
      case 'left': return ':---';
      case 'center': return ':---:';
      case 'right': return '---:';
      default: return '---';
    }
  }).join(' | ') + ' |\n';

  // Data rows
  for (const row of data) {
    const values = columns.map((col) => {
      let value = String(getValueByPath(row, col) ?? '');

      if (maxColumnWidth && value.length > maxColumnWidth) {
        value = value.substring(0, maxColumnWidth - 3) + '...';
      }

      return escapeMarkdown(value);
    });

    md += '| ' + values.join(' | ') + ' |\n';
  }

  return {
    content: md,
    mimeType: 'text/markdown',
    extension: 'md',
    recordCount: data.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Flatten nested object for export
 *
 * @example
 * ```typescript
 * const nested = { a: { b: { c: 1 } }, d: 2 };
 * const flat = flattenObject(nested);
 * // { 'a.b.c': 1, 'd': 2 }
 * ```
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  separator = '.'
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey, separator));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Convert array of objects to columns format for export
 */
export function autoDetectColumns(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];

  const columnSet = new Set<string>();

  for (const row of data) {
    const flat = flattenObject(row);
    for (const key of Object.keys(flat)) {
      columnSet.add(key);
    }
  }

  return Array.from(columnSet);
}
