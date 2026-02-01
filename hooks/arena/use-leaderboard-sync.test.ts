/**
 * Tests for useLeaderboardSync hook
 */

import { renderHook, act } from '@testing-library/react';
import {
  useLeaderboardSync,
  useLeaderboardData,
  useLeaderboardSyncSettings,
  useLeaderboardOnlineStatus,
} from './use-leaderboard-sync';

// Mock stores
const mockLeaderboardSyncStore = {
  status: 'idle',
  leaderboard: [],
  settings: {
    enabled: true,
    autoRefresh: false,
    autoSubmitPreferences: false,
    anonymousMode: false,
  },
  error: null,
  isSyncing: false,
  hasPendingSubmissions: false,
  isOnline: true,
  lastFetchAt: null,
  fetchLeaderboard: jest.fn(),
  refreshLeaderboard: jest.fn(),
  submitPreferences: jest.fn(),
  updateSettings: jest.fn(),
  clearError: jest.fn(),
  clearCache: jest.fn(),
  startAutoRefresh: jest.fn(),
  stopAutoRefresh: jest.fn(),
  setOnlineStatus: jest.fn(),
  resetSettings: jest.fn(),
};

const mockArenaStore = {
  preferences: [],
};

jest.mock('@/stores/arena', () => ({
  useArenaStore: jest.fn((selector) => selector(mockArenaStore)),
  useLeaderboardSyncStore: jest.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockLeaderboardSyncStore);
    }
    return mockLeaderboardSyncStore;
  }),
  selectLeaderboardSyncStatus: (state: typeof mockLeaderboardSyncStore) => state.status,
  selectLeaderboard: (state: typeof mockLeaderboardSyncStore) => state.leaderboard,
  selectLeaderboardSyncSettings: (state: typeof mockLeaderboardSyncStore) => state.settings,
  selectLeaderboardSyncError: (state: typeof mockLeaderboardSyncStore) => state.error,
  selectIsLeaderboardSyncing: (state: typeof mockLeaderboardSyncStore) => state.isSyncing,
  selectHasPendingSubmissions: (state: typeof mockLeaderboardSyncStore) => state.hasPendingSubmissions,
  selectIsOnline: (state: typeof mockLeaderboardSyncStore) => state.isOnline,
  selectLastFetchAt: (state: typeof mockLeaderboardSyncStore) => state.lastFetchAt,
}));

