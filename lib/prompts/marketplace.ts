/**
 * Prompt marketplace repository.
 * Provides a remote-first API with explicit local fallback behavior.
 */

import type {
  InstalledMarketplacePrompt,
  MarketplacePrompt,
  MarketplaceSearchFilters,
  MarketplaceSearchResult,
  PromptCollection,
  PromptReview,
  PromptSubmission,
} from '@/types/content/prompt-marketplace';
import {
  applyMarketplaceFilters,
  buildFallbackMarketplaceCatalogSnapshot,
  buildMarketplaceFacets,
  normalizeMarketplacePrompt,
  parsePromptMarketplaceExchangePayload,
  sortMarketplacePrompts,
  type PromptMarketplaceCatalogSnapshot,
  type PromptMarketplaceDataSource,
  type PromptMarketplaceExchangeParseResult,
} from './marketplace-utils';

export interface PromptMarketplaceCatalog extends PromptMarketplaceCatalogSnapshot {
  sourceState: PromptMarketplaceDataSource;
  warning?: string;
}

export interface PromptMarketplaceVersionUpdate {
  marketplaceId: string;
  latestVersion: string;
}

export type PromptMarketplaceRepositoryErrorCode =
  | 'NOT_CONFIGURED'
  | 'NETWORK'
  | 'REQUEST_TIMEOUT'
  | 'HTTP'
  | 'INVALID_PAYLOAD'
  | 'REMOTE_EMPTY'
  | 'UNKNOWN';

export class PromptMarketplaceRepositoryError extends Error {
  code: PromptMarketplaceRepositoryErrorCode;
  status?: number;
  cause?: unknown;

  constructor(
    message: string,
    code: PromptMarketplaceRepositoryErrorCode,
    options?: { status?: number; cause?: unknown }
  ) {
    super(message);
    this.name = 'PromptMarketplaceRepositoryError';
    this.code = code;
    this.status = options?.status;
    this.cause = options?.cause;
  }
}

export interface PromptMarketplaceRepository {
  getCatalog: (options?: { preferRemote?: boolean }) => Promise<PromptMarketplaceCatalog>;
  searchPrompts: (
    filters: MarketplaceSearchFilters,
    options?: { preferRemote?: boolean }
  ) => Promise<{ result: MarketplaceSearchResult; sourceState: PromptMarketplaceDataSource; warning?: string }>;
  getPromptById: (
    promptId: string,
    options?: { preferRemote?: boolean }
  ) => Promise<MarketplacePrompt | null>;
  getPromptReviews: (
    promptId: string,
    page?: number,
    options?: { preferRemote?: boolean }
  ) => Promise<PromptReview[]>;
  publishPrompt: (
    submission: PromptSubmission,
    options?: { preferRemote?: boolean }
  ) => Promise<MarketplacePrompt>;
  submitReview: (
    promptId: string,
    rating: number,
    content: string,
    options?: { preferRemote?: boolean }
  ) => Promise<PromptReview>;
  markReviewHelpful: (reviewId: string, options?: { preferRemote?: boolean }) => Promise<void>;
  checkForUpdates: (
    installed: InstalledMarketplacePrompt[],
    prompts: Record<string, MarketplacePrompt>,
    options?: { preferRemote?: boolean }
  ) => Promise<PromptMarketplaceVersionUpdate[]>;
  validateImportPayload: (payload: string | unknown) => PromptMarketplaceExchangeParseResult;
  getFallbackCatalog: () => PromptMarketplaceCatalog;
}

const REQUEST_TIMEOUT = 12000;
const API_BASE_URL = (process.env.NEXT_PUBLIC_PROMPT_MARKETPLACE_API_BASE_URL || '').trim();

type RemoteCatalogPayload = {
  prompts?: unknown;
  collections?: unknown;
  featuredIds?: unknown;
  trendingIds?: unknown;
};

