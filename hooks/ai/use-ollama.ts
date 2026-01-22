/**
 * useOllama - React hook for Ollama local model management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getOllamaStatus,
  listOllamaModels,
  showOllamaModel,
  pullOllamaModel,
  deleteOllamaModel,
  listRunningModels,
  stopOllamaModel,
  DEFAULT_OLLAMA_URL,
} from '@/lib/ai/providers/ollama';
import type {
  OllamaModel,
  OllamaServerStatus,
  OllamaPullProgress,
  OllamaRunningModel,
  OllamaModelInfo,
} from '@/types/provider/ollama';

export interface UseOllamaOptions {
  baseUrl?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface PullState {
  model: string;
  progress: OllamaPullProgress | null;
  isActive: boolean;
  error?: string;
}

export interface UseOllamaReturn {
  // Status
  status: OllamaServerStatus | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Models
  models: OllamaModel[];
  runningModels: OllamaRunningModel[];

  // Pull state
  pullStates: Map<string, PullState>;
  isPulling: boolean;

  // Actions
  refresh: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshModels: () => Promise<void>;
  refreshRunning: () => Promise<void>;

  pullModel: (modelName: string) => Promise<boolean>;
  cancelPull: (modelName: string) => void;
  deleteModel: (modelName: string) => Promise<boolean>;
  stopModel: (modelName: string) => Promise<boolean>;
  getModelInfo: (modelName: string) => Promise<OllamaModelInfo | null>;
}

export function useOllama(options: UseOllamaOptions = {}): UseOllamaReturn {
  const { baseUrl = DEFAULT_OLLAMA_URL, autoRefresh = false, refreshInterval = 30000 } = options;

  // State
  const [status, setStatus] = useState<OllamaServerStatus | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [runningModels, setRunningModels] = useState<OllamaRunningModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pullStates, setPullStates] = useState<Map<string, PullState>>(new Map());

  // Refs for cleanup
  const pullUnsubscribers = useRef<Map<string, () => void>>(new Map());
  const isMounted = useRef(true);

  // Computed
  const isConnected = status?.connected ?? false;
  const isPulling = Array.from(pullStates.values()).some((s) => s.isActive);

  // Refresh status
  const refreshStatus = useCallback(async () => {
    try {
      const newStatus = await getOllamaStatus(baseUrl);
      if (isMounted.current) {
        setStatus(newStatus);
        setError(null);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to get status');
        setStatus({ connected: false, models_count: 0 });
      }
    }
  }, [baseUrl]);

  // Refresh models list
  const refreshModels = useCallback(async () => {
    if (!isConnected) return;

    try {
      const newModels = await listOllamaModels(baseUrl);
      if (isMounted.current) {
        setModels(newModels);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to list models');
      }
    }
  }, [baseUrl, isConnected]);

  // Refresh running models
  const refreshRunning = useCallback(async () => {
    if (!isConnected) return;

    try {
      const running = await listRunningModels(baseUrl);
      if (isMounted.current) {
        setRunningModels(running);
      }
    } catch (_err) {
      // Ignore errors for running models - endpoint might not be available
    }
  }, [baseUrl, isConnected]);

  // Refresh all
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await refreshStatus();
      await Promise.all([refreshModels(), refreshRunning()]);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [refreshStatus, refreshModels, refreshRunning]);

  // Pull model
  const pullModel = useCallback(
    async (modelName: string): Promise<boolean> => {
      // Initialize pull state
      setPullStates((prev) => {
        const next = new Map(prev);
        next.set(modelName, {
          model: modelName,
          progress: null,
          isActive: true,
        });
        return next;
      });

      try {
        const { success, unsubscribe } = await pullOllamaModel(baseUrl, modelName, (progress) => {
          if (isMounted.current) {
            setPullStates((prev) => {
              const next = new Map(prev);
              const current = next.get(modelName);
              if (current) {
                next.set(modelName, {
                  ...current,
                  progress,
                  isActive: progress.status !== 'success',
                });
              }
              return next;
            });
          }
        });

        // Store unsubscribe function
        pullUnsubscribers.current.set(modelName, unsubscribe);

        if (success && isMounted.current) {
          // Refresh models after successful pull
          await refreshModels();

          // Update state to complete
          setPullStates((prev) => {
            const next = new Map(prev);
            const current = next.get(modelName);
            if (current) {
              next.set(modelName, { ...current, isActive: false });
            }
            return next;
          });
        }

        return success;
      } catch (err) {
        if (isMounted.current) {
          const errorMsg = err instanceof Error ? err.message : 'Pull failed';
          setPullStates((prev) => {
            const next = new Map(prev);
            next.set(modelName, {
              model: modelName,
              progress: null,
              isActive: false,
              error: errorMsg,
            });
            return next;
          });
          setError(errorMsg);
        }
        return false;
      }
    },
    [baseUrl, refreshModels]
  );

  // Cancel pull
  const cancelPull = useCallback((modelName: string) => {
    const unsub = pullUnsubscribers.current.get(modelName);
    if (unsub) {
      unsub();
      pullUnsubscribers.current.delete(modelName);
    }

    setPullStates((prev) => {
      const next = new Map(prev);
      next.delete(modelName);
      return next;
    });
  }, []);

  // Delete model
  const deleteModel = useCallback(
    async (modelName: string): Promise<boolean> => {
      try {
        const success = await deleteOllamaModel(baseUrl, modelName);
        if (success && isMounted.current) {
          await refreshModels();
        }
        return success;
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Delete failed');
        }
        return false;
      }
    },
    [baseUrl, refreshModels]
  );

  // Stop model
  const stopModel = useCallback(
    async (modelName: string): Promise<boolean> => {
      try {
        const success = await stopOllamaModel(baseUrl, modelName);
        if (success && isMounted.current) {
          await refreshRunning();
        }
        return success;
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Stop failed');
        }
        return false;
      }
    },
    [baseUrl, refreshRunning]
  );

  // Get model info
  const getModelInfo = useCallback(
    async (modelName: string): Promise<OllamaModelInfo | null> => {
      try {
        return await showOllamaModel(baseUrl, modelName);
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Failed to get model info');
        }
        return null;
      }
    },
    [baseUrl]
  );

  // Initial load
  useEffect(() => {
    isMounted.current = true;
    refresh();

    // Copy ref to variable for cleanup
    const unsubscribers = pullUnsubscribers.current;

    return () => {
      isMounted.current = false;
      // Cleanup all pull subscriptions
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers.clear();
    };
  }, [refresh]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !isConnected) return;

    const interval = setInterval(() => {
      refreshModels();
      refreshRunning();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, isConnected, refreshInterval, refreshModels, refreshRunning]);

  return {
    status,
    isConnected,
    isLoading,
    error,
    models,
    runningModels,
    pullStates,
    isPulling,
    refresh,
    refreshStatus,
    refreshModels,
    refreshRunning,
    pullModel,
    cancelPull,
    deleteModel,
    stopModel,
    getModelInfo,
  };
}
