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
import { SAMPLE_MARKETPLACE_PROMPTS, SAMPLE_MARKETPLACE_COLLECTIONS } from '@/lib/prompts/marketplace-samples';
import { usePromptTemplateStore } from './prompt-template-store';

interface PromptMarketplaceState {
  // Cached marketplace data
  prompts: Record<string, MarketplacePrompt>;
  collections: Record<string, PromptCollection>;
  featuredIds: string[];
  trendingIds: string[];
  reviews: Record<string, PromptReview[]>;

  // User activity
  userActivity: MarketplaceUserActivity;

  // UI State
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: Date | null;

  // Actions - Fetching
  fetchFeatured: () => void;
  fetchTrending: () => void;
  fetchByCategory: (category: MarketplaceCategory) => MarketplacePrompt[];
  searchPrompts: (filters: MarketplaceSearchFilters) => MarketplaceSearchResult;
  getPromptById: (id: string) => MarketplacePrompt | undefined;
  fetchPromptDetails: (id: string) => MarketplacePrompt | null;
  fetchPromptReviews: (promptId: string, page?: number) => PromptReview[];

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
      reviews: {},
      userActivity: initialUserActivity,
      isLoading: false,
      error: null,
      lastSyncedAt: null,

      // Fetching Actions
      // In production, these would be API calls
      fetchFeatured: () => {
        const featured = Object.values(get().prompts).filter((p) => p.isFeatured);
        set({ featuredIds: featured.map((p) => p.id) });
      },

      fetchTrending: () => {
        const prompts = Object.values(get().prompts);
        const trending = prompts
          .sort((a, b) => b.stats.weeklyDownloads - a.stats.weeklyDownloads)
          .slice(0, 20);
        set({ trendingIds: trending.map((p) => p.id) });
      },

      fetchByCategory: (category: MarketplaceCategory) => {
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

      searchPrompts: (filters: MarketplaceSearchFilters) => {
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

      fetchPromptDetails: (id: string) => {
        return get().prompts[id] || null;
      },

      fetchPromptReviews: (promptId: string, _page = 1) => {
        return get().reviews[promptId] || [];
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
      submitReview: async (promptId: string, rating: number, content: string) => {
        const review: PromptReview = {
          id: nanoid(),
          authorId: get().userActivity.userId || 'anonymous',
          authorName: 'You',
          rating,
          content,
          helpful: 0,
          createdAt: new Date(),
        };

        set((state) => {
          const promptReviews = state.reviews[promptId] || [];
          const newReviews = [review, ...promptReviews];
          
          // Update prompt rating
          const prompt = state.prompts[promptId];
          if (prompt) {
            const allRatings = newReviews.map((r) => r.rating);
            const newAverage = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
            const newDistribution = { ...prompt.rating.distribution };
            newDistribution[rating as 1 | 2 | 3 | 4 | 5] += 1;

            return {
              reviews: {
                ...state.reviews,
                [promptId]: newReviews,
              },
              prompts: {
                ...state.prompts,
                [promptId]: {
                  ...prompt,
                  rating: {
                    average: newAverage,
                    count: prompt.rating.count + 1,
                    distribution: newDistribution,
                  },
                  reviewCount: prompt.reviewCount + 1,
                },
              },
              userActivity: {
                ...state.userActivity,
                reviewed: [...state.userActivity.reviewed, promptId],
              },
            };
          }

          return {
            reviews: {
              ...state.reviews,
              [promptId]: newReviews,
            },
            userActivity: {
              ...state.userActivity,
              reviewed: [...state.userActivity.reviewed, promptId],
            },
          };
        });
      },

      markReviewHelpful: async (reviewId: string) => {
        set((state) => {
          const newReviews = { ...state.reviews };
          for (const promptId of Object.keys(newReviews)) {
            newReviews[promptId] = newReviews[promptId].map((review) =>
              review.id === reviewId
                ? { ...review, helpful: review.helpful + 1 }
                : review
            );
          }
          return { reviews: newReviews };
        });
      },

      // Publishing Actions
      publishPrompt: async (templateId: string, metadata: Partial<MarketplacePrompt>) => {
        const templateStore = usePromptTemplateStore.getState();
        const template = templateStore.getTemplate(templateId);

        const marketplaceId = nanoid();
        const now = new Date();

        const marketplacePrompt: MarketplacePrompt = {
          id: marketplaceId,
          name: metadata.name || template?.name || 'Untitled Prompt',
          description: metadata.description || template?.description || '',
          content: metadata.content || template?.content || '',
          category: (metadata.category as MarketplaceCategory) || 'chat',
          tags: metadata.tags || template?.tags || [],
          variables: metadata.variables || template?.variables || [],
          targets: metadata.targets || template?.targets || ['chat'],
          author: metadata.author || { id: 'local-user', name: 'You' },
          source: 'user',
          qualityTier: 'community',
          version: '1.0.0',
          versions: [],
          stats: { downloads: 0, weeklyDownloads: 0, favorites: 0, shares: 0, views: 0 },
          rating: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
          reviewCount: 0,
          icon: metadata.icon,
          color: metadata.color,
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        };

        set((state) => ({
          prompts: { ...state.prompts, [marketplaceId]: marketplacePrompt },
          userActivity: {
            ...state.userActivity,
            published: [...state.userActivity.published, marketplaceId],
          },
        }));

        return marketplaceId;
      },

      unpublishPrompt: async (marketplaceId: string) => {
        set((state) => {
          const newPrompts = { ...state.prompts };
          delete newPrompts[marketplaceId];
          return {
            prompts: newPrompts,
            featuredIds: state.featuredIds.filter((id) => id !== marketplaceId),
            trendingIds: state.trendingIds.filter((id) => id !== marketplaceId),
            userActivity: {
              ...state.userActivity,
              published: state.userActivity.published.filter((id) => id !== marketplaceId),
            },
          };
        });
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
          reviews: {},
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

        // Build trending from top-downloaded prompts
        const trendingIds = Object.entries(samplePrompts)
          .sort(([, a], [, b]) => b.stats.weeklyDownloads - a.stats.weeklyDownloads)
          .slice(0, 6)
          .map(([id]) => id);

        // Build collections with actual prompt IDs matched by category
        const sampleCollections: Record<string, PromptCollection> = {};
        SAMPLE_MARKETPLACE_COLLECTIONS.forEach((sample) => {
          const collectionId = nanoid();
          const matchingPromptIds = Object.entries(samplePrompts)
            .filter(([, p]) => {
              if (sample.categoryFilter) {
                return p.category === sample.categoryFilter;
              }
              return sample.tags?.some((tag) => p.tags.includes(tag));
            })
            .map(([id]) => id);

          sampleCollections[collectionId] = {
            ...sample,
            id: collectionId,
            promptIds: matchingPromptIds,
            promptCount: matchingPromptIds.length,
            createdAt: now,
            updatedAt: now,
          };
        });

        set({
          prompts: samplePrompts,
          collections: sampleCollections,
          featuredIds,
          trendingIds,
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
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
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
