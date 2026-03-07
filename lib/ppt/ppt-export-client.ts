import { executePPTExport } from '@/lib/ai/tools/ppt-tool';
import { downloadPPTX } from '@/lib/export/document/pptx-export';
import type { PPTPresentation } from '@/types/workflow';
import { classifyPPTError, toPPTError, type PPTError, type PPTErrorCode } from './ppt-state';

export type PPTClientExportFormat = 'marp' | 'html' | 'reveal' | 'pdf' | 'pptx';

export interface PPTExportClientResult {
  success: boolean;
  filename?: string;
  error?: PPTError;
}

export interface PPTExportClientOptions {
  includeNotes?: boolean;
  includeAnimations?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

function createBlobDownload(content: string, mimeType: string, filename: string): void {
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

function openPdfPreview(content: string): boolean {
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return popup !== null;
}

function mapErrorCode(format: PPTClientExportFormat): PPTErrorCode {
  return format === 'pptx' ? 'export_failed' : 'export_failed';
}

export async function exportPresentationClient(
  presentation: PPTPresentation,
  format: PPTClientExportFormat,
  options: PPTExportClientOptions = {}
): Promise<PPTExportClientResult> {
  if (!presentation || !Array.isArray(presentation.slides) || presentation.slides.length === 0) {
    return {
      success: false,
      error: toPPTError('invalid_presentation'),
    };
  }

  try {
    if (format === 'pptx') {
      const result = await downloadPPTX(presentation, {
        includeNotes: options.includeNotes ?? true,
        includeSlideNumbers: true,
        author: presentation.author || 'Cognia',
        quality: options.quality ?? 'high',
      });

      if (!result.success) {
        return {
          success: false,
          error: toPPTError('export_failed', result.error),
        };
      }

      return {
        success: true,
        filename: result.filename,
      };
    }

    const result = executePPTExport({
      presentation,
      format,
      includeNotes: options.includeNotes ?? true,
      includeAnimations: options.includeAnimations ?? false,
      quality: options.quality ?? 'high',
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: toPPTError(mapErrorCode(format), result.error),
      };
    }

    const payload = result.data as { content: string; filename: string };
    if (!payload.content || !payload.filename) {
      return {
        success: false,
        error: toPPTError('export_failed', 'Export payload is incomplete.'),
      };
    }

    if (format === 'pdf') {
      const opened = openPdfPreview(payload.content);
      if (!opened) {
        return {
          success: false,
          error: toPPTError('popup_blocked'),
        };
      }
      return { success: true, filename: payload.filename };
    }

    const mimeType = format === 'marp' ? 'text/markdown' : 'text/html';
    createBlobDownload(payload.content, mimeType, payload.filename);
    return {
      success: true,
      filename: payload.filename,
    };
  } catch (error) {
    return {
      success: false,
      error: classifyPPTError(error, mapErrorCode(format)),
    };
  }
}

