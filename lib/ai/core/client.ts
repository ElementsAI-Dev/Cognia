/**
 * AI Client configuration - unified AI SDK setup
 * Works in both client-side and server-side (API routes) contexts
 * 
 * Features:
 * - Multi-provider support (OpenAI, Anthropic, Google, Mistral, etc.)
 * - OpenAI-compatible providers (DeepSeek, Groq, xAI, etc.)
 * - Middleware support for reasoning extraction, caching, retry
 * - Vision/multimodal content building
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import type { ProviderName, CustomProviderSettings, ApiProtocol } from '@/types/provider';
import type { LanguageModel } from 'ai';
import { evaluateRuntimeEligibility } from '@/lib/ai/providers/completeness';
import {
  getBuiltInProviderCatalogEntry,
  getBuiltInProviderDefaultModel,
  isBuiltInProviderId,
} from '@/types/provider/built-in-provider-catalog';
import {
  createFeatureProviderClient,
  recordLegacyProviderFacadeUsage,
} from '@/lib/ai/provider-consumption';

export interface ProviderConfig {
  provider: ProviderName;
  model?: string;
  apiKey: string;
  baseURL?: string;
}

export interface ProviderModelResult {
  model: ReturnType<typeof createOpenAI> extends (id: string) => infer R ? R : never;
  provider: ProviderName;
  modelId: string;
}

export type { ProviderName };

function createLegacyFacadeClient(options: {
  helperName: string;
  providerId: string;
  apiKey: string;
  baseURL?: string;
  protocol?: ApiProtocol;
  isCustomProvider?: boolean;
}) {
  recordLegacyProviderFacadeUsage({
    facadeId: 'core/client',
    helperName: options.helperName,
    providerId: options.providerId,
    lastBaseURL: options.baseURL,
  });

  return createFeatureProviderClient({
    providerId: options.providerId,
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    protocol: options.protocol,
    isCustomProvider: options.isCustomProvider,
  });
}

/**
 * Create OpenAI provider instance
 */
export function createOpenAIClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createOpenAIClient',
    providerId: 'openai',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Anthropic provider instance
 */
export function createAnthropicClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createAnthropicClient',
    providerId: 'anthropic',
    apiKey,
  }) as ReturnType<typeof createAnthropic>;
}

/**
 * Create Google AI provider instance
 */
export function createGoogleClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createGoogleClient',
    providerId: 'google',
    apiKey,
  }) as ReturnType<typeof createGoogleGenerativeAI>;
}

/**
 * Create Mistral provider instance
 */
export function createMistralClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createMistralClient',
    providerId: 'mistral',
    apiKey,
  }) as ReturnType<typeof createMistral>;
}

/**
 * Create DeepSeek provider instance (OpenAI-compatible)
 */
export function createDeepSeekClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createDeepSeekClient',
    providerId: 'deepseek',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Groq provider instance (OpenAI-compatible)
 */
export function createGroqClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createGroqClient',
    providerId: 'groq',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create xAI (Grok) provider instance (OpenAI-compatible)
 */
export function createXaiClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createXaiClient',
    providerId: 'xai',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Together AI provider instance (OpenAI-compatible)
 */
export function createTogetherAIClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createTogetherAIClient',
    providerId: 'togetherai',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create OpenRouter provider instance (OpenAI-compatible)
 */
export function createOpenRouterClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createOpenRouterClient',
    providerId: 'openrouter',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Cohere provider instance (OpenAI-compatible)
 */
export function createCohereClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createCohereClient',
    providerId: 'cohere',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Fireworks AI provider instance (OpenAI-compatible)
 */
export function createFireworksClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createFireworksClient',
    providerId: 'fireworks',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Cerebras provider instance (OpenAI-compatible)
 */
export function createCerebrasClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createCerebrasClient',
    providerId: 'cerebras',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create SambaNova provider instance (OpenAI-compatible)
 */
export function createSambaNovaClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createSambaNovaClient',
    providerId: 'sambanova',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create Zhipu provider instance (OpenAI-compatible)
 */
