/**
 * Plugin Export API Implementation
 * 
 * Provides export capabilities to plugins.
 */

import { useSessionStore } from '@/stores/chat/session-store';
import { useProjectStore } from '@/stores/project/project-store';
import { messageRepository } from '@/lib/db';
import {
  exportToRichMarkdown,
  exportToRichJSON,
  exportToHTML,
  exportToPlainText,
  exportToAnimatedHTML,
  generateFilename as generateExportFilename,
} from '@/lib/export';
import { createPluginSystemLogger, loggers } from '../core/logger';
import type {
  PluginExportAPI,
  ExportFormat,
  ExportOptions,
  ExportData,
  ExportResult,
  CustomExporter,
} from '@/types/plugin/plugin-extended';

// Registry for custom exporters
const customExporters = new Map<string, CustomExporter>();

/**
 * Create the Export API for a plugin
 */
export function createExportAPI(pluginId: string): PluginExportAPI {
  const logger = createPluginSystemLogger(pluginId);
  return {
    exportSession: async (sessionId: string, options: ExportOptions): Promise<ExportResult> => {
      try {
        const sessionStore = useSessionStore.getState();
        const session = sessionStore.sessions.find(s => s.id === sessionId);
        
        if (!session) {
          return { success: false, error: 'Session not found' };
        }

        const messages = await messageRepository.getBySessionId(sessionId);
        const exportedAt = new Date();

        const exportData: ExportData = {
          session,
          messages,
          exportedAt,
        };

        return await performExport(exportData, options, pluginId);
      } catch (error) {
        logger.error('Export session failed:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Export failed' 
        };
      }
    },

    exportProject: async (projectId: string, options: ExportOptions): Promise<ExportResult> => {
      try {
        const projectStore = useProjectStore.getState();
        const project = projectStore.projects.find(p => p.id === projectId);
        
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        const exportedAt = new Date();
        const exportData: ExportData = {
          project,
          exportedAt,
        };

        return await performExport(exportData, options, pluginId);
      } catch (error) {
        logger.error('Export project failed:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Export failed' 
        };
      }
    },

    exportMessages: async (messages, options: ExportOptions): Promise<ExportResult> => {
      try {
        const exportedAt = new Date();
        const exportData: ExportData = {
          messages,
          exportedAt,
        };

        return await performExport(exportData, options, pluginId);
      } catch (error) {
        logger.error('Export messages failed:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Export failed' 
        };
      }
    },

    download: (result: ExportResult, filename?: string) => {
      if (result.success && result.blob) {
        const finalFilename = filename || result.filename || 'export';
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logger.info(`Downloaded: ${finalFilename}`);
      }
    },

    registerExporter: (exporter: CustomExporter) => {
      const exporterId = `${pluginId}:${exporter.id}`;
      customExporters.set(exporterId, { ...exporter, id: exporterId });
      logger.info(`Registered exporter: ${exporter.name}`);

      return () => {
        customExporters.delete(exporterId);
        logger.info(`Unregistered exporter: ${exporter.name}`);
      };
    },

    getAvailableFormats: (): ExportFormat[] => {
      return ['markdown', 'json', 'html', 'animated-html', 'pdf', 'text'];
    },

    getCustomExporters: (): CustomExporter[] => {
      return Array.from(customExporters.values());
    },

    generateFilename: (title: string, extension: string): string => {
      return generateExportFilename(title, extension);
    },
  };
}

/**
 * Perform the actual export
 */
async function performExport(
  data: ExportData, 
  options: ExportOptions, 
  _pluginId: string
): Promise<ExportResult> {
  const { format, ...restOptions } = options;
  
  let content: string;
  let mimeType: string;
  let extension: string;

  // Check for custom exporter first
  const customExporter = Array.from(customExporters.values())
    .find(e => e.format === format);
  
  if (customExporter) {
    try {
      const result = await customExporter.export(data);
      const blob = result instanceof Blob 
        ? result 
        : new Blob([result], { type: customExporter.mimeType });
      
      return {
        success: true,
        blob,
        filename: generateExportFilename(
          data.session?.title || data.project?.name || 'export',
          customExporter.extension
        ),
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Custom export failed' 
      };
    }
  }

  // Built-in formats
  switch (format) {
    case 'markdown':
      if (!data.session || !data.messages) {
        return { success: false, error: 'Session and messages required for markdown export' };
      }
      content = exportToRichMarkdown({
        session: data.session,
        messages: data.messages,
        exportedAt: data.exportedAt,
        includeMetadata: restOptions.includeMetadata,
        includeAttachments: restOptions.includeAttachments,
      });
      mimeType = 'text/markdown';
      extension = 'md';
      break;

    case 'json':
      if (!data.session || !data.messages) {
        return { success: false, error: 'Session and messages required for JSON export' };
      }
      content = exportToRichJSON({
        session: data.session,
        messages: data.messages,
        exportedAt: data.exportedAt,
      });
      mimeType = 'application/json';
      extension = 'json';
      break;

    case 'html':
      if (!data.session || !data.messages) {
        return { success: false, error: 'Session and messages required for HTML export' };
      }
      content = exportToHTML({
        session: data.session,
        messages: data.messages,
        exportedAt: data.exportedAt,
      });
      mimeType = 'text/html';
      extension = 'html';
      break;

    case 'animated-html':
      if (!data.session || !data.messages) {
        return { success: false, error: 'Session and messages required for animated HTML export' };
      }
      content = exportToAnimatedHTML({
        session: data.session,
        messages: data.messages,
        exportedAt: data.exportedAt,
        options: {
          theme: restOptions.theme,
          showTimestamps: restOptions.showTimestamps,
          showControls: true,
          autoPlay: false,
        },
      });
      mimeType = 'text/html';
      extension = 'html';
      break;

    case 'text':
      if (!data.session || !data.messages) {
        return { success: false, error: 'Session and messages required for text export' };
      }
      content = exportToPlainText({
        session: data.session,
        messages: data.messages,
        exportedAt: data.exportedAt,
      });
      mimeType = 'text/plain';
      extension = 'txt';
      break;

    default:
      return { success: false, error: `Unsupported format: ${format}` };
  }

  const blob = new Blob([content], { type: mimeType });
  const filename = generateExportFilename(
    data.session?.title || data.project?.name || 'export',
    extension
  );

  loggers.manager.info(`Exported as ${format}: ${filename}`);

  return {
    success: true,
    blob,
    filename,
  };
}

/**
 * Clear all custom exporters (for testing purposes)
 */
export function clearCustomExporters(): void {
  customExporters.clear();
}
