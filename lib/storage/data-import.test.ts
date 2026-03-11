/**
 * Data Import Tests (Backup v3)
 */

import {
  generateChecksum,
  importFullBackup,
  parseImportFile,
  verifyChecksum,
  validateExportData,
  type ExportData,
} from './data-import';
import type { BackupPayloadV3 } from './persistence/types';

const mockImportPayload = jest.fn();
const mockClearDomainData = jest.fn();
const mockDecryptBackupPackage = jest.fn();
const mockSha256Hex = jest.fn();
const mockGetDefaultBackupPassphrase = jest.fn();

jest.mock('./persistence/unified-persistence-service', () => ({
  unifiedPersistenceService: {
    getBackend: () => 'web-dexie',
    clearDomainData: () => mockClearDomainData(),
    backup: {
      importPayload: (...args: unknown[]) => mockImportPayload(...args),
    },
  },
}));

jest.mock('./persistence/crypto', () => ({
  decryptBackupPackage: (...args: unknown[]) => mockDecryptBackupPackage(...args),
  sha256Hex: (...args: unknown[]) => mockSha256Hex(...args),
}));

jest.mock('./persistence/backup-key', () => ({
  getDefaultBackupPassphrase: (...args: unknown[]) => mockGetDefaultBackupPassphrase(...args),
}));

describe('Data Import Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSha256Hex.mockResolvedValue('payload-checksum');
    mockGetDefaultBackupPassphrase.mockResolvedValue('auto-passphrase');
    mockDecryptBackupPackage.mockResolvedValue(
      JSON.stringify({
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
        payload: {
          sessions: [],
          messages: [],
          projects: [],
          knowledgeFiles: [],
          summaries: [],
        },
      })
    );
    mockImportPayload.mockResolvedValue({
      importedSessions: 1,
      importedMessages: 1,
      importedProjects: 1,
      importedSummaries: 0,
      warnings: [],
      warningDetails: [],
      integrity: {
        requestedSchemaVersion: 3,
        sourceBackend: 'web-dexie',
        traceId: 'trace-id',
        accepted: true,
        rejectedSegments: [],
        reconciliation: {
          sessionRemaps: 0,
          messageRemaps: 0,
        },
      },
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

    it('rejects checksum mismatch when manifest checksum is invalid', async () => {
      const result = await validateExportData({
        version: '3.0',
        manifest: {
          version: '3.0',
          schemaVersion: 3,
          traceId: 'trace-id',
          exportedAt: new Date().toISOString(),
          backend: 'web-dexie',
          integrity: {
            algorithm: 'SHA-256',
            checksum: 'wrong-checksum',
          },
        },
        payload: {
          sessions: [],
          messages: [],
          projects: [],
          knowledgeFiles: [],
          summaries: [],
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining(['Backup checksum verification failed']));
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
        'merge-rename',
        expect.objectContaining({
          schemaVersion: 3,
          backend: 'web-dexie',
          traceId: 'trace-id',
        })
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

    it('fails closed with checksum-mismatch category when payload integrity check fails', async () => {
      const result = await importFullBackup(
        {
          ...packageData,
          manifest: {
            ...packageData.manifest,
            integrity: {
              algorithm: 'SHA-256',
              checksum: 'bad-checksum',
            },
          },
        },
        { validateData: true }
      );

      expect(result.success).toBe(false);
      expect(result.errors[0]?.category).toBe('checksum-mismatch');
      expect(mockImportPayload).not.toHaveBeenCalled();
    });

    it('returns passphrase-required category when encrypted backup has no available passphrase', async () => {
      mockGetDefaultBackupPassphrase.mockResolvedValueOnce(null);

      const result = await importFullBackup({
        version: 'enc-v1',
        algorithm: 'AES-GCM',
        kdf: {
          algorithm: 'PBKDF2',
          hash: 'SHA-256',
          iterations: 1,
          salt: 'salt',
        },
        iv: 'iv',
        ciphertext: 'ciphertext',
        manifest: {
          version: '3.0',
          schemaVersion: 3,
          traceId: 'trace-id',
          exportedAt: new Date().toISOString(),
          backend: 'web-dexie',
          encryption: {
            enabled: true,
            format: 'encrypted-envelope-v1',
          },
        },
        checksum: 'checksum',
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]?.category).toBe('passphrase-required');
    });

    it('returns decrypt-failed category when encrypted backup cannot be decrypted', async () => {
      mockDecryptBackupPackage.mockRejectedValueOnce(new Error('Failed to decrypt backup package'));

      const result = await importFullBackup(
        {
          version: 'enc-v1',
          algorithm: 'AES-GCM',
          kdf: {
            algorithm: 'PBKDF2',
            hash: 'SHA-256',
            iterations: 1,
            salt: 'salt',
          },
          iv: 'iv',
          ciphertext: 'ciphertext',
          manifest: {
            version: '3.0',
            schemaVersion: 3,
            traceId: 'trace-id',
            exportedAt: new Date().toISOString(),
            backend: 'web-dexie',
            encryption: {
              enabled: true,
              format: 'encrypted-envelope-v1',
            },
          },
          checksum: 'checksum',
        },
        { passphrase: 'wrong-passphrase' }
      );

      expect(result.success).toBe(false);
      expect(result.errors[0]?.category).toBe('decrypt-failed');
    });

    it('imports legacy backup payload through v3 normalization', async () => {
      const result = await importFullBackup({
        version: '2.0',
        exportedAt: new Date().toISOString(),
        sessions: [],
        indexedDB: {
          messages: [],
          projects: [],
          summaries: [],
          knowledgeFiles: [],
        },
      } as ExportData);

      expect(result.success).toBe(true);
      expect(mockImportPayload).toHaveBeenCalled();
    });
  });

  describe('parseImportFile', () => {
    const makeEncryptedFile = () =>
      ({
        text: async () =>
          JSON.stringify({
            version: 'enc-v1',
            algorithm: 'AES-GCM',
            kdf: {
              algorithm: 'PBKDF2',
              hash: 'SHA-256',
              iterations: 1,
              salt: 'salt',
            },
            iv: 'iv',
            ciphertext: 'ciphertext',
            manifest: {
              version: '3.0',
              schemaVersion: 3,
              traceId: 'trace-id',
              exportedAt: new Date().toISOString(),
              backend: 'web-dexie',
              encryption: {
                enabled: true,
                format: 'encrypted-envelope-v1',
              },
            },
            checksum: 'checksum',
          }),
      } as unknown as File);

    it('reports passphrase-required classification for encrypted file with no available passphrase', async () => {
      mockGetDefaultBackupPassphrase.mockResolvedValueOnce(null);
      const result = await parseImportFile(makeEncryptedFile());

      expect(result.data).toBeNull();
      expect(result.classifiedErrors[0]?.category).toBe('passphrase-required');
    });

    it('reports decrypt-failed classification for encrypted file with invalid passphrase', async () => {
      mockDecryptBackupPackage.mockRejectedValueOnce(new Error('Failed to decrypt backup package'));
      const result = await parseImportFile(makeEncryptedFile(), 'invalid-passphrase');

      expect(result.data).toBeNull();
      expect(result.classifiedErrors[0]?.category).toBe('decrypt-failed');
    });
  });
});
