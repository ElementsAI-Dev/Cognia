/**
 * Google Drive Sync Provider
 * Uses Google Drive API v3 with App Data Folder for secure backup storage
 */

import type {
  GoogleDriveConfig,
  SyncProviderType,
  SyncData,
  SyncResult,
  SyncProgress,
  SyncMetadata,
  BackupInfo,
} from '@/types/sync';
import { BaseSyncProvider } from './sync-provider';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.app;

// Google Drive API endpoints
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// File names
const CURRENT_DATA_FILE = 'current.json';
const METADATA_FILE = 'metadata.json';
const BACKUP_PREFIX = 'backup-';

// ============================================
// Types for Google Drive API
// ============================================

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  appProperties?: Record<string, string>;
}

interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

interface DriveError {
  error: {
    code: number;
    message: string;
    errors?: Array<{ domain: string; reason: string; message: string }>;
  };
}

// ============================================
// Google Drive Provider
// ============================================

export class GoogleDriveProvider extends BaseSyncProvider {
  readonly type: SyncProviderType = 'googledrive';

  private config: GoogleDriveConfig;
  private accessToken: string;
  private folderId: string | null = null;

  constructor(config: GoogleDriveConfig, accessToken: string) {
    super();
    this.config = config;
    this.accessToken = accessToken;
  }

