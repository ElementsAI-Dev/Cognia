/**
 * React hook for input completion
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useInputCompletionStore } from '@/stores/input-completion';
import * as api from '@/lib/native/input-completion';
import type {
  CompletionConfig,
  CompletionResult,
  CompletionSuggestion,
  InputCompletionEvent,
} from '@/types/input-completion';

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
  const suggestionTimestampRef = useRef<number>(0);

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

  // Accept the current suggestion with automatic feedback
  const accept = useCallback(async () => {
    try {
      const suggestion = await api.acceptSuggestion();
      if (suggestion) {
        incrementAccepted();
        onAccept?.(suggestion);

        // Auto-submit FullAccept feedback with timing
        const timeToAccept = suggestionTimestampRef.current > 0
          ? Date.now() - suggestionTimestampRef.current
          : 0;
        api.submitCompletionFeedback({
          type: 'FullAccept',
          suggestion_id: suggestion.id,
          time_to_accept_ms: timeToAccept,
        }).catch(() => { /* feedback is best-effort */ });
      }
      setCurrentSuggestion(null);
      suggestionTimestampRef.current = 0;
      return suggestion;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
      return null;
    }
  }, [setCurrentSuggestion, setError, incrementAccepted, onAccept]);

  // Dismiss the current suggestion with automatic feedback
  const dismiss = useCallback(async () => {
    try {
      // Auto-submit QuickDismiss feedback with timing
      const timeToDismiss = suggestionTimestampRef.current > 0
        ? Date.now() - suggestionTimestampRef.current
        : 0;
      const currentSugg = currentSuggestion;
      
      await api.dismissSuggestion();
      incrementDismissed();
      setCurrentSuggestion(null);
      onDismiss?.();

      if (currentSugg) {
        api.submitCompletionFeedback({
          type: 'QuickDismiss',
          suggestion_id: currentSugg.id,
          time_to_dismiss_ms: timeToDismiss,
        }).catch(() => { /* feedback is best-effort */ });
      }
      suggestionTimestampRef.current = 0;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
    }
  }, [currentSuggestion, setCurrentSuggestion, setError, incrementDismissed, onDismiss]);

  // Submit explicit quality feedback for a suggestion
  const submitFeedback = useCallback(async (feedback: import('@/types/input-completion').CompletionFeedback) => {
    try {
      await api.submitCompletionFeedback(feedback);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(errorMsg);
    }
  }, [setError]);

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

  // Listen for structured events from Rust backend
  // Rust emits all events to "input-completion://event" with InputCompletionEvent payload
  useEffect(() => {
    const unlistenPromise = listen<InputCompletionEvent>('input-completion://event', (event) => {
      const payload = event.payload;

      switch (payload.type) {
        case 'Suggestion':
          suggestionTimestampRef.current = Date.now();
          setCurrentSuggestion(payload.data);
          incrementRequests();
          onSuggestion?.(payload.data);
          break;

        case 'Accept':
          incrementAccepted();
          onAccept?.(payload.data);
          setCurrentSuggestion(null);
          break;

        case 'Dismiss':
          incrementDismissed();
          onDismiss?.();
          setCurrentSuggestion(null);
          break;

        case 'ImeStateChanged':
          setImeState(payload.data);
          break;

        case 'Error':
          setError(payload.data);
          onError?.(payload.data);
          break;

        case 'Started':
          setIsRunning(true);
          break;

        case 'Stopped':
          setIsRunning(false);
          setCurrentSuggestion(null);
          break;
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [
    setCurrentSuggestion,
    setImeState,
    setIsRunning,
    setError,
    incrementAccepted,
    incrementDismissed,
    incrementRequests,
    onSuggestion,
    onAccept,
    onDismiss,
    onError,
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
    submitFeedback,
  };
}
