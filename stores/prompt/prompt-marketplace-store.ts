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
  PromptQualityTier,
} from '@/types/content/prompt-marketplace';
import {
  applyMarketplaceFilters,
  buildMarketplaceFacets,
  buildPromptMarketplaceExchangePayload,
  isPublishableMarketplaceCategory,
  normalizeMarketplacePrompt,
  normalizeTags,
  sortMarketplacePrompts,
  type PromptMarketplaceDataSource,
  type PromptMarketplaceExchangePayload,
  type PromptMarketplaceImportConflictStrategy,
  type PromptMarketplaceImportItemResult,
  type PromptMarketplaceImportReport,
  type PromptMarketplaceErrorCategory,
  type PromptMarketplaceOperationState,
  type PromptMarketplaceOperationStatus,
} from '@/lib/prompts/marketplace-utils';
import { promptMarketplaceRepository } from '@/lib/prompts/marketplace';
import { normalizePromptMarketplaceError } from '@/lib/prompts/marketplace-error-adapter';
import { usePromptTemplateStore } from './prompt-template-store';

interface PromptMarketplaceBrowseViewState {
  query: string;
  category: MarketplaceCategory | 'all';
  sortBy: NonNullable<MarketplaceSearchFilters['sortBy']>;
  minRating: number;
  selectedTiers: PromptQualityTier[];
  page: number;
  pageSize: number;
  selectedPromptId: string | null;
  detailOpen: boolean;
  scrollOffset: number;
}

interface PromptMarketplaceInstallRetryContext {
  marketplaceId: string;
  attemptCount: number;
  stage: 'create-template' | 'persist-installation';
  localTemplateId?: string;
  message: string;
  category: PromptMarketplaceErrorCategory;
  updatedAt: Date;
}

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
  sourceState: 'unknown' | PromptMarketplaceDataSource;
  sourceWarning: string | null;
  remoteFirstEnabled: boolean;
  operationStates: Record<string, PromptMarketplaceOperationState>;
  browseViewState: PromptMarketplaceBrowseViewState;
  installRetryContexts: Record<string, PromptMarketplaceInstallRetryContext>;

  // Actions - Fetching
  refreshCatalog: () => Promise<void>;
  fetchFeatured: () => void;
  fetchTrending: () => void;
  fetchByCategory: (category: MarketplaceCategory) => MarketplacePrompt[];
  searchPrompts: (filters?: MarketplaceSearchFilters) => MarketplaceSearchResult;
  getPromptById: (id: string) => MarketplacePrompt | undefined;
  fetchPromptDetails: (id: string) => MarketplacePrompt | null;
  fetchPromptReviews: (promptId: string, page?: number) => PromptReview[];

  // Actions - Browse state
  setBrowseQuery: (query: string) => void;
  setBrowseCategory: (category: MarketplaceCategory | 'all') => void;
  setBrowseSortBy: (sortBy: NonNullable<MarketplaceSearchFilters['sortBy']>) => void;
  setBrowseMinRating: (minRating: number) => void;
  toggleBrowseQualityTier: (tier: PromptQualityTier) => void;
  clearBrowseFilters: () => void;
  setBrowsePage: (page: number) => void;
  setBrowseScrollOffset: (offset: number) => void;
  setSelectedPrompt: (promptId: string | null) => void;
  setDetailOpen: (open: boolean) => void;

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

  // Actions - Import/Export
  exportInstalledPrompts: () => PromptMarketplaceExchangePayload;
  importPrompts: (
    payload: string,
    strategy?: PromptMarketplaceImportConflictStrategy
  ) => Promise<PromptMarketplaceImportReport>;

  // Actions - Collections
  fetchCollections: () => Promise<PromptCollection[]>;
  followCollection: (collectionId: string) => void;
  unfollowCollection: (collectionId: string) => void;

  // Utility
  clearCache: () => void;
  setError: (error: string | null) => void;
  initializeSampleData: () => void;
  setRemoteFirstEnabled: (enabled: boolean) => void;
  getOperationState: (operationKey: string) => PromptMarketplaceOperationState | undefined;
  clearOperationState: (operationKey: string) => void;
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

const remoteFirstDefault = process.env.NEXT_PUBLIC_PROMPT_MARKETPLACE_REMOTE_FIRST === 'true';
const defaultBrowseViewState: PromptMarketplaceBrowseViewState = {
  query: '',
  category: 'all',
  sortBy: 'downloads',
  minRating: 0,
  selectedTiers: [],
  page: 1,
  pageSize: 20,
  selectedPromptId: null,
  detailOpen: false,
  scrollOffset: 0,
};

