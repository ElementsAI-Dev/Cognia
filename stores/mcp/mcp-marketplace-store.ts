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
  downloadMcpServer,
  filterMarketplaceItems,
  getUniqueTags,
} from '@/lib/mcp/marketplace';
import { getCachedDetails, setCachedDetails } from '@/lib/mcp/marketplace-utils';

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
  
  // Selected item for detail view
  selectedItem: McpMarketplaceItem | null;
  downloadDetails: McpDownloadResponse | null;
  isLoadingDetails: boolean;
  
  // API Keys for sources that require them
  smitheryApiKey: string | null;
  
  // Favorites
  favorites: Set<string>;
  
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
  fetchItemDetails: (mcpId: string) => Promise<McpDownloadResponse | null>;
  setInstallStatus: (mcpId: string, status: McpInstallStatus, error?: string) => void;
  setSmitheryApiKey: (key: string | null) => void;
  clearError: () => void;
  
  // Favorites actions
  toggleFavorite: (mcpId: string) => void;
  isFavorite: (mcpId: string) => boolean;
  setShowFavoritesOnly: (show: boolean) => void;
  
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
  isItemInstalled: (mcpId: string) => boolean;
  getInstallStatus: (mcpId: string) => McpInstallStatus;
  getSourceCount: (source: McpMarketplaceSource) => number;
  getFavoritesCount: () => number;
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
      selectedItem: null,
      downloadDetails: null,
      isLoadingDetails: false,
      smitheryApiKey: null,
      favorites: new Set(),
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
        set({ selectedItem: item, downloadDetails: null });
      },

      fetchItemDetails: async (mcpId) => {
        // Check cache first
        const cached = getCachedDetails<McpDownloadResponse>(mcpId);
        if (cached) {
          set({ downloadDetails: cached, isLoadingDetails: false });
          return cached;
        }

        set({ isLoadingDetails: true });

        try {
          const details = await downloadMcpServer(mcpId);
          // Cache the result
          if (!details.error) {
            setCachedDetails(mcpId, details);
          }
          set({ downloadDetails: details, isLoadingDetails: false });
          return details;
        } catch (_error) {
          set({ isLoadingDetails: false });
          return null;
        }
      },

      setInstallStatus: (mcpId, status, error) => {
        set((state) => {
          const newInstallingItems = new Map(state.installingItems);
          const newInstallErrors = new Map(state.installErrors);

          newInstallingItems.set(mcpId, status);

          if (error) {
            newInstallErrors.set(mcpId, error);
          } else {
            newInstallErrors.delete(mcpId);
          }

          return {
            installingItems: newInstallingItems,
            installErrors: newInstallErrors,
          };
        });
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
          items = items.filter(item => state.favorites.has(item.mcpId));
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

      isItemInstalled: (mcpId) => {
        const status = get().installingItems.get(mcpId);
        return status === 'installed';
      },

      getInstallStatus: (mcpId) => {
        return get().installingItems.get(mcpId) || 'not_installed';
      },

      getSourceCount: (source) => {
        const state = get();
        if (!state.catalog) return 0;
        if (source === 'all') return state.catalog.items.length;
        return state.catalog.items.filter(item => item.source === source).length;
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
        favorites: Array.from(state.favorites),
        viewMode: state.viewMode,
        itemsPerPage: state.itemsPerPage,
        smitheryApiKey: state.smitheryApiKey,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as {
          installingItems?: [string, McpInstallStatus][];
          installErrors?: [string, string][];
          favorites?: string[];
          viewMode?: 'grid' | 'list';
          itemsPerPage?: number;
          smitheryApiKey?: string | null;
        };
        return {
          ...current,
          installingItems: new Map(persistedState.installingItems || []),
          installErrors: new Map(persistedState.installErrors || []),
          favorites: new Set(persistedState.favorites || []),
          viewMode: persistedState.viewMode || 'grid',
          itemsPerPage: persistedState.itemsPerPage || 24,
          smitheryApiKey: persistedState.smitheryApiKey || null,
        };
      },
    }
  )
);
