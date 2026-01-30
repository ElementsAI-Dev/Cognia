/**
 * Marketplace Hook - Fetches plugin data from the marketplace API
 *
 * Provides real API integration with fallback to mock data when unavailable.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PluginMarketplace, type PluginSearchOptions, type PluginRegistryEntry } from '@/lib/plugin/marketplace';
import type { MarketplacePlugin } from '@/components/plugin/marketplace/components/marketplace-types';
import { MOCK_PLUGINS } from '@/components/plugin/marketplace/components/marketplace-constants';
import { usePluginStore } from '@/stores/plugin';

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
}

/**
 * Hook for fetching marketplace plugin data
 */
export function useMarketplace(options: UseMarketplaceOptions = {}): UseMarketplaceResult {
  const { useMockData = false, initialSearchOptions } = options;
  const { plugins: installedPlugins } = usePluginStore();

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

      if (useMockData) {
        // Use mock data directly
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
    [useMockData, addInstalledStatus]
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

  return {
    plugins,
    featuredPlugins,
    trendingPlugins,
    isLoading,
    error,
    isUsingMockData,
    search,
    refresh,
  };
}

export default useMarketplace;
