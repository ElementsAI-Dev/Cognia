/**
 * API Route: Optimize System Prompt using AI
 * Legacy compatibility adapter. Canonical path:
 * lib/ai/presets/preset-ai-service.ts#optimizePresetPrompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidProvider, type ProviderName } from '@/lib/ai/core/client';
import { optimizePresetPrompt } from '@/lib/ai/presets/preset-ai-service';
import {
  circuitBreakerRegistry,
  isProviderAvailable,
} from '@/lib/ai/infrastructure';
import { applyLegacyGenerationRouteHeaders } from '@/lib/ai/generation/legacy-route-deprecation';
import { getProviderConfig } from '@/types/provider';

interface OptimizeRequest {
  prompt: string;
  provider: string;
  apiKey: string;
  baseURL?: string;
  model?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRequest = await request.json();
    const { prompt, provider, apiKey, baseURL, model } = body;

    if (!prompt) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
          { error: 'Missing required field: prompt' },
          { status: 400 }
        ),
        '/api/optimize-prompt'
      );
    }

    // Validate provider
    const validProvider = isValidProvider(provider) ? provider as ProviderName : 'openai';
    const providerConfig = getProviderConfig(validProvider);
    const requiresApiKey = providerConfig?.apiKeyRequired ?? true;

    if (requiresApiKey && !apiKey) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
          { error: `Missing required field: apiKey for provider ${validProvider}` },
          { status: 400 }
        ),
        '/api/optimize-prompt'
      );
    }

    // Check circuit breaker - if provider is failing, reject early
    if (!isProviderAvailable(validProvider)) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
          { error: `Provider ${validProvider} is temporarily unavailable. Please try again later.` },
          { status: 503 }
        ),
        '/api/optimize-prompt'
      );
    }

    const result = await optimizePresetPrompt(prompt, {
      provider: validProvider,
      model,
      apiKey: apiKey || '',
      baseURL,
    });

    if (!result.success || !result.optimizedPrompt) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
          { error: result.error || 'Failed to optimize prompt' },
          { status: 500 }
        ),
        '/api/optimize-prompt'
      );
    }

    // Record success in circuit breaker
    circuitBreakerRegistry.get(validProvider).recordSuccess();

    return applyLegacyGenerationRouteHeaders(
      NextResponse.json({
        optimizedPrompt: result.optimizedPrompt,
      }),
      '/api/optimize-prompt'
    );
  } catch (error) {
    console.error('Prompt optimization error:', error);

    // Record failure in circuit breaker
    try {
      const body = await request.clone().json();
      const failedProvider = isValidProvider(body.provider) ? body.provider as ProviderName : 'openai';
      circuitBreakerRegistry.get(failedProvider).recordFailure(error as Error);
    } catch {
      // Ignore parsing errors
    }

    return applyLegacyGenerationRouteHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to optimize prompt' },
        { status: 500 }
      ),
      '/api/optimize-prompt'
    );
  }
}
