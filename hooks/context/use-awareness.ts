/**
 * Awareness Hook
 *
 * Provides access to system awareness and focus tracking functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { isTauri } from '@/lib/native/utils';
import { loggers } from '@/lib/logger';
import * as awarenessApi from '@/lib/native/awareness';
import type {
  ActivityStats,
  AppUsageStats,
  AwarenessState,
  DailyUsageSummary,
  FocusSession,
  Suggestion,
  SystemState,
  UserActivity,
} from '@/lib/native/awareness';

const log = loggers.native;

export type {
  ActivityStats,
  AppUsageStats,
  AwarenessState,
  DailyUsageSummary,
  FocusSession,
  Suggestion,
  SystemState,
  UserActivity,
};

export function useAwareness() {
  const [state, setState] = useState<AwarenessState | null>(null);
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchState = useCallback(async () => {
    if (!isTauri()) return null;

    setIsLoading(true);
    try {
      const result = await awarenessApi.getState();
      setState(result);
      return result;
    } catch (err) {
      log.error('Failed to fetch awareness state', err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSystemState = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      const result = await awarenessApi.getSystemState();
      setSystemState(result);
      return result;
    } catch (err) {
      log.error('Failed to fetch system state', err as Error);
      return null;
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      const result = await awarenessApi.getSuggestions();
      setSuggestions(result);
      return result;
    } catch (err) {
      log.error('Failed to fetch suggestions', err as Error);
      return [];
    }
  }, []);

  const recordActivity = useCallback(
    async (
      activityType: string,
      appName?: string,
      windowTitle?: string,
      content?: string,
      metadata?: Record<string, string>
    ) => {
      if (!isTauri()) return;

      try {
        await awarenessApi.recordActivity(activityType, appName, windowTitle, content, metadata);
      } catch (err) {
        log.error('Failed to record activity', err as Error);
      }
    },
    []
  );

  const getRecentActivities = useCallback(async (count?: number): Promise<UserActivity[]> => {
    if (!isTauri()) return [];

    try {
      return await awarenessApi.getRecentActivities(count);
    } catch (err) {
      log.error('Failed to get recent activities', err as Error);
      return [];
    }
  }, []);

  const startMonitoring = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await awarenessApi.startMonitoring();
    } catch (err) {
      log.error('Failed to start monitoring', err as Error);
    }
  }, []);

  const stopMonitoring = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await awarenessApi.stopMonitoring();
    } catch (err) {
      log.error('Failed to stop monitoring', err as Error);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await awarenessApi.clearHistory();
    } catch (err) {
      log.error('Failed to clear history', err as Error);
    }
  }, []);

  useEffect(() => {
    fetchState();
    fetchSystemState();
    fetchSuggestions();

    const interval = setInterval(() => {
      fetchSystemState();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchState, fetchSystemState, fetchSuggestions]);

  const getActivitiesByType = useCallback(async (activityType: string): Promise<UserActivity[]> => {
    if (!isTauri()) return [];

    try {
      return await awarenessApi.getActivitiesByType(activityType);
    } catch (err) {
      log.error('Failed to get activities by type', err as Error);
      return [];
    }
  }, []);

  const getActivitiesInRange = useCallback(
    async (startMs: number, endMs: number): Promise<UserActivity[]> => {
      if (!isTauri()) return [];

      try {
        return await awarenessApi.getActivitiesInRange(startMs, endMs);
      } catch (err) {
        log.error('Failed to get activities in range', err as Error);
        return [];
      }
    },
    []
  );

  const getActivitiesByApplication = useCallback(
    async (appName: string): Promise<UserActivity[]> => {
      if (!isTauri()) return [];

      try {
        return await awarenessApi.getActivitiesByApplication(appName);
      } catch (err) {
        log.error('Failed to get activities by application', err as Error);
        return [];
      }
    },
    []
  );

  const getActivityStats = useCallback(async (): Promise<ActivityStats | null> => {
    if (!isTauri()) return null;

    try {
      return await awarenessApi.getActivityStats();
    } catch (err) {
      log.error('Failed to get activity stats', err as Error);
      return null;
    }
  }, []);

  const setActivityTrackingEnabled = useCallback(async (enabled: boolean) => {
    if (!isTauri()) return;

    try {
      await awarenessApi.setActivityTrackingEnabled(enabled);
    } catch (err) {
      log.error('Failed to set activity tracking enabled', err as Error);
    }
  }, []);

  const isActivityTrackingEnabled = useCallback(async () => {
    if (!isTauri()) return true;

    try {
      return await awarenessApi.isActivityTrackingEnabled();
    } catch (err) {
      log.error('Failed to check activity tracking enabled', err as Error);
      return true;
    }
  }, []);

  const exportActivityHistory = useCallback(async () => {
    if (!isTauri()) return '';

    try {
      return await awarenessApi.exportActivityHistory();
    } catch (err) {
      log.error('Failed to export activity history', err as Error);
      return '';
    }
  }, []);

  const importActivityHistory = useCallback(async (json: string) => {
    if (!isTauri()) return 0;

    try {
      return await awarenessApi.importActivityHistory(json);
    } catch (err) {
      log.error('Failed to import activity history', err as Error);
      return 0;
    }
  }, []);

  const dismissSuggestion = useCallback(
    async (action: string) => {
      if (!isTauri()) return;

      try {
        await awarenessApi.dismissSuggestion(action);
        await fetchSuggestions();
      } catch (err) {
        log.error('Failed to dismiss suggestion', err as Error);
      }
    },
    [fetchSuggestions]
  );

  const clearDismissedSuggestions = useCallback(
    async () => {
      if (!isTauri()) return;

      try {
        await awarenessApi.clearDismissedSuggestions();
        await fetchSuggestions();
      } catch (err) {
        log.error('Failed to clear dismissed suggestions', err as Error);
      }
    },
    [fetchSuggestions]
  );

  const isSuggestionDismissed = useCallback(async (action: string) => {
    if (!isTauri()) return false;

    try {
      return await awarenessApi.isSuggestionDismissed(action);
    } catch (err) {
      log.error('Failed to check suggestion dismissed', err as Error);
      return false;
    }
  }, []);

  const getDismissedSuggestions = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      return await awarenessApi.getDismissedSuggestions();
    } catch (err) {
      log.error('Failed to get dismissed suggestions', err as Error);
      return [];
    }
  }, []);

  return {
    state,
    systemState,
    suggestions,
    isLoading,
    fetchState,
    fetchSystemState,
    fetchSuggestions,
    recordActivity,
    getRecentActivities,
    startMonitoring,
    stopMonitoring,
    clearHistory,
    getActivitiesByType,
    getActivitiesInRange,
    getActivitiesByApplication,
    getActivityStats,
    setActivityTrackingEnabled,
    isActivityTrackingEnabled,
    exportActivityHistory,
    importActivityHistory,
    dismissSuggestion,
    clearDismissedSuggestions,
    isSuggestionDismissed,
    getDismissedSuggestions,
  };
}

export function useFocusTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentFocus, setCurrentFocus] = useState<FocusSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);
  const [appStats, setAppStats] = useState<AppUsageStats[]>([]);
  const [todaySummary, setTodaySummary] = useState<DailyUsageSummary | null>(null);

  const checkTrackingStatus = useCallback(async () => {
    if (!isTauri()) return false;

    try {
      const result = await awarenessApi.isFocusTracking();
      setIsTracking(result);
      return result;
    } catch (err) {
      log.error('Failed to check tracking status', err as Error);
      return false;
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await awarenessApi.startFocusTracking();
      setIsTracking(true);
    } catch (err) {
      log.error('Failed to start focus tracking', err as Error);
    }
  }, []);

  const stopTracking = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await awarenessApi.stopFocusTracking();
      setIsTracking(false);
    } catch (err) {
      log.error('Failed to stop focus tracking', err as Error);
    }
  }, []);

  const recordFocusChange = useCallback(
    async (appName: string, processName: string, windowTitle: string) => {
      if (!isTauri()) return;

      try {
        await awarenessApi.recordFocusChange(appName, processName, windowTitle);
      } catch (err) {
        log.error('Failed to record focus change', err as Error);
      }
    },
    []
  );

  const fetchCurrentFocus = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      const result = await awarenessApi.getCurrentFocus();
      setCurrentFocus(result);
      return result;
    } catch (err) {
      log.error('Failed to get current focus', err as Error);
      return null;
    }
  }, []);

  const fetchRecentSessions = useCallback(async (count?: number) => {
    if (!isTauri()) return [];

    try {
      const result = await awarenessApi.getRecentFocusSessions(count);
      setRecentSessions(result);
      return result;
    } catch (err) {
      log.error('Failed to get recent sessions', err as Error);
      return [];
    }
  }, []);

  const fetchAppStats = useCallback(async (appName: string) => {
    if (!isTauri()) return null;

    try {
      return await awarenessApi.getAppUsageStats(appName);
    } catch (err) {
      log.error('Failed to get app stats', err as Error);
      return null;
    }
  }, []);

  const fetchAllAppStats = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      const result = await awarenessApi.getAllAppUsageStats();
      setAppStats(result);
      return result;
    } catch (err) {
      log.error('Failed to get all app stats', err as Error);
      return [];
    }
  }, []);

  const fetchTodaySummary = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      const result = await awarenessApi.getTodayUsageSummary();
      setTodaySummary(result);
      return result;
    } catch (err) {
      log.error('Failed to get today summary', err as Error);
      return null;
    }
  }, []);

  const fetchDailySummary = useCallback(async (date: string) => {
    if (!isTauri()) return null;

    try {
      return await awarenessApi.getDailyUsageSummary(date);
    } catch (err) {
      log.error('Failed to get daily summary', err as Error);
      return null;
    }
  }, []);

  const clearFocusHistory = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await awarenessApi.clearFocusHistory();
      setRecentSessions([]);
      setAppStats([]);
      setTodaySummary(null);
    } catch (err) {
      log.error('Failed to clear focus history', err as Error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await checkTrackingStatus();
      await fetchCurrentFocus();
      await fetchRecentSessions(20);
      await fetchAllAppStats();
      await fetchTodaySummary();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      fetchCurrentFocus();
    }, 5000);

    return () => clearInterval(interval);
  }, [isTracking, fetchCurrentFocus]);

  const fetchAllSessions = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      return await awarenessApi.getAllFocusSessions();
    } catch (err) {
      log.error('Failed to get all focus sessions', err as Error);
      return [];
    }
  }, []);

  const getSessionCount = useCallback(async () => {
    if (!isTauri()) return 0;

    try {
      return await awarenessApi.getFocusSessionCount();
    } catch (err) {
      log.error('Failed to get focus session count', err as Error);
      return 0;
    }
  }, []);

  return {
    isTracking,
    currentFocus,
    recentSessions,
    appStats,
    todaySummary,
    startTracking,
    stopTracking,
    recordFocusChange,
    fetchCurrentFocus,
    fetchRecentSessions,
    fetchAppStats,
    fetchAllAppStats,
    fetchTodaySummary,
    fetchDailySummary,
    clearFocusHistory,
    fetchAllSessions,
    getSessionCount,
  };
}

