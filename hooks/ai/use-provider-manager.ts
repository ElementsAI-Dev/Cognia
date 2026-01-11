/**
 * useProviderManager - React hook for unified provider management
 * 
 * Integrates the Provider Manager infrastructure with React components,
 * providing access to load balancing, failover, quota management,
 * and health monitoring.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/stores/settings';
import {
  ProviderManager,
  getProviderManager,
  type ProviderManagerConfig,
  type ProviderState,
  type ExecutionContext,
  type SandboxExecutionResult,
  type RequestOptions,
  type ProviderCredentials,
} from '@/lib/ai/infrastructure/provider-manager';
import type { QuotaStatus } from '@/lib/ai/infrastructure/quota-manager';
import type { AvailabilityStatus } from '@/lib/ai/infrastructure/availability-monitor';

export interface QuotaAlertInfo {
  providerId: string;
  type: string;
  message: string;
}

export interface UseProviderManagerOptions {
  /** Enable automatic initialization */
  autoInitialize?: boolean;
  /** Provider Manager configuration */
  config?: Partial<ProviderManagerConfig>;
  /** Enable quota alerts */
  enableQuotaAlerts?: boolean;
  /** Enable availability monitoring */
  enableAvailabilityMonitoring?: boolean;
}

export interface UseProviderManagerReturn {
  /** Provider Manager instance */
  manager: ProviderManager | null;
  /** Whether the manager is initialized */
  isInitialized: boolean;
  /** All provider states */
  providerStates: Map<string, ProviderState>;
  /** Get specific provider state */
  getProviderState: (providerId: string) => ProviderState | null;
  /** Execute a request with full provider management */
  execute: <T>(
    fn: (context: ExecutionContext) => Promise<T>,
    options: RequestOptions
  ) => Promise<SandboxExecutionResult<T>>;
  /** Check if a provider is available */
  isProviderAvailable: (providerId: string) => boolean;
  /** Get quota status for a provider */
  getQuotaStatus: (providerId: string) => QuotaStatus | null;
  /** Refresh all provider health */
  refreshHealth: () => Promise<void>;
  /** Reset circuit breaker for a provider */
  resetCircuitBreaker: (providerId: string) => void;
  /** Get summary statistics */
  summary: {
    totalProviders: number;
    enabledProviders: number;
    availableProviders: number;
    openCircuits: string[];
    quotaAlerts: number;
  };
  /** Recent quota alerts */
  quotaAlerts: QuotaAlertInfo[];
  /** Provider availability changes */
  availabilityChanges: { providerId: string; status: AvailabilityStatus }[];
}

/**
 * Hook for using the Provider Manager in React components
 */
