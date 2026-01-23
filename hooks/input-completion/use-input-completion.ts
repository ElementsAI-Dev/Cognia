/**
 * React hook for input completion
 */

import { useCallback, useEffect, useState } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useInputCompletionStore } from '@/stores/input-completion';
import * as api from '@/lib/native/input-completion';
import type { CompletionConfig, CompletionResult, CompletionSuggestion } from '@/types/input-completion';

export interface UseInputCompletionOptions {
  /** Auto-start on mount */
  autoStart?: boolean;
  /** Callback when suggestion is received */
  onSuggestion?: (suggestion: CompletionSuggestion) => void;
  /** Callback when suggestion is accepted */
  onAccept?: (suggestion: CompletionSuggestion) => void;
  /** Callback when suggestion is dismissed */
  onDismiss?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export function useInputCompletion(options: UseInputCompletionOptions = {}) {
  const { autoStart = false, onSuggestion, onAccept, onDismiss, onError } = options;

  const {
    isRunning,
    imeState,
    currentSuggestion,
    config,
    isLoading,
    error,
    stats,
    setIsRunning,
    setImeState,
    setCurrentSuggestion,
    setConfig,
    setIsLoading,
    setError,
    incrementAccepted,
    incrementDismissed,
    incrementRequests,
  } = useInputCompletionStore();

  const [initialized, setInitialized] = useState(false);

  // Start the completion system
  const start = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await api.startInputCompletion();
      setIsRunning(true);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError, setIsRunning, onError]);

  // Stop the completion system
  const stop = useCallback(async () => {
    try {
      setIsLoading(true);
      await api.stopInputCompletion();
      setIsRunning(false);
      setCurrentSuggestion(null);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setIsRunning, setCurrentSuggestion, setError]);

  // Accept the current suggestion
  const accept = useCallback(async () => {
    try {
      const suggestion = await api.acceptSuggestion();
      if (suggestion) {
        incrementAccepted();
        onAccept?.(suggestion);
      }
      setCurrentSuggestion(null);
      return suggestion;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
      return null;
    }
  }, [setCurrentSuggestion, setError, incrementAccepted, onAccept]);

  // Dismiss the current suggestion
  const dismiss = useCallback(async () => {
    try {
      await api.dismissSuggestion();
      incrementDismissed();
      setCurrentSuggestion(null);
      onDismiss?.();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
    }
  }, [setCurrentSuggestion, setError, incrementDismissed, onDismiss]);

  // Manually trigger completion
  const trigger = useCallback(
    async (text: string): Promise<CompletionResult | null> => {
      try {
        setIsLoading(true);
        incrementRequests();
        const result = await api.triggerCompletion(text);
        if (result.suggestions.length > 0) {
          setCurrentSuggestion(result.suggestions[0]);
          onSuggestion?.(result.suggestions[0]);
        }
        return result;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        setError(errorMsg);
        onError?.(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setCurrentSuggestion, setError, incrementRequests, onSuggestion, onError]
  );

  // Update configuration
  const updateConfig = useCallback(
    async (newConfig: CompletionConfig) => {
      try {
        await api.updateCompletionConfig(newConfig);
        setConfig(newConfig);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        setError(errorMsg);
      }
    },
    [setConfig, setError]
  );

  // Refresh IME state
  const refreshImeState = useCallback(async () => {
    try {
      const state = await api.getImeState();
      setImeState(state);
      return state;
    } catch (_e) {
      return null;
    }
  }, [setImeState]);

  // Refresh status
  const refreshStatus = useCallback(async () => {
    try {
      const status = await api.getCompletionStatus();
      setIsRunning(status.is_running);
      setImeState(status.ime_state);
      return status;
    } catch (_e) {
      return null;
    }
  }, [setIsRunning, setImeState]);

  // Get completion statistics
  const getStats = useCallback(async () => {
    try {
      return await api.getCompletionStats();
    } catch (_e) {
      return null;
    }
  }, []);

  // Reset statistics
  const resetStats = useCallback(async () => {
    try {
      await api.resetCompletionStats();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
    }
  }, [setError]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await api.clearCompletionCache();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
    }
  }, [setError]);

  // Test provider connection
  const testConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.testProviderConnection();
      return result;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError, onError]);

  // Load initial config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const loadedConfig = await api.getCompletionConfig();
        setConfig(loadedConfig);
        setInitialized(true);
      } catch (_e) {
        // Use default config
        setInitialized(true);
      }
    };
    loadConfig();
  }, [setConfig]);

  // Auto-start if configured
  useEffect(() => {
    if (initialized && autoStart && config?.enabled && !isRunning) {
      start();
    }
  }, [initialized, autoStart, config?.enabled, isRunning, start]);

  // Listen for events from backend
  useEffect(() => {
    const unlistenPromises: Promise<UnlistenFn>[] = [];

    unlistenPromises.push(
      listen<CompletionSuggestion>('input-completion-suggestion', (event) => {
        setCurrentSuggestion(event.payload);
        onSuggestion?.(event.payload);
      })
    );

    unlistenPromises.push(
      listen<CompletionSuggestion>('input-completion-accept', (event) => {
        incrementAccepted();
        onAccept?.(event.payload);
        setCurrentSuggestion(null);
      })
    );

    unlistenPromises.push(
      listen('input-completion-dismiss', () => {
        incrementDismissed();
        onDismiss?.();
        setCurrentSuggestion(null);
      })
    );

    return () => {
      unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
    };
  }, [
    setCurrentSuggestion,
    incrementAccepted,
    incrementDismissed,
    onSuggestion,
    onAccept,
    onDismiss,
  ]);

  return {
    // State
    isRunning,
    imeState,
    currentSuggestion,
    config,
    isLoading,
    error,
    stats,
    initialized,

    // Actions
    start,
    stop,
    accept,
    dismiss,
    trigger,
    updateConfig,
    refreshImeState,
    refreshStatus,
    getStats,
    resetStats,
    clearCache,
    testConnection,
  };
}
