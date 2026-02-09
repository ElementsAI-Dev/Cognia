/**
 * Web Scraper Tool - Direct web page content extraction for AI agents
 * Supports Playwright for dynamic content and HTTP fallback for static pages
 */

import { z } from 'zod';
import type { ScrapedPage } from '@/lib/search/providers/playwright-scraper';

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
 * Execute scraper directly using playwright-scraper service (client-side compatible)
 * Bypasses /api/scrape routes for static export / Tauri compatibility
 */
async function executeScraperDirect(
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
  const startTime = Date.now();
  const { smartFetchContent, fetchPageContent } = await import('@/lib/search/providers/playwright-scraper');

  let scraped: ScrapedPage;
  if (options.usePlaywright) {
    scraped = await smartFetchContent(url, {
      timeout: options.timeout,
      extractImages: options.extractImages,
      extractLinks: options.extractLinks,
      extractMetadata: options.extractMetadata,
      maxContentLength: options.maxContentLength,
      waitForSelector: options.waitForSelector,
    });
  } else {
    scraped = await fetchPageContent(url, {
      timeout: options.timeout,
      maxLength: options.maxContentLength,
    });
  }

  if (scraped.error) {
    return {
      success: false,
      url,
      error: scraped.error,
      responseTime: Date.now() - startTime,
      method: options.usePlaywright ? 'playwright' : 'http',
    };
  }

  return {
    success: true,
    url: scraped.url,
    title: scraped.title,
    content: scraped.content,
    markdown: scraped.markdown,
    metadata: scraped.metadata ? {
      description: scraped.metadata.description,
      author: scraped.metadata.author,
      publishedDate: scraped.metadata.publishedDate,
      ogTitle: scraped.metadata.ogTitle,
      ogDescription: scraped.metadata.ogDescription,
      ogImage: scraped.metadata.ogImage,
      language: scraped.metadata.language,
    } : undefined,
    images: scraped.images?.map((img) => ({ src: img.src, alt: img.alt })),
    links: scraped.links,
    responseTime: scraped.responseTime,
    method: options.usePlaywright ? 'playwright' : 'http',
  };
}

/**
 * Execute bulk scraper directly (client-side compatible)
 */
async function executeBulkScraperDirect(
  urls: string[],
  options: {
    usePlaywright?: boolean;
    extractMetadata?: boolean;
    timeout?: number;
    maxContentLength?: number;
  } = {}
): Promise<BulkScraperApiResponse> {
  const startTime = Date.now();
  const results = await Promise.all(
    urls.map((url) =>
      executeScraperDirect(url, {
        usePlaywright: options.usePlaywright,
        extractMetadata: options.extractMetadata,
        timeout: options.timeout,
        maxContentLength: options.maxContentLength,
      })
    )
  );

  return {
    success: true,
    results,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Call scraper API route (fallback for dev server)
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
 * Call bulk scraper API route (fallback for dev server)
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

/**
 * Smart scraper executor: tries direct execution first, falls back to API route
 */
async function smartScraperExecute(
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
  try {
    return await executeScraperDirect(url, options);
  } catch (directError) {
    try {
      return await callScraperApi(url, options);
    } catch {
      throw directError;
    }
  }
}

/**
 * Smart bulk scraper executor: tries direct first, falls back to API route
 */
async function smartBulkScraperExecute(
  urls: string[],
  options: {
    usePlaywright?: boolean;
    extractMetadata?: boolean;
    timeout?: number;
    maxContentLength?: number;
  } = {}
): Promise<BulkScraperApiResponse> {
  try {
    return await executeBulkScraperDirect(urls, options);
  } catch (directError) {
    try {
      return await callBulkScraperApi(urls, options);
    } catch {
      throw directError;
    }
  }
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
    const response = await smartScraperExecute(input.url, {
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
    const response = await smartBulkScraperExecute(input.urls, {
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
    // Try direct execution first (works in static export / Tauri)
    return await executeSearchAndScrapeDirect(input, searchConfig);
  } catch {
    // Fall back to API route (works in dev server)
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
}

/**
 * Direct search and scrape execution (client-side compatible)
 * Searches using web search, then scrapes each result page
 */
async function executeSearchAndScrapeDirect(
  input: SearchAndScrapeInput,
  searchConfig?: { apiKey?: string; provider?: string }
): Promise<SearchAndScrapeResult> {
  const startTime = Date.now();
  const { search } = await import('@/lib/search/search-service');
  const { fetchPageContent } = await import('@/lib/search/providers/playwright-scraper');

  const searchResult = await search(input.query, {
    maxResults: input.maxResults,
    provider: searchConfig?.provider as Parameters<typeof search>[1]['provider'],
    providerSettings: searchConfig?.apiKey ? {
      tavily: { enabled: true, apiKey: searchConfig.apiKey },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any : undefined,
  });

  const results: SearchAndScrapeResult['results'] = [];

  for (const sr of searchResult.results) {
    let fullContent: string | undefined;
    let scrapedSuccessfully = false;

    if (input.scrapeContent) {
      try {
        const scraped = await fetchPageContent(sr.url, {
          timeout: 10000,
          maxLength: 30000,
        });
        if (!scraped.error && scraped.content) {
          fullContent = scraped.content;
          scrapedSuccessfully = true;
        }
      } catch {
        // Scrape failed, continue without content
      }
    }

    results.push({
      title: sr.title,
      url: sr.url,
      snippet: sr.content,
      fullContent,
      scrapedSuccessfully,
    });
  }

  return {
    success: true,
    query: input.query,
    results,
    responseTime: Date.now() - startTime,
  };
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
