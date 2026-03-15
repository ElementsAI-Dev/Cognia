/**
 * MCP Marketplace Store
 * Zustand state management for MCP marketplace
 * Supports multiple marketplace sources: Cline, Smithery, Glama
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  McpMarketplaceCatalog,
  McpMarketplaceItem,
  McpMarketplaceFilters,
  McpDownloadResponse,
  McpInstallStatus,
  McpMarketplaceSource,
} from '@/types/mcp/mcp-marketplace';
import { DEFAULT_MARKETPLACE_FILTERS } from '@/types/mcp/mcp-marketplace';
import {
  fetchMcpMarketplace,
  fetchMcpMarketplaceDetail,
  filterMarketplaceItems,
  getUniqueTags,
} from '@/lib/mcp/marketplace';
import { getCachedDetails, setCachedDetails, clearDetailsCache } from '@/lib/mcp/marketplace-utils';

interface McpMarketplaceState {
  // State
  catalog: McpMarketplaceCatalog | null;
  filters: McpMarketplaceFilters;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Source-specific catalogs for caching
  sourceCatalogs: Record<McpMarketplaceSource, McpMarketplaceCatalog | null>;
  sourceLastFetched: Record<McpMarketplaceSource, number | null>;

  // Installation tracking
  installingItems: Map<string, McpInstallStatus>;
  installErrors: Map<string, string>;
  installedServerLinks: Map<string, string>;

  // Selected item for detail view
  selectedItem: McpMarketplaceItem | null;
  selectedItemKey: string | null;
  downloadDetails: McpDownloadResponse | null;
  isLoadingDetails: boolean;
  detailsByItemKey: Map<string, McpDownloadResponse>;
  detailStatusByItemKey: Map<string, 'idle' | 'loading' | 'success' | 'error'>;

  // API Keys for sources that require them
  smitheryApiKey: string | null;

  // Favorites
  favorites: Set<string>;

  // Recently viewed
  recentlyViewed: string[];

  // Search history
  searchHistory: string[];

  // Pagination
  currentPage: number;
  itemsPerPage: number;

  // View mode
  viewMode: 'grid' | 'list';
  showFavoritesOnly: boolean;

  // Cache duration (5 minutes)
  cacheDuration: number;

  // Actions
  fetchCatalog: (force?: boolean) => Promise<void>;
  fetchFromSource: (source: McpMarketplaceSource, force?: boolean) => Promise<void>;
  setFilters: (filters: Partial<McpMarketplaceFilters>) => void;
  resetFilters: () => void;
  selectItem: (item: McpMarketplaceItem | null) => void;
  fetchItemDetails: (item: McpMarketplaceItem) => Promise<McpDownloadResponse | null>;
  getItemDetails: (item: McpMarketplaceItem | string | null | undefined) => McpDownloadResponse | null;
  getDetailStatus: (item: McpMarketplaceItem | string | null | undefined) => 'idle' | 'loading' | 'success' | 'error';
  setInstallStatus: (item: McpMarketplaceItem | string, status: McpInstallStatus, error?: string) => void;
  linkInstalledServer: (item: McpMarketplaceItem | string, serverId: string) => void;
  getLinkedServerId: (item: McpMarketplaceItem | string | null | undefined) => string | null;
  setSmitheryApiKey: (key: string | null) => void;
  clearError: () => void;

  // Favorites actions
  toggleFavorite: (mcpId: string) => void;
  isFavorite: (mcpId: string) => boolean;
  setShowFavoritesOnly: (show: boolean) => void;

  // Recently viewed actions
  addToRecentlyViewed: (mcpId: string) => void;
  getRecentlyViewedItems: () => McpMarketplaceItem[];
  clearRecentlyViewed: () => void;

  // Search history actions
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // Pagination actions
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;

  // View actions
  setViewMode: (mode: 'grid' | 'list') => void;

  // Computed
  getFilteredItems: () => McpMarketplaceItem[];
  getPaginatedItems: () => McpMarketplaceItem[];
  getTotalPages: () => number;
  getUniqueTags: () => string[];
  isItemInstalled: (item: McpMarketplaceItem | string) => boolean;
  getInstallStatus: (item: McpMarketplaceItem | string) => McpInstallStatus;
  getSourceCount: (source: McpMarketplaceSource) => number;
  getFavoritesCount: () => number;
}

function toItemKey(item: McpMarketplaceItem | string | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === 'string') return item;
  return item.itemKey || `${item.source}:${item.mcpId}`;
}

export const useMcpMarketplaceStore = create<McpMarketplaceState>()(
  persist(
    (set, get) => ({
      // Initial state
      catalog: null,
      filters: DEFAULT_MARKETPLACE_FILTERS,
      isLoading: false,
      error: null,
      lastFetched: null,
      sourceCatalogs: {
        cline: null,
        smithery: null,
        glama: null,
        all: null,
      },
      sourceLastFetched: {
        cline: null,
        smithery: null,
        glama: null,
        all: null,
      },
      installingItems: new Map(),
      installErrors: new Map(),
      installedServerLinks: new Map(),
      selectedItem: null,
      selectedItemKey: null,
      downloadDetails: null,
      isLoadingDetails: false,
      detailsByItemKey: new Map(),
      detailStatusByItemKey: new Map(),
      smitheryApiKey: null,
      favorites: new Set(),
      recentlyViewed: [],
      searchHistory: [],
      currentPage: 1,
      itemsPerPage: 24,
      viewMode: 'grid',
      showFavoritesOnly: false,
      cacheDuration: 5 * 60 * 1000, // 5 minutes

      fetchCatalog: async (force = false) => {
        const state = get();
        const source = state.filters.source || 'all';

        // Check cache validity
        if (
          !force &&
          state.catalog &&
          state.lastFetched &&
          Date.now() - state.lastFetched < state.cacheDuration
        ) {
          return;
        }

        // Clear details cache on force refresh to ensure fresh data
        if (force) {
          clearDetailsCache();
        }

        set({ isLoading: true, error: null });

        try {
          const catalog = await fetchMcpMarketplace(source, {
            smitheryApiKey: state.smitheryApiKey || undefined,
          });
          set({
            catalog,
            lastFetched: Date.now(),
            isLoading: false,
            sourceCatalogs: {
              ...state.sourceCatalogs,
              [source]: catalog,
            },
            sourceLastFetched: {
              ...state.sourceLastFetched,
              [source]: Date.now(),
            },
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch marketplace',
            isLoading: false,
          });
        }
      },

      fetchFromSource: async (source, force = false) => {
        const state = get();

        // Check source-specific cache
        const lastFetched = state.sourceLastFetched[source];
        if (
          !force &&
          state.sourceCatalogs[source] &&
          lastFetched &&
          Date.now() - lastFetched < state.cacheDuration
        ) {
          // Use cached data
          set({ catalog: state.sourceCatalogs[source] });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const catalog = await fetchMcpMarketplace(source, {
            smitheryApiKey: state.smitheryApiKey || undefined,
          });
          set({
            catalog,
            lastFetched: Date.now(),
            isLoading: false,
            sourceCatalogs: {
              ...state.sourceCatalogs,
              [source]: catalog,
            },
            sourceLastFetched: {
              ...state.sourceLastFetched,
              [source]: Date.now(),
            },
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch from ' + source,
            isLoading: false,
          });
        }
      },

      setFilters: (newFilters) => {
        const state = get();
        const updatedFilters = { ...state.filters, ...newFilters };
        set({ filters: updatedFilters, currentPage: 1 }); // Reset to page 1 on filter change

        // If source changed, fetch from that source
        if (newFilters.source && newFilters.source !== state.filters.source) {
          get().fetchFromSource(newFilters.source);
        }
      },

      resetFilters: () => {
        set({ filters: DEFAULT_MARKETPLACE_FILTERS });
      },

      selectItem: (item) => {
        const itemKey = toItemKey(item);
        const detail = itemKey ? get().detailsByItemKey.get(itemKey) || null : null;
        const detailStatus = itemKey ? get().detailStatusByItemKey.get(itemKey) : 'idle';
        set({
          selectedItem: item,
          selectedItemKey: itemKey,
          downloadDetails: detail,
          isLoadingDetails: detailStatus === 'loading',
        });
      },

      fetchItemDetails: async (item) => {
        const itemKey = toItemKey(item);
        if (!itemKey) return null;

        const cached = getCachedDetails<McpDownloadResponse>(itemKey);
        if (cached) {
          set((state) => {
            const detailsByItemKey = new Map(state.detailsByItemKey);
            const detailStatusByItemKey = new Map(state.detailStatusByItemKey);
            detailsByItemKey.set(itemKey, cached);
            detailStatusByItemKey.set(itemKey, cached.error ? 'error' : 'success');
            return {
              detailsByItemKey,
              detailStatusByItemKey,
              downloadDetails: cached,
              isLoadingDetails: false,
            };
          });
          return cached;
        }

        set((state) => {
          const detailStatusByItemKey = new Map(state.detailStatusByItemKey);
          detailStatusByItemKey.set(itemKey, 'loading');
          return {
            detailStatusByItemKey,
            isLoadingDetails: state.selectedItemKey === itemKey ? true : state.isLoadingDetails,
          };
        });

        try {
          const details = await fetchMcpMarketplaceDetail(item, {
            smitheryApiKey: get().smitheryApiKey || undefined,
          });
          if (!details.error) {
            setCachedDetails(itemKey, details);
          }

          set((state) => {
            const detailsByItemKey = new Map(state.detailsByItemKey);
            const detailStatusByItemKey = new Map(state.detailStatusByItemKey);
            detailsByItemKey.set(itemKey, details);
            detailStatusByItemKey.set(itemKey, details.error ? 'error' : 'success');
            return {
              detailsByItemKey,
              detailStatusByItemKey,
              downloadDetails: details,
              isLoadingDetails: false,
            };
          });
          return details;
        } catch (_error) {
          set((state) => {
            const detailStatusByItemKey = new Map(state.detailStatusByItemKey);
            detailStatusByItemKey.set(itemKey, 'error');
            return {
              detailStatusByItemKey,
              isLoadingDetails: state.selectedItemKey === itemKey ? false : state.isLoadingDetails,
            };
          });
          return null;
        }
      },

      getItemDetails: (item) => {
        const itemKey = toItemKey(item);
        if (!itemKey) return null;
        return get().detailsByItemKey.get(itemKey) || null;
      },

      getDetailStatus: (item) => {
        const itemKey = toItemKey(item);
        if (!itemKey) return 'idle';
        return get().detailStatusByItemKey.get(itemKey) || 'idle';
      },

      setInstallStatus: (item, status, error) => {
        const itemKey = toItemKey(item);
        if (!itemKey) return;
        set((state) => {
          const newInstallingItems = new Map(state.installingItems);
          const newInstallErrors = new Map(state.installErrors);

          newInstallingItems.set(itemKey, status);

          if (error) {
            newInstallErrors.set(itemKey, error);
          } else {
            newInstallErrors.delete(itemKey);
          }

          return {
            installingItems: newInstallingItems,
            installErrors: newInstallErrors,
          };
        });
      },

      linkInstalledServer: (item, serverId) => {
        const itemKey = toItemKey(item);
        if (!itemKey) return;
        set((state) => {
          const installedServerLinks = new Map(state.installedServerLinks);
          installedServerLinks.set(itemKey, serverId);
          return { installedServerLinks };
        });
      },

      getLinkedServerId: (item) => {
        const itemKey = toItemKey(item);
        if (!itemKey) return null;
        return get().installedServerLinks.get(itemKey) || null;
      },

      setSmitheryApiKey: (key) => {
        set({ smitheryApiKey: key });
      },

      clearError: () => {
        set({ error: null });
      },

      // Favorites actions
      toggleFavorite: (mcpId) => {
        set((state) => {
          const newFavorites = new Set(state.favorites);
          if (newFavorites.has(mcpId)) {
            newFavorites.delete(mcpId);
          } else {
            newFavorites.add(mcpId);
          }
          return { favorites: newFavorites };
        });
      },

      isFavorite: (mcpId) => {
        return get().favorites.has(mcpId);
      },

      setShowFavoritesOnly: (show) => {
        set({ showFavoritesOnly: show, currentPage: 1 });
      },

      // Recently viewed actions
      addToRecentlyViewed: (mcpId) => {
        set((state) => {
          const filtered = state.recentlyViewed.filter((id) => id !== mcpId);
          return {
            recentlyViewed: [mcpId, ...filtered].slice(0, 20), // Keep last 20
          };
        });
      },

      getRecentlyViewedItems: () => {
        const state = get();
        if (!state.catalog) return [];
        return state.recentlyViewed
          .map((id) => state.catalog?.items.find((item) => item.mcpId === id))
          .filter(Boolean) as McpMarketplaceItem[];
      },

      clearRecentlyViewed: () => {
        set({ recentlyViewed: [] });
      },

      // Search history actions
      addToSearchHistory: (query) => {
        if (!query.trim()) return;
        set((state) => {
          const filtered = state.searchHistory.filter((q) => q !== query);
          return {
            searchHistory: [query, ...filtered].slice(0, 10), // Keep last 10
          };
        });
      },

      clearSearchHistory: () => {
        set({ searchHistory: [] });
      },

      // Pagination actions
      setCurrentPage: (page) => {
        set({ currentPage: page });
      },

      setItemsPerPage: (count) => {
        set({ itemsPerPage: count, currentPage: 1 });
      },

      // View actions
      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      getFilteredItems: () => {
        const state = get();
        if (!state.catalog) return [];
        let items = filterMarketplaceItems(state.catalog.items, state.filters);

        // Filter by favorites if enabled
        if (state.showFavoritesOnly) {
          items = items.filter((item) => state.favorites.has(item.mcpId));
        }

        return items;
      },

      getPaginatedItems: () => {
        const state = get();
        const filtered = state.getFilteredItems();
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const end = start + state.itemsPerPage;
        return filtered.slice(start, end);
      },

      getTotalPages: () => {
        const state = get();
        const filtered = state.getFilteredItems();
        return Math.ceil(filtered.length / state.itemsPerPage);
      },

      getUniqueTags: () => {
        const state = get();
        if (!state.catalog) return [];
        return getUniqueTags(state.catalog.items);
      },

      isItemInstalled: (item) => {
        const itemKey = toItemKey(item);
        if (!itemKey) return false;
        return (
          get().installingItems.get(itemKey) === 'installed' ||
          get().installedServerLinks.has(itemKey)
        );
      },

      getInstallStatus: (item) => {
        const itemKey = toItemKey(item);
        if (!itemKey) return 'not_installed';
        return get().installingItems.get(itemKey) || 'not_installed';
      },

      getSourceCount: (source) => {
        const state = get();
        if (!state.catalog) return 0;
        if (source === 'all') return state.catalog.items.length;
        return state.catalog.items.filter((item) => item.source === source).length;
      },

      getFavoritesCount: () => {
        return get().favorites.size;
      },
    }),
    {
      name: 'mcp-marketplace-storage',
      partialize: (state) => ({
        // Persist installation status and user preferences
        installingItems: Array.from(state.installingItems.entries()),
        installErrors: Array.from(state.installErrors.entries()),
        installedServerLinks: Array.from(state.installedServerLinks.entries()),
        favorites: Array.from(state.favorites),
        recentlyViewed: state.recentlyViewed,
        searchHistory: state.searchHistory,
        viewMode: state.viewMode,
        itemsPerPage: state.itemsPerPage,
        smitheryApiKey: state.smitheryApiKey,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as {
          installingItems?: [string, McpInstallStatus][];
          installErrors?: [string, string][];
          installedServerLinks?: [string, string][];
          favorites?: string[];
          recentlyViewed?: string[];
          searchHistory?: string[];
          viewMode?: 'grid' | 'list';
          itemsPerPage?: number;
          smitheryApiKey?: string | null;
        };
        return {
          ...current,
          installingItems: new Map(persistedState.installingItems || []),
          installErrors: new Map(persistedState.installErrors || []),
          installedServerLinks: new Map(persistedState.installedServerLinks || []),
          favorites: new Set(persistedState.favorites || []),
          recentlyViewed: persistedState.recentlyViewed || [],
          searchHistory: persistedState.searchHistory || [],
          viewMode: persistedState.viewMode || 'grid',
          itemsPerPage: persistedState.itemsPerPage || 24,
          smitheryApiKey: persistedState.smitheryApiKey || null,
        };
      },
    }
  )
);
