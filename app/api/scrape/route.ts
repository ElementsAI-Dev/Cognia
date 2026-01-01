/**
 * Web Scraper API Route
 * Server-side endpoint for web page content extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  scrapePageWithPlaywright,
  fetchPageContent,
  isPlaywrightAvailable,
  type PlaywrightScraperOptions,
} from '@/lib/search/providers/playwright-scraper';

interface ScrapeRequestBody {
  url: string;
  usePlaywright?: boolean;
  extractImages?: boolean;
  extractLinks?: boolean;
  extractMetadata?: boolean;
  timeout?: number;
  maxContentLength?: number;
  waitForSelector?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequestBody = await request.json();
    const {
      url,
      usePlaywright = false,
      extractImages = false,
      extractLinks = false,
      extractMetadata = true,
      timeout = 15000,
      maxContentLength = 50000,
      waitForSelector,
    } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    let result;
    let method: 'playwright' | 'http' = 'http';

    if (usePlaywright) {
      const playwrightAvailable = await isPlaywrightAvailable();

      if (playwrightAvailable) {
        const options: PlaywrightScraperOptions = {
          timeout,
          maxContentLength,
          extractImages,
          extractLinks,
          extractMetadata,
          waitForSelector,
        };

        result = await scrapePageWithPlaywright(url, options);
        method = 'playwright';
      } else {
        result = await fetchPageContent(url, { timeout, maxLength: maxContentLength });
        method = 'http';
      }
    } else {
      result = await fetchPageContent(url, { timeout, maxLength: maxContentLength });
      method = 'http';
    }

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          url,
          error: result.error,
          responseTime: result.responseTime,
          method,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      title: result.title,
      content: result.content,
      markdown: result.markdown,
      metadata: result.metadata,
      images: result.images,
      links: result.links,
      responseTime: result.responseTime,
      method,
    });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scraping failed' },
      { status: 500 }
    );
  }
}
