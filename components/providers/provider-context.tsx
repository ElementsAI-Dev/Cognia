'use client';

/**
 * ProviderContext - Unified context for managing AI provider state across the application
 * Provides centralized access to provider settings, health status, and utility functions
 */

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import type { UserProviderSettings } from '@/types/provider';

// Provider health status
export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// Provider metadata
export interface ProviderMetadata {
  id: string;
  name: string;
  description: string;
  website?: string;
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  maxTokens?: number;
  pricingUrl?: string;
  icon?: string;
}

// Provider health info
export interface ProviderHealth {
  status: ProviderHealthStatus;
  lastCheck: Date | null;
  latency?: number;
  errorRate?: number;
  lastError?: string;
}

// Provider with metadata and health
export interface EnhancedProvider {
  settings: UserProviderSettings;
  metadata: ProviderMetadata;
  health: ProviderHealth;
  isCustom: boolean;
}

// Provider context value
export interface ProviderContextValue {
  // All providers with metadata
  providers: Record<string, EnhancedProvider>;

  // Get specific provider
  getProvider: (providerId: string) => EnhancedProvider | undefined;

  // Get default provider
  getDefaultProvider: () => EnhancedProvider | undefined;

  // Get enabled providers
  getEnabledProviders: () => EnhancedProvider[];

  // Get available providers (configured and enabled)
  getAvailableProviders: () => EnhancedProvider[];

  // Provider health management
  checkProviderHealth: (providerId: string) => Promise<ProviderHealthStatus>;
  refreshAllHealth: () => Promise<void>;

  // Provider selection helpers
  getBestProvider: (options?: { requireVision?: boolean; requireTools?: boolean; maxLatency?: number }) => EnhancedProvider | undefined;

  // Utility functions
  isProviderConfigured: (providerId: string) => boolean;
  isProviderEnabled: (providerId: string) => boolean;
  getProviderModels: (providerId: string) => string[];
}

// Create context
const ProviderContext = createContext<ProviderContextValue | undefined>(undefined);

// Provider metadata registry
const PROVIDER_METADATA: Record<string, ProviderMetadata> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'Leading AI research organization with GPT-4, GPT-4o, and o1 models',
    website: 'https://openai.com',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxTokens: 128000,
    pricingUrl: 'https://openai.com/pricing',
    icon: '🤖',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'AI safety company with Claude models (Sonnet, Opus, Haiku)',
    website: 'https://anthropic.com',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxTokens: 200000,
    pricingUrl: 'https://console.anthropic.com/pricing',
    icon: '🧠',
  },
  google: {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini models from Google DeepMind',
    website: 'https://ai.google.dev',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxTokens: 1000000,
    pricingUrl: 'https://ai.google.dev/pricing',
    icon: '💎',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Chinese AI research lab with powerful reasoning models',
    website: 'https://deepseek.com',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxTokens: 128000,
    icon: '🔍',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference with open-source models',
    website: 'https://groq.com',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxTokens: 131072,
    pricingUrl: 'https://groq.com/pricing',
    icon: '⚡',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'European AI company with Mistral and Mixtral models',
    website: 'https://mistral.ai',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxTokens: 128000,
    pricingUrl: 'https://mistral.ai/pricing',
    icon: '🌊',
  },
  xai: {
    id: 'xai',
    name: 'xAI',
    description: 'Elon Musk\'s AI company with Grok models',
    website: 'https://x.ai',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxTokens: 128000,
    pricingUrl: 'https://x.ai/pricing',
    icon: '⭐',
  },
  togetherai: {
    id: 'togetherai',
    name: 'Together AI',
    description: 'Open-source model inference platform',
    website: 'https://together.ai',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxTokens: 32768,
    pricingUrl: 'https://together.ai/pricing',
    icon: '🚀',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified API for multiple AI models',
    website: 'https://openrouter.ai',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxTokens: 200000,
    pricingUrl: 'https://openrouter.ai/pricing',
    icon: '🔀',
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere',
    description: 'Enterprise AI with Command and Rerank models',
    website: 'https://cohere.com',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxTokens: 128000,
    pricingUrl: 'https://cohere.com/pricing',
    icon: '🎯',
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks.ai',
    description: 'Fast and affordable AI inference',
    website: 'https://fireworks.ai',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxTokens: 32768,
    pricingUrl: 'https://fireworks.ai/pricing',
    icon: '🎆',
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'Lightning-fast inference with CS-2 systems',
    website: 'https://cerebras.ai',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxTokens: 128000,
    pricingUrl: 'https://inference.cerebras.ai/pricing',
    icon: '💫',
  },
  sambanova: {
    id: 'sambanova',
    name: 'SambaNova',
    description: 'Enterprise AI with full-stack AI solutions',
    website: 'https://sambanova.ai',
    requiresApiKey: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxTokens: 128000,
    pricingUrl: 'https://sambanova.ai/pricing',
    icon: '🎵',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run open-source models locally',
    website: 'https://ollama.ai',
    requiresApiKey: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    icon: '🦙',
  },
};

