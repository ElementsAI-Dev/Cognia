/**
 * Sync Manager Tests
 */

import type {
  SyncData,
  SyncDirection,
} from '@/types/sync';

// Mock the providers
const mockWebDAVProvider = {
  type: 'webdav' as const,
  testConnection: jest.fn(),
  upload: jest.fn(),
  download: jest.fn(),
  getRemoteMetadata: jest.fn(),
  listBackups: jest.fn(),
  downloadBackup: jest.fn(),
  deleteBackup: jest.fn(),
  disconnect: jest.fn(),
};

const mockGitHubProvider = {
  type: 'github' as const,
  testConnection: jest.fn(),
  upload: jest.fn(),
  download: jest.fn(),
  getRemoteMetadata: jest.fn(),
  listBackups: jest.fn(),
  downloadBackup: jest.fn(),
  deleteBackup: jest.fn(),
  disconnect: jest.fn(),
};

const mockGoogleDriveProvider = {
  type: 'googledrive' as const,
  testConnection: jest.fn(),
  upload: jest.fn(),
  download: jest.fn(),
  getRemoteMetadata: jest.fn(),
  listBackups: jest.fn(),
  downloadBackup: jest.fn(),
  deleteBackup: jest.fn(),
  disconnect: jest.fn(),
};

const mockConvexProvider = {
  type: 'convex' as const,
  testConnection: jest.fn(),
  upload: jest.fn(),
  download: jest.fn(),
  getRemoteMetadata: jest.fn(),
  listBackups: jest.fn(),
  downloadBackup: jest.fn(),
  deleteBackup: jest.fn(),
  disconnect: jest.fn(),
};

const mockImportFullBackup = jest.fn();
const mockGenerateChecksum = jest.fn();
const mockSha256Hex = jest.fn();

jest.mock('./providers/webdav-provider', () => ({
  WebDAVProvider: jest.fn().mockImplementation(() => mockWebDAVProvider),
}));

jest.mock('./providers/github-provider', () => ({
  GitHubProvider: jest.fn().mockImplementation(() => mockGitHubProvider),
}));

jest.mock('./providers/googledrive-provider', () => ({
  GoogleDriveProvider: jest.fn().mockImplementation(() => mockGoogleDriveProvider),
}));

jest.mock('./providers/convex-provider', () => ({
  ConvexProvider: jest.fn().mockImplementation(() => mockConvexProvider),
}));

const mockGetConvexDeployKey = jest.fn().mockResolvedValue(null);
jest.mock('./credential-storage', () => ({
  getConvexDeployKey: () => mockGetConvexDeployKey(),
}));

// Mock stores
const mockSyncState = {
  activeProvider: 'webdav' as const,
  webdavConfig: {
    type: 'webdav',
    enabled: true,
    serverUrl: 'https://dav.example.com',
    username: 'user',
    remotePath: '/sync/',
    maxBackups: 10,
    syncDataTypes: [],
  },
  githubConfig: {
    type: 'github',
    enabled: true,
    repoOwner: 'user',
    repoName: 'sync',
    branch: 'main',
    remotePath: 'backup/',
    maxBackups: 10,
    syncDataTypes: [],
  },
  googleDriveConfig: {
    type: 'googledrive',
    enabled: false,
    maxBackups: 10,
    syncDataTypes: [],
  },
  convexConfig: {
    type: 'convex',
    enabled: true,
    deploymentUrl: 'https://test-app.convex.cloud',
    projectSlug: 'test-app',
    maxBackups: 10,
    syncDataTypes: [],
  },
  deviceId: 'device-123',
  deviceName: 'Test Device',
};

jest.mock('@/stores/sync', () => ({
  useSyncStore: {
    getState: jest.fn(() => mockSyncState),
  },
}));

// Mock data export/import
jest.mock('@/lib/storage/data-export', () => ({
  createFullBackup: jest.fn().mockResolvedValue({
    version: '3.0',
    manifest: {
      version: '3.0',
      schemaVersion: 3,
      traceId: 'trace-id',
      exportedAt: '2025-01-31T12:00:00Z',
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
      settings: { theme: 'dark' },
      artifacts: {},
      folders: [],
    },
  }),
}));

jest.mock('@/lib/storage/data-import', () => ({
  importFullBackup: (...args: unknown[]) => mockImportFullBackup(...args),
  generateChecksum: (...args: unknown[]) => mockGenerateChecksum(...args),
}));

jest.mock('@/lib/storage/persistence/crypto', () => ({
  sha256Hex: (...args: unknown[]) => mockSha256Hex(...args),
}));

// Import after mocking
import { SyncManager, getSyncManager, resetSyncManager } from './sync-manager';