export function createZhipuClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createZhipuClient',
    providerId: 'zhipu',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create MiniMax provider instance (OpenAI-compatible)
 */
export function createMiniMaxClient(apiKey: string) {
  return createLegacyFacadeClient({
    helperName: 'createMiniMaxClient',
    providerId: 'minimax',
    apiKey,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create CLIProxyAPI provider instance (OpenAI-compatible)
 */
export function createCLIProxyAPIClient(apiKey: string, baseURL?: string) {
  return createLegacyFacadeClient({
    helperName: 'createCLIProxyAPIClient',
    providerId: 'cliproxyapi',
    apiKey,
    baseURL,
  }) as ReturnType<typeof createOpenAI>;
}

/**
 * Create custom provider instance with protocol support
 * @param baseURL - The base URL of the custom provider
 * @param apiKey - API key for authentication
 * @param protocol - API protocol to use (openai, anthropic, gemini)
 */
export function createCustomProviderClient(
  baseURL: string,
  apiKey: string,
  protocol: ApiProtocol = 'openai'
) {
  return createLegacyFacadeClient({
    helperName: 'createCustomProviderClient',
    providerId: 'custom-provider',
    apiKey,
    baseURL,
    protocol,
    isCustomProvider: true,
  }) as ReturnType<typeof createOpenAI>;
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
  recordLegacyProviderFacadeUsage({
    facadeId: 'core/client',
    helperName: 'getProviderModel',
    providerId: provider,
    lastModelId: model,
    lastBaseURL: baseURL,
  });

  return createFeatureProviderClient({
    providerId: provider,
    apiKey,
    baseURL,
  })(model);
}

/**
 * Get model from custom provider with protocol support
 */
export function getCustomProviderModel(
  provider: CustomProviderSettings,
  model?: string
): LanguageModel {
  const selectedModel = model || provider.defaultModel;
  const protocol = provider.apiProtocol || 'openai';
  recordLegacyProviderFacadeUsage({
    facadeId: 'core/client',
    helperName: 'getCustomProviderModel',
    providerId: provider.id || provider.name || 'custom-provider',
    lastModelId: selectedModel,
    lastBaseURL: provider.baseURL,
  });
  return createFeatureProviderClient({
    providerId: provider.id || provider.name || 'custom-provider',
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    protocol,
    isCustomProvider: true,
  })(selectedModel) as LanguageModel;
}

/**
 * Get provider model with full configuration
 */
export function getProviderModelWithConfig(config: {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
}): LanguageModel {
  return getProviderModel(config.provider, config.model, config.apiKey, config.baseURL);
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
  xai: 'grok-3',
  togetherai: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  openrouter: 'anthropic/claude-sonnet-4',
  cohere: 'command-r-plus',
  fireworks: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
  cerebras: 'llama-3.3-70b',
  sambanova: 'Meta-Llama-3.3-70B-Instruct',
  zhipu: 'glm-4-flash',
  minimax: 'abab6.5s-chat',
  ollama: 'llama3.2',
  // Local providers
  lmstudio: 'local-model',
  llamacpp: 'local-model',
  llamafile: 'local-model',
  vllm: 'local-model',
  localai: 'local-model',
  jan: 'local-model',
  textgenwebui: 'local-model',
  koboldcpp: 'local-model',
  tabbyapi: 'local-model',
  // Proxy/Aggregator providers
  cliproxyapi: 'gemini-2.5-flash',
};

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider: ProviderName): string {
  if (provider === 'auto') {
    return defaultModels.openai;
  }
  return getBuiltInProviderDefaultModel(provider) || defaultModels[provider] || 'gpt-4o';
}

/**
 * Validate that a provider is supported
 */
export function isValidProvider(provider: string): provider is ProviderName {
  return provider === 'auto' || isBuiltInProviderId(provider);
}

/**
 * Unified function to get provider model from config
 * Use this in API routes and hooks for consistent behavior
 */
export function getProviderModelFromConfig(config: ProviderConfig) {
  const { provider, apiKey, baseURL } = config;
  const modelId = config.model || getDefaultModel(provider);

  const eligibility = evaluateRuntimeEligibility(provider, {
    apiKey,
    baseURL,
    enabled: true,
  });
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason || `Provider ${provider} is not eligible for runtime execution`);
  }

  if (provider === 'auto') {
    // Auto mode defaults to OpenAI
    return {
      model: createOpenAIClient(apiKey)(modelId),
      provider: 'openai' as ProviderName,
      modelId,
    };
  }
  
  return {
    model: getProviderModel(provider, modelId, apiKey, baseURL),
    provider,
    modelId,
  };
}

