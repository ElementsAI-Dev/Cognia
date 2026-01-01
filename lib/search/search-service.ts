/**
 * Unified Search Service
 * Provides a unified interface for multi-provider web search
 */

import type {
  SearchProviderType,
  SearchOptions,
  SearchResponse,
  SearchProviderSettings,
  SearchResult,
} from '@/types/search';
import { getEnabledProviders } from '@/types/search';

import { searchWithTavily, testTavilyConnection } from './providers/tavily';
import { searchWithPerplexity, testPerplexityConnection } from './providers/perplexity';
import { searchWithExa, testExaConnection } from './providers/exa';
import { searchWithSearchAPI, testSearchAPIConnection } from './providers/searchapi';
import { searchWithSerpAPI, testSerpAPIConnection } from './providers/serpapi';
import { searchWithBing, testBingConnection } from './providers/bing';
import { searchWithGoogle, testGoogleConnection } from './providers/google';
import { searchWithGoogleAI, testGoogleAIConnection } from './providers/google-ai';
import { searchWithBrave, testBraveConnection } from './providers/brave';

export interface UnifiedSearchOptions extends SearchOptions {
  provider?: SearchProviderType;
  fallbackEnabled?: boolean;
  providerSettings?: Record<SearchProviderType, SearchProviderSettings>;
}

/**
 * Execute search with a specific provider
 */
async function executeProviderSearch(
  provider: SearchProviderType,
  query: string,
  apiKey: string,
  options: SearchOptions
): Promise<SearchResponse> {
  switch (provider) {
    case 'tavily':
      return searchWithTavily(query, apiKey, {
        ...options,
        includeRawContent: options.includeRawContent === true ? 'text' : options.includeRawContent,
      });
    case 'perplexity':
      return searchWithPerplexity(query, apiKey, options);
    case 'exa':
      return searchWithExa(query, apiKey, options);
    case 'searchapi':
      return searchWithSearchAPI(query, apiKey, options);
    case 'serpapi':
      return searchWithSerpAPI(query, apiKey, options);
    case 'bing':
      return searchWithBing(query, apiKey, options);
    case 'google':
      return searchWithGoogle(query, apiKey, options);
    case 'google-ai':
      return searchWithGoogleAI(query, apiKey, options);
    case 'brave':
      return searchWithBrave(query, apiKey, options);
    default:
      throw new Error(`Unknown search provider: ${provider}`);
  }
}

/**
 * Unified search function
 * Searches using the specified provider or falls back to alternatives
 */
