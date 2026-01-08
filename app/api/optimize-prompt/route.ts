/**
 * API Route: Optimize System Prompt using AI
 * Enhances and improves system prompts for better AI interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { 
  getProviderModelFromConfig, 
  isValidProvider,
  type ProviderName 
} from '@/lib/ai/core/client';
import {
  circuitBreakerRegistry,
  isProviderAvailable,
} from '@/lib/ai/infrastructure';

const OPTIMIZE_PROMPT = `You are an expert prompt engineer. Your task is to optimize and enhance the given system prompt to make it more effective, clear, and comprehensive.

Guidelines for optimization:
1. Make the prompt more specific and actionable
2. Add clear role definition if missing
3. Include output format guidelines if appropriate
4. Add constraints and boundaries where needed
5. Improve clarity and reduce ambiguity
6. Keep the original intent and purpose
7. Make it concise but comprehensive

Return ONLY the optimized prompt text, without any explanations or meta-commentary.`;

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

    if (!prompt || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt and apiKey' },
        { status: 400 }
      );
    }

    // Validate provider
    const validProvider = isValidProvider(provider) ? provider as ProviderName : 'openai';

    // Check circuit breaker - if provider is failing, reject early
    if (!isProviderAvailable(validProvider)) {
      return NextResponse.json(
        { error: `Provider ${validProvider} is temporarily unavailable. Please try again later.` },
        { status: 503 }
      );
    }

    // Use unified client to get model
    const { model: aiModel } = getProviderModelFromConfig({
      provider: validProvider,
      model,
      apiKey,
      baseURL,
    });

    const result = await generateText({
      model: aiModel,
      system: OPTIMIZE_PROMPT,
      prompt: `Please optimize this system prompt:\n\n${prompt}`,
    });

    // Record success in circuit breaker
    circuitBreakerRegistry.get(validProvider).recordSuccess();

    return NextResponse.json({
      optimizedPrompt: result.text.trim(),
      usage: result.usage,
    });
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

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize prompt' },
      { status: 500 }
    );
  }
}
