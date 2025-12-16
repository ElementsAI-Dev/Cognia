/**
 * API Route: Optimize System Prompt using AI
 * Enhances and improves system prompts for better AI interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

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

    let aiModel;
    const defaultModel = model || getDefaultModel(provider);

    switch (provider) {
      case 'openai':
        const openai = createOpenAI({ apiKey, baseURL });
        aiModel = openai(defaultModel);
        break;
      case 'anthropic':
        const anthropic = createAnthropic({ apiKey, baseURL });
        aiModel = anthropic(defaultModel);
        break;
      case 'google':
        const google = createGoogleGenerativeAI({ apiKey, baseURL });
        aiModel = google(defaultModel);
        break;
      default:
        const defaultOpenai = createOpenAI({ apiKey, baseURL });
        aiModel = defaultOpenai('gpt-4o-mini');
    }

    const result = await generateText({
      model: aiModel,
      system: OPTIMIZE_PROMPT,
      prompt: `Please optimize this system prompt:\n\n${prompt}`,
    });

    return NextResponse.json({
      optimizedPrompt: result.text.trim(),
      usage: result.usage,
    });
  } catch (error) {
    console.error('Prompt optimization error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize prompt' },
      { status: 500 }
    );
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-3-5-haiku-latest';
    case 'google':
      return 'gemini-2.0-flash-exp';
    default:
      return 'gpt-4o-mini';
  }
}
