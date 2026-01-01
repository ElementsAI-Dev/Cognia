/**
 * AI Registry - Unified multi-provider management using AI SDK
 * 
 * Features:
 * - Provider registry with model aliases
 * - Custom providers with default settings
 * - Middleware integration (reasoning, caching, default settings)
 * - Global provider configuration
 * 
 * Based on AI SDK v5+ best practices:
 * https://ai-sdk.dev/docs/ai-sdk-core/provider-management
 */

import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';
import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { createMistral, type MistralProvider } from '@ai-sdk/mistral';
import { createCohere, type CohereProvider } from '@ai-sdk/cohere';
import {
  wrapLanguageModel,
  extractReasoningMiddleware,
  type LanguageModel,
  type LanguageModelMiddleware,
} from 'ai';
import type { ProviderName } from '@/types/provider';

// Re-export types
export type { ProviderName };

/**
 * Provider credentials configuration
 */
export interface ProviderCredentials {
  apiKey: string;
  baseURL?: string;
}

/**
 * Registry configuration
 */
export interface AIRegistryConfig {
  providers: Partial<Record<ProviderName, ProviderCredentials>>;
  defaultProvider?: ProviderName;
  enableReasoning?: boolean;
  reasoningTagName?: string;
}

/**
 * Model alias configuration for custom providers
 */
export interface ModelAliasConfig {
  /** The actual model ID to use */
  modelId: string;
  /** Default settings to apply */
  defaultSettings?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  /** Provider-specific options */
  providerOptions?: Record<string, unknown>;
  /** Enable reasoning extraction for this model */
  enableReasoning?: boolean;
  reasoningTagName?: string;
}

/**
 * Default model aliases for quick access
 */
export const MODEL_ALIASES: Record<string, Record<string, ModelAliasConfig>> = {
  openai: {
    fast: { modelId: 'gpt-4o-mini', defaultSettings: { temperature: 0.7 } },
    balanced: { modelId: 'gpt-4o', defaultSettings: { temperature: 0.7 } },
    reasoning: { 
      modelId: 'o1', 
      defaultSettings: { maxTokens: 100000 },
      providerOptions: { reasoning_effort: 'high' },
    },
    creative: { modelId: 'gpt-4o', defaultSettings: { temperature: 1.0 } },
  },
  anthropic: {
    fast: { modelId: 'claude-3-5-haiku-latest', defaultSettings: { temperature: 0.7 } },
    balanced: { modelId: 'claude-sonnet-4-20250514', defaultSettings: { temperature: 0.7 } },
    reasoning: { 
      modelId: 'claude-sonnet-4-20250514',
      defaultSettings: { maxTokens: 100000 },
      providerOptions: { 
        thinking: { type: 'enabled', budgetTokens: 32000 } 
      },
    },
    creative: { modelId: 'claude-sonnet-4-20250514', defaultSettings: { temperature: 1.0 } },
  },
  google: {
    fast: { modelId: 'gemini-2.0-flash-exp', defaultSettings: { temperature: 0.7 } },
    balanced: { modelId: 'gemini-2.0-flash-exp', defaultSettings: { temperature: 0.7 } },
    reasoning: { modelId: 'gemini-2.0-flash-thinking-exp', enableReasoning: true },
  },
  deepseek: {
    fast: { modelId: 'deepseek-chat', defaultSettings: { temperature: 0.7 } },
    reasoning: { 
      modelId: 'deepseek-reasoner', 
      enableReasoning: true, 
      reasoningTagName: 'think' 
    },
  },
};

/**
 * Provider type union
 */
type AIProvider = OpenAIProvider | AnthropicProvider | GoogleGenerativeAIProvider | MistralProvider | CohereProvider;

/**
 * Create a provider instance based on provider name and credentials
 */
