import { useState, useCallback, useRef } from 'react';
import { testProviderConnection, testCustomProviderConnectionByProtocol, type ApiTestResult } from '@/lib/ai/infrastructure/api-test';
import type { ApiProtocol } from '@/types/provider';

export interface ProviderTestState {
  results: Record<string, ApiTestResult | null>;
  testing: Record<string, boolean>;
  customResults: Record<string, 'success' | 'error' | null>;
  customMessages: Record<string, string | null>;
}

export interface UseProviderTestReturn {
  state: ProviderTestState;
  testProvider: (providerId: string, apiKey: string, baseURL?: string) => Promise<ApiTestResult | undefined>;
  testCustomProvider: (
    providerId: string,
    baseURL: string,
    apiKey: string,
    protocol: ApiProtocol
  ) => Promise<{ success: boolean; message: string } | undefined>;
  batchTest: (
    providers: Array<{ id: string; apiKey: string; baseURL?: string }>,
    customProviders: Array<{ id: string; baseURL: string; apiKey: string; protocol: ApiProtocol }>,
    onProgress?: (progress: number) => void
  ) => Promise<void>;
  cancelBatchTest: () => void;
  isBatchTesting: boolean;
  batchProgress: number;
  clearResults: () => void;
  getResultsSummary: () => { success: number; failed: number; total: number };
}

const initialState: ProviderTestState = {
  results: {},
  testing: {},
  customResults: {},
  customMessages: {},
};

export function useProviderTest(): UseProviderTestReturn {
  const [state, setState] = useState<ProviderTestState>(initialState);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const cancelRef = useRef(false);

  const testProvider = useCallback(async (
    providerId: string,
    apiKey: string,
    baseURL?: string
  ): Promise<ApiTestResult | undefined> => {
    if (!apiKey) return undefined;

    setState(prev => ({
      ...prev,
      testing: { ...prev.testing, [providerId]: true },
      results: { ...prev.results, [providerId]: null },
    }));

    try {
      const result = await testProviderConnection(providerId, apiKey, baseURL);
      setState(prev => ({
        ...prev,
        results: { ...prev.results, [providerId]: result },
      }));
      return result;
    } catch (error) {
      const failedResult: ApiTestResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
      setState(prev => ({
        ...prev,
        results: { ...prev.results, [providerId]: failedResult },
      }));
      return failedResult;
    } finally {
      setState(prev => ({
        ...prev,
        testing: { ...prev.testing, [providerId]: false },
      }));
    }
  }, []);

  const testCustomProvider = useCallback(async (
    providerId: string,
    baseURL: string,
    apiKey: string,
    protocol: ApiProtocol
  ): Promise<{ success: boolean; message: string } | undefined> => {
    if (!baseURL || !apiKey) return undefined;

    // Validate URL
    try {
      new URL(baseURL);
    } catch {
      const message = 'Invalid base URL';
      setState(prev => ({
        ...prev,
        customResults: { ...prev.customResults, [providerId]: 'error' },
        customMessages: { ...prev.customMessages, [providerId]: message },
      }));
      return { success: false, message };
    }

    setState(prev => ({
      ...prev,
      testing: { ...prev.testing, [providerId]: true },
      customResults: { ...prev.customResults, [providerId]: null },
      customMessages: { ...prev.customMessages, [providerId]: null },
    }));

    try {
      const result = await testCustomProviderConnectionByProtocol(baseURL, apiKey, protocol);
      setState(prev => ({
        ...prev,
        customResults: { ...prev.customResults, [providerId]: result.success ? 'success' : 'error' },
        customMessages: { ...prev.customMessages, [providerId]: result.message },
      }));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({
        ...prev,
        customResults: { ...prev.customResults, [providerId]: 'error' },
        customMessages: { ...prev.customMessages, [providerId]: message },
      }));
      return { success: false, message };
    } finally {
      setState(prev => ({
        ...prev,
        testing: { ...prev.testing, [providerId]: false },
      }));
    }
  }, []);

  const batchTest = useCallback(async (
    providers: Array<{ id: string; apiKey: string; baseURL?: string }>,
    customProviders: Array<{ id: string; baseURL: string; apiKey: string; protocol: ApiProtocol }>,
    onProgress?: (progress: number) => void
  ) => {
    const total = providers.length + customProviders.length;
    if (total === 0) return;

    cancelRef.current = false;
    setIsBatchTesting(true);
    setBatchProgress(0);

    // Clear previous results
    setState(initialState);

    let completed = 0;

    // Test built-in providers
    for (const provider of providers) {
      if (cancelRef.current) break;
      await testProvider(provider.id, provider.apiKey, provider.baseURL);
      if (cancelRef.current) break;
      completed++;
      const progress = (completed / total) * 100;
      setBatchProgress(progress);
      onProgress?.(progress);
    }

    // Test custom providers
    for (const provider of customProviders) {
      if (cancelRef.current) break;
      await testCustomProvider(provider.id, provider.baseURL, provider.apiKey, provider.protocol);
      if (cancelRef.current) break;
      completed++;
      const progress = (completed / total) * 100;
      setBatchProgress(progress);
      onProgress?.(progress);
    }

    setIsBatchTesting(false);
    cancelRef.current = false;
  }, [testProvider, testCustomProvider]);

  const cancelBatchTest = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const clearResults = useCallback(() => {
    setState(initialState);
  }, []);

  const getResultsSummary = useCallback(() => {
    const builtInSuccess = Object.values(state.results).filter(r => r?.success).length;
    const builtInFailed = Object.values(state.results).filter(r => r && !r.success).length;
    const customSuccess = Object.values(state.customResults).filter(r => r === 'success').length;
    const customFailed = Object.values(state.customResults).filter(r => r === 'error').length;

    return {
      success: builtInSuccess + customSuccess,
      failed: builtInFailed + customFailed,
      total: Object.values(state.results).filter(r => r !== null).length +
             Object.values(state.customResults).filter(r => r !== null).length,
    };
  }, [state.results, state.customResults]);

  return {
    state,
    testProvider,
    testCustomProvider,
    batchTest,
    cancelBatchTest,
    isBatchTesting,
    batchProgress,
    clearResults,
    getResultsSummary,
  };
}
