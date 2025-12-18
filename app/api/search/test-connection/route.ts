/**
 * Search Provider Connection Test API Route
 * Server-side endpoint for testing search provider connections
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SearchProviderType } from '@/types/search';
import { testProviderConnection } from '@/lib/search/search-service';

interface TestConnectionRequestBody {
  provider: SearchProviderType;
  apiKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestConnectionRequestBody = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and apiKey are required' },
        { status: 400 }
      );
    }

    const isValid = await testProviderConnection(provider, apiKey);

    return NextResponse.json({ success: isValid });
  } catch (error) {
    console.error('Test connection API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test connection failed' },
      { status: 500 }
    );
  }
}
