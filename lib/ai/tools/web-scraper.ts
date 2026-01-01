/**
 * Web Scraper Tool - Direct web page content extraction for AI agents
 * Supports Playwright for dynamic content and HTTP fallback for static pages
 */

import { z } from 'zod';

export interface ScraperApiResponse {
  success: boolean;
  url: string;
  title?: string;
  content?: string;
  markdown?: string;
  metadata?: {
    description?: string;
    author?: string;
    publishedDate?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    language?: string;
  };
  images?: Array<{
    src: string;
    alt?: string;
  }>;
  links?: Array<{
    href: string;
    text: string;
    isExternal: boolean;
  }>;
  responseTime: number;
  method: 'playwright' | 'http';
  error?: string;
}

export interface BulkScraperApiResponse {
  success: boolean;
  results: ScraperApiResponse[];
  totalTime: number;
}

/**
 * Call scraper API route
 */
async function callScraperApi(
  url: string,
  options: {
    usePlaywright?: boolean;
    extractImages?: boolean;
    extractLinks?: boolean;
    extractMetadata?: boolean;
    timeout?: number;
    maxContentLength?: number;
    waitForSelector?: string;
  } = {}
): Promise<ScraperApiResponse> {
  const response = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, ...options }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Scrape request failed' }));
    throw new Error(error.error || 'Scrape request failed');
  }

  return response.json();
}

/**
 * Call bulk scraper API route
 */
async function callBulkScraperApi(
  urls: string[],
  options: {
    usePlaywright?: boolean;
    extractMetadata?: boolean;
    timeout?: number;
    maxContentLength?: number;
  } = {}
): Promise<BulkScraperApiResponse> {
  const response = await fetch('/api/scrape/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, ...options }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Bulk scrape request failed' }));
    throw new Error(error.error || 'Bulk scrape request failed');
  }

  return response.json();
}

export const webScraperInputSchema = z.object({
  url: z.string().url().describe('The URL of the web page to scrape'),
  usePlaywright: z
    .boolean()
    .optional()
    .default(false)
    .describe('Use Playwright for JavaScript-rendered content (slower but handles dynamic pages)'),
  extractImages: z
    .boolean()
    .optional()
    .default(false)
    .describe('Extract images from the page'),
  extractLinks: z
    .boolean()
    .optional()
    .default(false)
    .describe('Extract links from the page'),
  extractMetadata: z
    .boolean()
    .optional()
    .default(true)
    .describe('Extract page metadata (title, description, etc.)'),
  waitForSelector: z
    .string()
    .optional()
    .describe('CSS selector to wait for before extracting content (only with Playwright)'),
  timeout: z
    .number()
    .min(1000)
    .max(60000)
    .optional()
    .default(15000)
    .describe('Request timeout in milliseconds'),
  maxContentLength: z
    .number()
    .min(1000)
    .max(200000)
    .optional()
    .default(50000)
    .describe('Maximum content length to extract'),
});

export const bulkWebScraperInputSchema = z.object({
  urls: z
    .array(z.string().url())
    .min(1)
    .max(10)
    .describe('Array of URLs to scrape (max 10)'),
  usePlaywright: z
    .boolean()
    .optional()
    .default(false)
    .describe('Use Playwright for JavaScript-rendered content'),
  extractMetadata: z
    .boolean()
    .optional()
    .default(true)
    .describe('Extract page metadata'),
  timeout: z
    .number()
    .min(1000)
    .max(60000)
    .optional()
    .default(15000)
    .describe('Request timeout per page in milliseconds'),
  maxContentLength: z
    .number()
    .min(1000)
    .max(100000)
    .optional()
    .default(30000)
    .describe('Maximum content length per page'),
});

export type WebScraperInput = z.input<typeof webScraperInputSchema>;
export type BulkWebScraperInput = z.input<typeof bulkWebScraperInputSchema>;

export interface WebScraperResult {
  success: boolean;
  url?: string;
  title?: string;
  content?: string;
  markdown?: string;
  metadata?: ScraperApiResponse['metadata'];
  images?: ScraperApiResponse['images'];
  links?: ScraperApiResponse['links'];
  responseTime?: number;
  method?: 'playwright' | 'http';
  error?: string;
}

export interface BulkWebScraperResult {
  success: boolean;
  results?: WebScraperResult[];
  totalTime?: number;
  error?: string;
}

/**
 * Execute web scraper with the provided configuration
 */
