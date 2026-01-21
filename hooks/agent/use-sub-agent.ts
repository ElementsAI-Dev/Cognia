'use client';

/**
 * useSubAgent - Hook for managing sub-agents
 */

import { useCallback, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSubAgentStore } from '@/stores/agent';
import { useSettingsStore } from '@/stores/settings';
import { createCancellationToken } from '@/lib/ai/agent/sub-agent-executor';
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
  SubAgentTemplate,
  SubAgentMetrics,
  CancellationToken,
} from '@/types/agent/sub-agent';
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
  templates: SubAgentTemplate[];

  // Actions
  createSubAgent: (input: Omit<CreateSubAgentInput, 'parentAgentId'>) => SubAgent;
  createFromTemplate: (templateId: string, variables?: Record<string, string>) => SubAgent | null;
  updateSubAgent: (id: string, updates: Partial<SubAgent>) => void;
  deleteSubAgent: (id: string) => void;
  
  // Execution
  executeOne: (subAgentId: string, options?: SubAgentExecutionOptions) => Promise<SubAgentResult>;
  executeAll: (mode?: SubAgentExecutionMode, options?: SubAgentExecutionOptions) => Promise<SubAgentOrchestrationResult>;
  cancelOne: (subAgentId: string) => void;
  cancelAll: () => void;
  
  // Utilities
  reorder: (orderedIds: string[]) => void;
  clearCompleted: () => void;
  getMetrics: (subAgentId?: string) => SubAgentMetrics | Record<string, SubAgentMetrics>;
}

/**
 * Create wrapped execution options with store callbacks
 */
