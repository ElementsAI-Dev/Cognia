/**
 * useSkillMarketplace Hook
 * React hook for Skills marketplace integration
 */

import { useCallback, useMemo } from 'react';
import { useSkillMarketplaceStore } from '@/stores/skills/skill-marketplace-store';
import { useSkillStore } from '@/stores/skills/skill-store';
import type { SkillsMarketplaceItem } from '@/types/skill/skill-marketplace';

export function useSkillMarketplace() {
  const store = useSkillMarketplaceStore();
  const skillStore = useSkillStore();

  /**
   * Check if a marketplace skill is already installed
   */
  const isInstalled = useCallback(
    (item: SkillsMarketplaceItem): boolean => {
      // Check by marketplace ID first
      const status = store.installingItems.get(item.id);
      if (status === 'installed') return true;

      // Check local skills by name or marketplace ID
      const skills = skillStore.getAllSkills();
      return skills.some(
        (s) =>
          // @ts-expect-error - marketplace fields may not exist
          s.marketplaceId === item.id ||
          s.metadata.name === item.name ||
          s.metadata.name === item.directory.split('/').pop()
      );
    },
    [store.installingItems, skillStore]
  );

  /**
   * Install a skill from marketplace
   */
  const install = useCallback(
    async (item: SkillsMarketplaceItem): Promise<boolean> => {
      if (isInstalled(item)) {
        return true;
      }
      return store.installSkill(item);
    },
    [store, isInstalled]
  );

  /**
   * Search skills with current filters
   */
  const search = useCallback(
    async (query?: string) => {
      await store.searchSkills(query);
    },
    [store]
  );

  /**
   * AI semantic search
   */
  const aiSearch = useCallback(
    async (query: string) => {
      await store.aiSearch(query);
    },
    [store]
  );

  /**
   * Get install status for an item
   */
  const getInstallStatus = useCallback(
    (item: SkillsMarketplaceItem) => {
      if (isInstalled(item)) return 'installed';
      return store.getInstallStatus(item.id);
    },
    [store, isInstalled]
  );

  /**
   * Get install error for an item
   */
  const getInstallError = useCallback(
    (itemId: string): string | undefined => {
      return store.installErrors.get(itemId);
    },
    [store.installErrors]
  );

  /**
   * Computed items with installation status
   */
  const items = store.items;
  const favorites = store.favorites;
  const isFavoriteCheck = store.isFavorite;

  const itemsWithStatus = useMemo(() => {
    return items.map((item) => ({
      ...item,
      installStatus: getInstallStatus(item),
      isInstalled: isInstalled(item),
      isFavorite: isFavoriteCheck(item.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, favorites, getInstallStatus, isInstalled]);

  /**
   * Filter to show only favorites
   */
  const favoriteItems = useMemo(() => {
    return itemsWithStatus.filter((item) => item.isFavorite);
  }, [itemsWithStatus]);

  /**
   * Check if API key is configured
   */
  const hasApiKey = store.apiKey !== null && store.apiKey.length > 0;

  return {
    // State
    items: store.items,
    itemsWithStatus,
    favoriteItems,
    filters: store.filters,
    isLoading: store.isLoading,
    error: store.error,
    hasApiKey,
    apiKey: store.apiKey,

    // Pagination
    currentPage: store.currentPage,
    totalPages: store.totalPages,
    totalItems: store.totalItems,

    // Selected item
    selectedItem: store.selectedItem,
    selectedDetail: store.selectedDetail,
    isLoadingDetail: store.isLoadingDetail,

    // View
    viewMode: store.viewMode,
    searchHistory: store.searchHistory,

    // Actions
    search,
    aiSearch,
    install,
    isInstalled,
    getInstallStatus,
    getInstallError,

    // Filter actions
    setFilters: store.setFilters,
    resetFilters: store.resetFilters,

    // Selection actions
    selectItem: store.selectItem,
    fetchItemDetail: store.fetchItemDetail,

    // API key
    setApiKey: store.setApiKey,

    // Error handling
    clearError: store.clearError,

    // Favorites
    toggleFavorite: store.toggleFavorite,
    isFavorite: store.isFavorite,
    favoritesCount: store.getFavoritesCount(),

    // Search history
    addToSearchHistory: store.addToSearchHistory,
    clearSearchHistory: store.clearSearchHistory,

    // Pagination
    setCurrentPage: store.setCurrentPage,

    // View
    setViewMode: store.setViewMode,

    // Computed
    getUniqueTags: store.getUniqueTags,
    getUniqueCategories: store.getUniqueCategories,
  };
}

export type UseSkillMarketplaceReturn = ReturnType<typeof useSkillMarketplace>;
