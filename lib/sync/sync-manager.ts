/**
 * Sync Manager - Orchestrates sync operations between local and remote storage
 */

import type {
  SyncProvider,
  SyncProviderType,
  SyncState,
  SyncData,
  SyncResult,
  SyncProgress,
  SyncDirection,
  SyncConflict,
  BackupInfo,
  SyncDataContent,
} from '@/types/sync';
import type { Project } from '@/types';
import type { DBFolder, DBMessage } from '@/lib/db';
import type { BackupPackageV3 } from '@/lib/storage/persistence/types';
import type { PersistedChatMessage } from '@/lib/storage/persistence/types';
import { WebDAVProvider } from './providers/webdav-provider';
import { GitHubProvider } from './providers/github-provider';
import { GoogleDriveProvider } from './providers/googledrive-provider';
import { createFullBackup } from '@/lib/storage/data-export';
import { importFullBackup } from '@/lib/storage/data-import';
import { generateChecksum } from '@/lib/storage/data-import';
import { loggers } from '@/lib/logger';

const log = loggers.app;

/** Current sync data schema version */
const SYNC_DATA_VERSION = '1.1';

function toSyncMessage(message: PersistedChatMessage): DBMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    branchId: message.branchId,
    role: message.role,
    content: message.content,
    parts: message.parts ? JSON.stringify(message.parts) : undefined,
    model: message.model,
    provider: message.provider,
    tokens: message.tokens ? JSON.stringify(message.tokens) : undefined,
    attachments: message.attachments ? JSON.stringify(message.attachments) : undefined,
    sources: message.sources ? JSON.stringify(message.sources) : undefined,
    error: message.error,
    createdAt: message.createdAt,
    isEdited: message.isEdited,
    editHistory: message.editHistory ? JSON.stringify(message.editHistory) : undefined,
    originalContent: message.originalContent,
    isBookmarked: message.isBookmarked,
    bookmarkedAt: message.bookmarkedAt,
    reaction: message.reaction,
    reactions: message.reactions ? JSON.stringify(message.reactions) : undefined,
  };
}

function fromSyncMessage(message: DBMessage): PersistedChatMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    branchId: message.branchId,
    role: message.role as PersistedChatMessage['role'],
    content: message.content,
    parts: message.parts ? JSON.parse(message.parts) : undefined,
    model: message.model,
    provider: message.provider,
    tokens: message.tokens ? JSON.parse(message.tokens) : undefined,
    attachments: message.attachments ? JSON.parse(message.attachments) : undefined,
    sources: message.sources ? JSON.parse(message.sources) : undefined,
    error: message.error,
    createdAt: message.createdAt,
    isEdited: message.isEdited,
    editHistory: message.editHistory ? JSON.parse(message.editHistory) : undefined,
    originalContent: message.originalContent,
    isBookmarked: message.isBookmarked,
    bookmarkedAt: message.bookmarkedAt,
    reaction: message.reaction as PersistedChatMessage['reaction'],
    reactions: message.reactions ? JSON.parse(message.reactions) : undefined,
  };
}

/**
 * Migrate sync data from older versions to the current version
 */
function migrateSyncData(data: SyncData): SyncData {
  const version = data.version || '1.0';

  if (version === SYNC_DATA_VERSION) {
    return data;
  }

  // v1.0 → v1.1: Add maxBackups and syncDataTypes fields
  if (version === '1.0') {
    log.info(`Migrating sync data from v${version} to v${SYNC_DATA_VERSION}`);
    return {
      ...data,
      version: SYNC_DATA_VERSION,
    };
  }

  // Unknown version - return as-is with a warning
  log.warn(`Unknown sync data version: ${version}`);
  return data;
}

/**
 * Sync Manager class - singleton
 */
class SyncManager {
  private provider: SyncProvider | null = null;
  private providerType: SyncProviderType | null = null;
  private isSyncing = false;
  private abortController: AbortController | null = null;

  /**
   * Initialize with WebDAV provider
   */
  async initWebDAV(password: string): Promise<void> {
    const { useSyncStore } = await import('@/stores/sync');
    const config = useSyncStore.getState().webdavConfig;
    
    this.provider = new WebDAVProvider(config, password);
    this.providerType = 'webdav';
  }

