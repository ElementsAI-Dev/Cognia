/**
 * useLeaderboardSync - React hook for arena leaderboard synchronization
 * Provides convenient access to leaderboard sync functionality with auto-refresh
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useArenaStore } from '@/stores/arena';
import {
  useLeaderboardSyncStore,
  selectLeaderboardSyncStatus,
  selectLeaderboard,
  selectLeaderboardSyncSettings,
  selectLeaderboardSyncError,
  selectIsLeaderboardSyncing,
  selectHasPendingSubmissions,
  selectIsOnline,
  selectLastFetchAt,
} from '@/stores/arena';
import type {
  LeaderboardFetchParams,
  LeaderboardSyncSettings,
  RemoteModelRating,
  LeaderboardPeriod,
  ArenaPreference,
} from '@/types/arena';

// ============================================
// Hook Options
// ============================================

export interface UseLeaderboardSyncOptions {
  /** Initial fetch params */
  initialParams?: LeaderboardFetchParams;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Enable auto-submission of local preferences */
  autoSubmit?: boolean;
  /** Callback when leaderboard updates */
  onUpdate?: (data: RemoteModelRating[]) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

// ============================================
// Hook Return Type
// ============================================

export interface UseLeaderboardSyncReturn {
  // State
  leaderboard: RemoteModelRating[];
  status: ReturnType<typeof selectLeaderboardSyncStatus>;
  error: ReturnType<typeof selectLeaderboardSyncError>;
  settings: LeaderboardSyncSettings;
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingSubmissions: boolean;
  lastFetchAt: string | null;

  // Actions
  fetchLeaderboard: (params?: LeaderboardFetchParams, force?: boolean) => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  submitLocalPreferences: () => Promise<boolean>;
  updateSettings: (settings: Partial<LeaderboardSyncSettings>) => void;
  clearError: () => void;
  clearCache: () => void;

  // Period-specific helpers
  fetchDaily: () => Promise<void>;
  fetchWeekly: () => Promise<void>;
  fetchMonthly: () => Promise<void>;
  fetchAllTime: () => Promise<void>;

  // Utilities
  isEnabled: boolean;
  canFetch: boolean;
}

// ============================================
// Hook Implementation
// ============================================

