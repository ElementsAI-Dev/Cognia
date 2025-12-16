/**
 * AI Client configuration - client-side AI SDK setup
 * Since this is a static export for Tauri, we use client-side API calls
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import type { ProviderName, CustomProviderSettings } from '@/types/provider';

export type { ProviderName };

/**
 * Create OpenAI provider instance
 */
export function createOpenAIClient(apiKey: string) {
  return createOpenAI({
    apiKey,
  });
}

/**
 * Create Anthropic provider instance
 */
export function createAnthropicClient(apiKey: string) {
  return createAnthropic({
    apiKey,
  });
}

/**
 * Create Google AI provider instance
 */
export function createGoogleClient(apiKey: string) {
  return createGoogleGenerativeAI({
    apiKey,
  });
}

/**
 * Create Mistral provider instance
 */
export function createMistralClient(apiKey: string) {
  return createMistral({
    apiKey,
  });
}

/**
 * Create DeepSeek provider instance (OpenAI-compatible)
 */
export function createDeepSeekClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com/v1',
  });
}

/**
 * Create Groq provider instance (OpenAI-compatible)
 */
export function createGroqClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

/**
 * Create custom provider instance (OpenAI-compatible)
 */
export function createCustomProviderClient(baseURL: string, apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL,
  });
}

/**
 * Get provider model based on settings
 */
export function getProviderModel(
  provider: ProviderName,
  model: string,
  apiKey: string,
  baseURL?: string
) {
  switch (provider) {
    case 'openai':
      return createOpenAIClient(apiKey)(model);
    case 'anthropic':
      return createAnthropicClient(apiKey)(model);
    case 'google':
      return createGoogleClient(apiKey)(model);
    case 'mistral':
      return createMistralClient(apiKey)(model);
    case 'deepseek':
      return createDeepSeekClient(apiKey)(model);
    case 'groq':
      return createGroqClient(apiKey)(model);
    case 'ollama':
      // For Ollama, use OpenAI-compatible API
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:11434/v1',
        apiKey: 'ollama', // Ollama doesn't require an API key
      })(model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get model from custom provider
 */
export function getCustomProviderModel(
  provider: CustomProviderSettings,
  model?: string
) {
  const selectedModel = model || provider.defaultModel;
  return createCustomProviderClient(provider.baseURL, provider.apiKey)(selectedModel);
}

/**
 * Default models for each provider
 */
export const defaultModels: Record<Exclude<ProviderName, 'auto'>, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  google: 'gemini-2.0-flash-exp',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-large-latest',
  ollama: 'llama3.2',
};
