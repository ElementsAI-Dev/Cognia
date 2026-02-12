import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, UIMessage } from '@/types';
import type { BeautifulExportFormat, BeautifulExportOptions } from '@/types/export/beautiful-export';
import type { CustomSyntaxTheme } from '@/stores/settings';
import { DEFAULT_EXPORT_OPTIONS, FORMAT_CONFIG } from '@/lib/export/constants';

/**
 * Hook for managing export options with localStorage persistence
 */
export function useExportOptions() {
  const [selectedFormat, setSelectedFormat] = useState<BeautifulExportFormat>(() => {
    try {
      const saved = localStorage.getItem('cognia-export-format');
      if (saved && saved in FORMAT_CONFIG) return saved as BeautifulExportFormat;
    } catch { /* ignore */ }
    return 'beautiful-html';
  });

  const [options, setOptions] = useState<BeautifulExportOptions>(() => {
    try {
      const saved = localStorage.getItem('cognia-export-options');
      if (saved) return { ...DEFAULT_EXPORT_OPTIONS, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return DEFAULT_EXPORT_OPTIONS;
  });

  const persistOptions = useCallback(() => {
    try {
      localStorage.setItem('cognia-export-format', selectedFormat);
      localStorage.setItem('cognia-export-options', JSON.stringify(options));
    } catch { /* ignore */ }
  }, [selectedFormat, options]);

  return { selectedFormat, setSelectedFormat, options, setOptions, persistOptions };
}

/**
 * Hook for generating export preview content
 */
export function useExportPreview(
  open: boolean,
  session: Session,
  messages: UIMessage[],
  selectedFormat: BeautifulExportFormat,
  options: BeautifulExportOptions,
  customThemes: CustomSyntaxTheme[]
) {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewText, setPreviewText] = useState<string>('');
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open || messages.length === 0) return;

    const generatePreview = async () => {
      try {
        if (selectedFormat === 'beautiful-html' || selectedFormat === 'pdf') {
          const { exportToBeautifulHTML } = await import('@/lib/export/html/beautiful-html');
          const html = exportToBeautifulHTML({
            session,
            messages: messages.slice(0, 3),
            exportedAt: new Date(),
            options: {
              theme: options.theme,
              syntaxTheme: options.syntaxTheme,
              customThemes: customThemes,
              showTimestamps: options.showTimestamps,
              showTokens: options.showTokens,
              showThinkingProcess: options.showThinkingProcess,
              showToolCalls: options.showToolCalls,
              includeCoverPage: false,
              includeTableOfContents: false,
              syntaxHighlighting: options.syntaxHighlighting,
              compactMode: options.compactMode,
            },
          });
          setPreviewHtml(html);
          setPreviewText('');
        } else if (selectedFormat === 'animated-html') {
          const { exportToAnimatedHTML } = await import('@/lib/export');
          const html = exportToAnimatedHTML({
            session,
            messages: messages.slice(0, 3),
            exportedAt: new Date(),
            options: { theme: options.theme, showTimestamps: options.showTimestamps, showControls: true, autoPlay: false },
          });
          setPreviewHtml(html);
          setPreviewText('');
        } else if (selectedFormat === 'markdown') {
          const { exportToRichMarkdown } = await import('@/lib/export');
          const md = exportToRichMarkdown({
            session,
            messages: messages.slice(0, 5),
            exportedAt: new Date(),
            includeMetadata: true,
          });
          setPreviewText(md);
          setPreviewHtml('');
        } else if (selectedFormat === 'json') {
          const { exportToRichJSON } = await import('@/lib/export');
          const json = exportToRichJSON({
            session,
            messages: messages.slice(0, 3),
            exportedAt: new Date(),
          });
          setPreviewText(json.slice(0, 2000) + '\n...');
          setPreviewHtml('');
        } else {
          setPreviewHtml('');
          setPreviewText('');
        }
      } catch (err) {
        console.error('Preview generation failed:', err);
        setPreviewHtml('');
        setPreviewText('');
      }
    };

    const debounce = setTimeout(generatePreview, 300);
    return () => clearTimeout(debounce);
  }, [open, messages, selectedFormat, options, session, customThemes]);

  return { previewHtml, previewText, previewRef };
}

/**
 * Hook for handling export execution across all formats
 */
