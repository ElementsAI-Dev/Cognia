'use client';

/**
 * useBackgroundAgent - Hook for managing background agents
 */

import { useCallback, useMemo, useEffect } from 'react';
import { useBackgroundAgentStore } from '@/stores/background-agent-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useSessionStore } from '@/stores/session-store';
import { useSkillStore } from '@/stores/skill-store';
import { useMcpStore } from '@/stores/mcp-store';
import { useVectorStore } from '@/stores/vector-store';
import {
  BackgroundAgentManager,
  createBackgroundAgentManager,
} from '@/lib/ai/agent/background-agent-manager';
import type {
  BackgroundAgent,
  BackgroundAgentExecutionOptions,
  CreateBackgroundAgentInput,
  UpdateBackgroundAgentInput,
} from '@/types/background-agent';

// Singleton manager instance
let managerInstance: BackgroundAgentManager | null = null;

function getManager(): BackgroundAgentManager {
  if (!managerInstance) {
    managerInstance = createBackgroundAgentManager(3);
  }
  return managerInstance;
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

      // Update status
      setAgentStatus(agentId, 'running');

      const options: BackgroundAgentExecutionOptions = {
        ...executionOptions,
        onStart: (a) => {
          setAgentStatus(a.id, 'running');
          addLog(a.id, 'info', 'Agent started', 'system');
          executionOptions?.onStart?.(a);
        },
        onProgress: (a, progress) => {
          setAgentProgress(a.id, progress);
          executionOptions?.onProgress?.(a, progress);
        },
        onStep: (a, step) => {
          addStep(a.id, {
            type: step.type,
            status: step.status,
            title: step.title,
            description: step.description,
          });
          executionOptions?.onStep?.(a, step);
        },
        onComplete: (a, result) => {
          setAgentResult(a.id, result);
          addLog(a.id, 'info', 'Agent completed', 'system');
          if (a.config.notifyOnComplete) {
            addNotification(a.id, {
              agentId: a.id,
              type: 'completed',
              title: 'Agent Completed',
              message: `${a.name} has completed successfully.`,
            });
          }
          executionOptions?.onComplete?.(a, result);
        },
        onError: (a, error) => {
          setAgentError(a.id, error);
          addLog(a.id, 'error', `Agent failed: ${error}`, 'system');
          if (a.config.notifyOnError) {
            addNotification(a.id, {
              agentId: a.id,
              type: 'failed',
              title: 'Agent Failed',
              message: `${a.name} failed: ${error}`,
            });
          }
          executionOptions?.onError?.(a, error);
        },
        onLog: (a, log) => {
          addLog(a.id, log.level, log.message, log.source, log.data);
          executionOptions?.onLog?.(a, log);
        },
        onNotification: (a, notification) => {
          addNotification(a.id, notification);
          executionOptions?.onNotification?.(a, notification);
        },
        onSubAgentCreate: (a, subAgent) => {
          addSubAgent(a.id, subAgent);
          executionOptions?.onSubAgentCreate?.(a, subAgent);
        },
        onSubAgentComplete: (a, subAgent, result) => {
          updateSubAgent(a.id, subAgent.id, { 
            status: 'completed', 
            result,
            completedAt: new Date(),
          });
          executionOptions?.onSubAgentComplete?.(a, subAgent, result);
        },
      };

      // Use the manager for actual execution
      const manager = getManager();
      const managedAgent = manager.createAgent({
        sessionId: agent.sessionId,
        name: agent.name,
        description: agent.description,
        task: agent.task,
        config: agent.config,
        priority: agent.priority,
        tags: agent.tags,
        metadata: agent.metadata,
      });

      await manager.startAgent(managedAgent.id, options);
    },
    [getAgent, setAgentStatus, setAgentProgress, setAgentResult, setAgentError, addStep, addLog, addNotification, addSubAgent, updateSubAgent]
  );

  // Queue agent
  const queueAgent = useCallback(
    (agentId: string): void => {
      storeQueueAgent(agentId);
    },
    [storeQueueAgent]
  );

  // Pause agent
  const pauseAgent = useCallback(
    (agentId: string): void => {
      setAgentStatus(agentId, 'paused');
      addLog(agentId, 'info', 'Agent paused', 'system');
    },
    [setAgentStatus, addLog]
  );

  // Resume agent
  const resumeAgent = useCallback(
    (agentId: string): void => {
      setAgentStatus(agentId, 'queued');
      storeQueueAgent(agentId);
      addLog(agentId, 'info', 'Agent resumed', 'system');
    },
    [setAgentStatus, storeQueueAgent, addLog]
  );

  // Cancel agent
  const cancelAgent = useCallback(
    (agentId: string): void => {
      setAgentStatus(agentId, 'cancelled');
      dequeueAgent(agentId);
      addLog(agentId, 'info', 'Agent cancelled', 'system');
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
