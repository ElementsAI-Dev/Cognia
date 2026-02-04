/**
 * useLocalProvider Hook - Unified state management for local AI providers
 *
 * Provides reactive state for connection status, model listing, and model operations
 * across all local inference engines (LM Studio, llama.cpp, vLLM, etc.)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  LocalProviderName,
  LocalServerStatus,
  LocalModelInfo,
  LocalModelPullProgress,
} from '@/types/provider/local-provider';
import {
  LocalProviderService,
  createLocalProviderService,
  type LocalProviderCapabilities,
} from '@/lib/ai/providers/local-provider-service';
import {
  LOCAL_PROVIDER_CONFIGS,
  type LocalProviderConfig,
} from '@/lib/ai/providers/local-providers';

/**
 * Pull state for a model
 */
export interface ModelPullState {
  isActive: boolean;
  progress?: LocalModelPullProgress;
  error?: string;
}

/**
 * Hook options
 */
export interface UseLocalProviderOptions {
  /** Provider ID */
  providerId: LocalProviderName;
  /** Custom base URL (optional) */
  baseUrl?: string;
  /** Auto-refresh interval in ms (0 to disable) */
  autoRefresh?: boolean;
  /** Refresh interval in ms */
  refreshInterval?: number;
  /** Auto-connect on mount */
  autoConnect?: boolean;
}

/**
 * Hook return type
 */
export interface UseLocalProviderReturn {
  /** Provider ID */
  providerId: LocalProviderName;
  /** Provider config */
  config: LocalProviderConfig;
  /** Provider capabilities */
  capabilities: LocalProviderCapabilities;
  /** Current server status */
  status: LocalServerStatus | null;
  /** Whether connected */
  isConnected: boolean;
  /** Whether loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** List of models */
  models: LocalModelInfo[];
  /** Active pull states */
  pullStates: Map<string, ModelPullState>;
  /** Whether any model is being pulled */
  isPulling: boolean;
  /** Refresh status and models */
  refresh: () => Promise<void>;
  /** Test connection */
  testConnection: () => Promise<{ success: boolean; message: string; latency?: number }>;
  /** Pull/download a model */
  pullModel: (modelName: string) => Promise<void>;
  /** Cancel a model pull */
  cancelPull: (modelName: string) => void;
  /** Delete a model */
  deleteModel: (modelName: string) => Promise<boolean>;
  /** Stop/unload a model */
  stopModel: (modelName: string) => Promise<boolean>;
  /** Update base URL */
  setBaseUrl: (url: string) => void;
}

/**
 * Hook for managing a local AI provider
 */
