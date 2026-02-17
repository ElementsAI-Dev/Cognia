/**
 * Execution Slice
 * Handles workflow execution state management via WorkflowOrchestrator (single execution entry).
 */

import { toast } from 'sonner';
import { nanoid } from 'nanoid';

import type {
  SliceCreator,
  ExecutionSliceActions,
  ExecutionSliceState,
  WorkflowExecutionState,
  VisualWorkflow,
} from '../types';
import type { WorkflowRuntimeExecutionResult } from '@/lib/workflow-editor/runtime-adapter';

import { workflowRepository } from '@/lib/db/repositories';
import { workflowOrchestrator } from '@/lib/workflow-editor/orchestrator';
import { loggers } from '@/lib/logger';

function createNodeStateMap(
  workflow: VisualWorkflow
): WorkflowExecutionState['nodeStates'] {
  return workflow.nodes.reduce<WorkflowExecutionState['nodeStates']>((acc, node) => {
    acc[node.id] = {
      nodeId: node.id,
      status: 'pending',
      logs: [],
      retryCount: 0,
    };
    return acc;
  }, {});
}

function toRuntimeResult(state: WorkflowExecutionState): WorkflowRuntimeExecutionResult {
  return {
    executionId: state.executionId,
    workflowId: state.workflowId,
    runtime: state.runtime,
    status: state.status,
    input: state.input,
    output: state.output,
    nodeStates: state.nodeStates,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    error: state.error,
    triggerId: state.triggerId,
    isReplay: state.isReplay,
  };
}

export const executionSliceInitialState: ExecutionSliceState = {
  isExecuting: false,
  executionState: null,
};

