/**
 * Proxy-aware AI Client configuration
 *
 * Provides AI SDK providers with proxy support.
 * These functions wrap the standard providers and inject proxy configuration.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { proxyFetch, isProxyEnabled, getCurrentProxyUrl } from '@/lib/network/proxy-fetch';
import type { ProviderName } from '@/types/provider';

export interface ProxyProviderOptions {
  apiKey: string;
  baseURL?: string;
  /** Use proxy for this provider */
  useProxy?: boolean;
}

/**
 * Get fetch function based on proxy settings
 */
function getProxyAwareFetch(useProxy: boolean = true) {
  if (useProxy && isProxyEnabled()) {
    return proxyFetch;
  }
  return undefined; // Use default fetch
}

/**
 * Create OpenAI provider with proxy support
 */
export function createProxyOpenAIClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL,
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create Anthropic provider with proxy support
 */
export function createProxyAnthropicClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createAnthropic({
    apiKey,
    baseURL,
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create Google AI provider with proxy support
 */
export function createProxyGoogleClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createGoogleGenerativeAI({
    apiKey,
    baseURL,
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create Mistral provider with proxy support
 */
export function createProxyMistralClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createMistral({
    apiKey,
    baseURL,
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create DeepSeek provider with proxy support (OpenAI-compatible)
 */
export function createProxyDeepSeekClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com/v1',
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create Groq provider with proxy support (OpenAI-compatible)
 */
export function createProxyGroqClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create xAI (Grok) provider with proxy support (OpenAI-compatible)
 */
export function createProxyXaiClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create Together AI provider with proxy support (OpenAI-compatible)
 */
export function createProxyTogetherAIClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.together.xyz/v1',
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create OpenRouter provider with proxy support (OpenAI-compatible)
 */
export function createProxyOpenRouterClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://cognia.app',
      'X-Title': 'Cognia',
    },
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create Cohere provider with proxy support (OpenAI-compatible)
 */
export function createProxyCohereClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.cohere.com/compatibility/v1',
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create Fireworks AI provider with proxy support (OpenAI-compatible)
 */
export function createProxyFireworksClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.fireworks.ai/inference/v1',
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create Cerebras provider with proxy support (OpenAI-compatible)
 */
export function createProxyCerebrasClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.cerebras.ai/v1',
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create SambaNova provider with proxy support (OpenAI-compatible)
 */
export function createProxySambaNovaClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.sambanova.ai/v1',
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create Ollama provider with proxy support
 */
export function createProxyOllamaClient(options: ProxyProviderOptions) {
  const { baseURL, useProxy = true } = options;
  return createOpenAI({
    apiKey: 'ollama',
    baseURL: baseURL || 'http://localhost:11434/v1',
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Create custom provider with proxy support (OpenAI-compatible)
 */
export function createProxyCustomClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createOpenAI({
    apiKey,
    baseURL,
    fetch: getProxyAwareFetch(useProxy),
  });
}

/**
 * Get provider model with proxy support
 */
export function getProxyProviderModel(
  provider: ProviderName,
  model: string,
  apiKey: string,
  baseURL?: string,
  useProxy: boolean = true
) {
  const options: ProxyProviderOptions = { apiKey, baseURL, useProxy };

  switch (provider) {
    case 'openai':
      return createProxyOpenAIClient(options)(model);
    case 'anthropic':
      return createProxyAnthropicClient(options)(model);
    case 'google':
      return createProxyGoogleClient(options)(model);
    case 'mistral':
      return createProxyMistralClient(options)(model);
    case 'deepseek':
      return createProxyDeepSeekClient(options)(model);
    case 'groq':
      return createProxyGroqClient(options)(model);
    case 'xai':
      return createProxyXaiClient(options)(model);
    case 'togetherai':
      return createProxyTogetherAIClient(options)(model);
    case 'openrouter':
      return createProxyOpenRouterClient(options)(model);
    case 'cohere':
      return createProxyCohereClient(options)(model);
    case 'fireworks':
      return createProxyFireworksClient(options)(model);
    case 'cerebras':
      return createProxyCerebrasClient(options)(model);
    case 'sambanova':
      return createProxySambaNovaClient(options)(model);
    case 'ollama':
      return createProxyOllamaClient({ ...options, baseURL: baseURL || 'http://localhost:11434/v1' })(model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Log proxy status for debugging
 */
export function logProxyStatus() {
  const enabled = isProxyEnabled();
  const url = getCurrentProxyUrl();
  
  if (enabled && url) {
    console.log(`[AI Client] Proxy enabled: ${url}`);
  } else {
    console.log('[AI Client] Proxy disabled');
  }
}
