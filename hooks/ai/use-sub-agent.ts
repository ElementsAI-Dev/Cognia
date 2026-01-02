'use client';

/**
 * useSubAgent - Hook for managing sub-agents
 */

import { useCallback, useMemo } from 'react';
import { useSubAgentStore } from '@/stores/agent';
import { useSettingsStore } from '@/stores/settings';
import {
  executeSubAgent,
  executeSubAgentsParallel,
  executeSubAgentsSequential,
  type SubAgentExecutorConfig,
} from '@/lib/ai/agent/sub-agent-executor';
import type {
  SubAgent,
  SubAgentResult,
  SubAgentExecutionOptions,
  SubAgentOrchestrationResult,
  CreateSubAgentInput,
  SubAgentExecutionMode,
} from '@/types/sub-agent';
import type { ProviderName } from '@/types/provider';

export interface UseSubAgentOptions {
  parentAgentId: string;
  maxConcurrency?: number;
}

export interface UseSubAgentReturn {
  // State
  subAgents: SubAgent[];
  activeSubAgents: SubAgent[];
  completedSubAgents: SubAgent[];
  failedSubAgents: SubAgent[];
  isExecuting: boolean;
  progress: number;

  // Actions
  createSubAgent: (input: Omit<CreateSubAgentInput, 'parentAgentId'>) => SubAgent;
  updateSubAgent: (id: string, updates: Partial<SubAgent>) => void;
  deleteSubAgent: (id: string) => void;
  
  // Execution
  executeOne: (subAgentId: string, options?: SubAgentExecutionOptions) => Promise<SubAgentResult>;
  executeAll: (mode?: SubAgentExecutionMode, options?: SubAgentExecutionOptions) => Promise<SubAgentOrchestrationResult>;
  cancelAll: () => void;
  
  // Utilities
  reorder: (orderedIds: string[]) => void;
  clearCompleted: () => void;
}

