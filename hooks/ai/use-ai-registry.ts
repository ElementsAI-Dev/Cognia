'use client';

/**
 * useAIRegistry - Hook for unified AI provider management
 * 
 * Integrates the AI registry with the settings store for easy access
 * to language models, image models, and embeddings across the app.
 * 
 * Features:
 * - Auto-initialization from settings store
 * - Model alias support (fast, balanced, reasoning, creative)
 * - Middleware integration (caching, rate limiting, reasoning extraction)
 * - Provider availability checking
 */

import { useMemo, useCallback } from 'react';
import { useSettingsStore } from '@/stores';
import {
  createAIRegistry,
  type AIRegistry,
  type AIRegistryConfig,
  MODEL_ALIASES,
} from '@/lib/ai/core/ai-registry';
import {
  createSimpleCacheMiddleware,
} from '@/lib/ai/infrastructure/cache-middleware';
import {
  checkRateLimit,
  type RateLimitResult,
} from '@/lib/ai/infrastructure/rate-limit';
import {
  withDefaultSettings,
  withMiddlewares,
  type DefaultModelSettings,
} from '@/lib/ai/core/middleware';
import type { ProviderName } from '@/types/provider';
import type { LanguageModel, LanguageModelMiddleware } from 'ai';

export interface UseAIRegistryOptions {
  /** Enable response caching */
  enableCaching?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Enable rate limiting checks */
  enableRateLimiting?: boolean;
  /** Enable reasoning extraction for thinking models */
  enableReasoning?: boolean;
  /** Reasoning tag name (default: 'think') */
  reasoningTagName?: string;
}

export interface UseAIRegistryReturn {
  /** The AI registry instance */
  registry: AIRegistry | null;
  /** Whether the registry is initialized */
  isInitialized: boolean;
  /** Get a language model by provider and model ID/alias */
  getModel: (provider: ProviderName, modelIdOrAlias: string) => LanguageModel | null;
  /** Get a model with custom middleware applied */
  getModelWithMiddleware: (
    provider: ProviderName,
    modelIdOrAlias: string,
    middlewares: LanguageModelMiddleware[]
  ) => LanguageModel | null;
  /** Get a model with default settings applied */
  getModelWithSettings: (
    provider: ProviderName,
    modelIdOrAlias: string,
    settings: DefaultModelSettings
  ) => LanguageModel | null;
  /** Check rate limit for a provider */
  checkProviderRateLimit: (provider: ProviderName, identifier: string) => Promise<RateLimitResult>;
  /** Get available providers */
  availableProviders: ProviderName[];
  /** Get model aliases for a provider */
  getModelAliases: (provider: ProviderName) => string[];
  /** Resolve a model alias to actual model ID */
  resolveAlias: (provider: ProviderName, alias: string) => string;
  /** Check if a provider is available */
  hasProvider: (provider: ProviderName) => boolean;
}

/**
 * Hook for unified AI provider management
 */
