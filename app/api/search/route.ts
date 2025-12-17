/**
 * Web Search API Route
 * Server-side endpoint for multi-provider web search
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SearchProviderType, SearchOptions, SearchProviderSettings } from '@/types/search';
import { searchWithProvider, search } from '@/lib/search/search-service';

interface SearchRequestBody {
  query: string;
  provider?: SearchProviderType;
  apiKey?: string;
  providerSettings?: Record<SearchProviderType, SearchProviderSettings>;
  options?: SearchOptions;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequestBody = await request.json();
    const { query, provider, apiKey, providerSettings, options } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    let result;

    if (provider && apiKey) {
      result = await searchWithProvider(provider, query, apiKey, options || {});
    } else if (providerSettings) {
      result = await search(query, {
        ...options,
        provider,
        providerSettings,
        fallbackEnabled: true,
      });
    } else {
      return NextResponse.json(
        { error: 'Either apiKey with provider, or providerSettings is required' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