export function useLeaderboardSync(
  options: UseLeaderboardSyncOptions = {}
): UseLeaderboardSyncReturn {
  const {
    initialParams = {},
    autoFetch = false,
    autoSubmit = false,
    onUpdate,
    onError,
  } = options;

  // Store selectors
  const status = useLeaderboardSyncStore(selectLeaderboardSyncStatus);
  const leaderboard = useLeaderboardSyncStore(selectLeaderboard);
  const settings = useLeaderboardSyncStore(selectLeaderboardSyncSettings);
  const error = useLeaderboardSyncStore(selectLeaderboardSyncError);
  const isSyncing = useLeaderboardSyncStore(selectIsLeaderboardSyncing);
  const hasPendingSubmissions = useLeaderboardSyncStore(selectHasPendingSubmissions);
  const isOnline = useLeaderboardSyncStore(selectIsOnline);
  const lastFetchAt = useLeaderboardSyncStore(selectLastFetchAt);

  // Store actions
  const storeFetchLeaderboard = useLeaderboardSyncStore((s) => s.fetchLeaderboard);
  const storeRefreshLeaderboard = useLeaderboardSyncStore((s) => s.refreshLeaderboard);
  const storeSubmitPreferences = useLeaderboardSyncStore((s) => s.submitPreferences);
  const storeUpdateSettings = useLeaderboardSyncStore((s) => s.updateSettings);
  const storeClearError = useLeaderboardSyncStore((s) => s.clearError);
  const storeClearCache = useLeaderboardSyncStore((s) => s.clearCache);
  const storeStartAutoRefresh = useLeaderboardSyncStore((s) => s.startAutoRefresh);
  const storeStopAutoRefresh = useLeaderboardSyncStore((s) => s.stopAutoRefresh);

  // Local preferences from arena store
  const localPreferences = useArenaStore((s) => s.preferences);

  // Track last submitted preference count
  const lastSubmittedCountRef = useRef(0);

  // Derived state
  const isEnabled = settings.enabled;
  const canFetch = isEnabled && isOnline && !isSyncing;

  // ============================================
  // Callbacks
  // ============================================

  const fetchLeaderboard = useCallback(
    async (params?: LeaderboardFetchParams, force?: boolean) => {
      await storeFetchLeaderboard(params, force);
    },
    [storeFetchLeaderboard]
  );

  const refreshLeaderboard = useCallback(async () => {
    await storeRefreshLeaderboard();
  }, [storeRefreshLeaderboard]);

  const submitLocalPreferences = useCallback(async () => {
    if (!settings.enabled || !settings.autoSubmitPreferences) {
      return false;
    }

    // Get preferences that haven't been submitted yet
    const unsubmittedPreferences = localPreferences.slice(
      0,
      localPreferences.length - lastSubmittedCountRef.current
    );

    if (unsubmittedPreferences.length === 0) {
      return true;
    }

    // Convert to remote format
    const deviceId = settings.anonymousMode
      ? 'anonymous'
      : (typeof localStorage !== 'undefined'
          ? localStorage.getItem('cognia-device-id') || 'unknown'
          : 'unknown');

    const remotePreferences = unsubmittedPreferences.map((pref: ArenaPreference) => ({
      winner: pref.winner,
      loser: pref.loser,
      taskCategory: pref.taskCategory,
      reason: pref.reason,
      deviceId,
      timestamp: new Date(pref.timestamp).toISOString(),
    }));

    const success = await storeSubmitPreferences(remotePreferences);

    if (success) {
      lastSubmittedCountRef.current = localPreferences.length;
    }

    return success;
  }, [localPreferences, settings, storeSubmitPreferences]);

  const updateSettings = useCallback(
    (updates: Partial<LeaderboardSyncSettings>) => {
      storeUpdateSettings(updates);
    },
    [storeUpdateSettings]
  );

  const clearError = useCallback(() => {
    storeClearError();
  }, [storeClearError]);

  const clearCache = useCallback(() => {
    storeClearCache();
  }, [storeClearCache]);

  // Period-specific fetch helpers
  const fetchPeriod = useCallback(
    async (period: LeaderboardPeriod) => {
      await fetchLeaderboard({ period }, true);
    },
    [fetchLeaderboard]
  );

  const fetchDaily = useCallback(() => fetchPeriod('daily'), [fetchPeriod]);
  const fetchWeekly = useCallback(() => fetchPeriod('weekly'), [fetchPeriod]);
  const fetchMonthly = useCallback(() => fetchPeriod('monthly'), [fetchPeriod]);
  const fetchAllTime = useCallback(() => fetchPeriod('all-time'), [fetchPeriod]);

  // ============================================
  // Effects
  // ============================================

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && isEnabled && isOnline) {
      fetchLeaderboard(initialParams);
    }
  }, [autoFetch, isEnabled, isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start auto-refresh when enabled
  useEffect(() => {
    if (isEnabled && settings.autoRefresh) {
      storeStartAutoRefresh();
    }
    return () => {
      storeStopAutoRefresh();
    };
  }, [isEnabled, settings.autoRefresh, storeStartAutoRefresh, storeStopAutoRefresh]);

  // Auto-submit preferences when they change
  useEffect(() => {
    if (
      autoSubmit &&
      isEnabled &&
      settings.autoSubmitPreferences &&
      localPreferences.length > lastSubmittedCountRef.current
    ) {
      submitLocalPreferences();
    }
  }, [autoSubmit, isEnabled, settings.autoSubmitPreferences, localPreferences.length, submitLocalPreferences]);

  // Callback on update
  useEffect(() => {
    if (onUpdate && leaderboard.length > 0) {
      onUpdate(leaderboard);
    }
  }, [leaderboard, onUpdate]);

  // Callback on error
  useEffect(() => {
    if (onError && error) {
      onError(error.message);
    }
  }, [error, onError]);

  // ============================================
  // Return
  // ============================================

  return useMemo(
    () => ({
      // State
      leaderboard,
      status,
      error,
      settings,
      isOnline,
      isSyncing,
      hasPendingSubmissions,
      lastFetchAt,

      // Actions
      fetchLeaderboard,
      refreshLeaderboard,
      submitLocalPreferences,
      updateSettings,
      clearError,
      clearCache,

      // Period helpers
      fetchDaily,
      fetchWeekly,
      fetchMonthly,
      fetchAllTime,

      // Utilities
      isEnabled,
      canFetch,
    }),
    [
      leaderboard,
      status,
      error,
      settings,
      isOnline,
      isSyncing,
      hasPendingSubmissions,
      lastFetchAt,
      fetchLeaderboard,
      refreshLeaderboard,
      submitLocalPreferences,
      updateSettings,
      clearError,
      clearCache,
      fetchDaily,
      fetchWeekly,
      fetchMonthly,
      fetchAllTime,
      isEnabled,
      canFetch,
    ]
  );
}

// ============================================
// Convenience Hooks
// ============================================

/**
 * Hook for just reading leaderboard data (no actions)
 */
export function useLeaderboardData() {
  const leaderboard = useLeaderboardSyncStore(selectLeaderboard);
  const status = useLeaderboardSyncStore(selectLeaderboardSyncStatus);
  const error = useLeaderboardSyncStore(selectLeaderboardSyncError);
  const lastFetchAt = useLeaderboardSyncStore(selectLastFetchAt);

  return { leaderboard, status, error, lastFetchAt };
}

/**
 * Hook for leaderboard sync settings only
 */
export function useLeaderboardSyncSettings() {
  const settings = useLeaderboardSyncStore(selectLeaderboardSyncSettings);
  const updateSettings = useLeaderboardSyncStore((s) => s.updateSettings);
  const resetSettings = useLeaderboardSyncStore((s) => s.resetSettings);

  return { settings, updateSettings, resetSettings };
}

/**
 * Hook for online/offline status
 */
export function useLeaderboardOnlineStatus() {
  const isOnline = useLeaderboardSyncStore(selectIsOnline);
  const setOnlineStatus = useLeaderboardSyncStore((s) => s.setOnlineStatus);

  return { isOnline, setOnlineStatus };
}

export default useLeaderboardSync;
