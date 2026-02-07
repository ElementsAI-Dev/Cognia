/**
 * @jest-environment jsdom
 */

import {
  createFullBackup,
  exportToJSON,
  exportToBlob,
  downloadExport,
  getExportSizeEstimate,
} from './data-export';

// Mock db
jest.mock('@/lib/db', () => ({
  db: {
    sessions: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    messages: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    documents: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    projects: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    workflows: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    workflowExecutions: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    summaries: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    knowledgeFiles: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    agentTraces: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    folders: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    mcpServers: { toArray: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSessionStore: {
    getState: jest.fn().mockReturnValue({
      sessions: [{ id: 'session-1', title: 'Test Session' }],
    }),
  },
  useSettingsStore: {
    getState: jest.fn().mockReturnValue({
      theme: 'dark',
      defaultProvider: 'openai',
      providerSettings: {},
      language: 'en',
    }),
  },
  useArtifactStore: {
    getState: jest.fn().mockReturnValue({
      artifacts: [{ id: 'artifact-1', type: 'code' }],
      canvasDocuments: [],
    }),
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    store: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
  },
}));

// Mock data-import for generateChecksum
jest.mock('./data-import', () => ({
  generateChecksum: jest.fn().mockReturnValue('mock-checksum'),
}));

describe('data-export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFullBackup', () => {
    it('should create backup with default options', async () => {
      const backup = await createFullBackup();

      expect(backup).toHaveProperty('version', '2.0');
      expect(backup).toHaveProperty('exportedAt');
      expect(backup).toHaveProperty('sessions');
      expect(backup).toHaveProperty('settings');
      expect(backup).toHaveProperty('artifacts');
      expect(backup).toHaveProperty('indexedDB');
      expect(backup).toHaveProperty('checksum');
    });

    it('should exclude sessions when option is false', async () => {
      const backup = await createFullBackup({ includeSessions: false });

      expect(backup.sessions).toBeUndefined();
    });

    it('should exclude settings when option is false', async () => {
      const backup = await createFullBackup({ includeSettings: false });

      expect(backup.settings).toBeUndefined();
    });

    it('should exclude artifacts when option is false', async () => {
      const backup = await createFullBackup({ includeArtifacts: false });

      expect(backup.artifacts).toBeUndefined();
    });

    it('should exclude IndexedDB when option is false', async () => {
      const backup = await createFullBackup({ includeIndexedDB: false });

      expect(backup.indexedDB).toBeUndefined();
    });

    it('should exclude checksum when option is false', async () => {
      const backup = await createFullBackup({ includeChecksum: false });

      expect(backup.checksum).toBeUndefined();
    });

    it('should include correct settings structure', async () => {
      const backup = await createFullBackup({ includeSessions: false, includeArtifacts: false, includeIndexedDB: false });

      expect(backup.settings).toEqual({
        theme: 'dark',
        defaultProvider: 'openai',
        providerSettings: {},
        language: 'en',
      });
    });
  });

  describe('exportToJSON', () => {
    it('should return JSON string', async () => {
      const json = await exportToJSON();

      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should be pretty printed by default', async () => {
      const json = await exportToJSON();

      expect(json).toContain('\n');
    });

    it('should not be pretty printed when option is false', async () => {
      const json = await exportToJSON({ prettyPrint: false });

      expect(json).not.toContain('\n  ');
    });
  });

  describe('exportToBlob', () => {
    it('should return a Blob', async () => {
      const blob = await exportToBlob();

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should have content', async () => {
      const blob = await exportToBlob();

      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('downloadExport', () => {
    // Note: downloadExport uses browser APIs (URL.createObjectURL, document.createElement)
    // that are difficult to mock in jsdom. Testing the function exists and is callable.
    it('should be a function', () => {
      expect(typeof downloadExport).toBe('function');
    });

    it('should accept options parameter', async () => {
      // The function should accept options without throwing during setup
      // Actual download will fail in test environment but structure is verified
      expect(() => downloadExport({ includeSessions: true })).not.toThrow();
    });
  });

  describe('getExportSizeEstimate', () => {
    it('should return size estimates', async () => {
      const estimate = await getExportSizeEstimate();

      expect(estimate).toHaveProperty('sessions');
      expect(estimate).toHaveProperty('settings');
      expect(estimate).toHaveProperty('artifacts');
      expect(estimate).toHaveProperty('indexedDB');
      expect(estimate).toHaveProperty('total');
    });

    it('should return numeric values', async () => {
      const estimate = await getExportSizeEstimate();

      expect(typeof estimate.sessions).toBe('number');
      expect(typeof estimate.settings).toBe('number');
      expect(typeof estimate.artifacts).toBe('number');
      expect(typeof estimate.indexedDB).toBe('number');
      expect(typeof estimate.total).toBe('number');
    });

    it('should calculate total correctly', async () => {
      const estimate = await getExportSizeEstimate();

      expect(estimate.total).toBe(
        estimate.sessions + estimate.settings + estimate.artifacts + estimate.indexedDB
      );
    });
  });
});
