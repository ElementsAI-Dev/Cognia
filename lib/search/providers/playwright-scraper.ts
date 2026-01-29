/**
 * Playwright Web Scraper
 * Direct web page content extraction using Playwright
 */

import type { SearchResult } from '@/types/search';

export interface PlaywrightScraperOptions {
  timeout?: number;
  waitForSelector?: string;
  waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
  extractImages?: boolean;
  extractLinks?: boolean;
  extractMetadata?: boolean;
  maxContentLength?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
  javascript?: boolean;
  screenshot?: boolean;
}

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  html?: string;
  markdown?: string;
  metadata?: PageMetadata;
  images?: PageImage[];
  links?: PageLink[];
  screenshot?: string;
  scrapedAt: string;
  responseTime: number;
  error?: string;
}

export interface PageMetadata {
  description?: string;
  keywords?: string[];
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  favicon?: string;
  language?: string;
}

export interface PageImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface PageLink {
  href: string;
  text: string;
  isExternal: boolean;
}

export interface BingScraperSearchOptions {
  query: string;
  maxResults?: number;
  scrapeContent?: boolean;
  scraperOptions?: PlaywrightScraperOptions;
}

export interface BingScraperSearchResult {
  query: string;
  results: Array<SearchResult & { scrapedContent?: ScrapedPage }>;
  responseTime: number;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };

/**
 * Check if Playwright is available (server-side only)
 */
export async function isPlaywrightAvailable(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      return false;
    }
    // Dynamic import to check availability at runtime (server-side only)
    // Dynamic import for optional dependency
    await import('playwright');
    return true;
  } catch {
    return false;
  }
}

/**
 * Scrape a single web page using Playwright
 */
export async function scrapePageWithPlaywright(
  url: string,
  options: PlaywrightScraperOptions = {}
): Promise<ScrapedPage> {
  const startTime = Date.now();

  const {
    timeout = 30000,
    waitForSelector,
    waitForLoadState = 'domcontentloaded',
    extractImages = false,
    extractLinks = false,
    extractMetadata = true,
    maxContentLength = 50000,
    userAgent = DEFAULT_USER_AGENT,
    viewport = DEFAULT_VIEWPORT,
    javascript = true,
    screenshot = false,
  } = options;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playwright = await import('playwright') as any;
    const chromium = playwright.chromium;

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      userAgent,
      viewport,
      javaScriptEnabled: javascript,
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    await page.goto(url, {
      timeout,
      waitUntil: waitForLoadState,
    });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: timeout / 2 }).catch(() => {});
    }

    await page.waitForTimeout(1000);

    const title = await page.title();

    const content = await page.evaluate(() => {
      const selectorsToRemove = [
        'script',
        'style',
        'noscript',
        'iframe',
        'nav',
        'header',
        'footer',
        'aside',
        '.advertisement',
        '.ad',
        '.ads',
        '.sidebar',
        '.menu',
        '.navigation',
        '[role="navigation"]',
        '[role="banner"]',
        '[role="complementary"]',
      ];

      selectorsToRemove.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });

      const mainContent =
        document.querySelector('main') ||
        document.querySelector('article') ||
        document.querySelector('[role="main"]') ||
        document.querySelector('.content') ||
        document.querySelector('#content') ||
        document.body;

      return mainContent?.innerText || document.body.innerText || '';
    });

    let metadata: PageMetadata | undefined;
    if (extractMetadata) {
      metadata = await page.evaluate(() => {
        const getMeta = (name: string): string | undefined => {
          const el =
            document.querySelector(`meta[name="${name}"]`) ||
            document.querySelector(`meta[property="${name}"]`);
          return el?.getAttribute('content') || undefined;
        };

        const getLink = (rel: string): string | undefined => {
          const el = document.querySelector(`link[rel="${rel}"]`);
          return el?.getAttribute('href') || undefined;
        };

        return {
          description: getMeta('description'),
          keywords: getMeta('keywords')?.split(',').map((k) => k.trim()),
          author: getMeta('author'),
          publishedDate: getMeta('article:published_time') || getMeta('datePublished'),
          modifiedDate: getMeta('article:modified_time') || getMeta('dateModified'),
          ogTitle: getMeta('og:title'),
          ogDescription: getMeta('og:description'),
          ogImage: getMeta('og:image'),
          canonicalUrl: getLink('canonical'),
          favicon: getLink('icon') || getLink('shortcut icon') || '/favicon.ico',
          language: document.documentElement.lang || undefined,
        };
      });
    }

    let images: PageImage[] | undefined;
    if (extractImages) {
      images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
          .filter((img) => img.src && img.naturalWidth > 100)
          .slice(0, 20)
          .map((img) => ({
            src: img.src,
            alt: img.alt || undefined,
            width: img.naturalWidth || undefined,
            height: img.naturalHeight || undefined,
          }));
      });
    }

    let links: PageLink[] | undefined;
    if (extractLinks) {
      const pageUrl = new URL(url);
      links = await page.evaluate((domain: string) => {
        return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .filter((a) => a.href && !a.href.startsWith('javascript:'))
          .slice(0, 50)
          .map((a) => {
            let isExternal = false;
            try {
              isExternal = new URL(a.href).hostname !== domain;
            } catch {
              isExternal = false;
            }
            return {
              href: a.href,
              text: a.textContent?.trim() || '',
              isExternal,
            };
          });
      }, pageUrl.hostname);
    }

    let screenshotData: string | undefined;
    if (screenshot) {
      const buffer = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
      screenshotData = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }

    const html = await page.content();

    await browser.close();

    const truncatedContent =
      content.length > maxContentLength ? content.slice(0, maxContentLength) + '...' : content;

    return {
      url,
      title,
      content: truncatedContent,
      html: html.length < 100000 ? html : undefined,
      markdown: htmlToMarkdown(truncatedContent, title),
      metadata,
      images,
      links,
      screenshot: screenshotData,
      scrapedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      url,
      title: '',
      content: '',
      scrapedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Scraping failed',
    };
  }
}

