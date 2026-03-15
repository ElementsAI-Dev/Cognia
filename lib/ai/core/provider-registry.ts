/**
 * Provider Registry - Unified multi-provider management using AI SDK
 * Enables intelligent routing and middleware support
 */

import type { OpenAIProvider } from '@ai-sdk/openai';
import type { AnthropicProvider } from '@ai-sdk/anthropic';
import type { GoogleGenerativeAIProvider } from '@ai-sdk/google';
import type { MistralProvider } from '@ai-sdk/mistral';
import type { CohereProvider } from '@ai-sdk/cohere';
import type { ProviderName } from '@/types/provider';
import type { LanguageModel } from 'ai';
import {
  createFeatureProviderClient,
  recordLegacyProviderFacadeUsage,
} from '@/lib/ai/provider-consumption';
import { getProviderConfig } from '@/types/provider';

type AIProvider = OpenAIProvider | AnthropicProvider | GoogleGenerativeAIProvider | MistralProvider | CohereProvider;

export interface ProviderCredentials {
  apiKey: string;
  baseURL?: string;
}

export interface RegistryConfig {
  providers: Partial<Record<ProviderName, ProviderCredentials>>;
  defaultProvider?: ProviderName;
}

interface ProviderEntry {
  provider: AIProvider;
  credentials: ProviderCredentials;
}

/**
 * Create a provider instance based on provider name and credentials
 */
function createProviderInstance(
  providerName: ProviderName,
  credentials: ProviderCredentials
): AIProvider | null {
  const { apiKey, baseURL } = credentials;
  const providerConfig = getProviderConfig(providerName);

  if ((providerConfig?.apiKeyRequired ?? true) && !apiKey) {
    return null;
  }

  recordLegacyProviderFacadeUsage({
    facadeId: 'core/provider-registry',
    helperName: 'createProviderInstance',
    providerId: providerName,
    lastBaseURL: baseURL,
  });

  return createFeatureProviderClient({
    providerId: providerName,
    apiKey,
    baseURL,
  }) as AIProvider;
}

/**
 * Create a unified provider registry from configuration
 */
export function createCogniaProviderRegistry(config: RegistryConfig) {
  const providerMap = new Map<ProviderName, ProviderEntry>();

  for (const [name, credentials] of Object.entries(config.providers)) {
    if (credentials) {
      const provider = createProviderInstance(name as ProviderName, credentials);
      if (provider) {
        providerMap.set(name as ProviderName, { provider, credentials });
      }
    }
  }

  return {
    /**
     * Get a language model from the registry
     * @param providerName The provider name
     * @param modelId The model ID
     */
    languageModel(providerName: ProviderName, modelId: string): LanguageModel | null {
      const entry = providerMap.get(providerName);
      if (!entry) return null;

      // Call the provider with model ID to get language model
      return entry.provider(modelId) as LanguageModel;
    },

    /**
     * Get a text embedding model from the registry
     * @param providerName The provider name  
     * @param modelId The model ID
     */
    textEmbeddingModel(providerName: ProviderName, modelId: string) {
      const entry = providerMap.get(providerName);
      if (!entry) return null;

      const provider = entry.provider as OpenAIProvider;
      if ('embedding' in provider) {
        return provider.embedding(modelId);
      }
      return null;
    },

    /**
     * Get the raw provider instance
     */
    getProvider(providerName: ProviderName): AIProvider | null {
      const entry = providerMap.get(providerName);
      return entry?.provider ?? null;
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
     * Get provider credentials
     */
    getCredentials(providerName: ProviderName): ProviderCredentials | undefined {
      return providerMap.get(providerName)?.credentials;
    },
  };
}

export type CogniaProviderRegistry = ReturnType<typeof createCogniaProviderRegistry>;

/**
 * Parse model ID into provider and model parts
 * Supports formats: "provider:model" or just "model" (uses default provider)
 */
export function parseModelId(
  modelId: string,
  defaultProvider?: ProviderName
): { provider: ProviderName; model: string } {
  const colonIndex = modelId.indexOf(':');
  
  if (colonIndex > 0) {
    return {
      provider: modelId.slice(0, colonIndex) as ProviderName,
      model: modelId.slice(colonIndex + 1),
    };
  }

  return {
    provider: defaultProvider || 'openai',
    model: modelId,
  };
}

/**
 * Format provider and model into a model ID
 */
export function formatModelId(provider: ProviderName, model: string): string {
  return `${provider}:${model}`;
}
