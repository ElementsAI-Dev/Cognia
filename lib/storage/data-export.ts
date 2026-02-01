/**
 * Data Export Utilities
 * Comprehensive data export with checksum and validation
 */

import { db } from '@/lib/db';
import type { ExportData } from './data-import';
import { generateChecksum } from './data-import';
import { loggers } from '@/lib/logger';

const log = loggers.store;

/**
 * Export options
 */
export interface ExportOptions {
  /** Include sessions from Zustand store */
  includeSessions?: boolean;
  /** Include settings */
  includeSettings?: boolean;
  /** Include artifacts */
  includeArtifacts?: boolean;
  /** Include IndexedDB data */
  includeIndexedDB?: boolean;
  /** Include checksum for integrity verification */
  includeChecksum?: boolean;
  /** Pretty print JSON */
  prettyPrint?: boolean;
}

/**
 * Default export options
 */
const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeSessions: true,
  includeSettings: true,
  includeArtifacts: true,
  includeIndexedDB: true,
  includeChecksum: true,
  prettyPrint: true,
};

/**
 * Create a full backup of all data
 */
export async function createFullBackup(
  options: Partial<ExportOptions> = {}
): Promise<ExportData> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };

  const exportData: ExportData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
  };

  // Export sessions from Zustand store
  if (opts.includeSessions) {
    try {
      const { useSessionStore } = await import('@/stores');
      exportData.sessions = useSessionStore.getState().sessions;
    } catch (error) {
      log.error('Failed to export sessions', error as Error);
    }
  }

  // Export settings
  if (opts.includeSettings) {
    try {
      const { useSettingsStore } = await import('@/stores');
      const state = useSettingsStore.getState();
      exportData.settings = {
        theme: state.theme,
        defaultProvider: state.defaultProvider,
        providerSettings: state.providerSettings,
        language: state.language,
      };
    } catch (error) {
      log.error('Failed to export settings', error as Error);
    }
  }

  // Export artifacts
  if (opts.includeArtifacts) {
    try {
      const { useArtifactStore } = await import('@/stores');
      const state = useArtifactStore.getState();
      exportData.artifacts = state.artifacts;
      exportData.canvasDocuments = state.canvasDocuments;
    } catch (error) {
      log.error('Failed to export artifacts', error as Error);
    }
  }

  // Export IndexedDB data
  if (opts.includeIndexedDB) {
    try {
      const [sessions, messages, documents, projects, workflows, summaries, knowledgeFiles] =
        await Promise.all([
          db.sessions.toArray(),
          db.messages.toArray(),
          db.documents.toArray(),
          db.projects.toArray(),
          db.workflows.toArray(),
          db.summaries.toArray(),
          db.knowledgeFiles.toArray(),
        ]);

      exportData.indexedDB = {
        sessions,
        messages,
        documents,
        projects,
      };

      // Add extended data if available
      if (workflows.length > 0) {
        (exportData.indexedDB as Record<string, unknown>).workflows = workflows;
      }
      if (summaries.length > 0) {
        (exportData.indexedDB as Record<string, unknown>).summaries = summaries;
      }
      if (knowledgeFiles.length > 0) {
        (exportData.indexedDB as Record<string, unknown>).knowledgeFiles = knowledgeFiles;
      }
    } catch (error) {
      log.error('Failed to export IndexedDB', error as Error);
    }
  }

  // Generate checksum
  if (opts.includeChecksum) {
    const dataString = JSON.stringify(exportData);
    exportData.checksum = generateChecksum(dataString);
  }

  return exportData;
}

/**
 * Export data to JSON string
 */
export async function exportToJSON(options: Partial<ExportOptions> = {}): Promise<string> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const data = await createFullBackup(opts);
  return JSON.stringify(data, null, opts.prettyPrint ? 2 : 0);
}

/**
 * Export data to Blob
 */
export async function exportToBlob(options: Partial<ExportOptions> = {}): Promise<Blob> {
  const json = await exportToJSON(options);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Download export file
 */
export async function downloadExport(
  options: Partial<ExportOptions> = {},
  filename?: string
): Promise<void> {
  const blob = await exportToBlob(options);
  const url = URL.createObjectURL(blob);

  const defaultFilename = `cognia-backup-${new Date().toISOString().split('T')[0]}.json`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get export size estimate
 */
export async function getExportSizeEstimate(): Promise<{
  sessions: number;
  settings: number;
  artifacts: number;
  indexedDB: number;
  total: number;
}> {
  let sessions = 0;
  let settings = 0;
  let artifacts = 0;
  let indexedDB = 0;

  try {
    const { useSessionStore, useSettingsStore, useArtifactStore } = await import('@/stores');

    // Estimate sessions size
    const sessionsData = JSON.stringify(useSessionStore.getState().sessions);
    sessions = sessionsData.length * 2; // UTF-16

    // Estimate settings size
    const settingsData = JSON.stringify(useSettingsStore.getState());
    settings = settingsData.length * 2;

    // Estimate artifacts size
    const artifactsData = JSON.stringify(useArtifactStore.getState().artifacts);
    artifacts = artifactsData.length * 2;

    // Estimate IndexedDB size
    const counts = await Promise.all([
      db.sessions.count(),
      db.messages.count(),
      db.documents.count(),
      db.projects.count(),
    ]);

    // Rough estimates per record
    indexedDB =
      counts[0] * 512 + // sessions
      counts[1] * 2048 + // messages
      counts[2] * 4096 + // documents
      counts[3] * 1024; // projects
  } catch (error) {
    log.error('Failed to estimate export size', error as Error);
  }

  return {
    sessions,
    settings,
    artifacts,
    indexedDB,
    total: sessions + settings + artifacts + indexedDB,
  };
}