/**
 * Scrape multiple pages in parallel
 */
export async function scrapePagesWithPlaywright(
  urls: string[],
  options: PlaywrightScraperOptions = {}
): Promise<ScrapedPage[]> {
  const concurrency = 3;
  const results: ScrapedPage[] = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((url) => scrapePageWithPlaywright(url, options))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Search Bing and scrape result pages
 */
export async function searchAndScrapeWithBing(
  query: string,
  apiKey: string,
  options: BingScraperSearchOptions
): Promise<BingScraperSearchResult> {
  const { searchWithBing } = await import('./bing');
  const { maxResults = 5, scrapeContent = true, scraperOptions } = options;

  const startTime = Date.now();

  const searchResponse = await searchWithBing(query, apiKey, { maxResults });

  if (!scrapeContent) {
    return {
      query,
      results: searchResponse.results,
      responseTime: Date.now() - startTime,
    };
  }

  const urls = searchResponse.results.map((r) => r.url);
  const scrapedPages = await scrapePagesWithPlaywright(urls, scraperOptions);

  const enrichedResults = searchResponse.results.map((result, index) => ({
    ...result,
    scrapedContent: scrapedPages[index],
  }));

  return {
    query,
    results: enrichedResults,
    responseTime: Date.now() - startTime,
  };
}

/**
 * Simple HTML to Markdown converter
 */
function htmlToMarkdown(text: string, title?: string): string {
  const lines = text.split('\n').filter((line) => line.trim());
  const markdown: string[] = [];

  if (title) {
    markdown.push(`# ${title}\n`);
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      markdown.push(trimmed);
      markdown.push('');
    }
  }

  return markdown.join('\n');
}

/**
 * Fetch page content using simple HTTP (fallback when Playwright unavailable)
 */
export async function fetchPageContent(
  url: string,
  options: { timeout?: number; maxLength?: number } = {}
): Promise<ScrapedPage> {
  const startTime = Date.now();
  const { timeout = 10000, maxLength = 50000 } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (content.length > maxLength) {
      content = content.slice(0, maxLength) + '...';
    }

    return {
      url,
      title,
      content,
      scrapedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      url,
      title: '',
      content: '',
      scrapedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Fetch failed',
    };
  }
}

/**
 * Smart content fetcher - uses Playwright if available, falls back to HTTP
 */
export async function smartFetchContent(
  url: string,
  options: PlaywrightScraperOptions = {}
): Promise<ScrapedPage> {
  const playwrightAvailable = await isPlaywrightAvailable();

  if (playwrightAvailable && options.javascript !== false) {
    return scrapePageWithPlaywright(url, options);
  }

  return fetchPageContent(url, {
    timeout: options.timeout,
    maxLength: options.maxContentLength,
  });
}

/**
 * Test Playwright scraper connection
 */
export async function testPlaywrightConnection(): Promise<boolean> {
  try {
    const result = await scrapePageWithPlaywright('https://example.com', {
      timeout: 10000,
      maxContentLength: 1000,
    });
    return !result.error && result.content.length > 0;
  } catch {
    return false;
  }
}
