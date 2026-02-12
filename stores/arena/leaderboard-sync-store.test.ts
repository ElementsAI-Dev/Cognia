/**
 * Leaderboard Sync Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import {
  useLeaderboardSyncStore,
  selectLeaderboardSyncStatus,
  selectLeaderboard,
  selectLeaderboardSyncSettings,
  selectIsLeaderboardSyncing,
  selectHasPendingSubmissions,
  selectIsOnline,
} from './leaderboard-sync-store';
import { DEFAULT_LEADERBOARD_SYNC_SETTINGS } from '@/types/arena';

// Mock the API client
jest.mock('@/lib/ai/arena/leaderboard-api', () => ({
  getLeaderboardApiClient: jest.fn(() => ({
    fetchLeaderboard: jest.fn(),
    submitPreferences: jest.fn(),
    healthCheck: jest.fn(),
    cancelRequest: jest.fn(),
  })),
  LeaderboardApiError: class LeaderboardApiError extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  },
  RateLimitError: class RateLimitError extends Error {
    constructor(public retryAfter: number) {
      super('Rate limited');
    }
  },
  generateMockLeaderboard: jest.fn(() => ({
    success: true,
    data: [
      {
        id: 'openai:gpt-4o',
        modelId: 'openai:gpt-4o',
        provider: 'openai',
        model: 'gpt-4o',
        rating: 1650,
        totalBattles: 100,
        wins: 60,
        losses: 35,
        ties: 5,
        winRate: 0.6,
        rank: 1,
        updatedAt: new Date().toISOString(),
        period: 'all-time',
      },
    ],
    pagination: {
      page: 1,
      pageSize: 50,
      totalItems: 1,
      totalPages: 1,
      hasMore: false,
    },
    meta: {
      period: 'all-time',
      updatedAt: new Date().toISOString(),
      cacheTTL: 300,
    },
  })),
}));

describe('useLeaderboardSyncStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useLeaderboardSyncStore());
    act(() => {
      result.current.resetSettings();
      result.current.clearCache();
      result.current.clearPendingSubmissions();
      result.current.clearError();
      result.current.setOnlineStatus(true);
    });
    // Reset leaderboard data to empty
    act(() => {
      useLeaderboardSyncStore.setState({ leaderboard: [], lastFetchAt: null, status: 'idle' });
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      expect(result.current.status).toBe('idle');
      expect(result.current.leaderboard).toEqual([]);
      expect(result.current.settings).toEqual(DEFAULT_LEADERBOARD_SYNC_SETTINGS);
      expect(result.current.error).toBeNull();
      expect(result.current.pendingSubmissions).toEqual([]);
    });
  });

  describe('Settings Management', () => {
    it('should update settings', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.updateSettings({
          enabled: true,
          apiBaseUrl: 'https://api.example.com',
        });
      });

      expect(result.current.settings.enabled).toBe(true);
      expect(result.current.settings.apiBaseUrl).toBe('https://api.example.com');
    });

    it('should reset settings to defaults', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.updateSettings({
          enabled: true,
          apiBaseUrl: 'https://api.example.com',
        });
      });

      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings).toEqual(DEFAULT_LEADERBOARD_SYNC_SETTINGS);
    });
  });

  describe('Fetch Leaderboard', () => {
    it('should not fetch when disabled', async () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      // Ensure sync is disabled
      act(() => {
        result.current.updateSettings({ enabled: false });
      });

      let response;
      await act(async () => {
        response = await result.current.fetchLeaderboard();
      });

      expect(response).toBeNull();
      expect(result.current.status).toBe('idle');
    });

    it('should fetch and update leaderboard when enabled', async () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.updateSettings({ enabled: true });
      });

      await act(async () => {
        await result.current.fetchLeaderboard();
      });

      expect(result.current.status).toBe('success');
      expect(result.current.leaderboard.length).toBeGreaterThan(0);
      expect(result.current.lastFetchAt).not.toBeNull();
    });

    it('should use cache for repeated requests', async () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.updateSettings({ enabled: true });
      });

      // First fetch
      await act(async () => {
        await result.current.fetchLeaderboard({ period: 'all-time' });
      });

      const firstFetchAt = result.current.lastFetchAt;

      // Second fetch (should use cache)
      await act(async () => {
        await result.current.fetchLeaderboard({ period: 'all-time' });
      });

      // lastFetchAt should not change if cache was used
      expect(result.current.lastFetchAt).toBe(firstFetchAt);
    });

    it('should force refresh when specified', async () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.updateSettings({ enabled: true });
      });

      // First fetch
      await act(async () => {
        await result.current.fetchLeaderboard({ period: 'all-time' });
      });

      const firstFetchAt = result.current.lastFetchAt;

      // Wait a bit
      await new Promise((r) => setTimeout(r, 10));

      // Force refresh
      await act(async () => {
        await result.current.fetchLeaderboard({ period: 'all-time' }, true);
      });

      expect(result.current.lastFetchAt).not.toBe(firstFetchAt);
    });
  });

  describe('Online/Offline Status', () => {
    it('should track online status', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.setOnlineStatus(false);
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.status).toBe('offline');

      act(() => {
        result.current.setOnlineStatus(true);
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.status).toBe('idle');
    });

    it('should not fetch when offline', async () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.updateSettings({ enabled: true });
        result.current.setOnlineStatus(false);
      });

      let response;
      await act(async () => {
        response = await result.current.fetchLeaderboard();
      });

      expect(response).toBeNull();
      expect(result.current.error?.code).toBe('OFFLINE');
    });
  });

  describe('Pending Submissions', () => {
    it('should queue submissions when offline', async () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.updateSettings({
          enabled: true,
          autoSubmitPreferences: true,
        });
        result.current.setOnlineStatus(false);
      });

      await act(async () => {
        await result.current.submitPreferences([
          {
            winner: 'openai:gpt-4o',
            loser: 'anthropic:claude-3-opus',
            deviceId: 'test',
            timestamp: new Date().toISOString(),
          },
        ]);
      });

      expect(result.current.pendingSubmissions.length).toBe(1);
    });

    it('should clear pending submissions', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.updateSettings({
          enabled: true,
          autoSubmitPreferences: true,
        });
        result.current.setOnlineStatus(false);
      });

      // Add a pending submission via direct state manipulation for testing
      act(() => {
        result.current.submitPreferences([
          {
            winner: 'openai:gpt-4o',
            loser: 'anthropic:claude-3-opus',
            deviceId: 'test',
            timestamp: new Date().toISOString(),
          },
        ]);
      });

      act(() => {
        result.current.clearPendingSubmissions();
      });

      expect(result.current.pendingSubmissions.length).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      act(() => {
        result.current.updateSettings({ enabled: true });
      });

      const fetchParams = {
        period: 'all-time' as const,
        minBattles: result.current.settings.minBattlesThreshold,
      };

      await act(async () => {
        await result.current.fetchLeaderboard(fetchParams);
      });

      // Verify cache has data (use same params including minBattles for matching key)
      expect(result.current.getCachedData(fetchParams)).not.toBeNull();

      act(() => {
        result.current.clearCache();
      });

      expect(result.current.getCachedData(fetchParams)).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());

      // Manually set an error state for testing
      act(() => {
        result.current.updateSettings({ enabled: true });
        result.current.setOnlineStatus(false);
      });

      // Trigger an error by trying to fetch while offline
      act(() => {
        result.current.fetchLeaderboard();
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
    });
  });

  describe('Selectors', () => {
    it('should select status correctly', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());
      expect(selectLeaderboardSyncStatus(result.current)).toBe('idle');
    });

    it('should select leaderboard correctly', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());
      expect(selectLeaderboard(result.current)).toEqual([]);
    });

    it('should select settings correctly', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());
      expect(selectLeaderboardSyncSettings(result.current)).toEqual(
        DEFAULT_LEADERBOARD_SYNC_SETTINGS
      );
    });

    it('should select isSyncing correctly', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());
      expect(selectIsLeaderboardSyncing(result.current)).toBe(false);
    });

    it('should select hasPendingSubmissions correctly', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());
      expect(selectHasPendingSubmissions(result.current)).toBe(false);
    });

    it('should select isOnline correctly', () => {
      const { result } = renderHook(() => useLeaderboardSyncStore());
      expect(selectIsOnline(result.current)).toBe(true);
    });
  });
});
