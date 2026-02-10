/**
 * GitHub Sync Provider - Implements sync via GitHub API
 * Supports both repository mode and Gist mode
 */

import type {
  SyncProviderType,
  SyncData,
  SyncResult,
  SyncMetadata,
  SyncProgress,
  BackupInfo,
  GitHubSyncConfig,
} from '@/types/sync';
import { BaseSyncProvider } from './sync-provider';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.network;

// GitHub API response types
interface GitHubUser {
  login: string;
  id: number;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
}

interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
}

interface GitHubGist {
  id: string;
  description: string;
  public: boolean;
  files: Record<string, { filename: string; content: string; size: number }>;
  created_at: string;
  updated_at: string;
}

/**
 * GitHub API client
 */
class GitHubClient {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T | null> {
    try {
      const response = await proxyFetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.text();
        log.error(`GitHub API error: ${response.status}`, new Error(error));
        return null;
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      log.error('GitHub request failed', error as Error);
      return null;
    }
  }

  async getUser(): Promise<GitHubUser | null> {
    return this.request<GitHubUser>('GET', '/user');
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo | null> {
    return this.request<GitHubRepo>('GET', `/repos/${owner}/${repo}`);
  }

  async createRepo(name: string, isPrivate: boolean): Promise<GitHubRepo | null> {
    return this.request<GitHubRepo>('POST', '/user/repos', {
      name,
      private: isPrivate,
      auto_init: true,
      description: 'Cognia sync backup repository',
    });
  }

  async getContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<GitHubContent | GitHubContent[] | null> {
    return this.request<GitHubContent | GitHubContent[]>(
      'GET',
      `/repos/${owner}/${repo}/contents/${path}`
    );
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<{ content: GitHubContent; commit: GitHubCommit } | null> {
    const body: Record<string, unknown> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))), // Base64 encode
      branch: 'main',
    };

    if (sha) {
      body.sha = sha;
    }

    return this.request('PUT', `/repos/${owner}/${repo}/contents/${path}`, body);
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    sha: string,
    message: string
  ): Promise<boolean> {
    const result = await this.request('DELETE', `/repos/${owner}/${repo}/contents/${path}`, {
      message,
      sha,
      branch: 'main',
    });
    return result !== null;
  }

  async getCommits(owner: string, repo: string, path?: string): Promise<GitHubCommit[]> {
    const endpoint = path
      ? `/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}`
      : `/repos/${owner}/${repo}/commits`;
    return (await this.request<GitHubCommit[]>('GET', endpoint)) || [];
  }

  // Gist operations
  async getGist(gistId: string): Promise<GitHubGist | null> {
    return this.request<GitHubGist>('GET', `/gists/${gistId}`);
  }

  async createGist(
    description: string,
    files: Record<string, { content: string }>,
    isPublic: boolean
  ): Promise<GitHubGist | null> {
    return this.request<GitHubGist>('POST', '/gists', {
      description,
      public: isPublic,
      files,
    });
  }

  async updateGist(
    gistId: string,
    description: string,
    files: Record<string, { content: string }>
  ): Promise<GitHubGist | null> {
    return this.request<GitHubGist>('PATCH', `/gists/${gistId}`, {
      description,
      files,
    });
  }

  async deleteGist(gistId: string): Promise<boolean> {
    await this.request('DELETE', `/gists/${gistId}`);
    return true;
  }

  async listGists(): Promise<GitHubGist[]> {
    return (await this.request<GitHubGist[]>('GET', '/gists')) || [];
  }
}

/**
 * GitHub Sync Provider
 */
export class GitHubProvider extends BaseSyncProvider {
  readonly type: SyncProviderType = 'github';

  private config: GitHubSyncConfig;
  private token: string;
  private client: GitHubClient | null = null;

  constructor(config: GitHubSyncConfig, token: string) {
    super();
    this.config = config;
    this.token = token;
  }

  private getClient(): GitHubClient {
    if (!this.client) {
      this.client = new GitHubClient(this.token);
    }
    return this.client;
  }

