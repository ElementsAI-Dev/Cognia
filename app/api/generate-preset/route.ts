/**
 * API Route: Generate Preset Suggestions using AI
 * Legacy compatibility adapter. Canonical path:
 * lib/ai/presets/preset-ai-service.ts#generatePresetFromDescription
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidProvider, type ProviderName } from '@/lib/ai/core/client';
import { generatePresetFromDescription } from '@/lib/ai/presets/preset-ai-service';
import { applyLegacyGenerationRouteHeaders } from '@/lib/ai/generation/legacy-route-deprecation';
import { getProviderConfig } from '@/types/provider';

interface GenerateRequest {
  description: string;
  provider: string;
  apiKey: string;
  baseURL?: string;
  model?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { description, provider, apiKey, baseURL, model } = body;

    if (!description) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
        { error: 'Missing required field: description' },
        { status: 400 }
        ),
        '/api/generate-preset'
      );
    }

    // Legacy adapter delegates to shared preset-ai-service.
    const validProvider = isValidProvider(provider) ? provider as ProviderName : 'openai';
    const providerConfig = getProviderConfig(validProvider);
    const requiresApiKey = providerConfig?.apiKeyRequired ?? true;

    if (requiresApiKey && !apiKey) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
          { error: `Missing required field: apiKey for provider ${validProvider}` },
          { status: 400 }
        ),
        '/api/generate-preset'
      );
    }

    const result = await generatePresetFromDescription(description, {
      provider: validProvider,
      model,
      apiKey: apiKey || '',
      baseURL,
    });

    if (!result.success || !result.preset) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
          { error: result.error || 'Failed to generate preset' },
          { status: 500 }
        ),
        '/api/generate-preset'
      );
    }

    return applyLegacyGenerationRouteHeaders(
      NextResponse.json({
        preset: result.preset,
      }),
      '/api/generate-preset'
    );
  } catch (error) {
    console.error('Preset generation error:', error);
    return applyLegacyGenerationRouteHeaders(
      NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate preset' },
      { status: 500 }
      ),
      '/api/generate-preset'
    );
  }
}
