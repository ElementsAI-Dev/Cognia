/**
 * Plugin Marketplace Store
 * Persists favorites, recently viewed, install progress, and user preferences.
 * 
 * Uses plain objects (Record/Array) instead of Map/Set for robust JSON serialization.
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
  // Favorites (stored as Record for native JSON serialization)
  favorites: Record<string, true>;
  toggleFavorite: (pluginId: string) => void;
  isFavorite: (pluginId: string) => boolean;
  getFavoriteIds: () => string[];

  // Recently viewed
  recentlyViewed: string[];
  addRecentlyViewed: (pluginId: string) => void;
  clearRecentlyViewed: () => void;

  // Install progress tracking (not persisted — transient state)
  installProgress: Record<string, InstallProgressInfo>;
  setInstallProgress: (pluginId: string, progress: InstallProgressInfo) => void;
  clearInstallProgress: (pluginId: string) => void;
  getInstallProgress: (pluginId: string) => InstallProgressInfo | undefined;
  isInstalling: (pluginId: string) => boolean;

  // User reviews
  userReviews: Record<string, UserReview>;
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
      favorites: {},

      toggleFavorite: (pluginId) => {
        set((state) => {
          const next = { ...state.favorites };
          if (next[pluginId]) {
            delete next[pluginId];
          } else {
            next[pluginId] = true;
          }
          return { favorites: next };
        });
      },

      isFavorite: (pluginId) => !!get().favorites[pluginId],

      getFavoriteIds: () => Object.keys(get().favorites),

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

      // Install progress (transient, not persisted)
      installProgress: {},

      setInstallProgress: (pluginId, progress) => {
        set((state) => ({
          installProgress: { ...state.installProgress, [pluginId]: progress },
        }));
      },

      clearInstallProgress: (pluginId) => {
        set((state) => {
          const next = { ...state.installProgress };
          delete next[pluginId];
          return { installProgress: next };
        });
      },

      getInstallProgress: (pluginId) => get().installProgress[pluginId],

      isInstalling: (pluginId) => {
        const progress = get().installProgress[pluginId];
        if (!progress) return false;
        return !['idle', 'complete', 'error'].includes(progress.stage);
      },

      // User reviews
      userReviews: {},

      submitReview: (pluginId, rating, content) => {
        set((state) => ({
          userReviews: {
            ...state.userReviews,
            [pluginId]: {
              pluginId,
              rating,
              content,
              date: new Date().toISOString().split('T')[0],
            },
          },
        }));
      },

      getUserReview: (pluginId) => get().userReviews[pluginId],

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
          favorites: {},
          recentlyViewed: [],
          installProgress: {},
          userReviews: {},
          searchHistory: [],
          viewMode: 'grid',
        }),
    }),
    {
      name: 'cognia-plugin-marketplace',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        recentlyViewed: state.recentlyViewed,
        userReviews: state.userReviews,
        searchHistory: state.searchHistory,
        viewMode: state.viewMode,
        // installProgress is intentionally excluded (transient state)
      }),
    }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectFavoriteCount = (state: PluginMarketplaceState) =>
  Object.keys(state.favorites).length;

export const selectIsInstalling = (pluginId: string) => (state: PluginMarketplaceState) =>
  state.isInstalling(pluginId);

export const selectInstallStage = (pluginId: string) => (state: PluginMarketplaceState): InstallStage => {
  const progress = state.installProgress[pluginId];
  return progress?.stage || 'idle';
};
