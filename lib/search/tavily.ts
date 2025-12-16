/**
 * Tavily Search Integration
 * Web search API for AI-powered research
 */

import { tavily } from '@tavily/core';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface SearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeAnswer?: boolean;
  includeRawContent?: false | 'text' | 'markdown';
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface SearchResponse {
  query: string;
  answer?: string;
  results: SearchResult[];
  responseTime: number;
}

/**
 * Search the web using Tavily API
 */
export async function searchWeb(
  query: string,
  apiKey: string,
  options: SearchOptions = {}
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
      searchDepth,
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
      query,
      answer: response.answer,
      results,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    throw new Error(
      error instanceof Error
        ? `Search failed: ${error.message}`
        : 'Search failed: Unknown error'
    );
  }
}

/**
 * Get a quick answer from Tavily
 */
export async function getAnswer(
  query: string,
  apiKey: string
): Promise<string | null> {
  const response = await searchWeb(query, apiKey, {
    maxResults: 3,
    searchDepth: 'basic',
    includeAnswer: true,
  });

  return response.answer || null;
}

/**
 * Extract content from a URL using Tavily
 */
export async function extractContent(
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
        ? `Extract failed: ${error.message}`
        : 'Extract failed: Unknown error'
    );
  }
}
