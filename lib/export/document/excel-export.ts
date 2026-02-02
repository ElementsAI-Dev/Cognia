/**
 * Excel Export - Generate Excel files from table data, messages, and artifacts
 * Uses SheetJS (xlsx) for Excel generation
 */

import type { UIMessage, Session } from '@/types';
import { getPluginEventHooks } from '@/lib/plugin';

export interface ExcelExportOptions {
  sheetName?: string;
  includeHeaders?: boolean;
  autoWidth?: boolean;
  dateFormat?: string;
  numberFormat?: string;
}

export interface TableData {
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  title?: string;
}

export interface ExcelSheet {
  name: string;
  data: TableData;
}

export interface ExcelExportResult {
  success: boolean;
  filename?: string;
  blob?: Blob;
  error?: string;
}

const DEFAULT_OPTIONS: ExcelExportOptions = {
  sheetName: 'Sheet1',
  includeHeaders: true,
  autoWidth: true,
  dateFormat: 'yyyy-mm-dd',
  numberFormat: '#,##0.00',
};

/**
 * Export table data to Excel file
 */
export async function exportTableToExcel(
  tableData: TableData,
  filename: string,
  options: ExcelExportOptions = {}
): Promise<ExcelExportResult> {
  try {
    const XLSX = await import('xlsx');
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data with headers
    const wsData: (string | number | boolean | null | undefined)[][] = [];
    
    if (opts.includeHeaders && tableData.headers.length > 0) {
      wsData.push(tableData.headers);
    }
    
    wsData.push(...tableData.rows);

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-width columns
    if (opts.autoWidth) {
      const colWidths = calculateColumnWidths(wsData);
      worksheet['!cols'] = colWidths.map((w) => ({ wch: Math.min(w + 2, 50) }));
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, opts.sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return {
      success: true,
      filename: ensureExcelExtension(filename),
      blob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export Excel',
    };
  }
}

/**
 * Export multiple sheets to Excel file
 */
export async function exportMultiSheetExcel(
  sheets: ExcelSheet[],
  filename: string,
  options: ExcelExportOptions = {}
): Promise<ExcelExportResult> {
  try {
    const XLSX = await import('xlsx');
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Create workbook
    const workbook = XLSX.utils.book_new();

    for (const sheet of sheets) {
      // Prepare data with headers
      const wsData: (string | number | boolean | null | undefined)[][] = [];
      
      if (opts.includeHeaders && sheet.data.headers.length > 0) {
        wsData.push(sheet.data.headers);
      }
      
      wsData.push(...sheet.data.rows);

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(wsData);

      // Auto-width columns
      if (opts.autoWidth) {
        const colWidths = calculateColumnWidths(wsData);
        worksheet['!cols'] = colWidths.map((w) => ({ wch: Math.min(w + 2, 50) }));
      }

      // Sanitize sheet name (max 31 chars, no special chars)
      const safeName = sanitizeSheetName(sheet.name);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return {
      success: true,
      filename: ensureExcelExtension(filename),
      blob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export Excel',
    };
  }
}

/**
 * Export chat messages to Excel
 */
export async function exportChatToExcel(
  session: Session,
  messages: UIMessage[],
  filename?: string
): Promise<ExcelExportResult> {
  const pluginHooks = getPluginEventHooks();
  await pluginHooks.dispatchExportStart(session.id, 'excel');

  try {
    const XLSX = await import('xlsx');

    // Allow plugins to transform messages
    let transformedMessages = messages;
    transformedMessages = await pluginHooks.dispatchExportTransform(JSON.stringify(messages), 'excel')
      .then(transformed => transformed ? JSON.parse(transformed) : messages)
      .catch(() => messages);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Session Info
    const sessionData = [
      ['Property', 'Value'],
      ['Title', session.title],
      ['Provider', session.provider],
      ['Model', session.model],
      ['Mode', session.mode],
      ['Created', session.createdAt.toLocaleString()],
      ['Updated', session.updatedAt.toLocaleString()],
      ['Total Messages', messages.length.toString()],
    ];

    const sessionSheet = XLSX.utils.aoa_to_sheet(sessionData);
    sessionSheet['!cols'] = [{ wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, sessionSheet, 'Session Info');

    // Sheet 2: Messages
    const messageHeaders = ['#', 'Role', 'Content', 'Model', 'Timestamp', 'Tokens'];
    const messageRows = transformedMessages.map((msg, index) => [
      index + 1,
      msg.role,
      msg.content,
      msg.model || '',
      msg.createdAt.toLocaleString(),
      msg.tokens?.total || '',
    ]);

    const messageData = [messageHeaders, ...messageRows];
    const messageSheet = XLSX.utils.aoa_to_sheet(messageData);
    
    // Set column widths
    messageSheet['!cols'] = [
      { wch: 5 },   // #
      { wch: 12 },  // Role
      { wch: 80 },  // Content
      { wch: 20 },  // Model
      { wch: 20 },  // Timestamp
      { wch: 10 },  // Tokens
    ];
    
    XLSX.utils.book_append_sheet(workbook, messageSheet, 'Messages');

    // Sheet 3: Statistics
    const userMsgs = messages.filter((m) => m.role === 'user').length;
    const assistantMsgs = messages.filter((m) => m.role === 'assistant').length;
    const totalTokens = messages.reduce((sum, m) => sum + (m.tokens?.total || 0), 0);

    // Calculate media statistics
    let imageCount = 0;
    let aiGeneratedImageCount = 0;
    let videoCount = 0;
    let aiGeneratedVideoCount = 0;
    let totalVideoDuration = 0;
    const videoProviders = new Set<string>();
    const videoModels = new Set<string>();

    for (const msg of transformedMessages) {
      if (msg.parts) {
        for (const part of msg.parts) {
          if (part.type === 'image') {
            imageCount++;
            if (part.isGenerated) aiGeneratedImageCount++;
          }
          if (part.type === 'video') {
            videoCount++;
            if (part.isGenerated) aiGeneratedVideoCount++;
            if (part.durationSeconds) totalVideoDuration += part.durationSeconds;
            if (part.provider) videoProviders.add(part.provider);
            if (part.model) videoModels.add(part.model);
          }
        }
      }
      // Also check attachments
      if (msg.attachments) {
        for (const att of msg.attachments) {
          if (att.type === 'image') imageCount++;
        }
      }
    }

    const statsData: (string | number)[][] = [
      ['Statistic', 'Value'],
      ['Total Messages', messages.length],
      ['User Messages', userMsgs],
      ['Assistant Messages', assistantMsgs],
      ['Total Tokens', totalTokens],
      ['Avg Tokens/Message', Math.round(totalTokens / messages.length) || 0],
      ['', ''],
      ['--- Media Statistics ---', ''],
      ['Total Images', imageCount],
      ['AI Generated Images', aiGeneratedImageCount],
      ['Total Videos', videoCount],
      ['AI Generated Videos', aiGeneratedVideoCount],
    ];

    if (totalVideoDuration > 0) {
      const mins = Math.floor(totalVideoDuration / 60);
      const secs = Math.floor(totalVideoDuration % 60);
      statsData.push(['Total Video Duration', `${mins}m ${secs}s`]);
    }

    if (videoProviders.size > 0) {
      statsData.push(['Video Providers', Array.from(videoProviders).join(', ')]);
    }

    if (videoModels.size > 0) {
      statsData.push(['Video Models', Array.from(videoModels).join(', ')]);
    }

    const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
    statsSheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');

    // Sheet 4: Media Details (if any media exists)
    if (imageCount > 0 || videoCount > 0) {
      const mediaHeaders = ['#', 'Type', 'AI Generated', 'Description', 'Prompt', 'Dimensions', 'Duration', 'Provider/Model'];
      const mediaRows: (string | number)[][] = [];
      let mediaIndex = 1;

      for (const msg of transformedMessages) {
        if (msg.parts) {
          for (const part of msg.parts) {
            if (part.type === 'image') {
              mediaRows.push([
                mediaIndex++,
                'Image',
                part.isGenerated ? 'Yes' : 'No',
                part.alt || '',
                part.prompt || '',
                part.width && part.height ? `${part.width}×${part.height}` : '',
                '',
                '',
              ]);
            }
            if (part.type === 'video') {
              const duration = part.durationSeconds 
                ? `${Math.floor(part.durationSeconds / 60)}:${String(Math.floor(part.durationSeconds % 60)).padStart(2, '0')}`
                : '';
              mediaRows.push([
                mediaIndex++,
                'Video',
                part.isGenerated ? 'Yes' : 'No',
                part.title || '',
                part.prompt || '',
                part.width && part.height ? `${part.width}×${part.height}` : '',
                duration,
                [part.provider, part.model].filter(Boolean).join(' / '),
              ]);
            }
          }
        }
      }

      if (mediaRows.length > 0) {
        const mediaData = [mediaHeaders, ...mediaRows];
        const mediaSheet = XLSX.utils.aoa_to_sheet(mediaData);
        mediaSheet['!cols'] = [
          { wch: 5 },   // #
          { wch: 8 },   // Type
          { wch: 12 },  // AI Generated
          { wch: 30 },  // Description
          { wch: 50 },  // Prompt
          { wch: 12 },  // Dimensions
          { wch: 10 },  // Duration
          { wch: 25 },  // Provider/Model
        ];
        XLSX.utils.book_append_sheet(workbook, mediaSheet, 'Media');
      }
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const exportFilename = filename || generateExcelFilename(session.title);

    pluginHooks.dispatchExportComplete(session.id, 'excel', true);

    return {
      success: true,
      filename: ensureExcelExtension(exportFilename),
      blob,
    };
  } catch (error) {
    pluginHooks.dispatchExportComplete(session.id, 'excel', false);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export chat to Excel',
    };
  }
}

/**
 * Export JSON data to Excel
 */
export async function exportJSONToExcel(
  data: Record<string, unknown>[],
  filename: string,
  options: ExcelExportOptions = {}
): Promise<ExcelExportResult> {
  try {
    const XLSX = await import('xlsx');
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (data.length === 0) {
      return {
        success: false,
        error: 'No data to export',
      };
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Convert JSON to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-width columns
    if (opts.autoWidth) {
      const headers = Object.keys(data[0]);
      const colWidths = headers.map((header) => {
        const maxDataWidth = data.reduce((max, row) => {
          const value = String(row[header] || '');
          return Math.max(max, value.length);
        }, header.length);
        return Math.min(maxDataWidth + 2, 50);
      });
      worksheet['!cols'] = colWidths.map((w) => ({ wch: w }));
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, opts.sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return {
      success: true,
      filename: ensureExcelExtension(filename),
      blob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export JSON to Excel',
    };
  }
}

/**
 * Download Excel blob as file
 */
export function downloadExcel(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ensureExcelExtension(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export and download in one step
 */
export async function exportAndDownloadExcel(
  tableData: TableData,
  filename: string,
  options?: ExcelExportOptions
): Promise<ExcelExportResult> {
  const result = await exportTableToExcel(tableData, filename, options);
  
  if (result.success && result.blob && result.filename) {
    downloadExcel(result.blob, result.filename);
  }
  
  return result;
}

/**
 * Calculate optimal column widths based on content
 */
function calculateColumnWidths(
  data: (string | number | boolean | null | undefined)[][]
): number[] {
  if (data.length === 0) return [];

  const columnCount = Math.max(...data.map((row) => row.length));
  const widths: number[] = new Array(columnCount).fill(8);

  for (const row of data) {
    row.forEach((cell, index) => {
      const cellWidth = String(cell ?? '').length;
      widths[index] = Math.max(widths[index], cellWidth);
    });
  }

  return widths;
}

/**
 * Sanitize sheet name for Excel compatibility
 */
function sanitizeSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no special chars: \ / * ? : [ ]
  return name
    .replace(/[\\/*?:\[\]]/g, '_')
    .slice(0, 31)
    .trim() || 'Sheet';
}

/**
 * Ensure filename has .xlsx extension
 */
function ensureExcelExtension(filename: string): string {
  if (!filename.toLowerCase().endsWith('.xlsx')) {
    return `${filename}.xlsx`;
  }
  return filename;
}

/**
 * Generate filename from session title
 */
function generateExcelFilename(title: string): string {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const timestamp = new Date().toISOString().slice(0, 10);
  return `${safeTitle}-${timestamp}.xlsx`;
}

/**
 * Parse markdown table to TableData format
 */
export function parseMarkdownTable(markdown: string): TableData | null {
  const lines = markdown.trim().split('\n');
  
  if (lines.length < 2) return null;

  // Find table lines (lines starting with |)
  const tableLines = lines.filter((line) => line.trim().startsWith('|'));
  
  if (tableLines.length < 2) return null;

  // Parse header row
  const headerLine = tableLines[0];
  const headers = headerLine
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);

  // Skip separator row (second line with ---)
  const dataLines = tableLines.slice(2);

  // Parse data rows
  const rows = dataLines.map((line) =>
    line
      .split('|')
      .map((cell) => cell.trim())
      .filter((_, index, arr) => index > 0 && index < arr.length - 1 || arr.length === headers.length + 2 ? index > 0 && index < arr.length - 1 : true)
      .slice(0, headers.length)
  );

  // Clean up rows to match header count
  const cleanedRows = rows.map((row) => {
    while (row.length < headers.length) {
      row.push('');
    }
    return row.slice(0, headers.length);
  });

  return {
    headers,
    rows: cleanedRows,
  };
}

/**
 * Convert HTML table to TableData format
 */
export function parseHTMLTableToData(html: string): TableData | null {
  // Simple HTML table parser using regex (for basic tables)
  const headerMatch = html.match(/<th[^>]*>(.*?)<\/th>/gi);
  const rowMatches = html.match(/<tr[^>]*>(.*?)<\/tr>/gi);

  if (!rowMatches || rowMatches.length < 1) return null;

  const headers: string[] = [];
  const rows: string[][] = [];

  // Extract headers
  if (headerMatch) {
    for (const th of headerMatch) {
      const content = th.replace(/<\/?th[^>]*>/gi, '').trim();
      headers.push(stripHtmlTags(content));
    }
  }

  // Extract rows
  for (const tr of rowMatches) {
    const cellMatches = tr.match(/<td[^>]*>(.*?)<\/td>/gi);
    if (cellMatches) {
      const row = cellMatches.map((td) => {
        const content = td.replace(/<\/?td[^>]*>/gi, '').trim();
        return stripHtmlTags(content);
      });
      if (row.length > 0) {
        rows.push(row);
      }
    }
  }

  // If no headers found, use first row as headers
  if (headers.length === 0 && rows.length > 0) {
    headers.push(...rows.shift()!);
  }

  return {
    headers,
    rows,
  };
}

/**
 * Strip HTML tags from string
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}