  /**
   * Initialize with GitHub provider
   */
  async initGitHub(token: string): Promise<void> {
    const { useSyncStore } = await import('@/stores/sync');
    const config = useSyncStore.getState().githubConfig;
    
    this.provider = new GitHubProvider(config, token);
    this.providerType = 'github';
  }

  /**
   * Initialize with Google Drive provider
   * Automatically refreshes expired OAuth tokens
   */
  async initGoogleDrive(accessToken: string): Promise<void> {
    const { useSyncStore } = await import('@/stores/sync');
    const config = useSyncStore.getState().googleDriveConfig;
    
    let token = accessToken;

    // Check if token is expired and try to refresh
    try {
      const {
        isGoogleTokenExpired,
        getGoogleRefreshToken,
        updateGoogleAccessToken,
      } = await import('./credential-storage');
      const { refreshGoogleToken, calculateTokenExpiry } = await import(
        './providers/google-oauth'
      );

      const expired = await isGoogleTokenExpired();
      if (expired) {
        const refreshToken = await getGoogleRefreshToken();
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

        if (refreshToken && clientId) {
          log.info('Google access token expired, refreshing...');
          const tokens = await refreshGoogleToken(refreshToken, clientId);
          token = tokens.access_token;
          const expiresAt = calculateTokenExpiry(tokens.expires_in);
          await updateGoogleAccessToken(token, expiresAt);
          log.info('Google access token refreshed successfully');
        } else {
          log.warn('Cannot refresh Google token: missing refresh token or client ID');
        }
      }
    } catch (error) {
      log.error('Failed to refresh Google token, using existing token', error as Error);
    }

    this.provider = new GoogleDriveProvider(config, token);
    this.providerType = 'googledrive';
  }

  private resolveProviderType(stateProvider: SyncProviderType | null): SyncProviderType | null {
    return this.providerType || stateProvider;
  }

  private getConfigByProvider(
    provider: SyncProviderType | null,
    state: SyncState
  ) {
    if (provider === 'webdav') return state.webdavConfig;
    if (provider === 'github') return state.githubConfig;
    if (provider === 'googledrive') return state.googleDriveConfig;
    return null;
  }

