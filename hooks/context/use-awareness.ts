/**
 * Awareness Hook
 *
 * Provides access to system awareness and focus tracking functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';

export interface SystemState {
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  memory_available: number;
  disk_usage: number;
  disk_total: number;
  disk_available: number;
  battery_level?: number;
  is_charging?: boolean;
  power_mode: string;
  uptime_seconds: number;
  process_count: number;
  network_connected: boolean;
}

export interface Suggestion {
  id: string;
  suggestion_type: string;
  title: string;
  description: string;
  action?: string;
  priority: number;
  expires_at?: number;
}

export interface AwarenessState {
  system: SystemState;
  recent_activities: UserActivity[];
  suggestions: Suggestion[];
  timestamp: number;
}

export interface UserActivity {
  id: string;
  activity_type: string;
  timestamp: number;
  app_name?: string;
  window_title?: string;
  content?: string;
  metadata: Record<string, string>;
}

export interface FocusSession {
  app_name: string;
  process_name: string;
  window_title: string;
  start_time: number;
  end_time?: number;
  duration_ms: number;
  is_active: boolean;
}

export interface AppUsageStats {
  app_name: string;
  total_time_ms: number;
  session_count: number;
  avg_session_ms: number;
  last_used: number;
  common_titles: string[];
}

export interface DailyUsageSummary {
  date: string;
  total_active_ms: number;
  by_app: Record<string, number>;
  top_apps: [string, number][];
  switch_count: number;
}

export function useAwareness() {
  const [state, setState] = useState<AwarenessState | null>(null);
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchState = useCallback(async () => {
    if (!isTauri()) return null;

    setIsLoading(true);
    try {
      const result = await invoke<AwarenessState>('awareness_get_state');
      setState(result);
      return result;
    } catch (err) {
      console.error('Failed to fetch awareness state:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSystemState = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      const result = await invoke<SystemState>('awareness_get_system_state');
      setSystemState(result);
      return result;
    } catch (err) {
      console.error('Failed to fetch system state:', err);
      return null;
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      const result = await invoke<Suggestion[]>('awareness_get_suggestions');
      setSuggestions(result);
      return result;
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
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
        await invoke('awareness_record_activity', {
          activityType,
          appName,
          windowTitle,
          content,
          metadata,
        });
      } catch (err) {
        console.error('Failed to record activity:', err);
      }
    },
    []
  );

  const getRecentActivities = useCallback(async (count?: number) => {
    if (!isTauri()) return [];

    try {
      return await invoke<UserActivity[]>('awareness_get_recent_activities', { count });
    } catch (err) {
      console.error('Failed to get recent activities:', err);
      return [];
    }
  }, []);

  const startMonitoring = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('awareness_start_monitoring');
    } catch (err) {
      console.error('Failed to start monitoring:', err);
    }
  }, []);

  const stopMonitoring = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('awareness_stop_monitoring');
    } catch (err) {
      console.error('Failed to stop monitoring:', err);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('awareness_clear_history');
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, []);

  useEffect(() => {
    fetchState();
    fetchSystemState();
    fetchSuggestions();

    const interval = setInterval(() => {
      fetchSystemState();
    }, 10000); // Refresh system state every 10 seconds

    return () => clearInterval(interval);
  }, [fetchState, fetchSystemState, fetchSuggestions]);

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
      const result = await invoke<boolean>('awareness_is_focus_tracking');
      setIsTracking(result);
      return result;
    } catch (err) {
      console.error('Failed to check tracking status:', err);
      return false;
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('awareness_start_focus_tracking');
      setIsTracking(true);
    } catch (err) {
      console.error('Failed to start focus tracking:', err);
    }
  }, []);

  const stopTracking = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('awareness_stop_focus_tracking');
      setIsTracking(false);
    } catch (err) {
      console.error('Failed to stop focus tracking:', err);
    }
  }, []);

  const recordFocusChange = useCallback(
    async (appName: string, processName: string, windowTitle: string) => {
      if (!isTauri()) return;

      try {
        await invoke('awareness_record_focus_change', {
          appName,
          processName,
          windowTitle,
        });
      } catch (err) {
        console.error('Failed to record focus change:', err);
      }
    },
    []
  );

  const fetchCurrentFocus = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      const result = await invoke<FocusSession | null>('awareness_get_current_focus');
      setCurrentFocus(result);
      return result;
    } catch (err) {
      console.error('Failed to get current focus:', err);
      return null;
    }
  }, []);

  const fetchRecentSessions = useCallback(async (count?: number) => {
    if (!isTauri()) return [];

    try {
      const result = await invoke<FocusSession[]>('awareness_get_recent_focus_sessions', { count });
      setRecentSessions(result);
      return result;
    } catch (err) {
      console.error('Failed to get recent sessions:', err);
      return [];
    }
  }, []);

  const fetchAppStats = useCallback(async (appName: string) => {
    if (!isTauri()) return null;

    try {
      return await invoke<AppUsageStats | null>('awareness_get_app_usage_stats', { appName });
    } catch (err) {
      console.error('Failed to get app stats:', err);
      return null;
    }
  }, []);

  const fetchAllAppStats = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      const result = await invoke<AppUsageStats[]>('awareness_get_all_app_usage_stats');
      setAppStats(result);
      return result;
    } catch (err) {
      console.error('Failed to get all app stats:', err);
      return [];
    }
  }, []);

  const fetchTodaySummary = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      const result = await invoke<DailyUsageSummary>('awareness_get_today_usage_summary');
      setTodaySummary(result);
      return result;
    } catch (err) {
      console.error('Failed to get today summary:', err);
      return null;
    }
  }, []);

  const fetchDailySummary = useCallback(async (date: string) => {
    if (!isTauri()) return null;

    try {
      return await invoke<DailyUsageSummary>('awareness_get_daily_usage_summary', { date });
    } catch (err) {
      console.error('Failed to get daily summary:', err);
      return null;
    }
  }, []);

  const clearFocusHistory = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('awareness_clear_focus_history');
      setRecentSessions([]);
      setAppStats([]);
      setTodaySummary(null);
    } catch (err) {
      console.error('Failed to clear focus history:', err);
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
  };
}
