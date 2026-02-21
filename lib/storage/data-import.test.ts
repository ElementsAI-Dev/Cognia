/**
 * Data Import Tests (Backup v3)
 */

import {
  generateChecksum,
  importFullBackup,
  verifyChecksum,
  validateExportData,
  type ExportData,
} from './data-import';
import type { BackupPayloadV3 } from './persistence/types';

const mockImportPayload = jest.fn();
const mockClearDomainData = jest.fn();

jest.mock('./persistence/unified-persistence-service', () => ({
  unifiedPersistenceService: {
    getBackend: () => 'web-dexie',
    clearDomainData: () => mockClearDomainData(),
    backup: {
      importPayload: (...args: unknown[]) => mockImportPayload(...args),
    },
  },
}));

describe('Data Import Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportPayload.mockResolvedValue({
      importedSessions: 1,
      importedMessages: 1,
      importedProjects: 1,
      importedSummaries: 0,
      warnings: [],
    });
    mockClearDomainData.mockResolvedValue(undefined);
  });

  describe('validateExportData', () => {
    it('validates a valid v3 backup package', async () => {
      const payload = {
        sessions: [],
        messages: [],
        projects: [],
        knowledgeFiles: [],
        summaries: [],
      };

      const validData: ExportData = {
        version: '3.0',
        manifest: {
          version: '3.0',
          schemaVersion: 3,
          traceId: 'trace-id',
          exportedAt: new Date().toISOString(),
          backend: 'web-dexie',
          integrity: {
            algorithm: 'SHA-256',
            checksum: '',
          },
        },
        payload,
      };

      const result = await validateExportData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects null data', async () => {
      const result = await validateExportData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid backup format: expected object');
    });

    it('rejects invalid payload structure', async () => {
      const result = await validateExportData({
        version: '3.0',
        manifest: { integrity: { checksum: '' } },
        payload: { sessions: 'not-array', messages: [] },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining(['$.payload.sessions: expected type array']));
    });

    it('rejects encrypted envelope with missing crypto fields', async () => {
      const result = await validateExportData({
        version: 'enc-v1',
        algorithm: 'AES-GCM',
        kdf: { algorithm: 'PBKDF2', hash: 'SHA-256', iterations: 1 },
        iv: '',
        ciphertext: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining(['$.kdf: missing required field "salt"']));
    });

    it('supports legacy v2 structure via normalization', async () => {
      const result = await validateExportData({
        version: '2.0',
        exportedAt: new Date().toISOString(),
        sessions: [],
        indexedDB: {
          messages: [],
          projects: [],
        },
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('generateChecksum', () => {
    it('generates a consistent checksum for the same data', () => {
      const data = JSON.stringify({ test: 'data' });
      const checksum1 = generateChecksum(data);
      const checksum2 = generateChecksum(data);
      expect(checksum1).toBe(checksum2);
    });

    it('generates different checksums for different data', () => {
      const data1 = JSON.stringify({ test: 'data1' });
      const data2 = JSON.stringify({ test: 'data2' });
      const checksum1 = generateChecksum(data1);
      const checksum2 = generateChecksum(data2);
      expect(checksum1).not.toBe(checksum2);
    });

    it('returns an 8-character hex string', () => {
      const checksum = generateChecksum('test data');
      expect(checksum).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe('verifyChecksum', () => {
    it('verifies a valid checksum', () => {
      const data = JSON.stringify({ test: 'data' });
      const checksum = generateChecksum(data);
      expect(verifyChecksum(data, checksum)).toBe(true);
    });

    it('rejects an invalid checksum', () => {
      const data = JSON.stringify({ test: 'data' });
      expect(verifyChecksum(data, '00000000')).toBe(false);
    });
  });

  describe('importFullBackup', () => {
    const basePayload: BackupPayloadV3 = {
      sessions: [
        {
          id: 'session-1',
          title: 'Session One',
          createdAt: new Date(),
          updatedAt: new Date(),
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          mode: 'chat' as const,
        },
      ],
      messages: [
        {
          id: 'message-1',
          sessionId: 'session-1',
          role: 'user' as const,
          content: 'hello',
          createdAt: new Date(),
        },
      ],
      projects: [
        {
          id: 'project-1',
          name: 'Project',
          knowledgeBase: [],
          sessionIds: ['session-1'],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          sessionCount: 1,
          messageCount: 1,
        },
      ],
      knowledgeFiles: [],
      summaries: [],
      settings: { theme: 'dark' },
      artifacts: {
        artifact1: {
          id: 'artifact1',
          sessionId: 'session-1',
          messageId: 'message-1',
          type: 'code' as const,
          title: 'Artifact',
          content: 'content',
          language: 'typescript' as const,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        },
      },
    };

    const packageData: ExportData = {
      version: '3.0',
      manifest: {
        version: '3.0',
        schemaVersion: 3,
        traceId: 'trace-id',
        exportedAt: new Date().toISOString(),
        backend: 'web-dexie',
        integrity: {
          algorithm: 'SHA-256',
          checksum: '',
        },
      },
      payload: basePayload,
    };

    it('applies categories filter to import payload', async () => {
      await importFullBackup(packageData, {
        categories: ['settings'],
      });

      expect(mockImportPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          sessions: [],
          messages: [],
          projects: [],
          settings: { theme: 'dark' },
          artifacts: undefined,
        }),
        'merge-rename'
      );
    });

    it('generates new ids and remaps relations when enabled', async () => {
      await importFullBackup(packageData, {
        generateNewIds: true,
      });

      const [remappedPayload] = mockImportPayload.mock.calls[0] as [typeof basePayload];
      expect(remappedPayload.sessions[0].id).not.toBe('session-1');
      expect(remappedPayload.messages[0].id).not.toBe('message-1');
      expect(remappedPayload.messages[0].sessionId).toBe(remappedPayload.sessions[0].id);
      expect(remappedPayload.projects[0].id).not.toBe('project-1');
      expect(remappedPayload.projects[0].sessionIds[0]).toBe(remappedPayload.sessions[0].id);
      const [artifact] = Object.values(remappedPayload.artifacts || {});
      expect(artifact.sessionId).toBe(remappedPayload.sessions[0].id);
      expect(artifact.messageId).toBe(remappedPayload.messages[0].id);
    });

    it('clears domain data before replace imports', async () => {
      await importFullBackup(packageData, {
        mergeStrategy: 'replace',
      });

      expect(mockClearDomainData).toHaveBeenCalledTimes(1);
    });
  });
});