function createOperationState(
  status: PromptMarketplaceOperationStatus,
  error?: string,
  options?: { category?: PromptMarketplaceErrorCategory; retryable?: boolean; code?: string }
): PromptMarketplaceOperationState {
  return {
    status,
    error,
    category: options?.category,
    retryable: options?.retryable,
    code: options?.code,
    updatedAt: new Date(),
  };
}

function deriveBrowseFilters(state: PromptMarketplaceBrowseViewState): MarketplaceSearchFilters {
  return {
    query: state.query || undefined,
    category: state.category === 'all' ? undefined : state.category,
    sortBy: state.sortBy,
    minRating: state.minRating > 0 ? state.minRating : undefined,
    qualityTier: state.selectedTiers.length > 0 ? state.selectedTiers : undefined,
  };
}

function findInstallation(
  installed: InstalledMarketplacePrompt[],
  marketplaceId: string
): InstalledMarketplacePrompt | undefined {
  return installed.find((item) => item.marketplaceId === marketplaceId);
}

function createInstallationRecord(
  marketplaceId: string,
  localTemplateId: string,
  version: string
): InstalledMarketplacePrompt {
  return {
    id: nanoid(),
    marketplaceId,
    localTemplateId,
    installedVersion: version,
    latestVersion: version,
    hasUpdate: false,
    autoUpdate: false,
    installedAt: new Date(),
  };
}

function mergeCatalogPrompts(
  currentPrompts: Record<string, MarketplacePrompt>,
  incomingPrompts: Record<string, MarketplacePrompt>,
  userActivity: MarketplaceUserActivity
): Record<string, MarketplacePrompt> {
  const merged = { ...incomingPrompts };
  const keepPromptIds = new Set<string>([
    ...userActivity.published,
    ...userActivity.favorites,
    ...userActivity.installed.map((item) => item.marketplaceId),
    ...userActivity.recentlyViewed.map((item) => item.promptId),
  ]);

  keepPromptIds.forEach((promptId) => {
    const existing = currentPrompts[promptId];
    if (existing && !merged[promptId]) {
      merged[promptId] = existing;
    }
  });

  return merged;
}

function nextDuplicatePromptId(baseId: string, prompts: Record<string, MarketplacePrompt>): string {
  let candidate = `${baseId}-import-${nanoid(6)}`;
  while (prompts[candidate]) {
    candidate = `${baseId}-import-${nanoid(6)}`;
  }
  return candidate;
}

function createTemplateFromMarketplacePrompt(prompt: MarketplacePrompt): string {
  const templateStore = usePromptTemplateStore.getState();
  const result = templateStore.createTemplate({
    name: prompt.name,
    description: prompt.description,
    content: prompt.content,
    category: prompt.category,
    tags: normalizeTags([...(prompt.tags || []), 'marketplace']),
    variables: prompt.variables,
    targets: prompt.targets,
    source: 'imported',
    meta: {
      icon: prompt.icon,
      color: prompt.color,
    },
  });

  if (!result.ok || !result.data) {
    throw new Error(result.message || 'Failed to create local template from marketplace prompt');
  }

  return result.data.id;
}

function createImportReport(
  _strategy: PromptMarketplaceImportConflictStrategy
): PromptMarketplaceImportReport {
  return {
    success: true,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    items: [],
  };
}

function pushImportItem(
  report: PromptMarketplaceImportReport,
  item: Omit<PromptMarketplaceImportItemResult, 'strategy'>,
  strategy: PromptMarketplaceImportConflictStrategy
): void {
  report.items.push({
    ...item,
    strategy,
  });
}

