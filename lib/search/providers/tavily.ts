/**
 * Tavily Search Provider
 * AI-optimized search engine with answer generation
 */

import { tavily } from '@tavily/core';
import type {
  SearchOptions,
  SearchResponse,
  SearchResult,
} from '@/types/search';

export interface TavilySearchOptions extends Omit<SearchOptions, 'includeRawContent'> {
  includeRawContent?: false | 'text' | 'markdown';
}

/**
 * Search the web using Tavily API
 */
export async function searchWithTavily(
  query: string,
  apiKey: string,
  options: TavilySearchOptions = {}
): Promise<SearchResponse> {
  const {
    maxResults = 5,
    searchDepth = 'basic',
    includeAnswer = true,
    includeRawContent = false,
    includeDomains,
    excludeDomains,
  } = options;

  if (!apiKey) {
    throw new Error('Tavily API key is required');
  }

  const client = tavily({ apiKey });
  const startTime = Date.now();

  try {
    const response = await client.search(query, {
      maxResults,
      searchDepth: searchDepth === 'deep' ? 'advanced' : searchDepth,
      includeAnswer,
      includeRawContent,
      includeDomains,
      excludeDomains,
    });

    const results: SearchResult[] = response.results.map((result) => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score,
      publishedDate: result.publishedDate,
    }));

    return {
      provider: 'tavily',
      query,
      answer: response.answer,
      results,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    throw new Error(
      error instanceof Error
        ? `Tavily search failed: ${error.message}`
        : 'Tavily search failed: Unknown error'
    );
  }
}

/**
 * Get a quick answer from Tavily
 */
export async function getAnswerFromTavily(
  query: string,
  apiKey: string
): Promise<string | null> {
  const response = await searchWithTavily(query, apiKey, {
    maxResults: 3,
    searchDepth: 'basic',
    includeAnswer: true,
  });

  return response.answer || null;
}

/**
 * Extract content from a URL using Tavily
 */
export async function extractContentWithTavily(
  url: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('Tavily API key is required');
  }

  const client = tavily({ apiKey });

  try {
    const response = await client.extract([url]);
    return response.results[0]?.rawContent || '';
  } catch (error) {
    console.error('Tavily extract error:', error);
    throw new Error(
      error instanceof Error
        ? `Tavily extract failed: ${error.message}`
        : 'Tavily extract failed: Unknown error'
    );
  }
}

/**
 * Test Tavily API connection
 */
export async function testTavilyConnection(apiKey: string): Promise<boolean> {
  try {
    await searchWithTavily('test', apiKey, { maxResults: 1 });
    return true;
  } catch {
    return false;
  }
}
