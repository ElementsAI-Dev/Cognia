/**
 * useSandbox Hook - React hook for sandbox code execution
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  ExecutionRequest,
  SandboxExecutionResult,
  Language,
  RuntimeType,
  BackendSandboxConfig,
  SandboxStatus,
} from '@/types/system/sandbox';
import { sandboxService } from '@/lib/native/sandbox';

interface UseSandboxState {
  isAvailable: boolean;
  isLoading: boolean;
  status: SandboxStatus | null;
  config: BackendSandboxConfig | null;
  languages: Language[];
  runtimes: RuntimeType[];
  error: string | null;
}

interface UseSandboxActions {
  execute: (request: ExecutionRequest) => Promise<SandboxExecutionResult>;
  quickExecute: (language: string, code: string) => Promise<SandboxExecutionResult>;
  refreshStatus: () => Promise<void>;
  updateConfig: (config: BackendSandboxConfig) => Promise<void>;
  setRuntime: (runtime: RuntimeType) => Promise<void>;
  toggleLanguage: (language: string, enabled: boolean) => Promise<void>;
  prepareLanguage: (language: string) => Promise<void>;
}

export function useSandbox(): UseSandboxState & UseSandboxActions {
  const [state, setState] = useState<UseSandboxState>({
    isAvailable: false,
    isLoading: true,
    status: null,
    config: null,
    languages: [],
    runtimes: [],
    error: null,
  });

  const refreshStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const isAvailable = await sandboxService.isAvailable();

      if (!isAvailable) {
        setState({
          isAvailable: false,
          isLoading: false,
          status: null,
          config: null,
          languages: [],
          runtimes: [],
          error: null,
        });
        return;
      }

      const [status, languages, runtimes] = await Promise.all([
        sandboxService.getStatus(),
        sandboxService.getLanguages(),
        sandboxService.getRuntimes(),
      ]);

      setState({
        isAvailable: true,
        isLoading: false,
        status,
        config: status.config,
        languages,
        runtimes,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load sandbox status',
      }));
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const execute = useCallback(
    async (request: ExecutionRequest): Promise<SandboxExecutionResult> => {
      if (!state.isAvailable) {
        throw new Error('Sandbox is not available');
      }
      return sandboxService.execute(request);
    },
    [state.isAvailable]
  );

  const quickExecute = useCallback(
    async (language: string, code: string): Promise<SandboxExecutionResult> => {
      if (!state.isAvailable) {
        throw new Error('Sandbox is not available');
      }
      return sandboxService.quickExecute(language, code);
    },
    [state.isAvailable]
  );

  const updateConfig = useCallback(
    async (config: BackendSandboxConfig): Promise<void> => {
      await sandboxService.updateConfig(config);
      await refreshStatus();
    },
    [refreshStatus]
  );

  const setRuntime = useCallback(
    async (runtime: RuntimeType): Promise<void> => {
      await sandboxService.setRuntime(runtime);
      await refreshStatus();
    },
    [refreshStatus]
  );

  const toggleLanguage = useCallback(
    async (language: string, enabled: boolean): Promise<void> => {
      await sandboxService.toggleLanguage(language, enabled);
      await refreshStatus();
    },
    [refreshStatus]
  );

  const prepareLanguage = useCallback(
    async (language: string): Promise<void> => {
      await sandboxService.prepareLanguage(language);
    },
    []
  );

  return {
    ...state,
    execute,
    quickExecute,
    refreshStatus,
    updateConfig,
    setRuntime,
    toggleLanguage,
    prepareLanguage,
  };
}

/**
 * useQuickCodeExecution - Hook for simple code execution with loading state
 * @deprecated Use useCodeExecution from use-sandbox-db.ts for more features
 */
export function useQuickCodeExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<SandboxExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (language: string, code: string, stdin?: string) => {
      setIsExecuting(true);
      setError(null);
      setResult(null);

      try {
        const SandboxExecutionResult = stdin
          ? await sandboxService.executeWithStdin(language, code, stdin)
          : await sandboxService.quickExecute(language, code);

        setResult(SandboxExecutionResult);
        return SandboxExecutionResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Execution failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    execute,
    reset,
    isExecuting,
    result,
    error,
  };
}

export default useSandbox;
