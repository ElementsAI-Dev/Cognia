/**
 * Export utilities for chat conversations
 *
 * Subdirectories:
 * - document/ - Document format exports (Word, PDF, Excel, PPTX, Google Sheets)
 * - html/     - HTML format exports (Beautiful HTML, Animated HTML, Syntax Themes)
 * - diagram/  - Diagram generation (Chat diagrams, Agent diagrams)
 * - image/    - Image export utilities
 * - agent/    - Agent-specific exports (Demo export)
 * - social/   - Social sharing exports
 * - text/     - Text format exports (Rich Markdown)
 * - batch/    - Batch export utilities
 */

import type { UIMessage, Session } from '@/types';

// Re-export from subdirectories
export * from './text';
export * from './html';
export * from './batch';
export * from './document';
export * from './social';
export * from './diagram';
export {
  exportToImage,
  downloadAsImage,
  exportMessageAsImage,
  generateThumbnail,
  copyImageToClipboard as copyChatImageToClipboard,
  getImageExportFormats,
  estimateImageSize,
  type ImageExportOptions,
  type ImageExportResult,
} from './image';
export * from './agent';

export interface ExportData {
  session: Session;
  messages: UIMessage[];
  exportedAt: Date;
}

/**
 * Export conversation to Markdown format
 * @deprecated Use exportToRichMarkdown from './text/rich-markdown' for enhanced output with message parts, attachments, and tokens
 */
export function exportToMarkdown(data: ExportData): string {
  const { session, messages, exportedAt } = data;

  const lines: string[] = [];

  // Header
  lines.push(`# ${session.title}`);
  lines.push('');
  lines.push(`**Date:** ${session.createdAt.toLocaleDateString()}`);
  lines.push(`**Model:** ${session.provider} / ${session.model}`);
  lines.push(`**Mode:** ${session.mode}`);
  lines.push(`**Exported:** ${exportedAt.toLocaleString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Messages
  for (const message of messages) {
    const role = message.role === 'user' ? '**You**' : '**Assistant**';
    const timestamp = message.createdAt.toLocaleTimeString();

    lines.push(`### ${role} (${timestamp})`);
    lines.push('');
    lines.push(message.content);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export conversation to JSON format
 * @deprecated Use exportToRichJSON from './text/rich-markdown' for enhanced output with message parts and attachments
 */
export function exportToJSON(data: ExportData): string {
  return JSON.stringify(
    {
      version: '1.0',
      session: {
        id: data.session.id,
        title: data.session.title,
        provider: data.session.provider,
        model: data.session.model,
        mode: data.session.mode,
        systemPrompt: data.session.systemPrompt,
        createdAt: data.session.createdAt.toISOString(),
        updatedAt: data.session.updatedAt.toISOString(),
      },
      messages: data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model: m.model,
        provider: m.provider,
        tokens: m.tokens,
        attachments: m.attachments,
        createdAt: m.createdAt.toISOString(),
      })),
      exportedAt: data.exportedAt.toISOString(),
    },
    null,
    2
  );
}

/**
 * Export conversation to HTML format (standalone file)
 * @deprecated Use exportToBeautifulHTML from './html/beautiful-html' for enhanced output with syntax highlighting and themes
 */
export function exportToHTML(data: ExportData): string {
  const { session, messages, exportedAt } = data;

  const messageHTML = messages
    .map((m) => {
      const isUser = m.role === 'user';
      const bgColor = isUser ? '#e3f2fd' : '#f5f5f5';
      const alignment = isUser ? 'flex-end' : 'flex-start';
      const borderColor = isUser ? '#2196F3' : '#9e9e9e';

      // Escape HTML and convert newlines to <br>
      const content = escapeHtml(m.content).replace(/\n/g, '<br>');

      return `
        <div style="display: flex; justify-content: ${alignment}; margin-bottom: 16px;">
          <div style="max-width: 80%; padding: 12px 16px; background: ${bgColor}; border-radius: 12px; border-left: 3px solid ${borderColor};">
            <div style="font-weight: 600; margin-bottom: 4px; color: ${isUser ? '#1976D2' : '#424242'};">
              ${isUser ? 'You' : 'Assistant'}
            </div>
            <div style="white-space: pre-wrap; line-height: 1.5;">
              ${content}
            </div>
            <div style="font-size: 11px; color: #9e9e9e; margin-top: 8px;">
              ${m.createdAt.toLocaleTimeString()}
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(session.title)} - Cognia Export</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #fafafa;
      color: #212121;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 30px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    .header .meta {
      font-size: 14px;
      opacity: 0.9;
    }
    .messages {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #9e9e9e;
      font-size: 12px;
    }
    pre {
      background: #263238;
      color: #aed581;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }
    code {
      background: #e8e8e8;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(session.title)}</h1>
      <div class="meta">
        ${session.provider} / ${session.model} • ${session.mode} mode<br>
        ${session.createdAt.toLocaleDateString()} • ${messages.length} messages
      </div>
    </div>

    <div class="messages">
      ${messageHTML}
    </div>

    <div class="footer">
      Exported from Cognia on ${exportedAt.toLocaleString()}
    </div>
  </div>
</body>
</html>
  `.trim();
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
 * Download file with given content
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate safe filename from session title
 */
export function generateFilename(title: string, extension: string): string {
  const safeTitle = title
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const timestamp = new Date().toISOString().slice(0, 10);
  return `${safeTitle || 'export'}-${timestamp}.${extension}`;
}

/**
 * Export conversation to PDF format
 * Uses browser print functionality for PDF generation
 * @deprecated Use exportToBeautifulPDF from './document/beautiful-pdf' for enhanced PDF with cover page and styling
 */
export async function exportToPDF(data: ExportData): Promise<void> {
  const htmlContent = exportToHTML(data);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups.');
  }

  // Write the HTML content
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    // Close after a delay to allow print dialog
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  };
}

/**
 * Export conversation to plain text format
 * @deprecated Use exportToRichMarkdown from './text/rich-markdown' for enhanced plain-text-like output
 */
export function exportToPlainText(data: ExportData): string {
  const { session, messages, exportedAt } = data;

  const lines: string[] = [];

  // Header
  lines.push(`${session.title}`);
  lines.push('='.repeat(session.title.length));
  lines.push('');
  lines.push(`Date: ${session.createdAt.toLocaleDateString()}`);
  lines.push(`Model: ${session.provider} / ${session.model}`);
  lines.push(`Mode: ${session.mode}`);
  lines.push(`Exported: ${exportedAt.toLocaleString()}`);
  lines.push('');
  lines.push('-'.repeat(50));
  lines.push('');

  // Messages
  for (const message of messages) {
    const role = message.role === 'user' ? 'You' : 'Assistant';
    const timestamp = message.createdAt.toLocaleTimeString();

    lines.push(`[${role}] (${timestamp})`);
    lines.push('');
    lines.push(message.content);
    lines.push('');
    lines.push('-'.repeat(50));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Copy conversation to clipboard
 */
export async function copyToClipboard(data: ExportData): Promise<void> {
  const text = exportToPlainText(data);
  await navigator.clipboard.writeText(text);
}
