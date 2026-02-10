/**
 * Arena Leaderboard API
 * Network layer for fetching and submitting leaderboard data
 */

import type {
  LeaderboardFetchParams,
  LeaderboardFetchResponse,
  PreferenceSubmitRequest,
  PreferenceSubmitResponse,
  HeadToHeadFetchResponse,
  ModelStatsRequest,
  ModelStatsResponse,
  LeaderboardSyncSettings,
  RemoteModelRating,
  LeaderboardPeriod,
} from '@/types/arena';
import { proxyFetch } from '@/lib/network/proxy-fetch';

// ============================================
// API Error Classes
// ============================================

export class LeaderboardApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'LeaderboardApiError';
  }
}

export class NetworkError extends LeaderboardApiError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends LeaderboardApiError {
  constructor(message: string = 'Request timed out') {
    super(message, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends LeaderboardApiError {
  constructor(retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds`, 'RATE_LIMITED', 429, retryAfter);
    this.name = 'RateLimitError';
  }
}

// ============================================
// API Client
// ============================================

export interface LeaderboardApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
}

/**
 * Leaderboard API Client
 * Handles all HTTP communication with the leaderboard server
 */
export class LeaderboardApiClient {
  private config: LeaderboardApiClientConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: LeaderboardApiClientConfig) {
    this.config = config;
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<LeaderboardApiClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create headers for API requests
   */
  private createHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  /**
   * Execute a fetch request with timeout and error handling
   */
  private async fetchWithTimeout<T>(
    endpoint: string,
    options: RequestInit = {},
    requestId?: string
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    if (requestId) {
      // Cancel previous request with same ID
      this.abortControllers.get(requestId)?.abort();
      this.abortControllers.set(requestId, controller);
    }

    try {
      const response = await proxyFetch(url, {
        ...options,
        headers: { ...this.createHeaders(), ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw new RateLimitError(retryAfter);
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new LeaderboardApiError(
          errorBody.message || `HTTP ${response.status}`,
          errorBody.code || 'HTTP_ERROR',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof LeaderboardApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError();
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown network error');
    } finally {
      if (requestId) {
        this.abortControllers.delete(requestId);
      }
    }
  }

  /**
   * Cancel a pending request by ID
   */
  cancelRequest(requestId: string): void {
    this.abortControllers.get(requestId)?.abort();
    this.abortControllers.delete(requestId);
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  // ============================================
  // API Methods
  // ============================================

  /**
   * Fetch leaderboard data
   */
  async fetchLeaderboard(
    params: LeaderboardFetchParams = {},
    requestId?: string
  ): Promise<LeaderboardFetchResponse> {
    const queryParams = new URLSearchParams();

    if (params.period) queryParams.set('period', params.period);
    if (params.category) queryParams.set('category', params.category);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.set('sortDirection', params.sortDirection);
    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.provider) queryParams.set('provider', params.provider);
    if (params.minBattles) queryParams.set('minBattles', String(params.minBattles));

    const endpoint = `/leaderboard?${queryParams.toString()}`;

    return this.fetchWithTimeout<LeaderboardFetchResponse>(
      endpoint,
      { method: 'GET' },
      requestId || 'leaderboard'
    );
  }

  /**
   * Submit preferences to the server
   */
  async submitPreferences(
    request: PreferenceSubmitRequest,
    requestId?: string
  ): Promise<PreferenceSubmitResponse> {
    return this.fetchWithTimeout<PreferenceSubmitResponse>(
      '/preferences',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      requestId || 'submit-preferences'
    );
  }

  /**
   * Fetch head-to-head records
   */
  async fetchHeadToHead(
    period: LeaderboardPeriod = 'all-time',
    requestId?: string
  ): Promise<HeadToHeadFetchResponse> {
    return this.fetchWithTimeout<HeadToHeadFetchResponse>(
      `/head-to-head?period=${period}`,
      { method: 'GET' },
      requestId || 'head-to-head'
    );
  }

  /**
   * Fetch statistics for specific models
   */
  async fetchModelStats(
    request: ModelStatsRequest,
    requestId?: string
  ): Promise<ModelStatsResponse> {
    const queryParams = new URLSearchParams();
    queryParams.set('modelIds', request.modelIds.join(','));
    if (request.period) queryParams.set('period', request.period);

    return this.fetchWithTimeout<ModelStatsResponse>(
      `/models/stats?${queryParams.toString()}`,
      { method: 'GET' },
      requestId || 'model-stats'
    );
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: 'ok' | 'degraded' | 'down'; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.fetchWithTimeout<{ status: string }>(
        '/health',
        { method: 'GET' },
        'health-check'
      );
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (error) {
      if (error instanceof TimeoutError) {
        return { status: 'degraded', latencyMs: this.config.timeoutMs };
      }
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let apiClientInstance: LeaderboardApiClient | null = null;

/**
 * Get or create the API client singleton
 */
export function getLeaderboardApiClient(
  config?: Partial<LeaderboardApiClientConfig>
): LeaderboardApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new LeaderboardApiClient({
      baseUrl: config?.baseUrl || '',
      apiKey: config?.apiKey,
      timeoutMs: config?.timeoutMs || 30000,
    });
  } else if (config) {
    apiClientInstance.updateConfig(config);
  }
  return apiClientInstance;
}

/**
 * Reset the API client (useful for testing)
 */
export function resetLeaderboardApiClient(): void {
  if (apiClientInstance) {
    apiClientInstance.cancelAllRequests();
    apiClientInstance = null;
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Quick fetch leaderboard with default settings
 */
export async function fetchLeaderboard(
  params: LeaderboardFetchParams = {},
  settings?: LeaderboardSyncSettings
): Promise<LeaderboardFetchResponse> {
  const client = getLeaderboardApiClient({
    baseUrl: settings?.apiBaseUrl,
    apiKey: settings?.apiKey,
    timeoutMs: settings?.requestTimeoutMs,
  });
  return client.fetchLeaderboard(params);
}

/**
 * Quick submit preferences
 */
export async function submitPreferences(
  request: PreferenceSubmitRequest,
  settings?: LeaderboardSyncSettings
): Promise<PreferenceSubmitResponse> {
  const client = getLeaderboardApiClient({
    baseUrl: settings?.apiBaseUrl,
    apiKey: settings?.apiKey,
    timeoutMs: settings?.requestTimeoutMs,
  });
  return client.submitPreferences(request);
}

// ============================================
// Mock Data Generator (for development/testing)
// ============================================

/**
 * Generate mock leaderboard data for development
 */
export function generateMockLeaderboard(
  params: LeaderboardFetchParams = {}
): LeaderboardFetchResponse {
  const mockModels: Array<{
    provider: string;
    model: string;
    rating: number;
    battles: number;
  }> = [
    { provider: 'openai', model: 'gpt-4o', rating: 1650, battles: 1200 },
    { provider: 'anthropic', model: 'claude-sonnet-4-20250514', rating: 1640, battles: 1100 },
    { provider: 'google', model: 'gemini-1.5-pro', rating: 1590, battles: 800 },
    { provider: 'openai', model: 'gpt-4o-mini', rating: 1520, battles: 900 },
    { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', rating: 1480, battles: 600 },
    { provider: 'deepseek', model: 'deepseek-chat', rating: 1550, battles: 500 },
    { provider: 'groq', model: 'llama-3.3-70b-versatile', rating: 1460, battles: 400 },
    { provider: 'openai', model: 'o1', rating: 1700, battles: 300 },
    { provider: 'deepseek', model: 'deepseek-reasoner', rating: 1680, battles: 250 },
    { provider: 'anthropic', model: 'claude-opus-4-20250514', rating: 1660, battles: 200 },
  ];

  // Filter by provider if specified
  let filtered = mockModels;
  if (params.provider) {
    filtered = filtered.filter((m) => m.provider === params.provider);
  }

  // Filter by min battles
  if (params.minBattles) {
    filtered = filtered.filter((m) => m.battles >= params.minBattles!);
  }

  // Sort
  const sortField = params.sortBy || 'rating';
  const sortDir = params.sortDirection === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    if (sortField === 'rating') return (b.rating - a.rating) * sortDir;
    if (sortField === 'totalBattles') return (b.battles - a.battles) * sortDir;
    return 0;
  });

  // Pagination
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  const data: RemoteModelRating[] = paginated.map((m, i) => ({
    id: `${m.provider}:${m.model}`,
    modelId: `${m.provider}:${m.model}`,
    provider: m.provider as RemoteModelRating['provider'],
    model: m.model,
    rating: m.rating,
    btScore: (m.rating - 1500) / 100,
    ci95Lower: m.rating - 30,
    ci95Upper: m.rating + 30,
    totalBattles: m.battles,
    wins: Math.floor(m.battles * 0.55),
    losses: Math.floor(m.battles * 0.40),
    ties: Math.floor(m.battles * 0.05),
    winRate: 0.55,
    stabilityScore: 0.8,
    rank: start + i + 1,
    rankChange: Math.floor(Math.random() * 5) - 2,
    updatedAt: new Date().toISOString(),
    period: params.period || 'all-time',
  }));

  return {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize),
      hasMore: start + pageSize < filtered.length,
    },
    meta: {
      period: params.period || 'all-time',
      category: params.category,
      updatedAt: new Date().toISOString(),
      cacheTTL: 300,
    },
  };
}