/**
 * Check if a model supports vision/multimodal
 */
export function isVisionModel(model: string): boolean {
  const visionModels = [
    'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision',
    'claude-3', 'claude-sonnet-4', 'claude-opus-4',
    'gemini-1.5', 'gemini-2.0',
    'grok-3',
  ];
  return visionModels.some(vm => model.toLowerCase().includes(vm.toLowerCase()));
}

/**
 * Check if a model supports tool calling
 */
export function supportsToolCalling(model: string): boolean {
  const noToolModels = ['o1', 'o1-mini', 'deepseek-reasoner'];
  return !noToolModels.some(nt => model.toLowerCase().includes(nt.toLowerCase()));
}

/**
 * Build multimodal content for vision models
 */
export async function buildMultimodalContent(
  text: string,
  images: Array<{ url: string; mimeType: string; file?: File }>
): Promise<Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType: string }>> {
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mimeType: string }> = [];
  
  if (text) {
    content.push({ type: 'text', text });
  }
  
  for (const img of images) {
    let base64Data = img.url;
    
    // If it's a blob URL and we have the file, convert to base64
    if (img.url.startsWith('blob:') && img.file) {
      const arrayBuffer = await img.file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
    } else if (img.url.startsWith('data:')) {
      // Extract base64 from data URL
      base64Data = img.url.split(',')[1] || '';
    }
    
    content.push({
      type: 'image',
      image: base64Data,
      mimeType: img.mimeType,
    });
  }
  
  return content;
}

/**
 * Check if a model supports reasoning/thinking
 */
export function supportsReasoning(model: string): boolean {
  const reasoningModels = [
    'o1', 'o1-mini', 'o1-preview',
    'deepseek-reasoner',
    'claude-3-5-sonnet', // With extended thinking
  ];
  return reasoningModels.some(rm => model.toLowerCase().includes(rm.toLowerCase()));
}

/**
 * Get recommended temperature for a model
 */
export function getRecommendedTemperature(model: string): number {
  // Reasoning models work best with lower temperature
  if (supportsReasoning(model)) {
    return 0.1;
  }
  // Code models work best with lower temperature
  if (model.includes('code') || model.includes('codex')) {
    return 0.2;
  }
  return 0.7;
}

/**
 * Provider display names
 */
export const providerDisplayNames: Record<Exclude<ProviderName, 'auto'>, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  deepseek: 'DeepSeek',
  groq: 'Groq',
  mistral: 'Mistral AI',
  xai: 'xAI (Grok)',
  togetherai: 'Together AI',
  openrouter: 'OpenRouter',
  cohere: 'Cohere',
  fireworks: 'Fireworks AI',
  cerebras: 'Cerebras',
  sambanova: 'SambaNova',
  zhipu: 'Zhipu AI (智谱清言)',
  minimax: 'MiniMax',
  ollama: 'Ollama',
  // Local inference frameworks
  lmstudio: 'LM Studio',
  llamacpp: 'llama.cpp',
  llamafile: 'Llamafile',
  vllm: 'vLLM',
  localai: 'LocalAI',
  jan: 'Jan',
  textgenwebui: 'Text Generation WebUI',
  koboldcpp: 'KoboldCpp',
  tabbyapi: 'TabbyAPI',
  // Proxy/Aggregator providers
  cliproxyapi: 'CLIProxyAPI',
};

/**
 * Get display name for a provider
 */
export function getProviderDisplayName(provider: ProviderName): string {
  if (provider === 'auto') return 'Auto';
  return getBuiltInProviderCatalogEntry(provider)?.name || providerDisplayNames[provider] || provider;
}
