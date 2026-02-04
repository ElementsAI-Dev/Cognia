/**
 * Search Type Router
 * Routes search requests to appropriate provider functions based on search type
 */

import type {
  SearchResponse,
  SearchOptions,
  SearchType,
  SearchProviderType,
  SearchProviderSettings,
} from '@/types/search';

import { searchWithBrave, searchNewsWithBrave, searchImagesWithBrave, searchVideosWithBrave } from './providers/brave';
import { searchWithBing, searchNewsWithBing, searchImagesWithBing } from './providers/bing';
import { searchWithGoogle, searchImagesWithGoogle } from './providers/google';
import { searchWithSearchAPI, searchNewsWithSearchAPI, searchImagesWithSearchAPI, searchScholarWithSearchAPI } from './providers/searchapi';
import { searchWithSerpAPI, searchNewsWithSerpAPI, searchImagesWithSerpAPI } from './providers/serpapi';
import { searchWithExa, findSimilarWithExa, getContentsWithExa } from './providers/exa';
import { searchWithTavily } from './providers/tavily';
import { searchWithPerplexity } from './providers/perplexity';
import { searchWithGoogleAI } from './providers/google-ai';
import { createLogger } from '@/lib/logger';

const log = createLogger('search');

export interface SearchTypeRouterOptions extends SearchOptions {
  similarUrl?: string;
  contentUrls?: string[];
}

type SearchFunction = (
  query: string,
  apiKey: string,
  options?: SearchOptions
) => Promise<SearchResponse>;

interface ProviderCapabilities {
  general: SearchFunction;
  news?: SearchFunction;
  images?: SearchFunction;
  videos?: SearchFunction;
  academic?: SearchFunction;
}

const PROVIDER_CAPABILITIES: Record<SearchProviderType, ProviderCapabilities> = {
  brave: {
    general: searchWithBrave,
    news: searchNewsWithBrave,
    images: searchImagesWithBrave,
    videos: searchVideosWithBrave,
  },
  bing: {
    general: searchWithBing,
    news: searchNewsWithBing,
    images: searchImagesWithBing,
  },
  google: {
    general: searchWithGoogle,
    images: searchImagesWithGoogle,
  },
  'google-ai': {
    general: searchWithGoogleAI,
  },
  searchapi: {
    general: searchWithSearchAPI,
    news: searchNewsWithSearchAPI,
    images: searchImagesWithSearchAPI,
    academic: searchScholarWithSearchAPI,
  },
  serpapi: {
    general: searchWithSerpAPI,
    news: searchNewsWithSerpAPI,
    images: searchImagesWithSerpAPI,
  },
  exa: {
    general: searchWithExa,
    academic: searchWithExa,
  },
  tavily: {
    general: searchWithTavily as unknown as SearchFunction,
    news: searchWithTavily as unknown as SearchFunction,
  },
  perplexity: {
    general: searchWithPerplexity,
    news: searchWithPerplexity,
  },
};

/**
 * Get providers that support a specific search type
 */
export function getProvidersForType(searchType: SearchType): SearchProviderType[] {
  const providers: SearchProviderType[] = [];

  for (const [providerId, capabilities] of Object.entries(PROVIDER_CAPABILITIES)) {
    if (searchType === 'general' || capabilities[searchType]) {
      providers.push(providerId as SearchProviderType);
    }
  }

  return providers;
}

/**
 * Check if a provider supports a specific search type
 */
export function providerSupportsType(
  provider: SearchProviderType,
  searchType: SearchType
): boolean {
  const capabilities = PROVIDER_CAPABILITIES[provider];
  if (!capabilities) return false;

  if (searchType === 'general') return true;
  return !!capabilities[searchType];
}

/**
 * Get the best provider for a specific search type from available settings
 */
export function getBestProviderForType(
  searchType: SearchType,
  providerSettings: Record<SearchProviderType, SearchProviderSettings>
): SearchProviderType | null {
  const enabledProviders = Object.entries(providerSettings)
    .filter(([_, settings]) => settings.enabled && settings.apiKey)
    .sort((a, b) => a[1].priority - b[1].priority);

  for (const [providerId] of enabledProviders) {
    if (providerSupportsType(providerId as SearchProviderType, searchType)) {
      return providerId as SearchProviderType;
    }
  }

  return null;
}

/**
 * Route search request to appropriate provider function
 */
export async function routeSearch(
  query: string,
  provider: SearchProviderType,
  apiKey: string,
  options: SearchTypeRouterOptions = {}
): Promise<SearchResponse> {
  const searchType = options.searchType || 'general';
  const capabilities = PROVIDER_CAPABILITIES[provider];

  if (!capabilities) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const searchFn = capabilities[searchType] || capabilities.general;

  log.debug(`Routing ${searchType} search to ${provider}`);

  return searchFn(query, apiKey, options);
}

/**
 * Search news across providers
 */
export async function searchNews(
  query: string,
  provider: SearchProviderType,
  apiKey: string,
  options?: SearchOptions
): Promise<SearchResponse> {
  return routeSearch(query, provider, apiKey, { ...options, searchType: 'news' });
}

/**
 * Search images across providers
 */
export async function searchImages(
  query: string,
  provider: SearchProviderType,
  apiKey: string,
  options?: SearchOptions
): Promise<SearchResponse> {
  return routeSearch(query, provider, apiKey, { ...options, searchType: 'images' });
}

/**
 * Search videos (Brave only)
 */
export async function searchVideos(
  query: string,
  apiKey: string,
  options?: SearchOptions
): Promise<SearchResponse> {
  return searchVideosWithBrave(query, apiKey, options);
}

/**
 * Search academic content (SearchAPI or Exa)
 */
export async function searchAcademic(
  query: string,
  provider: 'searchapi' | 'exa',
  apiKey: string,
  options?: SearchOptions
): Promise<SearchResponse> {
  if (provider === 'searchapi') {
    return searchScholarWithSearchAPI(query, apiKey, options);
  }
  return searchWithExa(query, apiKey, { ...options, searchType: 'academic' });
}

/**
 * Find similar content using Exa
 */
export async function findSimilar(
  url: string,
  apiKey: string,
  options?: SearchOptions
): Promise<SearchResponse> {
  return findSimilarWithExa(url, apiKey, options);
}

/**
 * Get content from URLs using Exa
 */
export async function getContents(
  urls: string[],
  apiKey: string,
  options?: { text?: boolean | { maxCharacters?: number }; highlights?: boolean }
): Promise<SearchResponse> {
  const startTime = Date.now();
  const results = await getContentsWithExa(urls, apiKey, options);
  
  return {
    provider: 'exa',
    query: urls.join(', '),
    results,
    responseTime: Date.now() - startTime,
    totalResults: results.length,
  };
}

/**
 * Auto-route search to best available provider based on type
 */
export async function autoRouteSearch(
  query: string,
  searchType: SearchType,
  providerSettings: Record<SearchProviderType, SearchProviderSettings>,
  options?: SearchOptions
): Promise<SearchResponse> {
  const provider = getBestProviderForType(searchType, providerSettings);

  if (!provider) {
    throw new Error(`No enabled provider available for search type: ${searchType}`);
  }

  const settings = providerSettings[provider];

  log.debug(`Auto-routing ${searchType} search to ${provider}`);

  return routeSearch(query, provider, settings.apiKey, {
    ...options,
    searchType,
  });
}
