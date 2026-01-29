/**
 * Skills Marketplace Store
 * Zustand state management for SkillsMP marketplace
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  SkillsMarketplaceItem,
  SkillsMarketplaceFilters,
  SkillInstallStatus,
  SkillsMarketplaceDetail,
} from '@/types/skill/skill-marketplace';
import { DEFAULT_SKILLS_MARKETPLACE_FILTERS } from '@/types/skill/skill-marketplace';
import {
  searchSkillsMarketplace,
  aiSearchSkillsMarketplace,
  fetchSkillDetail,
  downloadSkillContent,
  filterSkillsLocally,
  getUniqueSkillTags,
  getUniqueSkillCategories,
} from '@/lib/skills/marketplace';
import { useSkillStore } from './skill-store';

interface SkillMarketplaceState {
  // State
  items: SkillsMarketplaceItem[];
  filters: SkillsMarketplaceFilters;
  isLoading: boolean;
  error: string | null;
  lastSearched: number | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;

  // Selected item for detail view
  selectedItem: SkillsMarketplaceItem | null;
  selectedDetail: SkillsMarketplaceDetail | null;
  isLoadingDetail: boolean;

  // Installation tracking
  installingItems: Map<string, SkillInstallStatus>;
  installErrors: Map<string, string>;

  // API Key
  apiKey: string | null;

  // Favorites
  favorites: Set<string>;

  // Search history
  searchHistory: string[];

  // View mode
  viewMode: 'grid' | 'list';

  // Cache duration (5 minutes)
  cacheDuration: number;

  // Actions
  searchSkills: (query?: string) => Promise<void>;
  aiSearch: (query: string) => Promise<void>;
  setFilters: (filters: Partial<SkillsMarketplaceFilters>) => void;
  resetFilters: () => void;
  selectItem: (item: SkillsMarketplaceItem | null) => void;
  fetchItemDetail: (skillId: string) => Promise<SkillsMarketplaceDetail | null>;
  installSkill: (item: SkillsMarketplaceItem) => Promise<boolean>;
  setApiKey: (key: string | null) => void;
  clearError: () => void;

  // Favorites actions
  toggleFavorite: (skillId: string) => void;
  isFavorite: (skillId: string) => boolean;

  // Search history actions
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // Pagination actions
  setCurrentPage: (page: number) => void;

  // View actions
  setViewMode: (mode: 'grid' | 'list') => void;

  // Computed
  getFilteredItems: () => SkillsMarketplaceItem[];
  getPaginatedItems: () => SkillsMarketplaceItem[];
  getUniqueTags: () => string[];
  getUniqueCategories: () => string[];
  isItemInstalled: (skillId: string) => boolean;
  getInstallStatus: (skillId: string) => SkillInstallStatus;
  getFavoritesCount: () => number;
  hasApiKey: () => boolean;
}

export const useSkillMarketplaceStore = create<SkillMarketplaceState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      filters: DEFAULT_SKILLS_MARKETPLACE_FILTERS,
      isLoading: false,
      error: null,
      lastSearched: null,
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      selectedItem: null,
      selectedDetail: null,
      isLoadingDetail: false,
      installingItems: new Map(),
      installErrors: new Map(),
      apiKey: null,
      favorites: new Set(),
      searchHistory: [],
      viewMode: 'grid',
      cacheDuration: 5 * 60 * 1000,

      searchSkills: async (query?: string) => {
        const state = get();
        const searchQuery = query ?? state.filters.query;

        if (!searchQuery.trim()) {
          set({ items: [], error: null });
          return;
        }

        if (!state.apiKey) {
          set({ error: 'API key is required. Configure it in settings.' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = state.filters.useAiSearch
            ? await aiSearchSkillsMarketplace(searchQuery, state.apiKey)
            : await searchSkillsMarketplace(searchQuery, {
                page: state.filters.page,
                limit: state.filters.limit,
                sortBy: state.filters.sortBy,
                apiKey: state.apiKey,
              });

          if (!response.success) {
            set({
              error: response.error?.message || 'Search failed',
              isLoading: false,
            });
            return;
          }

          // Add to search history
          get().addToSearchHistory(searchQuery);

          set({
            items: response.data,
            totalItems: response.pagination?.total || response.data.length,
            totalPages: response.pagination?.totalPages || 1,
            currentPage: response.pagination?.page || 1,
            lastSearched: Date.now(),
            isLoading: false,
            filters: { ...state.filters, query: searchQuery },
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Search failed',
            isLoading: false,
          });
        }
      },

      aiSearch: async (query: string) => {
        set((state) => ({
          filters: { ...state.filters, useAiSearch: true, query },
        }));
        await get().searchSkills(query);
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          currentPage: 1,
        }));
      },

      resetFilters: () => {
        set({
          filters: DEFAULT_SKILLS_MARKETPLACE_FILTERS,
          currentPage: 1,
        });
      },

      selectItem: (item) => {
        set({ selectedItem: item, selectedDetail: null });
      },

      fetchItemDetail: async (skillId) => {
        set({ isLoadingDetail: true });

        try {
          const detail = await fetchSkillDetail(skillId, get().apiKey || undefined);
          set({ selectedDetail: detail, isLoadingDetail: false });
          return detail;
        } catch (_error) {
          set({ isLoadingDetail: false });
          return null;
        }
      },

      installSkill: async (item) => {
        // Update status
        set((s) => {
          const newInstalling = new Map(s.installingItems);
          newInstalling.set(item.id, 'installing');
          return { installingItems: newInstalling };
        });

        try {
          // Download skill content
          const content = await downloadSkillContent(item.id);
          if (!content) {
            throw new Error('Failed to download skill content');
          }

          // Parse SKILL.md and create skill
          const skillStore = useSkillStore.getState();

          // Extract name and description from SKILL.md frontmatter
          const frontmatterMatch = content.skillmd.match(/^---\s*\n([\s\S]*?)\n---/);
          let name = item.name;
          let description = item.description;

          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const nameMatch = frontmatter.match(/name:\s*(.+)/);
            const descMatch = frontmatter.match(/description:\s*(.+)/);
            if (nameMatch) name = nameMatch[1].trim();
            if (descMatch) description = descMatch[1].trim();
          }

          // Get content body (after frontmatter)
          const contentBody = content.skillmd.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');

          // Create skill in local store
          const skill = skillStore.createSkill({
            name,
            description,
            content: contentBody,
            category: 'custom',
            tags: item.tags || [],
            author: item.author,
            version: item.version,
          });

          // Update skill source to marketplace
          skillStore.updateSkill(skill.id, {
            // @ts-expect-error - Adding marketplace-specific fields
            source: 'marketplace',
            marketplaceId: item.id,
            marketplaceUrl: `https://github.com/${item.repository}`,
          });

          // Update status to installed
          set((s) => {
            const newInstalling = new Map(s.installingItems);
            newInstalling.set(item.id, 'installed');
            return { installingItems: newInstalling };
          });

          return true;
        } catch (error) {
          // Update status to error
          set((s) => {
            const newInstalling = new Map(s.installingItems);
            const newErrors = new Map(s.installErrors);
            newInstalling.set(item.id, 'error');
            newErrors.set(item.id, error instanceof Error ? error.message : 'Install failed');
            return { installingItems: newInstalling, installErrors: newErrors };
          });

          return false;
        }
      },

      setApiKey: (key) => {
        set({ apiKey: key });
      },

      clearError: () => {
        set({ error: null });
      },

      toggleFavorite: (skillId) => {
        set((state) => {
          const newFavorites = new Set(state.favorites);
          if (newFavorites.has(skillId)) {
            newFavorites.delete(skillId);
          } else {
            newFavorites.add(skillId);
          }
          return { favorites: newFavorites };
        });
      },

      isFavorite: (skillId) => {
        return get().favorites.has(skillId);
      },

      addToSearchHistory: (query) => {
        if (!query.trim()) return;
        set((state) => {
          const filtered = state.searchHistory.filter((q) => q !== query);
          return {
            searchHistory: [query, ...filtered].slice(0, 10),
          };
        });
      },

      clearSearchHistory: () => {
        set({ searchHistory: [] });
      },

      setCurrentPage: (page) => {
        set({ currentPage: page });
        // Trigger new search with updated page
        const state = get();
        if (state.filters.query) {
          set((s) => ({ filters: { ...s.filters, page } }));
          get().searchSkills();
        }
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      getFilteredItems: () => {
        const state = get();
        return filterSkillsLocally(state.items, state.filters);
      },

      getPaginatedItems: () => {
        // Items are already paginated from API
        return get().items;
      },

      getUniqueTags: () => {
        return getUniqueSkillTags(get().items);
      },

      getUniqueCategories: () => {
        return getUniqueSkillCategories(get().items);
      },

      isItemInstalled: (skillId) => {
        const status = get().installingItems.get(skillId);
        if (status === 'installed') return true;

        // Also check skill store
        const skillStore = useSkillStore.getState();
        const skills = skillStore.getAllSkills();
        return skills.some(
          (s) =>
            // @ts-expect-error - marketplace fields
            s.marketplaceId === skillId || s.metadata.name === skillId.split('/').pop()
        );
      },

      getInstallStatus: (skillId) => {
        return get().installingItems.get(skillId) || 'not_installed';
      },

      getFavoritesCount: () => {
        return get().favorites.size;
      },

      hasApiKey: () => {
        return !!get().apiKey;
      },
    }),
    {
      name: 'cognia-skill-marketplace-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        favorites: Array.from(state.favorites),
        searchHistory: state.searchHistory,
        viewMode: state.viewMode,
        installingItems: Array.from(state.installingItems.entries()),
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as {
          apiKey?: string | null;
          favorites?: string[];
          searchHistory?: string[];
          viewMode?: 'grid' | 'list';
          installingItems?: [string, SkillInstallStatus][];
        };
        return {
          ...current,
          apiKey: persistedState.apiKey || null,
          favorites: new Set(persistedState.favorites || []),
          searchHistory: persistedState.searchHistory || [],
          viewMode: persistedState.viewMode || 'grid',
          installingItems: new Map(persistedState.installingItems || []),
        };
      },
    }
  )
);

// Selectors
export const selectSkillMarketplaceItems = (state: SkillMarketplaceState) => state.items;
export const selectSkillMarketplaceLoading = (state: SkillMarketplaceState) => state.isLoading;
export const selectSkillMarketplaceError = (state: SkillMarketplaceState) => state.error;
export const selectSkillMarketplaceApiKey = (state: SkillMarketplaceState) => state.apiKey;
