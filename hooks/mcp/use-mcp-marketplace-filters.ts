/**
 * Hook for managing MCP marketplace filtering, sorting, and pagination
 * Extracts filter logic from mcp-marketplace.tsx
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDebounce } from '@/hooks';
import { useMcpMarketplaceStore, useMcpStore } from '@/stores/mcp';
import type {
  McpMarketplaceItem,
  McpMarketplaceSortOption,
  McpMarketplaceSource,
} from '@/types/mcp/mcp-marketplace';

export interface UseMarketplaceFiltersOptions {
  debounceMs?: number;
  pageSize?: number;
}

export interface UseMarketplaceFiltersReturn {
  // Search state
  localSearch: string;
  setLocalSearch: (value: string) => void;
  debouncedSearch: string;
  
  // Filter state
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  hasActiveFilters: boolean;
  
  // View state
  showInstalledOnly: boolean;
  setShowInstalledOnly: (show: boolean) => void;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  
  // Computed data
  filteredItems: McpMarketplaceItem[];
  displayItems: McpMarketplaceItem[];
  paginatedItems: McpMarketplaceItem[];
  totalPages: number;
  availableTags: string[];
  installedCount: number;
  favoritesCount: number;
  
  // Actions
  handleTagToggle: (tag: string) => void;
  handleSourceChange: (source: McpMarketplaceSource) => void;
  handleSortChange: (sortBy: McpMarketplaceSortOption) => void;
  isItemInstalled: (mcpId: string) => boolean;
}

export function useMarketplaceFilters(
  options: UseMarketplaceFiltersOptions = {}
): UseMarketplaceFiltersReturn {
  const { debounceMs = 300 } = options;

  const {
    catalog,
    filters,
    showFavoritesOnly,
    setFilters,
    getFilteredItems,
    getPaginatedItems,
    getTotalPages,
    getUniqueTags,
    getFavoritesCount,
  } = useMcpMarketplaceStore();

  const { servers } = useMcpStore();

  const [localSearch, setLocalSearch] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Debounce search input
  const debouncedSearch = useDebounce(localSearch, debounceMs);

  // Sync debounced search to store
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, setFilters]);

  // Memoize computed values
  const filteredItems = useMemo(() => getFilteredItems(), [getFilteredItems]);
  const paginatedItems = useMemo(() => getPaginatedItems(), [getPaginatedItems]);
  const totalPages = useMemo(() => getTotalPages(), [getTotalPages]);
  const availableTags = useMemo(() => getUniqueTags(), [getUniqueTags]);
  const favoritesCount = useMemo(() => getFavoritesCount(), [getFavoritesCount]);

  // Check if an item is installed
  const isItemInstalled = useCallback(
    (mcpId: string): boolean => {
      return servers.some((server) => server.id === mcpId || server.name === mcpId);
    },
    [servers]
  );

  // Count installed items
  const installedCount = useMemo(() => {
    if (!catalog) return 0;
    return catalog.items.filter((item) => isItemInstalled(item.mcpId)).length;
  }, [catalog, isItemInstalled]);

  // Filter by installed if enabled
  const displayItems = useMemo(() => {
    if (!showInstalledOnly) return paginatedItems;
    return filteredItems.filter((item) => isItemInstalled(item.mcpId));
  }, [showInstalledOnly, paginatedItems, filteredItems, isItemInstalled]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.tags.length > 0 ||
      filters.requiresApiKey !== undefined ||
      filters.verified !== undefined ||
      filters.remote !== undefined ||
      showFavoritesOnly
    );
  }, [filters, showFavoritesOnly]);

  // Handle tag toggle
  const handleTagToggle = useCallback(
    (tag: string) => {
      const newTags = filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag];
      setFilters({ tags: newTags });
    },
    [filters.tags, setFilters]
  );

  // Handle source change
  const handleSourceChange = useCallback(
    (source: McpMarketplaceSource) => {
      setFilters({ source });
    },
    [setFilters]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (sortBy: McpMarketplaceSortOption) => {
      setFilters({ sortBy });
    },
    [setFilters]
  );

  return {
    // Search state
    localSearch,
    setLocalSearch,
    debouncedSearch,
    
    // Filter state
    showFilters,
    setShowFilters,
    hasActiveFilters,
    
    // View state
    showInstalledOnly,
    setShowInstalledOnly,
    focusedIndex,
    setFocusedIndex,
    
    // Computed data
    filteredItems,
    displayItems,
    paginatedItems,
    totalPages,
    availableTags,
    installedCount,
    favoritesCount,
    
    // Actions
    handleTagToggle,
    handleSourceChange,
    handleSortChange,
    isItemInstalled,
  };
}
