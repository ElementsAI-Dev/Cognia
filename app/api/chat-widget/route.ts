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
    const { model: aiModel } = getProviderModelFromConfig({
      provider: validProvider,
      model: model || undefined,
      apiKey: apiKey || process.env.OPENAI_API_KEY || '',
      baseURL,
    });

    // Stream the response
    const result = streamText({
      model: aiModel,
      messages,
    });

    // Return the streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat widget API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
