/**
 * Web Search Tool - Multi-provider web search for AI agents
 * Supports both API route and direct client-side search execution
 */

import { z } from 'zod';
import type {
  SearchProviderType,
  SearchProviderSettings,
  SearchResponse,
  SearchOptions,
} from '@/types/search';

interface SearchApiResponse {
  provider: SearchProviderType;
  query: string;
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    publishedDate?: string;
  }>;
  responseTime: number;
  error?: string;
}

/**
 * Execute search directly using provider modules (client-side compatible)
 * This bypasses the /api/search route for static export compatibility
 * Includes LRU cache integration to avoid duplicate queries
 */
async function executeSearchDirect(
  query: string,
  options: {
    provider?: SearchProviderType;
    apiKey?: string;
    providerSettings?: Record<SearchProviderType, SearchProviderSettings>;
    maxResults?: number;
    searchDepth?: string;
    includeAnswer?: boolean;
  }
): Promise<SearchApiResponse> {
  const { search, searchWithProvider } = await import('@/lib/search/search-service');
  const { getSearchCache } = await import('@/lib/search/search-cache');

  const searchOptions: SearchOptions = {
    maxResults: options.maxResults,
    searchDepth: (options.searchDepth as SearchOptions['searchDepth']) || 'basic',
    includeAnswer: options.includeAnswer,
  };

  // Check cache first
  const cache = getSearchCache();
  const cached = cache.get(query, options.provider, searchOptions);
  if (cached) {
    return {
      provider: cached.provider,
      query: cached.query,
      answer: cached.answer,
      results: cached.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: r.publishedDate,
      })),
      responseTime: cached.responseTime,
    };
  }

  let result: SearchResponse;

  if (options.provider && options.apiKey) {
    result = await searchWithProvider(options.provider, query, options.apiKey, searchOptions);
  } else if (options.providerSettings) {
    result = await search(query, {
      ...searchOptions,
      provider: options.provider,
      providerSettings: options.providerSettings,
      fallbackEnabled: true,
    });
  } else {
    throw new Error('Either apiKey with provider, or providerSettings is required');
  }

  // Store in cache
  cache.set(query, result, options.provider, searchOptions);

  return {
    provider: result.provider,
    query: result.query,
    answer: result.answer,
    results: result.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      publishedDate: r.publishedDate,
    })),
    responseTime: result.responseTime,
  };
}

/**
 * Call search API route (fallback for server-side rendering)
 */
async function callSearchApi(
  query: string,
  options: {
    provider?: SearchProviderType;
    apiKey?: string;
    providerSettings?: Record<SearchProviderType, SearchProviderSettings>;
    maxResults?: number;
    searchDepth?: string;
    includeAnswer?: boolean;
  }
): Promise<SearchApiResponse> {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      provider: options.provider,
      apiKey: options.apiKey,
      providerSettings: options.providerSettings,
      options: {
        maxResults: options.maxResults,
        searchDepth: options.searchDepth,
        includeAnswer: options.includeAnswer,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Search request failed' }));
    throw new Error(error.error || 'Search request failed');
  }

  return response.json();
}

/**
 * Smart search executor: tries direct execution first, falls back to API route
 */
async function smartSearchExecute(
  query: string,
  options: {
    provider?: SearchProviderType;
    apiKey?: string;
    providerSettings?: Record<SearchProviderType, SearchProviderSettings>;
    maxResults?: number;
    searchDepth?: string;
    includeAnswer?: boolean;
  }
): Promise<SearchApiResponse> {
  // Try direct execution first (works in static export / Tauri)
  try {
    return await executeSearchDirect(query, options);
  } catch (directError) {
    // Fall back to API route (works in dev server)
    try {
      return await callSearchApi(query, options);
    } catch {
      // If both fail, throw the direct error as it's more informative
      throw directError;
    }
  }
}

export const webSearchInputSchema = z.object({
  query: z.string().describe('The search query to find information on the web'),
  maxResults: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe('Maximum number of search results to return'),
  provider: z
    .enum(['tavily', 'perplexity', 'exa', 'searchapi', 'serpapi', 'bing', 'google', 'google-ai', 'brave'])
    .optional()
    .describe('Search provider to use (optional, uses default if not specified)'),
  searchDepth: z
    .enum(['basic', 'advanced', 'deep'])
    .optional()
    .default('basic')
    .describe('Search depth/quality level'),
});

export type WebSearchToolInput = z.infer<typeof webSearchInputSchema>;

export interface WebSearchResult {
  success: boolean;
  provider?: SearchProviderType;
  query?: string;
  answer?: string;
  results?: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    publishedDate?: string;
  }>;
  responseTime?: number;
  error?: string;
}

export interface WebSearchConfig {
  apiKey?: string;
  provider?: SearchProviderType;
  providerSettings?: Record<SearchProviderType, SearchProviderSettings>;
}

/**
 * Execute web search with the provided configuration
 */
export async function executeWebSearch(
  input: WebSearchToolInput,
  config: WebSearchConfig
): Promise<WebSearchResult> {
  try {
    const { apiKey, provider: defaultProvider, providerSettings } = config;
    const targetProvider = input.provider || defaultProvider || 'tavily';

    if (!apiKey && !providerSettings) {
      throw new Error('No API key or provider settings provided');
    }

    const response = await smartSearchExecute(input.query, {
      provider: targetProvider,
      apiKey,
      providerSettings,
      maxResults: input.maxResults,
      searchDepth: input.searchDepth,
      includeAnswer: true,
    });

    return {
      success: true,
      provider: response.provider,
      query: response.query,
      answer: response.answer,
      results: response.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score,
        publishedDate: result.publishedDate,
      })),
      responseTime: response.responseTime,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    // Provide actionable error messages for common failure modes
    let userFriendlyError = errMsg;
    if (errMsg.includes('API key') || errMsg.includes('apiKey') || errMsg.includes('Unauthorized') || errMsg.includes('401')) {
      userFriendlyError = `Search provider authentication failed. Please check the API key configuration for the '${input.provider || 'default'}' provider.`;
    } else if (errMsg.includes('429') || errMsg.includes('rate limit') || errMsg.includes('Too Many Requests')) {
      userFriendlyError = `Search rate limit exceeded. Please wait a moment before searching again, or try a different search provider.`;
    } else if (errMsg.includes('timeout') || errMsg.includes('ETIMEDOUT') || errMsg.includes('ECONNREFUSED')) {
      userFriendlyError = `Search request timed out or the provider is unreachable. Try again or use a different search provider.`;
    } else if (errMsg.includes('provider') && errMsg.includes('required')) {
      userFriendlyError = `No search provider configured. Please set up a search provider (Tavily, Perplexity, Exa, etc.) in Settings > Search.`;
    }
    return {
      success: false,
      error: userFriendlyError,
    };
  }
}

/**
 * Execute web search with a single API key (backward compatible)
 */
export async function executeWebSearchWithApiKey(
  input: WebSearchToolInput,
  apiKey: string
): Promise<WebSearchResult> {
  return executeWebSearch(input, { apiKey, provider: input.provider as SearchProviderType });
}

/**
 * Web search tool definition
 */
export const webSearchTool = {
  name: 'web_search',
  description:
    'Search the web for current information using multiple search providers (Tavily, Perplexity, Exa, SearchAPI, SerpAPI, Bing). Use this when you need to find up-to-date information, research topics, or answer questions about current events.',
  parameters: webSearchInputSchema,
  execute: executeWebSearch,
};