export function useProviderManager(
  options: UseProviderManagerOptions = {}
): UseProviderManagerReturn {
  const {
    autoInitialize = true,
    config,
    enableQuotaAlerts = true,
    enableAvailabilityMonitoring = true,
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [providerStates, setProviderStates] = useState<Map<string, ProviderState>>(new Map());
  const [summary, setSummary] = useState({
    totalProviders: 0,
    enabledProviders: 0,
    availableProviders: 0,
    openCircuits: [] as string[],
    quotaAlerts: 0,
  });
  const [quotaAlerts, setQuotaAlerts] = useState<QuotaAlertInfo[]>([]);
  const [availabilityChanges, setAvailabilityChanges] = useState<
    { providerId: string; status: AvailabilityStatus }[]
  >([]);
  const [managerInstance, setManagerInstance] = useState<ProviderManager | null>(null);

  // Get settings from store
  const providerSettings = useSettingsStore((s) => s.providerSettings);
  const customProviders = useSettingsStore((s) => s.customProviders);

  // Memoize provider list
  const providers = useMemo(() => {
    const result: { id: string; credentials: ProviderCredentials; enabled: boolean }[] = [];

    Object.entries(providerSettings).forEach(([id, settings]) => {
      result.push({
        id,
        credentials: {
          apiKey: settings.apiKey,
          apiKeys: settings.apiKeys,
          apiKeyRotationEnabled: settings.apiKeyRotationEnabled,
          apiKeyRotationStrategy: settings.apiKeyRotationStrategy,
          apiKeyUsageStats: settings.apiKeyUsageStats,
          currentKeyIndex: settings.currentKeyIndex,
          baseURL: settings.baseURL,
        },
        enabled: settings.enabled,
      });
    });

    Object.entries(customProviders).forEach(([id, settings]) => {
      result.push({
        id,
        credentials: {
          apiKey: settings.apiKey,
          baseURL: settings.baseURL,
        },
        enabled: settings.enabled,
      });
    });

    return result;
  }, [providerSettings, customProviders]);

  // Initialize manager
  useEffect(() => {
    if (!autoInitialize) return;

    const mgr = getProviderManager(config);
    mgr.initialize(providers);

    // Batch state updates to avoid cascading renders
    const initialStates = mgr.getAllProviderStates();
    const initialSummary = mgr.getSummary();
    
    // Use queueMicrotask to defer state updates
    queueMicrotask(() => {
      setManagerInstance(mgr);
      setIsInitialized(true);
      setProviderStates(initialStates);
      setSummary(initialSummary);
    });

    const unsubscribers: (() => void)[] = [];

    // Subscribe to events
    if (enableQuotaAlerts) {
      const unsubQuota = mgr.onQuotaAlert((alert) => {
        setQuotaAlerts((prev) => [...prev.slice(-9), {
          providerId: alert.providerId,
          type: alert.type,
          message: alert.message,
        }]);
      });
      unsubscribers.push(unsubQuota);
    }

    if (enableAvailabilityMonitoring) {
      const unsubAvail = mgr.onAvailabilityChange((event) => {
        setAvailabilityChanges((prev) => [
          ...prev.slice(-9),
          { providerId: event.providerId, status: event.status as AvailabilityStatus },
        ]);
        setProviderStates(mgr.getAllProviderStates());
        setSummary(mgr.getSummary());
      });
      unsubscribers.push(unsubAvail);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [autoInitialize, config, enableQuotaAlerts, enableAvailabilityMonitoring, providers]);

  // Execute with provider management
  const execute = useCallback(
    async <T>(
      fn: (context: ExecutionContext) => Promise<T>,
      requestOptions: RequestOptions
    ): Promise<SandboxExecutionResult<T>> => {
      if (!managerInstance) {
        throw new Error('Provider Manager not initialized');
      }
      const result = await managerInstance.execute(fn, requestOptions);
      setProviderStates(managerInstance.getAllProviderStates());
      setSummary(managerInstance.getSummary());
      return result;
    },
    [managerInstance]
  );

  // Get provider state
  const getProviderState = useCallback(
    (providerId: string): ProviderState | null => {
      return managerInstance?.getProviderState(providerId) ?? null;
    },
    [managerInstance]
  );

  // Check provider availability
  const isProviderAvailable = useCallback(
    (providerId: string): boolean => {
      const state = managerInstance?.getProviderState(providerId);
      if (!state) return false;
      return (
        state.enabled &&
        state.circuitState !== 'open' &&
        (state.availability?.status === 'available' ||
          state.availability?.status === 'degraded' ||
          state.availability === null)
      );
    },
    [managerInstance]
  );

  // Get quota status
  const getQuotaStatus = useCallback(
    (providerId: string): QuotaStatus | null => {
      return managerInstance?.getQuotaStatus(providerId) ?? null;
    },
    [managerInstance]
  );

  // Refresh health
  const refreshHealth = useCallback(async (): Promise<void> => {
    if (!managerInstance) return;
    await managerInstance.checkAllProvidersHealth();
    setProviderStates(managerInstance.getAllProviderStates());
    setSummary(managerInstance.getSummary());
  }, [managerInstance]);

  // Reset circuit breaker
  const resetCircuitBreaker = useCallback(
    (providerId: string): void => {
      if (!managerInstance) return;
      managerInstance.resetCircuitBreaker(providerId);
      setProviderStates(managerInstance.getAllProviderStates());
      setSummary(managerInstance.getSummary());
    },
    [managerInstance]
  );

  return {
    manager: managerInstance,
    isInitialized,
    providerStates,
    getProviderState,
    execute,
    isProviderAvailable,
    getQuotaStatus,
    refreshHealth,
    resetCircuitBreaker,
    summary,
    quotaAlerts,
    availabilityChanges,
  };
}

/**
 * Hook for executing AI requests with automatic provider management
 */
export function useProviderExecution() {
  const { execute, isInitialized } = useProviderManager();

  const executeAI = useCallback(
    async <T>(
      fn: (context: ExecutionContext) => Promise<T>,
      options: Omit<RequestOptions, 'modelId'> & { modelId: string }
    ): Promise<T> => {
      if (!isInitialized) {
        throw new Error('Provider Manager not initialized');
      }

      const result = await execute(fn, options);

      if (!result.success) {
        throw result.error || new Error('Execution failed');
      }

      return result.data!;
    },
    [execute, isInitialized]
  );

  return { executeAI, isInitialized };
}

/**
 * Hook for monitoring provider health
 */
export function useProviderHealth(providerId: string) {
  const { getProviderState, refreshHealth, resetCircuitBreaker, isProviderAvailable } =
    useProviderManager();

  const [state, setState] = useState<ProviderState | null>(null);

  useEffect(() => {
    setState(getProviderState(providerId));
  }, [providerId, getProviderState]);

  const refresh = useCallback(async () => {
    await refreshHealth();
    setState(getProviderState(providerId));
  }, [providerId, refreshHealth, getProviderState]);

  const resetCircuit = useCallback(() => {
    resetCircuitBreaker(providerId);
    setState(getProviderState(providerId));
  }, [providerId, resetCircuitBreaker, getProviderState]);

  return {
    state,
    isAvailable: isProviderAvailable(providerId),
    circuitState: state?.circuitState || 'closed',
    availability: state?.availability,
    metrics: state?.metrics,
    quota: state?.quota,
    refresh,
    resetCircuit,
  };
}

/**
 * Hook for provider quota information
 */
export function useProviderQuota(providerId: string) {
  const { getQuotaStatus } = useProviderManager();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  useEffect(() => {
    setQuota(getQuotaStatus(providerId));
  }, [providerId, getQuotaStatus]);

  const refresh = useCallback(() => {
    setQuota(getQuotaStatus(providerId));
  }, [providerId, getQuotaStatus]);

  return {
    quota,
    usage: quota?.usage,
    remaining: quota?.remaining,
    alerts: quota?.alerts || [],
    isBlocked: quota?.isBlocked || false,
    refresh,
  };
}

export default useProviderManager;
