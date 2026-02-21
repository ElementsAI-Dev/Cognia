/**
 * Sync Store - Zustand store for WebDAV and GitHub sync state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  SyncState,
  SyncStore,
  WebDAVConfig,
  GitHubSyncConfig,
  GoogleDriveConfig,
  SyncProviderType,
  SyncStatus,
  SyncProgress,
  SyncResult,
  SyncDirection,
  BackupInfo,
} from '@/types/sync';
import {
  DEFAULT_WEBDAV_CONFIG,
  DEFAULT_GITHUB_CONFIG,
  DEFAULT_GOOGLE_DRIVE_CONFIG,
} from '@/types/sync';
import { loggers } from '@/lib/logger';

const log = loggers.store;

// Re-export defaults for convenience
export { DEFAULT_WEBDAV_CONFIG, DEFAULT_GITHUB_CONFIG, DEFAULT_GOOGLE_DRIVE_CONFIG };

/**
 * Generate a unique device ID
 */
function generateDeviceId(): string {
  return `device-${nanoid(12)}`;
}

/**
 * Get device name from environment
 */
function getDefaultDeviceName(): string {
  if (typeof window !== 'undefined') {
    const platform = navigator.platform || 'Unknown';
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows')) return `Windows Device`;
    if (userAgent.includes('Mac')) return `Mac Device`;
    if (userAgent.includes('Linux')) return `Linux Device`;
    if (userAgent.includes('Android')) return `Android Device`;
    if (userAgent.includes('iOS')) return `iOS Device`;
    
    return `${platform} Device`;
  }
  return 'Cognia Device';
}

async function getInitializedSyncManager(provider: SyncProviderType | null) {
  const { getSyncManager } = await import('@/lib/sync');
  const manager = getSyncManager();
  const initialized = await manager.ensureProviderInitialized(provider);
  return { manager, initialized };
}

