/**
 * Execution Slice
 * Handles workflow execution state management
 */

import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import type {
  SliceCreator,
  ExecutionSliceActions,
  ExecutionSliceState,
  WorkflowExecutionState,
  ProviderName,
} from '../types';
import {
  executeVisualWorkflow,
  pauseVisualWorkflow,
  resumeVisualWorkflow,
  cancelVisualWorkflow,
} from '@/lib/workflow-editor';
import { useSettingsStore } from '@/stores/settings';
import { workflowRepository } from '@/lib/db/repositories';
import type { WorkflowExecutionHistoryRecord } from '@/types/workflow/workflow-editor';

export const executionSliceInitialState: ExecutionSliceState = {
  isExecuting: false,
  executionState: null,
};

export const createExecutionSlice: SliceCreator<ExecutionSliceActions> = (set, get) => {
  return {
    startExecution: async (input) => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return;

      const errors = get().validate();
      if (errors.some((e) => e.severity === 'error')) {
        const errorMessage = errors
          .filter((e) => e.severity === 'error')
          .map((e) => e.message)
          .join(', ');
        
        toast.error('Workflow validation failed', {
          description: errorMessage,
        });
        
        set({
          executionState: {
            executionId: `exec-${nanoid(8)}`,
            workflowId: currentWorkflow.id,
            status: 'failed',
            progress: 0,
            nodeStates: {},
            startedAt: new Date(),
            input,
            error: `Validation failed: ${errorMessage}`,
            logs: [
              {
                timestamp: new Date(),
                level: 'error',
                message: `Workflow validation failed: ${errorMessage}`,
              },
            ],
          },
        });
        return;
      }

      // Initialize execution state
      const executionState: WorkflowExecutionState = {
        executionId: `exec-${nanoid(8)}`,
        workflowId: currentWorkflow.id,
        status: 'running',
        progress: 0,
        nodeStates: {},
        startedAt: new Date(),
        input,
        logs: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Starting workflow execution...',
          },
        ],
      };

      // Initialize node states
      currentWorkflow.nodes.forEach((node) => {
        executionState.nodeStates[node.id] = {
          nodeId: node.id,
          status: 'pending',
          logs: [],
          retryCount: 0,
        };
      });

      set({
        isExecuting: true,
        executionState,
        showExecutionPanel: true,
      });

      // Get provider settings from store
      const settings = useSettingsStore.getState();
      const providerSettings = settings.providerSettings[settings.defaultProvider];
      if (!providerSettings) {
        const error = 'No provider configured for workflow execution';
        toast.error(error);
        
        get().updateNodeExecutionState(currentWorkflow.nodes[0].id, {
          status: 'failed',
          error,
        });
        get().addExecutionLog({
          timestamp: new Date(),
          level: 'error',
          message: error,
        });
        set({
          isExecuting: false,
          executionState: {
            ...get().executionState!,
            status: 'failed',
            error,
            completedAt: new Date(),
          },
        });
        return;
      }

      // Execute the workflow
      try {
        const result = await executeVisualWorkflow(
          currentWorkflow,
          input,
          {
            provider: settings.defaultProvider as ProviderName,
            model: providerSettings.defaultModel || 'gpt-4o',
            apiKey: providerSettings.apiKey || '',
            baseURL: providerSettings.baseURL,
            temperature: 0.7,
            maxRetries: currentWorkflow.settings.maxRetries || 3,
            stepTimeout: currentWorkflow.settings.maxExecutionTime || 300000,
          },
          {
            onProgress: (execution, progress) => {
              const currentState = get().executionState;
              if (currentState) {
                set({
                  executionState: {
                    ...currentState,
                    progress: Math.round(progress * 100),
                    currentNodeId: execution.steps.find((s) => s.status === 'running')?.stepId,
                  },
                });
              }
            },
            onStepStart: (execution, stepId) => {
              get().updateNodeExecutionState(stepId, {
                status: 'running',
                startedAt: new Date(),
              });
              get().addExecutionLog({
                timestamp: new Date(),
                level: 'info',
                message: `Executing step: ${stepId}`,
              });
            },
            onStepComplete: (execution, stepId, output) => {
              get().updateNodeExecutionState(stepId, {
                status: 'completed',
                completedAt: new Date(),
                output: output as Record<string, unknown>,
              });
              get().addExecutionLog({
                timestamp: new Date(),
                level: 'info',
                message: `Step completed: ${stepId}`,
              });
            },
            onStepError: (execution, stepId, error) => {
              get().updateNodeExecutionState(stepId, {
                status: 'failed',
                error,
                completedAt: new Date(),
              });
              get().addExecutionLog({
                timestamp: new Date(),
                level: 'error',
                message: `Step failed: ${stepId} - ${error}`,
              });
            },
            onComplete: (execution) => {
              const currentState = get().executionState;
              set({
                isExecuting: false,
                executionState: {
                  ...currentState!,
                  status: 'completed',
                  progress: 100,
                  output: execution.output as Record<string, unknown>,
                  completedAt: new Date(),
                  logs: [
                    ...currentState!.logs,
                    {
                      timestamp: new Date(),
                      level: 'info',
                      message: 'Workflow execution completed successfully',
                    },
                  ],
                },
              });
              toast.success('Workflow completed successfully');

              // Persist to IndexedDB
              get().persistExecution();
            },
            onError: (execution, error) => {
              const currentState = get().executionState;
              set({
                isExecuting: false,
                executionState: {
                  ...currentState!,
                  status: 'failed',
                  error,
                  completedAt: new Date(),
                  logs: [
                    ...currentState!.logs,
                    {
                      timestamp: new Date(),
                      level: 'error',
                      message: `Workflow execution failed: ${error}`,
                    },
                  ],
                },
              });
              toast.error('Workflow execution failed', {
                description: error,
              });

              // Persist to IndexedDB
              get().persistExecution();
            },
          }
        );

        // Update final state
        if (result.success) {
          const currentState = get().executionState;
          set({
            isExecuting: false,
            executionState: {
              ...currentState!,
              status: 'completed',
              progress: 100,
              output: result.output as Record<string, unknown>,
              completedAt: new Date(),
            },
          });
        } else {
          throw new Error(result.error || 'Workflow execution failed');
        }
      } catch (error) {
        const currentState = get().executionState;
        const errorMessage = error instanceof Error ? error.message : String(error);
        set({
          isExecuting: false,
          executionState: {
            ...currentState!,
            status: 'failed',
            error: errorMessage,
            completedAt: new Date(),
          },
        });
        toast.error('Workflow execution failed', {
          description: errorMessage,
        });
      }
    },

    pauseExecution: () => {
      const { executionState } = get();
      if (!executionState || executionState.status !== 'running') return;

      // Call the actual pause function
      pauseVisualWorkflow(executionState.executionId);

      set({
        executionState: {
          ...executionState,
          status: 'paused',
        },
      });
      toast.info('Workflow paused');
    },

    resumeExecution: () => {
      const { executionState } = get();
      if (!executionState || executionState.status !== 'paused') return;

      // Call the actual resume function
      resumeVisualWorkflow(executionState.executionId);

      set({
        executionState: {
          ...executionState,
          status: 'running',
        },
      });
      toast.info('Workflow resumed');
    },

    cancelExecution: () => {
      const { executionState } = get();
      if (!executionState) return;

      // Call the actual cancel function
      cancelVisualWorkflow(executionState.executionId);

      set({
        isExecuting: false,
        executionState: {
          ...executionState,
          status: 'cancelled',
          completedAt: new Date(),
        },
      });
      toast.info('Workflow cancelled');

      // Persist to IndexedDB
      get().persistExecution();
    },

    updateNodeExecutionState: (nodeId, state) => {
      const { executionState } = get();
      if (!executionState) return;

      const nodeState = executionState.nodeStates[nodeId] || {
        nodeId,
        status: 'pending',
        logs: [],
        retryCount: 0,
      };

      set({
        executionState: {
          ...executionState,
          nodeStates: {
            ...executionState.nodeStates,
            [nodeId]: { ...nodeState, ...state },
          },
          currentNodeId: state.status === 'running' ? nodeId : executionState.currentNodeId,
        },
      });
    },

    addExecutionLog: (log) => {
      const { executionState } = get();
      if (!executionState) return;

      set({
        executionState: {
          ...executionState,
          logs: [...executionState.logs, log],
        },
      });
    },

    persistExecution: async () => {
      const { executionState, currentWorkflow } = get();
      if (!executionState || !currentWorkflow) return;

      try {
        const record: WorkflowExecutionHistoryRecord = {
          id: executionState.executionId,
          workflowId: currentWorkflow.id,
          status: executionState.status as WorkflowExecutionHistoryRecord['status'],
          input: executionState.input,
          output: executionState.output,
          nodeStates: executionState.nodeStates,
          logs: executionState.logs,
          error: executionState.error,
          startedAt: executionState.startedAt ? new Date(executionState.startedAt) : new Date(),
          completedAt: executionState.completedAt ? new Date(executionState.completedAt) : undefined,
        };

        // Try update first (in case it was already created), then create
        const existing = await workflowRepository.getExecution(record.id);
        if (existing) {
          await workflowRepository.updateExecution(record.id, {
            status: record.status,
            output: record.output,
            nodeStates: record.nodeStates,
            logs: record.logs,
            error: record.error,
            completedAt: record.completedAt,
          });
        } else {
          await workflowRepository.createExecution(currentWorkflow.id, record.input || {});
          await workflowRepository.updateExecution(record.id, {
            status: record.status,
            output: record.output,
            nodeStates: record.nodeStates,
            logs: record.logs,
            error: record.error,
            completedAt: record.completedAt,
          });
        }
      } catch (error) {
        console.error('Failed to persist execution:', error);
      }
    },

    replayExecution: async (executionId) => {
      try {
        const record = await workflowRepository.getExecution(executionId);
        if (!record) {
          toast.error('Execution not found');
          return;
        }

        if (!record.input || Object.keys(record.input).length === 0) {
          toast.info('Re-running workflow with empty input');
        }

        // Ensure the correct workflow is loaded
        const { currentWorkflow } = get();
        if (!currentWorkflow || currentWorkflow.id !== record.workflowId) {
          toast.error('Load the matching workflow first');
          return;
        }

        // Start execution with the same input
        get().startExecution(record.input || {});
        toast.info('Replaying execution with saved input');
      } catch (error) {
        console.error('Failed to replay execution:', error);
        toast.error('Failed to replay execution');
      }
    },

    clearExecutionState: () => {
      const { executionState, currentWorkflow, recordExecution } = get();

      // Record execution statistics before clearing
      if (
        executionState &&
        currentWorkflow &&
        (executionState.status === 'completed' ||
          executionState.status === 'failed' ||
          executionState.status === 'cancelled')
      ) {
        const nodeStates = Object.values(executionState.nodeStates);
        const startTime = executionState.startedAt
          ? new Date(executionState.startedAt).getTime()
          : Date.now();
        const endTime = executionState.completedAt
          ? new Date(executionState.completedAt).getTime()
          : Date.now();

        recordExecution({
          workflowId: currentWorkflow.id,
          status: executionState.status as 'completed' | 'failed' | 'cancelled',
          startedAt: new Date(startTime),
          completedAt: new Date(endTime),
          duration: endTime - startTime,
          nodesExecuted: nodeStates.filter((s) => s.status === 'completed').length,
          nodesFailed: nodeStates.filter((s) => s.status === 'failed').length,
          nodesSkipped: nodeStates.filter((s) => s.status === 'skipped').length,
          errorMessage: executionState.error,
        });
      }

      set({
        isExecuting: false,
        executionState: null,
      });
    },
  };
};
