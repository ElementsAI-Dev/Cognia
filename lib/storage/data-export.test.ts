/**
 * @jest-environment jsdom
 */

import {
  createFullBackup,
  exportToBlob,
  exportToJSON,
  getExportSizeEstimate,
} from './data-export';

jest.mock('@/lib/logger', () => ({
  loggers: {
    store: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
  },
}));

jest.mock('./persistence/feature-flags', () => ({
  storageFeatureFlags: {
    chatPersistenceV3Enabled: true,
    desktopSqliteEnabled: true,
    encryptedBackupV3Enabled: true,
  },
}));

jest.mock('./persistence/backup-key', () => ({
  getDefaultBackupPassphrase: jest.fn(async () => 'test-passphrase'),
}));

jest.mock('./persistence/crypto', () => ({
  sha256Hex: jest.fn(async () => 'payload-checksum'),
  encryptBackupPackage: jest.fn(async (plainText: string) => ({
    version: 'enc-v1',
    algorithm: 'AES-GCM',
    kdf: {
      algorithm: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 600000,
      salt: 'salt',
    },
    iv: 'iv',
    ciphertext: plainText,
    manifest: {
      version: '3.0',
      schemaVersion: 3,
      traceId: 'trace',
      exportedAt: new Date().toISOString(),
      backend: 'web-dexie',
      encryption: {
        enabled: true,
        format: 'encrypted-envelope-v1',
      },
    },
    checksum: 'payload-checksum',
  })),
}));

const mockExportPayload = jest.fn();

jest.mock('./persistence/unified-persistence-service', () => ({
  unifiedPersistenceService: {
    getBackend: () => 'web-dexie',
    backup: {
      exportPayload: (...args: unknown[]) => mockExportPayload(...args),
    },
  },
}));

jest.mock('@/lib/db', () => ({
  db: {
    sessions: { count: jest.fn().mockResolvedValue(0) },
    messages: { count: jest.fn().mockResolvedValue(0) },
    documents: { count: jest.fn().mockResolvedValue(0) },
    projects: { count: jest.fn().mockResolvedValue(0) },
    workflows: { count: jest.fn().mockResolvedValue(0) },
    workflowExecutions: { count: jest.fn().mockResolvedValue(0) },
    summaries: { count: jest.fn().mockResolvedValue(0) },
    knowledgeFiles: { count: jest.fn().mockResolvedValue(0) },
    agentTraces: { count: jest.fn().mockResolvedValue(0) },
    checkpoints: { count: jest.fn().mockResolvedValue(0) },
    contextFiles: { count: jest.fn().mockResolvedValue(0) },
    videoProjects: { count: jest.fn().mockResolvedValue(0) },
    assets: { count: jest.fn().mockResolvedValue(0) },
    folders: { count: jest.fn().mockResolvedValue(0) },
    mcpServers: { count: jest.fn().mockResolvedValue(0) },
  },
}));

jest.mock('@/stores', () => ({
  useSessionStore: {
    getState: () => ({
      sessions: [{ id: 'session-1' }],
    }),
  },
  useSettingsStore: {
    getState: () => ({
      theme: 'dark',
      defaultProvider: 'openai',
      providerSettings: {},
      language: 'en',
    }),
  },
  useArtifactStore: {
    getState: () => ({
      artifacts: { artifact1: { id: 'artifact1' } },
      canvasDocuments: {},
    }),
  },
}));

describe('data-export v3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportPayload.mockResolvedValue({
      sessions: [{ id: 'session-1', title: 'test' }],
      messages: [],
      projects: [],
      knowledgeFiles: [],
      summaries: [],
      settings: { theme: 'dark' },
      artifacts: { artifact1: { id: 'artifact1' } },
    });
  });

  it('creates BackupPackage v3 manifest and payload', async () => {
    const backup = await createFullBackup();

    expect(backup.version).toBe('3.0');
    expect(backup.manifest.version).toBe('3.0');
    expect(backup.manifest.integrity.algorithm).toBe('SHA-256');
    expect(backup.payload.sessions).toHaveLength(1);
  });

  it('exports encrypted envelope by default', async () => {
    const json = await exportToJSON();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('enc-v1');
    expect(parsed.algorithm).toBe('AES-GCM');
  });

  it('uses manual passphrase when provided', async () => {
    const { encryptBackupPackage } = jest.requireMock('./persistence/crypto') as {
      encryptBackupPackage: jest.Mock;
    };

    await exportToJSON({ passphrase: 'manual-passphrase' });

    expect(encryptBackupPackage).toHaveBeenCalledWith(
      expect.any(String),
      'manual-passphrase',
      expect.any(Object)
    );
  });

  it('exports plain backup package when encryption is disabled', async () => {
    const json = await exportToJSON({ encrypt: false });
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('3.0');
    expect(parsed.payload.sessions).toHaveLength(1);
  });

  it('exports JSON blob', async () => {
    const blob = await exportToBlob({ encrypt: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
  });

  it('returns size estimate fields', async () => {
    const estimate = await getExportSizeEstimate();
    expect(typeof estimate.sessions).toBe('number');
    expect(typeof estimate.settings).toBe('number');
    expect(typeof estimate.artifacts).toBe('number');
    expect(typeof estimate.indexedDB).toBe('number');
    expect(estimate.total).toBe(
      estimate.sessions + estimate.settings + estimate.artifacts + estimate.indexedDB
    );
  });
});