const initialState: SyncState = {
  // Provider configurations
  webdavConfig: { ...DEFAULT_WEBDAV_CONFIG },
  githubConfig: { ...DEFAULT_GITHUB_CONFIG },
  googleDriveConfig: { ...DEFAULT_GOOGLE_DRIVE_CONFIG },
  activeProvider: null,
  
  // Sync status
  status: 'idle',
  progress: null,
  lastError: null,
  
  // Sync history
  syncHistory: [],
  
  // Conflicts
  pendingConflicts: [],
  
  // Device info
  deviceId: '',
  deviceName: '',
};

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Initialize device ID on first load
      deviceId: generateDeviceId(),
      deviceName: getDefaultDeviceName(),

      // ============================================
      // Configuration Actions
      // ============================================

      setWebDAVConfig: (config: Partial<WebDAVConfig>) => {
        set((state) => ({
          webdavConfig: { ...state.webdavConfig, ...config },
        }));
      },

      setGitHubConfig: (config: Partial<GitHubSyncConfig>) => {
        set((state) => ({
          githubConfig: { ...state.githubConfig, ...config },
        }));
      },

      setGoogleDriveConfig: (config: Partial<GoogleDriveConfig>) => {
        set((state) => ({
          googleDriveConfig: { ...state.googleDriveConfig, ...config },
        }));
      },

      setActiveProvider: (provider: SyncProviderType | null) => {
        set({ activeProvider: provider });
      },

      // ============================================
      // Sync Operations
      // ============================================

      startSync: async (direction: SyncDirection = 'bidirectional'): Promise<SyncResult> => {
        const { activeProvider, status } = get();
        
        if (status === 'syncing') {
          return {
            success: false,
            timestamp: new Date().toISOString(),
            direction,
            itemsSynced: 0,
            error: 'Sync already in progress',
          };
        }

        if (!activeProvider) {
          return {
            success: false,
            timestamp: new Date().toISOString(),
            direction,
            itemsSynced: 0,
            error: 'No sync provider configured',
          };
        }

        set({ status: 'syncing', lastError: null });

        try {
          const { manager, initialized } = await getInitializedSyncManager(activeProvider);
          if (!initialized.success) {
            throw new Error(initialized.error || 'Sync provider is not initialized');
          }
          
          const result = await manager.sync(direction, (progress) => {
            set({ progress });
          });

          // Update history
          set((state) => ({
            status: result.success ? 'success' : 'error',
            progress: null,
            syncHistory: [result, ...state.syncHistory.slice(0, 49)], // Keep last 50
            lastError: result.error || null,
            pendingConflicts: result.conflicts || [],
          }));

          // Update last sync time in config
          if (result.success) {
            const timestamp = new Date().toISOString();
            if (activeProvider === 'webdav') {
              set((state) => ({
                webdavConfig: { ...state.webdavConfig, lastSyncAt: timestamp },
              }));
            } else if (activeProvider === 'github') {
              set((state) => ({
                githubConfig: { ...state.githubConfig, lastSyncAt: timestamp },
              }));
            } else if (activeProvider === 'googledrive') {
              set((state) => ({
                googleDriveConfig: { ...state.googleDriveConfig, lastSyncAt: timestamp },
              }));
            }
          }

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sync failed';
          set({
            status: 'error',
            progress: null,
            lastError: errorMessage,
          });
          
          return {
            success: false,
            timestamp: new Date().toISOString(),
            direction,
            itemsSynced: 0,
            error: errorMessage,
          };
        }
      },

      cancelSync: async () => {
        try {
          const { getSyncManager } = await import('@/lib/sync');
          const manager = getSyncManager();
          manager.cancelSync();
        } catch {
          // Manager may not be initialized
        }
        set({
          status: 'idle',
          progress: null,
        });
      },

      testConnection: async (): Promise<{ success: boolean; error?: string }> => {
        const { activeProvider } = get();
        
        if (!activeProvider) {
          return { success: false, error: 'No sync provider configured' };
        }

        try {
          const { manager, initialized } = await getInitializedSyncManager(activeProvider);
          if (!initialized.success) {
            return {
              success: false,
              error: initialized.error || 'No credentials configured for active sync provider',
            };
          }
          return await manager.testConnection();
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Connection test failed',
          };
        }
      },

      // ============================================
      // Conflict Resolution
      // ============================================

      resolveConflict: (conflictId: string, resolution: 'local' | 'remote') => {
        set((state) => ({
          pendingConflicts: state.pendingConflicts.map((c) =>
            c.id === conflictId ? { ...c, resolved: true, resolution } : c
          ),
        }));
      },

      resolveAllConflicts: (resolution: 'local' | 'remote') => {
        set((state) => ({
          pendingConflicts: state.pendingConflicts.map((c) => ({
            ...c,
            resolved: true,
            resolution,
          })),
        }));
      },

      // ============================================
      // Backup Management
      // ============================================

      listBackups: async (): Promise<BackupInfo[]> => {
        const { activeProvider } = get();
        
        if (!activeProvider) {
          return [];
        }

        try {
          const { manager, initialized } = await getInitializedSyncManager(activeProvider);
          if (!initialized.success) {
            return [];
          }
          return await manager.listBackups();
        } catch (error) {
          log.error('Failed to list backups', error as Error);
          return [];
        }
      },

      restoreBackup: async (backupId: string): Promise<boolean> => {
        const { activeProvider } = get();
        if (!activeProvider) {
          return false;
        }

        try {
          const { manager, initialized } = await getInitializedSyncManager(activeProvider);
          if (!initialized.success) {
            return false;
          }
          return await manager.restoreBackup(backupId);
        } catch (error) {
          log.error('Failed to restore backup', error as Error);
          return false;
        }
      },

      deleteBackup: async (backupId: string): Promise<boolean> => {
        const { activeProvider } = get();
        if (!activeProvider) {
          return false;
        }

        try {
          const { manager, initialized } = await getInitializedSyncManager(activeProvider);
          if (!initialized.success) {
            return false;
          }
          return await manager.deleteBackup(backupId);
        } catch (error) {
          log.error('Failed to delete backup', error as Error);
          return false;
        }
      },

      // ============================================
      // Status Management
      // ============================================

      setStatus: (status: SyncStatus) => set({ status }),
      setProgress: (progress: SyncProgress | null) => set({ progress }),
      setError: (error: string | null) => set({ lastError: error }),

      // ============================================
      // Device Management
      // ============================================

      setDeviceName: (name: string) => set({ deviceName: name }),

      // ============================================
      // Reset
      // ============================================

      reset: () => set({
        ...initialState,
        deviceId: get().deviceId, // Keep device ID
        deviceName: get().deviceName,
      }),
    }),
    {
      name: 'cognia-sync',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version === 0) {
          // v0 -> v1: Ensure googleDriveConfig and device fields exist
          if (!state.googleDriveConfig) {
            state.googleDriveConfig = initialState.googleDriveConfig;
          }
          if (!state.deviceId) {
            state.deviceId = initialState.deviceId;
          }
          if (!state.deviceName) {
            state.deviceName = initialState.deviceName;
          }
        }
        return state;
      },
      partialize: (state) => ({
        webdavConfig: state.webdavConfig,
        githubConfig: state.githubConfig,
        googleDriveConfig: state.googleDriveConfig,
        activeProvider: state.activeProvider,
        syncHistory: state.syncHistory.slice(0, 20), // Only persist last 20
        deviceId: state.deviceId,
        deviceName: state.deviceName,
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

export const selectSyncStatus = (state: SyncStore) => state.status;
export const selectSyncProgress = (state: SyncStore) => state.progress;
export const selectActiveProvider = (state: SyncStore) => state.activeProvider;
export const selectWebDAVConfig = (state: SyncStore) => state.webdavConfig;
export const selectGitHubConfig = (state: SyncStore) => state.githubConfig;
export const selectGoogleDriveConfig = (state: SyncStore) => state.googleDriveConfig;
export const selectSyncHistory = (state: SyncStore) => state.syncHistory;
export const selectPendingConflicts = (state: SyncStore) => state.pendingConflicts;
export const selectLastError = (state: SyncStore) => state.lastError;
export const selectDeviceInfo = (state: SyncStore) => ({
  deviceId: state.deviceId,
  deviceName: state.deviceName,
});

export const selectIsSyncing = (state: SyncStore) => state.status === 'syncing';
export const selectHasConflicts = (state: SyncStore) => 
  state.pendingConflicts.some((c) => !c.resolved);

export const selectLastSyncTime = (state: SyncStore) => {
  const { activeProvider, webdavConfig, githubConfig, googleDriveConfig } = state;
  if (activeProvider === 'webdav') return webdavConfig.lastSyncAt;
  if (activeProvider === 'github') return githubConfig.lastSyncAt;
  if (activeProvider === 'googledrive') return googleDriveConfig.lastSyncAt;
  return null;
};