export async function search(
  query: string,
  options: UnifiedSearchOptions = {}
): Promise<SearchResponse> {
  const {
    provider,
    fallbackEnabled = true,
    providerSettings,
    ...searchOptions
  } = options;

  if (!providerSettings) {
    throw new Error('Provider settings are required');
  }

  const enabledProviders = getEnabledProviders(providerSettings);

  if (enabledProviders.length === 0) {
    throw new Error('No search providers are enabled');
  }

  let providersToTry: SearchProviderSettings[];

  if (provider) {
    const specificProvider = providerSettings[provider];
    if (!specificProvider?.enabled || !specificProvider?.apiKey) {
      throw new Error(`Provider ${provider} is not enabled or missing API key`);
    }
    providersToTry = fallbackEnabled
      ? [specificProvider, ...enabledProviders.filter((p) => p.providerId !== provider)]
      : [specificProvider];
  } else {
    providersToTry = enabledProviders;
  }

  let lastError: Error | null = null;

  for (const providerConfig of providersToTry) {
    try {
      const result = await executeProviderSearch(
        providerConfig.providerId,
        query,
        providerConfig.apiKey,
        { ...searchOptions, ...providerConfig.defaultOptions }
      );
      return result;
    } catch (error) {
      console.warn(`Search with ${providerConfig.providerId} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!fallbackEnabled) {
        break;
      }
    }
  }

  throw lastError || new Error('All search providers failed');
}

/**
 * Search with automatic provider selection
 */
export async function autoSearch(
  query: string,
  providerSettings: Record<SearchProviderType, SearchProviderSettings>,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  return search(query, {
    ...options,
    providerSettings,
    fallbackEnabled: true,
  });
}

/**
 * Search with a specific provider (no fallback)
 */
export async function searchWithProvider(
  provider: SearchProviderType,
  query: string,
  apiKey: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  return executeProviderSearch(provider, query, apiKey, options);
}

/**
 * Test connection for a specific provider
 */
export async function testProviderConnection(
  provider: SearchProviderType,
  apiKey: string
): Promise<boolean> {
  try {
    switch (provider) {
      case 'tavily':
        return await testTavilyConnection(apiKey);
      case 'perplexity':
        return await testPerplexityConnection(apiKey);
      case 'exa':
        return await testExaConnection(apiKey);
      case 'searchapi':
        return await testSearchAPIConnection(apiKey);
      case 'serpapi':
        return await testSerpAPIConnection(apiKey);
      case 'bing':
        return await testBingConnection(apiKey);
      case 'google':
        return await testGoogleConnection(apiKey, '');
      case 'google-ai':
        return await testGoogleAIConnection(apiKey);
      case 'brave':
        return await testBraveConnection(apiKey);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Aggregate search results from multiple providers
 */
export async function aggregateSearch(
  query: string,
  providerSettings: Record<SearchProviderType, SearchProviderSettings>,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const enabledProviders = getEnabledProviders(providerSettings);

  if (enabledProviders.length === 0) {
    throw new Error('No search providers are enabled');
  }

  const startTime = Date.now();
  const searchPromises = enabledProviders.map((provider) =>
    executeProviderSearch(
      provider.providerId,
      query,
      provider.apiKey,
      { ...options, ...provider.defaultOptions }
    ).catch((error) => {
      console.warn(`Aggregate search with ${provider.providerId} failed:`, error);
      return null;
    })
  );

  const results = await Promise.all(searchPromises);
  const successfulResults = results.filter((r): r is SearchResponse => r !== null);

  if (successfulResults.length === 0) {
    throw new Error('All search providers failed');
  }

  const aggregatedResults = mergeAndRankResults(
    successfulResults.flatMap((r) => r.results)
  );

  const answer = successfulResults.find((r) => r.answer)?.answer;

  const allImages = successfulResults
    .filter((r) => r.images)
    .flatMap((r) => r.images || []);

  return {
    provider: 'tavily',
    query,
    answer,
    results: aggregatedResults,
    images: allImages.length > 0 ? allImages : undefined,
    responseTime: Date.now() - startTime,
    totalResults: aggregatedResults.length,
  };
}

/**
 * Merge and rank results from multiple providers
 */
function mergeAndRankResults(results: SearchResult[]): SearchResult[] {
  const urlMap = new Map<string, SearchResult>();

  for (const result of results) {
    const normalizedUrl = normalizeUrl(result.url);
    const existing = urlMap.get(normalizedUrl);

    if (!existing) {
      urlMap.set(normalizedUrl, result);
    } else {
      urlMap.set(normalizedUrl, {
        ...existing,
        score: Math.max(existing.score, result.score),
        content: existing.content.length > result.content.length 
          ? existing.content 
          : result.content,
      });
    }
  }

  return Array.from(urlMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('utm_campaign');
    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Format search results for LLM context
 */
export function formatSearchResultsForLLM(response: SearchResponse): string {
  const parts: string[] = [];

  parts.push(`## Web Search Results for: "${response.query}"`);
  parts.push(`*Provider: ${response.provider} | Response time: ${response.responseTime}ms*\n`);

  if (response.answer) {
    parts.push(`### AI Summary\n${response.answer}\n`);
  }

  if (response.results.length > 0) {
    parts.push('### Search Results\n');
    response.results.forEach((result, index) => {
      parts.push(`**${index + 1}. ${result.title}**`);
      parts.push(`URL: ${result.url}`);
      if (result.publishedDate) {
        parts.push(`Published: ${result.publishedDate}`);
      }
      parts.push(`${result.content}\n`);
    });
  }

  return parts.join('\n');
}

/**
 * Format search results as compact context
 */
export function formatSearchResultsCompact(response: SearchResponse): string {
  const parts: string[] = [];

  if (response.answer) {
    parts.push(`[Answer] ${response.answer}`);
  }

  response.results.slice(0, 5).forEach((result, index) => {
    parts.push(`[${index + 1}] ${result.title}: ${result.content.slice(0, 200)}...`);
    parts.push(`    Source: ${result.url}`);
  });

  return parts.join('\n');
}
