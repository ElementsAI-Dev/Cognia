/**
 * Skills Marketplace Store
 * Zustand state management for SkillsMP marketplace
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createLogger } from '@/lib/logger';
import type {
  SkillsMarketplaceItem,
  SkillsMarketplaceFilters,
  SkillInstallStatus,
  SkillsMarketplaceDetail,
  SkillsMarketplaceErrorCategory,
  SkillsMarketplaceOperationDiagnostic,
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
import { parseSkillMd, inferCategoryFromContent, extractTagsFromContent } from '@/lib/skills/parser';
import { useSkillStore } from './skill-store';
import type { Skill } from '@/types/system/skill';
import { buildCanonicalSkillId, normalizeSkillName } from '@/lib/skills/reconciliation';
import {
  buildNativeLinkedSkillUpdate,
  promoteSkillToNative,
} from '@/lib/skills/skill-actions';
import { isNativeSkillAvailable } from '@/lib/native/skill';

const marketplaceStoreLogger = createLogger('skills:marketplace-store');

interface InstallRetryMetadata {
  skillId: string;
  directory: string;
  reason: string;
}

interface MarketplaceMatchResult {
  skill: Skill | null;
  reason: 'marketplace-id' | 'canonical' | 'legacy-name' | 'none';
}

const DISCOVERY_RESET_KEYS: Array<keyof SkillsMarketplaceFilters> = [
  'query',
  'sortBy',
  'useAiSearch',
  'limit',
  'category',
  'tags',
];

function normalizeMarketplaceId(id: string): string {
  return id.trim().toLowerCase();
}

function buildMarketplaceCanonicalId(itemId: string): string {
  return buildCanonicalSkillId({
    source: 'marketplace',
    marketplaceSkillId: itemId,
  });
}

function getMarketplaceNameCandidates(item: SkillsMarketplaceItem): string[] {
  const candidates = new Set<string>();
  const fromName = normalizeSkillName(item.name);
  const fromDirectory = normalizeSkillName(item.directory.split('/').pop() || '');
  const fromIdTail = normalizeSkillName(item.id.split('/').pop() || '');

  if (fromName) candidates.add(fromName);
  if (fromDirectory) candidates.add(fromDirectory);
  if (fromIdTail) candidates.add(fromIdTail);

  return Array.from(candidates);
}

function findSkillForMarketplaceItem(skills: Skill[], item: SkillsMarketplaceItem): MarketplaceMatchResult {
  const normalizedId = normalizeMarketplaceId(item.id);
  const canonicalTarget = buildMarketplaceCanonicalId(item.id);

  const byMarketplaceId = skills.find(
    (skill) => normalizeMarketplaceId(skill.marketplaceSkillId || '') === normalizedId
  );
  if (byMarketplaceId) {
    return { skill: byMarketplaceId, reason: 'marketplace-id' };
  }

  const byCanonical = skills.find((skill) => skill.canonicalId === canonicalTarget);
  if (byCanonical) {
    return { skill: byCanonical, reason: 'canonical' };
  }

  const nameCandidates = getMarketplaceNameCandidates(item);
  const byLegacyName = skills.find((skill) => {
    const normalizedSkillName = normalizeSkillName(skill.metadata.name);
    return nameCandidates.includes(normalizedSkillName);
  });
  if (byLegacyName) {
    return { skill: byLegacyName, reason: 'legacy-name' };
  }

  return { skill: null, reason: 'none' };
}

function shouldResetPage(filters: Partial<SkillsMarketplaceFilters>): boolean {
  return DISCOVERY_RESET_KEYS.some((key) => Object.prototype.hasOwnProperty.call(filters, key));
}

function classifyMarketplaceError(params: {
  code?: string;
  message?: string;
  defaultCategory?: SkillsMarketplaceErrorCategory;
}): SkillsMarketplaceErrorCategory {
  const code = (params.code || '').toUpperCase();
  const message = (params.message || '').toLowerCase();

  if (
    code === 'MISSING_API_KEY'
    || code === 'INVALID_API_KEY'
    || message.includes('api key')
    || message.includes('unauthorized')
    || message.includes('forbidden')
  ) {
    return 'auth';
  }

  if (
    code === 'MISSING_QUERY'
    || message.includes('missing query')
    || message.includes('validation')
    || message.includes('invalid query')
  ) {
    return 'validation';
  }

  if (
    code === 'RATE_LIMIT'
    || message.includes('429')
    || message.includes('rate limit')
  ) {
    return 'rate-limit';
  }

  if (
    message.includes('nativepromotionpartial')
    || message.includes('partial sync')
    || message.includes('partial')
  ) {
    return 'partial-sync';
  }

  if (
    message.includes('network')
    || message.includes('timeout')
    || message.includes('aborted')
    || message.includes('fetch')
    || message.includes('connection')
  ) {
    return 'network';
  }

  return params.defaultCategory ?? 'unknown';
}

function errorCategoryToI18nKey(category: SkillsMarketplaceErrorCategory): string {
  switch (category) {
    case 'auth':
      return 'i18n:marketplace.errors.auth';
    case 'network':
      return 'i18n:marketplace.errors.network';
    case 'rate-limit':
      return 'i18n:marketplace.errors.rateLimit';
    case 'validation':
      return 'i18n:marketplace.errors.validation';
    case 'partial-sync':
      return 'i18n:marketplace.errors.partialSync';
    default:
      return 'i18n:marketplace.errors.unknown';
  }
}

function toLocalizedInstallError(error: string | undefined): { category: SkillsMarketplaceErrorCategory; key: string } {
  if (!error) {
    return {
      category: 'unknown',
      key: errorCategoryToI18nKey('unknown'),
    };
  }

  if (error.startsWith('i18n:')) {
    if (error.includes('nativePromotionPartial')) {
      return { category: 'partial-sync', key: error };
    }
    if (error.includes('nativePromotionFailed')) {
      return { category: 'partial-sync', key: error };
    }
    if (error.includes('nativeNotAvailable')) {
      return { category: 'validation', key: error };
    }
    return {
      category: classifyMarketplaceError({ message: error }),
      key: error,
    };
  }

  const category = classifyMarketplaceError({ message: error });
  return { category, key: errorCategoryToI18nKey(category) };
}

interface SkillMarketplaceState {
  // State
  items: SkillsMarketplaceItem[];
  filters: SkillsMarketplaceFilters;
  isLoading: boolean;
  error: string | null;
  errorCategory: SkillsMarketplaceErrorCategory | null;
  lastSearched: number | null;
  lastDiagnostic: SkillsMarketplaceOperationDiagnostic | null;

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
  installRetryMetadata: Map<string, InstallRetryMetadata>;

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
  isItemInstalled: (skillId: string, item?: SkillsMarketplaceItem) => boolean;
  getInstallStatus: (skillId: string, item?: SkillsMarketplaceItem) => SkillInstallStatus;
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
      errorCategory: null,
      lastSearched: null,
      lastDiagnostic: null,
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      selectedItem: null,
      selectedDetail: null,
      isLoadingDetail: false,
      installingItems: new Map(),
      installErrors: new Map(),
      installRetryMetadata: new Map(),
      apiKey: null,
      favorites: new Set(),
      searchHistory: [],
      viewMode: 'grid',
      cacheDuration: 5 * 60 * 1000,

      searchSkills: async (query?: string) => {
        if (query !== undefined) {
          const resetPage = query.trim() !== get().filters.query.trim();
          set((state) => ({
            filters: {
              ...state.filters,
              query,
              page: resetPage ? 1 : state.filters.page,
            },
            currentPage: resetPage ? 1 : state.currentPage,
          }));
        }

        const state = get();
        const searchQuery = state.filters.query;

        if (!searchQuery.trim()) {
          set({
            items: [],
            error: null,
            errorCategory: null,
            selectedItem: null,
            selectedDetail: null,
          });
          return;
        }

        if (!state.apiKey) {
          const category: SkillsMarketplaceErrorCategory = 'auth';
          set({
            error: errorCategoryToI18nKey(category),
            errorCategory: category,
            lastDiagnostic: {
              operation: 'search',
              outcome: 'failure',
              category,
              reasonCode: 'MISSING_API_KEY',
              retryable: false,
              timestamp: Date.now(),
            },
          });
          return;
        }

        set({ isLoading: true, error: null, errorCategory: null });

        try {
          const requestFilters = get().filters;
          const response = requestFilters.useAiSearch
            ? await aiSearchSkillsMarketplace(searchQuery, state.apiKey)
            : await searchSkillsMarketplace(searchQuery, {
              page: requestFilters.page,
              limit: requestFilters.limit,
              sortBy: requestFilters.sortBy,
              apiKey: state.apiKey,
            });

          if (!response.success) {
            const category = classifyMarketplaceError({
              code: response.error?.code,
              message: response.error?.message,
            });
            const diagnostic: SkillsMarketplaceOperationDiagnostic = {
              operation: 'search',
              outcome: 'failure',
              category,
              reasonCode: response.error?.code,
              retryable: category === 'network' || category === 'rate-limit',
              timestamp: Date.now(),
            };
            marketplaceStoreLogger.warn('Skills marketplace search failed', { ...diagnostic });
            set({
              error: errorCategoryToI18nKey(category),
              errorCategory: category,
              lastDiagnostic: diagnostic,
              isLoading: false,
            });
            return;
          }

          const resolvedPage = response.pagination?.page || requestFilters.page;
          const nextItems = response.data;
          const selected = get().selectedItem;
          const selectedStillExists = selected ? nextItems.some((item) => item.id === selected.id) : true;

          set({
            items: nextItems,
            totalItems: response.pagination?.total || nextItems.length,
            totalPages: response.pagination?.totalPages || 1,
            currentPage: resolvedPage,
            lastSearched: Date.now(),
            isLoading: false,
            error: null,
            errorCategory: null,
            lastDiagnostic: {
              operation: 'search',
              outcome: 'success',
              timestamp: Date.now(),
            },
            selectedItem: selectedStillExists ? selected : null,
            selectedDetail: selectedStillExists ? get().selectedDetail : null,
            filters: {
              ...requestFilters,
              query: searchQuery,
              page: resolvedPage,
            },
          });
          get().addToSearchHistory(searchQuery);
        } catch (error) {
          const category = classifyMarketplaceError({
            message: error instanceof Error ? error.message : String(error),
          });
          const diagnostic: SkillsMarketplaceOperationDiagnostic = {
            operation: 'search',
            outcome: 'failure',
            category,
            retryable: category === 'network' || category === 'rate-limit',
            timestamp: Date.now(),
          };
          marketplaceStoreLogger.error('Skills marketplace search threw error', error, { ...diagnostic });
          set({
            error: errorCategoryToI18nKey(category),
            errorCategory: category,
            lastDiagnostic: diagnostic,
            isLoading: false,
          });
        }
      },

      aiSearch: async (query: string) => {
        set((state) => ({
          filters: { ...state.filters, useAiSearch: true, query, page: 1 },
          currentPage: 1,
          selectedItem: null,
          selectedDetail: null,
        }));
        await get().searchSkills();
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: (() => {
            const next = { ...state.filters, ...newFilters };
            if (shouldResetPage(newFilters)) {
              next.page = 1;
            }
            return next;
          })(),
          currentPage: shouldResetPage(newFilters) ? 1 : ({ ...state.filters, ...newFilters }).page,
          selectedItem: Object.keys(newFilters).some((key) =>
            ['query', 'sortBy', 'useAiSearch', 'page', 'limit', 'category', 'tags'].includes(key)
          )
            ? null
            : state.selectedItem,
          selectedDetail: Object.keys(newFilters).some((key) =>
            ['query', 'sortBy', 'useAiSearch', 'page', 'limit', 'category', 'tags'].includes(key)
          )
            ? null
            : state.selectedDetail,
        }));
      },

      resetFilters: () => {
        set({
          filters: DEFAULT_SKILLS_MARKETPLACE_FILTERS,
          currentPage: 1,
          selectedItem: null,
          selectedDetail: null,
          error: null,
          errorCategory: null,
        });
      },

      selectItem: (item) => {
        set({ selectedItem: item, selectedDetail: null });
      },

      fetchItemDetail: async (skillId) => {
        set({ isLoadingDetail: true });

        try {
          const detail = await fetchSkillDetail(skillId, get().apiKey || undefined);
          if (!detail) {
            const category: SkillsMarketplaceErrorCategory = 'network';
            const diagnostic: SkillsMarketplaceOperationDiagnostic = {
              operation: 'detail',
              outcome: 'failure',
              category,
              itemId: skillId,
              retryable: true,
              timestamp: Date.now(),
            };
            set({
              selectedDetail: null,
              isLoadingDetail: false,
              error: errorCategoryToI18nKey(category),
              errorCategory: category,
              lastDiagnostic: diagnostic,
            });
            return null;
          }
          set({
            selectedDetail: detail,
            isLoadingDetail: false,
            error: null,
            errorCategory: null,
            lastDiagnostic: {
              operation: 'detail',
              outcome: 'success',
              itemId: skillId,
              timestamp: Date.now(),
            },
          });
          return detail;
        } catch (error) {
          const category = classifyMarketplaceError({
            message: error instanceof Error ? error.message : String(error),
            defaultCategory: 'network',
          });
          const diagnostic: SkillsMarketplaceOperationDiagnostic = {
            operation: 'detail',
            outcome: 'failure',
            category,
            itemId: skillId,
            retryable: true,
            timestamp: Date.now(),
          };
          set({
            selectedDetail: null,
            isLoadingDetail: false,
            error: errorCategoryToI18nKey(category),
            errorCategory: category,
            lastDiagnostic: diagnostic,
          });
          return null;
        }
      },

      installSkill: async (item) => {
        const operation: 'install' | 'retry' = get().installRetryMetadata.has(item.id) ? 'retry' : 'install';
        set((state) => {
          const nextInstalling = new Map(state.installingItems);
          nextInstalling.set(item.id, 'installing');
          return { installingItems: nextInstalling };
        });

        const setInstallResult = (
          status: SkillInstallStatus,
          options?: { error?: string; retry?: InstallRetryMetadata | null }
        ): void => {
          set((state) => {
            const nextInstalling = new Map(state.installingItems);
            const nextErrors = new Map(state.installErrors);
            const nextRetry = new Map(state.installRetryMetadata);

            nextInstalling.set(item.id, status);

            if (options?.error) {
              nextErrors.set(item.id, options.error);
            } else {
              nextErrors.delete(item.id);
            }

            if (options?.retry) {
              nextRetry.set(item.id, options.retry);
            } else if (options?.retry === null) {
              nextRetry.delete(item.id);
            }

            return {
              installingItems: nextInstalling,
              installErrors: nextErrors,
              installRetryMetadata: nextRetry,
            };
          });
        };

        const ensureMarketplaceLinkage = (): Skill | null => {
          const skillStore = useSkillStore.getState();
          const skills = skillStore.getAllSkills();
          const match = findSkillForMarketplaceItem(skills, item);
          if (!match.skill) {
            return null;
          }

          if (
            (match.reason === 'legacy-name' || match.reason === 'canonical')
            && normalizeMarketplaceId(match.skill.marketplaceSkillId || '') !== normalizeMarketplaceId(item.id)
          ) {
            skillStore.updateSkill(match.skill.id, {
              marketplaceSkillId: item.id,
              canonicalId: buildCanonicalSkillId({
                source: match.skill.source,
                metadata: match.skill.metadata,
                marketplaceSkillId: item.id,
                nativeSkillId: match.skill.nativeSkillId,
                nativeDirectory: match.skill.nativeDirectory,
              }),
            });
            return useSkillStore.getState().skills[match.skill.id] || match.skill;
          }

          return match.skill;
        };

        try {
          const retryMetadata = get().installRetryMetadata.get(item.id);
          const skillStore = useSkillStore.getState();

          if (retryMetadata && isNativeSkillAvailable()) {
            const retrySkill =
              skillStore.getAllSkills().find((skill) => skill.id === retryMetadata.skillId)
              || ensureMarketplaceLinkage();

            if (retrySkill) {
              const retryPromotion = await promoteSkillToNative({
                skill: retrySkill,
                directory: retryMetadata.directory,
              });

              if (retryPromotion.data) {
                skillStore.updateSkill(
                  retrySkill.id,
                  {
                    ...buildNativeLinkedSkillUpdate(retrySkill, retryPromotion.data, retryPromotion.error ?? null),
                    marketplaceSkillId: retrySkill.marketplaceSkillId ?? item.id,
                  }
                );
              }

              if (retryPromotion.outcome === 'success') {
                setInstallResult('installed', { retry: null });
                set({
                  lastDiagnostic: {
                    operation: 'retry',
                    outcome: 'success',
                    itemId: item.id,
                    timestamp: Date.now(),
                  },
                });
                return true;
              }

              const localized = toLocalizedInstallError(
                retryPromotion.error || 'i18n:marketplace.errors.partialSync'
              );
              setInstallResult('error', {
                error: localized.key,
                retry: {
                  skillId: retrySkill.id,
                  directory: retryMetadata.directory,
                  reason: localized.key,
                },
              });
              set({
                lastDiagnostic: {
                  operation: 'retry',
                  outcome: retryPromotion.outcome === 'partial' ? 'partial' : 'failure',
                  category: localized.category,
                  itemId: item.id,
                  retryable: true,
                  timestamp: Date.now(),
                },
              });
              return false;
            }

            setInstallResult('installing', { retry: null });
          }

          const apiKey = get().apiKey || undefined;
          const content = await downloadSkillContent(item.id, apiKey);
          if (!content) {
            throw new Error('download-failed');
          }

          const parseResult = parseSkillMd(content.skillmd);
          const name = parseResult.metadata?.name || item.name;
          const description = parseResult.metadata?.description || item.description;
          const contentBody = parseResult.content || content.skillmd.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
          const detectedCategory = parseResult.metadata
            ? inferCategoryFromContent(parseResult.metadata, contentBody)
            : 'custom';

          const detectedTags = extractTagsFromContent(contentBody);
          const mergedTags = [...new Set([...(item.tags || []), ...detectedTags])];

          const resources = content.resources.map((resource) => {
            const isScript = resource.path.startsWith('scripts/')
              || resource.name.endsWith('.py')
              || resource.name.endsWith('.sh')
              || resource.name.endsWith('.js');
            const isReference = resource.path.startsWith('references/')
              || resource.name.endsWith('.md')
              || resource.name.endsWith('.txt');
            return {
              name: resource.name,
              path: resource.path,
              type: (isScript ? 'script' : isReference ? 'reference' : 'asset') as 'script' | 'reference' | 'asset',
              content: resource.content,
              size: resource.content.length,
              mimeType: 'text/plain',
            };
          });

          const linkedSkill = ensureMarketplaceLinkage();
          let skill: Skill;
          if (linkedSkill) {
            skillStore.updateSkill(linkedSkill.id, {
              metadata: { name, description },
              content: contentBody,
              resources,
              status: 'enabled',
              source: 'marketplace',
              category: detectedCategory,
              tags: mergedTags,
              version: item.version,
              author: item.author,
              marketplaceSkillId: item.id,
              canonicalId: buildCanonicalSkillId({
                source: 'marketplace',
                metadata: { name },
                marketplaceSkillId: item.id,
                nativeSkillId: linkedSkill.nativeSkillId,
                nativeDirectory: linkedSkill.nativeDirectory,
              }),
            });
            skill = useSkillStore.getState().skills[linkedSkill.id] || linkedSkill;
          } else {
            skill = skillStore.importSkill({
              metadata: { name, description },
              content: contentBody,
              rawContent: content.skillmd,
              resources,
              status: 'enabled',
              source: 'marketplace',
              category: detectedCategory,
              tags: mergedTags,
              version: item.version,
              author: item.author,
              license: item.license,
              marketplaceSkillId: item.id,
              canonicalId: buildCanonicalSkillId({
                source: 'marketplace',
                metadata: { name },
                marketplaceSkillId: item.id,
              }),
            });
          }

          let installState: SkillInstallStatus = 'installed';
          let installError: string | null = null;
          let retryDirectory = name;
          let outcome: 'success' | 'partial' | 'failure' = 'success';

          if (isNativeSkillAvailable()) {
            const promotion = await promoteSkillToNative({
              skill,
            });

            retryDirectory = promotion.directory;

            if (promotion.data) {
              skillStore.updateSkill(
                skill.id,
                {
                  ...buildNativeLinkedSkillUpdate(skill, promotion.data, promotion.error ?? null),
                  marketplaceSkillId: item.id,
                }
              );
            } else if (promotion.outcome !== 'success') {
              skillStore.updateSkill(skill.id, {
                marketplaceSkillId: item.id,
                lastSyncError: promotion.error || 'i18n:nativePromotionPartial',
              });
            }

            if (promotion.outcome !== 'success') {
              installState = 'error';
              installError = toLocalizedInstallError(
                promotion.error || 'i18n:nativePromotionPartial'
              ).key;
              outcome = promotion.outcome === 'partial' ? 'partial' : 'failure';
            }
          }

          setInstallResult(installState, {
            error: installError || undefined,
            retry: installError
              ? {
                skillId: skill.id,
                directory: retryDirectory,
                reason: installError,
              }
              : null,
          });

          const category = installError ? toLocalizedInstallError(installError).category : undefined;
          set({
            lastDiagnostic: {
              operation,
              outcome,
              category,
              itemId: item.id,
              retryable: Boolean(installError),
              timestamp: Date.now(),
            },
          });

          return installState === 'installed';
        } catch (error) {
          const localized = toLocalizedInstallError(
            error instanceof Error ? error.message : String(error)
          );
          setInstallResult('error', {
            error: localized.key,
          });
          set({
            lastDiagnostic: {
              operation,
              outcome: 'failure',
              category: localized.category,
              itemId: item.id,
              retryable: localized.category === 'network' || localized.category === 'partial-sync',
              timestamp: Date.now(),
            },
          });
          return false;
        }
      },

      setApiKey: (key) => {
        set({ apiKey: key });
      },

      clearError: () => {
        set({ error: null, errorCategory: null });
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
        set((state) => ({
          filters: {
            ...state.filters,
            page,
          },
          currentPage: page,
          selectedItem: null,
          selectedDetail: null,
        }));
        if (get().filters.query.trim()) {
          void get().searchSkills();
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

      isItemInstalled: (skillId, item) => {
        const status = get().installingItems.get(skillId);
        if (status === 'installed') return true;
        if (status === 'error' || status === 'installing') return false;

        const skills = useSkillStore.getState().getAllSkills();
        const linkedMatch = item ? findSkillForMarketplaceItem(skills, item).skill : null;
        if (item && linkedMatch) {
          if (normalizeMarketplaceId(linkedMatch.marketplaceSkillId || '') !== normalizeMarketplaceId(item.id)) {
            useSkillStore.getState().updateSkill(linkedMatch.id, {
              marketplaceSkillId: item.id,
              canonicalId: buildCanonicalSkillId({
                source: linkedMatch.source,
                metadata: linkedMatch.metadata,
                marketplaceSkillId: item.id,
                nativeSkillId: linkedMatch.nativeSkillId,
                nativeDirectory: linkedMatch.nativeDirectory,
              }),
            });
          }
          return true;
        }

        const normalizedId = normalizeMarketplaceId(skillId);
        const canonicalId = buildMarketplaceCanonicalId(skillId);
        return skills.some((skill) =>
          normalizeMarketplaceId(skill.marketplaceSkillId || '') === normalizedId
          || skill.canonicalId === canonicalId
        );
      },

      getInstallStatus: (skillId, item) => {
        const status = get().installingItems.get(skillId);
        if (status) return status;
        if (get().isItemInstalled(skillId, item)) return 'installed';
        return 'not_installed';
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
        installRetryMetadata: Array.from(state.installRetryMetadata.entries()),
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as {
          apiKey?: string | null;
          favorites?: string[];
          searchHistory?: string[];
          viewMode?: 'grid' | 'list';
          installingItems?: [string, SkillInstallStatus][];
          installRetryMetadata?: [string, InstallRetryMetadata][];
        };
        return {
          ...current,
          apiKey: persistedState.apiKey || null,
          favorites: new Set(persistedState.favorites || []),
          searchHistory: persistedState.searchHistory || [],
          viewMode: persistedState.viewMode || 'grid',
          installingItems: new Map(persistedState.installingItems || []),
          installRetryMetadata: new Map(persistedState.installRetryMetadata || []),
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