export function useSubAgent(options: UseSubAgentOptions): UseSubAgentReturn {
  const { parentAgentId, maxConcurrency = 3 } = options;

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  const {
    subAgents: allSubAgents,
    createSubAgent: storeCreateSubAgent,
    updateSubAgent: storeUpdateSubAgent,
    deleteSubAgent: storeDeleteSubAgent,
    setSubAgentStatus,
    setSubAgentProgress,
    setSubAgentResult,
    setSubAgentError,
    addSubAgentLog,
    cancelAllSubAgents,
    clearCompletedSubAgents,
    reorderSubAgents,
    getSubAgentsByParent,
  } = useSubAgentStore();

  // Get sub-agents for this parent
  const subAgents = useMemo(() => {
    return getSubAgentsByParent(parentAgentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(allSubAgents).length, parentAgentId, getSubAgentsByParent]);

  const activeSubAgents = useMemo(() => {
    return subAgents.filter((sa) => sa.status === 'running' || sa.status === 'queued');
  }, [subAgents]);

  const completedSubAgents = useMemo(() => {
    return subAgents.filter((sa) => sa.status === 'completed');
  }, [subAgents]);

  const failedSubAgents = useMemo(() => {
    return subAgents.filter((sa) => sa.status === 'failed' || sa.status === 'timeout');
  }, [subAgents]);

  const isExecuting = activeSubAgents.length > 0;

  const progress = useMemo(() => {
    if (subAgents.length === 0) return 0;
    const totalProgress = subAgents.reduce((sum, sa) => sum + sa.progress, 0);
    return Math.round(totalProgress / subAgents.length);
  }, [subAgents]);

  // Build executor config
  const getExecutorConfig = useCallback((): SubAgentExecutorConfig => {
    const provider = (defaultProvider || 'openai') as ProviderName;
    const settings = providerSettings[provider];

    return {
      provider,
      model: settings?.defaultModel || 'gpt-4o-mini',
      apiKey: settings?.apiKey || '',
      baseURL: settings?.baseURL,
    };
  }, [defaultProvider, providerSettings]);

  // Create sub-agent
  const createSubAgent = useCallback(
    (input: Omit<CreateSubAgentInput, 'parentAgentId'>): SubAgent => {
      return storeCreateSubAgent({
        ...input,
        parentAgentId,
      });
    },
    [parentAgentId, storeCreateSubAgent]
  );

  // Update sub-agent
  const updateSubAgent = useCallback(
    (id: string, updates: Partial<SubAgent>): void => {
      storeUpdateSubAgent(id, updates);
    },
    [storeUpdateSubAgent]
  );

  // Delete sub-agent
  const deleteSubAgent = useCallback(
    (id: string): void => {
      storeDeleteSubAgent(id);
    },
    [storeDeleteSubAgent]
  );

  // Execute single sub-agent
  const executeOne = useCallback(
    async (subAgentId: string, executionOptions?: SubAgentExecutionOptions): Promise<SubAgentResult> => {
      const subAgent = allSubAgents[subAgentId];
      if (!subAgent) {
        throw new Error('Sub-agent not found');
      }

      const executorConfig = getExecutorConfig();

      const options: SubAgentExecutionOptions = {
        ...executionOptions,
        onStart: (sa) => {
          setSubAgentStatus(sa.id, 'running');
          executionOptions?.onStart?.(sa);
        },
        onProgress: (sa, prog) => {
          setSubAgentProgress(sa.id, prog);
          executionOptions?.onProgress?.(sa, prog);
        },
        onComplete: (sa, result) => {
          setSubAgentResult(sa.id, result);
          executionOptions?.onComplete?.(sa, result);
        },
        onError: (sa, error) => {
          setSubAgentError(sa.id, error);
          executionOptions?.onError?.(sa, error);
        },
        onLog: (sa, log) => {
          addSubAgentLog(sa.id, log.level, log.message, log.data);
          executionOptions?.onLog?.(sa, log);
        },
      };

      return executeSubAgent(subAgent, executorConfig, options);
    },
    [allSubAgents, getExecutorConfig, setSubAgentStatus, setSubAgentProgress, setSubAgentResult, setSubAgentError, addSubAgentLog]
  );

  // Execute all sub-agents
  const executeAll = useCallback(
    async (
      mode: SubAgentExecutionMode = 'parallel',
      executionOptions?: SubAgentExecutionOptions
    ): Promise<SubAgentOrchestrationResult> => {
      const executorConfig = getExecutorConfig();

      const options: SubAgentExecutionOptions = {
        ...executionOptions,
        onStart: (sa) => {
          setSubAgentStatus(sa.id, 'running');
          executionOptions?.onStart?.(sa);
        },
        onProgress: (sa, prog) => {
          setSubAgentProgress(sa.id, prog);
          executionOptions?.onProgress?.(sa, prog);
        },
        onComplete: (sa, result) => {
          setSubAgentResult(sa.id, result);
          executionOptions?.onComplete?.(sa, result);
        },
        onError: (sa, error) => {
          setSubAgentError(sa.id, error);
          executionOptions?.onError?.(sa, error);
        },
        onLog: (sa, log) => {
          addSubAgentLog(sa.id, log.level, log.message, log.data);
          executionOptions?.onLog?.(sa, log);
        },
      };

      if (mode === 'parallel') {
        return executeSubAgentsParallel(subAgents, executorConfig, options, maxConcurrency);
      } else {
        return executeSubAgentsSequential(subAgents, executorConfig, options, true);
      }
    },
    [subAgents, getExecutorConfig, maxConcurrency, setSubAgentStatus, setSubAgentProgress, setSubAgentResult, setSubAgentError, addSubAgentLog]
  );

  // Cancel all
  const cancelAll = useCallback(() => {
    cancelAllSubAgents(parentAgentId);
  }, [parentAgentId, cancelAllSubAgents]);

  // Reorder
  const reorder = useCallback(
    (orderedIds: string[]) => {
      reorderSubAgents(parentAgentId, orderedIds);
    },
    [parentAgentId, reorderSubAgents]
  );

  // Clear completed
  const clearCompleted = useCallback(() => {
    clearCompletedSubAgents(parentAgentId);
  }, [parentAgentId, clearCompletedSubAgents]);

  return {
    subAgents,
    activeSubAgents,
    completedSubAgents,
    failedSubAgents,
    isExecuting,
    progress,
    createSubAgent,
    updateSubAgent,
    deleteSubAgent,
    executeOne,
    executeAll,
    cancelAll,
    reorder,
    clearCompleted,
  };
}

export default useSubAgent;
