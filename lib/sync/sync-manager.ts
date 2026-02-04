/**
 * Sync Manager - Orchestrates sync operations between local and remote storage
 */

import type {
  SyncProvider,
  SyncData,
  SyncResult,
  SyncProgress,
  SyncDirection,
  SyncConflict,
  BackupInfo,
  SyncDataContent,
} from '@/types/sync';
import { WebDAVProvider } from './providers/webdav-provider';
import { GitHubProvider } from './providers/github-provider';
import { GoogleDriveProvider } from './providers/googledrive-provider';
import { createFullBackup } from '@/lib/storage/data-export';
import { importFullBackup } from '@/lib/storage/data-import';
import { generateChecksum } from '@/lib/storage/data-import';
import { loggers } from '@/lib/logger';

const log = loggers.app;

/**
 * Sync Manager class - singleton
 */
class SyncManager {
  private provider: SyncProvider | null = null;
  private isSyncing = false;

  /**
   * Initialize with WebDAV provider
   */
  async initWebDAV(password: string): Promise<void> {
    const { useSyncStore } = await import('@/stores/sync');
    const config = useSyncStore.getState().webdavConfig;
    
    this.provider = new WebDAVProvider(config, password);
  }

  /**
   * Initialize with GitHub provider
   */
  async initGitHub(token: string): Promise<void> {
    const { useSyncStore } = await import('@/stores/sync');
    const config = useSyncStore.getState().githubConfig;
    
    this.provider = new GitHubProvider(config, token);
  }

  /**
   * Initialize with Google Drive provider
   */
  async initGoogleDrive(accessToken: string): Promise<void> {
    const { useSyncStore } = await import('@/stores/sync');
    const config = useSyncStore.getState().googleDriveConfig;
    
    this.provider = new GoogleDriveProvider(config, accessToken);
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

    this.isSyncing = true;

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
    } finally {
      this.isSyncing = false;
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

    onProgress?.({
      phase: 'uploading',
      current: 20,
      total: 100,
      message: 'Uploading to remote...',
    });

    // Upload to remote
    return await this.provider.upload(localData, onProgress);
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
    const remoteData = await this.provider.download(onProgress);

    if (!remoteData) {
      return this.createErrorResult('download', 'No remote data found');
    }

    onProgress?.({
      phase: 'merging',
      current: 60,
      total: 100,
      message: 'Importing data...',
    });

    // Import remote data
    try {
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

    // Get local data
    const localData = await this.getLocalData();

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
    const { webdavConfig, githubConfig, googleDriveConfig, activeProvider } =
      useSyncStore.getState();
    
    const config =
      activeProvider === 'webdav'
        ? webdavConfig
        : activeProvider === 'github'
          ? githubConfig
          : googleDriveConfig;
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
    const { deviceId, deviceName } = useSyncStore.getState();

    // Use existing export functionality
    const backup = await createFullBackup({
      includeSessions: true,
      includeSettings: true,
      includeArtifacts: true,
      includeIndexedDB: true,
      includeChecksum: false, // We'll generate our own
    });

    const dataContent: SyncDataContent = {
      settings: backup.settings,
      sessions: backup.sessions,
      artifacts: backup.artifacts,
    };

    // Add IndexedDB data if available
    if (backup.indexedDB) {
      dataContent.messages = backup.indexedDB.messages;
      dataContent.folders = backup.indexedDB.sessions;
      dataContent.projects = backup.indexedDB.projects;
    }

    const syncData: SyncData = {
      version: '1.0',
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
    // Convert SyncData to ExportData format for import
    const exportData = {
      version: remoteData.version,
      exportedAt: remoteData.syncedAt,
      sessions: remoteData.data.sessions,
      settings: remoteData.data.settings,
      artifacts: remoteData.data.artifacts,
      indexedDB: {
        messages: remoteData.data.messages,
        sessions: remoteData.data.folders as never[],
        projects: remoteData.data.projects as never[],
        documents: [],
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
    // This would need to download the specific backup file
    // For now, return false as it requires more implementation
    log.debug(`Restore backup: ${backupId}`);
    return false;
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
