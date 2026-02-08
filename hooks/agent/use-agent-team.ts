/**
 * useAgentTeam - React hook for AgentTeam management
 *
 * Provides a React-friendly interface to the AgentTeamManager and store.
 * Follows the same patterns as use-sub-agent.ts and use-external-agent.ts.
 */

import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { useSettingsStore } from '@/stores/settings';
import {
  getAgentTeamManager,
  createTeamFromTemplate,
} from '@/lib/ai/agent/agent-team';
import type { AgentTeamManager } from '@/lib/ai/agent/agent-team';
import type {
  AgentTeam,
  AgentTeammate,
  AgentTeamTask,
  AgentTeamMessage,
  AgentTeamTemplate,
  AgentTeamConfig,
  AgentTeamEvent,
  TeamExecutionOptions,
  CreateTeamInput,
  AddTeammateInput,
  CreateTaskInput,
  SendMessageInput,
  TeamDisplayMode,
  SharedMemoryEntry,
  SharedMemoryNamespace,
  ConsensusRequest,
  ConsensusVote,
  CreateConsensusInput,
  CastVoteInput,
} from '@/types/agent/agent-team';
import type { AgentTool } from '@/lib/ai/agent';
import type { ProviderName } from '@/types/provider/provider';
import { loggers } from '@/lib/logger';

const log = loggers.agent;

// ============================================================================
// Types
// ============================================================================

export interface UseAgentTeamOptions {
  /** Tools to provide to the team manager */
  tools?: Record<string, AgentTool>;
  /** Auto-sync store with manager events */
  autoSync?: boolean;
}

export interface UseAgentTeamReturn {
  // State
  teams: Record<string, AgentTeam>;
  activeTeam: AgentTeam | undefined;
  activeTeamId: string | null;
  selectedTeammateId: string | null;
  displayMode: TeamDisplayMode;
  isPanelOpen: boolean;
  templates: Record<string, AgentTeamTemplate>;

  // Team actions
  createTeam: (input: CreateTeamInput) => AgentTeam;
  createTeamFromTemplate: (
    template: AgentTeamTemplate,
    task: string,
    config?: Partial<AgentTeamConfig>
  ) => AgentTeam;
  executeTeam: (teamId: string) => Promise<AgentTeam>;
  cancelTeam: (teamId: string) => void;
  pauseTeam: (teamId: string) => void;
  resumeTeam: (teamId: string) => void;
  deleteTeam: (teamId: string) => void;
  cleanupTeam: (teamId: string) => void;

  // Teammate actions
  addTeammate: (input: AddTeammateInput) => AgentTeammate;
  removeTeammate: (teammateId: string) => void;
  shutdownTeammate: (teammateId: string) => void;

  // Task actions
  createTask: (input: CreateTaskInput) => AgentTeamTask;
  claimTask: (taskId: string, teammateId: string) => void;
  assignTask: (taskId: string, teammateId: string) => void;
  deleteTask: (taskId: string) => void;

  // Message actions
  sendMessage: (input: SendMessageInput) => AgentTeamMessage;

  // UI actions
  setActiveTeam: (teamId: string | null) => void;
  setSelectedTeammate: (teammateId: string | null) => void;
  setDisplayMode: (mode: TeamDisplayMode) => void;
  setIsPanelOpen: (open: boolean) => void;

  // Selectors
  getTeammates: (teamId: string) => AgentTeammate[];
  getTeamTasks: (teamId: string) => AgentTeamTask[];
  getTeamMessages: (teamId: string) => AgentTeamMessage[];
  getUnreadMessages: (teammateId: string) => AgentTeamMessage[];

  // Template actions
  addTemplate: (template: AgentTeamTemplate) => void;
  deleteTemplate: (templateId: string) => void;

  // Shared memory (blackboard pattern)
  writeSharedMemory: (teamId: string, key: string, value: unknown, writtenBy: string, options?: { namespace?: SharedMemoryNamespace; writerName?: string; tags?: string[] }) => SharedMemoryEntry | null;
  readSharedMemory: (teamId: string, key: string, readerId?: string, namespace?: SharedMemoryNamespace) => SharedMemoryEntry | undefined;
  readAllSharedMemory: (teamId: string, readerId?: string, namespace?: SharedMemoryNamespace) => SharedMemoryEntry[];

  // Consensus / Voting
  createConsensus: (input: CreateConsensusInput) => ConsensusRequest;
  castVote: (input: CastVoteInput) => ConsensusVote | null;
  getConsensus: (consensusId: string) => ConsensusRequest | undefined;
  getTeamConsensus: (teamId: string) => ConsensusRequest[];

