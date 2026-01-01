/**
 * Bulk Web Scraper API Route
 * Server-side endpoint for scraping multiple web pages
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  scrapePagesWithPlaywright,
  fetchPageContent,
  isPlaywrightAvailable,
} from '@/lib/search/providers/playwright-scraper';

interface BulkScrapeRequestBody {
  urls: string[];
  usePlaywright?: boolean;
  extractMetadata?: boolean;
  timeout?: number;
  maxContentLength?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkScrapeRequestBody = await request.json();
    const {
      urls,
      usePlaywright = false,
      extractMetadata = true,
      timeout = 15000,
      maxContentLength = 30000,
    } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'URLs array is required' }, { status: 400 });
    }

    if (urls.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 URLs allowed per request' }, { status: 400 });
    }

    const validUrls: string[] = [];
    for (const url of urls) {
      try {
        new URL(url);
        validUrls.push(url);
      } catch {
        // Skip invalid URLs
      }
    }

    if (validUrls.length === 0) {
      return NextResponse.json({ error: 'No valid URLs provided' }, { status: 400 });
    }

    const startTime = Date.now();
    let results;
    let method: 'playwright' | 'http' = 'http';

    if (usePlaywright) {
      const playwrightAvailable = await isPlaywrightAvailable();

      if (playwrightAvailable) {
        results = await scrapePagesWithPlaywright(validUrls, {
          timeout,
          maxContentLength,
          extractMetadata,
        });
        method = 'playwright';
      } else {
        results = await Promise.all(
          validUrls.map((url) => fetchPageContent(url, { timeout, maxLength: maxContentLength }))
        );
        method = 'http';
      }
    } else {
      results = await Promise.all(
        validUrls.map((url) => fetchPageContent(url, { timeout, maxLength: maxContentLength }))
      );
      method = 'http';
    }

    const formattedResults = results.map((result) => ({
      success: !result.error,
      url: result.url,
      title: result.title,
      content: result.content,
      markdown: result.markdown,
      metadata: result.metadata,
      responseTime: result.responseTime,
      method,
      error: result.error,
    }));

    return NextResponse.json({
      success: true,
      results: formattedResults,
      totalTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Bulk scrape API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk scraping failed' },
      { status: 500 }
    );
  }
}
