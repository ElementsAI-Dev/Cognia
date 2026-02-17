'use client';

/**
 * useBackgroundAgent - Hook for managing background agents
 *
 * Enhanced with event-driven state synchronization between
 * BackgroundAgentManager and Zustand store.
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useBackgroundAgentStore } from '@/stores/agent';
import { useSettingsStore } from '@/stores/settings';
import { useSessionStore } from '@/stores/chat';
import { useSkillStore } from '@/stores/skills';
import { useMcpStore } from '@/stores/mcp';
import { useVectorStore } from '@/stores/data';
import {
  BackgroundAgentManager,
  getBackgroundAgentManager,
} from '@/lib/ai/agent/background-agent-manager';
import { getBackgroundAgentEventEmitter } from '@/lib/ai/agent/background-agent-events';
import type {
  BackgroundAgent,
  BackgroundAgentExecutionOptions,
  CreateBackgroundAgentInput,
  UpdateBackgroundAgentInput,
} from '@/types/agent/background-agent';

// Use the global manager instance
function getManager(): BackgroundAgentManager {
  return getBackgroundAgentManager();
}

export interface UseBackgroundAgentOptions {
  sessionId?: string;
}

export interface UseBackgroundAgentReturn {
  // State
  agents: BackgroundAgent[];
  runningAgents: BackgroundAgent[];
  queuedAgents: BackgroundAgent[];
  completedAgents: BackgroundAgent[];
  selectedAgent: BackgroundAgent | null;
  isPanelOpen: boolean;
  unreadNotificationCount: number;
  queueState: {
    items: number;
    maxConcurrent: number;
    currentlyRunning: number;
    isPaused: boolean;
  };

  // Agent CRUD
  createAgent: (input: Omit<CreateBackgroundAgentInput, 'sessionId'>) => BackgroundAgent;
  updateAgent: (id: string, updates: UpdateBackgroundAgentInput) => void;
  deleteAgent: (id: string) => void;

  // Execution
  startAgent: (agentId: string, options?: BackgroundAgentExecutionOptions) => Promise<void>;
  queueAgent: (agentId: string) => void;
  pauseAgent: (agentId: string) => void;
  resumeAgent: (agentId: string) => void;
  cancelAgent: (agentId: string) => void;
  cancelAll: () => void;

  // Queue management
  pauseQueue: () => void;
  resumeQueue: () => void;

  // Notifications
  markNotificationRead: (agentId: string, notificationId: string) => void;
  markAllNotificationsRead: () => void;

  // UI
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  selectAgent: (id: string | null) => void;

  // Cleanup
  clearCompleted: () => void;

  // Bridge delegation
  delegateToTeam: (agentId: string, options?: { teamName?: string; teamDescription?: string; templateId?: string }) => Promise<string | null>;
}

export function useBackgroundAgent(
  options: UseBackgroundAgentOptions = {}
): UseBackgroundAgentReturn {
  const activeSession = useSessionStore((state) => state.getActiveSession());
  const sessionId = options.sessionId || activeSession?.id || '';

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const _defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Get stores for Skills, MCP, and Vector DB integration
  const skills = useSkillStore((state) => state.skills);
  const activeSkillIds = useSkillStore((state) => state.activeSkillIds);
  const mcpServers = useMcpStore((state) => state.servers);
  const mcpCallTool = useMcpStore((state) => state.callTool);
  const vectorSettings = useVectorStore((state) => state.settings);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  const {
    agents: allAgents,
    queue,
    isPanelOpen,
    selectedAgentId,
    upsertAgentSnapshot,
    syncQueueState,
    updateAgent: storeUpdateAgent,
    deleteAgent: storeDeleteAgent,
    setAgentStatus,
    queueAgent: storeQueueAgent,
    dequeueAgent,
    addLog,
    markNotificationRead: storeMarkNotificationRead,
    getAgent,
    getAgentsBySession,
    getUnreadNotificationCount,
    cancelAllAgents,
    clearCompletedAgents,
    openPanel: storeOpenPanel,
    closePanel: storeClosePanel,
    togglePanel: storeTogglePanel,
    selectAgent: storeSelectAgent,
  } = useBackgroundAgentStore();

  // Set up providers for BackgroundAgentManager
  useEffect(() => {
    const manager = getManager();
    manager.setProviders({
      skills: () => ({ skills, activeSkillIds }),
      mcp: () => ({ servers: mcpServers, callTool: mcpCallTool }),
      vectorSettings: () => vectorSettings,
      apiKey: (provider: string) => {
        const settings = providerSettings[provider as keyof typeof providerSettings];
        return settings?.apiKey || '';
      },
    });
  }, [skills, activeSkillIds, mcpServers, mcpCallTool, vectorSettings, providerSettings]);

  // Subscribe to manager events for state synchronization
  useEffect(() => {
    isMountedRef.current = true;
    const manager = getManager();
    const eventEmitter = getBackgroundAgentEventEmitter();

    const syncQueueFromManager = () => {
      if (!isMountedRef.current) return;
      syncQueueState(manager.getQueueState());
    };

    const syncAgent = (agent: BackgroundAgent) => {
      if (!isMountedRef.current) return;
      upsertAgentSnapshot(agent);
    };

    // Initial sync: include manager-restored agents and queue state.
    manager.getAllAgents().forEach((agent) => syncAgent(agent));
    syncQueueFromManager();

    // Agent lifecycle
    const unsubCreated = eventEmitter.on('agent:created', ({ agent }) => syncAgent(agent));
    const unsubQueued = eventEmitter.on('agent:queued', ({ agent }) => {
      syncAgent(agent);
      syncQueueFromManager();
    });
    const unsubStarted = eventEmitter.on('agent:started', ({ agent }) => {
      syncAgent(agent);
      syncQueueFromManager();
    });
    const unsubProgress = eventEmitter.on('agent:progress', ({ agent }) => syncAgent(agent));
    const unsubCompleted = eventEmitter.on('agent:completed', ({ agent }) => {
      syncAgent(agent);
      syncQueueFromManager();
    });
    const unsubFailed = eventEmitter.on('agent:failed', ({ agent }) => {
      syncAgent(agent);
      syncQueueFromManager();
    });
    const unsubPaused = eventEmitter.on('agent:paused', ({ agent }) => {
      syncAgent(agent);
      syncQueueFromManager();
    });
    const unsubResumed = eventEmitter.on('agent:resumed', ({ agent }) => {
      syncAgent(agent);
      syncQueueFromManager();
    });
    const unsubCancelled = eventEmitter.on('agent:cancelled', ({ agent }) => {
      syncAgent(agent);
      syncQueueFromManager();
    });
    const unsubTimeout = eventEmitter.on('agent:timeout', ({ agent }) => {
      syncAgent(agent);
      syncQueueFromManager();
    });

    // Sub-agent/tool/log/notification updates (agent snapshot already includes them)
    const unsubSubAgentCreated = eventEmitter.on('subagent:created', ({ agent }) => syncAgent(agent));
    const unsubSubAgentStarted = eventEmitter.on('subagent:started', ({ agent }) => syncAgent(agent));
    const unsubSubAgentCompleted = eventEmitter.on('subagent:completed', ({ agent }) => syncAgent(agent));
    const unsubSubAgentFailed = eventEmitter.on('subagent:failed', ({ agent }) => syncAgent(agent));
    const unsubLog = eventEmitter.on('agent:log', ({ agent }) => syncAgent(agent));
    const unsubNotification = eventEmitter.on('agent:notification', ({ agent }) => syncAgent(agent));

    // Queue lifecycle
    const unsubQueueUpdated = eventEmitter.on('queue:updated', () => syncQueueFromManager());
    const unsubQueuePaused = eventEmitter.on('queue:paused', () => syncQueueFromManager());
    const unsubQueueResumed = eventEmitter.on('queue:resumed', () => syncQueueFromManager());

    return () => {
      isMountedRef.current = false;
      unsubCreated();
      unsubStarted();
      unsubProgress();
      unsubCompleted();
      unsubFailed();
      unsubPaused();
      unsubResumed();
      unsubCancelled();
      unsubTimeout();
      unsubSubAgentCreated();
      unsubSubAgentCompleted();
      unsubSubAgentStarted();
      unsubSubAgentFailed();
      unsubQueued();
      unsubLog();
      unsubNotification();
      unsubQueueUpdated();
      unsubQueuePaused();
      unsubQueueResumed();
    };
  }, [syncQueueState, upsertAgentSnapshot]);

  // Get agents for current session
  const agents = useMemo(() => {
    return sessionId ? getAgentsBySession(sessionId) : Object.values(allAgents);
  }, [allAgents, getAgentsBySession, sessionId]);

  const runningAgents = useMemo(() => {
    return agents.filter((a) => a.status === 'running');
  }, [agents]);

  const queuedAgents = useMemo(() => {
    return agents.filter((a) => a.status === 'queued');
  }, [agents]);

  const completedAgents = useMemo(() => {
    return agents.filter(
      (a) => a.status === 'completed' || a.status === 'failed' || a.status === 'cancelled'
    );
  }, [agents]);

  const selectedAgent = useMemo(() => {
    return selectedAgentId ? allAgents[selectedAgentId] || null : null;
  }, [allAgents, selectedAgentId]);

  const unreadNotificationCount = getUnreadNotificationCount();

  const queueState = useMemo(
    () => ({
      items: queue.items.length,
      maxConcurrent: queue.maxConcurrent,
      currentlyRunning: queue.currentlyRunning,
      isPaused: queue.isPaused,
    }),
    [queue]
  );

  const ensureManagedAgent = useCallback(
    (
      agentId: string,
      hydrateOptions: { normalizeRunningToQueued?: boolean } = {}
    ): BackgroundAgent | undefined => {
      const manager = getManager();
      const existing = manager.getAgent(agentId);
      if (existing) return existing;

      const storeAgent = getAgent(agentId);
      if (!storeAgent) return undefined;

      return manager.hydrateAgent(storeAgent, hydrateOptions);
    },
    [getAgent]
  );

  // Create agent
  const createAgent = useCallback(
    (input: Omit<CreateBackgroundAgentInput, 'sessionId'>): BackgroundAgent => {
      const manager = getManager();
      const managedAgent = manager.createAgent({
        ...input,
        sessionId,
      });

      upsertAgentSnapshot(managedAgent);
      syncQueueState(manager.getQueueState());

      return managedAgent;
    },
    [sessionId, syncQueueState, upsertAgentSnapshot]
  );

  // Update agent
  const updateAgent = useCallback(
    (id: string, updates: UpdateBackgroundAgentInput): void => {
      const manager = getManager();
      storeUpdateAgent(id, updates);
      manager.updateAgent(id, updates);
    },
    [storeUpdateAgent]
  );

  // Delete agent
  const deleteAgent = useCallback(
    (id: string): void => {
      const manager = getManager();
      manager.deleteAgent(id);
      storeDeleteAgent(id);
      syncQueueState(manager.getQueueState());
    },
    [storeDeleteAgent, syncQueueState]
  );

  // Start agent execution
  const startAgent = useCallback(
    async (agentId: string, executionOptions?: BackgroundAgentExecutionOptions): Promise<void> => {
      const manager = getManager();
      const agent =
        ensureManagedAgent(agentId, { normalizeRunningToQueued: true }) || getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      const started = await manager.startAgent(agent.id, executionOptions || {});
      syncQueueState(manager.getQueueState());

      if (!started) {
        throw new Error(`Failed to start background agent: ${agent.id}`);
      }
    },
    [ensureManagedAgent, getAgent, syncQueueState]
  );

  // Queue agent
  const queueAgent = useCallback(
    (agentId: string): void => {
      const manager = getManager();
      const managed = ensureManagedAgent(agentId, { normalizeRunningToQueued: true });

      if (managed) {
        manager.queueAgent(managed.id);
      } else {
        storeQueueAgent(agentId);
      }

      syncQueueState(manager.getQueueState());
    },
    [ensureManagedAgent, storeQueueAgent, syncQueueState]
  );

  // Pause agent - delegates to manager which handles checkpoint creation
  const pauseAgent = useCallback(
    (agentId: string): void => {
      const manager = getManager();
      const managed = ensureManagedAgent(agentId);
      if (managed) {
        manager.pauseAgent(managed.id);
      } else {
        // Agent might only exist in store, update directly
        setAgentStatus(agentId, 'paused');
        addLog(agentId, 'info', 'Agent paused', 'system');
      }
      syncQueueState(manager.getQueueState());
    },
    [addLog, ensureManagedAgent, setAgentStatus, syncQueueState]
  );

  // Resume agent - delegates to manager which handles checkpoint restoration
  const resumeAgent = useCallback(
    (agentId: string): void => {
      const manager = getManager();
      const managed = ensureManagedAgent(agentId);
      if (managed) {
        manager.resumeAgent(managed.id);
      } else {
        // Agent might only exist in store, update directly
        setAgentStatus(agentId, 'queued');
        storeQueueAgent(agentId);
        addLog(agentId, 'info', 'Agent resumed', 'system');
      }
      syncQueueState(manager.getQueueState());
    },
    [addLog, ensureManagedAgent, setAgentStatus, storeQueueAgent, syncQueueState]
  );

  // Cancel agent - delegates to manager for proper cleanup
  const cancelAgent = useCallback(
    (agentId: string): void => {
      const manager = getManager();
      const managed = ensureManagedAgent(agentId);
      if (managed) {
        manager.cancelAgent(managed.id);
      } else {
        // Agent might only exist in store, update directly
        setAgentStatus(agentId, 'cancelled');
        dequeueAgent(agentId);
        addLog(agentId, 'info', 'Agent cancelled', 'system');
      }
      syncQueueState(manager.getQueueState());
    },
    [addLog, dequeueAgent, ensureManagedAgent, setAgentStatus, syncQueueState]
  );

  // Cancel all
  const cancelAll = useCallback(() => {
    const manager = getManager();
    const cancelledCount = manager.cancelAllAgents();
    if (cancelledCount === 0) {
      cancelAllAgents();
    }
    syncQueueState(manager.getQueueState());
  }, [cancelAllAgents, syncQueueState]);

  // Pause queue
  const pauseQueue = useCallback(() => {
    const manager = getManager();
    manager.pauseQueue();
    syncQueueState(manager.getQueueState());
  }, [syncQueueState]);

  // Resume queue
  const resumeQueue = useCallback(() => {
    const manager = getManager();
    manager.resumeQueue();
    syncQueueState(manager.getQueueState());
  }, [syncQueueState]);

  // Mark notification read
  const markNotificationRead = useCallback(
    (agentId: string, notificationId: string): void => {
      const manager = getManager();
      const managed = ensureManagedAgent(agentId);
      if (managed) {
        manager.markNotificationRead(managed.id, notificationId);
      } else {
        storeMarkNotificationRead(agentId, notificationId);
      }
    },
    [ensureManagedAgent, storeMarkNotificationRead]
  );

  // Mark all notifications read
  const markAllNotificationsRead = useCallback(() => {
    const manager = getManager();
    Object.keys(allAgents).forEach((agentId) => {
      ensureManagedAgent(agentId);
    });
    manager.markAllNotificationsRead();
  }, [allAgents, ensureManagedAgent]);

  // UI actions
  const openPanel = useCallback(() => {
    storeOpenPanel();
  }, [storeOpenPanel]);

  const closePanel = useCallback(() => {
    storeClosePanel();
  }, [storeClosePanel]);

  const togglePanel = useCallback(() => {
    storeTogglePanel();
  }, [storeTogglePanel]);

  const selectAgent = useCallback(
    (id: string | null): void => {
      storeSelectAgent(id);
    },
    [storeSelectAgent]
  );

  // Clear completed
  const clearCompleted = useCallback(() => {
    const manager = getManager();
    manager.clearCompleted();
    clearCompletedAgents();
    syncQueueState(manager.getQueueState());
  }, [clearCompletedAgents, syncQueueState]);

  // Delegate to team via bridge
  const delegateToTeam = useCallback(
    async (agentId: string, delegateOptions?: { teamName?: string; teamDescription?: string; templateId?: string }) => {
      const bgManager = getManager();
      const managed = ensureManagedAgent(agentId);
      if (!managed) return null;
      return bgManager.delegateToTeam(managed.id, delegateOptions);
    },
    [ensureManagedAgent]
  );

  return {
    agents,
    runningAgents,
    queuedAgents,
    completedAgents,
    selectedAgent,
    isPanelOpen,
    unreadNotificationCount,
    queueState,
    createAgent,
    updateAgent,
    deleteAgent,
    startAgent,
    queueAgent,
    pauseAgent,
    resumeAgent,
    cancelAgent,
    cancelAll,
    pauseQueue,
    resumeQueue,
    markNotificationRead,
    markAllNotificationsRead,
    openPanel,
    closePanel,
    togglePanel,
    selectAgent,
    clearCompleted,
    delegateToTeam,
  };
}

export default useBackgroundAgent;
