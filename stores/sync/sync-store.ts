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
  SyncProviderType,
  SyncStatus,
  SyncProgress,
  SyncResult,
  SyncDirection,
  BackupInfo,
} from '@/types/sync';
import { DEFAULT_WEBDAV_CONFIG, DEFAULT_GITHUB_CONFIG } from '@/types/sync';

// Re-export defaults for convenience
export { DEFAULT_WEBDAV_CONFIG, DEFAULT_GITHUB_CONFIG };

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

const initialState: SyncState = {
  // Provider configurations
  webdavConfig: { ...DEFAULT_WEBDAV_CONFIG },
  githubConfig: { ...DEFAULT_GITHUB_CONFIG },
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
          // Import sync manager dynamically to avoid circular dependencies
          const { getSyncManager } = await import('@/lib/sync');
          const manager = getSyncManager();
          
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

      cancelSync: () => {
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
          const { getSyncManager } = await import('@/lib/sync');
          const manager = getSyncManager();
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
          const { getSyncManager } = await import('@/lib/sync');
          const manager = getSyncManager();
          return await manager.listBackups();
        } catch (error) {
          console.error('Failed to list backups:', error);
          return [];
        }
      },

      restoreBackup: async (backupId: string): Promise<boolean> => {
        try {
          const { getSyncManager } = await import('@/lib/sync');
          const manager = getSyncManager();
          return await manager.restoreBackup(backupId);
        } catch (error) {
          console.error('Failed to restore backup:', error);
          return false;
        }
      },

      deleteBackup: async (backupId: string): Promise<boolean> => {
        try {
          const { getSyncManager } = await import('@/lib/sync');
          const manager = getSyncManager();
          return await manager.deleteBackup(backupId);
        } catch (error) {
          console.error('Failed to delete backup:', error);
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        webdavConfig: state.webdavConfig,
        githubConfig: state.githubConfig,
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
  const { activeProvider, webdavConfig, githubConfig } = state;
  if (activeProvider === 'webdav') return webdavConfig.lastSyncAt;
  if (activeProvider === 'github') return githubConfig.lastSyncAt;
  return null;
};
