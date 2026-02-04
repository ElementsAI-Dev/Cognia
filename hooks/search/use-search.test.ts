/**
 * Tests for useSearch hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSearch } from './use-search';

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: {
    search: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  },
}));

// Mock dependencies
jest.mock('@/stores/settings/settings-store', () => ({
  useSettingsStore: jest.fn(() => ({
    searchProviders: {
      tavily: { providerId: 'tavily', apiKey: 'test-key', enabled: true, priority: 1 },
      brave: { providerId: 'brave', apiKey: '', enabled: false, priority: 2 },
    },
    searchFallbackEnabled: true,
  })),
}));

// Mock search cache
jest.mock('@/lib/search/search-cache', () => ({
  getSearchCache: jest.fn(() => ({
    get: jest.fn(() => null),
    set: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0, hitRate: 0, maxSize: 500 })),
  })),
}));

// Mock type router
jest.mock('@/lib/search/search-type-router', () => ({
  autoRouteSearch: jest.fn(),
  providerSupportsType: jest.fn(() => false),
}));

const mockSearch = jest.fn();
const mockInitialize = jest.fn();
const mockGetMetrics = jest.fn();
const mockResetMetrics = jest.fn();
const mockShutdown = jest.fn();

jest.mock('@/lib/search/search-provider-manager', () => ({
  getSearchProviderManager: jest.fn(() => ({
    search: mockSearch,
    initialize: mockInitialize,
    getMetrics: mockGetMetrics,
    resetMetrics: mockResetMetrics,
    shutdown: mockShutdown,
  })),
  initializeSearchProviderManager: jest.fn(() => ({
    search: mockSearch,
    initialize: mockInitialize,
    getMetrics: mockGetMetrics,
    resetMetrics: mockResetMetrics,
    shutdown: mockShutdown,
  })),
}));

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // SearchSandboxExecutionResult wraps SearchResponse in 'response' property
    mockSearch.mockResolvedValue({
      response: {
        provider: 'tavily',
        query: 'test query',
        results: [{ title: 'Test', url: 'https://example.com', content: 'Test content', score: 0.9 }],
        responseTime: 100,
      },
      providerId: 'tavily',
      latencyMs: 100,
    });
  });

  describe('initialization', () => {
    it('should auto-initialize by default', () => {
      const { result } = renderHook(() => useSearch());
      expect(result.current.isInitialized).toBe(true);
    });

    it('should not auto-initialize when autoInitialize is false', () => {
      const { result } = renderHook(() => useSearch({ autoInitialize: false }));
      expect(result.current.isInitialized).toBe(false);
    });

    it('should initialize manually when initialize is called', () => {
      const { result } = renderHook(() => useSearch({ autoInitialize: false }));

      act(() => {
        result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
    });
  });

  describe('search', () => {
    it('should perform search and update state', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.search('test query');
      });

      expect(mockSearch).toHaveBeenCalledWith('test query', undefined);
      expect(result.current.lastResponse).toBeDefined();
      expect(result.current.lastResponse?.query).toBe('test query');
    });

    it('should set isSearching to false after search completes', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.search('test query');
      });

      expect(result.current.isSearching).toBe(false);
    });

    it('should handle search errors', async () => {
      mockSearch.mockRejectedValue(new Error('Search failed'));

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        try {
          await result.current.search('test query');
        } catch {
          // Expected error
        }
      });

      expect(result.current.lastError).toBeDefined();
      expect(result.current.lastError?.message).toBe('Search failed');
    });

    it('should call onSearchStart callback', async () => {
      const onSearchStart = jest.fn();
      const { result } = renderHook(() => useSearch({ onSearchStart }));

      await act(async () => {
        await result.current.search('test query');
      });

      expect(onSearchStart).toHaveBeenCalledWith('test query');
    });

    it('should call onSearchComplete callback', async () => {
      const onSearchComplete = jest.fn();
      const { result } = renderHook(() => useSearch({ onSearchComplete }));

      await act(async () => {
        await result.current.search('test query');
      });

      expect(onSearchComplete).toHaveBeenCalled();
    });

    it('should call onSearchError callback on error', async () => {
      mockSearch.mockRejectedValue(new Error('Search failed'));
      const onSearchError = jest.fn();
      const { result } = renderHook(() => useSearch({ onSearchError }));

      await act(async () => {
        try {
          await result.current.search('test query');
        } catch {
          // Expected error
        }
      });

      expect(onSearchError).toHaveBeenCalled();
    });
  });

  describe('searchByType', () => {
    it('should call search with searchType option', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.searchByType('test query', 'news');
      });

      expect(mockSearch).toHaveBeenCalledWith(
        'test query',
        expect.objectContaining({ searchType: 'news' })
      );
    });
  });

  describe('metrics', () => {
    it('should get provider metrics', () => {
      // Mock returns SearchProviderMetrics structure
      mockGetMetrics.mockReturnValue({
        providerId: 'tavily',
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageLatency: 200,
        lastLatency: 150,
        lastRequestTime: Date.now(),
        totalCost: 0,
        isHealthy: true,
        isAvailable: true,
      });

      const { result } = renderHook(() => useSearch());
      const metrics = result.current.getProviderMetrics('tavily');

      // Hook calculates successRate from successfulRequests/totalRequests
      expect(metrics).toEqual({
        successRate: 0.95,
        averageLatency: 200,
        totalRequests: 100,
      });
    });

    it('should reset provider metrics', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.resetProviderMetrics();
      });

      expect(mockResetMetrics).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should clear error when clearError is called', async () => {
      mockSearch.mockRejectedValue(new Error('Search failed'));

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        try {
          await result.current.search('test query');
        } catch {
          // Expected error
        }
      });

      expect(result.current.lastError).toBeDefined();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.lastError).toBeNull();
    });
  });
});