function createWrappedOptions(
  executionOptions: SubAgentExecutionOptions | undefined,
  storeCallbacks: {
    setSubAgentStatus: (id: string, status: SubAgent['status']) => void;
    setSubAgentProgress: (id: string, progress: number) => void;
    setSubAgentResult: (id: string, result: SubAgentResult) => void;
    setSubAgentError: (id: string, error: string) => void;
    addSubAgentLog: (id: string, level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
    updateMetrics: (subAgentId: string, result: SubAgentResult) => void;
  }
): SubAgentExecutionOptions {
  return {
    ...executionOptions,
    onStart: (sa) => {
      storeCallbacks.setSubAgentStatus(sa.id, 'running');
      executionOptions?.onStart?.(sa);
    },
    onProgress: (sa, prog) => {
      storeCallbacks.setSubAgentProgress(sa.id, prog);
      executionOptions?.onProgress?.(sa, prog);
    },
    onComplete: (sa, result) => {
      storeCallbacks.setSubAgentResult(sa.id, result);
      storeCallbacks.updateMetrics(sa.id, result);
      executionOptions?.onComplete?.(sa, result);
    },
    onError: (sa, error) => {
      storeCallbacks.setSubAgentError(sa.id, error);
      executionOptions?.onError?.(sa, error);
    },
    onLog: (sa, log) => {
      storeCallbacks.addSubAgentLog(sa.id, log.level, log.message, log.data);
      executionOptions?.onLog?.(sa, log);
    },
  };
}

export function useSubAgent(options: UseSubAgentOptions): UseSubAgentReturn {
  const { parentAgentId, maxConcurrency = 3 } = options;
  
  // Store cancellation tokens for active executions
  const cancellationTokensRef = useRef<Map<string, CancellationToken>>(new Map());

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  // Use shallow comparison for better performance
  const {
    subAgents: allSubAgents,
    templates: allTemplates,
    createSubAgent: storeCreateSubAgent,
    createFromTemplate: storeCreateFromTemplate,
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
    updateMetrics,
    getMetrics,
  } = useSubAgentStore(
    useShallow((state) => ({
      subAgents: state.subAgents,
      templates: state.templates,
      createSubAgent: state.createSubAgent,
      createFromTemplate: state.createFromTemplate,
      updateSubAgent: state.updateSubAgent,
      deleteSubAgent: state.deleteSubAgent,
      setSubAgentStatus: state.setSubAgentStatus,
      setSubAgentProgress: state.setSubAgentProgress,
      setSubAgentResult: state.setSubAgentResult,
      setSubAgentError: state.setSubAgentError,
      addSubAgentLog: state.addSubAgentLog,
      cancelAllSubAgents: state.cancelAllSubAgents,
      clearCompletedSubAgents: state.clearCompletedSubAgents,
      reorderSubAgents: state.reorderSubAgents,
      updateMetrics: state.updateMetrics,
      getMetrics: state.getMetrics,
    }))
  );

  // Get sub-agents for this parent with stable reference
  const subAgentIds = useMemo(
    () => Object.keys(allSubAgents).filter(id => allSubAgents[id].parentAgentId === parentAgentId),
    [allSubAgents, parentAgentId]
  );
  
  const subAgents = useMemo(() => {
    return subAgentIds
      .map(id => allSubAgents[id])
      .filter((sa): sa is SubAgent => sa !== undefined)
      .sort((a, b) => a.order - b.order);
  }, [subAgentIds, allSubAgents]);
  
  // Get templates as array
  const templates = useMemo(
    () => Object.values(allTemplates),
    [allTemplates]
  );

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

  // Store callbacks for wrapped options
  const storeCallbacks = useMemo(
    () => ({
      setSubAgentStatus,
      setSubAgentProgress,
      setSubAgentResult,
      setSubAgentError,
      addSubAgentLog,
      updateMetrics,
    }),
    [setSubAgentStatus, setSubAgentProgress, setSubAgentResult, setSubAgentError, addSubAgentLog, updateMetrics]
  );

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
  
  // Create from template
  const createFromTemplate = useCallback(
    (templateId: string, variables?: Record<string, string>): SubAgent | null => {
      return storeCreateFromTemplate(templateId, parentAgentId, variables);
    },
    [parentAgentId, storeCreateFromTemplate]
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

      // Create cancellation token for this execution
      const cancellationToken = createCancellationToken();
      cancellationTokensRef.current.set(subAgentId, cancellationToken);

      const executorConfig = {
        ...getExecutorConfig(),
        cancellationToken,
        collectMetrics: true,
      };

      const options = createWrappedOptions(executionOptions, storeCallbacks);

      try {
        const result = await executeSubAgent(subAgent, executorConfig, options);
        return result;
      } finally {
        // Clean up cancellation token
        cancellationTokensRef.current.delete(subAgentId);
      }
    },
    [allSubAgents, getExecutorConfig, storeCallbacks]
  );

  // Execute all sub-agents
  const executeAll = useCallback(
    async (
      mode: SubAgentExecutionMode = 'parallel',
      executionOptions?: SubAgentExecutionOptions
    ): Promise<SubAgentOrchestrationResult> => {
      // Create a shared cancellation token for all
      const cancellationToken = createCancellationToken();
      subAgents.forEach(sa => {
        cancellationTokensRef.current.set(sa.id, cancellationToken);
      });

      const executorConfig = {
        ...getExecutorConfig(),
        cancellationToken,
        collectMetrics: true,
      };

      const options = createWrappedOptions(executionOptions, storeCallbacks);

      try {
        if (mode === 'parallel') {
          return await executeSubAgentsParallel(subAgents, executorConfig, options, maxConcurrency);
        } else {
          return await executeSubAgentsSequential(subAgents, executorConfig, options, true);
        }
      } finally {
        // Clean up all cancellation tokens
        subAgents.forEach(sa => {
          cancellationTokensRef.current.delete(sa.id);
        });
      }
    },
    [subAgents, getExecutorConfig, maxConcurrency, storeCallbacks]
  );
  
  // Cancel single sub-agent
  const cancelOne = useCallback((subAgentId: string) => {
    const token = cancellationTokensRef.current.get(subAgentId);
    if (token) {
      token.cancel();
      cancellationTokensRef.current.delete(subAgentId);
    }
    setSubAgentStatus(subAgentId, 'cancelled');
  }, [setSubAgentStatus]);

  // Cancel all
  const cancelAll = useCallback(() => {
    // Cancel all active tokens
    cancellationTokensRef.current.forEach((token) => {
      token.cancel();
    });
    cancellationTokensRef.current.clear();
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
    templates,
    createSubAgent,
    createFromTemplate,
    updateSubAgent,
    deleteSubAgent,
    executeOne,
    executeAll,
    cancelOne,
    cancelAll,
    reorder,
    clearCompleted,
    getMetrics,
  };
}

export default useSubAgent;
