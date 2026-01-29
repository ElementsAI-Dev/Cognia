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
 * Create xAI (Grok) provider instance (OpenAI-compatible)
 */
export function createXaiClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
  });
}

/**
 * Create Together AI provider instance (OpenAI-compatible)
 */
export function createTogetherAIClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.together.xyz/v1',
  });
}

/**
 * Create OpenRouter provider instance (OpenAI-compatible)
 */
export function createOpenRouterClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://cognia.app',
      'X-Title': 'Cognia',
    },
  });
}

/**
 * Create Cohere provider instance (OpenAI-compatible)
 */
export function createCohereClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.cohere.com/compatibility/v1',
  });
}

/**
 * Create Fireworks AI provider instance (OpenAI-compatible)
 */
export function createFireworksClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.fireworks.ai/inference/v1',
  });
}

/**
 * Create Cerebras provider instance (OpenAI-compatible)
 */
export function createCerebrasClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.cerebras.ai/v1',
  });
}

/**
 * Create SambaNova provider instance (OpenAI-compatible)
 */
export function createSambaNovaClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.sambanova.ai/v1',
  });
}

/**
 * Create CLIProxyAPI provider instance (OpenAI-compatible)
 */
export function createCLIProxyAPIClient(apiKey: string, baseURL?: string) {
  return createOpenAI({
    apiKey,
    baseURL: baseURL || 'http://localhost:8317/v1',
  });
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
  switch (protocol) {
    case 'anthropic':
      return createAnthropic({
        apiKey,
        baseURL,
      });
    case 'gemini':
      return createGoogleGenerativeAI({
        apiKey,
        baseURL,
      });
    case 'openai':
    default:
      return createOpenAI({
        apiKey,
        baseURL,
      });
  }
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
    case 'xai':
      return createXaiClient(apiKey)(model);
    case 'togetherai':
      return createTogetherAIClient(apiKey)(model);
    case 'openrouter':
      return createOpenRouterClient(apiKey)(model);
    case 'cohere':
      return createCohereClient(apiKey)(model);
    case 'fireworks':
      return createFireworksClient(apiKey)(model);
    case 'cerebras':
      return createCerebrasClient(apiKey)(model);
    case 'sambanova':
      return createSambaNovaClient(apiKey)(model);
    case 'ollama':
      // For Ollama, use OpenAI-compatible API
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:11434/v1',
        apiKey: 'ollama', // Ollama doesn't require an API key
      })(model);
    // Local providers - all OpenAI-compatible
    case 'lmstudio':
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:1234/v1',
        apiKey: apiKey || 'lm-studio',
      })(model);
    case 'llamacpp':
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:8080/v1',
        apiKey: apiKey || 'llama-cpp',
      })(model);
    case 'llamafile':
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:8080/v1',
        apiKey: apiKey || 'llamafile',
      })(model);
    case 'vllm':
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:8000/v1',
        apiKey: apiKey || 'vllm',
      })(model);
    case 'localai':
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:8080/v1',
        apiKey: apiKey || 'localai',
      })(model);
    case 'jan':
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:1337/v1',
        apiKey: apiKey || 'jan',
      })(model);
    case 'textgenwebui':
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:5000/v1',
        apiKey: apiKey || 'textgen',
      })(model);
    case 'koboldcpp':
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:5001/v1',
        apiKey: apiKey || 'koboldcpp',
      })(model);
    case 'tabbyapi':
      return createOpenAI({
        baseURL: baseURL || 'http://localhost:5000/v1',
        apiKey: apiKey || 'tabbyapi',
      })(model);
    case 'cliproxyapi':
      return createCLIProxyAPIClient(apiKey, baseURL)(model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
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
  return createCustomProviderClient(provider.baseURL, provider.apiKey, protocol)(selectedModel);
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
  return defaultModels[provider] || 'gpt-4o';
}

/**
 * Validate that a provider is supported
 */
export function isValidProvider(provider: string): provider is ProviderName {
  const validProviders: ProviderName[] = [
    'openai', 'anthropic', 'google', 'deepseek', 'groq', 
    'mistral', 'xai', 'togetherai', 'openrouter', 'cohere',
    'fireworks', 'cerebras', 'sambanova', 'ollama',
    // Local providers
    'lmstudio', 'llamacpp', 'llamafile', 'vllm', 'localai',
    'jan', 'textgenwebui', 'koboldcpp', 'tabbyapi',
    // Proxy/Aggregator providers
    'cliproxyapi',
    'auto'
  ];
  return validProviders.includes(provider as ProviderName);
}

/**
 * Unified function to get provider model from config
 * Use this in API routes and hooks for consistent behavior
 */
export function getProviderModelFromConfig(config: ProviderConfig) {
  const { provider, apiKey, baseURL } = config;
  const modelId = config.model || getDefaultModel(provider);
  
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
  return providerDisplayNames[provider] || provider;
}
