/**
 * Plugin Marketplace Store
 * Persists favorites, recently viewed, install progress, and user preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { InstallProgressInfo, InstallStage } from '@/components/plugin/marketplace/components/marketplace-types';

// =============================================================================
// Types
// =============================================================================

interface UserReview {
  pluginId: string;
  rating: number;
  content: string;
  date: string;
}

interface PluginMarketplaceState {
  // Favorites
  favorites: Set<string>;
  toggleFavorite: (pluginId: string) => void;
  isFavorite: (pluginId: string) => boolean;
  getFavoriteIds: () => string[];

  // Recently viewed
  recentlyViewed: string[];
  addRecentlyViewed: (pluginId: string) => void;
  clearRecentlyViewed: () => void;

  // Install progress tracking
  installProgress: Map<string, InstallProgressInfo>;
  setInstallProgress: (pluginId: string, progress: InstallProgressInfo) => void;
  clearInstallProgress: (pluginId: string) => void;
  getInstallProgress: (pluginId: string) => InstallProgressInfo | undefined;
  isInstalling: (pluginId: string) => boolean;

  // User reviews
  userReviews: Map<string, UserReview>;
  submitReview: (pluginId: string, rating: number, content: string) => void;
  getUserReview: (pluginId: string) => UserReview | undefined;

  // Search history
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // View preferences
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;

  // Reset
  reset: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_RECENTLY_VIEWED = 20;
const MAX_SEARCH_HISTORY = 50;

// =============================================================================
// Store
// =============================================================================

export const usePluginMarketplaceStore = create<PluginMarketplaceState>()(
  persist(
    (set, get) => ({
      // Favorites
      favorites: new Set<string>(),

      toggleFavorite: (pluginId) => {
        set((state) => {
          const next = new Set(state.favorites);
          if (next.has(pluginId)) {
            next.delete(pluginId);
          } else {
            next.add(pluginId);
          }
          return { favorites: next };
        });
      },

      isFavorite: (pluginId) => get().favorites.has(pluginId),

      getFavoriteIds: () => Array.from(get().favorites),

      // Recently viewed
      recentlyViewed: [],

      addRecentlyViewed: (pluginId) => {
        set((state) => {
          const filtered = state.recentlyViewed.filter((id) => id !== pluginId);
          return {
            recentlyViewed: [pluginId, ...filtered].slice(0, MAX_RECENTLY_VIEWED),
          };
        });
      },

      clearRecentlyViewed: () => set({ recentlyViewed: [] }),

      // Install progress
      installProgress: new Map(),

      setInstallProgress: (pluginId, progress) => {
        set((state) => {
          const next = new Map(state.installProgress);
          next.set(pluginId, progress);
          return { installProgress: next };
        });
      },

      clearInstallProgress: (pluginId) => {
        set((state) => {
          const next = new Map(state.installProgress);
          next.delete(pluginId);
          return { installProgress: next };
        });
      },

      getInstallProgress: (pluginId) => get().installProgress.get(pluginId),

      isInstalling: (pluginId) => {
        const progress = get().installProgress.get(pluginId);
        if (!progress) return false;
        return !['idle', 'complete', 'error'].includes(progress.stage);
      },

      // User reviews
      userReviews: new Map(),

      submitReview: (pluginId, rating, content) => {
        set((state) => {
          const next = new Map(state.userReviews);
          next.set(pluginId, {
            pluginId,
            rating,
            content,
            date: new Date().toISOString().split('T')[0],
          });
          return { userReviews: next };
        });
      },

      getUserReview: (pluginId) => get().userReviews.get(pluginId),

      // Search history
      searchHistory: [],

      addSearchHistory: (query) => {
        if (!query.trim()) return;
        set((state) => {
          const filtered = state.searchHistory.filter((q) => q !== query);
          return {
            searchHistory: [query, ...filtered].slice(0, MAX_SEARCH_HISTORY),
          };
        });
      },

      clearSearchHistory: () => set({ searchHistory: [] }),

      // View preferences
      viewMode: 'grid',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Reset
      reset: () =>
        set({
          favorites: new Set(),
          recentlyViewed: [],
          installProgress: new Map(),
          userReviews: new Map(),
          searchHistory: [],
          viewMode: 'grid',
        }),
    }),
    {
      name: 'cognia-plugin-marketplace',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: Array.from(state.favorites),
        recentlyViewed: state.recentlyViewed,
        userReviews: Array.from(state.userReviews.entries()),
        searchHistory: state.searchHistory,
        viewMode: state.viewMode,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as {
          favorites?: string[];
          recentlyViewed?: string[];
          userReviews?: [string, UserReview][];
          searchHistory?: string[];
          viewMode?: 'grid' | 'list';
        };
        return {
          ...current,
          favorites: new Set(persistedState?.favorites || []),
          recentlyViewed: persistedState?.recentlyViewed || [],
          userReviews: new Map(persistedState?.userReviews || []),
          searchHistory: persistedState?.searchHistory || [],
          viewMode: persistedState?.viewMode || 'grid',
        };
      },
    }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectFavoriteCount = (state: PluginMarketplaceState) => state.favorites.size;

export const selectIsInstalling = (pluginId: string) => (state: PluginMarketplaceState) =>
  state.isInstalling(pluginId);

export const selectInstallStage = (pluginId: string) => (state: PluginMarketplaceState): InstallStage => {
  const progress = state.installProgress.get(pluginId);
  return progress?.stage || 'idle';
};
