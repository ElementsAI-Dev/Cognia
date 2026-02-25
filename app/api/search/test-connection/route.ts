/**
 * Search Provider Connection Test API Route
 * Server-side endpoint for testing search provider connections
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SearchProviderSettings, SearchProviderType } from '@/types/search';
import { testProviderConnection } from '@/lib/search/search-service';

interface TestConnectionRequestBody {
  provider: SearchProviderType;
  apiKey: string;
  /** Backward compatible: allow passing provider-specific settings (e.g., google cx) */
  providerSettings?: Partial<SearchProviderSettings>;
  /** Backward compatible: allow passing google cx directly */
  cx?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestConnectionRequestBody = await request.json();
    const { provider, apiKey } = body;
    const cx = body.cx ?? body.providerSettings?.cx;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and apiKey are required' },
        { status: 400 }
      );
    }

    // Pass provider-specific settings (google cx, etc.) through to the service layer.
    const isValid = await testProviderConnection(provider, apiKey, { ...body.providerSettings, cx });

    return NextResponse.json({ success: isValid });
  } catch (error) {
    console.error('Test connection API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test connection failed' },
      { status: 500 }
    );
  }
}