export async function executeWebScraper(input: WebScraperInput): Promise<WebScraperResult> {
  try {
    const response = await callScraperApi(input.url, {
      usePlaywright: input.usePlaywright,
      extractImages: input.extractImages,
      extractLinks: input.extractLinks,
      extractMetadata: input.extractMetadata,
      timeout: input.timeout,
      maxContentLength: input.maxContentLength,
      waitForSelector: input.waitForSelector,
    });

    if (!response.success) {
      return {
        success: false,
        url: input.url,
        error: response.error || 'Scraping failed',
      };
    }

    return {
      success: true,
      url: response.url,
      title: response.title,
      content: response.content,
      markdown: response.markdown,
      metadata: response.metadata,
      images: response.images,
      links: response.links,
      responseTime: response.responseTime,
      method: response.method,
    };
  } catch (error) {
    return {
      success: false,
      url: input.url,
      error: error instanceof Error ? error.message : 'Scraping failed',
    };
  }
}

/**
 * Execute bulk web scraper
 */
export async function executeBulkWebScraper(
  input: BulkWebScraperInput
): Promise<BulkWebScraperResult> {
  try {
    const response = await callBulkScraperApi(input.urls, {
      usePlaywright: input.usePlaywright,
      extractMetadata: input.extractMetadata,
      timeout: input.timeout,
      maxContentLength: input.maxContentLength,
    });

    if (!response.success) {
      return {
        success: false,
        error: 'Bulk scraping failed',
      };
    }

    return {
      success: true,
      results: response.results.map((r) => ({
        success: r.success,
        url: r.url,
        title: r.title,
        content: r.content,
        markdown: r.markdown,
        metadata: r.metadata,
        responseTime: r.responseTime,
        method: r.method,
        error: r.error,
      })),
      totalTime: response.totalTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bulk scraping failed',
    };
  }
}

/**
 * Web scraper tool definition - single page
 */
export const webScraperTool = {
  name: 'web_scraper',
  description:
    'Scrape and extract content from a web page. Use this to get the full text content of a specific URL. Supports both static HTML pages and JavaScript-rendered dynamic pages (using Playwright). Use Playwright mode for SPAs, pages with lazy-loaded content, or when standard HTTP fetch returns incomplete content.',
  parameters: webScraperInputSchema,
  execute: executeWebScraper,
};

/**
 * Bulk web scraper tool definition - multiple pages
 */
export const bulkWebScraperTool = {
  name: 'bulk_web_scraper',
  description:
    'Scrape and extract content from multiple web pages in parallel. Useful for gathering information from multiple sources at once. Limited to 10 URLs per request.',
  parameters: bulkWebScraperInputSchema,
  execute: executeBulkWebScraper,
};

/**
 * Combined search and scrape - search with Bing and scrape top results
 */
export const searchAndScraperInputSchema = z.object({
  query: z.string().describe('Search query'),
  maxResults: z
    .number()
    .min(1)
    .max(5)
    .optional()
    .default(3)
    .describe('Number of search results to scrape'),
  scrapeContent: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to scrape the full content of search results'),
  usePlaywright: z
    .boolean()
    .optional()
    .default(false)
    .describe('Use Playwright for scraping (for dynamic pages)'),
});

export type SearchAndScrapeInput = z.input<typeof searchAndScraperInputSchema>;

export interface SearchAndScrapeResult {
  success: boolean;
  query?: string;
  results?: Array<{
    title: string;
    url: string;
    snippet: string;
    fullContent?: string;
    scrapedSuccessfully?: boolean;
  }>;
  responseTime?: number;
  error?: string;
}

/**
 * Execute search and scrape
 */
export async function executeSearchAndScrape(
  input: SearchAndScrapeInput,
  searchConfig?: { apiKey?: string; provider?: string }
): Promise<SearchAndScrapeResult> {
  try {
    const response = await fetch('/api/search-and-scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: input.query,
        maxResults: input.maxResults,
        scrapeContent: input.scrapeContent,
        usePlaywright: input.usePlaywright,
        ...searchConfig,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Search and scrape failed' }));
      throw new Error(error.error || 'Search and scrape failed');
    }

    return response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search and scrape failed',
    };
  }
}

/**
 * Search and scrape tool definition
 */
export const searchAndScrapeTool = {
  name: 'search_and_scrape',
  description:
    'Search the web and scrape the full content of top results. Combines web search with content extraction for comprehensive information gathering. Useful when you need detailed information from multiple sources about a topic.',
  parameters: searchAndScraperInputSchema,
  execute: executeSearchAndScrape,
};