function createProviderInstance(
  providerName: ProviderName,
  credentials: ProviderCredentials
): AIProvider | null {
  const { apiKey, baseURL } = credentials;

  if (!apiKey && providerName !== 'ollama') {
    return null;
  }

  switch (providerName) {
    case 'openai':
      return createOpenAI({ apiKey, baseURL });

    case 'anthropic':
      return createAnthropic({ apiKey, baseURL });

    case 'google':
      return createGoogleGenerativeAI({ apiKey, baseURL });

    case 'mistral':
      return createMistral({ apiKey, baseURL });

    case 'cohere':
      return createCohere({ apiKey, baseURL });

    case 'deepseek':
      return createOpenAI({
        apiKey,
        baseURL: baseURL || 'https://api.deepseek.com/v1',
      });

    case 'groq':
      return createOpenAI({
        apiKey,
        baseURL: baseURL || 'https://api.groq.com/openai/v1',
      });

    case 'xai':
      return createOpenAI({
        apiKey,
        baseURL: baseURL || 'https://api.x.ai/v1',
      });

    case 'togetherai':
      return createOpenAI({
        apiKey,
        baseURL: baseURL || 'https://api.together.xyz/v1',
      });

    case 'openrouter':
      return createOpenAI({
        apiKey,
        baseURL: baseURL || 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://cognia.app',
          'X-Title': 'Cognia',
        },
      });

    case 'fireworks':
      return createOpenAI({
        apiKey,
        baseURL: baseURL || 'https://api.fireworks.ai/inference/v1',
      });

    case 'cerebras':
      return createOpenAI({
        apiKey,
        baseURL: baseURL || 'https://api.cerebras.ai/v1',
      });

    case 'sambanova':
      return createOpenAI({
        apiKey,
        baseURL: baseURL || 'https://api.sambanova.ai/v1',
      });

    case 'ollama':
      return createOpenAI({
        apiKey: 'ollama',
        baseURL: baseURL || 'http://localhost:11434/v1',
      });

    default:
      return null;
  }
}

/**
 * Apply middleware to a language model
 */
function applyModelMiddleware(
  model: LanguageModel,
  config: {
    enableReasoning?: boolean;
    reasoningTagName?: string;
    middleware?: LanguageModelMiddleware[];
  }
): LanguageModel {
  const middlewares: LanguageModelMiddleware[] = [];

  // Add reasoning extraction if enabled
  if (config.enableReasoning) {
    middlewares.push(
      extractReasoningMiddleware({
        tagName: config.reasoningTagName || 'think',
      })
    );
  }

  // Add custom middleware
  if (config.middleware) {
    middlewares.push(...config.middleware);
  }

  if (middlewares.length === 0) {
    return model;
  }

  return wrapLanguageModel({
    model: model as Parameters<typeof wrapLanguageModel>[0]['model'],
    middleware: middlewares.length === 1 ? middlewares[0] : middlewares,
  }) as LanguageModel;
}

/**
 * Create a unified AI registry from configuration
 */