export function useExportHandler(
  session: Session,
  messages: UIMessage[],
  selectedFormat: BeautifulExportFormat,
  options: BeautifulExportOptions,
  customThemes: CustomSyntaxTheme[],
  persistOptions: () => void
) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<BeautifulExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setExportSuccess(null);
    setExportError(null);
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const exportedAt = new Date();

      switch (selectedFormat) {
        case 'beautiful-html': {
          const { exportToBeautifulHTML, downloadFile, generateFilename } =
            await import('@/lib/export');
          const html = exportToBeautifulHTML({
            session,
            messages,
            exportedAt,
            options: {
              theme: options.theme,
              syntaxTheme: options.syntaxTheme,
              customThemes: customThemes,
              showTimestamps: options.showTimestamps,
              showTokens: options.showTokens,
              showThinkingProcess: options.showThinkingProcess,
              showToolCalls: options.showToolCalls,
              includeCoverPage: options.includeCoverPage,
              includeTableOfContents: options.includeTableOfContents,
              syntaxHighlighting: options.syntaxHighlighting,
              compactMode: options.compactMode,
            },
          });
          downloadFile(html, generateFilename(session.title, 'html'), 'text/html');
          break;
        }

        case 'pdf': {
          const { exportToBeautifulPDF } = await import('@/lib/export/document/beautiful-pdf');
          await exportToBeautifulPDF({
            session,
            messages,
            exportedAt,
            options: {
              theme: options.theme === 'system' ? 'light' : (options.theme as 'light' | 'dark'),
              showTimestamps: options.showTimestamps,
              showTokens: options.showTokens,
              showThinkingProcess: options.showThinkingProcess,
              showToolCalls: options.showToolCalls,
              includeCoverPage: options.includeCoverPage,
              includeTableOfContents: options.includeTableOfContents,
            },
          });
          break;
        }

        case 'markdown': {
          const { exportToRichMarkdown, downloadFile, generateFilename } =
            await import('@/lib/export');
          const markdown = exportToRichMarkdown({
            session,
            messages,
            exportedAt,
            includeMetadata: true,
            includeAttachments: true,
            includeTokens: options.showTokens,
          });
          downloadFile(markdown, generateFilename(session.title, 'md'), 'text/markdown');
          break;
        }

        case 'word': {
          const { generateWordDocument, downloadWordDocument } =
            await import('@/lib/export/document/word-document-generator');
          const result = await generateWordDocument(session, messages, {
            includeMetadata: true,
            includeTimestamps: options.showTimestamps,
            includeTokens: options.showTokens,
            showThinkingProcess: options.showThinkingProcess,
            showToolCalls: options.showToolCalls,
            includeCoverPage: options.includeCoverPage,
            tableOfContents: options.includeTableOfContents
              ? {
                  enabled: true,
                  title: 'Table of Contents',
                  levels: 3,
                  showPageNumbers: true,
                }
              : undefined,
            pageSize: options.pageLayout.pageSize,
            orientation: options.pageLayout.orientation,
            margins: options.pageLayout.margins,
          });
          if (result.success && result.blob && result.filename) {
            downloadWordDocument(result.blob, result.filename);
          } else {
            throw new Error(result.error || 'Word export failed');
          }
          break;
        }

        case 'excel': {
          const { exportChatToExcel, downloadExcel } =
            await import('@/lib/export/document/excel-export');
          const result = await exportChatToExcel(session, messages);
          if (result.success && result.blob && result.filename) {
            downloadExcel(result.blob, result.filename);
          } else {
            throw new Error(result.error || 'Excel export failed');
          }
          break;
        }

        case 'csv': {
          const { exportChatToCSV, downloadCSV } =
            await import('@/lib/export/document/google-sheets-export');
          const result = exportChatToCSV(session, messages);
          if (result.success && result.content && result.filename) {
            downloadCSV(result.content, result.filename);
          } else {
            throw new Error(result.error || 'CSV export failed');
          }
          break;
        }

        case 'animated-html': {
          const { exportToAnimatedHTML, downloadFile, generateFilename } =
            await import('@/lib/export');
          const html = exportToAnimatedHTML({
            session,
            messages,
            exportedAt,
            options: {
              theme: options.theme,
              showTimestamps: options.showTimestamps,
              showControls: true,
              autoPlay: false,
            },
          });
          downloadFile(html, generateFilename(session.title, 'html'), 'text/html');
          break;
        }

        case 'json': {
          const { exportToRichJSON, downloadFile, generateFilename } = await import('@/lib/export');
          const json = exportToRichJSON({ session, messages, exportedAt });
          downloadFile(json, generateFilename(session.title, 'json'), 'application/json');
          break;
        }
      }

      setExportSuccess(selectedFormat);
      persistOptions();
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, session, messages, options, customThemes, persistOptions]);

  return { isExporting, exportSuccess, exportError, handleExport, resetState };
}
