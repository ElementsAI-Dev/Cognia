/**
 * Tests for useAwareness and useFocusTracking hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAwareness, useFocusTracking } from './use-awareness';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock isTauri
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => true,
}));

describe('useAwareness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSystemState = {
    cpu_usage: 45.5,
    memory_usage: 8000000000,
    memory_total: 16000000000,
    memory_available: 8000000000,
    disk_usage: 500000000000,
    disk_total: 1000000000000,
    disk_available: 500000000000,
    battery_level: 85,
    is_charging: true,
    power_mode: 'balanced',
    uptime_seconds: 3600,
    process_count: 150,
    network_connected: true,
  };

  const mockAwarenessState = {
    system: mockSystemState,
    recent_activities: [],
    suggestions: [],
    timestamp: Date.now(),
  };

  const mockSuggestions = [
    {
      id: '1',
      suggestion_type: 'productivity',
      title: 'Take a break',
      description: 'You have been working for 2 hours',
      priority: 5,
    },
  ];

  describe('initialization', () => {
    it('should initialize and fetch state on mount', async () => {
      mockInvoke
        .mockResolvedValueOnce(mockAwarenessState)
        .mockResolvedValueOnce(mockSystemState)
        .mockResolvedValueOnce(mockSuggestions);
      
      const { result } = renderHook(() => useAwareness());
      
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('awareness_get_state');
        expect(mockInvoke).toHaveBeenCalledWith('awareness_get_system_state');
        expect(mockInvoke).toHaveBeenCalledWith('awareness_get_suggestions');
      });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle null responses', async () => {
      mockInvoke.mockResolvedValue(null);
      
      const { result } = renderHook(() => useAwareness());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.state).toBeNull();
    });
  });

  describe('fetchState', () => {
    it('should fetch and update awareness state', async () => {
      mockInvoke.mockResolvedValue(mockAwarenessState);
      
      const { result } = renderHook(() => useAwareness());
      
      await act(async () => {
        const state = await result.current.fetchState();
        expect(state).toEqual(mockAwarenessState);
      });
      
      expect(result.current.state).toEqual(mockAwarenessState);
    });

    it('should handle fetch errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useAwareness());
      
      await act(async () => {
        const state = await result.current.fetchState();
        expect(state).toBeNull();
      });
    });
  });

  describe('fetchSystemState', () => {
    it('should fetch and update system state', async () => {
      mockInvoke.mockResolvedValue(mockSystemState);
      
      const { result } = renderHook(() => useAwareness());
      
      await act(async () => {
        const state = await result.current.fetchSystemState();
        expect(state).toEqual(mockSystemState);
      });
      
      expect(result.current.systemState).toEqual(mockSystemState);
    });
  });

  describe('fetchSuggestions', () => {
    it('should fetch and update suggestions', async () => {
      mockInvoke.mockResolvedValue(mockSuggestions);
      
      const { result } = renderHook(() => useAwareness());
      
      await act(async () => {
        const suggestions = await result.current.fetchSuggestions();
        expect(suggestions).toEqual(mockSuggestions);
      });
      
      expect(result.current.suggestions).toEqual(mockSuggestions);
    });
  });

  describe('recordActivity', () => {
    it('should call invoke with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useAwareness());
      
      await act(async () => {
        await result.current.recordActivity(
          'text_selection',
          'VSCode',
          'main.ts',
          'selected text',
          { key: 'value' }
        );
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_record_activity', {
        activityType: 'text_selection',
        appName: 'VSCode',
        windowTitle: 'main.ts',
        content: 'selected text',
        metadata: { key: 'value' },
      });
    });
  });

  describe('getRecentActivities', () => {
    it('should return recent activities', async () => {
      const mockActivities = [
        { id: '1', activity_type: 'selection', timestamp: Date.now(), metadata: {} },
      ];
      mockInvoke.mockResolvedValue(mockActivities);
      
      const { result } = renderHook(() => useAwareness());
      
      await act(async () => {
        const activities = await result.current.getRecentActivities(10);
        expect(activities).toEqual(mockActivities);
      });
    });
  });

  describe('monitoring controls', () => {
    it('should start monitoring', async () => {
      mockInvoke.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useAwareness());
      
      await act(async () => {
        await result.current.startMonitoring();
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_start_monitoring');
    });

    it('should stop monitoring', async () => {
      mockInvoke.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useAwareness());
      
      await act(async () => {
        await result.current.stopMonitoring();
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_stop_monitoring');
    });
  });

  describe('clearHistory', () => {
    it('should clear activity history', async () => {
      mockInvoke.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useAwareness());
      
      await act(async () => {
        await result.current.clearHistory();
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_clear_history');
    });
  });
});

describe('useFocusTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFocusSession = {
    app_name: 'VSCode',
    process_name: 'code.exe',
    window_title: 'main.ts - Project',
    start_time: Date.now() - 60000,
    end_time: undefined,
    duration_ms: 60000,
    is_active: true,
  };

  const mockAppStats = {
    app_name: 'VSCode',
    total_time_ms: 3600000,
    session_count: 10,
    avg_session_ms: 360000,
    last_used: Date.now(),
    common_titles: ['main.ts', 'index.ts'],
  };

  const mockDailySummary = {
    date: '2024-01-15',
    total_active_ms: 28800000,
    by_app: { VSCode: 14400000, Chrome: 7200000 },
    top_apps: [['VSCode', 14400000], ['Chrome', 7200000]] as [string, number][],
    switch_count: 50,
  };

  describe('initialization', () => {
    it('should initialize with default values', () => {
      mockInvoke.mockResolvedValue(null);
      
      const { result } = renderHook(() => useFocusTracking());
      
      expect(result.current.isTracking).toBe(false);
      expect(result.current.currentFocus).toBeNull();
      expect(result.current.recentSessions).toEqual([]);
      expect(result.current.appStats).toEqual([]);
      expect(result.current.todaySummary).toBeNull();
    });
  });

  describe('startTracking', () => {
    it('should start focus tracking', async () => {
      mockInvoke.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useFocusTracking());
      
      await act(async () => {
        await result.current.startTracking();
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_start_focus_tracking');
      expect(result.current.isTracking).toBe(true);
    });
  });

  describe('stopTracking', () => {
    it('should stop focus tracking', async () => {
      mockInvoke.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useFocusTracking());
      
      // First start tracking
      await act(async () => {
        await result.current.startTracking();
      });
      
      // Then stop
      await act(async () => {
        await result.current.stopTracking();
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_stop_focus_tracking');
      expect(result.current.isTracking).toBe(false);
    });
  });

  describe('recordFocusChange', () => {
    it('should record focus change with correct parameters', async () => {
      mockInvoke.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useFocusTracking());
      
      await act(async () => {
        await result.current.recordFocusChange('Chrome', 'chrome.exe', 'Google');
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_record_focus_change', {
        appName: 'Chrome',
        processName: 'chrome.exe',
        windowTitle: 'Google',
      });
    });
  });

  describe('fetchCurrentFocus', () => {
    it('should fetch and update current focus', async () => {
      mockInvoke.mockResolvedValue(mockFocusSession);
      
      const { result } = renderHook(() => useFocusTracking());
      
      await act(async () => {
        const focus = await result.current.fetchCurrentFocus();
        expect(focus).toEqual(mockFocusSession);
      });
      
      expect(result.current.currentFocus).toEqual(mockFocusSession);
    });
  });

  describe('fetchRecentSessions', () => {
    it('should fetch and update recent sessions', async () => {
      const mockSessions = [mockFocusSession];
      mockInvoke.mockResolvedValue(mockSessions);
      
      const { result } = renderHook(() => useFocusTracking());
      
      await act(async () => {
        const sessions = await result.current.fetchRecentSessions(10);
        expect(sessions).toEqual(mockSessions);
      });
      
      expect(result.current.recentSessions).toEqual(mockSessions);
    });
  });

  describe('fetchAppStats', () => {
    it('should fetch app stats for specific app', async () => {
      mockInvoke.mockResolvedValue(mockAppStats);
      
      const { result } = renderHook(() => useFocusTracking());
      
      await act(async () => {
        const stats = await result.current.fetchAppStats('VSCode');
        expect(stats).toEqual(mockAppStats);
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_app_usage_stats', {
        appName: 'VSCode',
      });
    });
  });

  describe('fetchAllAppStats', () => {
    it('should fetch and update all app stats', async () => {
      const mockAllStats = [mockAppStats];
      mockInvoke.mockResolvedValue(mockAllStats);
      
      const { result } = renderHook(() => useFocusTracking());
      
      await act(async () => {
        const stats = await result.current.fetchAllAppStats();
        expect(stats).toEqual(mockAllStats);
      });
      
      expect(result.current.appStats).toEqual(mockAllStats);
    });
  });

  describe('fetchTodaySummary', () => {
    it('should fetch and update today summary', async () => {
      mockInvoke.mockResolvedValue(mockDailySummary);
      
      const { result } = renderHook(() => useFocusTracking());
      
      await act(async () => {
        const summary = await result.current.fetchTodaySummary();
        expect(summary).toEqual(mockDailySummary);
      });
      
      expect(result.current.todaySummary).toEqual(mockDailySummary);
    });
  });

  describe('fetchDailySummary', () => {
    it('should fetch daily summary for specific date', async () => {
      mockInvoke.mockResolvedValue(mockDailySummary);
      
      const { result } = renderHook(() => useFocusTracking());
      
      await act(async () => {
        const summary = await result.current.fetchDailySummary('2024-01-15');
        expect(summary).toEqual(mockDailySummary);
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_get_daily_usage_summary', {
        date: '2024-01-15',
      });
    });
  });

  describe('clearFocusHistory', () => {
    it('should clear focus history', async () => {
      mockInvoke.mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useFocusTracking());
      
      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });
      
      await act(async () => {
        await result.current.clearFocusHistory();
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('awareness_clear_focus_history');
    });
  });
});

// Note: Non-Tauri environment tests are skipped as they require complex module re-mocking
// The isTauri check is tested implicitly through the mock setup