export function createAIRegistry(config: AIRegistryConfig) {
  const providerMap = new Map<ProviderName, AIProvider>();

  // Initialize providers
  for (const [name, credentials] of Object.entries(config.providers)) {
    if (credentials) {
      const provider = createProviderInstance(name as ProviderName, credentials);
      if (provider) {
        providerMap.set(name as ProviderName, provider);
      }
    }
  }

  return {
    /**
     * Get a language model from the registry
     * @param providerName The provider name
     * @param modelId The model ID or alias (e.g., 'fast', 'reasoning')
     * @param options Additional options for the model
     */
    languageModel(
      providerName: ProviderName,
      modelId: string,
      options?: {
        enableReasoning?: boolean;
        reasoningTagName?: string;
      }
    ): LanguageModel | null {
      const provider = providerMap.get(providerName);
      if (!provider) return null;

      // Check if modelId is an alias
      const aliases = MODEL_ALIASES[providerName];
      const aliasConfig = aliases?.[modelId];

      let actualModelId = modelId;
      let modelConfig = options || {};

      if (aliasConfig) {
        actualModelId = aliasConfig.modelId;
        modelConfig = {
          enableReasoning: aliasConfig.enableReasoning || options?.enableReasoning,
          reasoningTagName: aliasConfig.reasoningTagName || options?.reasoningTagName,
        };
      }

      // Get base model from provider
      const baseModel = provider(actualModelId) as LanguageModel;

      // Apply reasoning extraction if configured
      if (config.enableReasoning || modelConfig.enableReasoning) {
        return applyModelMiddleware(baseModel, {
          enableReasoning: true,
          reasoningTagName: modelConfig.reasoningTagName || config.reasoningTagName || 'think',
        });
      }

      return baseModel;
    },

    /**
     * Get a language model with alias support
     * @param modelString Format: "provider:model" or "provider:alias"
     */
    model(modelString: string): LanguageModel | null {
      const [providerName, modelId] = modelString.split(':') as [ProviderName, string];
      if (!providerName || !modelId) return null;
      return this.languageModel(providerName, modelId);
    },

    /**
     * Get a text embedding model from the registry
     */
    embeddingModel(providerName: ProviderName, modelId: string) {
      const provider = providerMap.get(providerName);
      if (!provider) return null;

      // Only OpenAI-compatible providers have embedding method
      if ('embedding' in provider) {
        return (provider as OpenAIProvider).embedding(modelId);
      }
      return null;
    },

    /**
     * Get an image model from the registry (for providers that support it)
     */
    imageModel(providerName: ProviderName, modelId: string) {
      const provider = providerMap.get(providerName);
      if (!provider) return null;

      // Only OpenAI provider has image method
      if (providerName === 'openai' && 'image' in provider) {
        return (provider as OpenAIProvider).image(modelId);
      }
      return null;
    },

    /**
     * Get the raw provider instance
     */
    getProvider(providerName: ProviderName): AIProvider | null {
      return providerMap.get(providerName) ?? null;
    },

    /**
     * Check if a provider is available
     */
    hasProvider(providerName: ProviderName): boolean {
      return providerMap.has(providerName);
    },

    /**
     * Get list of available providers
     */
    getAvailableProviders(): ProviderName[] {
      return Array.from(providerMap.keys());
    },

    /**
     * Get the default provider
     */
    getDefaultProvider(): ProviderName | undefined {
      if (config.defaultProvider && providerMap.has(config.defaultProvider)) {
        return config.defaultProvider;
      }
      const available = this.getAvailableProviders();
      return available.length > 0 ? available[0] : undefined;
    },

    /**
     * Get available model aliases for a provider
     */
    getModelAliases(providerName: ProviderName): string[] {
      const aliases = MODEL_ALIASES[providerName];
      return aliases ? Object.keys(aliases) : [];
    },

    /**
     * Resolve a model alias to its actual model ID
     */
    resolveAlias(providerName: ProviderName, alias: string): string {
      const aliases = MODEL_ALIASES[providerName];
      const config = aliases?.[alias];
      return config?.modelId || alias;
    },
  };
}

/**
 * Type for the AI registry
 */
export type AIRegistry = ReturnType<typeof createAIRegistry>;

/**
 * Default registry singleton (can be initialized with user settings)
 */
let defaultRegistry: AIRegistry | null = null;

/**
 * Initialize the default registry with user settings
 */
export function initializeDefaultRegistry(config: AIRegistryConfig): AIRegistry {
  defaultRegistry = createAIRegistry(config);
  return defaultRegistry;
}

/**
 * Get the default registry (throws if not initialized)
 */
export function getDefaultRegistry(): AIRegistry {
  if (!defaultRegistry) {
    throw new Error('AI Registry not initialized. Call initializeDefaultRegistry first.');
  }
  return defaultRegistry;
}

/**
 * Check if the default registry is initialized
 */
export function isRegistryInitialized(): boolean {
  return defaultRegistry !== null;
}