// Model lists for each provider
const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250514'],
  google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
  xai: ['grok-3'],
  togetherai: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
  openrouter: ['anthropic/claude-sonnet-4', 'openai/gpt-4o'],
  cohere: ['command-r-plus', 'command-r', 'command'],
  fireworks: ['accounts/fireworks/models/llama-v3p3-70b-instruct'],
  cerebras: ['llama-3.3-70b'],
  sambanova: ['Meta-Llama-3.3-70B-Instruct'],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'codellama'],
};

interface ProviderProviderProps {
  children: ReactNode;
  /** Health check interval in milliseconds (default: 5 minutes) */
  healthCheckInterval?: number;
  /** Whether to enable automatic health checks */
  enableHealthChecks?: boolean;
}

/**
 * Provider Context Provider Component
 */
export function ProviderProvider({
  children,
  healthCheckInterval = 5 * 60 * 1000,
  enableHealthChecks = true,
}: ProviderProviderProps) {
  const [providers, setProviders] = useState<Record<string, EnhancedProvider>>({});
  const [healthMap, setHealthMap] = useState<Record<string, ProviderHealth>>({});

  const providerSettings = useSettingsStore((s) => s.providerSettings);
  const customProviders = useSettingsStore((s) => s.customProviders);
  const defaultProvider = useSettingsStore((s) => s.defaultProvider);

  // Initialize providers on mount and when settings change
  useEffect(() => {
    const enhancedProviders: Record<string, EnhancedProvider> = {};

    // Add built-in providers
    Object.entries(providerSettings).forEach(([id, settings]) => {
      const metadata = PROVIDER_METADATA[id] || {
        id,
        name: settings.providerId,
        description: 'Custom provider',
        requiresApiKey: true,
        supportsStreaming: true,
        supportsVision: false,
        supportsTools: true,
      };

      enhancedProviders[id] = {
        settings,
        metadata,
        health: healthMap[id] || { status: 'unknown', lastCheck: null },
        isCustom: false,
      };
    });

    // Add custom providers
    Object.entries(customProviders).forEach(([id, settings]) => {
      enhancedProviders[id] = {
        settings,
        metadata: {
          id,
          name: settings.customName,
          description: 'Custom OpenAI-compatible provider',
          requiresApiKey: true,
          supportsStreaming: true,
          supportsVision: false,
          supportsTools: true,
        },
        health: healthMap[id] || { status: 'unknown', lastCheck: null },
        isCustom: true,
      };
    });

    setProviders(enhancedProviders);
  }, [providerSettings, customProviders, healthMap]);

  // Health check function - client-side implementation
  const checkProviderHealth = useCallback(async (providerId: string): Promise<ProviderHealthStatus> => {
    const provider = providers[providerId];
    if (!provider) return 'unknown';

    const startTime = Date.now();

    try {
      // Check 1: Verify provider is enabled
      if (!provider.settings.enabled) {
        const health: ProviderHealth = {
          status: 'unhealthy',
          lastCheck: new Date(),
          latency: Date.now() - startTime,
          lastError: 'Provider is disabled',
        };
        setHealthMap((prev) => ({ ...prev, [providerId]: health }));
        return 'unhealthy';
      }

      // Check 2: Verify provider has required configuration
      const requiresApiKey = provider.settings.providerId !== 'ollama';
      const hasApiKey = !!provider.settings.apiKey && provider.settings.apiKey.trim().length > 0;

      if (requiresApiKey && !hasApiKey) {
        const health: ProviderHealth = {
          status: 'unhealthy',
          lastCheck: new Date(),
          latency: Date.now() - startTime,
          lastError: 'No API key configured',
        };
        setHealthMap((prev) => ({ ...prev, [providerId]: health }));
        return 'unhealthy';
      }

      // Check 3: Validate API key format (basic validation)
      if (hasApiKey && provider.settings.apiKey!.length < 10) {
        const health: ProviderHealth = {
          status: 'degraded',
          lastCheck: new Date(),
          latency: Date.now() - startTime,
          lastError: 'API key format appears invalid',
        };
        setHealthMap((prev) => ({ ...prev, [providerId]: health }));
        return 'degraded';
      }

      // Check 4: Verify base URL for Ollama or custom providers
      if (provider.settings.providerId === 'ollama' && provider.settings.baseURL) {
        try {
          // Try to fetch Ollama version
          const ollamaResponse = await fetch(`${provider.settings.baseURL}/api/version`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });
          if (!ollamaResponse.ok) {
            throw new Error('Ollama not responding');
          }
        } catch (error) {
          const health: ProviderHealth = {
            status: 'degraded',
            lastCheck: new Date(),
            latency: Date.now() - startTime,
            lastError: `Ollama unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
          setHealthMap((prev) => ({ ...prev, [providerId]: health }));
          return 'degraded';
        }
      }

      // All checks passed - provider is healthy
      const health: ProviderHealth = {
        status: 'healthy',
        lastCheck: new Date(),
        latency: Date.now() - startTime,
        errorRate: 0,
      };
      setHealthMap((prev) => ({ ...prev, [providerId]: health }));
      return 'healthy';

    } catch (error) {
      // Unexpected error - mark as unknown
      const health: ProviderHealth = {
        status: 'unknown',
        lastCheck: new Date(),
        latency: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error during health check',
      };
      setHealthMap((prev) => ({ ...prev, [providerId]: health }));
      return 'unknown';
    }
  }, [providers]);

  // Refresh all health statuses
  const refreshAllHealth = useCallback(async () => {
    const enabledProviders = Object.values(providers).filter((p) => p.settings.enabled);
    await Promise.all(
      enabledProviders.map((p) => checkProviderHealth(p.settings.providerId))
    );
  }, [providers, checkProviderHealth]);

  // Automatic health checks
  useEffect(() => {
    if (!enableHealthChecks) return;

    const interval = setInterval(() => {
      refreshAllHealth();
    }, healthCheckInterval);

    // Initial health check
    refreshAllHealth();

    return () => clearInterval(interval);
  }, [enableHealthChecks, healthCheckInterval, refreshAllHealth]);

  // Context value
  const getProvider = useCallback((providerId: string): EnhancedProvider | undefined => {
    return providers[providerId];
  }, [providers]);

  const getDefaultProvider = useCallback((): EnhancedProvider | undefined => {
    return providers[defaultProvider];
  }, [providers, defaultProvider]);

  const getEnabledProviders = useCallback((): EnhancedProvider[] => {
    return Object.values(providers).filter((p) => p.settings.enabled);
  }, [providers]);

  const getAvailableProviders = useCallback((): EnhancedProvider[] => {
    return Object.values(providers).filter(
      (p) => p.settings.enabled && (p.settings.apiKey || p.settings.providerId === 'ollama')
    );
  }, [providers]);

  const getBestProvider = useCallback((options?: {
    requireVision?: boolean;
    requireTools?: boolean;
    maxLatency?: number;
  }): EnhancedProvider | undefined => {
    let candidates = getAvailableProviders();

    if (options?.requireVision) {
      candidates = candidates.filter((p) => p.metadata.supportsVision);
    }

    if (options?.requireTools) {
      candidates = candidates.filter((p) => p.metadata.supportsTools);
    }

    if (options?.maxLatency !== undefined) {
      const maxLatency = options.maxLatency;
      candidates = candidates.filter(
        (p) => p.health.latency !== undefined && p.health.latency <= maxLatency
      );
    }

    // Sort by health status, then latency
    candidates.sort((a, b) => {
      const statusOrder = { healthy: 0, degraded: 1, unknown: 2, unhealthy: 3 };
      const statusDiff = statusOrder[a.health.status] - statusOrder[b.health.status];
      if (statusDiff !== 0) return statusDiff;

      if (a.health.latency && b.health.latency) {
        return a.health.latency - b.health.latency;
      }
      return 0;
    });

    return candidates[0];
  }, [getAvailableProviders]);

  const isProviderConfigured = useCallback((providerId: string): boolean => {
    const provider = providers[providerId];
    if (!provider) return false;
    return !!provider.settings.apiKey || provider.settings.providerId === 'ollama';
  }, [providers]);

  const isProviderEnabled = useCallback((providerId: string): boolean => {
    const provider = providers[providerId];
    return provider?.settings.enabled ?? false;
  }, [providers]);

  const getProviderModels = useCallback((providerId: string): string[] => {
    return PROVIDER_MODELS[providerId] || [];
  }, []);

  const value: ProviderContextValue = {
    providers,
    getProvider,
    getDefaultProvider,
    getEnabledProviders,
    getAvailableProviders,
    checkProviderHealth,
    refreshAllHealth,
    getBestProvider,
    isProviderConfigured,
    isProviderEnabled,
    getProviderModels,
  };

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
}

/**
 * Hook to access provider context
 */
export function useProviderContext(): ProviderContextValue {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProviderContext must be used within ProviderProvider');
  }
  return context;
}

/**
 * Hook to get a specific provider
 */
export function useProvider(providerId: string): EnhancedProvider | undefined {
  const { getProvider } = useProviderContext();
  return getProvider(providerId);
}

/**
 * Hook to get all available providers
 */
export function useAvailableProviders(): EnhancedProvider[] {
  const { getAvailableProviders } = useProviderContext();
  return getAvailableProviders();
}

/**
 * Hook to get provider models
 */
export function useProviderModels(providerId: string): string[] {
  const { getProviderModels } = useProviderContext();
  return getProviderModels(providerId);
}

export default ProviderProvider;
