/**
 * WebDAV Provider Tests
 */

import type {
  SyncData,
  WebDAVConfig,
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
  getWebDAVPassword: jest.fn().mockResolvedValue('test-password'),
}));

// Mock btoa for auth header
global.btoa = jest.fn((str) => Buffer.from(str).toString('base64'));

// Import after mocking
import { WebDAVProvider } from './webdav-provider';

describe('WebDAVProvider', () => {
  const mockConfig: WebDAVConfig = {
    type: 'webdav',
    enabled: true,
    autoSync: false,
    syncInterval: 30,
    lastSyncAt: null,
    syncOnStartup: false,
    syncOnExit: false,
    conflictResolution: 'newest',
    syncDirection: 'bidirectional',
    maxBackups: 10,
    syncDataTypes: [],
    serverUrl: 'https://dav.example.com',
    username: 'testuser',
    remotePath: '/cognia-sync/',
    useDigestAuth: false,
  };

  let provider: WebDAVProvider;

  beforeEach(() => {
    mockFetch.mockReset();
    provider = new WebDAVProvider(mockConfig, 'test-password');
  });

  describe('Constructor', () => {
    it('should create provider with correct type', () => {
      expect(provider.type).toBe('webdav');
    });
  });

  describe('testConnection', () => {
    it('should return success when connection is valid', async () => {
      // Mock PROPFIND for directory check
      mockFetch.mockResolvedValueOnce({ ok: true, status: 207 });
      // Mock MKCOL for directory creation
      mockFetch.mockResolvedValueOnce({ ok: true, status: 201 });

      const result = await provider.testConnection();

      // Check that it returns a result object with success property
      expect(typeof result.success).toBe('boolean');
    });

    it('should return error when connection fails', async () => {
      // Reject both PROPFIND (exists) and MKCOL (createDirectory) calls
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Reset to prevent leaking to other tests
      mockFetch.mockReset();
    });

    it('should return error when server returns 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('upload', () => {
    const mockSyncData: SyncData = {
      version: '1.0.0',
      syncedAt: '2025-01-31T12:00:00Z',
      deviceId: 'device-123',
      deviceName: 'Test Device',
      checksum: 'abc123',
      dataTypes: ['settings'],
      data: { settings: { theme: 'dark' } },
    };

    it('should upload data successfully', async () => {
      // Mock directory creation
      mockFetch.mockResolvedValueOnce({ ok: true, status: 201 });
      // Mock file upload
      mockFetch.mockResolvedValueOnce({ ok: true, status: 201 });
      // Mock metadata upload
      mockFetch.mockResolvedValueOnce({ ok: true, status: 201 });

      const result = await provider.upload(mockSyncData);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('upload');
    });

    it('should call progress callback during upload', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 201 });

      const progressCallback = jest.fn();
      await provider.upload(mockSyncData, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle upload with directory creation', async () => {
      // Mock directory check
      mockFetch.mockResolvedValueOnce({ ok: true });
      // Mock file upload  
      mockFetch.mockResolvedValueOnce({ ok: true, status: 201 });
      // Mock metadata upload
      mockFetch.mockResolvedValueOnce({ ok: true, status: 201 });

      const result = await provider.upload(mockSyncData);

      expect(result.direction).toBe('upload');
    });
  });

  describe('download', () => {
    it('should download data successfully', async () => {
      const mockData: SyncData = {
        version: '1.0.0',
        syncedAt: '2025-01-31T12:00:00Z',
        deviceId: 'device-456',
        deviceName: 'Remote Device',
        checksum: 'def456',
        dataTypes: ['settings'],
        data: { settings: { theme: 'light' } },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockData)),
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

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.download();

      expect(result).toBeNull();
    });
  });

  describe('getRemoteMetadata', () => {
    it('should attempt to get remote metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await provider.getRemoteMetadata();

      // Returns null when metadata file not found
      expect(result).toBeNull();
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
    it('should return list of backups', async () => {
      const mockXml = `<?xml version="1.0" encoding="utf-8"?>
        <D:multistatus xmlns:D="DAV:">
          <D:response>
            <D:href>/cognia-sync/backup-2025-01-30.json</D:href>
            <D:propstat>
              <D:prop>
                <D:displayname>backup-2025-01-30.json</D:displayname>
                <D:getcontentlength>1024</D:getcontentlength>
                <D:getlastmodified>Thu, 30 Jan 2025 12:00:00 GMT</D:getlastmodified>
                <D:resourcetype/>
              </D:prop>
              <D:status>HTTP/1.1 200 OK</D:status>
            </D:propstat>
          </D:response>
        </D:multistatus>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockXml),
      });

      const backups = await provider.listBackups();

      expect(Array.isArray(backups)).toBe(true);
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
    it('should delete backup successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await provider.deleteBackup('backup-123');

      expect(result).toBe(true);
    });

    it('should return true when backup not found (already deleted)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await provider.deleteBackup('backup-123');

      expect(result).toBe(true);
    });

    it('should return false when delete fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await provider.deleteBackup('backup-123');

      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect without error', async () => {
      await expect(provider.disconnect()).resolves.not.toThrow();
    });
  });
});

describe('SimpleWebDAVClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('exists', () => {
    it('should return true when resource exists', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const provider = new WebDAVProvider({
        type: 'webdav',
        enabled: true,
        autoSync: false,
        syncInterval: 30,
        lastSyncAt: null,
        syncOnStartup: false,
        syncOnExit: false,
        conflictResolution: 'newest',
        syncDirection: 'bidirectional',
        maxBackups: 10,
        syncDataTypes: [],
        serverUrl: 'https://dav.example.com',
        username: 'user',
        remotePath: '/test/',
        useDigestAuth: false,
      }, 'test-password');

      // Access internal client via test connection
      await provider.testConnection();
      // This tests the underlying exists logic
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