export function useAIRegistry(options: UseAIRegistryOptions = {}): UseAIRegistryReturn {
  const {
    enableCaching = false,
    cacheTTL = 3600,
    enableRateLimiting = true,
    enableReasoning = false,
    reasoningTagName = 'think',
  } = options;

  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Build registry configuration from settings
  const registryConfig = useMemo<AIRegistryConfig>(() => {
    const providers: Partial<Record<ProviderName, { apiKey: string; baseURL?: string }>> = {};

    // Map provider settings to registry format
    for (const [providerName, settings] of Object.entries(providerSettings)) {
      if (settings?.enabled && settings?.apiKey) {
        providers[providerName as ProviderName] = {
          apiKey: settings.apiKey,
          baseURL: settings.baseURL,
        };
      }
    }

    return {
      providers,
      enableReasoning,
      reasoningTagName,
    };
  }, [providerSettings, enableReasoning, reasoningTagName]);

  // Create registry instance
  const registry = useMemo(() => {
    if (Object.keys(registryConfig.providers).length === 0) {
      return null;
    }
    return createAIRegistry(registryConfig);
  }, [registryConfig]);

  // Create caching middleware if enabled
  const cachingMiddleware = useMemo(() => {
    if (!enableCaching) return null;
    return createSimpleCacheMiddleware({ ttlSeconds: cacheTTL });
  }, [enableCaching, cacheTTL]);

  // Get a language model
  const getModel = useCallback(
    (provider: ProviderName, modelIdOrAlias: string): LanguageModel | null => {
      if (!registry) return null;
      
      let model = registry.languageModel(provider, modelIdOrAlias);
      if (!model) return null;

      // Apply caching middleware if enabled
      if (cachingMiddleware) {
        model = withMiddlewares(model, [cachingMiddleware]);
      }

      return model;
    },
    [registry, cachingMiddleware]
  );

  // Get a model with custom middleware
  const getModelWithMiddleware = useCallback(
    (
      provider: ProviderName,
      modelIdOrAlias: string,
      middlewares: LanguageModelMiddleware[]
    ): LanguageModel | null => {
      if (!registry) return null;
      
      const baseModel = registry.languageModel(provider, modelIdOrAlias);
      if (!baseModel) return null;

      // Combine with caching middleware if enabled
      const allMiddlewares = cachingMiddleware 
        ? [cachingMiddleware, ...middlewares]
        : middlewares;

      return withMiddlewares(baseModel, allMiddlewares);
    },
    [registry, cachingMiddleware]
  );

  // Get a model with default settings
  const getModelWithSettings = useCallback(
    (
      provider: ProviderName,
      modelIdOrAlias: string,
      settings: DefaultModelSettings
    ): LanguageModel | null => {
      if (!registry) return null;
      
      let model = registry.languageModel(provider, modelIdOrAlias);
      if (!model) return null;

      // Apply default settings
      model = withDefaultSettings(model, settings);

      // Apply caching middleware if enabled
      if (cachingMiddleware) {
        model = withMiddlewares(model, [cachingMiddleware]);
      }

      return model;
    },
    [registry, cachingMiddleware]
  );

  // Check rate limit for a provider
  const checkProviderRateLimit = useCallback(
    async (provider: ProviderName, identifier: string): Promise<RateLimitResult> => {
      if (!enableRateLimiting) {
        return { success: true, remaining: Infinity, limit: Infinity, resetInMs: 0 };
      }
      return checkRateLimit(provider, identifier);
    },
    [enableRateLimiting]
  );

  // Get available providers
  const availableProviders = useMemo(() => {
    return registry?.getAvailableProviders() ?? [];
  }, [registry]);

  // Get model aliases for a provider
  const getModelAliases = useCallback((provider: ProviderName): string[] => {
    return registry?.getModelAliases(provider) ?? [];
  }, [registry]);

  // Resolve a model alias
  const resolveAlias = useCallback(
    (provider: ProviderName, alias: string): string => {
      return registry?.resolveAlias(provider, alias) ?? alias;
    },
    [registry]
  );

  // Check if a provider is available
  const hasProvider = useCallback(
    (provider: ProviderName): boolean => {
      return registry?.hasProvider(provider) ?? false;
    },
    [registry]
  );

  return {
    registry,
    isInitialized: registry !== null,
    getModel,
    getModelWithMiddleware,
    getModelWithSettings,
    checkProviderRateLimit,
    availableProviders,
    getModelAliases,
    resolveAlias,
    hasProvider,
  };
}

/**
 * Get a reasoning-enabled model
 */
export function useReasoningModel(
  provider: ProviderName,
  modelId?: string,
  tagName: string = 'think'
) {
  const { registry } = useAIRegistry({ enableReasoning: true, reasoningTagName: tagName });

  return useMemo(() => {
    if (!registry) return null;

    // Use 'reasoning' alias if no specific model provided
    const actualModelId = modelId ?? 'reasoning';
    const model = registry.languageModel(provider, actualModelId, {
      enableReasoning: true,
      reasoningTagName: tagName,
    });

    return model;
  }, [registry, provider, modelId, tagName]);
}

/**
 * Get available model aliases
 */
export function useModelAliases() {
  return MODEL_ALIASES;
}

export default useAIRegistry;
