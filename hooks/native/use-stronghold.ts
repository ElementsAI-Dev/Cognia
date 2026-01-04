/**
 * useStronghold - Hook for secure secret storage using Tauri Stronghold
 * Provides React state management for Stronghold initialization and API key operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Check if we're in a Tauri environment (evaluated at runtime)
const checkIsTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface StrongholdState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  isLocked: boolean;
}

export interface UseStrongholdReturn extends StrongholdState {
  initialize: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  storeApiKey: (providerId: string, apiKey: string) => Promise<boolean>;
  getApiKey: (providerId: string) => Promise<string | null>;
  removeApiKey: (providerId: string) => Promise<boolean>;
  hasApiKey: (providerId: string) => Promise<boolean>;
  storeSearchKey: (providerId: string, apiKey: string) => Promise<boolean>;
  getSearchKey: (providerId: string) => Promise<string | null>;
  removeSearchKey: (providerId: string) => Promise<boolean>;
  storeCustomKey: (providerId: string, apiKey: string) => Promise<boolean>;
  getCustomKey: (providerId: string) => Promise<string | null>;
  removeCustomKey: (providerId: string) => Promise<boolean>;
}

export function useStronghold(): UseStrongholdReturn {
  const [state, setState] = useState<StrongholdState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    isLocked: true,
  });

  const strongholdRef = useRef<typeof import('@/lib/native/stronghold') | null>(null);

  // Load the stronghold module
  useEffect(() => {
    if (checkIsTauri()) {
      import('@/lib/native/stronghold').then((module) => {
        strongholdRef.current = module;
        // Check if already initialized
        if (module.isStrongholdReady()) {
          setState((prev) => ({
            ...prev,
            isInitialized: true,
            isLocked: false,
          }));
        }
      });
    }
  }, []);

  const initialize = useCallback(async (password: string): Promise<boolean> => {
    if (!checkIsTauri()) {
      console.warn('Stronghold is only available in Tauri environment');
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const stronghold = strongholdRef.current || (await import('@/lib/native/stronghold'));
      strongholdRef.current = stronghold;

      const success = await stronghold.initStronghold(password);
      
      setState({
        isInitialized: success,
        isLoading: false,
        error: success ? null : 'Failed to initialize Stronghold',
        isLocked: !success,
      });

      return success;
    } catch (err) {
      console.error('Failed to initialize Stronghold:', err);
      setState({
        isInitialized: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to initialize Stronghold',
        isLocked: true,
      });
      return false;
    }
  }, []);

  const lock = useCallback(async (): Promise<void> => {
    if (!strongholdRef.current) return;

    try {
      await strongholdRef.current.closeStronghold();
      setState({
        isInitialized: false,
        isLoading: false,
        error: null,
        isLocked: true,
      });
    } catch (err) {
      console.error('Failed to lock Stronghold:', err);
    }
  }, []);

  // Provider API Key operations
  const storeApiKey = useCallback(async (providerId: string, apiKey: string): Promise<boolean> => {
    if (!strongholdRef.current || !state.isInitialized) {
      console.warn('Stronghold not initialized');
      return false;
    }

    try {
      return await strongholdRef.current.storeProviderApiKey(providerId, apiKey);
    } catch (err) {
      console.error('Failed to store API key:', err);
      return false;
    }
  }, [state.isInitialized]);

  const getApiKey = useCallback(async (providerId: string): Promise<string | null> => {
    if (!strongholdRef.current || !state.isInitialized) {
      return null;
    }

    try {
      return await strongholdRef.current.getProviderApiKey(providerId);
    } catch (err) {
      console.error('Failed to get API key:', err);
      return null;
    }
  }, [state.isInitialized]);

  const removeApiKey = useCallback(async (providerId: string): Promise<boolean> => {
    if (!strongholdRef.current || !state.isInitialized) {
      return false;
    }

    try {
      return await strongholdRef.current.removeProviderApiKey(providerId);
    } catch (err) {
      console.error('Failed to remove API key:', err);
      return false;
    }
  }, [state.isInitialized]);

  const hasApiKey = useCallback(async (providerId: string): Promise<boolean> => {
    if (!strongholdRef.current || !state.isInitialized) {
      return false;
    }

    try {
      return await strongholdRef.current.hasProviderApiKey(providerId);
    } catch (err) {
      console.error('Failed to check API key:', err);
      return false;
    }
  }, [state.isInitialized]);

  // Search API Key operations
  const storeSearchKey = useCallback(async (providerId: string, apiKey: string): Promise<boolean> => {
    if (!strongholdRef.current || !state.isInitialized) {
      return false;
    }

    try {
      return await strongholdRef.current.storeSearchApiKey(providerId, apiKey);
    } catch (err) {
      console.error('Failed to store search API key:', err);
      return false;
    }
  }, [state.isInitialized]);

  const getSearchKey = useCallback(async (providerId: string): Promise<string | null> => {
    if (!strongholdRef.current || !state.isInitialized) {
      return null;
    }

    try {
      return await strongholdRef.current.getSearchApiKey(providerId);
    } catch (err) {
      console.error('Failed to get search API key:', err);
      return null;
    }
  }, [state.isInitialized]);

  const removeSearchKey = useCallback(async (providerId: string): Promise<boolean> => {
    if (!strongholdRef.current || !state.isInitialized) {
      return false;
    }

    try {
      return await strongholdRef.current.removeSearchApiKey(providerId);
    } catch (err) {
      console.error('Failed to remove search API key:', err);
      return false;
    }
  }, [state.isInitialized]);

  // Custom Provider API Key operations
  const storeCustomKey = useCallback(async (providerId: string, apiKey: string): Promise<boolean> => {
    if (!strongholdRef.current || !state.isInitialized) {
      return false;
    }

    try {
      return await strongholdRef.current.storeCustomProviderApiKey(providerId, apiKey);
    } catch (err) {
      console.error('Failed to store custom API key:', err);
      return false;
    }
  }, [state.isInitialized]);

  const getCustomKey = useCallback(async (providerId: string): Promise<string | null> => {
    if (!strongholdRef.current || !state.isInitialized) {
      return null;
    }

    try {
      return await strongholdRef.current.getCustomProviderApiKey(providerId);
    } catch (err) {
      console.error('Failed to get custom API key:', err);
      return null;
    }
  }, [state.isInitialized]);

  const removeCustomKey = useCallback(async (providerId: string): Promise<boolean> => {
    if (!strongholdRef.current || !state.isInitialized) {
      return false;
    }

    try {
      return await strongholdRef.current.removeCustomProviderApiKey(providerId);
    } catch (err) {
      console.error('Failed to remove custom API key:', err);
      return false;
    }
  }, [state.isInitialized]);

  return {
    ...state,
    initialize,
    lock,
    storeApiKey,
    getApiKey,
    removeApiKey,
    hasApiKey,
    storeSearchKey,
    getSearchKey,
    removeSearchKey,
    storeCustomKey,
    getCustomKey,
    removeCustomKey,
  };
}

export default useStronghold;
