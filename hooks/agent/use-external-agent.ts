/**
 * useExternalAgent Hook
 *
 * React hook for managing external agent connections and interactions.
 * Provides a simple interface for connecting to, managing, and executing on external agents.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ExternalAgentConfig,
  ExternalAgentSession,
  ExternalAgentEvent,
  ExternalAgentResult,
  ExternalAgentExecutionOptions,
  ExternalAgentInstance,
  ExternalAgentConnectionStatus,
  AcpCapabilities,
  AcpToolInfo,
  AcpPermissionRequest,
  AcpPermissionResponse,
} from '@/types/agent/external-agent';
import type { AgentTool } from '@/lib/ai/agent';

// ============================================================================
// Types
// ============================================================================

/**
 * External agent hook state
 */
export interface UseExternalAgentState {
  /** All registered external agents */
  agents: ExternalAgentInstance[];
  /** Currently active agent ID */
  activeAgentId: string | null;
  /** Currently active session */
  activeSession: ExternalAgentSession | null;
  /** Whether any operation is in progress */
  isLoading: boolean;
  /** Whether currently executing a prompt */
  isExecuting: boolean;
  /** Last error message */
  error: string | null;
  /** Current execution progress (0-100) */
  progress: number;
  /** Pending permission request */
  pendingPermission: AcpPermissionRequest | null;
  /** Streaming response text */
  streamingResponse: string;
  /** Last execution result */
  lastResult: ExternalAgentResult | null;
}

/**
 * External agent hook actions
 */
export interface UseExternalAgentActions {
  /** Add a new external agent configuration */
  addAgent: (config: ExternalAgentConfig) => Promise<ExternalAgentInstance>;
  /** Remove an external agent */
  removeAgent: (agentId: string) => Promise<void>;
  /** Connect to an external agent */
  connect: (agentId: string) => Promise<void>;
  /** Disconnect from an external agent */
  disconnect: (agentId: string) => Promise<void>;
  /** Reconnect to an external agent */
  reconnect: (agentId: string) => Promise<void>;
  /** Set the active agent */
  setActiveAgent: (agentId: string | null) => void;
  /** Create a new session with the active agent */
  createSession: (options?: { systemPrompt?: string }) => Promise<ExternalAgentSession>;
  /** Close a session */
  closeSession: (sessionId: string) => Promise<void>;
  /** Execute a prompt on the active agent */
  execute: (prompt: string, options?: ExternalAgentExecutionOptions) => Promise<ExternalAgentResult>;
  /** Execute a prompt with streaming */
  executeStreaming: (
    prompt: string,
    options?: ExternalAgentExecutionOptions
  ) => AsyncIterable<ExternalAgentEvent>;
  /** Cancel the current execution */
  cancel: () => Promise<void>;
  /** Respond to a permission request */
  respondToPermission: (response: AcpPermissionResponse) => Promise<void>;
  /** Get agent tools as Cognia AgentTools */
  getAgentTools: (agentId?: string) => Record<string, AgentTool>;
  /** Check agent health */
  checkHealth: (agentId: string) => Promise<boolean>;
  /** Refresh the agent list */
  refresh: () => void;
  /** Clear error */
  clearError: () => void;
}

/**
 * Combined hook return type
 */
export type UseExternalAgentReturn = UseExternalAgentState & UseExternalAgentActions;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useExternalAgent hook
 *
 * @example
 * ```tsx
 * const {
 *   agents,
 *   activeAgentId,
 *   isExecuting,
 *   execute,
 *   addAgent,
 *   connect,
 * } = useExternalAgent();
 *
 * // Add and connect to an agent
 * const agent = await addAgent({
 *   id: 'claude-code',
 *   name: 'Claude Code',
 *   protocol: 'acp',
 *   transport: 'stdio',
 *   process: { command: 'npx', args: ['@anthropics/claude-code'] },
 * });
 * await connect(agent.config.id);
 *
 * // Execute a prompt
 * const result = await execute('Fix the bug in App.tsx');
 * console.log(result.finalResponse);
 * ```
 */
