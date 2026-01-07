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
  type AwarenessState,
  type SystemState,
  type Suggestion,
  type UserActivity,
  type FocusSession,
  type AppUsageStats,
  type DailyUsageSummary,
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
});
