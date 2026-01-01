/**
 * Search and Scrape API Route
 * Combines web search with content extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SearchProviderType, SearchProviderSettings } from '@/types/search';
import { searchWithProvider } from '@/lib/search/search-service';
import {
  fetchPageContent,
  scrapePageWithPlaywright,
  isPlaywrightAvailable,
} from '@/lib/search/providers/playwright-scraper';

interface SearchAndScrapeRequestBody {
  query: string;
  maxResults?: number;
  scrapeContent?: boolean;
  usePlaywright?: boolean;
  provider?: SearchProviderType;
  apiKey?: string;
  providerSettings?: Record<SearchProviderType, SearchProviderSettings>;
  timeout?: number;
  maxContentLength?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchAndScrapeRequestBody = await request.json();
    const {
      query,
      maxResults = 3,
      scrapeContent = true,
      usePlaywright = false,
      provider = 'bing',
      apiKey,
      providerSettings,
      timeout = 15000,
      maxContentLength = 30000,
    } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const startTime = Date.now();

    let searchApiKey = apiKey;
    if (!searchApiKey && providerSettings) {
      searchApiKey = providerSettings[provider]?.apiKey;
    }

    if (!searchApiKey) {
      return NextResponse.json(
        { error: 'API key is required for search' },
        { status: 400 }
      );
    }

    const searchResponse = await searchWithProvider(provider, query, searchApiKey, {
      maxResults,
    });

    if (!scrapeContent) {
      return NextResponse.json({
        success: true,
        query,
        results: searchResponse.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
        })),
        responseTime: Date.now() - startTime,
      });
    }

    const playwrightAvailable = usePlaywright && (await isPlaywrightAvailable());

    const scrapePromises = searchResponse.results.slice(0, maxResults).map(async (result) => {
      try {
        let scraped;
        if (playwrightAvailable) {
          scraped = await scrapePageWithPlaywright(result.url, {
            timeout,
            maxContentLength,
            extractMetadata: true,
          });
        } else {
          scraped = await fetchPageContent(result.url, {
            timeout,
            maxLength: maxContentLength,
          });
        }

        return {
          title: result.title,
          url: result.url,
          snippet: result.content,
          fullContent: scraped.error ? undefined : scraped.content,
          scrapedSuccessfully: !scraped.error,
        };
      } catch {
        return {
          title: result.title,
          url: result.url,
          snippet: result.content,
          scrapedSuccessfully: false,
        };
      }
    });

    const results = await Promise.all(scrapePromises);

    return NextResponse.json({
      success: true,
      query,
      results,
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Search and scrape API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search and scrape failed' },
      { status: 500 }
    );
  }
}
