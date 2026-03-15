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
import { isProxyEnabled, getCurrentProxyUrl } from '@/lib/network/proxy-fetch';
import type { ProviderName } from '@/types/provider';
import { loggers } from '@/lib/logger';
import {
  createFeatureProviderClient,
  recordLegacyProviderFacadeUsage,
} from '@/lib/ai/provider-consumption';

const log = loggers.ai;

export interface ProxyProviderOptions {
  apiKey: string;
  baseURL?: string;
  /** Use proxy for this provider */
  useProxy?: boolean;
}

function createLegacyProxyFacadeClient(options: {
  helperName: string;
  providerId: string;
  apiKey: string;
  baseURL?: string;
  useProxy?: boolean;
  isCustomProvider?: boolean;
}) {
  recordLegacyProviderFacadeUsage({
    facadeId: 'core/proxy-client',
    helperName: options.helperName,
    providerId: options.providerId,
    lastBaseURL: options.baseURL,
    useProxy: options.useProxy,
  });

  return createFeatureProviderClient({
    providerId: options.providerId,
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    useProxy: options.useProxy,
    isCustomProvider: options.isCustomProvider,
  });
}

/**
 * Create OpenAI provider with proxy support
 */
export function createProxyOpenAIClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyOpenAIClient',
    providerId: 'openai',
    apiKey,
    baseURL,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Anthropic provider with proxy support
 */
export function createProxyAnthropicClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyAnthropicClient',
    providerId: 'anthropic',
    apiKey,
    baseURL,
    useProxy,
  }) as ReturnType<typeof createAnthropic>;
}

/**
 * Create Google AI provider with proxy support
 */
export function createProxyGoogleClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyGoogleClient',
    providerId: 'google',
    apiKey,
    baseURL,
    useProxy,
  }) as ReturnType<typeof createGoogleGenerativeAI>;
}

/**
 * Create Mistral provider with proxy support
 */
export function createProxyMistralClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyMistralClient',
    providerId: 'mistral',
    apiKey,
    baseURL,
    useProxy,
  }) as ReturnType<typeof createMistral>;
}

/**
 * Create DeepSeek provider with proxy support (OpenAI-compatible)
 */
export function createProxyDeepSeekClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyDeepSeekClient',
    providerId: 'deepseek',
    apiKey,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Groq provider with proxy support (OpenAI-compatible)
 */
export function createProxyGroqClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyGroqClient',
    providerId: 'groq',
    apiKey,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create xAI (Grok) provider with proxy support (OpenAI-compatible)
 */
export function createProxyXaiClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyXaiClient',
    providerId: 'xai',
    apiKey,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Together AI provider with proxy support (OpenAI-compatible)
 */
export function createProxyTogetherAIClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyTogetherAIClient',
    providerId: 'togetherai',
    apiKey,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create OpenRouter provider with proxy support (OpenAI-compatible)
 */
export function createProxyOpenRouterClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyOpenRouterClient',
    providerId: 'openrouter',
    apiKey,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Cohere provider with proxy support (OpenAI-compatible)
 */
export function createProxyCohereClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyCohereClient',
    providerId: 'cohere',
    apiKey,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Fireworks AI provider with proxy support (OpenAI-compatible)
 */
export function createProxyFireworksClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyFireworksClient',
    providerId: 'fireworks',
    apiKey,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Cerebras provider with proxy support (OpenAI-compatible)
 */
export function createProxyCerebrasClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyCerebrasClient',
    providerId: 'cerebras',
    apiKey,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create SambaNova provider with proxy support (OpenAI-compatible)
 */
export function createProxySambaNovaClient(options: ProxyProviderOptions) {
  const { apiKey, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxySambaNovaClient',
    providerId: 'sambanova',
    apiKey,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Ollama provider with proxy support
 */
export function createProxyOllamaClient(options: ProxyProviderOptions) {
  const { baseURL, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyOllamaClient',
    providerId: 'ollama',
    apiKey: 'ollama',
    baseURL,
    useProxy,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create custom provider with proxy support (OpenAI-compatible)
 */
export function createProxyCustomClient(options: ProxyProviderOptions) {
  const { apiKey, baseURL, useProxy = true } = options;
  return createLegacyProxyFacadeClient({
    helperName: 'createProxyCustomClient',
    providerId: 'custom-provider',
    apiKey,
    baseURL,
    useProxy,
    isCustomProvider: true,
  }) as ReturnType<typeof createOpenAI>;
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
  recordLegacyProviderFacadeUsage({
    facadeId: 'core/proxy-client',
    helperName: 'getProxyProviderModel',
    providerId: provider,
    lastModelId: model,
    lastBaseURL: baseURL,
    useProxy,
  });
  return createFeatureProviderClient({
    providerId: provider,
    apiKey,
    baseURL,
    useProxy,
  })(model);
}

/**
 * Log proxy status for debugging
 */
export function logProxyStatus() {
  const enabled = isProxyEnabled();
  const url = getCurrentProxyUrl();
  
  if (enabled && url) {
    log.info(`Proxy enabled: ${url}`);
  } else {
    log.info('Proxy disabled');
  }
}