function toRepositoryError(
  error: unknown,
  fallbackMessage: string = 'Unknown marketplace repository error'
): PromptMarketplaceRepositoryError {
  if (error instanceof PromptMarketplaceRepositoryError) {
    return error;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new PromptMarketplaceRepositoryError(
      'Marketplace request timed out',
      'REQUEST_TIMEOUT',
      { cause: error }
    );
  }

  if (error instanceof TypeError) {
    return new PromptMarketplaceRepositoryError('Marketplace network request failed', 'NETWORK', {
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new PromptMarketplaceRepositoryError(error.message, 'UNKNOWN', { cause: error });
  }

  return new PromptMarketplaceRepositoryError(fallbackMessage, 'UNKNOWN', { cause: error });
}

function buildFallbackCatalog(warning?: string): PromptMarketplaceCatalog {
  return {
    ...buildFallbackMarketplaceCatalogSnapshot(),
    sourceState: 'fallback',
    warning,
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new PromptMarketplaceRepositoryError(
        `Marketplace request failed: ${response.status} ${response.statusText}`,
        'HTTP',
        { status: response.status }
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    throw toRepositoryError(error, 'Marketplace request failed');
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizePrompts(input: unknown): Record<string, MarketplacePrompt> {
  if (!Array.isArray(input)) {
    return {};
  }

  const prompts: Record<string, MarketplacePrompt> = {};
  input.forEach((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') {
      return;
    }

    const prompt = candidate as Partial<MarketplacePrompt> & { id?: string };
    const id = prompt.id || `remote-prompt-${index + 1}`;
    prompts[id] = normalizeMarketplacePrompt({ ...prompt, id });
  });

  return prompts;
}

function normalizeCollections(
  collectionsInput: unknown,
  prompts: Record<string, MarketplacePrompt>
): Record<string, PromptCollection> {
  if (!Array.isArray(collectionsInput)) {
    return {};
  }

  const now = new Date();
  const collections: Record<string, PromptCollection> = {};

  collectionsInput.forEach((input, index) => {
    if (!input || typeof input !== 'object') {
      return;
    }

    const candidate = input as Partial<PromptCollection> & { id?: string; name?: string };
    const id = candidate.id || `remote-collection-${index + 1}`;

    const promptIds = Array.isArray(candidate.promptIds)
      ? candidate.promptIds.filter(
          (promptId): promptId is string => typeof promptId === 'string' && !!prompts[promptId]
        )
      : [];

    collections[id] = {
      id,
      name: candidate.name || `Collection ${index + 1}`,
      description: candidate.description || '',
      author: candidate.author || { id: 'remote', name: 'Marketplace' },
      promptIds,
      promptCount: promptIds.length,
      tags: candidate.tags || [],
      categoryFilter: candidate.categoryFilter,
      icon: candidate.icon,
      color: candidate.color,
      coverImage: candidate.coverImage,
      isOfficial: candidate.isOfficial,
      isFeatured: candidate.isFeatured,
      followers: candidate.followers || 0,
      createdAt: candidate.createdAt ? new Date(candidate.createdAt) : now,
      updatedAt: candidate.updatedAt ? new Date(candidate.updatedAt) : now,
    };
  });

  return collections;
}

async function fetchRemoteCatalog(): Promise<PromptMarketplaceCatalog> {
  if (!API_BASE_URL) {
    throw new PromptMarketplaceRepositoryError(
      'Remote marketplace endpoint is not configured',
      'NOT_CONFIGURED'
    );
  }

  const payload = await fetchJson<unknown>(`${API_BASE_URL}/catalog`);
  const payloadObject = (payload && typeof payload === 'object' ? payload : {}) as RemoteCatalogPayload;

  const prompts = normalizePrompts(
    Array.isArray(payloadObject.prompts)
      ? payloadObject.prompts
      : Array.isArray(payload)
        ? payload
        : []
  );

  if (Object.keys(prompts).length === 0) {
    throw new PromptMarketplaceRepositoryError('Remote marketplace catalog is empty', 'REMOTE_EMPTY');
  }

  const collections = normalizeCollections(payloadObject.collections, prompts);

  const featuredIds = Array.isArray(payloadObject.featuredIds)
    ? payloadObject.featuredIds.filter(
        (id): id is string => typeof id === 'string' && !!prompts[id]
      )
    : Object.values(prompts)
        .filter((prompt) => prompt.isFeatured)
        .map((prompt) => prompt.id);

  const trendingIds = Array.isArray(payloadObject.trendingIds)
    ? payloadObject.trendingIds.filter(
        (id): id is string => typeof id === 'string' && !!prompts[id]
      )
    : Object.values(prompts)
        .sort((a, b) => b.stats.weeklyDownloads - a.stats.weeklyDownloads)
        .slice(0, 20)
        .map((prompt) => prompt.id);

  return {
    prompts,
    collections,
    featuredIds,
    trendingIds,
    sourceState: 'remote',
  };
}

function normalizeReview(item: Partial<PromptReview>, fallbackId: string): PromptReview {
  return {
    id: item.id || fallbackId,
    authorId: item.authorId || 'anonymous',
    authorName: item.authorName || 'Anonymous',
    rating: item.rating || 0,
    content: item.content || '',
    helpful: item.helpful || 0,
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
  };
}

function normalizeVersionUpdates(payload: unknown): PromptMarketplaceVersionUpdate[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter(
      (item): item is { marketplaceId?: string; latestVersion?: string } =>
        !!item && typeof item === 'object'
    )
    .filter(
      (item): item is PromptMarketplaceVersionUpdate =>
        typeof item.marketplaceId === 'string' &&
        item.marketplaceId.length > 0 &&
        typeof item.latestVersion === 'string' &&
        item.latestVersion.length > 0
    );
}

function buildLocalPublishedPrompt(submission: PromptSubmission): MarketplacePrompt {
  return normalizeMarketplacePrompt({
    id: `published-${Date.now()}`,
    name: submission.name,
    description: submission.description,
    content: submission.content,
    category: submission.category,
    tags: submission.tags,
    variables: submission.variables,
    targets: submission.targets,
    author: { id: 'local-user', name: 'You' },
    source: 'user',
    qualityTier: 'community',
    version: '1.0.0',
    versions: [],
    reviewCount: 0,
    icon: submission.icon,
    color: submission.color,
    stats: {
      downloads: 0,
      weeklyDownloads: 0,
      favorites: 0,
      shares: 0,
      views: 0,
    },
    rating: {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  });
}

export function createPromptMarketplaceRepository(): PromptMarketplaceRepository {
  const repository: PromptMarketplaceRepository = {
    getCatalog: async (options) => {
      const preferRemote = options?.preferRemote ?? false;
      if (!preferRemote) {
        return buildFallbackCatalog();
      }

      try {
        return await fetchRemoteCatalog();
      } catch (error) {
        const normalized = toRepositoryError(error, 'Failed to fetch remote marketplace catalog');
        return buildFallbackCatalog(`Using fallback marketplace data: ${normalized.message}`);
      }
    },

    searchPrompts: async (filters, options) => {
      const catalog = await repository.getCatalog(options);
      const filtered = applyMarketplaceFilters(Object.values(catalog.prompts), filters);
      const sorted = sortMarketplacePrompts(filtered, filters.sortBy, !!filters.query);
      const facets = buildMarketplaceFacets(sorted);

      return {
        sourceState: catalog.sourceState,
        warning: catalog.warning,
        result: {
          prompts: sorted,
          total: sorted.length,
          page: 1,
          pageSize: sorted.length,
          hasMore: false,
          filters,
          facets,
        },
      };
    },

    getPromptById: async (promptId, options) => {
      const preferRemote = options?.preferRemote ?? false;
      if (!preferRemote || !API_BASE_URL) {
        return buildFallbackCatalog().prompts[promptId] || null;
      }

      try {
        const payload = await fetchJson<unknown>(`${API_BASE_URL}/prompts/${promptId}`);
        if (!payload || typeof payload !== 'object') {
          throw new PromptMarketplaceRepositoryError(
            `Invalid prompt payload for ${promptId}`,
            'INVALID_PAYLOAD'
          );
        }

        return normalizeMarketplacePrompt({
          ...(payload as Partial<MarketplacePrompt>),
          id: promptId,
        });
      } catch {
        return buildFallbackCatalog().prompts[promptId] || null;
      }
    },

    getPromptReviews: async (promptId, _page = 1, options) => {
      const preferRemote = options?.preferRemote ?? false;
      if (!preferRemote || !API_BASE_URL) {
        return [];
      }

      try {
        const payload = await fetchJson<unknown>(`${API_BASE_URL}/prompts/${promptId}/reviews`);
        if (!Array.isArray(payload)) {
          throw new PromptMarketplaceRepositoryError('Invalid review payload', 'INVALID_PAYLOAD');
        }

        return payload
          .filter((item): item is Partial<PromptReview> => !!item && typeof item === 'object')
          .map((item, index) => normalizeReview(item, `${promptId}-review-${index + 1}`));
      } catch {
        return [];
      }
    },

    publishPrompt: async (submission, options) => {
      const preferRemote = options?.preferRemote ?? false;

      if (preferRemote && API_BASE_URL) {
        try {
          const payload = await fetchJson<unknown>(`${API_BASE_URL}/prompts`, {
            method: 'POST',
            body: JSON.stringify(submission),
          });

          if (payload && typeof payload === 'object') {
            const candidate = payload as Partial<MarketplacePrompt> & { id?: string };
            const id = candidate.id || `published-${Date.now()}`;
            return normalizeMarketplacePrompt({ ...candidate, id, source: 'user' });
          }
        } catch {
          // Continue with local semantics.
        }
      }

      return buildLocalPublishedPrompt(submission);
    },

    submitReview: async (promptId, rating, content, options) => {
      const preferRemote = options?.preferRemote ?? false;

      if (preferRemote && API_BASE_URL) {
        try {
          const payload = await fetchJson<unknown>(`${API_BASE_URL}/prompts/${promptId}/reviews`, {
            method: 'POST',
            body: JSON.stringify({ rating, content }),
          });

          if (payload && typeof payload === 'object') {
            return normalizeReview(
              payload as Partial<PromptReview>,
              `${promptId}-review-${Date.now()}`
            );
          }
        } catch {
          // Continue with local semantics.
        }
      }

      return {
        id: `${promptId}-review-${Date.now()}`,
        authorId: 'local-user',
        authorName: 'You',
        rating,
        content,
        helpful: 0,
        createdAt: new Date(),
      };
    },

    markReviewHelpful: async (reviewId, options) => {
      const preferRemote = options?.preferRemote ?? false;
      if (!preferRemote || !API_BASE_URL) {
        return;
      }

      try {
        await fetchJson<unknown>(`${API_BASE_URL}/reviews/${reviewId}/helpful`, {
          method: 'POST',
        });
      } catch {
        // Best-effort only.
      }
    },

    checkForUpdates: async (installed, prompts, options) => {
      const preferRemote = options?.preferRemote ?? false;
      if (preferRemote && API_BASE_URL) {
        try {
          const payload = await fetchJson<unknown>(`${API_BASE_URL}/prompts/updates/check`, {
            method: 'POST',
            body: JSON.stringify({
              installed: installed.map((item) => ({
                marketplaceId: item.marketplaceId,
                installedVersion: item.installedVersion,
              })),
            }),
          });

          const normalized = normalizeVersionUpdates(payload);
          if (normalized.length > 0) {
            return normalized;
          }
        } catch {
          // Continue with local comparison.
        }
      }

      return installed
        .map((item) => {
          const prompt = prompts[item.marketplaceId];
          if (!prompt || !prompt.version || prompt.version === item.installedVersion) {
            return null;
          }

          return {
            marketplaceId: item.marketplaceId,
            latestVersion: prompt.version,
          };
        })
        .filter((item): item is PromptMarketplaceVersionUpdate => item !== null);
    },

    validateImportPayload: (payload) => parsePromptMarketplaceExchangePayload(payload),

    getFallbackCatalog: () => buildFallbackCatalog(),
  };

  return repository;
}

export const promptMarketplaceRepository = createPromptMarketplaceRepository();