export function useLocalProvider(options: UseLocalProviderOptions): UseLocalProviderReturn {
  const {
    providerId,
    baseUrl: initialBaseUrl,
    autoRefresh = true,
    refreshInterval = 30000,
    autoConnect = true,
  } = options;

  const config = LOCAL_PROVIDER_CONFIGS[providerId];
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl || config?.defaultBaseURL || '');
  const [status, setStatus] = useState<LocalServerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<LocalModelInfo[]>([]);
  const [pullStates, setPullStates] = useState<Map<string, ModelPullState>>(new Map());

  const serviceRef = useRef<LocalProviderService | null>(
    createLocalProviderService(providerId, baseUrl)
  );
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pullUnsubscribersRef = useRef<Map<string, () => void>>(new Map());

  // Update service when providerId or baseUrl changes
  useEffect(() => {
    serviceRef.current = createLocalProviderService(providerId, baseUrl);
  }, [providerId, baseUrl]);

  const capabilities = serviceRef.current?.getCapabilities() || {
    canListModels: false,
    canPullModels: false,
    canDeleteModels: false,
    canStopModels: false,
    canGenerateEmbeddings: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: false,
  };

  // Refresh status and models
  const refresh = useCallback(async () => {
    if (!serviceRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const [newStatus, newModels] = await Promise.all([
        serviceRef.current.getStatus(),
        serviceRef.current.listModels(),
      ]);

      setStatus(newStatus);
      setModels(newModels);

      if (!newStatus.connected && newStatus.error) {
        setError(newStatus.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh';
      setError(message);
      setStatus({ connected: false, error: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Test connection
  const testConnection = useCallback(async () => {
    if (!serviceRef.current) {
      return { success: false, message: 'Service not initialized' };
    }

    const startTime = Date.now();
    try {
      const status = await serviceRef.current.getStatus();
      const latency = Date.now() - startTime;

      if (status.connected) {
        const modelCount = status.models_count ? ` (${status.models_count} models)` : '';
        const version = status.version ? ` v${status.version}` : '';
        return {
          success: true,
          message: `Connected${version}${modelCount}`,
          latency,
        };
      }

      return {
        success: false,
        message: status.error || 'Connection failed',
        latency,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
        latency: Date.now() - startTime,
      };
    }
  }, []);

  // Pull/download a model
  const pullModel = useCallback(
    async (modelName: string) => {
      if (!serviceRef.current || !capabilities.canPullModels) return;

      // Set initial state
      setPullStates((prev) => {
        const next = new Map(prev);
        next.set(modelName, { isActive: true });
        return next;
      });

      try {
        const { unsubscribe } = await serviceRef.current.pullModel(modelName, {
          onProgress: (progress) => {
            setPullStates((prev) => {
              const next = new Map(prev);
              next.set(modelName, { isActive: true, progress });
              return next;
            });
          },
        });

        pullUnsubscribersRef.current.set(modelName, unsubscribe);

        // Refresh models after pull completes
        await refresh();

        // Clear pull state
        setPullStates((prev) => {
          const next = new Map(prev);
          next.delete(modelName);
          return next;
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Pull failed';
        setPullStates((prev) => {
          const next = new Map(prev);
          next.set(modelName, { isActive: false, error: errorMessage });
          return next;
        });
      } finally {
        pullUnsubscribersRef.current.get(modelName)?.();
        pullUnsubscribersRef.current.delete(modelName);
      }
    },
    [capabilities.canPullModels, refresh]
  );

  // Cancel a model pull
  const cancelPull = useCallback((modelName: string) => {
    pullUnsubscribersRef.current.get(modelName)?.();
    pullUnsubscribersRef.current.delete(modelName);

    setPullStates((prev) => {
      const next = new Map(prev);
      next.delete(modelName);
      return next;
    });
  }, []);

  // Delete a model
  const deleteModel = useCallback(
    async (modelName: string): Promise<boolean> => {
      if (!serviceRef.current || !capabilities.canDeleteModels) return false;

      try {
        const success = await serviceRef.current.deleteModel(modelName);
        if (success) {
          setModels((prev) => prev.filter((m) => m.id !== modelName));
        }
        return success;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
        return false;
      }
    },
    [capabilities.canDeleteModels]
  );

  // Stop/unload a model
  const stopModel = useCallback(
    async (modelName: string): Promise<boolean> => {
      if (!serviceRef.current || !capabilities.canStopModels) return false;

      try {
        return await serviceRef.current.stopModel(modelName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Stop failed');
        return false;
      }
    },
    [capabilities.canStopModels]
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      refresh();
    }
  }, [autoConnect, refresh]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0 && status?.connected) {
      refreshTimerRef.current = setInterval(refresh, refreshInterval);
      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refresh, status?.connected]);

  // Cleanup on unmount
  useEffect(() => {
    const timer = refreshTimerRef.current;
    const unsubscribers = pullUnsubscribersRef.current;
    return () => {
      if (timer) {
        clearInterval(timer);
      }
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers.clear();
    };
  }, []);

  return {
    providerId,
    config,
    capabilities,
    status,
    isConnected: status?.connected ?? false,
    isLoading,
    error,
    models,
    pullStates,
    isPulling: Array.from(pullStates.values()).some((s) => s.isActive),
    refresh,
    testConnection,
    pullModel,
    cancelPull,
    deleteModel,
    stopModel,
    setBaseUrl,
  };
}

/**
 * Hook for checking all local providers at once
 */
export function useLocalProvidersScan() {
  const [results, setResults] = useState<Map<LocalProviderName, LocalServerStatus>>(new Map());
  const [isScanning, setIsScanning] = useState(false);

  const scan = useCallback(async () => {
    setIsScanning(true);
    const providerIds: LocalProviderName[] = [
      'ollama',
      'lmstudio',
      'llamacpp',
      'llamafile',
      'vllm',
      'localai',
      'jan',
      'textgenwebui',
      'koboldcpp',
      'tabbyapi',
    ];

    const newResults = new Map<LocalProviderName, LocalServerStatus>();

    await Promise.all(
      providerIds.map(async (id) => {
        const service = createLocalProviderService(id);
        const status = await service.getStatus();
        newResults.set(id, status);
      })
    );

    setResults(newResults);
    setIsScanning(false);
  }, []);

  return { results, isScanning, scan };
}

export default useLocalProvider;
