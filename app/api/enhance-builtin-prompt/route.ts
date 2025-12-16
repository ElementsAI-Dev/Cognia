/**
 * API Route: Enhance Built-in Prompts using AI
 * Generates and improves quick prompts for presets
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const EnhancedPromptsSchema = z.object({
  prompts: z.array(z.object({
    name: z.string().describe('Short, descriptive name for the prompt'),
    content: z.string().describe('The actual prompt content'),
    description: z.string().describe('Brief description of what this prompt does'),
  })).describe('Array of enhanced or generated prompts'),
});

const ENHANCE_PROMPT = `You are an expert prompt engineer. Your task is to either:
1. Enhance existing prompts to make them more effective
2. Generate new useful prompts based on the context

Guidelines:
- Make prompts clear, specific, and actionable
- Include placeholders like [topic], [subject] where user input is needed
- Keep prompts concise but comprehensive
- Ensure prompts are practical and commonly useful
- Match the style and purpose of the preset context`;

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

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing required field: apiKey' },
        { status: 400 }
      );
    }

    let aiModel;

    switch (provider) {
      case 'openai':
        const openai = createOpenAI({ apiKey, baseURL });
        aiModel = openai('gpt-4o-mini');
        break;
      case 'anthropic':
        const anthropic = createAnthropic({ apiKey, baseURL });
        aiModel = anthropic('claude-3-5-haiku-latest');
        break;
      case 'google':
        const google = createGoogleGenerativeAI({ apiKey, baseURL });
        aiModel = google('gemini-2.0-flash-exp');
        break;
      default:
        const defaultOpenai = createOpenAI({ apiKey, baseURL });
        aiModel = defaultOpenai('gpt-4o-mini');
    }

    let userPrompt: string;

    if (action === 'enhance' && existingPrompts && existingPrompts.length > 0) {
      userPrompt = `Enhance these existing prompts for the "${presetName}" preset:
${existingPrompts.map((p, i) => `${i + 1}. ${p.name}: ${p.content}`).join('\n')}

Context:
- Preset: ${presetName}
- Description: ${presetDescription || 'N/A'}
- System Prompt: ${systemPrompt || 'N/A'}`;
    } else {
      userPrompt = `Generate ${count} useful quick prompts for the "${presetName}" preset.

Context:
- Preset: ${presetName}
- Description: ${presetDescription || 'N/A'}
- System Prompt: ${systemPrompt || 'N/A'}

Create practical prompts that users would commonly need for this use case.`;
    }

    const result = await generateObject({
      model: aiModel,
      schema: EnhancedPromptsSchema,
      system: ENHANCE_PROMPT,
      prompt: userPrompt,
    });

    return NextResponse.json({
      prompts: result.object.prompts,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enhance prompts' },
      { status: 500 }
    );
  }
}