  private getFilePath(filename: string): string {
    const base = this.config.remotePath.replace(/^\/|\/$/g, '');
    return base ? `${base}/${filename}` : filename;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.getClient();

      // Verify token by getting user info
      const user = await client.getUser();
      if (!user) {
        return { success: false, error: 'Invalid GitHub token' };
      }

      if (this.config.gistMode) {
        // In gist mode, we just verify token works
        return { success: true };
      }

      // Check if repo exists
      const repo = await client.getRepo(this.config.repoOwner, this.config.repoName);

      if (!repo) {
        if (this.config.createPrivateRepo) {
          // Try to create the repo
          const newRepo = await client.createRepo(
            this.config.repoName,
            this.config.createPrivateRepo
          );
          if (!newRepo) {
            return { success: false, error: 'Failed to create sync repository' };
          }
        } else {
          return { success: false, error: 'Repository not found' };
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

      const jsonData = JSON.stringify(data, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (this.config.gistMode) {
        return await this.uploadToGist(client, jsonData, timestamp, onProgress);
      } else {
        return await this.uploadToRepo(client, jsonData, timestamp, data, onProgress);
      }
    } catch (error) {
      return this.createErrorResult(
        'upload',
        error instanceof Error ? error.message : 'Upload failed'
      );
    }
  }

  private async uploadToGist(
    client: GitHubClient,
    jsonData: string,
    timestamp: string,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    onProgress?.(this.createProgress('uploading', 30, 100, 'Uploading to Gist...'));

    const files = {
      'cognia-sync.json': { content: jsonData },
      [`backup-${timestamp}.json`]: { content: jsonData },
    };

    let gist: GitHubGist | null;

    if (this.config.gistId) {
      // Update existing gist
      gist = await client.updateGist(this.config.gistId, 'Cognia Sync Backup', files);
    } else {
      // Create new gist
      gist = await client.createGist('Cognia Sync Backup', files, false);
    }

    if (!gist) {
      return this.createErrorResult('upload', 'Failed to upload to Gist');
    }

    onProgress?.(this.createProgress('completing', 100, 100, 'Upload complete'));

    return this.createSuccessResult('upload', 1);
  }

  private async uploadToRepo(
    client: GitHubClient,
    jsonData: string,
    timestamp: string,
    data: SyncData,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const { repoOwner, repoName } = this.config;
    const currentPath = this.getFilePath('current.json');
    const backupPath = this.getFilePath(`backup-${timestamp}.json`);

    onProgress?.(this.createProgress('uploading', 30, 100, 'Checking existing file...'));

    // Get existing file SHA if it exists
    let sha: string | undefined;
    const existing = await client.getContent(repoOwner, repoName, currentPath);
    if (existing && !Array.isArray(existing) && existing.sha) {
      sha = existing.sha;
    }

    onProgress?.(this.createProgress('uploading', 50, 100, 'Uploading current.json...'));

    // Upload current.json
    const result = await client.createOrUpdateFile(
      repoOwner,
      repoName,
      currentPath,
      jsonData,
      `Sync update from ${data.deviceName}`,
      sha
    );

    if (!result) {
      return this.createErrorResult('upload', 'Failed to upload sync data');
    }

    onProgress?.(this.createProgress('uploading', 60, 100, 'Writing metadata...'));

    // Write separate metadata file for fast getRemoteMetadata
    const metadataPath = this.getFilePath('metadata.json');
    const metadata: SyncMetadata = {
      version: data.version,
      syncedAt: data.syncedAt,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      checksum: data.checksum,
      size: jsonData.length,
    };
    let metaSha: string | undefined;
    const existingMeta = await client.getContent(repoOwner, repoName, metadataPath);
    if (existingMeta && !Array.isArray(existingMeta) && existingMeta.sha) {
      metaSha = existingMeta.sha;
    }
    await client.createOrUpdateFile(
      repoOwner,
      repoName,
      metadataPath,
      JSON.stringify(metadata),
      `Metadata update from ${data.deviceName}`,
      metaSha
    );

    onProgress?.(this.createProgress('uploading', 80, 100, 'Creating backup...'));

    // Create backup
    await client.createOrUpdateFile(
      repoOwner,
      repoName,
      backupPath,
      jsonData,
      `Backup from ${data.deviceName} at ${timestamp}`
    );

    onProgress?.(this.createProgress('completing', 100, 100, 'Upload complete'));

    const itemsSynced =
      (data.data.sessions?.length || 0) +
      (data.data.messages?.length || 0) +
      Object.keys(data.data.artifacts || {}).length +
      (data.data.settings ? 1 : 0);

    return this.createSuccessResult('upload', itemsSynced);
  }

  async download(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncData | null> {
    try {
      const client = this.getClient();

      onProgress?.(this.createProgress('downloading', 0, 100, 'Downloading data...'));

      if (this.config.gistMode) {
        return await this.downloadFromGist(client, onProgress);
      } else {
        return await this.downloadFromRepo(client, onProgress);
      }
    } catch (error) {
      log.error('GitHub download error', error as Error);
      return null;
    }
  }

  private async downloadFromGist(
    client: GitHubClient,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncData | null> {
    if (!this.config.gistId) {
      return null;
    }

    onProgress?.(this.createProgress('downloading', 50, 100, 'Fetching Gist...'));

    const gist = await client.getGist(this.config.gistId);
    if (!gist) return null;

    const syncFile = gist.files['cognia-sync.json'];
    if (!syncFile) return null;

    onProgress?.(this.createProgress('completing', 100, 100, 'Download complete'));

    return JSON.parse(syncFile.content) as SyncData;
  }

  private async downloadFromRepo(
    client: GitHubClient,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncData | null> {
    const { repoOwner, repoName } = this.config;
    const currentPath = this.getFilePath('current.json');

    onProgress?.(this.createProgress('downloading', 50, 100, 'Fetching file...'));

    const content = await client.getContent(repoOwner, repoName, currentPath);
    if (!content || Array.isArray(content) || !content.content) {
      return null;
    }

    onProgress?.(this.createProgress('downloading', 80, 100, 'Parsing data...'));

    // Decode base64 content
    const decoded = decodeURIComponent(escape(atob(content.content)));

    onProgress?.(this.createProgress('completing', 100, 100, 'Download complete'));

    return JSON.parse(decoded) as SyncData;
  }

  async getRemoteMetadata(): Promise<SyncMetadata | null> {
    try {
      const client = this.getClient();

      if (this.config.gistMode) {
        // Gist mode: read metadata from the main sync file
        const data = await this.download();
        if (!data) return null;
        return {
          version: data.version,
          syncedAt: data.syncedAt,
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          checksum: data.checksum,
          size: JSON.stringify(data).length,
        };
      }

      // Repo mode: try small metadata.json first
      const { repoOwner, repoName } = this.config;
      const metadataPath = this.getFilePath('metadata.json');
      const metaFile = await client.getContent(repoOwner, repoName, metadataPath);

      if (metaFile && !Array.isArray(metaFile) && metaFile.content) {
        const decoded = atob(metaFile.content);
        return JSON.parse(decoded) as SyncMetadata;
      }

      // Fallback: download full current.json for legacy data
      const data = await this.download();
      if (!data) return null;
      return {
        version: data.version,
        syncedAt: data.syncedAt,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        checksum: data.checksum,
        size: JSON.stringify(data).length,
      };
    } catch {
      return null;
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      const client = this.getClient();

      if (this.config.gistMode) {
        // List gist files
        if (!this.config.gistId) return [];
        
        const gist = await client.getGist(this.config.gistId);
        if (!gist) return [];

        return Object.entries(gist.files)
          .filter(([name]) => name.startsWith('backup-'))
          .map(([name, file]) => ({
            id: name,
            filename: name,
            createdAt: gist.updated_at,
            size: file.size,
            deviceId: '',
            deviceName: '',
            checksum: '',
          }));
      } else {
        // List repo files
        const { repoOwner, repoName } = this.config;
        const basePath = this.config.remotePath.replace(/^\/|\/$/g, '');
        
        const contents = await client.getContent(repoOwner, repoName, basePath);
        if (!contents || !Array.isArray(contents)) return [];

        return contents
          .filter((f) => f.name.startsWith('backup-') && f.name.endsWith('.json'))
          .map((f) => ({
            id: f.sha,
            filename: f.name,
            createdAt: '', // Would need to get commit info
            size: f.size,
            deviceId: '',
            deviceName: '',
            checksum: f.sha,
          }));
      }
    } catch {
      return [];
    }
  }

  async downloadBackup(id: string): Promise<SyncData | null> {
    try {
      const client = this.getClient();

      if (this.config.gistMode) {
        if (!this.config.gistId) return null;
        const gist = await client.getGist(this.config.gistId);
        if (!gist || !gist.files[id]) return null;
        const content = gist.files[id].content;
        return JSON.parse(content) as SyncData;
      } else {
        const { repoOwner, repoName } = this.config;
        const backups = await this.listBackups();
        const backup = backups.find((b) => b.id === id);
        if (!backup) return null;

        const path = this.getFilePath(backup.filename);
        const fileContent = await client.getContent(repoOwner, repoName, path);
        if (!fileContent || Array.isArray(fileContent) || !fileContent.content) return null;

        const decoded = atob(fileContent.content);
        return JSON.parse(decoded) as SyncData;
      }
    } catch {
      return null;
    }
  }

  async deleteBackup(id: string): Promise<boolean> {
    try {
      const client = this.getClient();

      if (this.config.gistMode) {
        if (!this.config.gistId) return false;
        // Delete a file from gist by setting its value to null
        const files = { [id]: null } as unknown as Record<string, { content: string }>;
        const result = await client.updateGist(this.config.gistId, 'Cognia Sync Backup', files);
        return result !== null;
      } else {
        const { repoOwner, repoName } = this.config;
        const backups = await this.listBackups();
        const backup = backups.find((b) => b.id === id);
        
        if (!backup) return false;

        const path = this.getFilePath(backup.filename);
        return await client.deleteFile(
          repoOwner,
          repoName,
          path,
          id,
          `Delete backup ${backup.filename}`
        );
      }
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }
}