describe('useLeaderboardSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeaderboardSyncStore.settings.enabled = true;
    mockLeaderboardSyncStore.isOnline = true;
    mockLeaderboardSyncStore.isSyncing = false;
    mockArenaStore.preferences = [];
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useLeaderboardSync());

      expect(result.current.leaderboard).toEqual([]);
      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isEnabled).toBe(true);
      expect(result.current.canFetch).toBe(true);
    });

    it('should accept options', () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useLeaderboardSync({
          autoFetch: false,
          autoSubmit: false,
          onUpdate,
          onError,
        })
      );

      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('fetchLeaderboard', () => {
    it('should call store fetchLeaderboard', async () => {
      mockLeaderboardSyncStore.fetchLeaderboard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeaderboardSync());

      await act(async () => {
        await result.current.fetchLeaderboard();
      });

      expect(mockLeaderboardSyncStore.fetchLeaderboard).toHaveBeenCalled();
    });

    it('should call fetchLeaderboard with params', async () => {
      mockLeaderboardSyncStore.fetchLeaderboard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeaderboardSync());

      await act(async () => {
        await result.current.fetchLeaderboard({ period: 'weekly' }, true);
      });

      expect(mockLeaderboardSyncStore.fetchLeaderboard).toHaveBeenCalledWith(
        { period: 'weekly' },
        true
      );
    });
  });

  describe('refreshLeaderboard', () => {
    it('should call store refreshLeaderboard', async () => {
      mockLeaderboardSyncStore.refreshLeaderboard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeaderboardSync());

      await act(async () => {
        await result.current.refreshLeaderboard();
      });

      expect(mockLeaderboardSyncStore.refreshLeaderboard).toHaveBeenCalled();
    });
  });

  describe('period-specific fetches', () => {
    it('should fetch daily leaderboard', async () => {
      mockLeaderboardSyncStore.fetchLeaderboard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeaderboardSync());

      await act(async () => {
        await result.current.fetchDaily();
      });

      expect(mockLeaderboardSyncStore.fetchLeaderboard).toHaveBeenCalledWith(
        { period: 'daily' },
        true
      );
    });

    it('should fetch weekly leaderboard', async () => {
      mockLeaderboardSyncStore.fetchLeaderboard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeaderboardSync());

      await act(async () => {
        await result.current.fetchWeekly();
      });

      expect(mockLeaderboardSyncStore.fetchLeaderboard).toHaveBeenCalledWith(
        { period: 'weekly' },
        true
      );
    });

    it('should fetch monthly leaderboard', async () => {
      mockLeaderboardSyncStore.fetchLeaderboard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeaderboardSync());

      await act(async () => {
        await result.current.fetchMonthly();
      });

      expect(mockLeaderboardSyncStore.fetchLeaderboard).toHaveBeenCalledWith(
        { period: 'monthly' },
        true
      );
    });

    it('should fetch all-time leaderboard', async () => {
      mockLeaderboardSyncStore.fetchLeaderboard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeaderboardSync());

      await act(async () => {
        await result.current.fetchAllTime();
      });

      expect(mockLeaderboardSyncStore.fetchLeaderboard).toHaveBeenCalledWith(
        { period: 'all-time' },
        true
      );
    });
  });

  describe('submitLocalPreferences', () => {
    it('should return false when disabled', async () => {
      mockLeaderboardSyncStore.settings.enabled = false;

      const { result } = renderHook(() => useLeaderboardSync());

      let success;
      await act(async () => {
        success = await result.current.submitLocalPreferences();
      });

      expect(success).toBe(false);
      expect(mockLeaderboardSyncStore.submitPreferences).not.toHaveBeenCalled();
    });

    it('should return true when no preferences to submit', async () => {
      mockLeaderboardSyncStore.settings.autoSubmitPreferences = true;

      const { result } = renderHook(() => useLeaderboardSync());

      let success;
      await act(async () => {
        success = await result.current.submitLocalPreferences();
      });

      expect(success).toBe(true);
    });
  });

  describe('updateSettings', () => {
    it('should call store updateSettings', () => {
      const { result } = renderHook(() => useLeaderboardSync());

      act(() => {
        result.current.updateSettings({ autoRefresh: true });
      });

      expect(mockLeaderboardSyncStore.updateSettings).toHaveBeenCalledWith({
        autoRefresh: true,
      });
    });
  });

  describe('clearError', () => {
    it('should call store clearError', () => {
      const { result } = renderHook(() => useLeaderboardSync());

      act(() => {
        result.current.clearError();
      });

      expect(mockLeaderboardSyncStore.clearError).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should call store clearCache', () => {
      const { result } = renderHook(() => useLeaderboardSync());

      act(() => {
        result.current.clearCache();
      });

      expect(mockLeaderboardSyncStore.clearCache).toHaveBeenCalled();
    });
  });

  describe('computed states', () => {
    it('should compute canFetch correctly when enabled and online', () => {
      mockLeaderboardSyncStore.settings.enabled = true;
      mockLeaderboardSyncStore.isOnline = true;
      mockLeaderboardSyncStore.isSyncing = false;

      const { result } = renderHook(() => useLeaderboardSync());

      expect(result.current.canFetch).toBe(true);
    });

    it('should compute canFetch as false when disabled', () => {
      mockLeaderboardSyncStore.settings.enabled = false;

      const { result } = renderHook(() => useLeaderboardSync());

      expect(result.current.canFetch).toBe(false);
    });

    it('should compute canFetch as false when offline', () => {
      mockLeaderboardSyncStore.isOnline = false;

      const { result } = renderHook(() => useLeaderboardSync());

      expect(result.current.canFetch).toBe(false);
    });

    it('should compute canFetch as false when syncing', () => {
      mockLeaderboardSyncStore.isSyncing = true;

      const { result } = renderHook(() => useLeaderboardSync());

      expect(result.current.canFetch).toBe(false);
    });
  });
});

describe('useLeaderboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return leaderboard data', () => {
    const { result } = renderHook(() => useLeaderboardData());

    expect(result.current.leaderboard).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetchAt).toBeNull();
  });
});

describe('useLeaderboardSyncSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return settings and actions', () => {
    const { result } = renderHook(() => useLeaderboardSyncSettings());

    expect(result.current.settings).toEqual(mockLeaderboardSyncStore.settings);
    expect(typeof result.current.updateSettings).toBe('function');
    expect(typeof result.current.resetSettings).toBe('function');
  });
});

describe('useLeaderboardOnlineStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return online status and setter', () => {
    const { result } = renderHook(() => useLeaderboardOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(typeof result.current.setOnlineStatus).toBe('function');
  });
});
