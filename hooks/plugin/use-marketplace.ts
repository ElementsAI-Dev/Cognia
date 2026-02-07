/**
 * Marketplace Hook - Fetches plugin data from the marketplace API
 *
 * Provides real API integration with fallback to mock data when unavailable.
 * Includes install progress tracking, favorites, and category support.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PluginMarketplace, type PluginSearchOptions, type PluginRegistryEntry } from '@/lib/plugin';
import type { MarketplacePlugin, InstallProgressInfo } from '@/components/plugin/marketplace/components/marketplace-types';
import { MOCK_PLUGINS } from '@/components/plugin/marketplace/components/marketplace-constants';
import { usePluginStore } from '@/stores/plugin';
import { usePluginMarketplaceStore } from '@/stores/plugin/plugin-marketplace-store';

// Singleton marketplace client
let marketplaceClient: PluginMarketplace | null = null;

function getMarketplaceClient(): PluginMarketplace {
  if (!marketplaceClient) {
    marketplaceClient = new PluginMarketplace();
  }
  return marketplaceClient;
}

/**
 * Convert PluginRegistryEntry to MarketplacePlugin format
 */
function toMarketplacePlugin(entry: PluginRegistryEntry): MarketplacePlugin {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    author: { name: entry.author, verified: entry.verified },
    version: entry.version,
    type: entry.manifest.type,
    capabilities: entry.manifest.capabilities,
    rating: entry.rating,
    reviewCount: entry.ratingCount,
    downloadCount: entry.downloads,
    lastUpdated: entry.updatedAt.toISOString().split('T')[0],
    tags: entry.tags,
    featured: entry.featured,
    verified: entry.verified,
    trending: entry.downloads > 10000,
    repository: entry.repository,
    homepage: entry.homepage,
    license: 'MIT',
  };
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
  isUsingMockData: boolean;
  search: (options: PluginSearchOptions) => Promise<void>;
  refresh: () => Promise<void>;
  // Install
  installPlugin: (pluginId: string) => Promise<{ success: boolean; error?: string }>;
  getInstallProgress: (pluginId: string) => InstallProgressInfo | undefined;
  isInstalling: (pluginId: string) => boolean;
  // Favorites
  toggleFavorite: (pluginId: string) => void;
  isFavorite: (pluginId: string) => boolean;
  favoriteCount: number;
  // Categories
  categories: { id: string; name: string; count: number }[];
}

/**
 * Hook for fetching marketplace plugin data
 */
export function useMarketplace(options: UseMarketplaceOptions = {}): UseMarketplaceResult {
  const { useMockData = false, initialSearchOptions } = options;
  const { plugins: installedPlugins } = usePluginStore();
  const {
    toggleFavorite,
    isFavorite,
    favorites,
    setInstallProgress,
    clearInstallProgress,
    installProgress,
    addSearchHistory,
  } = usePluginMarketplaceStore();

  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(useMockData);

  const installedPluginIds = useMemo(
    () => new Set(Object.keys(installedPlugins)),
    [installedPlugins]
  );

  const addInstalledStatus = useCallback(
    (plugin: MarketplacePlugin): MarketplacePlugin => ({
      ...plugin,
      installed: installedPluginIds.has(plugin.id),
    }),
    [installedPluginIds]
  );

  const fetchPlugins = useCallback(
    async (searchOptions?: PluginSearchOptions) => {
      setIsLoading(true);
      setError(null);

      // Track search queries
      if (searchOptions?.query) {
        addSearchHistory(searchOptions.query);
      }

      if (useMockData) {
        setPlugins(MOCK_PLUGINS.map(addInstalledStatus));
        setIsUsingMockData(true);
        setIsLoading(false);
        return;
      }

      try {
        const client = getMarketplaceClient();
        const result = await client.searchPlugins(searchOptions);

        if (result.plugins.length > 0) {
          const marketplacePlugins = result.plugins.map(toMarketplacePlugin).map(addInstalledStatus);
          setPlugins(marketplacePlugins);
          setIsUsingMockData(false);
        } else {
          // Fallback to mock data if no results from API
          setPlugins(MOCK_PLUGINS.map(addInstalledStatus));
          setIsUsingMockData(true);
        }
      } catch (err) {
        // Fallback to mock data on error
        setPlugins(MOCK_PLUGINS.map(addInstalledStatus));
        setIsUsingMockData(true);
        setError(err instanceof Error ? err.message : 'Failed to fetch plugins');
      } finally {
        setIsLoading(false);
      }
    },
    [useMockData, addInstalledStatus, addSearchHistory]
  );

  const search = useCallback(
    async (searchOptions: PluginSearchOptions) => {
      await fetchPlugins(searchOptions);
    },
    [fetchPlugins]
  );

  const refresh = useCallback(async () => {
    await fetchPlugins(initialSearchOptions);
  }, [fetchPlugins, initialSearchOptions]);

  // Install plugin via marketplace API with progress tracking
  const installPluginFromMarketplace = useCallback(
    async (pluginId: string): Promise<{ success: boolean; error?: string }> => {
      const client = getMarketplaceClient();

      // Set initial progress
      setInstallProgress(pluginId, {
        pluginId,
        stage: 'downloading',
        progress: 0,
        message: 'Starting download...',
      });

      // Subscribe to progress updates
      const unsubscribe = client.onInstallProgress(pluginId, (progress) => {
        setInstallProgress(pluginId, {
          pluginId,
          stage: progress.stage as InstallProgressInfo['stage'],
          progress: progress.progress,
          message: progress.message,
          error: progress.error,
        });
      });

      try {
        const result = await client.installPlugin(pluginId);

        if (result.success) {
          setInstallProgress(pluginId, {
            pluginId,
            stage: 'complete',
            progress: 100,
            message: 'Installation complete!',
          });

          // Update plugin installed status in local state
          setPlugins((prev) =>
            prev.map((p) => (p.id === pluginId ? { ...p, installed: true } : p))
          );

          // Clear progress after delay
          setTimeout(() => clearInstallProgress(pluginId), 3000);
        } else {
          setInstallProgress(pluginId, {
            pluginId,
            stage: 'error',
            progress: 0,
            message: result.error || 'Installation failed',
            error: result.error,
          });
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Installation failed';
        setInstallProgress(pluginId, {
          pluginId,
          stage: 'error',
          progress: 0,
          message: errorMsg,
          error: errorMsg,
        });
        return { success: false, error: errorMsg };
      } finally {
        unsubscribe();
      }
    },
    [setInstallProgress, clearInstallProgress]
  );

  const getProgress = useCallback(
    (pluginId: string) => installProgress.get(pluginId),
    [installProgress]
  );

  const checkIsInstalling = useCallback(
    (pluginId: string) => {
      const progress = installProgress.get(pluginId);
      if (!progress) return false;
      return !['idle', 'complete', 'error'].includes(progress.stage);
    },
    [installProgress]
  );

  // Initial fetch
  useEffect(() => {
    fetchPlugins(initialSearchOptions);
  }, [fetchPlugins, initialSearchOptions]);

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

  return {
    plugins,
    featuredPlugins,
    trendingPlugins,
    isLoading,
    error,
    isUsingMockData,
    search,
    refresh,
    installPlugin: installPluginFromMarketplace,
    getInstallProgress: getProgress,
    isInstalling: checkIsInstalling,
    toggleFavorite,
    isFavorite,
    favoriteCount: favorites.size,
    categories,
  };
}

export default useMarketplace;
