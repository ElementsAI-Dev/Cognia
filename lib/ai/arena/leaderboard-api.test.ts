/**
 * Leaderboard API Tests
 */

import {
  LeaderboardApiClient,
  LeaderboardApiError,
  NetworkError,
  RateLimitError,
  getLeaderboardApiClient,
  resetLeaderboardApiClient,
  generateMockLeaderboard,
} from './leaderboard-api';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('LeaderboardApiClient', () => {
  let client: LeaderboardApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new LeaderboardApiClient({
      baseUrl: 'https://api.example.com',
      apiKey: 'test-key',
      timeoutMs: 5000,
    });
  });

  describe('fetchLeaderboard', () => {
    it('should fetch leaderboard data successfully', async () => {
      const mockResponse = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.fetchLeaderboard({ period: 'all-time' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].modelId).toBe('openai:gpt-4o');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/leaderboard'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === 'Retry-After' ? '60' : null),
        },
        json: async () => ({}),
      });

      await expect(client.fetchLeaderboard()).rejects.toThrow(RateLimitError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'));

      await expect(client.fetchLeaderboard()).rejects.toThrow(NetworkError);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error', code: 'SERVER_ERROR' }),
      });

      await expect(client.fetchLeaderboard()).rejects.toThrow(LeaderboardApiError);
    });
  });

  describe('submitPreferences', () => {
    it('should submit preferences successfully', async () => {
      const mockResponse = {
        success: true,
        accepted: 2,
        rejected: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.submitPreferences({
        preferences: [
          {
            winner: 'openai:gpt-4o',
            loser: 'anthropic:claude-3-opus',
            deviceId: 'test-device',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.accepted).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/preferences'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return ok status when healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      });

      const result = await client.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return down status on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.healthCheck();

      expect(result.status).toBe('down');
    });
  });

  describe('cancelRequest', () => {
    it('should cancel pending request', async () => {
      const abortSpy = jest.fn();
      const mockController = {
        abort: abortSpy,
        signal: { aborted: false },
      };

      jest.spyOn(global, 'AbortController').mockImplementation(
        () => mockController as unknown as AbortController
      );

      // Start a request that will hang
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const _fetchPromise = client.fetchLeaderboard({}, 'test-request');

      // Cancel it
      client.cancelRequest('test-request');

      expect(abortSpy).toHaveBeenCalled();

      // Cleanup
      jest.restoreAllMocks();
    });
  });
});

describe('Singleton Pattern', () => {
  beforeEach(() => {
    resetLeaderboardApiClient();
  });

  it('should return same instance on multiple calls', () => {
    const client1 = getLeaderboardApiClient({ baseUrl: 'https://api.example.com' });
    const client2 = getLeaderboardApiClient();

    expect(client1).toBe(client2);
  });

  it('should update config on existing instance', () => {
    const client1 = getLeaderboardApiClient({ baseUrl: 'https://api1.example.com' });
    const client2 = getLeaderboardApiClient({ baseUrl: 'https://api2.example.com' });

    expect(client1).toBe(client2);
  });
});

describe('generateMockLeaderboard', () => {
  it('should generate mock leaderboard data', () => {
    const result = generateMockLeaderboard();

    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.pagination).toBeDefined();
    expect(result.meta).toBeDefined();
  });

  it('should filter by provider', () => {
    const result = generateMockLeaderboard({ provider: 'openai' });

    expect(result.data.every((m) => m.provider === 'openai')).toBe(true);
  });

  it('should filter by min battles', () => {
    const result = generateMockLeaderboard({ minBattles: 500 });

    expect(result.data.every((m) => m.totalBattles >= 500)).toBe(true);
  });

  it('should handle pagination', () => {
    const result = generateMockLeaderboard({ page: 1, pageSize: 3 });

    expect(result.data.length).toBeLessThanOrEqual(3);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pageSize).toBe(3);
  });

  it('should sort by rating descending by default', () => {
    const result = generateMockLeaderboard();

    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i - 1].rating).toBeGreaterThanOrEqual(result.data[i].rating);
    }
  });

  it('should sort ascending when specified', () => {
    const result = generateMockLeaderboard({ sortDirection: 'asc' });

    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i - 1].rating).toBeLessThanOrEqual(result.data[i].rating);
    }
  });
});