export const usePromptMarketplaceStore = create<PromptMarketplaceState>()(
  persist(
    (set, get) => {
      const updateOperationState = (
        operationKey: string,
        status: PromptMarketplaceOperationStatus,
        error?: string,
        options?: { category?: PromptMarketplaceErrorCategory; retryable?: boolean; code?: string }
      ) => {
        set((state) => ({
          operationStates: {
            ...state.operationStates,
            [operationKey]: createOperationState(status, error, options),
          },
        }));
      };

      const setOperationError = (
        operationKey: string,
        error: unknown,
        fallbackMessage: string = 'Unknown marketplace error'
      ) => {
        const normalized = normalizePromptMarketplaceError(error, fallbackMessage);
        updateOperationState(operationKey, 'error', normalized.message, {
          category: normalized.category,
          retryable: normalized.retryable,
          code: normalized.code,
        });
        return normalized;
      };

      return {
      prompts: {},
      collections: {},
      featuredIds: [],
      trendingIds: [],
      reviews: {},
      userActivity: initialUserActivity,
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      sourceState: 'unknown',
      sourceWarning: null,
      remoteFirstEnabled: remoteFirstDefault,
      operationStates: {},
      browseViewState: defaultBrowseViewState,
      installRetryContexts: {},

      // Fetching Actions
      refreshCatalog: async () => {
        updateOperationState('list', 'loading');
        set({ isLoading: true, error: null });
        try {
          const catalog = await promptMarketplaceRepository.getCatalog({
            preferRemote: get().remoteFirstEnabled,
          });

          set((state) => ({
            prompts: mergeCatalogPrompts(state.prompts, catalog.prompts, state.userActivity),
            collections: catalog.collections,
            featuredIds: catalog.featuredIds,
            trendingIds: catalog.trendingIds,
            sourceState: catalog.sourceState,
            sourceWarning: catalog.warning || null,
            isLoading: false,
            error: null,
            lastSyncedAt: new Date(),
          }));
          updateOperationState('list', 'success');
        } catch (error) {
          const normalized = setOperationError('list', error);
          const fallbackCatalog = promptMarketplaceRepository.getFallbackCatalog();
          set((state) => ({
            prompts: mergeCatalogPrompts(
              state.prompts,
              fallbackCatalog.prompts,
              state.userActivity
            ),
            collections: fallbackCatalog.collections,
            featuredIds: fallbackCatalog.featuredIds,
            trendingIds: fallbackCatalog.trendingIds,
            sourceState: 'fallback',
            sourceWarning: normalized.message,
            isLoading: false,
            error: normalized.message,
            lastSyncedAt: new Date(),
          }));
        }
      },

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

      searchPrompts: (filters?: MarketplaceSearchFilters) => {
        const resolvedFilters = filters || deriveBrowseFilters(get().browseViewState);
        const filtered = applyMarketplaceFilters(Object.values(get().prompts), resolvedFilters);
        const sorted = sortMarketplacePrompts(
          filtered,
          resolvedFilters.sortBy,
          !!resolvedFilters.query
        );
        const facets = buildMarketplaceFacets(sorted);
        const page = get().browseViewState.page;
        const pageSize = get().browseViewState.pageSize;

        return {
          prompts: sorted,
          total: sorted.length,
          page,
          pageSize,
          hasMore: page * pageSize < sorted.length,
          filters: resolvedFilters,
          facets,
        };
      },

      getPromptById: (id: string) => {
        return get().prompts[id];
      },

      fetchPromptDetails: (id: string) => {
        const operationKey = `detail:${id}`;
        updateOperationState(operationKey, 'loading');
        const existing = get().prompts[id];
        if (existing) {
          updateOperationState(operationKey, 'success');
          return existing;
        }

        if (get().remoteFirstEnabled) {
          void promptMarketplaceRepository
            .getPromptById(id, { preferRemote: true })
            .then((remotePrompt) => {
              if (!remotePrompt) {
                updateOperationState(operationKey, 'error', 'Prompt not found', {
                  category: 'not_found',
                  retryable: false,
                  code: 'REMOTE_DETAIL_MISS',
                });
                return;
              }

              set((state) => ({
                prompts: {
                  ...state.prompts,
                  [remotePrompt.id]: remotePrompt,
                },
                sourceState: 'remote',
                sourceWarning: null,
              }));
              updateOperationState(operationKey, 'success');
            })
            .catch((error) => {
              const normalized = setOperationError(operationKey, error);
              set({ sourceWarning: normalized.message });
            });
        } else {
          updateOperationState(
            operationKey,
            'error',
            'Prompt detail unavailable in local catalog',
            { category: 'not_found', retryable: false, code: 'LOCAL_DETAIL_MISS' }
          );
        }

        return null;
      },

      fetchPromptReviews: (promptId: string, _page = 1) => {
        const localReviews = get().reviews[promptId];
        if (localReviews) {
          updateOperationState(`reviews:${promptId}`, 'success');
          return localReviews;
        }

        if (get().remoteFirstEnabled) {
          updateOperationState(`reviews:${promptId}`, 'loading');
          void promptMarketplaceRepository
            .getPromptReviews(promptId, 1, { preferRemote: true })
            .then((remoteReviews) => {
              set((state) => ({
                reviews: {
                  ...state.reviews,
                  [promptId]: remoteReviews,
                },
              }));
              updateOperationState(`reviews:${promptId}`, 'success');
            })
            .catch((error) => {
              const normalized = setOperationError(`reviews:${promptId}`, error);
              set({ sourceWarning: normalized.message });
            });
        }

        return [];
      },

      // Browse state actions
      setBrowseQuery: (query: string) => {
        set((state) => ({
          browseViewState: {
            ...state.browseViewState,
            query,
            page: 1,
          },
        }));
      },

      setBrowseCategory: (category: MarketplaceCategory | 'all') => {
        set((state) => ({
          browseViewState: {
            ...state.browseViewState,
            category,
            page: 1,
          },
        }));
      },

      setBrowseSortBy: (sortBy: NonNullable<MarketplaceSearchFilters['sortBy']>) => {
        set((state) => ({
          browseViewState: {
            ...state.browseViewState,
            sortBy,
            page: 1,
          },
        }));
      },

      setBrowseMinRating: (minRating: number) => {
        set((state) => ({
          browseViewState: {
            ...state.browseViewState,
            minRating,
            page: 1,
          },
        }));
      },

      toggleBrowseQualityTier: (tier: PromptQualityTier) => {
        set((state) => {
          const selectedTiers = state.browseViewState.selectedTiers.includes(tier)
            ? state.browseViewState.selectedTiers.filter((value) => value !== tier)
            : [...state.browseViewState.selectedTiers, tier];
          return {
            browseViewState: {
              ...state.browseViewState,
              selectedTiers,
              page: 1,
            },
          };
        });
      },

      clearBrowseFilters: () => {
        set((state) => ({
          browseViewState: {
            ...state.browseViewState,
            query: '',
            category: 'all',
            sortBy: 'downloads',
            minRating: 0,
            selectedTiers: [],
            page: 1,
          },
        }));
      },

      setBrowsePage: (page: number) => {
        set((state) => ({
          browseViewState: {
            ...state.browseViewState,
            page: Math.max(1, page),
          },
        }));
      },

      setBrowseScrollOffset: (offset: number) => {
        set((state) => ({
          browseViewState: {
            ...state.browseViewState,
            scrollOffset: Math.max(0, Math.round(offset)),
          },
        }));
      },

      setSelectedPrompt: (promptId: string | null) => {
        set((state) => ({
          browseViewState: {
            ...state.browseViewState,
            selectedPromptId: promptId,
          },
        }));
      },

      setDetailOpen: (open: boolean) => {
        set((state) => ({
          browseViewState: {
            ...state.browseViewState,
            detailOpen: open,
          },
        }));
      },

      // Installation Actions
      installPrompt: async (prompt: MarketplacePrompt) => {
        const operationKey = `install:${prompt.id}`;
        const operationState = get().operationStates[operationKey];
        if (operationState?.status === 'loading') {
          throw new Error('Prompt installation is already in progress');
        }

        updateOperationState(operationKey, 'loading');
        let localTemplateId: string | undefined;

        try {
          const existingInstallation = findInstallation(get().userActivity.installed, prompt.id);
          if (existingInstallation) {
            set((state) => {
              const nextContexts = { ...state.installRetryContexts };
              delete nextContexts[prompt.id];
              return { installRetryContexts: nextContexts };
            });
            updateOperationState(operationKey, 'success');
            return existingInstallation.localTemplateId;
          }

          localTemplateId = createTemplateFromMarketplacePrompt(prompt);
          const installation = createInstallationRecord(prompt.id, localTemplateId, prompt.version);

          set((state) => {
            const promptInStore = state.prompts[prompt.id] || prompt;
            const nextContexts = { ...state.installRetryContexts };
            delete nextContexts[prompt.id];
            return {
              prompts: {
                ...state.prompts,
                [prompt.id]: {
                  ...promptInStore,
                  stats: {
                    ...promptInStore.stats,
                    downloads: promptInStore.stats.downloads + 1,
                  },
                },
              },
              userActivity: {
                ...state.userActivity,
                installed: [...state.userActivity.installed, installation],
              },
              installRetryContexts: nextContexts,
            };
          });

          updateOperationState(operationKey, 'success');
          return localTemplateId;
        } catch (error) {
          const normalized = setOperationError(operationKey, error);
          set((state) => ({
            installRetryContexts: {
              ...state.installRetryContexts,
              [prompt.id]: {
                marketplaceId: prompt.id,
                attemptCount: (state.installRetryContexts[prompt.id]?.attemptCount || 0) + 1,
                stage: localTemplateId ? 'persist-installation' : 'create-template',
                localTemplateId,
                message: normalized.message,
                category: normalized.category,
                updatedAt: new Date(),
              },
            },
          }));
          throw error;
        }
      },

      uninstallPrompt: (marketplaceId: string) => {
        const operationKey = `uninstall:${marketplaceId}`;
        updateOperationState(operationKey, 'loading');

        try {
          const installation = findInstallation(get().userActivity.installed, marketplaceId);
          if (!installation) {
            updateOperationState(operationKey, 'success');
            return;
          }

          const templateStore = usePromptTemplateStore.getState();
          const deleteResult = templateStore.deleteTemplate(installation.localTemplateId);
          if (!deleteResult.ok) {
            throw new Error(deleteResult.message || 'Failed to delete installed prompt template');
          }

          set((state) => ({
            userActivity: {
              ...state.userActivity,
              installed: state.userActivity.installed.filter(
                (item) => item.marketplaceId !== marketplaceId
              ),
            },
            installRetryContexts: Object.fromEntries(
              Object.entries(state.installRetryContexts).filter(([id]) => id !== marketplaceId)
            ),
          }));

          updateOperationState(operationKey, 'success');
        } catch (error) {
          setOperationError(operationKey, error);
          throw error;
        }
      },

      updateInstalledPrompt: async (marketplaceId: string) => {
        const operationKey = `update:${marketplaceId}`;
        updateOperationState(operationKey, 'loading');

        try {
          const { prompts, userActivity } = get();
          const installation = findInstallation(userActivity.installed, marketplaceId);
          if (!installation) {
            updateOperationState(operationKey, 'success');
            return;
          }

          const latestPrompt =
            (await promptMarketplaceRepository.getPromptById(marketplaceId, {
              preferRemote: get().remoteFirstEnabled,
            })) || prompts[marketplaceId];

          if (!latestPrompt) {
            throw new Error('Prompt update payload is missing');
          }

          const templateStore = usePromptTemplateStore.getState();
          const updateResult = templateStore.updateTemplate(installation.localTemplateId, {
            name: latestPrompt.name,
            description: latestPrompt.description,
            content: latestPrompt.content,
            category: latestPrompt.category,
            tags: normalizeTags([...(latestPrompt.tags || []), 'marketplace']),
            variables: latestPrompt.variables,
            targets: latestPrompt.targets,
            meta: {
              icon: latestPrompt.icon,
              color: latestPrompt.color,
            },
          });
          if (!updateResult.ok) {
            throw new Error(updateResult.message || 'Failed to update installed prompt template');
          }

          set((state) => ({
            prompts: {
              ...state.prompts,
              [marketplaceId]: latestPrompt,
            },
            userActivity: {
              ...state.userActivity,
              installed: state.userActivity.installed.map((item) =>
                item.marketplaceId === marketplaceId
                  ? {
                      ...item,
                      installedVersion: latestPrompt.version,
                      latestVersion: latestPrompt.version,
                      hasUpdate: false,
                      lastSyncedAt: new Date(),
                    }
                  : item
              ),
            },
          }));

          updateOperationState(operationKey, 'success');
        } catch (error) {
          setOperationError(operationKey, error);
          throw error;
        }
      },

      checkForUpdates: async () => {
        const operationKey = 'check-updates';
        updateOperationState(operationKey, 'loading');

        try {
          const { prompts, userActivity } = get();
          const withUpdates: InstalledMarketplacePrompt[] = [];
          const updates = await promptMarketplaceRepository.checkForUpdates(
            userActivity.installed,
            prompts,
            {
              preferRemote: get().remoteFirstEnabled,
            }
          );
          const updatesByPromptId = new Map(
            updates.map((update) => [update.marketplaceId, update.latestVersion])
          );

          const updatedInstalled = userActivity.installed.map((installation) => {
            const latestVersion = updatesByPromptId.get(installation.marketplaceId);
            if (!latestVersion || latestVersion === installation.installedVersion) {
              return {
                ...installation,
                latestVersion: latestVersion || installation.latestVersion,
                hasUpdate: false,
              };
            }

            const updated = {
              ...installation,
              latestVersion,
              hasUpdate: true,
            };
            withUpdates.push(updated);
            return updated;
          });

          set((state) => ({
            userActivity: {
              ...state.userActivity,
              installed: updatedInstalled,
            },
          }));

          updateOperationState(operationKey, 'success');
          return withUpdates;
        } catch (error) {
          setOperationError(operationKey, error);
          throw error;
        }
      },

      getInstalledPrompts: () => {
        return get().userActivity.installed;
      },

      isPromptInstalled: (marketplaceId: string) => {
        return get().userActivity.installed.some((i) => i.marketplaceId === marketplaceId);
      },

      // User Activity Actions
      addToFavorites: (promptId: string) => {
        set((state) => {
          if (state.userActivity.favorites.includes(promptId)) {
            return state;
          }

          const prompt = state.prompts[promptId];
          return {
            prompts: prompt
              ? {
                  ...state.prompts,
                  [promptId]: {
                    ...prompt,
                    stats: {
                      ...prompt.stats,
                      favorites: prompt.stats.favorites + 1,
                    },
                  },
                }
              : state.prompts,
            userActivity: {
              ...state.userActivity,
              favorites: [...state.userActivity.favorites, promptId],
            },
          };
        });
      },

      removeFromFavorites: (promptId: string) => {
        set((state) => {
          const prompt = state.prompts[promptId];
          return {
            prompts: prompt
              ? {
                  ...state.prompts,
                  [promptId]: {
                    ...prompt,
                    stats: {
                      ...prompt.stats,
                      favorites: Math.max(0, prompt.stats.favorites - 1),
                    },
                  },
                }
              : state.prompts,
            userActivity: {
              ...state.userActivity,
              favorites: state.userActivity.favorites.filter((id) => id !== promptId),
            },
          };
        });
      },

      isFavorite: (promptId: string) => {
        return get().userActivity.favorites.includes(promptId);
      },

      recordView: (promptId: string) => {
        set((state) => {
          const filtered = state.userActivity.recentlyViewed.filter((item) => item.promptId !== promptId);
          const prompt = state.prompts[promptId];
          return {
            prompts: prompt
              ? {
                  ...state.prompts,
                  [promptId]: {
                    ...prompt,
                    stats: {
                      ...prompt.stats,
                      views: prompt.stats.views + 1,
                    },
                  },
                }
              : state.prompts,
            userActivity: {
              ...state.userActivity,
              recentlyViewed: [{ promptId, viewedAt: new Date() }, ...filtered].slice(0, 50),
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
        const operationKey = `review:${promptId}`;
        updateOperationState(operationKey, 'loading');

        try {
          if (get().userActivity.reviewed.includes(promptId)) {
            throw new Error('You already reviewed this prompt.');
          }

          const review = await promptMarketplaceRepository.submitReview(promptId, rating, content, {
            preferRemote: get().remoteFirstEnabled,
          });

          set((state) => {
            const promptReviews = state.reviews[promptId] || [];
            const newReviews = [review, ...promptReviews];
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

          updateOperationState(operationKey, 'success');
        } catch (error) {
          setOperationError(operationKey, error);
          throw error;
        }
      },

      markReviewHelpful: async (reviewId: string) => {
        const operationKey = `review-helpful:${reviewId}`;
        updateOperationState(operationKey, 'loading');

        try {
          await promptMarketplaceRepository.markReviewHelpful(reviewId, {
            preferRemote: get().remoteFirstEnabled,
          });

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

          updateOperationState(operationKey, 'success');
        } catch (error) {
          setOperationError(operationKey, error);
          throw error;
        }
      },

      // Publishing Actions
      publishPrompt: async (templateId: string, metadata: Partial<MarketplacePrompt>) => {
        const operationKey = `publish:${templateId}`;
        updateOperationState(operationKey, 'loading');

        try {
          const templateStore = usePromptTemplateStore.getState();
          const template = templateStore.getTemplate(templateId);
          if (!template) {
            throw new Error('Template not found.');
          }

          const name = metadata.name?.trim() || template.name.trim();
          const description = metadata.description?.trim() || template.description?.trim() || '';
          const content = metadata.content || template.content || '';
          const category =
            (metadata.category as MarketplaceCategory) ||
            (template.category as MarketplaceCategory) ||
            'chat';

          if (!name) {
            throw new Error('Prompt name is required.');
          }
          if (!description) {
            throw new Error('Prompt description is required.');
          }
          if (!content.trim()) {
            throw new Error('Prompt content is required.');
          }
          if (!isPublishableMarketplaceCategory(category)) {
            throw new Error('Selected category cannot be published.');
          }

          const submission = {
            templateId,
            name,
            description,
            content,
            category,
            subcategory: metadata.subcategory,
            tags: normalizeTags(metadata.tags || template.tags || []),
            variables: metadata.variables || template.variables || [],
            targets: metadata.targets || template.targets || ['chat'],
            icon: metadata.icon,
            color: metadata.color,
            exampleOutput: metadata.exampleOutput,
            compatibleModels: metadata.compatibleModels,
            isNSFW: metadata.isNSFW,
          };

          const publishedPrompt = await promptMarketplaceRepository.publishPrompt(submission, {
            preferRemote: get().remoteFirstEnabled,
          });
          const normalizedPrompt = normalizeMarketplacePrompt({
            ...publishedPrompt,
            source: 'user',
          });

          set((state) => ({
            prompts: { ...state.prompts, [normalizedPrompt.id]: normalizedPrompt },
            userActivity: {
              ...state.userActivity,
              published: state.userActivity.published.includes(normalizedPrompt.id)
                ? state.userActivity.published
                : [...state.userActivity.published, normalizedPrompt.id],
            },
          }));

          updateOperationState(operationKey, 'success');
          return normalizedPrompt.id;
        } catch (error) {
          setOperationError(operationKey, error);
          throw error;
        }
      },

      unpublishPrompt: async (marketplaceId: string) => {
        const operationKey = `unpublish:${marketplaceId}`;
        updateOperationState(operationKey, 'loading');

        try {
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
          updateOperationState(operationKey, 'success');
        } catch (error) {
          setOperationError(operationKey, error);
          throw error;
        }
      },

      // Import/Export actions
      exportInstalledPrompts: () => {
        const operationKey = 'export';
        updateOperationState(operationKey, 'loading');

        try {
          const installedIds = new Set(
            get().userActivity.installed.map((installation) => installation.marketplaceId)
          );
          const prompts = Object.values(get().prompts).filter((prompt) => installedIds.has(prompt.id));
          const payload = buildPromptMarketplaceExchangePayload(prompts);
          updateOperationState(operationKey, 'success');
          return payload;
        } catch (error) {
          setOperationError(operationKey, error);
          throw error;
        }
      },

      importPrompts: async (payload: string, strategy = 'skip') => {
        const operationKey = 'import';
        updateOperationState(operationKey, 'loading');

        const report = createImportReport(strategy);
        const parsed = promptMarketplaceRepository.validateImportPayload(payload);

        if (!parsed.ok || !parsed.payload) {
          report.success = false;
          report.failed = parsed.errors.length || 1;
          report.errors = parsed.errors.length > 0 ? parsed.errors : ['Invalid import payload'];
          updateOperationState(operationKey, 'error', report.errors[0]);
          return report;
        }

        const templateStore = usePromptTemplateStore.getState();

        for (const importPrompt of parsed.payload.prompts) {
          const promptName = importPrompt.name?.trim() || importPrompt.id;

          try {
            const normalizedPrompt = normalizeMarketplacePrompt({
              ...importPrompt,
              id: importPrompt.id,
              source: 'marketplace',
            });
            const currentState = get();
            const existingInstallation = findInstallation(
              currentState.userActivity.installed,
              normalizedPrompt.id
            );

            if (existingInstallation && strategy === 'skip') {
              report.skipped += 1;
              pushImportItem(
                report,
                {
                  sourcePromptId: normalizedPrompt.id,
                  targetPromptId: normalizedPrompt.id,
                  promptName,
                  status: 'skipped',
                  message: 'Prompt already installed',
                },
                strategy
              );
              continue;
            }

            if (existingInstallation && strategy === 'overwrite') {
              const overwriteResult = templateStore.updateTemplate(existingInstallation.localTemplateId, {
                name: normalizedPrompt.name,
                description: normalizedPrompt.description,
                content: normalizedPrompt.content,
                category: normalizedPrompt.category,
                tags: normalizeTags([...(normalizedPrompt.tags || []), 'marketplace']),
                variables: normalizedPrompt.variables,
                targets: normalizedPrompt.targets,
                meta: {
                  icon: normalizedPrompt.icon,
                  color: normalizedPrompt.color,
                },
              });
              if (!overwriteResult.ok) {
                throw new Error(overwriteResult.message || 'Failed to overwrite installed prompt');
              }

              set((state) => ({
                prompts: {
                  ...state.prompts,
                  [normalizedPrompt.id]: normalizedPrompt,
                },
                userActivity: {
                  ...state.userActivity,
                  installed: state.userActivity.installed.map((installation) =>
                    installation.marketplaceId === normalizedPrompt.id
                      ? {
                          ...installation,
                          installedVersion: normalizedPrompt.version,
                          latestVersion: normalizedPrompt.version,
                          hasUpdate: false,
                          lastSyncedAt: new Date(),
                        }
                      : installation
                  ),
                },
              }));

              report.imported += 1;
              pushImportItem(
                report,
                {
                  sourcePromptId: normalizedPrompt.id,
                  targetPromptId: normalizedPrompt.id,
                  promptName,
                  status: 'imported',
                  message: 'Existing installation overwritten',
                },
                strategy
              );
              continue;
            }

            const targetPrompt =
              existingInstallation && strategy === 'duplicate'
                ? normalizeMarketplacePrompt({
                    ...normalizedPrompt,
                    id: nextDuplicatePromptId(normalizedPrompt.id, currentState.prompts),
                    name: `${normalizedPrompt.name} (Imported)`,
                  })
                : normalizedPrompt;

            const localTemplateId = createTemplateFromMarketplacePrompt(targetPrompt);
            const installation = createInstallationRecord(
              targetPrompt.id,
              localTemplateId,
              targetPrompt.version
            );

            set((state) => {
              const promptInStore = state.prompts[targetPrompt.id] || targetPrompt;
              return {
                prompts: {
                  ...state.prompts,
                  [targetPrompt.id]: {
                    ...promptInStore,
                    stats: {
                      ...promptInStore.stats,
                      downloads: promptInStore.stats.downloads + 1,
                    },
                  },
                },
                userActivity: {
                  ...state.userActivity,
                  installed: [...state.userActivity.installed, installation],
                },
              };
            });

            report.imported += 1;
            pushImportItem(
              report,
              {
                sourcePromptId: normalizedPrompt.id,
                targetPromptId: targetPrompt.id,
                promptName,
                status: 'imported',
                message:
                  existingInstallation && strategy === 'duplicate'
                    ? 'Imported as duplicate'
                    : 'Imported',
              },
              strategy
            );
          } catch (error) {
            report.failed += 1;
            report.success = false;
            const message = normalizePromptMarketplaceError(error).message;
            report.errors.push(`${promptName}: ${message}`);
            pushImportItem(
              report,
              {
                sourcePromptId: importPrompt.id,
                promptName,
                status: 'failed',
                message,
              },
              strategy
            );
          }
        }

        if (report.failed > 0) {
          report.success = false;
          updateOperationState(
            operationKey,
            'error',
            report.errors[0] || `${report.failed} prompts failed to import`
          );
        } else {
          updateOperationState(operationKey, 'success');
        }

        return report;
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
          sourceState: 'unknown',
          sourceWarning: null,
          operationStates: {},
          browseViewState: defaultBrowseViewState,
          installRetryContexts: {},
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      initializeSampleData: () => {
        const fallbackCatalog = promptMarketplaceRepository.getFallbackCatalog();
        set((state) => ({
          prompts: mergeCatalogPrompts(state.prompts, fallbackCatalog.prompts, state.userActivity),
          collections: fallbackCatalog.collections,
          featuredIds: fallbackCatalog.featuredIds,
          trendingIds: fallbackCatalog.trendingIds,
          sourceState: 'fallback',
          sourceWarning: null,
          lastSyncedAt: new Date(),
        }));
      },

      setRemoteFirstEnabled: (enabled: boolean) => {
        set({ remoteFirstEnabled: enabled });
      },

      getOperationState: (operationKey: string) => get().operationStates[operationKey],

      clearOperationState: (operationKey: string) => {
        set((state) => {
          const next = { ...state.operationStates };
          delete next[operationKey];
          return { operationStates: next };
        });
      },
    };
    },
    {
      name: 'cognia-prompt-marketplace',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        remoteFirstEnabled: state.remoteFirstEnabled,
        browseViewState: {
          ...state.browseViewState,
          selectedPromptId: null,
          detailOpen: false,
        },
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
          if (state.browseViewState) {
            state.browseViewState = {
              ...defaultBrowseViewState,
              ...state.browseViewState,
              selectedTiers: Array.isArray(state.browseViewState.selectedTiers)
                ? state.browseViewState.selectedTiers
                : [],
              selectedPromptId: null,
              detailOpen: false,
            };
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
export const selectBrowseViewState = (state: PromptMarketplaceState) => state.browseViewState;
export const selectPromptMarketplaceOperationState = (
  state: PromptMarketplaceState,
  operationKey: string
) => state.operationStates[operationKey];

export default usePromptMarketplaceStore;
