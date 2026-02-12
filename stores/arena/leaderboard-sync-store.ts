/**
 * Arena Leaderboard Sync Store
 * Manages synchronization state for remote leaderboard data
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  DEFAULT_LEADERBOARD_SYNC_SETTINGS,
  generateLeaderboardCacheKey,
  isCacheValid,
} from '@/types/arena';
import type {
  LeaderboardSyncState,
  LeaderboardSyncError,
  LeaderboardSyncSettings,
  LeaderboardFetchParams,
  LeaderboardFetchResponse,
  LeaderboardCacheEntry,
  PendingSubmission,
  RemoteModelRating,
  RemotePreferenceSubmission,
} from '@/types/arena';
import {
  getLeaderboardApiClient,
  LeaderboardApiError,
  RateLimitError,
  generateMockLeaderboard,
} from '@/lib/ai/arena/leaderboard-api';

// ============================================
// Store Interface
// ============================================

interface LeaderboardSyncStore extends LeaderboardSyncState {
  // Settings
  settings: LeaderboardSyncSettings;

  // Current leaderboard data (merged from cache)
  leaderboard: RemoteModelRating[];
  currentParams: LeaderboardFetchParams;

  // Actions - Settings
  updateSettings: (settings: Partial<LeaderboardSyncSettings>) => void;
  resetSettings: () => void;

  // Actions - Fetching
  fetchLeaderboard: (params?: LeaderboardFetchParams, force?: boolean) => Promise<LeaderboardFetchResponse | null>;
  refreshLeaderboard: () => Promise<void>;
  cancelFetch: () => void;

  // Actions - Submissions
  submitPreferences: (preferences: RemotePreferenceSubmission[]) => Promise<boolean>;
  retryPendingSubmissions: () => Promise<void>;
  clearPendingSubmissions: () => void;

  // Actions - Cache Management
  clearCache: () => void;
  getCachedData: (params: LeaderboardFetchParams) => LeaderboardCacheEntry | null;

  // Actions - Auto Refresh
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;

  // Actions - Online Status
  setOnlineStatus: (isOnline: boolean) => void;

  // Actions - Error Handling
  clearError: () => void;

  // Internal
  _autoRefreshTimer: ReturnType<typeof setInterval> | null;
}


// ============================================
// Initial State
// ============================================

const initialSyncState: LeaderboardSyncState = {
  status: 'idle',
  lastFetchAt: null,
  lastSubmitAt: null,
  error: null,
  pendingSubmissions: [],
  cache: new Map(),
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  autoRefreshInterval: 0,
  lastAutoRefreshAt: null,
};

// ============================================
// Store Implementation
// ============================================

export const useLeaderboardSyncStore = create<LeaderboardSyncStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialSyncState,
      settings: { ...DEFAULT_LEADERBOARD_SYNC_SETTINGS },
      leaderboard: [],
      currentParams: {},
      _autoRefreshTimer: null,

      // ============================================
      // Settings Actions
      // ============================================

      updateSettings: (updates) => {
        set((state) => {
          const newSettings = { ...state.settings, ...updates };

          // Update API client if URL or key changed
          if (updates.apiBaseUrl !== undefined || updates.apiKey !== undefined) {
            getLeaderboardApiClient({
              baseUrl: newSettings.apiBaseUrl,
              apiKey: newSettings.apiKey,
              timeoutMs: newSettings.requestTimeoutMs,
            });
          }

          // Handle auto-refresh changes
          if (updates.autoRefresh !== undefined || updates.autoRefreshIntervalMinutes !== undefined) {
            if (newSettings.autoRefresh && newSettings.enabled) {
              get().startAutoRefresh();
            } else {
              get().stopAutoRefresh();
            }
          }

          return { settings: newSettings };
        });
      },

      resetSettings: () => {
        get().stopAutoRefresh();
        set({ settings: { ...DEFAULT_LEADERBOARD_SYNC_SETTINGS } });
      },

      // ============================================
      // Fetching Actions
      // ============================================

      fetchLeaderboard: async (params = {}, force = false) => {
        const { settings, status, isOnline } = get();

        // Check if sync is enabled
        if (!settings.enabled) {
          return null;
        }

        // Check online status
        if (!isOnline) {
          set({
            status: 'offline',
            error: {
              code: 'OFFLINE',
              message: 'No internet connection',
              timestamp: new Date().toISOString(),
            },
          });
          return null;
        }

        // Check if already fetching
        if (status === 'fetching') {
          return null;
        }

        // Merge with current params
        const fetchParams: LeaderboardFetchParams = {
          ...get().currentParams,
          ...params,
          minBattles: params.minBattles ?? settings.minBattlesThreshold,
        };

        // Check cache first (unless force refresh)
        if (!force) {
          const cacheKey = generateLeaderboardCacheKey(fetchParams);
          const cached = get().cache.get(cacheKey);
          if (isCacheValid(cached)) {
            set({
              leaderboard: cached!.data,
              currentParams: fetchParams,
            });
            return {
              success: true,
              data: cached!.data,
              pagination: cached!.pagination,
              meta: cached!.meta,
            };
          }
        }

        set({ status: 'fetching', error: null, currentParams: fetchParams });

        try {
          // Use mock data if no API URL configured
          let response: LeaderboardFetchResponse;
          if (!settings.apiBaseUrl) {
            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 500));
            response = generateMockLeaderboard(fetchParams);
          } else {
            const client = getLeaderboardApiClient({
              baseUrl: settings.apiBaseUrl,
              apiKey: settings.apiKey,
              timeoutMs: settings.requestTimeoutMs,
            });
            response = await client.fetchLeaderboard(fetchParams);
          }

          if (response.success) {
            // Update cache
            const cacheKey = generateLeaderboardCacheKey(fetchParams);
            const cacheEntry: LeaderboardCacheEntry = {
              key: cacheKey,
              data: response.data,
              pagination: response.pagination,
              meta: response.meta,
              cachedAt: new Date().toISOString(),
              expiresAt: new Date(
                Date.now() + settings.cacheDurationMinutes * 60 * 1000
              ).toISOString(),
            };

            const newCache = new Map(get().cache);
            newCache.set(cacheKey, cacheEntry);

            set({
              status: 'success',
              leaderboard: response.data,
              lastFetchAt: new Date().toISOString(),
              cache: newCache,
            });
          } else {
            set({
              status: 'error',
              error: {
                code: 'FETCH_FAILED',
                message: response.error || 'Failed to fetch leaderboard',
                timestamp: new Date().toISOString(),
              },
            });
          }

          return response;
        } catch (error) {
          const syncError: LeaderboardSyncError = {
            code: 'UNKNOWN',
            message: 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
          };

          if (error instanceof RateLimitError) {
            syncError.code = 'RATE_LIMITED';
            syncError.message = error.message;
            syncError.retryAfter = error.retryAfter;
          } else if (error instanceof LeaderboardApiError) {
            syncError.code = error.code;
            syncError.message = error.message;
          } else if (error instanceof Error) {
            syncError.message = error.message;
          }

          set({ status: 'error', error: syncError });
          return null;
        }
      },

      refreshLeaderboard: async () => {
        await get().fetchLeaderboard(get().currentParams, true);
        set({ lastAutoRefreshAt: new Date().toISOString() });
      },

      cancelFetch: () => {
        const client = getLeaderboardApiClient();
        client.cancelRequest('leaderboard');
        set({ status: 'idle' });
      },

      // ============================================
      // Submission Actions
      // ============================================

      submitPreferences: async (preferences) => {
        const { settings, isOnline, pendingSubmissions } = get();

        if (!settings.enabled || !settings.autoSubmitPreferences) {
          return false;
        }

        // Queue for later if offline
        if (!isOnline) {
          const submission: PendingSubmission = {
            id: nanoid(),
            preferences,
            retryCount: 0,
            maxRetries: settings.maxRetryAttempts,
            createdAt: new Date().toISOString(),
          };
          set({ pendingSubmissions: [...pendingSubmissions, submission] });
          return false;
        }

        set({ status: 'submitting' });

        try {
          // Use mock response if no API URL configured
          if (!settings.apiBaseUrl) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            set({
              status: 'success',
              lastSubmitAt: new Date().toISOString(),
            });
            return true;
          }

          const client = getLeaderboardApiClient({
            baseUrl: settings.apiBaseUrl,
            apiKey: settings.apiKey,
            timeoutMs: settings.requestTimeoutMs,
          });

          const response = await client.submitPreferences({ preferences });

          if (response.success) {
            set({
              status: 'success',
              lastSubmitAt: new Date().toISOString(),
            });
            return true;
          } else {
            // Queue for retry
            if (settings.retryFailedSubmissions) {
              const submission: PendingSubmission = {
                id: nanoid(),
                preferences,
                retryCount: 1,
                maxRetries: settings.maxRetryAttempts,
                createdAt: new Date().toISOString(),
                lastAttemptAt: new Date().toISOString(),
                lastError: response.error,
              };
              set((state) => ({
                status: 'error',
                pendingSubmissions: [...state.pendingSubmissions, submission],
                error: {
                  code: 'SUBMIT_FAILED',
                  message: response.error || 'Failed to submit preferences',
                  timestamp: new Date().toISOString(),
                },
              }));
            }
            return false;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          if (settings.retryFailedSubmissions) {
            const submission: PendingSubmission = {
              id: nanoid(),
              preferences,
              retryCount: 1,
              maxRetries: settings.maxRetryAttempts,
              createdAt: new Date().toISOString(),
              lastAttemptAt: new Date().toISOString(),
              lastError: errorMessage,
            };
            set((state) => ({
              pendingSubmissions: [...state.pendingSubmissions, submission],
            }));
          }

          set({
            status: 'error',
            error: {
              code: 'SUBMIT_ERROR',
              message: errorMessage,
              timestamp: new Date().toISOString(),
            },
          });
          return false;
        }
      },

      retryPendingSubmissions: async () => {
        const { pendingSubmissions, settings, isOnline } = get();

        if (!isOnline || pendingSubmissions.length === 0) {
          return;
        }

        const toRetry = [...pendingSubmissions];
        const stillPending: PendingSubmission[] = [];

        for (const submission of toRetry) {
          if (submission.retryCount >= submission.maxRetries) {
            // Drop after max retries
            continue;
          }

          try {
            if (!settings.apiBaseUrl) {
              // Mock success
              await new Promise((resolve) => setTimeout(resolve, 100));
              continue;
            }

            const client = getLeaderboardApiClient();
            const response = await client.submitPreferences({
              preferences: submission.preferences,
            });

            if (!response.success) {
              stillPending.push({
                ...submission,
                retryCount: submission.retryCount + 1,
                lastAttemptAt: new Date().toISOString(),
                lastError: response.error,
              });
            }
          } catch (error) {
            stillPending.push({
              ...submission,
              retryCount: submission.retryCount + 1,
              lastAttemptAt: new Date().toISOString(),
              lastError: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        set({ pendingSubmissions: stillPending });
      },

      clearPendingSubmissions: () => {
        set({ pendingSubmissions: [] });
      },

      // ============================================
      // Cache Actions
      // ============================================

      clearCache: () => {
        set({ cache: new Map() });
      },

      getCachedData: (params) => {
        const cacheKey = generateLeaderboardCacheKey(params);
        const entry = get().cache.get(cacheKey);
        return isCacheValid(entry) ? entry! : null;
      },

      // ============================================
      // Auto Refresh Actions
      // ============================================

      startAutoRefresh: () => {
        const { settings, _autoRefreshTimer } = get();

        // Clear existing timer
        if (_autoRefreshTimer) {
          clearInterval(_autoRefreshTimer);
        }

        if (!settings.enabled || !settings.autoRefresh) {
          set({ _autoRefreshTimer: null, autoRefreshInterval: 0 });
          return;
        }

        const intervalMs = settings.autoRefreshIntervalMinutes * 60 * 1000;
        const timer = setInterval(() => {
          get().refreshLeaderboard();
        }, intervalMs);

        set({
          _autoRefreshTimer: timer,
          autoRefreshInterval: intervalMs,
        });
      },

      stopAutoRefresh: () => {
        const { _autoRefreshTimer } = get();
        if (_autoRefreshTimer) {
          clearInterval(_autoRefreshTimer);
        }
        set({ _autoRefreshTimer: null, autoRefreshInterval: 0 });
      },

      // ============================================
      // Online Status Actions
      // ============================================

      setOnlineStatus: (isOnline) => {
        const wasOffline = !get().isOnline;
        set({ isOnline });

        // If coming back online, retry pending submissions
        if (wasOffline && isOnline) {
          get().retryPendingSubmissions();
        }

        // Update status
        if (!isOnline) {
          set({ status: 'offline' });
        } else if (get().status === 'offline') {
          set({ status: 'idle' });
        }
      },

      // ============================================
      // Error Actions
      // ============================================

      clearError: () => {
        set({ error: null, status: 'idle' });
      },
    }),
    {
      name: 'cognia-arena-leaderboard-sync',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        pendingSubmissions: state.pendingSubmissions,
        lastFetchAt: state.lastFetchAt,
        lastSubmitAt: state.lastSubmitAt,
        currentParams: state.currentParams,
        // Don't persist cache, leaderboard data, or timer
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Re-initialize transient state
          state.cache = new Map();
          state.leaderboard = [];
          state.status = 'idle';
          state.error = null;
          state.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
          state._autoRefreshTimer = null;

          // Start auto-refresh if enabled
          if (state.settings.enabled && state.settings.autoRefresh) {
            // Delay to allow store to fully initialize
            setTimeout(() => {
              state.startAutoRefresh();
            }, 1000);
          }
        }
      },
    }
  )
);

// ============================================
// Selectors
// ============================================

export const selectLeaderboardSyncStatus = (state: LeaderboardSyncStore) => state.status;
export const selectLeaderboard = (state: LeaderboardSyncStore) => state.leaderboard;
export const selectLeaderboardSyncSettings = (state: LeaderboardSyncStore) => state.settings;
export const selectLeaderboardSyncError = (state: LeaderboardSyncStore) => state.error;
export const selectIsLeaderboardSyncing = (state: LeaderboardSyncStore) =>
  state.status === 'fetching' || state.status === 'submitting';
export const selectHasPendingSubmissions = (state: LeaderboardSyncStore) =>
  state.pendingSubmissions.length > 0;
export const selectIsOnline = (state: LeaderboardSyncStore) => state.isOnline;
export const selectLastFetchAt = (state: LeaderboardSyncStore) => state.lastFetchAt;

// ============================================
// Online/Offline Event Listeners
// ============================================

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useLeaderboardSyncStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useLeaderboardSyncStore.getState().setOnlineStatus(false);
  });
}
