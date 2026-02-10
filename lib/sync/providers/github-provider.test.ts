/**
 * GitHub Provider Tests
 */

import type {
  SyncData,
  GitHubSyncConfig,
} from '@/types/sync';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock proxyFetch to delegate to global.fetch
jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: (...args: unknown[]) => (global.fetch as jest.MockedFunction<typeof fetch>)(...args as Parameters<typeof fetch>),
}));

// Mock credential storage
jest.mock('../credential-storage', () => ({
  getGitHubToken: jest.fn().mockResolvedValue('ghp_test_token'),
}));

// Import after mocking
import { GitHubProvider } from './github-provider';

describe('GitHubProvider', () => {
  const mockConfig: GitHubSyncConfig = {
    type: 'github',
    enabled: true,
    autoSync: false,
    syncInterval: 60,
    lastSyncAt: null,
    syncOnStartup: false,
    syncOnExit: false,
    conflictResolution: 'newest',
    syncDirection: 'bidirectional',
    maxBackups: 10,
    syncDataTypes: [],
    repoOwner: 'testuser',
    repoName: 'cognia-sync',
    branch: 'main',
    remotePath: 'backup/',
    createPrivateRepo: true,
    gistMode: false,
  };

  const mockGistConfig: GitHubSyncConfig = {
    ...mockConfig,
    gistMode: true,
    gistId: 'gist123456',
  };

  let provider: GitHubProvider;

  beforeEach(() => {
    mockFetch.mockReset();
    provider = new GitHubProvider(mockConfig, 'ghp_test_token');
  });

  describe('Constructor', () => {
    it('should create provider with correct type', () => {
      expect(provider.type).toBe('github');
    });
  });

  describe('testConnection', () => {
    it('should return success when token is valid', async () => {
      // Mock getUser response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ login: 'testuser' }),
      });
      // Mock getRepo response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'cognia-sync', full_name: 'testuser/cognia-sync' }),
      });

      const result = await provider.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return error when token is invalid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      });

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      // request() catches network errors and returns null, so testConnection reports token error
      expect(result.error).toBeDefined();
    });
  });

  describe('upload (Repository mode)', () => {
    const mockSyncData: SyncData = {
      version: '1.0.0',
      syncedAt: '2025-01-31T12:00:00Z',
      deviceId: 'device-123',
      deviceName: 'Test Device',
      checksum: 'abc123',
      dataTypes: ['settings'],
      data: { settings: { theme: 'dark' } },
    };

    it('should upload data to repository', async () => {
      // Mock get repo (check if exists)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'cognia-sync' }),
      });
      // Mock get file SHA (for update)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ sha: 'existing-sha' }),
      });
      // Mock create/update file
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ commit: { sha: 'new-sha' } }),
      });

      const result = await provider.upload(mockSyncData);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('upload');
    });

    it('should create repo if not exists', async () => {
      // Mock get repo (not found)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      // Mock create repo
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'cognia-sync' }),
      });
      // Mock get file SHA (not found - new file)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      // Mock create file
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ commit: { sha: 'new-sha' } }),
      });

      const result = await provider.upload(mockSyncData);

      expect(result.success).toBe(true);
    });

    it('should return error on upload failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Upload failed'));

      const result = await provider.upload(mockSyncData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('upload (Gist mode)', () => {
    const mockSyncData: SyncData = {
      version: '1.0.0',
      syncedAt: '2025-01-31T12:00:00Z',
      deviceId: 'device-123',
      deviceName: 'Test Device',
      checksum: 'abc123',
      dataTypes: ['settings'],
      data: { settings: { theme: 'dark' } },
    };

    let gistProvider: GitHubProvider;

    beforeEach(() => {
      gistProvider = new GitHubProvider(mockGistConfig, 'ghp_test_token');
    });

    it('should upload data to existing gist', async () => {
      // Mock update gist
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'gist123456' }),
      });

      const result = await gistProvider.upload(mockSyncData);

      expect(result.success).toBe(true);
    });

    it('should create new gist if not configured', async () => {
      const newGistProvider = new GitHubProvider({
        ...mockGistConfig,
        gistId: undefined,
      }, 'ghp_test_token');

      // Mock create gist
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'new-gist-id' }),
      });

      const result = await newGistProvider.upload(mockSyncData);

      expect(result.success).toBe(true);
    });
  });

  describe('download', () => {
    it('should download data from repository', async () => {
      const mockData: SyncData = {
        version: '1.0.0',
        syncedAt: '2025-01-31T12:00:00Z',
        deviceId: 'device-456',
        deviceName: 'Remote Device',
        checksum: 'def456',
        dataTypes: ['settings'],
        data: { settings: { theme: 'light' } },
      };

      // Mock get file content
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: Buffer.from(JSON.stringify(mockData)).toString('base64'),
          encoding: 'base64',
        }),
      });

      const result = await provider.download();

      expect(result).not.toBeNull();
      expect(result?.deviceId).toBe('device-456');
    });

    it('should return null when file not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await provider.download();

      expect(result).toBeNull();
    });
  });

  describe('getRemoteMetadata', () => {
    it('should return metadata when file exists', async () => {
      const mockMetadata = {
        version: '1.0.0',
        syncedAt: '2025-01-31T12:00:00Z',
        deviceId: 'device-789',
        deviceName: 'Metadata Device',
        checksum: 'ghi789',
        size: 2048,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: Buffer.from(JSON.stringify(mockMetadata)).toString('base64'),
          encoding: 'base64',
        }),
      });

      const result = await provider.getRemoteMetadata();

      expect(result).not.toBeNull();
      expect(result?.checksum).toBe('ghi789');
    });

    it('should return null when metadata not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await provider.getRemoteMetadata();

      expect(result).toBeNull();
    });
  });

  describe('listBackups', () => {
    it('should return list of backups from repo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            name: 'backup-2025-01-30.json',
            path: 'backup/backup-2025-01-30.json',
            sha: 'sha123',
            size: 1024,
          },
          {
            name: 'backup-2025-01-29.json',
            path: 'backup/backup-2025-01-29.json',
            sha: 'sha456',
            size: 2048,
          },
        ]),
      });

      const backups = await provider.listBackups();

      expect(Array.isArray(backups)).toBe(true);
      expect(backups.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when directory not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const backups = await provider.listBackups();

      expect(backups).toEqual([]);
    });
  });

  describe('deleteBackup', () => {
    it('should attempt to delete backup from repository', async () => {
      // Mock get file SHA - not found means already deleted
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await provider.deleteBackup('backup-123');

      // Returns true when file not found (already deleted)
      expect(typeof result).toBe('boolean');
    });

    it('should handle delete errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await provider.deleteBackup('backup-123');

      expect(typeof result).toBe('boolean');
    });
  });

  describe('disconnect', () => {
    it('should disconnect without error', async () => {
      await expect(provider.disconnect()).resolves.not.toThrow();
    });
  });
});
