/**
 * Prompt Marketplace Store
 * Manages marketplace prompts, installations, and user activity
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  MarketplacePrompt,
  MarketplaceCategory,
  MarketplaceSearchFilters,
  MarketplaceSearchResult,
  InstalledMarketplacePrompt,
  MarketplaceUserActivity,
  PromptCollection,
  PromptReview,
} from '@/types/content/prompt-marketplace';
import { SAMPLE_MARKETPLACE_PROMPTS } from '@/types/content/prompt-marketplace';
import { usePromptTemplateStore } from './prompt-template-store';

interface PromptMarketplaceState {
  // Cached marketplace data
  prompts: Record<string, MarketplacePrompt>;
  collections: Record<string, PromptCollection>;
  featuredIds: string[];
  trendingIds: string[];

  // User activity
  userActivity: MarketplaceUserActivity;

  // UI State
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: Date | null;

  // Actions - Fetching
  fetchFeatured: () => Promise<void>;
  fetchTrending: () => Promise<void>;
  fetchByCategory: (category: MarketplaceCategory) => Promise<MarketplacePrompt[]>;
  searchPrompts: (filters: MarketplaceSearchFilters) => Promise<MarketplaceSearchResult>;
  getPromptById: (id: string) => MarketplacePrompt | undefined;
  fetchPromptDetails: (id: string) => Promise<MarketplacePrompt | null>;
  fetchPromptReviews: (promptId: string, page?: number) => Promise<PromptReview[]>;

  // Actions - Installation
  installPrompt: (prompt: MarketplacePrompt) => Promise<string>;
  uninstallPrompt: (marketplaceId: string) => void;
  updateInstalledPrompt: (marketplaceId: string) => Promise<void>;
  checkForUpdates: () => Promise<InstalledMarketplacePrompt[]>;
  getInstalledPrompts: () => InstalledMarketplacePrompt[];
  isPromptInstalled: (marketplaceId: string) => boolean;

  // Actions - User Activity
  addToFavorites: (promptId: string) => void;
  removeFromFavorites: (promptId: string) => void;
  isFavorite: (promptId: string) => boolean;
  recordView: (promptId: string) => void;
  getRecentlyViewed: () => MarketplacePrompt[];

  // Actions - Reviews
  submitReview: (promptId: string, rating: number, content: string) => Promise<void>;
  markReviewHelpful: (reviewId: string) => Promise<void>;

  // Actions - Publishing
  publishPrompt: (templateId: string, metadata: Partial<MarketplacePrompt>) => Promise<string>;
  unpublishPrompt: (marketplaceId: string) => Promise<void>;

  // Actions - Collections
  fetchCollections: () => Promise<PromptCollection[]>;
  followCollection: (collectionId: string) => void;
  unfollowCollection: (collectionId: string) => void;

  // Utility
  clearCache: () => void;
  setError: (error: string | null) => void;
  initializeSampleData: () => void;
}

const initialUserActivity: MarketplaceUserActivity = {
  userId: '',
  favorites: [],
  installed: [],
  reviewed: [],
  published: [],
  collections: [],
  recentlyViewed: [],
};

export const usePromptMarketplaceStore = create<PromptMarketplaceState>()(
  persist(
    (set, get) => ({
      prompts: {},
      collections: {},
      featuredIds: [],
      trendingIds: [],
      userActivity: initialUserActivity,
      isLoading: false,
      error: null,
      lastSyncedAt: null,

      // Fetching Actions
      fetchFeatured: async () => {
        set({ isLoading: true, error: null });
        try {
          // In production, this would be an API call
          const featured = Object.values(get().prompts).filter((p) => p.isFeatured);
          set({ featuredIds: featured.map((p) => p.id), isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch featured',
            isLoading: false,
          });
        }
      },

      fetchTrending: async () => {
        set({ isLoading: true, error: null });
        try {
          const prompts = Object.values(get().prompts);
          const trending = prompts
            .sort((a, b) => b.stats.weeklyDownloads - a.stats.weeklyDownloads)
            .slice(0, 20);
          set({ trendingIds: trending.map((p) => p.id), isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch trending',
            isLoading: false,
          });
        }
      },

      fetchByCategory: async (category: MarketplaceCategory) => {
        const prompts = Object.values(get().prompts);
        if (category === 'featured') {
          return prompts.filter((p) => p.isFeatured);
        }
        if (category === 'trending') {
          return prompts
            .sort((a, b) => b.stats.weeklyDownloads - a.stats.weeklyDownloads)
            .slice(0, 20);
        }
        if (category === 'new') {
          return prompts
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20);
        }
        return prompts.filter((p) => p.category === category);
      },

      searchPrompts: async (filters: MarketplaceSearchFilters) => {
        const allPrompts = Object.values(get().prompts);
        let filtered = allPrompts;

        // Apply filters
        if (filters.query) {
          const query = filters.query.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(query) ||
              p.description.toLowerCase().includes(query) ||
              p.tags.some((t) => t.toLowerCase().includes(query))
          );
        }

        if (filters.category && !['featured', 'trending', 'new'].includes(filters.category)) {
          filtered = filtered.filter((p) => p.category === filters.category);
        }

        if (filters.tags && filters.tags.length > 0) {
          filtered = filtered.filter((p) => filters.tags!.some((tag) => p.tags.includes(tag)));
        }

        if (filters.qualityTier && filters.qualityTier.length > 0) {
          filtered = filtered.filter((p) => filters.qualityTier!.includes(p.qualityTier));
        }

        if (filters.targets && filters.targets.length > 0) {
          filtered = filtered.filter((p) => filters.targets!.some((t) => p.targets.includes(t)));
        }

        if (filters.minRating) {
          filtered = filtered.filter((p) => p.rating.average >= filters.minRating!);
        }

        if (filters.authorId) {
          filtered = filtered.filter((p) => p.author.id === filters.authorId);
        }

        // Sort
        switch (filters.sortBy) {
          case 'downloads':
            filtered.sort((a, b) => b.stats.downloads - a.stats.downloads);
            break;
          case 'rating':
            filtered.sort((a, b) => b.rating.average - a.rating.average);
            break;
          case 'newest':
            filtered.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            break;
          case 'trending':
            filtered.sort((a, b) => b.stats.weeklyDownloads - a.stats.weeklyDownloads);
            break;
          default:
            // relevance - keep original order for query, or by downloads otherwise
            if (!filters.query) {
              filtered.sort((a, b) => b.stats.downloads - a.stats.downloads);
            }
        }

        // Generate facets
        const facets = {
          categories: {} as Record<string, number>,
          tags: {} as Record<string, number>,
          qualityTiers: {} as Record<string, number>,
        };

        filtered.forEach((p) => {
          facets.categories[p.category] = (facets.categories[p.category] || 0) + 1;
          facets.qualityTiers[p.qualityTier] = (facets.qualityTiers[p.qualityTier] || 0) + 1;
          p.tags.forEach((tag) => {
            facets.tags[tag] = (facets.tags[tag] || 0) + 1;
          });
        });

        return {
          prompts: filtered,
          total: filtered.length,
          page: 1,
          pageSize: filtered.length,
          hasMore: false,
          filters,
          facets,
        };
      },

      getPromptById: (id: string) => {
        return get().prompts[id];
      },

      fetchPromptDetails: async (id: string) => {
        return get().prompts[id] || null;
      },

      fetchPromptReviews: async (_promptId: string, _page = 1) => {
        // In production, this would fetch from API
        return [];
      },

      // Installation Actions
      installPrompt: async (prompt: MarketplacePrompt) => {
        const templateStore = usePromptTemplateStore.getState();

        // Create local template from marketplace prompt
        const template = templateStore.createTemplate({
          name: prompt.name,
          description: prompt.description,
          content: prompt.content,
          category: prompt.category,
          tags: [...prompt.tags, 'marketplace'],
          variables: prompt.variables,
          targets: prompt.targets,
          source: 'imported',
          meta: {
            icon: prompt.icon,
            color: prompt.color,
          },
        });

        // Track installation
        const installation: InstalledMarketplacePrompt = {
          id: nanoid(),
          marketplaceId: prompt.id,
          localTemplateId: template.id,
          installedVersion: prompt.version,
          latestVersion: prompt.version,
          hasUpdate: false,
          autoUpdate: false,
          installedAt: new Date(),
        };

        set((state) => ({
          userActivity: {
            ...state.userActivity,
            installed: [...state.userActivity.installed, installation],
          },
        }));

        // Update download count locally
        if (get().prompts[prompt.id]) {
          set((state) => ({
            prompts: {
              ...state.prompts,
              [prompt.id]: {
                ...state.prompts[prompt.id],
                stats: {
                  ...state.prompts[prompt.id].stats,
                  downloads: state.prompts[prompt.id].stats.downloads + 1,
                },
              },
            },
          }));
        }

        return template.id;
      },

      uninstallPrompt: (marketplaceId: string) => {
        const { userActivity } = get();
        const installation = userActivity.installed.find((i) => i.marketplaceId === marketplaceId);

        if (installation) {
          // Remove local template
          const templateStore = usePromptTemplateStore.getState();
          templateStore.deleteTemplate(installation.localTemplateId);

          // Remove from installed list
          set((state) => ({
            userActivity: {
              ...state.userActivity,
              installed: state.userActivity.installed.filter(
                (i) => i.marketplaceId !== marketplaceId
              ),
            },
          }));
        }
      },

      updateInstalledPrompt: async (marketplaceId: string) => {
        const { prompts, userActivity } = get();
        const prompt = prompts[marketplaceId];
        const installation = userActivity.installed.find((i) => i.marketplaceId === marketplaceId);

        if (!prompt || !installation) return;

        // Update local template
        const templateStore = usePromptTemplateStore.getState();
        templateStore.updateTemplate(installation.localTemplateId, {
          content: prompt.content,
          variables: prompt.variables,
        });

        // Update installation record
        set((state) => ({
          userActivity: {
            ...state.userActivity,
            installed: state.userActivity.installed.map((i) =>
              i.marketplaceId === marketplaceId
                ? {
                    ...i,
                    installedVersion: prompt.version,
                    latestVersion: prompt.version,
                    hasUpdate: false,
                    lastSyncedAt: new Date(),
                  }
                : i
            ),
          },
        }));
      },

      checkForUpdates: async () => {
        const { prompts, userActivity } = get();
        const withUpdates: InstalledMarketplacePrompt[] = [];

        const updatedInstalled = userActivity.installed.map((installation) => {
          const prompt = prompts[installation.marketplaceId];
          if (prompt && prompt.version !== installation.installedVersion) {
            const updated = {
              ...installation,
              latestVersion: prompt.version,
              hasUpdate: true,
            };
            withUpdates.push(updated);
            return updated;
          }
          return installation;
        });

        set((state) => ({
          userActivity: {
            ...state.userActivity,
            installed: updatedInstalled,
          },
        }));

        return withUpdates;
      },

      getInstalledPrompts: () => {
        return get().userActivity.installed;
      },

      isPromptInstalled: (marketplaceId: string) => {
        return get().userActivity.installed.some((i) => i.marketplaceId === marketplaceId);
      },

      // User Activity Actions
      addToFavorites: (promptId: string) => {
        set((state) => ({
          userActivity: {
            ...state.userActivity,
            favorites: state.userActivity.favorites.includes(promptId)
              ? state.userActivity.favorites
              : [...state.userActivity.favorites, promptId],
          },
        }));
      },

      removeFromFavorites: (promptId: string) => {
        set((state) => ({
          userActivity: {
            ...state.userActivity,
            favorites: state.userActivity.favorites.filter((id) => id !== promptId),
          },
        }));
      },

      isFavorite: (promptId: string) => {
        return get().userActivity.favorites.includes(promptId);
      },

      recordView: (promptId: string) => {
        set((state) => {
          const filtered = state.userActivity.recentlyViewed.filter((v) => v.promptId !== promptId);
          const newView = { promptId, viewedAt: new Date() };
          return {
            userActivity: {
              ...state.userActivity,
              recentlyViewed: [newView, ...filtered].slice(0, 50),
            },
          };
        });
      },

      getRecentlyViewed: () => {
        const { prompts, userActivity } = get();
        return userActivity.recentlyViewed
          .map((v) => prompts[v.promptId])
          .filter((p): p is MarketplacePrompt => p !== undefined);
      },

      // Review Actions
      submitReview: async (_promptId: string, _rating: number, _content: string) => {
        // In production, this would submit to API
      },

      markReviewHelpful: async (_reviewId: string) => {
        // In production, this would update via API
      },

      // Publishing Actions
      publishPrompt: async (_templateId: string, _metadata: Partial<MarketplacePrompt>) => {
        // In production, this would publish to marketplace API
        return nanoid();
      },

      unpublishPrompt: async (_marketplaceId: string) => {
        // In production, this would unpublish via API
      },

      // Collection Actions
      fetchCollections: async () => {
        return Object.values(get().collections);
      },

      followCollection: (collectionId: string) => {
        set((state) => ({
          userActivity: {
            ...state.userActivity,
            collections: state.userActivity.collections.includes(collectionId)
              ? state.userActivity.collections
              : [...state.userActivity.collections, collectionId],
          },
        }));
      },

      unfollowCollection: (collectionId: string) => {
        set((state) => ({
          userActivity: {
            ...state.userActivity,
            collections: state.userActivity.collections.filter((id) => id !== collectionId),
          },
        }));
      },

      // Utility Actions
      clearCache: () => {
        set({
          prompts: {},
          collections: {},
          featuredIds: [],
          trendingIds: [],
          lastSyncedAt: null,
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      initializeSampleData: () => {
        const now = new Date();
        const samplePrompts: Record<string, MarketplacePrompt> = {};
        const featuredIds: string[] = [];

        SAMPLE_MARKETPLACE_PROMPTS.forEach((sample) => {
          const id = nanoid();
          samplePrompts[id] = {
            ...sample,
            id,
            createdAt: now,
            updatedAt: now,
          };
          if (sample.isFeatured) {
            featuredIds.push(id);
          }
        });

        set({
          prompts: samplePrompts,
          featuredIds,
          trendingIds: featuredIds,
          lastSyncedAt: now,
        });
      },
    }),
    {
      name: 'cognia-prompt-marketplace',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userActivity: {
          ...state.userActivity,
          recentlyViewed: state.userActivity.recentlyViewed.map((v) => ({
            promptId: v.promptId,
            viewedAt: v.viewedAt instanceof Date ? v.viewedAt.toISOString() : v.viewedAt,
          })),
          installed: state.userActivity.installed.map((i) => ({
            ...i,
            installedAt:
              i.installedAt instanceof Date ? i.installedAt.toISOString() : i.installedAt,
            lastSyncedAt:
              i.lastSyncedAt instanceof Date ? i.lastSyncedAt.toISOString() : i.lastSyncedAt,
          })),
        },
        prompts: state.prompts,
        collections: state.collections,
        featuredIds: state.featuredIds,
        trendingIds: state.trendingIds,
        lastSyncedAt: state.lastSyncedAt?.toISOString(),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Rehydrate dates
          if (state.lastSyncedAt) {
            state.lastSyncedAt = new Date(state.lastSyncedAt);
          }
          if (state.userActivity.recentlyViewed) {
            state.userActivity.recentlyViewed = state.userActivity.recentlyViewed.map((v) => ({
              promptId: v.promptId,
              viewedAt: new Date(v.viewedAt),
            }));
          }
          if (state.userActivity.installed) {
            state.userActivity.installed = state.userActivity.installed.map((i) => ({
              ...i,
              installedAt: new Date(i.installedAt),
              lastSyncedAt: i.lastSyncedAt ? new Date(i.lastSyncedAt) : undefined,
            }));
          }
          // Rehydrate prompt dates
          Object.values(state.prompts).forEach((p) => {
            p.createdAt = new Date(p.createdAt);
            p.updatedAt = new Date(p.updatedAt);
            if (p.publishedAt) p.publishedAt = new Date(p.publishedAt);
          });
        }
      },
    }
  )
);

// Selectors
export const selectMarketplacePrompts = (state: PromptMarketplaceState) =>
  Object.values(state.prompts);
export const selectFeaturedPrompts = (state: PromptMarketplaceState) =>
  state.featuredIds.map((id) => state.prompts[id]).filter(Boolean);
export const selectTrendingPrompts = (state: PromptMarketplaceState) =>
  state.trendingIds.map((id) => state.prompts[id]).filter(Boolean);
export const selectInstalledPrompts = (state: PromptMarketplaceState) =>
  state.userActivity.installed;
export const selectFavoritePrompts = (state: PromptMarketplaceState) =>
  state.userActivity.favorites.map((id) => state.prompts[id]).filter(Boolean);
export const selectIsLoading = (state: PromptMarketplaceState) => state.isLoading;
export const selectError = (state: PromptMarketplaceState) => state.error;

export default usePromptMarketplaceStore;