  // Bridge delegation
  delegateTaskToBackground: (teamId: string, taskId: string, options?: { priority?: number; name?: string }) => Promise<string | null>;

  // Manager reference
  manager: AgentTeamManager;

  // Execution state
  isExecuting: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useAgentTeam(options: UseAgentTeamOptions = {}): UseAgentTeamReturn {
  const { tools, autoSync = true } = options;
  const [isExecuting, setIsExecuting] = useState(false);

  // Stable manager instance via useState lazy initializer (no ref needed)
  const [manager] = useState<AgentTeamManager>(() => getAgentTeamManager(tools));

  // Get settings for default provider/model
  const settings = useSettingsStore(
    useShallow((s) => {
      const providerId = s.defaultProvider || 'openai';
      const providerConfig = s.providerSettings?.[providerId];
      return {
        provider: providerId,
        model: providerConfig?.defaultModel || '',
        apiKey: s.getActiveApiKey?.(providerId) || providerConfig?.apiKeys?.[0] || '',
        baseURL: providerConfig?.baseURL,
      };
    })
  );

  // Get store state
  const store = useAgentTeamStore(
    useShallow((s) => ({
      teams: s.teams,
      activeTeamId: s.activeTeamId,
      selectedTeammateId: s.selectedTeammateId,
      displayMode: s.displayMode,
      isPanelOpen: s.isPanelOpen,
      templates: s.templates,
    }))
  );

  // Store actions
  const storeActions = useAgentTeamStore(
    useShallow((s) => ({
      storeCreateTeam: s.createTeam,
      storeAddTeammate: s.addTeammate,
      storeCreateTask: s.createTask,
      storeAddMessage: s.addMessage,
      storeSetTeamStatus: s.setTeamStatus,
      storeSetTeammateStatus: s.setTeammateStatus,
      storeSetTeammateProgress: s.setTeammateProgress,
      storeSetTaskStatus: s.setTaskStatus,
      storeClaimTask: s.claimTask,
      storeAssignTask: s.assignTask,
      storeDeleteTask: s.deleteTask,
      storeRemoveTeammate: s.removeTeammate,
      storeDeleteTeam: s.deleteTeam,
      storeCleanupTeam: s.cleanupTeam,
      storeUpdateTeam: s.updateTeam,
      storeAddEvent: s.addEvent,
      storeAddTemplate: s.addTemplate,
      storeDeleteTemplate: s.deleteTemplate,
      setActiveTeam: s.setActiveTeam,
      setSelectedTeammate: s.setSelectedTeammate,
      setDisplayMode: s.setDisplayMode,
      setIsPanelOpen: s.setIsPanelOpen,
      getTeammates: s.getTeammates,
      getTeamTasks: s.getTeamTasks,
      getTeamMessages: s.getTeamMessages,
      getUnreadMessages: s.getUnreadMessages,
    }))
  );

  // Active team
  const activeTeam = useMemo(() => {
    return store.activeTeamId ? store.teams[store.activeTeamId] : undefined;
  }, [store.activeTeamId, store.teams]);

  // Create team
  const createTeam = useCallback(
    (input: CreateTeamInput): AgentTeam => {
      const enrichedInput: CreateTeamInput = {
        ...input,
        config: {
          defaultProvider: settings.provider as ProviderName,
          defaultModel: settings.model,
          defaultApiKey: settings.apiKey,
          defaultBaseURL: settings.baseURL,
          ...input.config,
        },
      };

      manager.createTeam(enrichedInput);
      const storeTeam = storeActions.storeCreateTeam(enrichedInput);

      log.info('Team created via hook', { teamId: storeTeam.id });
      return storeTeam;
    },
    [manager, storeActions, settings]
  );

  // Create team from template
  const createFromTemplate = useCallback(
    (template: AgentTeamTemplate, task: string, config?: Partial<AgentTeamConfig>): AgentTeam => {
      const enrichedConfig: Partial<AgentTeamConfig> = {
        defaultProvider: settings.provider as ProviderName,
        defaultModel: settings.model,
        defaultApiKey: settings.apiKey,
        defaultBaseURL: settings.baseURL,
        ...config,
      };

      createTeamFromTemplate(template, task, enrichedConfig, tools);

      const storeTeam = storeActions.storeCreateTeam({
        name: template.name,
        description: template.description,
        task,
        config: enrichedConfig,
      });

      for (const tmDef of template.teammates) {
        storeActions.storeAddTeammate({
          teamId: storeTeam.id,
          name: tmDef.name,
          description: tmDef.description,
          config: {
            specialization: tmDef.specialization,
            ...tmDef.config,
          },
        });
      }

      return storeTeam;
    },
    [storeActions, settings, tools]
  );

  // Execute team
  const executeTeam = useCallback(
    async (teamId: string): Promise<AgentTeam> => {
      setIsExecuting(true);
      storeActions.storeSetTeamStatus(teamId, 'executing');

      const executionOptions: TeamExecutionOptions = {
        onEvent: (event: AgentTeamEvent) => {
          if (autoSync) {
            storeActions.storeAddEvent(event);
          }
        },
        onTeammateStart: (teammate: AgentTeammate) => {
          if (autoSync) {
            storeActions.storeSetTeammateStatus(teammate.id, 'executing');
          }
        },
        onTeammateComplete: (teammate: AgentTeammate) => {
          if (autoSync) {
            storeActions.storeSetTeammateStatus(teammate.id, 'completed');
            storeActions.storeSetTeammateProgress(teammate.id, 100);
          }
        },
        onTeammateError: (teammate: AgentTeammate, error: string) => {
          if (autoSync) {
            storeActions.storeSetTeammateStatus(teammate.id, 'failed');
          }
          log.error('Teammate error', { teammateId: teammate.id, error });
        },
        onTaskComplete: (task: AgentTeamTask) => {
          if (autoSync) {
            storeActions.storeSetTaskStatus(task.id, 'completed', task.result);
          }
        },
        onProgress: (progress: number) => {
          if (autoSync) {
            storeActions.storeUpdateTeam(teamId, { progress });
          }
        },
        onComplete: (team: AgentTeam) => {
          if (autoSync) {
            storeActions.storeSetTeamStatus(teamId, 'completed');
            storeActions.storeUpdateTeam(teamId, {
              finalResult: team.finalResult,
              totalTokenUsage: team.totalTokenUsage,
              progress: 100,
            });
          }
          setIsExecuting(false);
        },
        onError: (error: string) => {
          if (autoSync) {
            storeActions.storeSetTeamStatus(teamId, 'failed');
            storeActions.storeUpdateTeam(teamId, { error });
          }
          setIsExecuting(false);
          log.error('Team execution error', { teamId, error });
        },
      };

      try {
        const result = await manager.executeTeam(teamId, executionOptions);
        return result;
      } catch (error) {
        setIsExecuting(false);
        throw error;
      }
    },
    [manager, storeActions, autoSync]
  );

  // Cancel team
  const cancelTeam = useCallback(
    (teamId: string) => {
      manager.cancelTeam(teamId);
      storeActions.storeSetTeamStatus(teamId, 'cancelled');
      setIsExecuting(false);
    },
    [manager, storeActions]
  );

  // Pause team
  const pauseTeam = useCallback(
    (teamId: string) => {
      manager.pauseTeam(teamId);
      storeActions.storeSetTeamStatus(teamId, 'paused');
    },
    [manager, storeActions]
  );

  // Resume team
  const resumeTeam = useCallback(
    (teamId: string) => {
      manager.resumeTeam(teamId);
      storeActions.storeSetTeamStatus(teamId, 'executing');
    },
    [manager, storeActions]
  );

  // Add teammate
  const addTeammate = useCallback(
    (input: AddTeammateInput): AgentTeammate => {
      manager.addTeammate(input);
      return storeActions.storeAddTeammate(input);
    },
    [manager, storeActions]
  );

  // Remove teammate
  const removeTeammate = useCallback(
    (teammateId: string) => {
      manager.removeTeammate(teammateId);
      storeActions.storeRemoveTeammate(teammateId);
    },
    [manager, storeActions]
  );

  // Shutdown teammate
  const shutdownTeammate = useCallback(
    (teammateId: string) => {
      manager.shutdownTeammate(teammateId);
      storeActions.storeSetTeammateStatus(teammateId, 'shutdown');
    },
    [manager, storeActions]
  );

  // Create task
  const createTask = useCallback(
    (input: CreateTaskInput): AgentTeamTask => {
      manager.createTask(input);
      return storeActions.storeCreateTask(input);
    },
    [manager, storeActions]
  );

  // Claim task
  const claimTask = useCallback(
    (taskId: string, teammateId: string) => {
      manager.claimTask(taskId, teammateId);
      storeActions.storeClaimTask(taskId, teammateId);
    },
    [manager, storeActions]
  );

  // Assign task
  const assignTask = useCallback(
    (taskId: string, teammateId: string) => {
      manager.assignTask(taskId, teammateId);
      storeActions.storeAssignTask(taskId, teammateId);
    },
    [manager, storeActions]
  );

  // Delete task
  const deleteTask = useCallback(
    (taskId: string) => {
      storeActions.storeDeleteTask(taskId);
    },
    [storeActions]
  );

  // Send message
  const sendMessage = useCallback(
    (input: SendMessageInput): AgentTeamMessage => {
      manager.sendMessage(input);
      return storeActions.storeAddMessage(input);
    },
    [manager, storeActions]
  );

  // Delete team
  const deleteTeam = useCallback(
    (teamId: string) => {
      manager.cleanupTeam(teamId);
      storeActions.storeDeleteTeam(teamId);
    },
    [manager, storeActions]
  );

  // Cleanup team
  const cleanupTeam = useCallback(
    (teamId: string) => {
      manager.cleanupTeam(teamId);
      storeActions.storeCleanupTeam(teamId);
    },
    [manager, storeActions]
  );

  // Shared memory callbacks
  const writeSharedMemory = useCallback(
    (teamId: string, key: string, value: unknown, writtenBy: string, options?: { namespace?: SharedMemoryNamespace; writerName?: string; tags?: string[] }) => {
      return manager.writeSharedMemory(teamId, key, value, writtenBy, options);
    },
    [manager]
  );

  const readSharedMemory = useCallback(
    (teamId: string, key: string, readerId?: string, namespace?: SharedMemoryNamespace) => {
      return manager.readSharedMemory(teamId, key, readerId, namespace);
    },
    [manager]
  );

  const readAllSharedMemory = useCallback(
    (teamId: string, readerId?: string, namespace?: SharedMemoryNamespace) => {
      return manager.readAllSharedMemory(teamId, readerId, namespace);
    },
    [manager]
  );

  // Consensus callbacks
  const createConsensus = useCallback(
    (input: CreateConsensusInput) => {
      return manager.createConsensus(input);
    },
    [manager]
  );

  const castVote = useCallback(
    (input: CastVoteInput) => {
      return manager.castVote(input);
    },
    [manager]
  );

  const getConsensus = useCallback(
    (consensusId: string) => {
      return manager.getConsensus(consensusId);
    },
    [manager]
  );

  const getTeamConsensus = useCallback(
    (teamId: string) => {
      return manager.getTeamConsensus(teamId);
    },
    [manager]
  );

  // Bridge delegation callback
  const delegateTaskToBackground = useCallback(
    async (teamId: string, taskId: string, options?: { priority?: number; name?: string }) => {
      return manager.delegateTaskToBackground(teamId, taskId, options);
    },
    [manager]
  );

  return {
    // State
    teams: store.teams,
    activeTeam,
    activeTeamId: store.activeTeamId,
    selectedTeammateId: store.selectedTeammateId,
    displayMode: store.displayMode,
    isPanelOpen: store.isPanelOpen,
    templates: store.templates,

    // Team actions
    createTeam,
    createTeamFromTemplate: createFromTemplate,
    executeTeam,
    cancelTeam,
    pauseTeam,
    resumeTeam,
    deleteTeam,
    cleanupTeam,

    // Teammate actions
    addTeammate,
    removeTeammate,
    shutdownTeammate,

    // Task actions
    createTask,
    claimTask,
    assignTask,
    deleteTask,

    // Message actions
    sendMessage,

    // UI actions
    setActiveTeam: storeActions.setActiveTeam,
    setSelectedTeammate: storeActions.setSelectedTeammate,
    setDisplayMode: storeActions.setDisplayMode,
    setIsPanelOpen: storeActions.setIsPanelOpen,

    // Selectors
    getTeammates: storeActions.getTeammates,
    getTeamTasks: storeActions.getTeamTasks,
    getTeamMessages: storeActions.getTeamMessages,
    getUnreadMessages: storeActions.getUnreadMessages,

    // Template actions
    addTemplate: storeActions.storeAddTemplate,
    deleteTemplate: storeActions.storeDeleteTemplate,

    // Shared memory
    writeSharedMemory,
    readSharedMemory,
    readAllSharedMemory,

    // Consensus
    createConsensus,
    castVote,
    getConsensus,
    getTeamConsensus,

    // Bridge delegation
    delegateTaskToBackground,

    // Manager reference
    manager,

    // Execution state
    isExecuting,
  };
}
