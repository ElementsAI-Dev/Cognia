/**
 * API Route: Chat Widget Streaming API
 * Handles chat completions for the floating chat widget
 */

import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { 
  getProviderModelFromConfig, 
  isValidProvider,
  type ProviderName 
} from '@/lib/ai/core/client';
import {
  circuitBreakerRegistry,
  isProviderAvailable,
  recordApiUsage,
} from '@/lib/ai/infrastructure';

interface ChatRequest {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  provider: string;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, provider, model, apiKey, baseURL } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate provider and get model
    const validProvider = isValidProvider(provider) ? provider as ProviderName : 'openai';

    // Check circuit breaker - if provider is failing, reject early
    if (!isProviderAvailable(validProvider)) {
      return new Response(
        JSON.stringify({ error: `Provider ${validProvider} is temporarily unavailable. Please try again later.` }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { model: aiModel } = getProviderModelFromConfig({
      provider: validProvider,
      model: model || undefined,
      apiKey: apiKey || process.env.OPENAI_API_KEY || '',
      baseURL,
    });

    const startTime = Date.now();

    // Stream the response
    const result = streamText({
      model: aiModel,
      messages,
    });

    // Record success and return the streaming response
    circuitBreakerRegistry.get(validProvider).recordSuccess();
    recordApiUsage({
      providerId: validProvider,
      modelId: model || 'default',
      inputTokens: 0, // Estimated, actual usage tracked elsewhere
      outputTokens: 0,
      cost: 0,
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat widget API error:', error);

    // Record failure in circuit breaker
    const validProvider = isValidProvider((await request.clone().json()).provider) 
      ? (await request.clone().json()).provider as ProviderName 
      : 'openai';
    circuitBreakerRegistry.get(validProvider).recordFailure(error as Error);

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
