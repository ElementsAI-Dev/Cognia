'use client';

/**
 * ProviderContext - Unified context for managing AI provider state across the application
 * Provides centralized access to provider settings, health status, and utility functions
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';
import { useSettingsStore } from '@/stores/settings';
import type {
  ProviderHealthStatus,
  ProviderHealth,
  EnhancedProvider,
} from '@/types/provider';
import { createCogniaProviderRegistry, type CogniaProviderRegistry } from '@/lib/ai/core/provider-registry';
import {
  buildProviderStateProjectionMap,
  type CustomProviderProjectionInput,
  type ProviderStateProjection,
} from '@/lib/ai/providers/projection';
import { getActiveCredential } from '@/lib/ai/providers/readiness';
import {
  resolveBuiltInProviderConnectivityTarget,
  resolveCustomProviderConnectivityTarget,
} from '@/lib/ai/providers/connectivity';
import { probeProviderConnection } from '@/lib/ai/infrastructure/api-test';

// Re-export types for backward compatibility
export type {
  ProviderHealthStatus,
  ProviderMetadata,
  ProviderHealth,
  EnhancedProvider,
} from '@/types/provider';

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
  getBestProvider: (options?: {
    requireVision?: boolean;
    requireTools?: boolean;
    maxLatency?: number;
  }) => EnhancedProvider | undefined;

  // Utility functions
  isProviderConfigured: (providerId: string) => boolean;
  isProviderEnabled: (providerId: string) => boolean;
  getProviderModels: (providerId: string) => string[];
}

// Create context
const ProviderContext = createContext<ProviderContextValue | undefined>(undefined);

// Export context for testing purposes
export { ProviderContext };

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
  const [projectionMap, setProjectionMap] = useState<Record<string, ProviderStateProjection>>({});
  const providersRef = useRef<Record<string, EnhancedProvider>>({});
  const healthCheckTimestampsRef = useRef<Record<string, number>>({});
  const registryRef = useRef<CogniaProviderRegistry | null>(null);
  const MIN_HEALTH_CHECK_INTERVAL = 30000; // Minimum 30 seconds between health checks per provider

  // Keep ref in sync with state
  useEffect(() => {
    providersRef.current = providers;
  }, [providers]);

  const providerSettings = useSettingsStore((s) => s.providerSettings);
  const customProviders = useSettingsStore((s) => s.customProviders);
  const defaultProvider = useSettingsStore((s) => s.defaultProvider);

  // Initialize providers on mount and when settings change
  useEffect(() => {
    const nextProjectionMap = buildProviderStateProjectionMap({
      providerSettings,
      customProviders: customProviders as Record<string, CustomProviderProjectionInput | undefined>,
    });
    setProjectionMap(nextProjectionMap);

    setProviders((prevProviders) => {
      const enhancedProviders: Record<string, EnhancedProvider> = {};
      Object.entries(nextProjectionMap).forEach(([id, projection]) => {
        enhancedProviders[id] = {
          settings: projection.settings as EnhancedProvider['settings'],
          metadata: projection.metadata,
          health: prevProviders[id]?.health || { status: 'unknown', lastCheck: null },
          isCustom: projection.isCustom,
        };
      });

      return enhancedProviders;
    });

    // Initialize the provider registry from current settings
    const registryProviders: Partial<Record<string, { apiKey: string; baseURL?: string }>> = {};
    Object.entries(nextProjectionMap).forEach(([id, projection]) => {
      if (projection.kind === 'custom' || !projection.selectable) {
        return;
      }

      const settings = projection.settings as Partial<{ apiKey?: string; apiKeys?: string[]; currentKeyIndex?: number; baseURL?: string }>;
      registryProviders[id] = {
        apiKey: getActiveCredential(settings),
        baseURL: settings.baseURL,
      };
    });
    registryRef.current = createCogniaProviderRegistry({
      providers: registryProviders as Parameters<typeof createCogniaProviderRegistry>[0]['providers'],
      defaultProvider: defaultProvider as Parameters<typeof createCogniaProviderRegistry>[0]['defaultProvider'],
    });
  }, [providerSettings, customProviders, defaultProvider]);

  // Health check function - client-side implementation with rate limiting
  const checkProviderHealth = useCallback(
    async (providerId: string): Promise<ProviderHealthStatus> => {
      const provider = providersRef.current[providerId];
      if (!provider) return 'unknown';

      // Rate limiting: skip if checked too recently
      const lastCheck = healthCheckTimestampsRef.current[providerId] || 0;
      const now = Date.now();
      if (now - lastCheck < MIN_HEALTH_CHECK_INTERVAL) {
        // Return cached health status instead of checking again
        return provider.health.status;
      }
      healthCheckTimestampsRef.current[providerId] = now;

      const startTime = now;

      try {
        // Check 1: Verify provider is enabled
        if (!provider.settings.enabled) {
          const health: ProviderHealth = {
            status: 'unhealthy',
            lastCheck: new Date(),
            latency: Date.now() - startTime,
            lastError: 'Provider is disabled',
          };
          setProviders((prev) => ({ ...prev, [providerId]: { ...prev[providerId], health } }));
          return 'unhealthy';
        }

        // Check 2: Verify provider has required configuration
        const projection = projectionMap[providerId];
        if (!projection?.selectable) {
          const health: ProviderHealth = {
            status: 'unhealthy',
            lastCheck: new Date(),
            latency: Date.now() - startTime,
            lastError: projection?.blockedReason || projection?.recommendedRemediation || 'Provider is not ready',
          };
          setProviders((prev) => ({ ...prev, [providerId]: { ...prev[providerId], health } }));
          return 'unhealthy';
        }

        const target =
          projection?.kind === 'custom'
            ? resolveCustomProviderConnectivityTarget(
                providerId,
                projection.settings as CustomProviderProjectionInput
              )
            : resolveBuiltInProviderConnectivityTarget(
                providerId,
                provider.settings as Partial<{
                  providerId?: string;
                  apiKey?: string;
                  apiKeys?: string[];
                  currentKeyIndex?: number;
                  baseURL?: string;
                  enabled?: boolean;
                  defaultModel?: string;
                }>
              );

        const result = await probeProviderConnection(target);

        if (result.outcome === 'limited' || result.authoritative === false) {
          const health: ProviderHealth = {
            status: 'unknown',
            lastCheck: new Date(),
            latency: Date.now() - startTime,
            lastError: result.message,
          };
          setProviders((prev) => ({ ...prev, [providerId]: { ...prev[providerId], health } }));
          return 'unknown';
        }

        if (!result.success) {
          const health: ProviderHealth = {
            status: 'unhealthy',
            lastCheck: new Date(),
            latency: result.latency_ms ?? (Date.now() - startTime),
            lastError: result.message,
          };
          setProviders((prev) => ({ ...prev, [providerId]: { ...prev[providerId], health } }));
          return 'unhealthy';
        }

        // All checks passed - provider is healthy
        const health: ProviderHealth = {
          status: (result.latency_ms || 0) > 5000 ? 'degraded' : 'healthy',
          lastCheck: new Date(),
          latency: result.latency_ms ?? (Date.now() - startTime),
          errorRate: 0,
        };
        setProviders((prev) => ({ ...prev, [providerId]: { ...prev[providerId], health } }));
        return health.status;
      } catch (error) {
        // Unexpected error - mark as unknown
        const health: ProviderHealth = {
          status: 'unknown',
          lastCheck: new Date(),
          latency: Date.now() - startTime,
          lastError: error instanceof Error ? error.message : 'Unknown error during health check',
        };
        setProviders((prev) => ({ ...prev, [providerId]: { ...prev[providerId], health } }));
        return 'unknown';
      }
    },
    [projectionMap]
  );

  // Refresh all health statuses
  const refreshAllHealth = useCallback(async () => {
    const enabledProviders = Object.values(providersRef.current).filter((p) => p.settings.enabled);
    await Promise.all(enabledProviders.map((p) => checkProviderHealth(p.settings.providerId)));
  }, [checkProviderHealth]);

  // Automatic health checks
  useEffect(() => {
    if (!enableHealthChecks) return;

    const interval = setInterval(() => {
      refreshAllHealth();
    }, healthCheckInterval);

    // Initial health check
    refreshAllHealth();

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableHealthChecks, healthCheckInterval]);

  // Context value
  const getProvider = useCallback(
    (providerId: string): EnhancedProvider | undefined => {
      return providers[providerId];
    },
    [providers]
  );

  const getDefaultProvider = useCallback((): EnhancedProvider | undefined => {
    return providers[defaultProvider];
  }, [providers, defaultProvider]);

  const getEnabledProviders = useCallback((): EnhancedProvider[] => {
    return Object.values(providers).filter((p) => projectionMap[p.metadata.id]?.enabled ?? p.settings.enabled);
  }, [projectionMap, providers]);

  const getAvailableProviders = useCallback((): EnhancedProvider[] => {
    return Object.values(providers).filter((p) => projectionMap[p.metadata.id]?.selectable);
  }, [projectionMap, providers]);

  const getBestProvider = useCallback(
    (options?: {
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
    },
    [getAvailableProviders]
  );

  const isProviderConfigured = useCallback(
    (providerId: string): boolean => {
      const projection = projectionMap[providerId];
      if (!projection) return false;
      return projection.readiness !== 'unconfigured';
    },
    [projectionMap]
  );

  const isProviderEnabled = useCallback(
    (providerId: string): boolean => {
      const provider = providers[providerId];
      return provider?.settings.enabled ?? false;
    },
    [providers]
  );

  const getProviderModels = useCallback((providerId: string): string[] => {
    return projectionMap[providerId]?.modelIds || [];
  }, [projectionMap]);

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
