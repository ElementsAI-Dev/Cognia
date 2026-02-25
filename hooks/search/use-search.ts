/**
 * Search Hook
 * Unified search interface integrating SearchProviderManager with caching and type routing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings/settings-store';
import {
  getSearchProviderManager,
  initializeSearchProviderManager,
  type SearchProviderManagerConfig,
} from '@/lib/search/search-provider-manager';
import { getSearchCache } from '@/lib/search/search-cache';
import { autoRouteSearch, providerSupportsType } from '@/lib/search/search-type-router';
import type {
  SearchOptions,
  SearchResponse,
  SearchProviderType,
  SearchType,
} from '@/types/search';

export interface UseSearchOptions {
  autoInitialize?: boolean;
  managerConfig?: Partial<SearchProviderManagerConfig>;
  enableCache?: boolean;
  useTypeRouter?: boolean;
  onSearchStart?: (query: string) => void;
  onSearchComplete?: (response: SearchResponse) => void;
  onSearchError?: (error: Error) => void;
}

export interface UseSearchReturn {
  search: (query: string, options?: SearchOptions) => Promise<SearchResponse>;
  searchByType: (
    query: string,
    type: SearchType,
    options?: SearchOptions
  ) => Promise<SearchResponse>;
  isSearching: boolean;
  lastResponse: SearchResponse | null;
  lastError: Error | null;
  isInitialized: boolean;
  initialize: () => void;
  getProviderMetrics: (providerId: SearchProviderType) => {
    successRate: number;
    averageLatency: number;
    totalRequests: number;
  } | null;
  resetProviderMetrics: () => void;
  clearError: () => void;
  clearCache: () => void;
  getCacheStats: () => { hits: number; misses: number; size: number; hitRate: number };
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    autoInitialize = true,
    managerConfig,
    enableCache = true,
    useTypeRouter = true,
    onSearchStart,
    onSearchComplete,
    onSearchError,
  } = options;

  const cache = getSearchCache();

  const [isSearching, setIsSearching] = useState(false);
  const [lastResponse, setLastResponse] = useState<SearchResponse | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const managerRef = useRef<ReturnType<typeof getSearchProviderManager> | null>(null);

  const {
    searchProviders,
    searchFallbackEnabled,
  } = useSettingsStore();

  const initialize = useCallback(() => {
    if (isInitialized) return;

    try {
      managerRef.current = initializeSearchProviderManager(searchProviders, {
        strategy: 'priority',
        enableFailover: searchFallbackEnabled,
        ...managerConfig,
      });
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize SearchProviderManager:', error);
      setLastError(error instanceof Error ? error : new Error('Initialization failed'));
    }
  }, [searchProviders, searchFallbackEnabled, managerConfig, isInitialized]);

  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize();
    }
  }, [autoInitialize, isInitialized, initialize]);

  useEffect(() => {
    if (isInitialized && managerRef.current) {
      managerRef.current.initialize(searchProviders);
    }
  }, [searchProviders, isInitialized]);

  const search = useCallback(
    async (query: string, searchOptions?: SearchOptions): Promise<SearchResponse> => {
      if (!managerRef.current) {
        initialize();
        if (!managerRef.current) {
          throw new Error('SearchProviderManager not initialized');
        }
      }

      const searchType = searchOptions?.searchType || 'general';
      const fullOptions: SearchOptions = {
        ...(searchOptions || {}),
        searchType,
      };

      // Check cache first if enabled
      if (enableCache) {
        const cachedResponse = cache.get(query, undefined, fullOptions);
        if (cachedResponse) {
          setLastResponse(cachedResponse);
          onSearchComplete?.(cachedResponse);
          return cachedResponse;
        }
      }

      setIsSearching(true);
      setLastError(null);
      onSearchStart?.(query);

      try {
        let response: SearchResponse;

        // Use type router for specialized search types if enabled
        if (useTypeRouter && searchType !== 'general') {
          // Check if any enabled provider supports this search type
          const supportingProviders = Object.entries(searchProviders)
            .filter(([, settings]) => settings.enabled && settings.apiKey)
            .filter(([providerId]) => providerSupportsType(providerId as SearchProviderType, searchType));

          if (supportingProviders.length > 0) {
            response = await autoRouteSearch(query, searchType, searchProviders, searchOptions);
          } else {
            // Fallback to manager search
            const result = await managerRef.current.search(query, searchOptions);
            response = result.response;
          }
        } else {
          const result = await managerRef.current.search(query, searchOptions);
          response = result.response;
        }

        // Cache the response if enabled
        if (enableCache) {
          // Cache under provider = auto to ensure cache hits even when provider varies.
          cache.set(query, response, undefined, fullOptions);
        }

        setLastResponse(response);
        onSearchComplete?.(response);
        return response;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Search failed');
        setLastError(err);
        onSearchError?.(err);
        throw err;
      } finally {
        setIsSearching(false);
      }
    },
    [initialize, onSearchStart, onSearchComplete, onSearchError, enableCache, useTypeRouter, cache, searchProviders]
  );

  const searchByType = useCallback(
    async (
      query: string,
      type: SearchType,
      searchOptions?: SearchOptions
    ): Promise<SearchResponse> => {
      return search(query, { ...searchOptions, searchType: type });
    },
    [search]
  );

  const getProviderMetrics = useCallback(
    (providerId: SearchProviderType) => {
      if (!managerRef.current) return null;
      const metrics = managerRef.current.getMetrics(providerId);
      if (!metrics) return null;
      const successRate = metrics.totalRequests > 0
        ? metrics.successfulRequests / metrics.totalRequests
        : 0;
      return {
        successRate,
        averageLatency: metrics.averageLatency,
        totalRequests: metrics.totalRequests,
      };
    },
    []
  );

  const resetProviderMetrics = useCallback(() => {
    managerRef.current?.resetMetrics();
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  const getCacheStats = useCallback(() => {
    return cache.getStats();
  }, [cache]);

  return {
    search,
    searchByType,
    isSearching,
    lastResponse,
    lastError,
    isInitialized,
    initialize,
    getProviderMetrics,
    resetProviderMetrics,
    clearError,
    clearCache,
    getCacheStats,
  };
}