  /**
   * Test connection to Google Drive
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to access app data folder
      const response = await this.request<{ user: { emailAddress: string } }>(
        'GET',
        '/about?fields=user'
      );

      if (response.user) {
        log.info('Google Drive connection successful', {
          email: response.user.emailAddress,
        });
        return { success: true };
      }

      return { success: false, error: 'Failed to verify Google Drive access' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      log.error('Google Drive connection test failed', error as Error);
      return { success: false, error: message };
    }
  }

  /**
   * Upload sync data to Google Drive
   */
  async upload(
    data: SyncData,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    try {
      onProgress?.(
        this.createProgress('preparing', 0, 100, 'Preparing upload...')
      );

      // Ensure folder exists
      const folderId = await this.getOrCreateFolder();

      onProgress?.(
        this.createProgress('uploading', 20, 100, 'Creating backup...')
      );

      // Create timestamped backup
      const backupFilename = `${BACKUP_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const dataContent = JSON.stringify(data, null, 2);

      // Upload backup file
      await this.uploadFile(dataContent, backupFilename, folderId);

      onProgress?.(
        this.createProgress('uploading', 50, 100, 'Uploading current data...')
      );

      // Upload/update current.json
      await this.uploadOrUpdateFile(dataContent, CURRENT_DATA_FILE, folderId);

      onProgress?.(
        this.createProgress('uploading', 80, 100, 'Updating metadata...')
      );

      // Update metadata
      const metadata: SyncMetadata = {
        version: data.version,
        syncedAt: data.syncedAt,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        checksum: data.checksum,
        size: dataContent.length,
      };
      await this.uploadOrUpdateFile(
        JSON.stringify(metadata, null, 2),
        METADATA_FILE,
        folderId
      );

      onProgress?.(
        this.createProgress('completing', 100, 100, 'Upload complete')
      );

      // Count synced items
      const itemsSynced =
        (data.data.sessions?.length || 0) +
        (data.data.messages?.length || 0) +
        Object.keys(data.data.artifacts || {}).length +
        (data.data.settings ? 1 : 0);

      return this.createSuccessResult('upload', itemsSynced);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      log.error('Google Drive upload failed', error as Error);
      return this.createErrorResult('upload', message);
    }
  }

  /**
   * Download sync data from Google Drive
   */
  async download(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncData | null> {
    try {
      onProgress?.(
        this.createProgress('downloading', 0, 100, 'Connecting to Google Drive...')
      );

      const folderId = await this.getOrCreateFolder();

      onProgress?.(
        this.createProgress('downloading', 30, 100, 'Finding data file...')
      );

      // Find current.json
      const file = await this.findFile(CURRENT_DATA_FILE, folderId);
      if (!file) {
        log.info('No sync data found on Google Drive');
        return null;
      }

      onProgress?.(
        this.createProgress('downloading', 60, 100, 'Downloading data...')
      );

      // Download file content
      const content = await this.downloadFile(file.id);

      onProgress?.(
        this.createProgress('completing', 100, 100, 'Download complete')
      );

      return JSON.parse(content) as SyncData;
    } catch (error) {
      log.error('Google Drive download failed', error as Error);
      return null;
    }
  }

  /**
   * Get remote metadata without full download
   */
  async getRemoteMetadata(): Promise<SyncMetadata | null> {
    try {
      const folderId = await this.getOrCreateFolder();
      const file = await this.findFile(METADATA_FILE, folderId);

      if (!file) {
        return null;
      }

      const content = await this.downloadFile(file.id);
      return JSON.parse(content) as SyncMetadata;
    } catch (error) {
      log.error('Failed to get Google Drive metadata', error as Error);
      return null;
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      const folderId = await this.getOrCreateFolder();
      const files = await this.listFiles(folderId);

      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (file.name.startsWith(BACKUP_PREFIX) && file.name.endsWith('.json')) {
          backups.push({
            id: file.id,
            filename: file.name,
            createdAt: file.createdTime || new Date().toISOString(),
            size: parseInt(file.size || '0', 10),
            deviceId: file.appProperties?.deviceId || '',
            deviceName: file.appProperties?.deviceName || '',
            checksum: file.appProperties?.checksum || '',
          });
        }
      }

      // Sort by creation time, newest first
      backups.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return backups;
    } catch (error) {
      log.error('Failed to list Google Drive backups', error as Error);
      return [];
    }
  }

  /**
   * Download a specific backup by file ID
   */
  async downloadBackup(id: string): Promise<SyncData | null> {
    try {
      const content = await this.downloadFile(id);
      if (!content) return null;
      return JSON.parse(content) as SyncData;
    } catch (error) {
      log.error('Failed to download Google Drive backup', error as Error);
      return null;
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(id: string): Promise<boolean> {
    try {
      await this.deleteFile(id);
      return true;
    } catch (error) {
      log.error('Failed to delete Google Drive backup', error as Error);
      return false;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.folderId = null;
    this.accessToken = '';
    log.info('Disconnected from Google Drive');
  }

  // ============================================
  // Private API Methods
  // ============================================

  /**
   * Make authenticated request to Google Drive API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    isUpload = false
  ): Promise<T> {
    const baseUrl = isUpload ? UPLOAD_API : DRIVE_API;
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
    };

    if (body && !isUpload) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await proxyFetch(url, {
      method,
      headers,
      body: body ? (isUpload ? (body as string) : JSON.stringify(body)) : undefined,
    });

    if (!response.ok) {
      const errorData = (await response.json()) as DriveError;
      throw new Error(
        errorData.error?.message || `API request failed: ${response.status}`
      );
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * Get or create the sync folder
   */
  private async getOrCreateFolder(): Promise<string> {
    if (this.folderId) {
      return this.folderId;
    }

    // If using app data folder
    if (this.config.useAppDataFolder) {
      // App data folder is accessed via special 'appDataFolder' space
      // We still create a subfolder for organization
      const folderName = this.config.folderName || 'cognia-backup';

      // Search for existing folder in appDataFolder
      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const response = await this.request<DriveFileList>(
        'GET',
        `/files?q=${encodeURIComponent(query)}&spaces=appDataFolder&fields=files(id,name)`
      );

      if (response.files && response.files.length > 0) {
        this.folderId = response.files[0].id;
        return this.folderId;
      }

      // Create folder in appDataFolder
      const createResponse = await this.request<DriveFile>('POST', '/files', {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['appDataFolder'],
      });

      this.folderId = createResponse.id;
      return this.folderId;
    }

    // Using custom folder ID
    if (this.config.folderId) {
      this.folderId = this.config.folderId;
      return this.folderId;
    }

    throw new Error('No folder configured for Google Drive sync');
  }

  /**
   * Find a file by name in a folder
   */
  private async findFile(
    filename: string,
    folderId: string
  ): Promise<DriveFile | null> {
    const spaces = this.config.useAppDataFolder ? 'appDataFolder' : 'drive';
    const query = `name='${filename}' and '${folderId}' in parents and trashed=false`;

    const response = await this.request<DriveFileList>(
      'GET',
      `/files?q=${encodeURIComponent(query)}&spaces=${spaces}&fields=files(id,name,size,createdTime,modifiedTime,appProperties)`
    );

    return response.files && response.files.length > 0
      ? response.files[0]
      : null;
  }

  /**
   * List all files in a folder
   */
  private async listFiles(folderId: string): Promise<DriveFile[]> {
    const spaces = this.config.useAppDataFolder ? 'appDataFolder' : 'drive';
    const query = `'${folderId}' in parents and trashed=false`;

    const response = await this.request<DriveFileList>(
      'GET',
      `/files?q=${encodeURIComponent(query)}&spaces=${spaces}&fields=files(id,name,size,createdTime,modifiedTime,appProperties)&pageSize=100`
    );

    return response.files || [];
  }

  /**
   * Upload a new file
   */
  private async uploadFile(
    content: string,
    filename: string,
    folderId: string
  ): Promise<string> {
    // Use multipart upload for smaller files
    const metadata = {
      name: filename,
      parents: [folderId],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      closeDelimiter;

    const response = await proxyFetch(
      `${UPLOAD_API}/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const result = (await response.json()) as DriveFile;
    return result.id;
  }

  /**
   * Upload or update a file (create if not exists, update if exists)
   */
  private async uploadOrUpdateFile(
    content: string,
    filename: string,
    folderId: string
  ): Promise<string> {
    const existingFile = await this.findFile(filename, folderId);

    if (existingFile) {
      // Update existing file
      const response = await proxyFetch(
        `${UPLOAD_API}/files/${existingFile.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: content,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Update failed: ${error}`);
      }

      return existingFile.id;
    }

    // Create new file
    return this.uploadFile(content, filename, folderId);
  }

  /**
   * Download file content
   */
  private async downloadFile(fileId: string): Promise<string> {
    const response = await proxyFetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    return response.text();
  }

  /**
   * Delete a file
   */
  private async deleteFile(fileId: string): Promise<void> {
    await this.request<void>('DELETE', `/files/${fileId}`);
  }
}
