/**
 * WebDAV Sync Provider - Implements sync via WebDAV protocol
 */

import type {
  SyncProviderType,
  SyncData,
  SyncResult,
  SyncMetadata,
  SyncProgress,
  BackupInfo,
  WebDAVConfig,
} from '@/types/sync';
import { BaseSyncProvider } from './sync-provider';
import { loggers } from '@/lib/logger';

const log = loggers.network;

// WebDAV response types
interface WebDAVFileInfo {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: 'file' | 'directory';
  etag?: string;
}

interface WebDAVClientOptions {
  url: string;
  username: string;
  password: string;
  digest?: boolean;
}

/**
 * Simple WebDAV client implementation
 * Uses fetch API with basic/digest auth
 */
class SimpleWebDAVClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(options: WebDAVClientOptions) {
    this.baseUrl = options.url.replace(/\/$/, '');
    this.authHeader = 'Basic ' + btoa(`${options.username}:${options.password}`);
  }

  private async request(
    method: string,
    path: string,
    options: {
      body?: string | ArrayBuffer;
      headers?: Record<string, string>;
    } = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      ...options.headers,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: options.body,
    });

    return response;
  }

  async exists(path: string): Promise<boolean> {
    try {
      const response = await this.request('PROPFIND', path, {
        headers: { Depth: '0' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async createDirectory(path: string): Promise<boolean> {
    try {
      const response = await this.request('MKCOL', path);
      return response.ok || response.status === 405; // 405 = already exists
    } catch {
      return false;
    }
  }

  async putFile(path: string, content: string): Promise<boolean> {
    try {
      const response = await this.request('PUT', path, {
        body: content,
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getFile(path: string): Promise<string | null> {
    try {
      const response = await this.request('GET', path);
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      const response = await this.request('DELETE', path);
      return response.ok || response.status === 404;
    } catch {
      return false;
    }
  }

  async listDirectory(path: string): Promise<WebDAVFileInfo[]> {
    try {
      const response = await this.request('PROPFIND', path, {
        headers: { Depth: '1' },
        body: `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:resourcetype/>
    <D:getetag/>
  </D:prop>
</D:propfind>`,
      });

      if (!response.ok) return [];

      const text = await response.text();
      return this.parseMultistatus(text, path);
    } catch {
      return [];
    }
  }

  private parseMultistatus(xml: string, basePath: string): WebDAVFileInfo[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const responses = doc.getElementsByTagNameNS('DAV:', 'response');
    const files: WebDAVFileInfo[] = [];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const href = response.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent || '';
      
      // Skip the base directory itself
      if (href === basePath || href === basePath + '/') continue;

      const displayname = response.getElementsByTagNameNS('DAV:', 'displayname')[0]?.textContent || '';
      const contentLength = response.getElementsByTagNameNS('DAV:', 'getcontentlength')[0]?.textContent;
      const lastmod = response.getElementsByTagNameNS('DAV:', 'getlastmodified')[0]?.textContent || '';
      const resourcetype = response.getElementsByTagNameNS('DAV:', 'resourcetype')[0];
      const collection = resourcetype?.getElementsByTagNameNS('DAV:', 'collection')[0];
      const etag = response.getElementsByTagNameNS('DAV:', 'getetag')[0]?.textContent;

      const basename = displayname || href.split('/').filter(Boolean).pop() || '';

      files.push({
        filename: href,
        basename,
        lastmod,
        size: contentLength ? parseInt(contentLength, 10) : 0,
        type: collection ? 'directory' : 'file',
        etag: etag || undefined,
      });
    }

    return files;
  }
}

/**
 * WebDAV Sync Provider
 */
export class WebDAVProvider extends BaseSyncProvider {
  readonly type: SyncProviderType = 'webdav';
  
  private config: WebDAVConfig;
  private password: string;
  private client: SimpleWebDAVClient | null = null;

  constructor(config: WebDAVConfig, password: string) {
    super();
    this.config = config;
    this.password = password;
  }

  private getClient(): SimpleWebDAVClient {
    if (!this.client) {
      this.client = new SimpleWebDAVClient({
        url: this.config.serverUrl,
        username: this.config.username,
        password: this.password,
        digest: this.config.useDigestAuth,
      });
    }
    return this.client;
  }

  private getRemotePath(filename?: string): string {
    const base = this.config.remotePath.replace(/\/$/, '');
    return filename ? `${base}/${filename}` : base;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.getClient();
      
      // Try to access the remote path
      const exists = await client.exists(this.getRemotePath());
      
      if (!exists) {
        // Try to create the directory
        const created = await client.createDirectory(this.getRemotePath());
        if (!created) {
          return { success: false, error: 'Cannot access or create sync directory' };
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async upload(
    data: SyncData,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    try {
      const client = this.getClient();
      
      onProgress?.(this.createProgress('preparing', 0, 100, 'Preparing upload...'));

      // Ensure directory exists
      await client.createDirectory(this.getRemotePath());

      onProgress?.(this.createProgress('uploading', 20, 100, 'Uploading data...'));

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `backup-${timestamp}.json`;
      const currentFilename = 'current.json';

      // Serialize data
      const jsonData = JSON.stringify(data, null, 2);

      // Upload current sync data
      const uploadSuccess = await client.putFile(
        this.getRemotePath(currentFilename),
        jsonData
      );

      if (!uploadSuccess) {
        return this.createErrorResult('upload', 'Failed to upload sync data');
      }

      onProgress?.(this.createProgress('uploading', 60, 100, 'Creating backup...'));

      // Also create a backup copy
      await client.putFile(this.getRemotePath(backupFilename), jsonData);

      onProgress?.(this.createProgress('completing', 100, 100, 'Upload complete'));

      // Count items synced
      const itemsSynced = 
        (data.data.sessions?.length || 0) +
        (data.data.messages?.length || 0) +
        Object.keys(data.data.artifacts || {}).length +
        (data.data.settings ? 1 : 0);

      return this.createSuccessResult('upload', itemsSynced);
    } catch (error) {
      return this.createErrorResult(
        'upload',
        error instanceof Error ? error.message : 'Upload failed'
      );
    }
  }

  async download(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncData | null> {
    try {
      const client = this.getClient();
      
      onProgress?.(this.createProgress('downloading', 0, 100, 'Downloading data...'));

      const content = await client.getFile(this.getRemotePath('current.json'));

      if (!content) {
        return null;
      }

      onProgress?.(this.createProgress('downloading', 80, 100, 'Parsing data...'));

      const data = JSON.parse(content) as SyncData;

      onProgress?.(this.createProgress('completing', 100, 100, 'Download complete'));

      return data;
    } catch (error) {
      log.error('WebDAV download error', error as Error);
      return null;
    }
  }

  async getRemoteMetadata(): Promise<SyncMetadata | null> {
    try {
      const client = this.getClient();
      const files = await client.listDirectory(this.getRemotePath());
      
      const currentFile = files.find((f) => f.basename === 'current.json');
      if (!currentFile) return null;

      // Download and parse to get metadata
      const content = await client.getFile(this.getRemotePath('current.json'));
      if (!content) return null;

      const data = JSON.parse(content) as SyncData;
      
      return {
        version: data.version,
        syncedAt: data.syncedAt,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        checksum: data.checksum,
        size: currentFile.size,
      };
    } catch {
      return null;
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      const client = this.getClient();
      const files = await client.listDirectory(this.getRemotePath());
      
      return files
        .filter((f) => f.type === 'file' && f.basename.startsWith('backup-'))
        .map((f) => ({
          id: f.basename,
          filename: f.basename,
          createdAt: f.lastmod,
          size: f.size,
          deviceId: '', // Would need to parse file to get this
          deviceName: '',
          checksum: f.etag || '',
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  async deleteBackup(id: string): Promise<boolean> {
    try {
      const client = this.getClient();
      return await client.deleteFile(this.getRemotePath(id));
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }
}
