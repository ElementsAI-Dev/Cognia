/**
 * Marketplace Hook - Fetches plugin data from the marketplace API.
 *
 * Uses canonical discovery and operation state from the marketplace store,
 * with explicit fallback-mode handling and typed error propagation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  buildExtensionCatalogEntry,
  getPluginMarketplace,
  type PluginSearchOptions,
  type PluginRegistryEntry,
  type PluginVersionInfo,
  type MarketplaceErrorCategory,
  type MarketplaceOperationError,
  type PluginInstallResult,
} from '@/lib/plugin';
import type { MarketplacePlugin, InstallProgressInfo } from '@/components/plugin/marketplace/components/marketplace-types';
import { MOCK_PLUGINS } from '@/components/plugin/marketplace/components/marketplace-constants';
import { usePluginStore } from '@/stores/plugin';
import { usePluginMarketplaceStore } from '@/stores/plugin/plugin-marketplace-store';
import { toMarketplacePluginFromCatalogEntry } from './marketplace-catalog';

// =============================================================================
// Types
// =============================================================================

type MarketplaceOperation = 'install' | 'update';

interface NormalizedOperationError {
  category: MarketplaceErrorCategory;
  message: string;
  retryable: boolean;
}

interface UseMarketplaceOptions {
  useMockData?: boolean;
  initialSearchOptions?: PluginSearchOptions;
}

interface UseMarketplaceResult {
  plugins: MarketplacePlugin[];
  featuredPlugins: MarketplacePlugin[];
  trendingPlugins: MarketplacePlugin[];
  isLoading: boolean;
  error: string | null;
  errorCategory?: MarketplaceErrorCategory;
  isUsingMockData: boolean;

  // Canonical discovery state
  query: string;
  sortBy: 'popular' | 'rating' | 'recent' | 'downloads';
  categoryFilter: string;
  quickFilter: 'all' | 'verified' | 'free' | 'new' | 'popular';
  sourceFilter: 'all' | 'marketplace' | 'builtin' | 'local' | 'git' | 'dev';
  compatibilityFilter: 'all' | 'compatible' | 'warning' | 'blocked';
  page: number;
  setQuery: (query: string) => void;
  setSortBy: (sortBy: 'popular' | 'rating' | 'recent' | 'downloads') => void;
  setCategoryFilter: (value: string) => void;
  setQuickFilter: (value: 'all' | 'verified' | 'free' | 'new' | 'popular') => void;
  setSourceFilter: (value: 'all' | 'marketplace' | 'builtin' | 'local' | 'git' | 'dev') => void;
  setCompatibilityFilter: (value: 'all' | 'compatible' | 'warning' | 'blocked') => void;
  setPage: (page: number) => void;
  resetDiscovery: () => void;
  search: (options: PluginSearchOptions) => Promise<void>;
  refresh: () => Promise<void>;

  // Data source mode
  sourceMode: 'remote' | 'fallback-mock';
  sourceErrorCategory?: MarketplaceErrorCategory;
  sourceErrorMessage?: string;

  // Install / update
  installPlugin: (pluginId: string, version?: string) => Promise<PluginInstallResult>;
  updatePlugin: (pluginId: string, version?: string) => Promise<PluginInstallResult>;
  retryPluginOperation: (
    pluginId: string,
    operation: MarketplaceOperation,
    version?: string
  ) => Promise<PluginInstallResult>;
  getInstallProgress: (pluginId: string) => InstallProgressInfo | undefined;
  isInstalling: (pluginId: string) => boolean;
  getOperationStage: (pluginId: string) => 'idle' | 'installing' | 'updating' | 'installed' | 'error';
  getOperationError: (pluginId: string) => { category?: MarketplaceErrorCategory; message?: string };

  // Versions
  getVersions: (pluginId: string) => Promise<PluginVersionInfo[]>;

  // Favorites
  toggleFavorite: (pluginId: string) => void;
  isFavorite: (pluginId: string) => boolean;
  favoriteCount: number;

  // Categories
  categories: { id: string; name: string; count: number }[];

  // Updates & cache
  checkForUpdates: () => Promise<{ id: string; currentVersion: string; latestVersion: string }[]>;
  clearCache: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function mapSortForApi(sortBy: 'popular' | 'rating' | 'recent' | 'downloads'): PluginSearchOptions['sortBy'] {
  if (sortBy === 'recent') return 'updated';
  if (sortBy === 'popular' || sortBy === 'downloads') return 'downloads';
  return 'rating';
}

function normalizeError(error: unknown, fallback = 'Operation failed'): NormalizedOperationError {
  if (
    typeof error === 'object' &&
    error != null &&
    'category' in error &&
    'message' in error &&
    'retryable' in error
  ) {
    const typed = error as MarketplaceOperationError;
    return {
      category: typed.category,
      message: typed.message,
      retryable: typed.retryable,
    };
  }

  const message = error instanceof Error ? error.message : String(error || fallback);
  const lower = message.toLowerCase();
  let category: MarketplaceErrorCategory = 'unknown';
  if (lower.includes('auth') || lower.includes('unauthorized') || lower.includes('forbidden')) {
    category = 'auth';
  } else if (lower.includes('429') || lower.includes('rate')) {
    category = 'rate_limit';
  } else if (
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('econn') ||
    lower.includes('failed to fetch')
  ) {
    category = 'network';
  } else if (lower.includes('unsupported') || lower.includes('desktop app')) {
    category = 'unsupported_env';
  } else if (lower.includes('invalid') || lower.includes('not found') || lower.includes('validation')) {
    category = 'validation';
  } else if (lower.includes('conflict') || lower.includes('already exists')) {
    category = 'install_conflict';
  }

  return {
    category,
    message,
    retryable: category === 'network' || category === 'rate_limit',
  };
}

// =============================================================================
// Hook
// =============================================================================

export function useMarketplace(options: UseMarketplaceOptions = {}): UseMarketplaceResult {
  const { useMockData = false, initialSearchOptions } = options;
  const installedPlugins = usePluginStore((state) => state.plugins);
  const scanPlugins = usePluginStore((state) => state.scanPlugins);
  const {
    toggleFavorite,
    isFavorite,
    favorites,
    setInstallProgress,
    clearInstallProgress,
    installProgress,
    addSearchHistory,
    discoveryState,
    setDiscoveryQuery,
    setDiscoverySort,
    setDiscoveryCategoryFilter,
    setDiscoveryQuickFilter,
    setDiscoverySourceFilter,
    setDiscoveryCompatibilityFilter,
    setDiscoveryPage,
    setDiscoveryState,
    resetDiscoveryState,
    sourceState,
    setRemoteMode,
    setFallbackMode,
    recordDiagnostic,
    operationState,
    startPluginOperation,
    retryPluginOperation: beginRetryPluginOperation,
    completePluginOperation,
    failPluginOperation,
  } = usePluginMarketplaceStore();

  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<MarketplaceErrorCategory | undefined>(undefined);
  const [isUsingMockData, setIsUsingMockData] = useState(useMockData);

  const installedPluginIds = useMemo(
    () => new Set(Object.keys(installedPlugins)),
    [installedPlugins]
  );

  const toCatalogPlugin = useCallback(
    (entry: PluginRegistryEntry): MarketplacePlugin => {
      const installedPlugin = installedPlugins[entry.id];
      const catalogEntry = buildExtensionCatalogEntry({
        registryEntry: {
          ...entry,
          updatedAt: toDate(entry.updatedAt),
        },
        installedPlugin,
      });
      return toMarketplacePluginFromCatalogEntry(catalogEntry, operationState[entry.id]);
    },
    [installedPlugins, operationState]
  );

  const addInstalledStatus = useCallback(
    (plugin: MarketplacePlugin): MarketplacePlugin => ({
      ...plugin,
      installed: Boolean(installedPlugins[plugin.id]),
    }),
    [installedPlugins]
  );

  const resolveSearchOptions = useCallback((): PluginSearchOptions => {
    const latestState = usePluginMarketplaceStore.getState().discoveryState;
    const query = latestState.query.trim();
    const optionsFromState: PluginSearchOptions = {
      query: query.length > 0 ? query : undefined,
      sortBy: mapSortForApi(latestState.sortBy),
      sortOrder: 'desc',
      limit: latestState.pageSize,
      offset: Math.max(0, latestState.page - 1) * latestState.pageSize,
    };

    if (latestState.categoryFilter !== 'all') {
      optionsFromState.category = latestState.categoryFilter;
    }

    if (latestState.quickFilter === 'verified') {
      optionsFromState.verified = true;
    }

    if (latestState.quickFilter === 'popular') {
      optionsFromState.sortBy = 'downloads';
      optionsFromState.sortOrder = 'desc';
    }

    return optionsFromState;
  }, []);

  const fetchPlugins = useCallback(
    async (overrideOptions?: PluginSearchOptions) => {
      setIsLoading(true);
      setError(null);
      setErrorCategory(undefined);

      const searchOptions = {
        ...resolveSearchOptions(),
        ...(overrideOptions || {}),
      };

      if (searchOptions.query) {
        addSearchHistory(searchOptions.query);
      }

      if (useMockData) {
        setPlugins(MOCK_PLUGINS.map(addInstalledStatus));
        setIsUsingMockData(true);
        setFallbackMode('unknown', 'Using mocked marketplace data');
        setIsLoading(false);
        return;
      }

      try {
        const client = getPluginMarketplace();
        const result = await client.searchPluginsStrict(searchOptions);
        const marketplacePlugins = result.plugins.map((entry) => toCatalogPlugin(entry));
        setPlugins(marketplacePlugins);
        setIsUsingMockData(false);
        setRemoteMode();
      } catch (err) {
        const normalized = normalizeError(err, 'Failed to fetch plugins');
        setError(normalized.message);
        setErrorCategory(normalized.category);
        setFallbackMode(normalized.category, normalized.message);
        recordDiagnostic({
          operation: 'search',
          category: normalized.category,
          message: normalized.message,
          retryable: normalized.retryable,
        });

        // Fallback mode is explicit for fetch failures only.
        setPlugins(MOCK_PLUGINS.map(addInstalledStatus));
        setIsUsingMockData(true);
      } finally {
        setIsLoading(false);
      }
    },
    [
      resolveSearchOptions,
      addSearchHistory,
      useMockData,
      setRemoteMode,
      setFallbackMode,
      recordDiagnostic,
      toCatalogPlugin,
    ]
  );

  const executePluginOperation = useCallback(
    async (
      pluginId: string,
      operation: MarketplaceOperation,
      version?: string,
      retry = false
    ): Promise<PluginInstallResult> => {
      const client = getPluginMarketplace();

      const opStart = retry
        ? beginRetryPluginOperation(pluginId, operation, version)
        : startPluginOperation(pluginId, operation, version);

      if (opStart.skipped) {
        const previousError = operationState[pluginId]?.lastErrorMessage;
        return {
          success: false,
          error: previousError || 'Operation already in progress',
          errorCategory: 'unknown',
          retryable: true,
        };
      }

      setInstallProgress(pluginId, {
        pluginId,
        stage: 'downloading',
        progress: 0,
        message: operation === 'update' ? 'Starting update...' : 'Starting download...',
      });

      try {
        const result =
          operation === 'update'
            ? await client.updatePlugin(pluginId, version)
            : await client.installPlugin(pluginId, version, { operation: 'install' });

        if (!result.success) {
          const category = result.errorCategory || 'unknown';
          const message = result.error || 'Operation failed';
          failPluginOperation(pluginId, category, message, Boolean(result.retryable), operation);
          setInstallProgress(pluginId, {
            pluginId,
            stage: 'error',
            progress: 0,
            message,
            error: message,
          });
          recordDiagnostic({
            operation: retry ? 'retry' : operation,
            category,
            retryable: Boolean(result.retryable),
            message,
            pluginId,
            operationKey: opStart.operationKey,
          });
          return result;
        }

        completePluginOperation(pluginId);
        setInstallProgress(pluginId, {
          pluginId,
          stage: 'complete',
          progress: 100,
          message: operation === 'update' ? 'Update complete!' : 'Installation complete!',
        });

        // Refresh local plugin status in marketplace list.
        setPlugins((prev) =>
          prev.map((p) => {
            if (p.id !== pluginId) return p;
            return {
              ...p,
              installed: true,
              updateAvailable: false,
              version: version || p.version,
              operationStage: 'installed',
              operationErrorCategory: undefined,
              operationErrorMessage: undefined,
            };
          })
        );

        // Refresh plugin management views from installed plugin store.
        try {
          await scanPlugins();
        } catch {
          // ignore scan failures in hook path; state remains consistent in marketplace list
        }

        setTimeout(() => clearInstallProgress(pluginId), 3000);
        return result;
      } catch (err) {
        const normalized = normalizeError(err, 'Operation failed');
        failPluginOperation(
          pluginId,
          normalized.category,
          normalized.message,
          normalized.retryable,
          operation
        );
        setInstallProgress(pluginId, {
          pluginId,
          stage: 'error',
          progress: 0,
          message: normalized.message,
          error: normalized.message,
        });
        recordDiagnostic({
          operation: retry ? 'retry' : operation,
          category: normalized.category,
          retryable: normalized.retryable,
          message: normalized.message,
          pluginId,
          operationKey: opStart.operationKey,
        });
        return {
          success: false,
          error: normalized.message,
          errorCategory: normalized.category,
          retryable: normalized.retryable,
        };
      }
    },
    [
      beginRetryPluginOperation,
      startPluginOperation,
      operationState,
      setInstallProgress,
      failPluginOperation,
      recordDiagnostic,
      completePluginOperation,
      clearInstallProgress,
      scanPlugins,
    ]
  );

  const search = useCallback(
    async (searchOptions: PluginSearchOptions) => {
      // Persist canonical state before dispatching remote request.
      if (searchOptions.query !== undefined) {
        setDiscoveryQuery(searchOptions.query);
      }
      if (searchOptions.category !== undefined) {
        setDiscoveryCategoryFilter(searchOptions.category as never);
      }
      if (searchOptions.sortBy !== undefined) {
        const mapped =
          searchOptions.sortBy === 'updated'
            ? 'recent'
            : searchOptions.sortBy === 'downloads'
              ? 'downloads'
              : searchOptions.sortBy === 'rating'
                ? 'rating'
                : 'popular';
        setDiscoverySort(mapped);
      }
      if (
        typeof searchOptions.offset === 'number' &&
        typeof searchOptions.limit === 'number' &&
        searchOptions.limit > 0
      ) {
        setDiscoveryPage(Math.floor(searchOptions.offset / searchOptions.limit) + 1);
      }
      await fetchPlugins(searchOptions);
    },
    [setDiscoveryQuery, setDiscoveryCategoryFilter, setDiscoverySort, setDiscoveryPage, fetchPlugins]
  );

  const refresh = useCallback(async () => {
    // Retry remote fetch; if successful fallback mode is cleared.
    await fetchPlugins(initialSearchOptions);
  }, [fetchPlugins, initialSearchOptions]);

  const installPlugin = useCallback(
    async (pluginId: string, version?: string) =>
      executePluginOperation(pluginId, 'install', version, false),
    [executePluginOperation]
  );

  const updatePlugin = useCallback(
    async (pluginId: string, version?: string) =>
      executePluginOperation(pluginId, 'update', version, false),
    [executePluginOperation]
  );

  const retryPluginOperation = useCallback(
    async (pluginId: string, operation: MarketplaceOperation, version?: string) =>
      executePluginOperation(pluginId, operation, version, true),
    [executePluginOperation]
  );

  const getProgress = useCallback(
    (pluginId: string) => installProgress[pluginId],
    [installProgress]
  );

  const checkIsInstalling = useCallback(
    (pluginId: string) => {
      const operation = operationState[pluginId];
      if (operation && (operation.stage === 'installing' || operation.stage === 'updating')) {
        return true;
      }
      const progress = installProgress[pluginId];
      if (!progress) return false;
      return !['idle', 'complete', 'error'].includes(progress.stage);
    },
    [installProgress, operationState]
  );

  const getOperationStage = useCallback(
    (pluginId: string) => operationState[pluginId]?.stage || 'idle',
    [operationState]
  );

  const getOperationError = useCallback(
    (pluginId: string) => ({
      category: operationState[pluginId]?.lastErrorCategory,
      message: operationState[pluginId]?.lastErrorMessage,
    }),
    [operationState]
  );

  const getVersions = useCallback(async (pluginId: string) => {
    const client = getPluginMarketplace();
    try {
      return await client.getVersions(pluginId);
    } catch (error) {
      const normalized = normalizeError(error, 'Failed to load versions');
      recordDiagnostic({
        operation: 'detail',
        category: normalized.category,
        retryable: normalized.retryable,
        message: normalized.message,
        pluginId,
      });
      return [];
    }
  }, [recordDiagnostic]);

  // Initial fetch and refetch on canonical discovery state changes
  useEffect(() => {
    if (initialSearchOptions) {
      setDiscoveryState({
        query: initialSearchOptions.query || '',
        page: initialSearchOptions.offset && initialSearchOptions.limit
          ? Math.floor(initialSearchOptions.offset / initialSearchOptions.limit) + 1
          : 1,
        pageSize: initialSearchOptions.limit || discoveryState.pageSize,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [
    fetchPlugins,
    discoveryState.query,
    discoveryState.sortBy,
    discoveryState.categoryFilter,
    discoveryState.quickFilter,
    discoveryState.page,
    discoveryState.pageSize,
  ]);

  // Derived data
  const featuredPlugins = useMemo(
    () => plugins.filter((p) => p.featured),
    [plugins]
  );

  const trendingPlugins = useMemo(
    () => plugins.filter((p) => p.trending),
    [plugins]
  );

  // Derive categories from loaded plugins
  const categories = useMemo(() => {
    const catMap = new Map<string, number>();
    plugins.forEach((p) => {
      p.capabilities.forEach((cap) => {
        catMap.set(cap, (catMap.get(cap) || 0) + 1);
      });
    });
    return Array.from(catMap.entries())
      .map(([id, count]) => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1), count }))
      .sort((a, b) => b.count - a.count);
  }, [plugins]);

  // Check for plugin updates
  const checkForUpdates = useCallback(async () => {
    const client = getPluginMarketplace();
    const installed = Object.entries(installedPlugins).map(([id, p]) => ({
      id,
      version: p.manifest?.version || '0.0.0',
    }));
    return client.checkForUpdates(installed);
  }, [installedPlugins]);

  // Clear marketplace cache
  const clearCache = useCallback(() => {
    const client = getPluginMarketplace();
    client.clearCache();
  }, []);

  return {
    plugins,
    featuredPlugins,
    trendingPlugins,
    isLoading,
    error,
    errorCategory,
    isUsingMockData,

    query: discoveryState.query,
    sortBy: discoveryState.sortBy,
    categoryFilter: discoveryState.categoryFilter,
    quickFilter: discoveryState.quickFilter,
    sourceFilter: discoveryState.sourceFilter,
    compatibilityFilter: discoveryState.compatibilityFilter,
    page: discoveryState.page,
    setQuery: setDiscoveryQuery,
    setSortBy: setDiscoverySort,
    setCategoryFilter: (value) => setDiscoveryCategoryFilter(value as never),
    setQuickFilter: (value) => setDiscoveryQuickFilter(value),
    setSourceFilter: (value) => setDiscoverySourceFilter(value),
    setCompatibilityFilter: (value) => setDiscoveryCompatibilityFilter(value),
    setPage: setDiscoveryPage,
    resetDiscovery: resetDiscoveryState,
    search,
    refresh,

    sourceMode: sourceState.mode,
    sourceErrorCategory: sourceState.lastFailureCategory,
    sourceErrorMessage: sourceState.lastErrorMessage,

    installPlugin,
    updatePlugin,
    retryPluginOperation,
    getInstallProgress: getProgress,
    isInstalling: checkIsInstalling,
    getOperationStage,
    getOperationError,

    getVersions,

    toggleFavorite,
    isFavorite,
    favoriteCount: Object.keys(favorites).length,
    categories,
    checkForUpdates,
    clearCache,
  };
}

export default useMarketplace;
