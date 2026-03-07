/**
 * API Route: Enhance Built-in Prompts using AI
 * Legacy compatibility adapter. Canonical path:
 * lib/ai/presets/preset-ai-service.ts#generateBuiltinPrompts
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidProvider, type ProviderName } from '@/lib/ai/core/client';
import { generateBuiltinPrompts } from '@/lib/ai/presets/preset-ai-service';
import { applyLegacyGenerationRouteHeaders } from '@/lib/ai/generation/legacy-route-deprecation';
import { getProviderConfig } from '@/types/provider';

interface EnhanceRequest {
  presetName: string;
  presetDescription?: string;
  systemPrompt?: string;
  existingPrompts?: Array<{ name: string; content: string; description?: string }>;
  action: 'enhance' | 'generate';
  count?: number;
  provider: string;
  apiKey: string;
  baseURL?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EnhanceRequest = await request.json();
    const {
      presetName,
      presetDescription,
      systemPrompt,
      existingPrompts,
      action,
      count = 3,
      provider,
      apiKey,
      baseURL,
    } = body;

    if (!presetName) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
          { error: 'Missing required field: presetName' },
          { status: 400 }
        ),
        '/api/enhance-builtin-prompt'
      );
    }

    // Validate provider and use unified client
    const validProvider = isValidProvider(provider) ? provider as ProviderName : 'openai';
    const providerConfig = getProviderConfig(validProvider);
    const requiresApiKey = providerConfig?.apiKeyRequired ?? true;

    if (requiresApiKey && !apiKey) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
          { error: `Missing required field: apiKey for provider ${validProvider}` },
          { status: 400 }
        ),
        '/api/enhance-builtin-prompt'
      );
    }

    const actionCount = Math.max(1, count);
    const sourcePrompts =
      action === 'enhance'
        ? (existingPrompts || []).map((prompt) => ({
            name: prompt.name,
            content: prompt.content,
          }))
        : [];

    const result = await generateBuiltinPrompts(
      presetName,
      presetDescription,
      systemPrompt,
      sourcePrompts,
      {
        provider: validProvider,
        apiKey: apiKey || '',
        baseURL,
      },
      actionCount
    );

    if (!result.success || !result.prompts) {
      return applyLegacyGenerationRouteHeaders(
        NextResponse.json(
          { error: result.error || 'Failed to enhance prompts' },
          { status: 500 }
        ),
        '/api/enhance-builtin-prompt'
      );
    }

    return applyLegacyGenerationRouteHeaders(
      NextResponse.json({
        prompts: result.prompts,
      }),
      '/api/enhance-builtin-prompt'
    );
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    return applyLegacyGenerationRouteHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to enhance prompts' },
        { status: 500 }
      ),
      '/api/enhance-builtin-prompt'
    );
  }
}
