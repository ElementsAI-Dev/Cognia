/**
 * Sync Types Tests
 */

import {
  DEFAULT_WEBDAV_CONFIG,
  DEFAULT_GITHUB_CONFIG,
  DEFAULT_GOOGLE_DRIVE_CONFIG,
  type SyncProviderType,
  type SyncStatus,
  type ConflictResolution,
  type SyncDirection,
  type BaseSyncConfig,
  type WebDAVConfig,
  type GitHubSyncConfig,
  type SyncData,
  type SyncMetadata,
  type SyncResult,
  type SyncConflict,
  type BackupInfo,
  type SyncProgress,
  type SyncState,
  type SyncEventType,
  type SyncEvent,
} from './index';

describe('Sync Types', () => {
  describe('DEFAULT_WEBDAV_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_WEBDAV_CONFIG.type).toBe('webdav');
      expect(DEFAULT_WEBDAV_CONFIG.enabled).toBe(false);
      expect(DEFAULT_WEBDAV_CONFIG.autoSync).toBe(false);
      expect(DEFAULT_WEBDAV_CONFIG.syncInterval).toBe(30);
      expect(DEFAULT_WEBDAV_CONFIG.lastSyncAt).toBeNull();
      expect(DEFAULT_WEBDAV_CONFIG.syncOnStartup).toBe(false);
      expect(DEFAULT_WEBDAV_CONFIG.syncOnExit).toBe(false);
      expect(DEFAULT_WEBDAV_CONFIG.conflictResolution).toBe('newest');
      expect(DEFAULT_WEBDAV_CONFIG.syncDirection).toBe('bidirectional');
    });

    it('should have empty server configuration by default', () => {
      expect(DEFAULT_WEBDAV_CONFIG.serverUrl).toBe('');
      expect(DEFAULT_WEBDAV_CONFIG.username).toBe('');
      expect(DEFAULT_WEBDAV_CONFIG.remotePath).toBe('/cognia-sync/');
      expect(DEFAULT_WEBDAV_CONFIG.useDigestAuth).toBe(false);
    });
  });

  describe('DEFAULT_GITHUB_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_GITHUB_CONFIG.type).toBe('github');
      expect(DEFAULT_GITHUB_CONFIG.enabled).toBe(false);
      expect(DEFAULT_GITHUB_CONFIG.autoSync).toBe(false);
      expect(DEFAULT_GITHUB_CONFIG.syncInterval).toBe(60);
      expect(DEFAULT_GITHUB_CONFIG.lastSyncAt).toBeNull();
      expect(DEFAULT_GITHUB_CONFIG.syncOnStartup).toBe(false);
      expect(DEFAULT_GITHUB_CONFIG.syncOnExit).toBe(false);
      expect(DEFAULT_GITHUB_CONFIG.conflictResolution).toBe('newest');
      expect(DEFAULT_GITHUB_CONFIG.syncDirection).toBe('bidirectional');
    });

    it('should have default repository configuration', () => {
      expect(DEFAULT_GITHUB_CONFIG.repoOwner).toBe('');
      expect(DEFAULT_GITHUB_CONFIG.repoName).toBe('cognia-sync');
      expect(DEFAULT_GITHUB_CONFIG.branch).toBe('main');
      expect(DEFAULT_GITHUB_CONFIG.remotePath).toBe('backup/');
      expect(DEFAULT_GITHUB_CONFIG.createPrivateRepo).toBe(true);
      expect(DEFAULT_GITHUB_CONFIG.gistMode).toBe(false);
    });
  });

  describe('SyncProviderType', () => {
    it('should accept valid provider types', () => {
      const webdav: SyncProviderType = 'webdav';
      const github: SyncProviderType = 'github';

      expect(webdav).toBe('webdav');
      expect(github).toBe('github');
    });
  });

  describe('SyncStatus', () => {
    it('should accept all valid status types', () => {
      const statuses: SyncStatus[] = ['idle', 'syncing', 'success', 'error', 'conflict'];

      statuses.forEach((status) => {
        expect(['idle', 'syncing', 'success', 'error', 'conflict']).toContain(status);
      });
    });
  });

  describe('ConflictResolution', () => {
    it('should accept all valid resolution strategies', () => {
      const resolutions: ConflictResolution[] = ['local', 'remote', 'newest', 'manual'];

      resolutions.forEach((resolution) => {
        expect(['local', 'remote', 'newest', 'manual']).toContain(resolution);
      });
    });
  });

  describe('SyncDirection', () => {
    it('should accept all valid sync directions', () => {
      const directions: SyncDirection[] = ['upload', 'download', 'bidirectional'];

      directions.forEach((direction) => {
        expect(['upload', 'download', 'bidirectional']).toContain(direction);
      });
    });
  });

  describe('BaseSyncConfig', () => {
    it('should be assignable from WebDAVConfig', () => {
      const webdavConfig: BaseSyncConfig = DEFAULT_WEBDAV_CONFIG;
      expect(webdavConfig.enabled).toBe(false);
      expect(webdavConfig.autoSync).toBe(false);
    });

    it('should be assignable from GitHubSyncConfig', () => {
      const githubConfig: BaseSyncConfig = DEFAULT_GITHUB_CONFIG;
      expect(githubConfig.enabled).toBe(false);
      expect(githubConfig.syncInterval).toBe(60);
    });
  });

  describe('WebDAVConfig', () => {
    it('should allow partial overrides', () => {
      const config: WebDAVConfig = {
        ...DEFAULT_WEBDAV_CONFIG,
        enabled: true,
        serverUrl: 'https://dav.example.com',
        username: 'user',
        remotePath: '/backup/',
      };

      expect(config.enabled).toBe(true);
      expect(config.serverUrl).toBe('https://dav.example.com');
      expect(config.username).toBe('user');
      expect(config.remotePath).toBe('/backup/');
      // Unchanged from default
      expect(config.useDigestAuth).toBe(false);
      expect(config.syncInterval).toBe(30);
    });
  });

  describe('GitHubSyncConfig', () => {
    it('should allow partial overrides', () => {
      const config: GitHubSyncConfig = {
        ...DEFAULT_GITHUB_CONFIG,
        enabled: true,
        repoOwner: 'myuser',
        repoName: 'my-backup',
        gistMode: true,
        gistId: 'abc123',
      };

      expect(config.enabled).toBe(true);
      expect(config.repoOwner).toBe('myuser');
      expect(config.repoName).toBe('my-backup');
      expect(config.gistMode).toBe(true);
      expect(config.gistId).toBe('abc123');
      // Unchanged from default
      expect(config.branch).toBe('main');
      expect(config.createPrivateRepo).toBe(true);
    });
  });

  describe('SyncData', () => {
    it('should have correct structure', () => {
      const syncData: SyncData = {
        version: '1.0.0',
        syncedAt: '2025-01-31T12:00:00Z',
        deviceId: 'device-123',
        deviceName: 'My PC',
        checksum: 'abc123',
        dataTypes: ['settings', 'sessions'],
        data: {
          settings: { theme: 'dark' },
          sessions: [],
        },
      };

      expect(syncData.version).toBe('1.0.0');
      expect(syncData.deviceId).toBe('device-123');
      expect(syncData.dataTypes).toContain('settings');
      expect(syncData.data.settings).toBeDefined();
    });
  });

  describe('SyncMetadata', () => {
    it('should have correct structure', () => {
      const metadata: SyncMetadata = {
        version: '1.0.0',
        syncedAt: '2025-01-31T12:00:00Z',
        deviceId: 'device-123',
        deviceName: 'My PC',
        checksum: 'abc123',
        size: 1024,
      };

      expect(metadata.version).toBe('1.0.0');
      expect(metadata.size).toBe(1024);
      expect(metadata.checksum).toBe('abc123');
    });
  });

  describe('SyncResult', () => {
    it('should represent successful sync', () => {
      const result: SyncResult = {
        success: true,
        timestamp: '2025-01-31T12:00:00Z',
        direction: 'upload',
        itemsSynced: 10,
      };

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(10);
      expect(result.error).toBeUndefined();
    });

    it('should represent failed sync', () => {
      const result: SyncResult = {
        success: false,
        timestamp: '2025-01-31T12:00:00Z',
        direction: 'download',
        itemsSynced: 0,
        error: 'Connection failed',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should include conflicts when present', () => {
      const conflict: SyncConflict = {
        id: 'conflict-1',
        type: 'session',
        key: 'session-123',
        localValue: { title: 'Local' },
        remoteValue: { title: 'Remote' },
        localTimestamp: '2025-01-31T11:00:00Z',
        remoteTimestamp: '2025-01-31T12:00:00Z',
        resolved: false,
      };

      const result: SyncResult = {
        success: true,
        timestamp: '2025-01-31T12:00:00Z',
        direction: 'bidirectional',
        itemsSynced: 5,
        conflicts: [conflict],
      };

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts![0].type).toBe('session');
    });
  });

  describe('SyncConflict', () => {
    it('should represent unresolved conflict', () => {
      const conflict: SyncConflict = {
        id: 'conflict-1',
        type: 'artifact',
        key: 'artifact-123',
        localValue: { content: 'local content' },
        remoteValue: { content: 'remote content' },
        localTimestamp: '2025-01-31T11:00:00Z',
        remoteTimestamp: '2025-01-31T12:00:00Z',
        resolved: false,
      };

      expect(conflict.resolved).toBe(false);
      expect(conflict.resolution).toBeUndefined();
    });

    it('should represent resolved conflict', () => {
      const conflict: SyncConflict = {
        id: 'conflict-1',
        type: 'setting',
        key: 'theme',
        localValue: 'dark',
        remoteValue: 'light',
        localTimestamp: '2025-01-31T11:00:00Z',
        remoteTimestamp: '2025-01-31T12:00:00Z',
        resolved: true,
        resolution: 'local',
      };

      expect(conflict.resolved).toBe(true);
      expect(conflict.resolution).toBe('local');
    });

    it('should accept all valid conflict types', () => {
      const types: SyncConflict['type'][] = ['session', 'message', 'artifact', 'setting'];

      types.forEach((type) => {
        const conflict: SyncConflict = {
          id: `conflict-${type}`,
          type,
          key: 'key-123',
          localValue: {},
          remoteValue: {},
          localTimestamp: '2025-01-31T11:00:00Z',
          remoteTimestamp: '2025-01-31T12:00:00Z',
          resolved: false,
        };
        expect(conflict.type).toBe(type);
      });
    });
  });

  describe('BackupInfo', () => {
    it('should have correct structure', () => {
      const backup: BackupInfo = {
        id: 'backup-123',
        filename: 'cognia-backup-2025-01-31.json',
        createdAt: '2025-01-31T12:00:00Z',
        size: 2048,
        deviceId: 'device-123',
        deviceName: 'My PC',
        checksum: 'def456',
      };

      expect(backup.id).toBe('backup-123');
      expect(backup.filename).toContain('cognia-backup');
      expect(backup.size).toBe(2048);
    });
  });

  describe('SyncProgress', () => {
    it('should represent different phases', () => {
      const phases: SyncProgress['phase'][] = [
        'preparing',
        'uploading',
        'downloading',
        'merging',
        'completing',
      ];

      phases.forEach((phase, index) => {
        const progress: SyncProgress = {
          phase,
          current: index + 1,
          total: phases.length,
          message: `Phase: ${phase}`,
        };
        expect(progress.phase).toBe(phase);
        expect(progress.current).toBe(index + 1);
      });
    });
  });

  describe('SyncState', () => {
    it('should have correct structure', () => {
      const state: SyncState = {
        webdavConfig: DEFAULT_WEBDAV_CONFIG,
        githubConfig: DEFAULT_GITHUB_CONFIG,
        googleDriveConfig: DEFAULT_GOOGLE_DRIVE_CONFIG,
        activeProvider: null,
        status: 'idle',
        progress: null,
        lastError: null,
        syncHistory: [],
        pendingConflicts: [],
        deviceId: 'device-123',
        deviceName: 'My PC',
      };

      expect(state.activeProvider).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.syncHistory).toHaveLength(0);
    });

    it('should allow setting active provider', () => {
      const state: SyncState = {
        webdavConfig: DEFAULT_WEBDAV_CONFIG,
        githubConfig: DEFAULT_GITHUB_CONFIG,
        googleDriveConfig: DEFAULT_GOOGLE_DRIVE_CONFIG,
        activeProvider: 'webdav',
        status: 'syncing',
        progress: {
          phase: 'uploading',
          current: 50,
          total: 100,
          message: 'Uploading data...',
        },
        lastError: null,
        syncHistory: [],
        pendingConflicts: [],
        deviceId: 'device-123',
        deviceName: 'My PC',
      };

      expect(state.activeProvider).toBe('webdav');
      expect(state.status).toBe('syncing');
      expect(state.progress?.phase).toBe('uploading');
    });
  });

  describe('SyncEventType', () => {
    it('should accept all valid event types', () => {
      const eventTypes: SyncEventType[] = [
        'sync:started',
        'sync:progress',
        'sync:completed',
        'sync:failed',
        'sync:conflict',
        'sync:cancelled',
      ];

      eventTypes.forEach((type) => {
        expect(type).toMatch(/^sync:/);
      });
    });
  });

  describe('SyncEvent', () => {
    it('should represent sync started event', () => {
      const event: SyncEvent = {
        type: 'sync:started',
        timestamp: '2025-01-31T12:00:00Z',
        data: { direction: 'upload' },
      };

      expect(event.type).toBe('sync:started');
      expect(event.data).toEqual({ direction: 'upload' });
    });

    it('should represent sync completed event', () => {
      const event: SyncEvent = {
        type: 'sync:completed',
        timestamp: '2025-01-31T12:00:00Z',
        data: { itemsSynced: 10 },
      };

      expect(event.type).toBe('sync:completed');
    });

    it('should allow event without data', () => {
      const event: SyncEvent = {
        type: 'sync:cancelled',
        timestamp: '2025-01-31T12:00:00Z',
      };

      expect(event.data).toBeUndefined();
    });
  });
});
