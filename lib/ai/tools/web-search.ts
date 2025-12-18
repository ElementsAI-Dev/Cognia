/**
 * Web Search Tool - Multi-provider web search for AI agents
 * Uses API routes to avoid importing server-only modules in client components
 */

import { z } from 'zod';
import type { SearchProviderType, SearchProviderSettings } from '@/types/search';

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
 * Call search API route (to avoid importing server-only modules)
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

    if (!apiKey && !providerSettings) {
      throw new Error('No API key or provider settings provided');
    }

    const response = await callSearchApi(input.query, {
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
