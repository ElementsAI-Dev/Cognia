/**
 * useWorkflowEditor Hook
 * Unified workflow editor API backed by workflow editor store + orchestrator single entry.
 */

import { useCallback, useEffect, useRef } from 'react';

import { useWorkflowEditorStore } from '@/stores/workflow';
import type { WorkflowExecution } from '@/types/workflow';
import type { VisualWorkflow, EditorExecutionStatus } from '@/types/workflow/workflow-editor';
import { mapEditorToWorkflowExecutionStatus } from '@/lib/workflow-editor/execution-status';

interface UseWorkflowEditorOptions {
  autoSave?: boolean;
  autoSaveInterval?: number;
  onExecutionComplete?: (execution: WorkflowExecution) => void;
  onExecutionError?: (error: string) => void;
}

interface UseWorkflowEditorReturn {
  currentWorkflow: VisualWorkflow | null;
  isExecuting: boolean;
  isDirty: boolean;
  editorLifecycleState: ReturnType<typeof useWorkflowEditorStore.getState>['editorLifecycleState'];
  executionState: ReturnType<typeof useWorkflowEditorStore.getState>['executionState'];
  validationErrors: import('@/types/workflow/workflow-editor').ValidationError[];
  createWorkflow: (name?: string) => void;
  loadWorkflow: (workflow: VisualWorkflow) => void;
  saveWorkflow: () => Promise<void>;
  executeWorkflow: (input?: Record<string, unknown>) => Promise<WorkflowExecution | null>;
  pauseExecution: () => void;
  resumeExecution: () => void;
  cancelExecution: () => void;
  validate: () => import('@/types/workflow/workflow-editor').ValidationError[];
  exportWorkflow: () => string | null;
  importWorkflow: (json: string) => boolean;
}

function toWorkflowExecution(
  workflow: VisualWorkflow,
  executionState: NonNullable<ReturnType<typeof useWorkflowEditorStore.getState>['executionState']>
): WorkflowExecution {
  return {
    id: executionState.executionId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowType: workflow.type,
    sessionId: executionState.executionId,
    status: mapEditorToWorkflowExecutionStatus(executionState.status),
    config: workflow.settings as unknown as Record<string, unknown>,
    input: executionState.input,
    output: executionState.output,
    progress: executionState.progress,
    startedAt: executionState.startedAt,
    completedAt: executionState.completedAt,
    duration: executionState.duration,
    error: executionState.error,
    runtime: executionState.runtime,
    triggerId: executionState.triggerId,
    isReplay: executionState.isReplay,
    steps: Object.values(executionState.nodeStates).map((nodeState) => ({
      stepId: nodeState.nodeId,
      status:
        nodeState.status === 'waiting'
          ? 'waiting_approval'
          : (nodeState.status as
              | 'pending'
              | 'running'
              | 'completed'
              | 'failed'
              | 'skipped'),
      startedAt: nodeState.startedAt,
      completedAt: nodeState.completedAt,
      duration: nodeState.duration,
      input: nodeState.input,
      output: nodeState.output,
      error: nodeState.error,
      retryCount: nodeState.retryCount,
      logs: nodeState.logs.map((log) => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        stepId: nodeState.nodeId,
        data: log.data,
      })),
    })),
    logs: executionState.logs.map((log) => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      data: log.data,
    })),
  };
}

export function useWorkflowEditor(options: UseWorkflowEditorOptions = {}): UseWorkflowEditorReturn {
  const {
    autoSave = true,
    autoSaveInterval = 30000,
    onExecutionComplete,
    onExecutionError,
  } = options;

  const {
    currentWorkflow,
    isDirty,
    editorLifecycleState,
    isExecuting,
    executionState,
    validationErrors,
    createWorkflow,
    loadWorkflow,
    saveWorkflow,
    validate,
    startExecution,
    pauseExecution,
    resumeExecution,
    cancelExecution,
  } = useWorkflowEditorStore();

  const lastNotifiedStatus = useRef<EditorExecutionStatus | null>(null);

  useEffect(() => {
    if (!executionState || !currentWorkflow) {
      return;
    }

    if (lastNotifiedStatus.current === executionState.status) {
      return;
    }

    lastNotifiedStatus.current = executionState.status;

    if (executionState.status === 'completed') {
      onExecutionComplete?.(toWorkflowExecution(currentWorkflow, executionState));
    }

    if (executionState.status === 'failed') {
      onExecutionError?.(executionState.error || 'Workflow execution failed');
    }
  }, [executionState, currentWorkflow, onExecutionComplete, onExecutionError]);

  useEffect(() => {
    if (!autoSave || !isDirty || !currentWorkflow) {
      return;
    }

    const timer = setTimeout(() => {
      void saveWorkflow();
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [autoSave, autoSaveInterval, isDirty, currentWorkflow, saveWorkflow]);

  const executeWorkflow = useCallback(
    async (input: Record<string, unknown> = {}): Promise<WorkflowExecution | null> => {
      if (!currentWorkflow) {
        return null;
      }

      const errors = validate();
      if (
        errors.some(
          (error) => error.blocking ?? (error.severity !== 'warning' && error.severity !== 'info')
        )
      ) {
        onExecutionError?.('Workflow has validation errors');
        return null;
      }

      await startExecution(input);

      const finalExecutionState = useWorkflowEditorStore.getState().executionState;
      if (!finalExecutionState) {
        return null;
      }

      return toWorkflowExecution(currentWorkflow, finalExecutionState);
    },
    [currentWorkflow, onExecutionError, startExecution, validate]
  );

  const exportWorkflow = useCallback((): string | null => {
    if (!currentWorkflow) {
      return null;
    }

    return JSON.stringify(currentWorkflow, null, 2);
  }, [currentWorkflow]);

  const importWorkflow = useCallback(
    (json: string): boolean => {
      try {
        const workflow = JSON.parse(json) as VisualWorkflow;
        loadWorkflow(workflow);
        return true;
      } catch {
        return false;
      }
    },
    [loadWorkflow]
  );

  return {
    currentWorkflow,
    isExecuting,
    isDirty,
    editorLifecycleState,
    executionState,
    validationErrors,
    createWorkflow,
    loadWorkflow,
    saveWorkflow,
    executeWorkflow,
    pauseExecution,
    resumeExecution,
    cancelExecution,
    validate,
    exportWorkflow,
    importWorkflow,
  };
}

export default useWorkflowEditor;
