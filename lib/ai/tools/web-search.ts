/**
 * Web Search Tool - Tavily-powered web search for AI agents
 */

import { z } from 'zod';
import { searchWeb } from '@/lib/search/tavily';

export const webSearchInputSchema = z.object({
  query: z.string().describe('The search query to find information on the web'),
  maxResults: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe('Maximum number of search results to return'),
});

export type WebSearchToolInput = z.infer<typeof webSearchInputSchema>;

export interface WebSearchResult {
  success: boolean;
  query?: string;
  answer?: string;
  results?: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
  responseTime?: number;
  error?: string;
}

/**
 * Execute web search with the provided API key
 */
export async function executeWebSearch(
  input: WebSearchToolInput,
  apiKey: string
): Promise<WebSearchResult> {
  try {
    const response = await searchWeb(input.query, apiKey, {
      maxResults: input.maxResults,
      searchDepth: 'basic',
      includeAnswer: true,
    });

    return {
      success: true,
      query: response.query,
      answer: response.answer,
      results: response.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score,
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
 * Web search tool definition
 */
export const webSearchTool = {
  name: 'web_search',
  description:
    'Search the web for current information. Use this when you need to find up-to-date information, research topics, or answer questions about current events.',
  parameters: webSearchInputSchema,
  execute: executeWebSearch,
};