describe('SyncManager', () => {
  let manager: SyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateChecksum.mockReturnValue('checksum-123');
    mockSha256Hex.mockResolvedValue('payload-sha256');
    mockImportFullBackup.mockResolvedValue({
      success: true,
      imported: {
        sessions: 1,
        messages: 1,
        artifacts: 0,
        documents: 0,
        projects: 0,
        settings: true,
      },
      skipped: {
        sessions: 0,
        messages: 0,
        artifacts: 0,
      },
      errors: [],
      warnings: [],
      warningDetails: [],
      duration: 1,
    });
    mockWebDAVProvider.listBackups.mockResolvedValue([]);
    mockGitHubProvider.listBackups.mockResolvedValue([]);
    mockGoogleDriveProvider.listBackups.mockResolvedValue([]);
    mockConvexProvider.listBackups.mockResolvedValue([]);
    mockSyncState.convexConfig.deploymentUrl = 'https://test-app.convex.cloud';
    mockGetConvexDeployKey.mockResolvedValue(null);
    manager = new SyncManager();
  });

  describe('Constructor', () => {
    it('should create manager without provider', () => {
      expect(manager.getProvider()).toBeNull();
    });
  });

  describe('initWebDAV', () => {
    it('should initialize WebDAV provider', async () => {
      await manager.initWebDAV('password123');

      expect(manager.getProvider()).not.toBeNull();
      expect(manager.getProvider()?.type).toBe('webdav');
    });
  });

  describe('initGitHub', () => {
    it('should initialize GitHub provider', async () => {
      await manager.initGitHub('ghp_token');

      expect(manager.getProvider()).not.toBeNull();
      expect(manager.getProvider()?.type).toBe('github');
    });
  });

  describe('initConvex / ensureProviderInitialized(convex)', () => {
    it('should return validation error when deployment URL is missing', async () => {
      mockSyncState.convexConfig.deploymentUrl = '';
      const result = await manager.ensureProviderInitialized('convex');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Convex deployment URL is required');
    });

    it('should return validation error when deployment URL is not a convex host', async () => {
      mockSyncState.convexConfig.deploymentUrl = 'https://example.com';
      const result = await manager.ensureProviderInitialized('convex');

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Convex deployment URL must use a .convex.cloud or .convex.site host'
      );
    });

    it('should return missing credential error when deploy key is not stored', async () => {
      mockSyncState.convexConfig.deploymentUrl = 'https://test-app.convex.cloud';
      mockGetConvexDeployKey.mockResolvedValueOnce(null);

      const result = await manager.ensureProviderInitialized('convex');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No Convex deploy key configured');
    });

    it('should initialize convex provider when config and key are valid', async () => {
      mockSyncState.convexConfig.deploymentUrl = 'https://test-app.convex.cloud';
      mockGetConvexDeployKey.mockResolvedValueOnce('prod:key_123');

      const result = await manager.ensureProviderInitialized('convex');

      expect(result.success).toBe(true);
      expect(manager.getProvider()?.type).toBe('convex');
    });
  });

  describe('testConnection', () => {
    it('should return error when no provider initialized', async () => {
      const result = await manager.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No sync provider initialized');
    });

    it('should delegate to provider when initialized', async () => {
      mockWebDAVProvider.testConnection.mockResolvedValueOnce({ success: true });
      await manager.initWebDAV('password');

      const result = await manager.testConnection();

      expect(result.success).toBe(true);
      expect(mockWebDAVProvider.testConnection).toHaveBeenCalled();
    });
  });

  describe('sync', () => {
    describe('without provider', () => {
      it('should return error when no provider', async () => {
        const result = await manager.sync('upload');

        expect(result.success).toBe(false);
        expect(result.error).toBe('No sync provider initialized');
      });
    });

    describe('with provider', () => {
      beforeEach(async () => {
        await manager.initWebDAV('password');
      });

      it('should perform upload sync', async () => {
        mockWebDAVProvider.upload.mockResolvedValueOnce({
          success: true,
          timestamp: '2025-01-31T12:00:00Z',
          direction: 'upload',
          itemsSynced: 5,
        });

        const result = await manager.sync('upload');

        expect(result.success).toBe(true);
        expect(result.direction).toBe('upload');
      });

      it('should perform download sync', async () => {
        const mockRemoteData: SyncData = {
          version: '1.0.0',
          syncedAt: '2025-01-31T12:00:00Z',
          deviceId: 'remote-device',
          deviceName: 'Remote',
          checksum: 'remote-checksum',
          dataTypes: ['settings'],
          data: { settings: { theme: 'light' } },
        };

        mockWebDAVProvider.download.mockResolvedValueOnce(mockRemoteData);

        const result = await manager.sync('download');

        expect(result.direction).toBe('download');
      });

      it('should call progress callback', async () => {
        mockWebDAVProvider.upload.mockImplementation(async (_data, onProgress) => {
          if (onProgress) {
            onProgress({ phase: 'uploading', current: 50, total: 100, message: 'test' });
          }
          return {
            success: true,
            timestamp: '2025-01-31T12:00:00Z',
            direction: 'upload' as SyncDirection,
            itemsSynced: 5,
          };
        });

        const progressCallback = jest.fn();
        await manager.sync('upload', progressCallback);

        expect(progressCallback).toHaveBeenCalled();
      });

      it('should prevent concurrent syncs', async () => {
        mockWebDAVProvider.upload.mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            success: true,
            timestamp: '2025-01-31T12:00:00Z',
            direction: 'upload' as SyncDirection,
            itemsSynced: 5,
          };
        });

        // Start first sync
        const firstSync = manager.sync('upload');
        
        // Try second sync immediately
        const secondResult = await manager.sync('upload');

        expect(secondResult.success).toBe(false);
        expect(secondResult.error).toBe('Sync already in progress');

        // Wait for first sync to complete
        await firstSync;
      });
    });
  });

  describe('listBackups', () => {
    it('should return empty array when no provider', async () => {
      const backups = await manager.listBackups();
      expect(backups).toEqual([]);
    });

    it('should delegate to provider', async () => {
      const mockBackups = [
        {
          id: 'backup-1',
          filename: 'backup-2025-01-30.json',
          createdAt: '2025-01-30T12:00:00Z',
          size: 1024,
          deviceId: 'device-123',
          deviceName: 'Test',
          checksum: 'abc',
        },
      ];

      mockWebDAVProvider.listBackups.mockResolvedValueOnce(mockBackups);
      await manager.initWebDAV('password');

      const backups = await manager.listBackups();

      expect(backups).toEqual(mockBackups);
    });
  });

  describe('deleteBackup', () => {
    it('should return false when no provider', async () => {
      const result = await manager.deleteBackup('backup-123');
      expect(result).toBe(false);
    });

    it('should delegate to provider', async () => {
      mockWebDAVProvider.deleteBackup.mockResolvedValueOnce(true);
      await manager.initWebDAV('password');

      const result = await manager.deleteBackup('backup-123');

      expect(result).toBe(true);
      expect(mockWebDAVProvider.deleteBackup).toHaveBeenCalledWith('backup-123');
    });
  });

  describe('restoreBackup', () => {
    it('should return false when no provider', async () => {
      const result = await manager.restoreBackup('backup-123');
      expect(result).toBe(false);
    });

    it('returns false when remote backup checksum is invalid', async () => {
      await manager.initWebDAV('password');
      mockWebDAVProvider.downloadBackup.mockResolvedValueOnce({
        version: '1.1',
        syncedAt: '2025-01-31T12:00:00Z',
        deviceId: 'device-123',
        deviceName: 'Remote Device',
        checksum: 'mismatch',
        dataTypes: ['settings'],
        data: {
          settings: { theme: 'dark' },
        },
      });

      const result = await manager.restoreBackup('backup-123');

      expect(result).toBe(false);
      expect(mockImportFullBackup).not.toHaveBeenCalled();
    });

    it('returns false when shared import validation/import fails', async () => {
      await manager.initWebDAV('password');
      mockWebDAVProvider.downloadBackup.mockResolvedValueOnce({
        version: '1.1',
        syncedAt: '2025-01-31T12:00:00Z',
        deviceId: 'device-123',
        deviceName: 'Remote Device',
        checksum: 'checksum-123',
        dataTypes: ['settings'],
        data: {
          settings: { theme: 'dark' },
        },
      });
      mockImportFullBackup.mockResolvedValueOnce({
        success: false,
        imported: {
          sessions: 0,
          messages: 0,
          artifacts: 0,
          documents: 0,
          projects: 0,
          settings: false,
        },
        skipped: {
          sessions: 0,
          messages: 0,
          artifacts: 0,
        },
        errors: [{ category: 'checksum-mismatch', message: 'Backup checksum verification failed' }],
        warnings: [],
        warningDetails: [],
        duration: 1,
      });

      const result = await manager.restoreBackup('backup-123');

      expect(result).toBe(false);
      expect(mockImportFullBackup).toHaveBeenCalled();
    });

    it('uses canonical backup package import path for successful restore', async () => {
      await manager.initWebDAV('password');
      mockWebDAVProvider.downloadBackup.mockResolvedValueOnce({
        version: '1.1',
        syncedAt: '2025-01-31T12:00:00Z',
        deviceId: 'device-123',
        deviceName: 'Remote Device',
        checksum: 'checksum-123',
        dataTypes: ['sessions', 'messages', 'settings'],
        data: {
          sessions: [],
          messages: [],
          settings: { theme: 'dark' },
        },
      });

      const result = await manager.restoreBackup('backup-123');

      expect(result).toBe(true);
      expect(mockImportFullBackup).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '3.0',
          manifest: expect.objectContaining({
            integrity: expect.objectContaining({
              algorithm: 'SHA-256',
              checksum: 'payload-sha256',
            }),
          }),
        }),
        expect.objectContaining({
          mergeStrategy: 'merge',
          generateNewIds: false,
          validateData: true,
        })
      );
    });
  });
});

describe('Singleton Functions', () => {
  describe('getSyncManager', () => {
    it('should return same instance', () => {
      const manager1 = getSyncManager();
      const manager2 = getSyncManager();

      expect(manager1).toBe(manager2);
    });
  });

  describe('resetSyncManager', () => {
    it('should reset the singleton instance', () => {
      const manager1 = getSyncManager();
      expect(manager1).toBeDefined();

      resetSyncManager();

      const manager2 = getSyncManager();
      // Should be a new instance after reset
      expect(manager2).toBeDefined();
    });
  });
});
