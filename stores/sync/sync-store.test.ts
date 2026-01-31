/**
 * Sync Store Tests
 */

import { act } from '@testing-library/react';
import {
  useSyncStore,
  selectSyncStatus,
  selectSyncProgress,
  selectActiveProvider,
  selectWebDAVConfig,
  selectGitHubConfig,
  selectSyncHistory,
  selectPendingConflicts,
  selectLastError,
  selectDeviceInfo,
  selectIsSyncing,
  selectHasConflicts,
  selectLastSyncTime,
  DEFAULT_WEBDAV_CONFIG,
  DEFAULT_GITHUB_CONFIG,
} from './sync-store';
import type { SyncConflict, SyncResult } from '@/types/sync';

// Mock the sync manager
jest.mock('@/lib/sync', () => ({
  getSyncManager: jest.fn(() => ({
    sync: jest.fn(),
    testConnection: jest.fn(),
    listBackups: jest.fn(),
    restoreBackup: jest.fn(),
    deleteBackup: jest.fn(),
  })),
}));

describe('Sync Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useSyncStore.getState().reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useSyncStore.getState();

      expect(state.webdavConfig).toEqual(expect.objectContaining({
        type: 'webdav',
        enabled: false,
      }));
      expect(state.githubConfig).toEqual(expect.objectContaining({
        type: 'github',
        enabled: false,
      }));
      expect(state.activeProvider).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.progress).toBeNull();
      expect(state.lastError).toBeNull();
      expect(state.syncHistory).toEqual([]);
      expect(state.pendingConflicts).toEqual([]);
    });

    it('should have device info initialized', () => {
      const state = useSyncStore.getState();

      expect(state.deviceId).toBeDefined();
      expect(state.deviceId).toMatch(/^device-/);
      expect(state.deviceName).toBeDefined();
    });
  });

  describe('Configuration Actions', () => {
    describe('setWebDAVConfig', () => {
      it('should update WebDAV config partially', () => {
        act(() => {
          useSyncStore.getState().setWebDAVConfig({
            enabled: true,
            serverUrl: 'https://dav.example.com',
            username: 'testuser',
          });
        });

        const state = useSyncStore.getState();
        expect(state.webdavConfig.enabled).toBe(true);
        expect(state.webdavConfig.serverUrl).toBe('https://dav.example.com');
        expect(state.webdavConfig.username).toBe('testuser');
        // Other values should remain default
        expect(state.webdavConfig.remotePath).toBe('/cognia-sync/');
      });

      it('should preserve existing values when updating', () => {
        act(() => {
          useSyncStore.getState().setWebDAVConfig({ serverUrl: 'https://first.com' });
          useSyncStore.getState().setWebDAVConfig({ username: 'user1' });
        });

        const state = useSyncStore.getState();
        expect(state.webdavConfig.serverUrl).toBe('https://first.com');
        expect(state.webdavConfig.username).toBe('user1');
      });
    });

    describe('setGitHubConfig', () => {
      it('should update GitHub config partially', () => {
        act(() => {
          useSyncStore.getState().setGitHubConfig({
            enabled: true,
            repoOwner: 'myuser',
            repoName: 'my-backup',
            gistMode: true,
          });
        });

        const state = useSyncStore.getState();
        expect(state.githubConfig.enabled).toBe(true);
        expect(state.githubConfig.repoOwner).toBe('myuser');
        expect(state.githubConfig.repoName).toBe('my-backup');
        expect(state.githubConfig.gistMode).toBe(true);
        // Other values should remain default
        expect(state.githubConfig.branch).toBe('main');
      });
    });

    describe('setActiveProvider', () => {
      it('should set active provider to webdav', () => {
        act(() => {
          useSyncStore.getState().setActiveProvider('webdav');
        });

        expect(useSyncStore.getState().activeProvider).toBe('webdav');
      });

      it('should set active provider to github', () => {
        act(() => {
          useSyncStore.getState().setActiveProvider('github');
        });

        expect(useSyncStore.getState().activeProvider).toBe('github');
      });

      it('should clear active provider', () => {
        act(() => {
          useSyncStore.getState().setActiveProvider('webdav');
          useSyncStore.getState().setActiveProvider(null);
        });

        expect(useSyncStore.getState().activeProvider).toBeNull();
      });
    });
  });

  describe('Sync Operations', () => {
    describe('startSync', () => {
      it('should fail when no provider is configured', async () => {
        const result = await useSyncStore.getState().startSync();

        expect(result.success).toBe(false);
        expect(result.error).toBe('No sync provider configured');
      });

      it('should fail when sync is already in progress', async () => {
        act(() => {
          useSyncStore.setState({ status: 'syncing', activeProvider: 'webdav' });
        });

        const result = await useSyncStore.getState().startSync();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Sync already in progress');
      });
    });

    describe('cancelSync', () => {
      it('should reset status to idle', () => {
        act(() => {
          useSyncStore.setState({
            status: 'syncing',
            progress: { phase: 'uploading', current: 50, total: 100, message: 'Uploading...' },
          });
          useSyncStore.getState().cancelSync();
        });

        const state = useSyncStore.getState();
        expect(state.status).toBe('idle');
        expect(state.progress).toBeNull();
      });
    });

    describe('testConnection', () => {
      it('should fail when no provider is configured', async () => {
        const result = await useSyncStore.getState().testConnection();

        expect(result.success).toBe(false);
        expect(result.error).toBe('No sync provider configured');
      });
    });
  });

  describe('Conflict Resolution', () => {
    const mockConflicts: SyncConflict[] = [
      {
        id: 'conflict-1',
        type: 'session',
        key: 'session-123',
        localValue: { title: 'Local' },
        remoteValue: { title: 'Remote' },
        localTimestamp: '2025-01-31T11:00:00Z',
        remoteTimestamp: '2025-01-31T12:00:00Z',
        resolved: false,
      },
      {
        id: 'conflict-2',
        type: 'artifact',
        key: 'artifact-456',
        localValue: {},
        remoteValue: {},
        localTimestamp: '2025-01-31T11:00:00Z',
        remoteTimestamp: '2025-01-31T12:00:00Z',
        resolved: false,
      },
    ];

    beforeEach(() => {
      act(() => {
        useSyncStore.setState({ pendingConflicts: [...mockConflicts] });
      });
    });

    describe('resolveConflict', () => {
      it('should resolve a single conflict with local', () => {
        act(() => {
          useSyncStore.getState().resolveConflict('conflict-1', 'local');
        });

        const conflicts = useSyncStore.getState().pendingConflicts;
        const resolved = conflicts.find((c) => c.id === 'conflict-1');

        expect(resolved?.resolved).toBe(true);
        expect(resolved?.resolution).toBe('local');
      });

      it('should resolve a single conflict with remote', () => {
        act(() => {
          useSyncStore.getState().resolveConflict('conflict-2', 'remote');
        });

        const conflicts = useSyncStore.getState().pendingConflicts;
        const resolved = conflicts.find((c) => c.id === 'conflict-2');

        expect(resolved?.resolved).toBe(true);
        expect(resolved?.resolution).toBe('remote');
      });

      it('should not affect other conflicts', () => {
        act(() => {
          useSyncStore.getState().resolveConflict('conflict-1', 'local');
        });

        const conflicts = useSyncStore.getState().pendingConflicts;
        const unresolved = conflicts.find((c) => c.id === 'conflict-2');

        expect(unresolved?.resolved).toBe(false);
        expect(unresolved?.resolution).toBeUndefined();
      });
    });

    describe('resolveAllConflicts', () => {
      it('should resolve all conflicts with local', () => {
        act(() => {
          useSyncStore.getState().resolveAllConflicts('local');
        });

        const conflicts = useSyncStore.getState().pendingConflicts;
        
        conflicts.forEach((conflict) => {
          expect(conflict.resolved).toBe(true);
          expect(conflict.resolution).toBe('local');
        });
      });

      it('should resolve all conflicts with remote', () => {
        act(() => {
          useSyncStore.getState().resolveAllConflicts('remote');
        });

        const conflicts = useSyncStore.getState().pendingConflicts;
        
        conflicts.forEach((conflict) => {
          expect(conflict.resolved).toBe(true);
          expect(conflict.resolution).toBe('remote');
        });
      });
    });
  });

  describe('Status Management', () => {
    describe('setStatus', () => {
      it('should update status', () => {
        act(() => {
          useSyncStore.getState().setStatus('syncing');
        });
        expect(useSyncStore.getState().status).toBe('syncing');

        act(() => {
          useSyncStore.getState().setStatus('success');
        });
        expect(useSyncStore.getState().status).toBe('success');

        act(() => {
          useSyncStore.getState().setStatus('error');
        });
        expect(useSyncStore.getState().status).toBe('error');
      });
    });

    describe('setProgress', () => {
      it('should update progress', () => {
        const progress = {
          phase: 'uploading' as const,
          current: 50,
          total: 100,
          message: 'Uploading data...',
        };

        act(() => {
          useSyncStore.getState().setProgress(progress);
        });

        expect(useSyncStore.getState().progress).toEqual(progress);
      });

      it('should clear progress', () => {
        act(() => {
          useSyncStore.getState().setProgress({
            phase: 'uploading',
            current: 50,
            total: 100,
            message: 'Uploading...',
          });
          useSyncStore.getState().setProgress(null);
        });

        expect(useSyncStore.getState().progress).toBeNull();
      });
    });

    describe('setError', () => {
      it('should set error message', () => {
        act(() => {
          useSyncStore.getState().setError('Connection failed');
        });

        expect(useSyncStore.getState().lastError).toBe('Connection failed');
      });

      it('should clear error', () => {
        act(() => {
          useSyncStore.getState().setError('Some error');
          useSyncStore.getState().setError(null);
        });

        expect(useSyncStore.getState().lastError).toBeNull();
      });
    });
  });

  describe('Device Management', () => {
    describe('setDeviceName', () => {
      it('should update device name', () => {
        act(() => {
          useSyncStore.getState().setDeviceName('My Custom Device');
        });

        expect(useSyncStore.getState().deviceName).toBe('My Custom Device');
      });
    });
  });

  describe('Reset', () => {
    it('should reset state but preserve device info', () => {
      const originalDeviceId = useSyncStore.getState().deviceId;
      const originalDeviceName = useSyncStore.getState().deviceName;

      // Modify state
      act(() => {
        useSyncStore.getState().setActiveProvider('webdav');
        useSyncStore.getState().setStatus('error');
        useSyncStore.getState().setError('Some error');
        useSyncStore.getState().setWebDAVConfig({ serverUrl: 'https://test.com' });
      });

      // Reset
      act(() => {
        useSyncStore.getState().reset();
      });

      const state = useSyncStore.getState();
      
      // Should be reset
      expect(state.activeProvider).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.lastError).toBeNull();
      
      // Device info should be preserved
      expect(state.deviceId).toBe(originalDeviceId);
      expect(state.deviceName).toBe(originalDeviceName);
    });
  });

  describe('Selectors', () => {
    it('selectSyncStatus should return status', () => {
      act(() => {
        useSyncStore.setState({ status: 'syncing' });
      });

      expect(selectSyncStatus(useSyncStore.getState())).toBe('syncing');
    });

    it('selectSyncProgress should return progress', () => {
      const progress = { phase: 'uploading' as const, current: 50, total: 100, message: 'test' };
      act(() => {
        useSyncStore.setState({ progress });
      });

      expect(selectSyncProgress(useSyncStore.getState())).toEqual(progress);
    });

    it('selectActiveProvider should return active provider', () => {
      act(() => {
        useSyncStore.setState({ activeProvider: 'github' });
      });

      expect(selectActiveProvider(useSyncStore.getState())).toBe('github');
    });

    it('selectWebDAVConfig should return WebDAV config', () => {
      const config = selectWebDAVConfig(useSyncStore.getState());
      expect(config.type).toBe('webdav');
    });

    it('selectGitHubConfig should return GitHub config', () => {
      const config = selectGitHubConfig(useSyncStore.getState());
      expect(config.type).toBe('github');
    });

    it('selectSyncHistory should return sync history', () => {
      const history: SyncResult[] = [
        { success: true, timestamp: '2025-01-31T12:00:00Z', direction: 'upload', itemsSynced: 10 },
      ];
      act(() => {
        useSyncStore.setState({ syncHistory: history });
      });

      expect(selectSyncHistory(useSyncStore.getState())).toEqual(history);
    });

    it('selectPendingConflicts should return pending conflicts', () => {
      const conflicts: SyncConflict[] = [
        {
          id: 'c1',
          type: 'session',
          key: 'k1',
          localValue: {},
          remoteValue: {},
          localTimestamp: '',
          remoteTimestamp: '',
          resolved: false,
        },
      ];
      act(() => {
        useSyncStore.setState({ pendingConflicts: conflicts });
      });

      expect(selectPendingConflicts(useSyncStore.getState())).toEqual(conflicts);
    });

    it('selectLastError should return last error', () => {
      act(() => {
        useSyncStore.setState({ lastError: 'Test error' });
      });

      expect(selectLastError(useSyncStore.getState())).toBe('Test error');
    });

    it('selectDeviceInfo should return device info', () => {
      const deviceInfo = selectDeviceInfo(useSyncStore.getState());
      expect(deviceInfo.deviceId).toBeDefined();
      expect(deviceInfo.deviceName).toBeDefined();
    });

    it('selectIsSyncing should return true when syncing', () => {
      act(() => {
        useSyncStore.setState({ status: 'syncing' });
      });

      expect(selectIsSyncing(useSyncStore.getState())).toBe(true);
    });

    it('selectIsSyncing should return false when not syncing', () => {
      act(() => {
        useSyncStore.setState({ status: 'idle' });
      });

      expect(selectIsSyncing(useSyncStore.getState())).toBe(false);
    });

    it('selectHasConflicts should return true when unresolved conflicts exist', () => {
      act(() => {
        useSyncStore.setState({
          pendingConflicts: [
            {
              id: 'c1',
              type: 'session',
              key: 'k1',
              localValue: {},
              remoteValue: {},
              localTimestamp: '',
              remoteTimestamp: '',
              resolved: false,
            },
          ],
        });
      });

      expect(selectHasConflicts(useSyncStore.getState())).toBe(true);
    });

    it('selectHasConflicts should return false when all conflicts resolved', () => {
      act(() => {
        useSyncStore.setState({
          pendingConflicts: [
            {
              id: 'c1',
              type: 'session',
              key: 'k1',
              localValue: {},
              remoteValue: {},
              localTimestamp: '',
              remoteTimestamp: '',
              resolved: true,
              resolution: 'local',
            },
          ],
        });
      });

      expect(selectHasConflicts(useSyncStore.getState())).toBe(false);
    });

    it('selectLastSyncTime should return WebDAV last sync time', () => {
      const timestamp = '2025-01-31T12:00:00Z';
      act(() => {
        useSyncStore.setState({
          activeProvider: 'webdav',
          webdavConfig: { ...DEFAULT_WEBDAV_CONFIG, lastSyncAt: timestamp },
        });
      });

      expect(selectLastSyncTime(useSyncStore.getState())).toBe(timestamp);
    });

    it('selectLastSyncTime should return GitHub last sync time', () => {
      const timestamp = '2025-01-31T13:00:00Z';
      act(() => {
        useSyncStore.setState({
          activeProvider: 'github',
          githubConfig: { ...DEFAULT_GITHUB_CONFIG, lastSyncAt: timestamp },
        });
      });

      expect(selectLastSyncTime(useSyncStore.getState())).toBe(timestamp);
    });

    it('selectLastSyncTime should return null when no provider active', () => {
      act(() => {
        useSyncStore.setState({ activeProvider: null });
      });

      expect(selectLastSyncTime(useSyncStore.getState())).toBeNull();
    });
  });
});
