/**
 * API Route: Generate Preset Suggestions using AI
 * Creates intelligent preset configurations based on user description
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { 
  getProviderModelFromConfig, 
  isValidProvider,
  type ProviderName 
} from '@/lib/ai/core/client';

const PresetSuggestionSchema = z.object({
  name: z.string().describe('A concise, descriptive name for the preset'),
  description: z.string().describe('A brief description of what this preset is for'),
  icon: z.string().describe('An emoji icon that represents this preset'),
  color: z.string().describe('A hex color code for the preset theme'),
  systemPrompt: z.string().describe('A well-crafted system prompt for this use case'),
  temperature: z.number().min(0).max(2).describe('Recommended temperature setting'),
  mode: z.enum(['chat', 'agent', 'research']).describe('The recommended chat mode'),
  webSearchEnabled: z.boolean().describe('Whether web search should be enabled'),
  thinkingEnabled: z.boolean().describe('Whether extended thinking should be enabled'),
  builtinPrompts: z.array(z.object({
    name: z.string(),
    content: z.string(),
    description: z.string().optional(),
  })).describe('Useful quick prompts for this preset'),
});

const GENERATE_PROMPT = `You are an expert AI assistant configuration designer. Based on the user's description, create an optimal preset configuration.

Consider:
1. The specific use case and domain
2. Appropriate temperature (lower for factual, higher for creative)
3. Whether web search would be helpful
4. Whether extended thinking/reasoning is needed
5. Useful built-in quick prompts for common tasks in this domain
6. A clear, effective system prompt

Choose an appropriate emoji icon and color that matches the theme.
Available colors: #6366f1 (indigo), #8b5cf6 (violet), #a855f7 (purple), #d946ef (fuchsia), #ec4899 (pink), #f43f5e (rose), #ef4444 (red), #f97316 (orange), #f59e0b (amber), #22c55e (green), #10b981 (emerald), #14b8a6 (teal), #06b6d4 (cyan), #0ea5e9 (sky), #3b82f6 (blue)`;

interface GenerateRequest {
  description: string;
  provider: string;
  apiKey: string;
  baseURL?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { description, provider, apiKey, baseURL } = body;

    if (!description || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: description and apiKey' },
        { status: 400 }
      );
    }

    // Validate provider and use unified client
    const validProvider = isValidProvider(provider) ? provider as ProviderName : 'openai';
    const { model: aiModel } = getProviderModelFromConfig({
      provider: validProvider,
      apiKey,
      baseURL,
    });

    const result = await generateObject({
      model: aiModel,
      schema: PresetSuggestionSchema,
      system: GENERATE_PROMPT,
      prompt: `Create a preset configuration for: ${description}`,
    });

    return NextResponse.json({
      preset: result.object,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Preset generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate preset' },
      { status: 500 }
    );
  }
}
