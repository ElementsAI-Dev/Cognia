/**
 * Awareness Tests
 *
 * Tests for awareness native API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  getState,
  getSystemState,
  getSuggestions,
  recordActivity,
  getRecentActivities,
  clearHistory,
  startMonitoring,
  stopMonitoring,
  startFocusTracking,
  stopFocusTracking,
  isFocusTracking,
  recordFocusChange,
  getCurrentFocus,
  getRecentFocusSessions,
  getAppUsageStats,
  getAllAppUsageStats,
  getTodayUsageSummary,
  getDailyUsageSummary,
  clearFocusHistory,
  // Extended Activity Tracker Functions
  getActivitiesByType,
  getActivitiesInRange,
  getActivitiesByApplication,
  getActivityStats,
  setActivityTrackingEnabled,
  isActivityTrackingEnabled,
  exportActivityHistory,
  importActivityHistory,
  // Extended Suggestion Functions
  dismissSuggestion,
  clearDismissedSuggestions,
  isSuggestionDismissed,
  getDismissedSuggestions,
  // Extended Focus Tracker Functions
  getAllFocusSessions,
  getFocusSessionCount,
  type AwarenessState,
  type SystemState,
  type Suggestion,
  type UserActivity,
  type FocusSession,
  type AppUsageStats,
  type DailyUsageSummary,
  type ActivityStats,
} from './awareness';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('Awareness - State Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getState', () => {
    it('should call invoke with correct command', async () => {
      const mockState: AwarenessState = {
        system: {
          cpu_usage: 25,
          memory_usage: 50,
          memory_total: 16000000000,
          memory_available: 8000000000,
          disk_usage: 60,
          disk_total: 500000000000,
          disk_available: 200000000000,
          power_mode: 'balanced',
          uptime_seconds: 3600,
          process_count: 150,
          network_connected: true,
        },
        recent_activities: [],
        suggestions: [],
        timestamp: Date.now(),
      };
      mockInvoke.mockResolvedValue(mockState);

      const result = await getState();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_state');
      expect(result).toEqual(mockState);
    });
  });

  describe('getSystemState', () => {
    it('should call invoke with correct command', async () => {
      const mockSystemState: SystemState = {
        cpu_usage: 25,
        memory_usage: 50,
        memory_total: 16000000000,
        memory_available: 8000000000,
        disk_usage: 60,
        disk_total: 500000000000,
        disk_available: 200000000000,
        power_mode: 'high_performance',
        uptime_seconds: 7200,
        process_count: 200,
        network_connected: true,
      };
      mockInvoke.mockResolvedValue(mockSystemState);

      const result = await getSystemState();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_system_state');
      expect(result).toEqual(mockSystemState);
    });
  });

  describe('getSuggestions', () => {
    it('should call invoke with correct command', async () => {
      const mockSuggestions: Suggestion[] = [
        {
          id: 'sug-1',
          suggestion_type: 'QuickAction',
          title: 'Take a break',
          description: 'You have been working for 2 hours',
          priority: 1,
        },
      ];
      mockInvoke.mockResolvedValue(mockSuggestions);

      const result = await getSuggestions();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_suggestions');
      expect(result).toEqual(mockSuggestions);
    });
  });
});

describe('Awareness - Activity Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordActivity', () => {
    it('should call invoke with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await recordActivity('TextSelection', 'VSCode', 'main.ts', 'selected text', { key: 'value' });

      expect(mockInvoke).toHaveBeenCalledWith('awareness_record_activity', {
        activityType: 'TextSelection',
        appName: 'VSCode',
        windowTitle: 'main.ts',
        content: 'selected text',
        metadata: { key: 'value' },
      });
    });

    it('should work with minimal parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await recordActivity('Screenshot');

      expect(mockInvoke).toHaveBeenCalledWith('awareness_record_activity', {
        activityType: 'Screenshot',
        appName: undefined,
        windowTitle: undefined,
        content: undefined,
        metadata: undefined,
      });
    });
  });

  describe('getRecentActivities', () => {
    it('should call invoke with count parameter', async () => {
      const mockActivities: UserActivity[] = [
        {
          id: 'act-1',
          activity_type: 'TextSelection',
          timestamp: Date.now(),
          metadata: {},
        },
      ];
      mockInvoke.mockResolvedValue(mockActivities);

      const result = await getRecentActivities(10);
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_recent_activities', { count: 10 });
      expect(result).toEqual(mockActivities);
    });

    it('should work without count parameter', async () => {
      mockInvoke.mockResolvedValue([]);

      await getRecentActivities();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_recent_activities', { count: undefined });
    });
  });

  describe('clearHistory', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await clearHistory();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_clear_history');
    });
  });
});

describe('Awareness - Monitoring Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startMonitoring', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await startMonitoring();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_start_monitoring');
    });
  });

  describe('stopMonitoring', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await stopMonitoring();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_stop_monitoring');
    });
  });
});

describe('Awareness - Focus Tracking Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startFocusTracking', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await startFocusTracking();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_start_focus_tracking');
    });
  });

  describe('stopFocusTracking', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await stopFocusTracking();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_stop_focus_tracking');
    });
  });

  describe('isFocusTracking', () => {
    it('should return tracking status', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await isFocusTracking();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_is_focus_tracking');
      expect(result).toBe(true);
    });
  });

  describe('recordFocusChange', () => {
    it('should call invoke with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await recordFocusChange('Chrome', 'chrome.exe', 'Google Search');

      expect(mockInvoke).toHaveBeenCalledWith('awareness_record_focus_change', {
        appName: 'Chrome',
        processName: 'chrome.exe',
        windowTitle: 'Google Search',
      });
    });
  });

  describe('getCurrentFocus', () => {
    it('should return current focus session', async () => {
      const mockSession: FocusSession = {
        app_name: 'VSCode',
        process_name: 'code.exe',
        window_title: 'main.ts',
        start_time: Date.now(),
        duration_ms: 3600000,
        is_active: true,
      };
      mockInvoke.mockResolvedValue(mockSession);

      const result = await getCurrentFocus();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_current_focus');
      expect(result).toEqual(mockSession);
    });

    it('should return null when no focus', async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await getCurrentFocus();
      expect(result).toBeNull();
    });
  });

  describe('getRecentFocusSessions', () => {
    it('should call invoke with count parameter', async () => {
      mockInvoke.mockResolvedValue([]);

      await getRecentFocusSessions(5);
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_recent_focus_sessions', { count: 5 });
    });
  });

  describe('getAppUsageStats', () => {
    it('should return app usage statistics', async () => {
      const mockStats: AppUsageStats = {
        app_name: 'VSCode',
        total_time_ms: 7200000,
        session_count: 5,
        avg_session_ms: 1440000,
        last_used: Date.now(),
        common_titles: ['main.ts', 'index.ts'],
      };
      mockInvoke.mockResolvedValue(mockStats);

      const result = await getAppUsageStats('VSCode');
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_app_usage_stats', { appName: 'VSCode' });
      expect(result).toEqual(mockStats);
    });
  });

  describe('getAllAppUsageStats', () => {
    it('should return all app usage statistics', async () => {
      mockInvoke.mockResolvedValue([]);

      await getAllAppUsageStats();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_all_app_usage_stats');
    });
  });

  describe('getTodayUsageSummary', () => {
    it('should return today usage summary', async () => {
      const mockSummary: DailyUsageSummary = {
        date: '2024-01-15',
        total_active_ms: 28800000,
        by_app: { VSCode: 14400000, Chrome: 7200000 },
        top_apps: [['VSCode', 14400000], ['Chrome', 7200000]],
        switch_count: 50,
      };
      mockInvoke.mockResolvedValue(mockSummary);

      const result = await getTodayUsageSummary();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_today_usage_summary');
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getDailyUsageSummary', () => {
    it('should call invoke with date parameter', async () => {
      mockInvoke.mockResolvedValue({} as DailyUsageSummary);

      await getDailyUsageSummary('2024-01-10');
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_daily_usage_summary', { date: '2024-01-10' });
    });
  });

  describe('clearFocusHistory', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await clearFocusHistory();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_clear_focus_history');
    });
  });
});

describe('Awareness - Extended Activity Tracker Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActivitiesByType', () => {
    it('should call invoke with activity type parameter', async () => {
      const mockActivities: UserActivity[] = [
        { id: 'act-1', activity_type: 'TextSelection', timestamp: Date.now(), metadata: {} },
      ];
      mockInvoke.mockResolvedValue(mockActivities);

      const result = await getActivitiesByType('TextSelection');
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_activities_by_type', {
        activityType: 'TextSelection',
      });
      expect(result).toEqual(mockActivities);
    });
  });

  describe('getActivitiesInRange', () => {
    it('should call invoke with time range parameters', async () => {
      const startMs = Date.now() - 3600000;
      const endMs = Date.now();
      mockInvoke.mockResolvedValue([]);

      await getActivitiesInRange(startMs, endMs);
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_activities_in_range', {
        startMs,
        endMs,
      });
    });
  });

  describe('getActivitiesByApplication', () => {
    it('should call invoke with app name parameter', async () => {
      mockInvoke.mockResolvedValue([]);

      await getActivitiesByApplication('VSCode');
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_activities_by_application', {
        appName: 'VSCode',
      });
    });
  });

  describe('getActivityStats', () => {
    it('should return activity statistics', async () => {
      const mockStats: ActivityStats = {
        total_activities: 100,
        activities_last_hour: 10,
        activities_last_day: 50,
        most_common_type: 'TextSelection',
        most_used_application: 'VSCode',
        activity_counts: { TextSelection: 30, Screenshot: 20 },
      };
      mockInvoke.mockResolvedValue(mockStats);

      const result = await getActivityStats();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_activity_stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('setActivityTrackingEnabled', () => {
    it('should call invoke with enabled parameter', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await setActivityTrackingEnabled(true);
      expect(mockInvoke).toHaveBeenCalledWith('awareness_set_activity_tracking_enabled', {
        enabled: true,
      });
    });

    it('should disable tracking when false', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await setActivityTrackingEnabled(false);
      expect(mockInvoke).toHaveBeenCalledWith('awareness_set_activity_tracking_enabled', {
        enabled: false,
      });
    });
  });

  describe('isActivityTrackingEnabled', () => {
    it('should return tracking enabled status', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await isActivityTrackingEnabled();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_is_activity_tracking_enabled');
      expect(result).toBe(true);
    });
  });

  describe('exportActivityHistory', () => {
    it('should return exported JSON string', async () => {
      const mockJson = '{"activities":[]}';
      mockInvoke.mockResolvedValue(mockJson);

      const result = await exportActivityHistory();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_export_activity_history');
      expect(result).toBe(mockJson);
    });
  });

  describe('importActivityHistory', () => {
    it('should call invoke with JSON parameter and return count', async () => {
      const jsonData = '{"activities":[{"id":"1"}]}';
      mockInvoke.mockResolvedValue(5);

      const result = await importActivityHistory(jsonData);
      expect(mockInvoke).toHaveBeenCalledWith('awareness_import_activity_history', {
        json: jsonData,
      });
      expect(result).toBe(5);
    });
  });
});

describe('Awareness - Extended Suggestion Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dismissSuggestion', () => {
    it('should call invoke with action parameter', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await dismissSuggestion('take_break');
      expect(mockInvoke).toHaveBeenCalledWith('awareness_dismiss_suggestion', {
        action: 'take_break',
      });
    });
  });

  describe('clearDismissedSuggestions', () => {
    it('should call invoke with correct command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await clearDismissedSuggestions();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_clear_dismissed_suggestions');
    });
  });

  describe('isSuggestionDismissed', () => {
    it('should return dismissed status', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await isSuggestionDismissed('take_break');
      expect(mockInvoke).toHaveBeenCalledWith('awareness_is_suggestion_dismissed', {
        action: 'take_break',
      });
      expect(result).toBe(true);
    });

    it('should return false for non-dismissed suggestion', async () => {
      mockInvoke.mockResolvedValue(false);

      const result = await isSuggestionDismissed('new_action');
      expect(result).toBe(false);
    });
  });

  describe('getDismissedSuggestions', () => {
    it('should return list of dismissed actions', async () => {
      const mockDismissed = ['take_break', 'low_battery'];
      mockInvoke.mockResolvedValue(mockDismissed);

      const result = await getDismissedSuggestions();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_dismissed_suggestions');
      expect(result).toEqual(mockDismissed);
    });
  });
});

describe('Awareness - Extended Focus Tracker Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllFocusSessions', () => {
    it('should return all focus sessions', async () => {
      const mockSessions: FocusSession[] = [
        {
          app_name: 'VSCode',
          process_name: 'code.exe',
          window_title: 'main.ts',
          start_time: Date.now() - 3600000,
          end_time: Date.now() - 1800000,
          duration_ms: 1800000,
          is_active: false,
        },
        {
          app_name: 'Chrome',
          process_name: 'chrome.exe',
          window_title: 'Google',
          start_time: Date.now() - 1800000,
          duration_ms: 1800000,
          is_active: true,
        },
      ];
      mockInvoke.mockResolvedValue(mockSessions);

      const result = await getAllFocusSessions();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_all_focus_sessions');
      expect(result).toEqual(mockSessions);
      expect(result).toHaveLength(2);
    });
  });

  describe('getFocusSessionCount', () => {
    it('should return session count', async () => {
      mockInvoke.mockResolvedValue(42);

      const result = await getFocusSessionCount();
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_focus_session_count');
      expect(result).toBe(42);
    });
  });
});

describe('Awareness Types', () => {
  it('should have correct SystemState structure', () => {
    const state: SystemState = {
      cpu_usage: 25,
      memory_usage: 50,
      memory_total: 16000000000,
      memory_available: 8000000000,
      disk_usage: 60,
      disk_total: 500000000000,
      disk_available: 200000000000,
      battery_level: 80,
      is_charging: true,
      power_mode: 'balanced',
      uptime_seconds: 3600,
      process_count: 150,
      network_connected: true,
    };

    expect(state.cpu_usage).toBe(25);
    expect(state.battery_level).toBe(80);
  });

  it('should have correct Suggestion structure', () => {
    const suggestion: Suggestion = {
      id: 'sug-1',
      suggestion_type: 'Reminder',
      title: 'Meeting reminder',
      description: 'You have a meeting in 15 minutes',
      action: 'open_calendar',
      priority: 2,
      expires_at: Date.now() + 900000,
    };

    expect(suggestion.suggestion_type).toBe('Reminder');
    expect(suggestion.action).toBe('open_calendar');
  });

  it('should have correct ActivityStats structure', () => {
    const stats: ActivityStats = {
      total_activities: 100,
      activities_last_hour: 10,
      activities_last_day: 50,
      most_common_type: 'TextSelection',
      most_used_application: 'VSCode',
      activity_counts: { TextSelection: 30, Screenshot: 20 },
    };

    expect(stats.total_activities).toBe(100);
    expect(stats.activity_counts['TextSelection']).toBe(30);
  });
});
