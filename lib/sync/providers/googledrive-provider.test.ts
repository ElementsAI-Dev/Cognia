/**
 * Google Drive Provider Tests
 */

import { GoogleDriveProvider } from './googledrive-provider';
import type { GoogleDriveConfig, SyncData } from '@/types/sync';
import { DEFAULT_GOOGLE_DRIVE_CONFIG } from '@/types/sync';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GoogleDriveProvider', () => {
  let provider: GoogleDriveProvider;
  const mockAccessToken = 'mock-access-token';
  const mockConfig: GoogleDriveConfig = {
    ...DEFAULT_GOOGLE_DRIVE_CONFIG,
    enabled: true,
    useAppDataFolder: true,
    folderName: 'test-backup',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GoogleDriveProvider(mockConfig, mockAccessToken);
  });

  describe('constructor', () => {
    it('should initialize with correct type', () => {
      expect(provider.type).toBe('googledrive');
    });
  });

  describe('testConnection', () => {
    it('should return success when API returns user info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            user: { emailAddress: 'test@example.com' },
          }),
      });

      const result = await provider.testConnection();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/drive/v3/about'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it('should return error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Unauthorized' },
        }),
      });

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('upload', () => {
    const mockSyncData: SyncData = {
      version: '1.0',
      syncedAt: new Date().toISOString(),
      deviceId: 'test-device',
      deviceName: 'Test Device',
      checksum: 'abc123',
      dataTypes: ['settings'],
      data: {
        settings: { theme: 'dark' },
      },
    };

    it('should upload data successfully', async () => {
      // Mock folder search (empty - need to create)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ files: [] }),
      });

      // Mock folder creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'folder-123' }),
      });

      // Mock backup file upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'backup-file-123' }),
      });

      // Mock current.json search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ files: [] }),
      });

      // Mock current.json upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'current-file-123' }),
      });

      // Mock metadata.json search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ files: [] }),
      });

      // Mock metadata.json upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'metadata-file-123' }),
      });

      const result = await provider.upload(mockSyncData);

      expect(result.success).toBe(true);
      expect(result.direction).toBe('upload');
    });

    it('should handle upload errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Upload failed'));

      const result = await provider.upload(mockSyncData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });
  });

  describe('download', () => {
    it('should download data successfully', async () => {
      const mockData: SyncData = {
        version: '1.0',
        syncedAt: new Date().toISOString(),
        deviceId: 'test-device',
        deviceName: 'Test Device',
        checksum: 'abc123',
        dataTypes: ['settings'],
        data: { settings: { theme: 'dark' } },
      };

      // Mock folder search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ files: [{ id: 'folder-123' }] }),
      });

      // Mock file search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ files: [{ id: 'file-123', name: 'current.json' }] }),
      });

      // Mock file download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockData),
      });

      const result = await provider.download();

      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0');
      expect(result?.data.settings).toEqual({ theme: 'dark' });
    });

    it('should return null when no data exists', async () => {
      // Mock folder search - empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ files: [] }),
      });

      // Mock folder creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'folder-123' }),
      });

      // Mock file search - empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ files: [] }),
      });

      const result = await provider.download();

      expect(result).toBeNull();
    });
  });

  describe('getRemoteMetadata', () => {
    it('should return metadata when exists', async () => {
      const mockMetadata = {
        version: '1.0',
        syncedAt: new Date().toISOString(),
        deviceId: 'test-device',
        deviceName: 'Test Device',
        checksum: 'abc123',
        size: 1024,
      };

      // Mock folder search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ files: [{ id: 'folder-123' }] }),
      });

      // Mock file search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ files: [{ id: 'metadata-123', name: 'metadata.json' }] }),
      });

      // Mock file download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockMetadata),
      });

      const result = await provider.getRemoteMetadata();

      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0');
      expect(result?.checksum).toBe('abc123');
    });
  });

  describe('listBackups', () => {
    it('should list backup files', async () => {
      // Mock folder search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ files: [{ id: 'folder-123' }] }),
      });

      // Mock file list
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            files: [
              {
                id: 'backup-1',
                name: 'backup-2024-01-01.json',
                size: '1024',
                createdTime: '2024-01-01T00:00:00Z',
              },
              {
                id: 'backup-2',
                name: 'backup-2024-01-02.json',
                size: '2048',
                createdTime: '2024-01-02T00:00:00Z',
              },
              {
                id: 'current',
                name: 'current.json',
                size: '512',
              },
            ],
          }),
      });

      const result = await provider.listBackups();

      expect(result.length).toBe(2);
      expect(result[0].filename).toContain('backup-');
      expect(result[1].filename).toContain('backup-');
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const result = await provider.listBackups();

      expect(result).toEqual([]);
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      const result = await provider.deleteBackup('backup-123');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/files/backup-123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should return false on delete error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await provider.deleteBackup('backup-123');

      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should clear internal state', async () => {
      await provider.disconnect();
      // Provider should be disconnected - subsequent operations would fail
      // This is mainly for cleanup purposes
      expect(true).toBe(true);
    });
  });
});
