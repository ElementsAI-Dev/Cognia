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
import { useSkillStore } from '@/stores/agent';
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
} from '@/types/background-agent';

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
}

export function useBackgroundAgent(options: UseBackgroundAgentOptions = {}): UseBackgroundAgentReturn {
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
    createAgent: storeCreateAgent,
    updateAgent: storeUpdateAgent,
    deleteAgent: storeDeleteAgent,
    setAgentStatus,
    setAgentProgress,
    setAgentResult,
    setAgentError,
    queueAgent: storeQueueAgent,
    dequeueAgent,
    pauseQueue: storePauseQueue,
    resumeQueue: storeResumeQueue,
    addStep,
    addLog,
    addNotification,
    markNotificationRead: storeMarkNotificationRead,
    markAllNotificationsRead: storeMarkAllNotificationsRead,
    addSubAgent,
    updateSubAgent,
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
    const eventEmitter = getBackgroundAgentEventEmitter();

    // Sync agent status changes to store
    const unsubStarted = eventEmitter.on('agent:started', ({ agent }) => {
      if (isMountedRef.current) {
        setAgentStatus(agent.id, 'running');
      }
    });

    const unsubProgress = eventEmitter.on('agent:progress', ({ agent, progress }) => {
      if (isMountedRef.current) {
        setAgentProgress(agent.id, progress);
      }
    });

    const unsubCompleted = eventEmitter.on('agent:completed', ({ agent, result }) => {
      if (isMountedRef.current) {
        setAgentResult(agent.id, result);
      }
    });

    const unsubFailed = eventEmitter.on('agent:failed', ({ agent, error }) => {
      if (isMountedRef.current) {
        setAgentError(agent.id, error);
      }
    });

    const unsubPaused = eventEmitter.on('agent:paused', ({ agent }) => {
      if (isMountedRef.current) {
        setAgentStatus(agent.id, 'paused');
      }
    });

    const unsubResumed = eventEmitter.on('agent:resumed', ({ agent }) => {
      if (isMountedRef.current) {
        setAgentStatus(agent.id, 'queued');
      }
    });

    const unsubCancelled = eventEmitter.on('agent:cancelled', ({ agent }) => {
      if (isMountedRef.current) {
        setAgentStatus(agent.id, 'cancelled');
      }
    });

    const unsubTimeout = eventEmitter.on('agent:timeout', ({ agent }) => {
      if (isMountedRef.current) {
        setAgentStatus(agent.id, 'timeout');
      }
    });

    const unsubSubAgentCreated = eventEmitter.on('subagent:created', ({ agent, subAgent }) => {
      if (isMountedRef.current) {
        addSubAgent(agent.id, subAgent);
      }
    });

    const unsubSubAgentCompleted = eventEmitter.on('subagent:completed', ({ agent, subAgent, result }) => {
      if (isMountedRef.current) {
        updateSubAgent(agent.id, subAgent.id, {
          status: 'completed',
          result,
          completedAt: new Date(),
        });
      }
    });

    const unsubSubAgentStarted = eventEmitter.on('subagent:started', ({ agent, subAgent }) => {
      if (isMountedRef.current) {
        updateSubAgent(agent.id, subAgent.id, {
          status: 'running',
          startedAt: new Date(),
        });
      }
    });

    const unsubSubAgentFailed = eventEmitter.on('subagent:failed', ({ agent, subAgent, error }) => {
      if (isMountedRef.current) {
        updateSubAgent(agent.id, subAgent.id, {
          status: 'failed',
          error,
          completedAt: new Date(),
        });
      }
    });

    const unsubQueued = eventEmitter.on('agent:queued', ({ agent }) => {
      if (isMountedRef.current) {
        setAgentStatus(agent.id, 'queued');
      }
    });

    const unsubLog = eventEmitter.on('agent:log', ({ agent, log }) => {
      if (isMountedRef.current) {
        addLog(agent.id, log.level, log.message, log.source, log.data);
      }
    });

    const unsubNotification = eventEmitter.on('agent:notification', ({ agent, notification }) => {
      if (isMountedRef.current) {
        addNotification(agent.id, notification);
      }
    });

    return () => {
      isMountedRef.current = false;
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
    };
  }, [setAgentStatus, setAgentProgress, setAgentResult, setAgentError, addSubAgent, updateSubAgent, addLog, addNotification]);

  // Get agents for current session
  const agents = useMemo(() => {
    return sessionId ? getAgentsBySession(sessionId) : Object.values(allAgents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, Object.keys(allAgents).length, getAgentsBySession]);

  const runningAgents = useMemo(() => {
    return agents.filter((a) => a.status === 'running');
  }, [agents]);

  const queuedAgents = useMemo(() => {
    return agents.filter((a) => a.status === 'queued');
  }, [agents]);

  const completedAgents = useMemo(() => {
    return agents.filter((a) => 
      a.status === 'completed' || a.status === 'failed' || a.status === 'cancelled'
    );
  }, [agents]);

  const selectedAgent = useMemo(() => {
    return selectedAgentId ? getAgent(selectedAgentId) || null : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId, getAgent, Object.keys(allAgents).length]);

  const unreadNotificationCount = getUnreadNotificationCount();

  const queueState = useMemo(() => ({
    items: queue.items.length,
    maxConcurrent: queue.maxConcurrent,
    currentlyRunning: queue.currentlyRunning,
    isPaused: queue.isPaused,
  }), [queue]);

  // Create agent
  const createAgent = useCallback(
    (input: Omit<CreateBackgroundAgentInput, 'sessionId'>): BackgroundAgent => {
      return storeCreateAgent({
        ...input,
        sessionId,
      });
    },
    [sessionId, storeCreateAgent]
  );

  // Update agent
  const updateAgent = useCallback(
    (id: string, updates: UpdateBackgroundAgentInput): void => {
      storeUpdateAgent(id, updates);
    },
    [storeUpdateAgent]
  );

  // Delete agent
  const deleteAgent = useCallback(
    (id: string): void => {
      storeDeleteAgent(id);
    },
    [storeDeleteAgent]
  );

  // Start agent execution
  const startAgent = useCallback(
    async (agentId: string, executionOptions?: BackgroundAgentExecutionOptions): Promise<void> => {
      const agent = getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Update status in store
      setAgentStatus(agentId, 'running');

      // Merge callbacks - store sync happens via events, user callbacks go here
      const options: BackgroundAgentExecutionOptions = {
        ...executionOptions,
        onStep: (a, step) => {
          addStep(a.id, {
            type: step.type,
            status: step.status,
            title: step.title,
            description: step.description,
          });
          executionOptions?.onStep?.(a, step);
        },
        onLog: (a, log) => {
          addLog(a.id, log.level, log.message, log.source, log.data);
          executionOptions?.onLog?.(a, log);
        },
        onNotification: (a, notification) => {
          addNotification(a.id, notification);
          executionOptions?.onNotification?.(a, notification);
        },
      };

      // Use the manager for actual execution
      const manager = getManager();
      
      // Check if agent already exists in manager, otherwise create it
      let managedAgent = manager.getAgent(agentId);
      if (!managedAgent) {
        managedAgent = manager.createAgent({
          sessionId: agent.sessionId,
          name: agent.name,
          description: agent.description,
          task: agent.task,
          config: agent.config,
          priority: agent.priority,
          tags: agent.tags,
          metadata: agent.metadata,
        });
      }

      await manager.startAgent(managedAgent.id, options);
    },
    [getAgent, setAgentStatus, addStep, addLog, addNotification]
  );

  // Queue agent
  const queueAgent = useCallback(
    (agentId: string): void => {
      storeQueueAgent(agentId);
    },
    [storeQueueAgent]
  );

  // Pause agent - delegates to manager which handles checkpoint creation
  const pauseAgent = useCallback(
    (agentId: string): void => {
      const manager = getManager();
      const success = manager.pauseAgent(agentId);
      if (!success) {
        // Agent might only exist in store, update directly
        setAgentStatus(agentId, 'paused');
        addLog(agentId, 'info', 'Agent paused', 'system');
      }
    },
    [setAgentStatus, addLog]
  );

  // Resume agent - delegates to manager which handles checkpoint restoration
  const resumeAgent = useCallback(
    (agentId: string): void => {
      const manager = getManager();
      const success = manager.resumeAgent(agentId);
      if (!success) {
        // Agent might only exist in store, update directly
        setAgentStatus(agentId, 'queued');
        storeQueueAgent(agentId);
        addLog(agentId, 'info', 'Agent resumed', 'system');
      }
    },
    [setAgentStatus, storeQueueAgent, addLog]
  );

  // Cancel agent - delegates to manager for proper cleanup
  const cancelAgent = useCallback(
    (agentId: string): void => {
      const manager = getManager();
      const success = manager.cancelAgent(agentId);
      if (!success) {
        // Agent might only exist in store, update directly
        setAgentStatus(agentId, 'cancelled');
        dequeueAgent(agentId);
        addLog(agentId, 'info', 'Agent cancelled', 'system');
      }
    },
    [setAgentStatus, dequeueAgent, addLog]
  );

  // Cancel all
  const cancelAll = useCallback(() => {
    cancelAllAgents();
  }, [cancelAllAgents]);

  // Pause queue
  const pauseQueue = useCallback(() => {
    storePauseQueue();
  }, [storePauseQueue]);

  // Resume queue
  const resumeQueue = useCallback(() => {
    storeResumeQueue();
  }, [storeResumeQueue]);

  // Mark notification read
  const markNotificationRead = useCallback(
    (agentId: string, notificationId: string): void => {
      storeMarkNotificationRead(agentId, notificationId);
    },
    [storeMarkNotificationRead]
  );

  // Mark all notifications read
  const markAllNotificationsRead = useCallback(() => {
    storeMarkAllNotificationsRead();
  }, [storeMarkAllNotificationsRead]);

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
    clearCompletedAgents();
  }, [clearCompletedAgents]);

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
  };
}

export default useBackgroundAgent;