  async ensureProviderInitialized(
    provider: SyncProviderType | null
  ): Promise<{ success: boolean; error?: string }> {
    if (!provider) {
      return { success: false, error: 'No sync provider configured' };
    }

    if (this.provider && this.providerType === provider) {
      return { success: true };
    }

    try {
      if (provider === 'webdav') {
        const { getWebDAVPassword } = await import('./credential-storage');
        const password = await getWebDAVPassword();
        if (!password) {
          return { success: false, error: 'No WebDAV credential configured' };
        }
        await this.initWebDAV(password);
      } else if (provider === 'github') {
        const { getGitHubToken } = await import('./credential-storage');
        const token = await getGitHubToken();
        if (!token) {
          return { success: false, error: 'No GitHub credential configured' };
        }
        await this.initGitHub(token);
      } else if (provider === 'googledrive') {
        const { getGoogleAccessToken } = await import('./credential-storage');
        const token = await getGoogleAccessToken();
        if (!token) {
          return { success: false, error: 'No Google Drive credential configured' };
        }
        await this.initGoogleDrive(token);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async runBackupUploadForProvider(provider: SyncProviderType): Promise<{ success: boolean; error?: string }> {
    const { useSyncStore } = await import('@/stores/sync');
    const state = useSyncStore.getState();
    const previousProvider = state.activeProvider;

    try {
      state.setActiveProvider(provider);

      const initialized = await this.ensureProviderInitialized(provider);
      if (!initialized.success) {
        return initialized;
      }

      const result = await this.sync('upload');
      return { success: result.success, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      useSyncStore.getState().setActiveProvider(previousProvider);
      if (previousProvider) {
        const restored = await this.ensureProviderInitialized(previousProvider);
        if (!restored.success) {
          log.warn('Failed to restore previous sync provider after backup upload', {
            previousProvider,
            error: restored.error,
          });
          await this.disconnect();
        }
      } else {
        await this.disconnect();
      }
    }
  }

  /**
   * Get current provider
   */
  getProvider(): SyncProvider | null {
    return this.provider;
  }

  /**
   * Test connection to remote
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.provider) {
      return { success: false, error: 'No sync provider initialized' };
    }

    return await this.provider.testConnection();
  }

  /**
   * Perform sync operation
   */
  async sync(
    direction: SyncDirection,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    if (!this.provider) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        direction,
        itemsSynced: 0,
        error: 'No sync provider initialized',
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        direction,
        itemsSynced: 0,
        error: 'Sync already in progress',
      };
    }

    // Check network connectivity
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        direction,
        itemsSynced: 0,
        error: 'No network connection',
      };
    }

    this.isSyncing = true;
    this.abortController = new AbortController();

    try {
      switch (direction) {
        case 'upload':
          return await this.uploadData(onProgress);
        case 'download':
          return await this.downloadData(onProgress);
        case 'bidirectional':
          return await this.bidirectionalSync(onProgress);
        default:
          return {
            success: false,
            timestamp: new Date().toISOString(),
            direction,
            itemsSynced: 0,
            error: 'Invalid sync direction',
          };
      }
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        return this.createErrorResult(direction, 'Sync cancelled');
      }
      throw error;
    } finally {
      this.isSyncing = false;
      this.abortController = null;
    }
  }

  /**
   * Cancel ongoing sync operation
   */
  cancelSync(): void {
    if (this.abortController) {
      this.abortController.abort();
      log.info('Sync cancelled by user');
    }
  }

  /**
   * Check if sync was cancelled
   */
  private checkCancelled(): void {
    if (this.abortController?.signal.aborted) {
      throw new DOMException('Sync cancelled', 'AbortError');
    }
  }

  /**
   * Upload local data to remote
   */
  private async uploadData(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    if (!this.provider) {
      return this.createErrorResult('upload', 'No provider');
    }

    onProgress?.({
      phase: 'preparing',
      current: 0,
      total: 100,
      message: 'Preparing local data...',
    });

    // Get local data
    const localData = await this.getLocalData();
    this.checkCancelled();

    onProgress?.({
      phase: 'uploading',
      current: 20,
      total: 100,
      message: 'Uploading to remote...',
    });

    // Upload to remote
    const result = await this.provider.upload(localData, onProgress);

    // Cleanup old backups after successful upload
    if (result.success) {
      this.cleanupOldBackups().catch((err) => {
        log.error('Failed to cleanup old backups', err as Error);
      });
    }

    return result;
  }

  /**
   * Remove old backups exceeding maxBackups limit
   */
  private async cleanupOldBackups(): Promise<void> {
    if (!this.provider) return;

    const { useSyncStore } = await import('@/stores/sync');
    const state = useSyncStore.getState();
    const providerType = this.resolveProviderType(state.activeProvider);
    const config = this.getConfigByProvider(providerType, state);
    if (!config) return;

    const maxBackups = config.maxBackups;
    if (!maxBackups || maxBackups <= 0) return;

    try {
      const backups = await this.provider.listBackups();
      if (backups.length <= maxBackups) return;

      // Backups are sorted newest-first by listBackups
      const toDelete = backups.slice(maxBackups);
      for (const backup of toDelete) {
        await this.provider.deleteBackup(backup.id);
        log.info(`Deleted old backup: ${backup.filename}`);
      }
    } catch (error) {
      log.error('Backup cleanup failed', error as Error);
    }
  }

  /**
   * Download remote data to local
   */
  private async downloadData(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    if (!this.provider) {
      return this.createErrorResult('download', 'No provider');
    }

    onProgress?.({
      phase: 'downloading',
      current: 0,
      total: 100,
      message: 'Downloading from remote...',
    });

    // Download remote data
    let remoteData = await this.provider.download(onProgress);
    this.checkCancelled();

    if (!remoteData) {
      return this.createErrorResult('download', 'No remote data found');
    }

    // Migrate older data formats
    remoteData = migrateSyncData(remoteData);

    onProgress?.({
      phase: 'merging',
      current: 60,
      total: 100,
      message: 'Importing data...',
    });

    // Verify data integrity
    if (remoteData.checksum) {
      const actualChecksum = generateChecksum(JSON.stringify(remoteData.data));
      if (actualChecksum !== remoteData.checksum) {
        log.error('Checksum mismatch on downloaded data', {
          expected: remoteData.checksum,
          actual: actualChecksum,
        });
        return this.createErrorResult(
          'download',
          'Data integrity check failed: checksum mismatch'
        );
      }
    }

    // Import remote data
    try {
      this.checkCancelled();
      await this.importRemoteData(remoteData);

      onProgress?.({
        phase: 'completing',
        current: 100,
        total: 100,
        message: 'Download complete',
      });

      const itemsSynced =
        (remoteData.data.sessions?.length || 0) +
        (remoteData.data.messages?.length || 0) +
        Object.keys(remoteData.data.artifacts || {}).length +
        (remoteData.data.settings ? 1 : 0);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        direction: 'download',
        itemsSynced,
      };
    } catch (error) {
      return this.createErrorResult(
        'download',
        error instanceof Error ? error.message : 'Import failed'
      );
    }
  }

  /**
   * Bidirectional sync with conflict detection
   */
  private async bidirectionalSync(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    if (!this.provider) {
      return this.createErrorResult('bidirectional', 'No provider');
    }

    onProgress?.({
      phase: 'preparing',
      current: 0,
      total: 100,
      message: 'Checking remote metadata...',
    });

    // Get remote metadata
    const remoteMetadata = await this.provider.getRemoteMetadata();
    this.checkCancelled();

    // Get local data
    const localData = await this.getLocalData();
    this.checkCancelled();

    // If no remote data, just upload
    if (!remoteMetadata) {
      return await this.uploadData(onProgress);
    }

    // Compare checksums to detect changes
    const localChecksum = localData.checksum;
    const remoteChecksum = remoteMetadata.checksum;

    if (localChecksum === remoteChecksum) {
      // No changes
      return {
        success: true,
        timestamp: new Date().toISOString(),
        direction: 'bidirectional',
        itemsSynced: 0,
      };
    }

    // Get sync store for conflict resolution strategy
    const { useSyncStore } = await import('@/stores/sync');
    const state = useSyncStore.getState();
    const providerType = this.resolveProviderType(state.activeProvider);
    const config = this.getConfigByProvider(providerType, state);
    if (!config) {
      return this.createErrorResult('bidirectional', 'No sync provider configuration');
    }
    const resolution = config.conflictResolution;

    // Compare timestamps
    const localTime = new Date(localData.syncedAt).getTime();
    const remoteTime = new Date(remoteMetadata.syncedAt).getTime();

    // Determine which data to use based on resolution strategy
    if (resolution === 'local' || (resolution === 'newest' && localTime > remoteTime)) {
      // Upload local data
      return await this.uploadData(onProgress);
    } else if (resolution === 'remote' || (resolution === 'newest' && remoteTime > localTime)) {
      // Download remote data
      return await this.downloadData(onProgress);
    } else if (resolution === 'manual') {
      // Create conflict for manual resolution
      const conflicts: SyncConflict[] = [{
        id: `sync-${Date.now()}`,
        type: 'setting',
        key: 'full-sync',
        localValue: localData,
        remoteValue: remoteMetadata,
        localTimestamp: localData.syncedAt,
        remoteTimestamp: remoteMetadata.syncedAt,
        resolved: false,
      }];

      return {
        success: false,
        timestamp: new Date().toISOString(),
        direction: 'bidirectional',
        itemsSynced: 0,
        conflicts,
        error: 'Conflicts detected - manual resolution required',
      };
    }

    // Default: use newest
    if (localTime > remoteTime) {
      return await this.uploadData(onProgress);
    } else {
      return await this.downloadData(onProgress);
    }
  }

  /**
   * Get local data for sync
   */
  private async getLocalData(): Promise<SyncData> {
    const { useSyncStore } = await import('@/stores/sync');
    const state = useSyncStore.getState();
    const { deviceId, deviceName } = state;
    const providerType = this.resolveProviderType(state.activeProvider);

    // Determine which data types to sync
    const activeConfig = this.getConfigByProvider(providerType, state);
    if (!activeConfig) {
      throw new Error('No sync provider configuration available');
    }
    const syncTypes = activeConfig.syncDataTypes;
    const shouldSync = (type: string) =>
      syncTypes.length === 0 || syncTypes.includes(type as never);

    // Use existing export functionality
    const backup = await createFullBackup({
      includeSessions: shouldSync('sessions'),
      includeSettings: shouldSync('settings'),
      includeArtifacts: shouldSync('artifacts'),
      includeIndexedDB: shouldSync('messages') || shouldSync('folders') || shouldSync('projects'),
      includeChecksum: false, // We'll generate our own
    });
    const payload = backup.payload;

    const dataContent: SyncDataContent = {};

    if (shouldSync('settings')) dataContent.settings = payload.settings;
    if (shouldSync('sessions')) dataContent.sessions = payload.sessions;
    if (shouldSync('artifacts')) dataContent.artifacts = payload.artifacts;

    // Add IndexedDB data if available
    if (shouldSync('messages')) dataContent.messages = payload.messages.map(toSyncMessage);
    if (shouldSync('folders')) dataContent.folders = payload.folders;
    if (shouldSync('projects')) dataContent.projects = payload.projects;

    const syncData: SyncData = {
      version: SYNC_DATA_VERSION,
      syncedAt: new Date().toISOString(),
      deviceId,
      deviceName,
      checksum: '',
      dataTypes: Object.keys(dataContent).filter(
        (k) => dataContent[k as keyof SyncDataContent] !== undefined
      ) as (keyof SyncDataContent)[],
      data: dataContent,
    };

    // Generate checksum
    syncData.checksum = generateChecksum(JSON.stringify(syncData.data));

    return syncData;
  }

  /**
   * Import remote data into local storage
   */
  private async importRemoteData(remoteData: SyncData): Promise<void> {
    const exportData: BackupPackageV3 = {
      version: '3.0',
      manifest: {
        version: '3.0',
        schemaVersion: 3,
        traceId: globalThis.crypto?.randomUUID?.() || `sync-${Date.now()}`,
        exportedAt: remoteData.syncedAt,
        backend: 'web-dexie',
        integrity: {
          algorithm: 'SHA-256',
          checksum: '',
        },
      },
      payload: {
        sessions: remoteData.data.sessions || [],
        messages: (remoteData.data.messages || []).map(fromSyncMessage),
        projects: (remoteData.data.projects as Project[]) || [],
        knowledgeFiles: [],
        summaries: [],
        settings: remoteData.data.settings,
        artifacts: remoteData.data.artifacts,
        folders: remoteData.data.folders as DBFolder[] | undefined,
      },
    };

    await importFullBackup(exportData, {
      mergeStrategy: 'merge',
      generateNewIds: false,
      validateData: true,
    });
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    if (!this.provider) {
      return [];
    }

    return await this.provider.listBackups();
  }

  /**
   * Restore from a specific backup
   */
  async restoreBackup(backupId: string): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      log.info(`Restoring backup: ${backupId}`);
      const backupData = await this.provider.downloadBackup(backupId);
      if (!backupData) {
        log.error('Failed to download backup data');
        return false;
      }

      // Verify data integrity if checksum is available
      if (backupData.checksum) {
        const actualChecksum = generateChecksum(JSON.stringify(backupData.data));
        if (actualChecksum !== backupData.checksum) {
          log.error('Backup data integrity check failed');
          return false;
        }
      }

      await this.importRemoteData(backupData);
      log.info(`Backup ${backupId} restored successfully`);
      return true;
    } catch (error) {
      log.error('Failed to restore backup', error as Error);
      return false;
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    return await this.provider.deleteBackup(backupId);
  }

  /**
   * Disconnect provider
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
      this.providerType = null;
    }
  }

  /**
   * Helper to create error result
   */
  private createErrorResult(direction: SyncDirection, error: string): SyncResult {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      direction,
      itemsSynced: 0,
      error,
    };
  }
}

// Singleton instance
let syncManagerInstance: SyncManager | null = null;

/**
 * Get sync manager instance
 */
export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}

/**
 * Reset sync manager (for testing)
 */
export function resetSyncManager(): void {
  if (syncManagerInstance) {
    syncManagerInstance.disconnect();
    syncManagerInstance = null;
  }
}

export { SyncManager };
