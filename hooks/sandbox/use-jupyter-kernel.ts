/**
 * Jupyter Kernel Hook
 *
 * React hook for managing Jupyter kernel sessions and execution.
 */

import { useCallback, useEffect, useRef } from 'react';
import { kernelService } from '@/lib/jupyter/kernel';
import {
  useJupyterStore,
  useActiveSession,
  useActiveKernel,
} from '@/stores/tools';
import type {
  JupyterSession,
  KernelInfo,
  KernelSandboxExecutionResult,
  VariableInfo,
  CreateSessionOptions,
  KernelProgressEvent,
  CellOutputEvent,
} from '@/types/system/jupyter';

/** Hook return type */
export interface UseJupyterKernelReturn {
  // State
  sessions: JupyterSession[];
  kernels: KernelInfo[];
  activeSession: JupyterSession | undefined;
  activeKernel: KernelInfo | null;
  isExecuting: boolean;
  executingCellIndex: number | null;
  lastResult: KernelSandboxExecutionResult | null;
  variables: VariableInfo[];
  variablesLoading: boolean;
  error: string | null;
  isCreatingSession: boolean;
  isLoadingSessions: boolean;

  // Session management
  createSession: (options: CreateSessionOptions) => Promise<JupyterSession | null>;
  deleteSession: (sessionId: string) => Promise<void>;
  setActiveSession: (sessionId: string | null) => void;
  refreshSessions: () => Promise<void>;

  // Kernel management
  restartKernel: (sessionId?: string) => Promise<void>;
  interruptKernel: (sessionId?: string) => Promise<void>;

  // Execution
  execute: (code: string, sessionId?: string) => Promise<KernelSandboxExecutionResult | null>;
  executeCell: (
    cellIndex: number,
    code: string,
    sessionId?: string
  ) => Promise<KernelSandboxExecutionResult | null>;
  quickExecute: (
    envPath: string,
    code: string
  ) => Promise<KernelSandboxExecutionResult | null>;

  // Variables
  refreshVariables: (sessionId?: string) => Promise<void>;
  inspectVariable: (
    variableName: string,
    sessionId?: string
  ) => Promise<KernelSandboxExecutionResult | null>;

  // Utility
  checkKernelAvailable: (envPath: string) => Promise<boolean>;
  ensureKernel: (envPath: string) => Promise<boolean>;
  shutdownAll: () => Promise<void>;
  clearError: () => void;

  // Chat integration
  getSessionForChat: (chatSessionId: string) => JupyterSession | null;
  mapChatToSession: (
    chatSessionId: string,
    jupyterSessionId: string,
    envPath: string
  ) => void;
  unmapChatSession: (chatSessionId: string) => void;
}

