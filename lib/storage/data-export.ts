/**
 * Data Export Utilities (Backup Package v3)
 */

import { db } from '@/lib/db';
import { loggers } from '@/lib/logger';
import { getDefaultBackupPassphrase } from './persistence/backup-key';
import { encryptBackupPackage, sha256Hex } from './persistence/crypto';
import { storageFeatureFlags } from './persistence/feature-flags';
import { unifiedPersistenceService } from './persistence/unified-persistence-service';
import type {
  BackupPackageV3,
  EncryptedEnvelopeV1,
  ExportSelectionOptions,
} from './persistence/types';

const log = loggers.store;

/**
 * Export options
 */
export interface ExportOptions extends ExportSelectionOptions {
  /** Pretty print JSON */
  prettyPrint?: boolean;
  /** Encrypt exported artifact (default true) */
  encrypt?: boolean;
  /** Optional passphrase override (Web only) */
  passphrase?: string;
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
  encrypt: storageFeatureFlags.encryptedBackupV3Enabled,
};

export async function createFullBackup(
  options: Partial<ExportOptions> = {}
): Promise<BackupPackageV3> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const payload = await unifiedPersistenceService.backup.exportPayload(opts);
  const payloadString = JSON.stringify(payload);
  const checksum = opts.includeChecksum === false ? '' : await sha256Hex(payloadString);

  return {
    version: '3.0',
    manifest: {
      version: '3.0',
      schemaVersion: 3,
      traceId: globalThis.crypto?.randomUUID?.() || `backup-${Date.now()}`,
      exportedAt: new Date().toISOString(),
      backend: unifiedPersistenceService.getBackend(),
      integrity: {
        algorithm: 'SHA-256',
        checksum,
      },
    },
    payload,
  };
}

async function serializeBackupForExport(
  backup: BackupPackageV3,
  options: ExportOptions
): Promise<BackupPackageV3 | EncryptedEnvelopeV1> {
  if (!options.encrypt) {
    return backup;
  }

  const passphrase = options.passphrase || (await getDefaultBackupPassphrase());
  if (!passphrase) {
    throw new Error('Encrypted backup is enabled but no encryption key is available');
  }

  const { integrity, ...manifestWithoutIntegrity } = backup.manifest;
  const plainText = JSON.stringify(backup);
  const envelope = await encryptBackupPackage(plainText, passphrase, {
    ...manifestWithoutIntegrity,
    encryption: {
      enabled: true,
      format: 'encrypted-envelope-v1',
    },
  });

  if (integrity.checksum) {
    envelope.checksum = integrity.checksum;
  }
  return envelope;
}

export async function exportToJSON(options: Partial<ExportOptions> = {}): Promise<string> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const backup = await createFullBackup(opts);
  const exported = await serializeBackupForExport(backup, opts);
  return JSON.stringify(exported, null, opts.prettyPrint ? 2 : 0);
}

export async function exportToBlob(options: Partial<ExportOptions> = {}): Promise<Blob> {
  const json = await exportToJSON(options);
  return new Blob([json], { type: 'application/json' });
}

export async function downloadExport(
  options: Partial<ExportOptions> = {},
  filename?: string
): Promise<void> {
  const blob = await exportToBlob(options);
  const url = URL.createObjectURL(blob);

  const suffix = options.encrypt === false ? 'plain' : 'encrypted';
  const defaultFilename = `cognia-backup-v3-${suffix}-${new Date().toISOString().split('T')[0]}.json`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
    sessions = JSON.stringify(useSessionStore.getState().sessions).length * 2;
    settings = JSON.stringify(useSettingsStore.getState()).length * 2;
    artifacts = JSON.stringify(useArtifactStore.getState().artifacts).length * 2;

    const counts = await Promise.all([
      db.sessions.count(),
      db.messages.count(),
      db.documents.count(),
      db.projects.count(),
      db.workflows.count(),
      db.workflowExecutions.count(),
      db.summaries.count(),
      db.knowledgeFiles.count(),
      db.agentTraces.count(),
      db.checkpoints.count(),
      db.contextFiles.count(),
      db.videoProjects.count(),
      db.assets.count(),
      db.folders.count(),
      db.mcpServers.count(),
    ]);

    indexedDB =
      counts[0] * 1024 +
      counts[1] * 4096 +
      counts[2] * 4096 +
      counts[3] * 2048 +
      counts[4] * 2048 +
      counts[5] * 4096 +
      counts[6] * 2048 +
      counts[7] * 2048 +
      counts[8] * 4096 +
      counts[9] * 1024 +
      counts[10] * 2048 +
      counts[11] * 4096 +
      counts[12] * 8192 +
      counts[13] * 512 +
      counts[14] * 1024;
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
