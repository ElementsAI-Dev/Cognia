/**
 * Batch Export - Export multiple sessions at once
 */

import type { UIMessage, Session } from '@/types';
import { exportToRichMarkdown, exportToRichJSON } from '../text/rich-markdown';
import { exportToAnimatedHTML } from '../html/animated-html';
import { exportToHTML, exportToPlainText } from '../index';
import JSZip from 'jszip';

export type BatchExportFormat = 'markdown' | 'json' | 'html' | 'animated-html' | 'text' | 'mixed';

export interface BatchExportOptions {
  format: BatchExportFormat;
  includeIndex?: boolean;
  includeMetadata?: boolean;
  includeAttachments?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export interface SessionWithMessages {
  session: Session;
  messages: UIMessage[];
}

export interface BatchExportResult {
  success: boolean;
  filename: string;
  blob?: Blob;
  error?: string;
}

/**
 * Export multiple sessions to a ZIP file
 */
export async function exportSessionsToZip(
  sessions: SessionWithMessages[],
  options: BatchExportOptions
): Promise<BatchExportResult> {
  const zip = new JSZip();
  const exportedAt = new Date();
  const timestamp = exportedAt.toISOString().slice(0, 10);
  const filename = `cognia-export-${timestamp}.zip`;

  try {
    // Create index file
    if (options.includeIndex !== false) {
      const indexContent = generateIndexFile(sessions, exportedAt, options);
      zip.file('README.md', indexContent);
    }

    // Export each session
    for (const { session, messages } of sessions) {
      const safeTitle = sanitizeFilename(session.title);
      const folderName = `${safeTitle}-${session.id.slice(0, 8)}`;

      const exportData = {
        session,
        messages,
        exportedAt,
        includeMetadata: options.includeMetadata ?? true,
        includeAttachments: options.includeAttachments ?? true,
      };

      switch (options.format) {
        case 'markdown':
          zip.file(`${folderName}/conversation.md`, exportToRichMarkdown(exportData));
          break;

        case 'json':
          zip.file(`${folderName}/conversation.json`, exportToRichJSON(exportData));
          break;

        case 'html':
          zip.file(`${folderName}/conversation.html`, exportToHTML(exportData));
          break;

        case 'animated-html':
          zip.file(
            `${folderName}/conversation.html`,
            exportToAnimatedHTML({
              ...exportData,
              options: { theme: options.theme ?? 'system' },
            })
          );
          break;

        case 'text':
          zip.file(`${folderName}/conversation.txt`, exportToPlainText(exportData));
          break;

        case 'mixed':
          // Export in multiple formats
          zip.file(`${folderName}/conversation.md`, exportToRichMarkdown(exportData));
          zip.file(`${folderName}/conversation.json`, exportToRichJSON(exportData));
          zip.file(
            `${folderName}/conversation.html`,
            exportToAnimatedHTML({
              ...exportData,
              options: { theme: options.theme ?? 'system' },
            })
          );
          break;
      }
    }

    // Generate ZIP blob
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return { success: true, filename, blob };
  } catch (error) {
    return {
      success: false,
      filename,
      error: error instanceof Error ? error.message : 'Unknown error during export',
    };
  }
}

/**
 * Generate index/readme file for the export
 */
function generateIndexFile(
  sessions: SessionWithMessages[],
  exportedAt: Date,
  options: BatchExportOptions
): string {
  const lines: string[] = [];

  lines.push('# Cognia Export');
  lines.push('');
  lines.push(`**Exported:** ${exportedAt.toLocaleString()}`);
  lines.push(`**Total Sessions:** ${sessions.length}`);
  lines.push(`**Format:** ${options.format}`);
  lines.push('');
  lines.push('## Sessions');
  lines.push('');
  lines.push('| # | Title | Provider | Model | Mode | Messages | Date |');
  lines.push('|---|-------|----------|-------|------|----------|------|');

  sessions.forEach(({ session, messages }, index) => {
    const safeTitle = session.title.replace(/\|/g, '\\|');
    const date = session.createdAt.toLocaleDateString();
    lines.push(
      `| ${index + 1} | ${safeTitle} | ${session.provider} | ${session.model} | ${session.mode} | ${messages.length} | ${date} |`
    );
  });

  lines.push('');
  lines.push('## Directory Structure');
  lines.push('');
  lines.push('```');
  sessions.forEach(({ session }) => {
    const safeTitle = sanitizeFilename(session.title);
    const folderName = `${safeTitle}-${session.id.slice(0, 8)}`;
    lines.push(`├── ${folderName}/`);
    switch (options.format) {
      case 'markdown':
        lines.push(`│   └── conversation.md`);
        break;
      case 'json':
        lines.push(`│   └── conversation.json`);
        break;
      case 'html':
      case 'animated-html':
        lines.push(`│   └── conversation.html`);
        break;
      case 'text':
        lines.push(`│   └── conversation.txt`);
        break;
      case 'mixed':
        lines.push(`│   ├── conversation.md`);
        lines.push(`│   ├── conversation.json`);
        lines.push(`│   └── conversation.html`);
        break;
    }
  });
  lines.push('└── README.md');
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('*Generated by Cognia*');

  return lines.join('\n');
}

/**
 * Sanitize filename for filesystem compatibility
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') // Allow Chinese characters
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Download ZIP file
 */
export function downloadZip(blob: Blob, filename: string): void {
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
 * Calculate export size estimate (in KB)
 */
export function estimateExportSize(sessions: SessionWithMessages[]): number {
  let totalChars = 0;

  for (const { session, messages } of sessions) {
    // Session metadata
    totalChars += JSON.stringify(session).length;

    // Messages
    for (const msg of messages) {
      totalChars += msg.content.length;
      if (msg.parts) {
        totalChars += JSON.stringify(msg.parts).length;
      }
    }
  }

  // Rough estimate: 1 char = 1 byte for ASCII, multiply by format overhead
  return Math.ceil(totalChars / 1024);
}

/**
 * Export all app data as backup
 */
export async function exportFullBackup(data: {
  sessions: SessionWithMessages[];
  settings: Record<string, unknown>;
  presets?: unknown[];
  artifacts?: Record<string, unknown>;
}): Promise<BatchExportResult> {
  const zip = new JSZip();
  const exportedAt = new Date();
  const timestamp = exportedAt.toISOString().slice(0, 10);
  const filename = `cognia-backup-${timestamp}.zip`;

  try {
    // Backup metadata
    const metadata = {
      version: '2.0',
      exportedAt: exportedAt.toISOString(),
      type: 'full-backup',
      sessionCount: data.sessions.length,
    };
    zip.file('backup-info.json', JSON.stringify(metadata, null, 2));

    // Settings
    zip.file('settings.json', JSON.stringify(data.settings, null, 2));

    // Presets
    if (data.presets && data.presets.length > 0) {
      zip.file('presets.json', JSON.stringify(data.presets, null, 2));
    }

    // Artifacts
    if (data.artifacts && Object.keys(data.artifacts).length > 0) {
      zip.file('artifacts.json', JSON.stringify(data.artifacts, null, 2));
    }

    // Sessions with messages
    const sessionsFolder = zip.folder('sessions');
    if (sessionsFolder) {
      for (const { session, messages } of data.sessions) {
        const sessionData = {
          session: {
            ...session,
            createdAt: session.createdAt.toISOString(),
            updatedAt: session.updatedAt.toISOString(),
          },
          messages: messages.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
          })),
        };
        sessionsFolder.file(`${session.id}.json`, JSON.stringify(sessionData, null, 2));
      }
    }

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    return { success: true, filename, blob };
  } catch (error) {
    return {
      success: false,
      filename,
      error: error instanceof Error ? error.message : 'Unknown error during backup',
    };
  }
}