/** Jupyter kernel management hook */
export function useJupyterKernel(): UseJupyterKernelReturn {
  const {
    sessions,
    kernels,
    activeSessionId,
    isExecuting,
    executingCellIndex,
    lastSandboxExecutionResult,
    variables,
    variablesLoading,
    error,
    isCreatingSession,
    isLoadingSessions,
    sessionEnvMappings,
    setSessions,
    addSession,
    removeSession,
    setActiveSession: setActiveSessionInStore,
    setKernels,
    updateKernelStatus,
    setExecuting,
    setLastSandboxExecutionResult,
    setVariables,
    setVariablesLoading,
    addExecutionHistory,
    mapChatToJupyter,
    unmapChatSession: unmapChatSessionInStore,
    setError,
    clearError,
    setCreatingSession,
    setLoadingSessions,
  } = useJupyterStore();

  const activeSession = useActiveSession();
  const activeKernel = useActiveKernel() ?? null;

  // Track event listeners
  const unlistenersRef = useRef<Array<() => void>>([]);

  // Setup event listeners
  useEffect(() => {
    if (!kernelService.isAvailable()) return;

    const setupListeners = async () => {
      // Listen for kernel status changes
      const unlistenStatus = await kernelService.onKernelStatus(
        (event: KernelProgressEvent) => {
          if (event.kernelId) {
            updateKernelStatus(event.kernelId, event.status);
          }
          if (event.status === 'error' && event.message) {
            setError(event.message);
          }
        }
      );

      // Listen for execution output
      const unlistenOutput = await kernelService.onKernelOutput(
        (result: KernelSandboxExecutionResult) => {
          setLastSandboxExecutionResult(result);
        }
      );

      // Listen for cell output
      const unlistenCellOutput = await kernelService.onCellOutput(
        (event: CellOutputEvent) => {
          // Update cell-specific state if needed
          setLastSandboxExecutionResult(event.result);
        }
      );

      unlistenersRef.current = [unlistenStatus, unlistenOutput, unlistenCellOutput];
    };

    setupListeners();

    return () => {
      unlistenersRef.current.forEach((unlisten) => unlisten());
      unlistenersRef.current = [];
    };
  }, [updateKernelStatus, setError, setLastSandboxExecutionResult]);

  // Load sessions on mount
  useEffect(() => {
    if (kernelService.isAvailable()) {
      refreshSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh sessions and kernels
  const refreshSessions = useCallback(async () => {
    if (!kernelService.isAvailable()) return;

    setLoadingSessions(true);
    try {
      const [sessionList, kernelList] = await Promise.all([
        kernelService.listSessions(),
        kernelService.listKernels(),
      ]);
      setSessions(sessionList);
      setKernels(kernelList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  }, [setSessions, setKernels, setError, setLoadingSessions]);

  // Create a new session
  const createSession = useCallback(
    async (options: CreateSessionOptions): Promise<JupyterSession | null> => {
      if (!kernelService.isAvailable()) {
        setError('Jupyter kernel requires Tauri environment');
        return null;
      }

      setCreatingSession(true);
      clearError();

      try {
        const session = await kernelService.createSession(options);
        addSession(session);
        setActiveSessionInStore(session.id);

        // Refresh kernel list
        const kernelList = await kernelService.listKernels();
        setKernels(kernelList);

        return session;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create session');
        return null;
      } finally {
        setCreatingSession(false);
      }
    },
    [addSession, setActiveSessionInStore, setKernels, setError, clearError, setCreatingSession]
  );

  // Delete a session
  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!kernelService.isAvailable()) return;

      try {
        await kernelService.deleteSession(sessionId);
        removeSession(sessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete session');
      }
    },
    [removeSession, setError]
  );

  // Set active session
  const setActiveSession = useCallback(
    (sessionId: string | null) => {
      setActiveSessionInStore(sessionId);
    },
    [setActiveSessionInStore]
  );

  // Restart kernel
  const restartKernel = useCallback(
    async (sessionId?: string): Promise<void> => {
      const targetSessionId = sessionId || activeSessionId;
      if (!targetSessionId || !kernelService.isAvailable()) return;

      try {
        await kernelService.restartKernel(targetSessionId);
        setVariables([]);
        await refreshSessions();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to restart kernel');
      }
    },
    [activeSessionId, setVariables, refreshSessions, setError]
  );

  // Interrupt kernel
  const interruptKernel = useCallback(
    async (sessionId?: string): Promise<void> => {
      const targetSessionId = sessionId || activeSessionId;
      if (!targetSessionId || !kernelService.isAvailable()) return;

      try {
        await kernelService.interruptKernel(targetSessionId);
        setExecuting(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to interrupt kernel');
      }
    },
    [activeSessionId, setExecuting, setError]
  );

  // Execute code
  const execute = useCallback(
    async (
      code: string,
      sessionId?: string
    ): Promise<KernelSandboxExecutionResult | null> => {
      const targetSessionId = sessionId || activeSessionId;
      if (!targetSessionId || !kernelService.isAvailable()) {
        setError('No active session');
        return null;
      }

      setExecuting(true);
      clearError();

      try {
        const result = await kernelService.execute(targetSessionId, code);
        setLastSandboxExecutionResult(result);

        // Add to history
        addExecutionHistory({
          id: `exec-${Date.now()}`,
          sessionId: targetSessionId,
          code,
          result,
          timestamp: new Date().toISOString(),
        });

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Execution failed');
        return null;
      } finally {
        setExecuting(false);
      }
    },
    [activeSessionId, setExecuting, clearError, setLastSandboxExecutionResult, addExecutionHistory, setError]
  );

  // Execute a specific cell
  const executeCell = useCallback(
    async (
      cellIndex: number,
      code: string,
      sessionId?: string
    ): Promise<KernelSandboxExecutionResult | null> => {
      const targetSessionId = sessionId || activeSessionId;
      if (!targetSessionId || !kernelService.isAvailable()) {
        setError('No active session');
        return null;
      }

      setExecuting(true, cellIndex);
      clearError();

      try {
        const result = await kernelService.executeCell(
          targetSessionId,
          cellIndex,
          code
        );
        setLastSandboxExecutionResult(result);

        // Add to history
        addExecutionHistory({
          id: `exec-${Date.now()}`,
          sessionId: targetSessionId,
          code,
          result,
          timestamp: new Date().toISOString(),
        });

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cell execution failed');
        return null;
      } finally {
        setExecuting(false);
      }
    },
    [activeSessionId, setExecuting, clearError, setLastSandboxExecutionResult, addExecutionHistory, setError]
  );

  // Quick execute without session
  const quickExecute = useCallback(
    async (
      envPath: string,
      code: string
    ): Promise<KernelSandboxExecutionResult | null> => {
      if (!kernelService.isAvailable()) {
        setError('Jupyter kernel requires Tauri environment');
        return null;
      }

      setExecuting(true);
      clearError();

      try {
        const result = await kernelService.quickExecute(envPath, code);
        setLastSandboxExecutionResult(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Execution failed');
        return null;
      } finally {
        setExecuting(false);
      }
    },
    [setExecuting, clearError, setLastSandboxExecutionResult, setError]
  );

  // Refresh variables
  const refreshVariables = useCallback(
    async (sessionId?: string): Promise<void> => {
      const targetSessionId = sessionId || activeSessionId;
      if (!targetSessionId || !kernelService.isAvailable()) return;

      setVariablesLoading(true);
      try {
        const vars = await kernelService.getVariables(targetSessionId);
        setVariables(vars);
      } catch (err) {
        console.error('Failed to get variables:', err);
      } finally {
        setVariablesLoading(false);
      }
    },
    [activeSessionId, setVariables, setVariablesLoading]
  );

  // Inspect a variable
  const inspectVariable = useCallback(
    async (
      variableName: string,
      sessionId?: string
    ): Promise<KernelSandboxExecutionResult | null> => {
      const targetSessionId = sessionId || activeSessionId;
      if (!targetSessionId || !kernelService.isAvailable()) return null;

      try {
        return await kernelService.inspectVariable(targetSessionId, variableName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to inspect variable');
        return null;
      }
    },
    [activeSessionId, setError]
  );

  // Check kernel available
  const checkKernelAvailable = useCallback(
    async (envPath: string): Promise<boolean> => {
      return kernelService.checkKernelAvailable(envPath);
    },
    []
  );

  // Ensure kernel installed
  const ensureKernel = useCallback(
    async (envPath: string): Promise<boolean> => {
      try {
        return await kernelService.ensureKernel(envPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to install kernel');
        return false;
      }
    },
    [setError]
  );

  // Shutdown all kernels
  const shutdownAll = useCallback(async (): Promise<void> => {
    try {
      await kernelService.shutdownAll();
      setSessions([]);
      setKernels([]);
      setActiveSessionInStore(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to shutdown kernels');
    }
  }, [setSessions, setKernels, setActiveSessionInStore, setError]);

  // Get session for chat
  const getSessionForChat = useCallback(
    (chatSessionId: string): JupyterSession | null => {
      const mapping = sessionEnvMappings.find(
        (m) => m.chatSessionId === chatSessionId
      );
      if (!mapping) return null;
      return sessions.find((s) => s.id === mapping.jupyterSessionId) || null;
    },
    [sessionEnvMappings, sessions]
  );

  // Map chat to session
  const mapChatToSession = useCallback(
    (chatSessionId: string, jupyterSessionId: string, envPath: string) => {
      mapChatToJupyter(chatSessionId, jupyterSessionId, envPath);
    },
    [mapChatToJupyter]
  );

  // Unmap chat session
  const unmapChatSession = useCallback(
    (chatSessionId: string) => {
      unmapChatSessionInStore(chatSessionId);
    },
    [unmapChatSessionInStore]
  );

  return {
    // State
    sessions,
    kernels,
    activeSession,
    activeKernel,
    isExecuting,
    executingCellIndex,
    lastResult: lastSandboxExecutionResult,
    variables,
    variablesLoading,
    error,
    isCreatingSession,
    isLoadingSessions,

    // Session management
    createSession,
    deleteSession,
    setActiveSession,
    refreshSessions,

    // Kernel management
    restartKernel,
    interruptKernel,

    // Execution
    execute,
    executeCell,
    quickExecute,

    // Variables
    refreshVariables,
    inspectVariable,

    // Utility
    checkKernelAvailable,
    ensureKernel,
    shutdownAll,
    clearError,

    // Chat integration
    getSessionForChat,
    mapChatToSession,
    unmapChatSession,
  };
}

export default useJupyterKernel;