export function useExternalAgent(): UseExternalAgentReturn {
  // State
  const [agents, setAgents] = useState<ExternalAgentInstance[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ExternalAgentSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [pendingPermission, setPendingPermission] = useState<AcpPermissionRequest | null>(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [lastResult, setLastResult] = useState<ExternalAgentResult | null>(null);

  // Type for the external agent manager
  type ExternalAgentManagerType = Awaited<ReturnType<typeof import('@/lib/ai/agent/external/manager').getExternalAgentManager>>;

  // Refs for managing execution
  const abortControllerRef = useRef<AbortController | null>(null);
  const managerRef = useRef<ExternalAgentManagerType | null>(null);
  const permissionResolveRef = useRef<((response: AcpPermissionResponse) => void) | null>(null);

  // Get the external agent manager
  const getManager = useCallback(async (): Promise<ExternalAgentManagerType> => {
    if (!managerRef.current) {
      const { getExternalAgentManager } = await import('@/lib/ai/agent/external/manager');
      managerRef.current = getExternalAgentManager();
    }
    return managerRef.current;
  }, []);

  // Refresh agent list from manager
  const refresh = useCallback(async () => {
    try {
      const manager = await getManager();
      setAgents(manager.getAllAgents());
    } catch (err) {
      console.error('[useExternalAgent] Failed to refresh agents:', err);
    }
  }, [getManager]);

  // Initialize on mount and cleanup on unmount
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (isMounted) {
        await refresh();
      }
    };

    init();

    return () => {
      isMounted = false;
      // Abort any pending execution
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Clear pending permission by rejecting with cancelled response
      if (permissionResolveRef.current) {
        permissionResolveRef.current({ requestId: '', granted: false, reason: 'Component unmounted' });
        permissionResolveRef.current = null;
      }
    };
  }, [refresh]);

  // Add a new agent
  const addAgent = useCallback(
    async (config: ExternalAgentConfig): Promise<ExternalAgentInstance> => {
      setIsLoading(true);
      setError(null);

      try {
        const manager = await getManager();
        const instance = await manager.addAgent(config);
        await refresh();
        return instance;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getManager, refresh]
  );

  // Remove an agent
  const removeAgent = useCallback(
    async (agentId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const manager = await getManager();
        await manager.removeAgent(agentId);

        if (activeAgentId === agentId) {
          setActiveAgentId(null);
          setActiveSession(null);
        }

        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getManager, refresh, activeAgentId]
  );

  // Connect to an agent
  const connect = useCallback(
    async (agentId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const manager = await getManager();
        await manager.connect(agentId);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getManager, refresh]
  );

  // Disconnect from an agent
  const disconnect = useCallback(
    async (agentId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const manager = await getManager();
        await manager.disconnect(agentId);

        if (activeAgentId === agentId) {
          setActiveSession(null);
        }

        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getManager, refresh, activeAgentId]
  );

  // Reconnect to an agent
  const reconnect = useCallback(
    async (agentId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const manager = await getManager();
        await manager.reconnect(agentId);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getManager, refresh]
  );

  // Set active agent
  const setActiveAgent = useCallback((agentId: string | null) => {
    setActiveAgentId(agentId);
    setActiveSession(null);
    setError(null);
  }, []);

  // Create a new session
  const createSession = useCallback(
    async (options?: { systemPrompt?: string }): Promise<ExternalAgentSession> => {
      if (!activeAgentId) {
        throw new Error('No active agent selected');
      }

      setIsLoading(true);
      setError(null);

      try {
        const manager = await getManager();
        const session = await manager.createSession(activeAgentId, {
          systemPrompt: options?.systemPrompt,
        });
        setActiveSession(session);
        return session;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getManager, activeAgentId]
  );

  // Close a session
  const closeSession = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!activeAgentId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const manager = await getManager();
        await manager.closeSession(activeAgentId, sessionId);

        if (activeSession?.id === sessionId) {
          setActiveSession(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getManager, activeAgentId, activeSession]
  );

  // Execute a prompt
  const execute = useCallback(
    async (
      prompt: string,
      options?: ExternalAgentExecutionOptions
    ): Promise<ExternalAgentResult> => {
      if (!activeAgentId) {
        throw new Error('No active agent selected');
      }

      setIsExecuting(true);
      setError(null);
      setProgress(0);
      setStreamingResponse('');
      abortControllerRef.current = new AbortController();

      try {
        const manager = await getManager();

        // Create permission request handler
        const onPermissionRequest = async (
          request: AcpPermissionRequest
        ): Promise<AcpPermissionResponse> => {
          setPendingPermission(request);

          return new Promise((resolve) => {
            permissionResolveRef.current = resolve;
          });
        };

        const result = await manager.execute(activeAgentId, prompt, {
          ...options,
          onProgress: (p: number, message?: string) => {
            setProgress(p);
            options?.onProgress?.(p, message);
          },
          onPermissionRequest,
          signal: abortControllerRef.current.signal,
        });

        setLastResult(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsExecuting(false);
        setProgress(100);
        setPendingPermission(null);
        abortControllerRef.current = null;
      }
    },
    [getManager, activeAgentId]
  );

  // Execute with streaming
  const executeStreaming = useCallback(
    async function* (
      prompt: string,
      options?: ExternalAgentExecutionOptions
    ): AsyncIterable<ExternalAgentEvent> {
      if (!activeAgentId) {
        throw new Error('No active agent selected');
      }

      setIsExecuting(true);
      setError(null);
      setProgress(0);
      setStreamingResponse('');
      abortControllerRef.current = new AbortController();

      try {
        const manager = await getManager();

        for await (const event of manager.executeStreaming(activeAgentId, prompt, {
          ...options,
          signal: abortControllerRef.current.signal,
        })) {
          // Update streaming response for text events
          if (event.type === 'message_delta' && event.delta.type === 'text') {
            setStreamingResponse((prev) => prev + event.delta.text);
          }

          // Update progress
          if (event.type === 'progress') {
            setProgress(event.progress);
          }

          // Handle permission request
          if (event.type === 'permission_request') {
            setPendingPermission(event.request);
          }

          yield event;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsExecuting(false);
        setProgress(100);
        setPendingPermission(null);
        abortControllerRef.current = null;
      }
    },
    [getManager, activeAgentId]
  );

  // Cancel execution
  const cancel = useCallback(async (): Promise<void> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (activeAgentId && activeSession) {
      try {
        const manager = await getManager();
        await manager.cancel(activeAgentId, activeSession.id);
      } catch (err) {
        console.error('[useExternalAgent] Failed to cancel:', err);
      }
    }

    setIsExecuting(false);
  }, [getManager, activeAgentId, activeSession]);

  // Respond to permission request
  const respondToPermission = useCallback(
    async (response: AcpPermissionResponse): Promise<void> => {
      if (permissionResolveRef.current) {
        permissionResolveRef.current(response);
        permissionResolveRef.current = null;
      }
      setPendingPermission(null);
    },
    []
  );

  // Get agent tools
  const getAgentTools = useCallback(
    (agentId?: string): Record<string, AgentTool> => {
      const targetAgentId = agentId || activeAgentId;
      if (!targetAgentId || !managerRef.current) {
        return {};
      }

      return managerRef.current.getAgentTools(targetAgentId);
    },
    [activeAgentId]
  );

  // Check agent health
  const checkHealth = useCallback(
    async (agentId: string): Promise<boolean> => {
      try {
        const manager = await getManager();
        return await manager.checkAgentHealth(agentId);
      } catch {
        return false;
      }
    },
    [getManager]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    agents,
    activeAgentId,
    activeSession,
    isLoading,
    isExecuting,
    error,
    progress,
    pendingPermission,
    streamingResponse,
    lastResult,
    // Actions
    addAgent,
    removeAgent,
    connect,
    disconnect,
    reconnect,
    setActiveAgent,
    createSession,
    closeSession,
    execute,
    executeStreaming,
    cancel,
    respondToPermission,
    getAgentTools,
    checkHealth,
    refresh,
    clearError,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get a specific external agent by ID
 */
export function useExternalAgentById(agentId: string | null): {
  agent: ExternalAgentInstance | null;
  isConnected: boolean;
  capabilities: AcpCapabilities | null;
  tools: AcpToolInfo[];
} {
  const { agents } = useExternalAgent();

  const agent = agentId ? agents.find((a) => a.config.id === agentId) || null : null;

  return {
    agent,
    isConnected: agent?.connectionStatus === 'connected',
    capabilities: agent?.capabilities || null,
    tools: agent?.tools || [],
  };
}

/**
 * Hook to get all connected external agents
 */
export function useConnectedExternalAgents(): ExternalAgentInstance[] {
  const { agents } = useExternalAgent();
  return agents.filter((a) => a.connectionStatus === 'connected');
}

/**
 * Hook to get external agent connection status
 */
export function useExternalAgentConnectionStatus(
  agentId: string | null
): ExternalAgentConnectionStatus {
  const { agent } = useExternalAgentById(agentId);
  return agent?.connectionStatus || 'disconnected';
}

export default useExternalAgent;