export const createExecutionSlice: SliceCreator<ExecutionSliceActions> = (set, get) => {
  const runExecution = async (
    input: Record<string, unknown>,
    options?: { isReplay?: boolean; triggerId?: string }
  ): Promise<void> => {
    const { currentWorkflow } = get();
    if (!currentWorkflow) {
      return;
    }

    const errors = get().validate();
    if (errors.some((error) => error.severity === 'error')) {
      const errorMessage = errors
        .filter((error) => error.severity === 'error')
        .map((error) => error.message)
        .join(', ');

      toast.error('Workflow validation failed', {
        description: errorMessage,
      });

      const failedState: WorkflowExecutionState = {
        executionId: `exec-${nanoid(8)}`,
        workflowId: currentWorkflow.id,
        runtime: workflowOrchestrator.runtime,
        status: 'failed',
        progress: 0,
        nodeStates: createNodeStateMap(currentWorkflow),
        startedAt: new Date(),
        completedAt: new Date(),
        input,
        error: `Validation failed: ${errorMessage}`,
        triggerId: options?.triggerId,
        isReplay: options?.isReplay,
        logs: [
          {
            timestamp: new Date(),
            level: 'error',
            message: `Workflow validation failed: ${errorMessage}`,
          },
        ],
      };

      set({
        isExecuting: false,
        executionState: failedState,
        showExecutionPanel: true,
      });

      return;
    }

    const initialExecutionState: WorkflowExecutionState = {
      executionId: `exec-${nanoid(8)}`,
      workflowId: currentWorkflow.id,
      runtime: workflowOrchestrator.runtime,
      status: 'running',
      progress: 0,
      nodeStates: createNodeStateMap(currentWorkflow),
      startedAt: new Date(),
      input,
      triggerId: options?.triggerId,
      isReplay: options?.isReplay,
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Starting workflow execution...',
        },
      ],
    };

    set({
      isExecuting: true,
      executionState: initialExecutionState,
      showExecutionPanel: true,
    });

    try {
      const appendExecutionLog = (entry: WorkflowExecutionState['logs'][number]): void => {
        const current = get().executionState;
        if (!current) {
          return;
        }
        if (
          entry.eventId &&
          current.logs.some((existing) => existing.eventId && existing.eventId === entry.eventId)
        ) {
          return;
        }
        const last = current.logs[current.logs.length - 1];
        if (
          !entry.eventId &&
          last &&
          last.level === entry.level &&
          last.message === entry.message
        ) {
          return;
        }
        get().addExecutionLog(entry);
      };

      const result = await workflowOrchestrator.run({
        workflow: currentWorkflow,
        input,
        triggerId: options?.triggerId,
        isReplay: options?.isReplay,
        onEvent: (event) => {
          const currentState = get().executionState;
          if (!currentState) {
            return;
          }

          switch (event.type) {
            case 'execution_started':
              set({
                executionState: {
                  ...currentState,
                  executionId: event.executionId,
                  runtime: event.runtime,
                  status: 'running',
                  startedAt: currentState.startedAt || event.timestamp,
                },
              });
              break;
            case 'execution_progress':
              set({
                executionState: {
                  ...currentState,
                  progress: event.progress ?? currentState.progress,
                },
              });
              break;
            case 'step_started':
              if (event.stepId) {
                get().updateNodeExecutionState(event.stepId, {
                  status: 'running',
                  startedAt: event.timestamp,
                });
                appendExecutionLog({
                  timestamp: event.timestamp,
                  level: 'info',
                  message: `Executing step: ${event.stepId}`,
                  eventId: event.eventId,
                  traceId: event.traceId,
                  requestId: event.requestId,
                  executionId: event.executionId,
                  workflowId: event.workflowId,
                  stepId: event.stepId,
                  runtime: event.runtime,
                  code: event.code,
                });
              }
              break;
            case 'step_completed':
              if (event.stepId) {
                get().updateNodeExecutionState(event.stepId, {
                  status: 'completed',
                  completedAt: event.timestamp,
                  output: event.data,
                });
                appendExecutionLog({
                  timestamp: event.timestamp,
                  level: 'info',
                  message: `Step completed: ${event.stepId}`,
                  eventId: event.eventId,
                  traceId: event.traceId,
                  requestId: event.requestId,
                  executionId: event.executionId,
                  workflowId: event.workflowId,
                  stepId: event.stepId,
                  runtime: event.runtime,
                  code: event.code,
                });
              }
              break;
            case 'step_failed':
              if (event.stepId) {
                get().updateNodeExecutionState(event.stepId, {
                  status: 'failed',
                  completedAt: event.timestamp,
                  error: event.error,
                });
                appendExecutionLog({
                  timestamp: event.timestamp,
                  level: 'error',
                  message: `Step failed: ${event.stepId} - ${event.error || 'unknown error'}`,
                  eventId: event.eventId,
                  traceId: event.traceId,
                  requestId: event.requestId,
                  executionId: event.executionId,
                  workflowId: event.workflowId,
                  stepId: event.stepId,
                  runtime: event.runtime,
                  code: event.code,
                });
              }
              break;
            case 'execution_log':
              appendExecutionLog({
                timestamp: event.timestamp,
                level: event.level === 'error' || event.level === 'warn' || event.level === 'debug'
                  ? event.level
                  : event.error
                    ? 'error'
                    : 'info',
                message: event.message || 'Runtime log',
                data: event.data,
                eventId: event.eventId,
                traceId: event.traceId,
                requestId: event.requestId,
                executionId: event.executionId,
                workflowId: event.workflowId,
                stepId: event.stepId,
                runtime: event.runtime,
                code: event.code,
              });
              break;
            case 'execution_completed':
              set({
                executionState: {
                  ...currentState,
                  status: 'completed',
                  progress: 100,
                  completedAt: event.timestamp,
                },
              });
              appendExecutionLog({
                timestamp: event.timestamp,
                level: 'info',
                message: 'Workflow execution completed successfully',
              });
              break;
            case 'execution_failed':
              set({
                executionState: {
                  ...currentState,
                  status: 'failed',
                  completedAt: event.timestamp,
                  error: event.error || currentState.error,
                },
              });
              appendExecutionLog({
                timestamp: event.timestamp,
                level: 'error',
                message: event.error
                  ? `Workflow execution failed: ${event.error}`
                  : 'Workflow execution failed',
              });
              break;
            case 'execution_cancelled':
              set({
                executionState: {
                  ...currentState,
                  status: 'cancelled',
                  completedAt: event.timestamp,
                },
              });
              break;
            default:
              break;
          }
        },
      });

      const currentState = get().executionState;
      const completionLog: WorkflowExecutionState['logs'][number] = {
        timestamp: new Date(),
        level: result.status === 'completed' ? 'info' : 'error',
        message:
          result.status === 'completed'
            ? 'Workflow execution completed successfully'
            : `Workflow execution ended with status: ${result.status}`,
      };
      const existingLogs = currentState?.logs || [];
      const lastLog = existingLogs[existingLogs.length - 1];
      const mergedLogs: WorkflowExecutionState['logs'] =
        lastLog && lastLog.level === completionLog.level && lastLog.message === completionLog.message
          ? existingLogs
          : [...existingLogs, completionLog];

      const finalState: WorkflowExecutionState = {
        executionId: result.executionId,
        workflowId: result.workflowId,
        runtime: result.runtime,
        status: result.status,
        progress:
          result.status === 'completed'
            ? 100
            : currentState?.progress || (result.status === 'failed' ? 100 : 0),
        currentNodeId: currentState?.currentNodeId,
        nodeStates: result.nodeStates,
        startedAt: result.startedAt || currentState?.startedAt,
        completedAt: result.completedAt || new Date(),
        duration:
          result.startedAt && result.completedAt
            ? result.completedAt.getTime() - result.startedAt.getTime()
            : undefined,
        input,
        output: result.output,
        error: result.error,
        triggerId: result.triggerId,
        isReplay: result.isReplay,
        logs: mergedLogs,
      };

      set({
        isExecuting: false,
        executionState: finalState,
      });

      await workflowOrchestrator.persistExecution({
        result: toRuntimeResult(finalState),
        logs: finalState.logs,
      });

      if (finalState.status === 'completed') {
        toast.success('Workflow completed successfully');
      } else if (finalState.status === 'failed') {
        toast.error('Workflow execution failed', {
          description: finalState.error,
        });
      }
    } catch (error) {
      const currentState = get().executionState;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const failedState: WorkflowExecutionState = {
        ...(currentState || initialExecutionState),
        status: 'failed',
        isReplay: options?.isReplay,
        triggerId: options?.triggerId,
        runtime: currentState?.runtime || workflowOrchestrator.runtime,
        error: errorMessage,
        completedAt: new Date(),
        logs: [
          ...(currentState?.logs || initialExecutionState.logs),
          {
            timestamp: new Date(),
            level: 'error',
            message: `Workflow execution failed: ${errorMessage}`,
          },
        ],
      };

      set({
        isExecuting: false,
        executionState: failedState,
      });

      try {
        await workflowOrchestrator.persistExecution({
          result: toRuntimeResult(failedState),
          logs: failedState.logs,
        });
      } catch (persistError) {
        loggers.store.error('Failed to persist failed execution', persistError as Error);
      }

      toast.error('Workflow execution failed', {
        description: errorMessage,
      });
    }
  };

  return {
    startExecution: async (input) => {
      await runExecution(input);
    },

    pauseExecution: () => {
      const { executionState } = get();
      if (!executionState || executionState.status !== 'running') {
        return;
      }

      void workflowOrchestrator.pause(executionState.executionId);

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
      if (!executionState || executionState.status !== 'paused') {
        return;
      }

      void workflowOrchestrator.resume(executionState.executionId);

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
      if (!executionState) {
        return;
      }

      void workflowOrchestrator.cancel(executionState.executionId);

      const nextState: WorkflowExecutionState = {
        ...executionState,
        status: 'cancelled',
        completedAt: new Date(),
        logs: [
          ...executionState.logs,
          {
            timestamp: new Date(),
            level: 'warn',
            message: 'Workflow cancelled by user',
          },
        ],
      };

      set({
        isExecuting: false,
        executionState: nextState,
      });

      void workflowOrchestrator.persistExecution({
        result: toRuntimeResult(nextState),
        logs: nextState.logs,
      });

      toast.info('Workflow cancelled');
    },

    updateNodeExecutionState: (nodeId, state) => {
      const { executionState } = get();
      if (!executionState) {
        return;
      }

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
      if (!executionState) {
        return;
      }

      set({
        executionState: {
          ...executionState,
          logs: [...executionState.logs, log],
        },
      });
    },

    persistExecution: async () => {
      const { executionState } = get();
      if (!executionState) {
        return;
      }

      try {
        await workflowOrchestrator.persistExecution({
          result: toRuntimeResult(executionState),
          logs: executionState.logs,
        });
      } catch (error) {
        loggers.store.error('Failed to persist execution', error as Error);
      }
    },

    replayExecution: async (executionId) => {
      try {
        const record = await workflowRepository.getExecution(executionId);
        if (!record) {
          toast.error('Execution not found');
          return;
        }

        const { currentWorkflow } = get();
        if (!currentWorkflow || currentWorkflow.id !== record.workflowId) {
          toast.error('Load the matching workflow first');
          return;
        }

        await runExecution(record.input || {}, { isReplay: true });
        toast.info('Replaying execution with saved input');
      } catch (error) {
        loggers.store.error('Failed to replay execution', error as Error);
        toast.error('Failed to replay execution');
      }
    },

    clearExecutionState: () => {
      const { executionState, currentWorkflow, recordExecution } = get();

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
          nodesExecuted: nodeStates.filter((state) => state.status === 'completed').length,
          nodesFailed: nodeStates.filter((state) => state.status === 'failed').length,
          nodesSkipped: nodeStates.filter((state) => state.status === 'skipped').length,
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
