/**
 * Web Search Tool - Multi-provider web search for AI agents
 */

import { z } from 'zod';
import type { SearchProviderType, SearchProviderSettings } from '@/types/search';
import { searchWithProvider, search } from '@/lib/search/search-service';

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
    .enum(['tavily', 'perplexity', 'exa', 'searchapi', 'serpapi', 'bing', 'google', 'brave'])
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

    let response;

    if (apiKey) {
      response = await searchWithProvider(targetProvider, input.query, apiKey, {
        maxResults: input.maxResults,
        searchDepth: input.searchDepth,
        includeAnswer: true,
      });
    } else if (providerSettings) {
      response = await search(input.query, {
        maxResults: input.maxResults,
        searchDepth: input.searchDepth,
        includeAnswer: true,
        provider: targetProvider,
        providerSettings,
        fallbackEnabled: true,
      });
    } else {
      throw new Error('No API key or provider settings provided');
    }

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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
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
