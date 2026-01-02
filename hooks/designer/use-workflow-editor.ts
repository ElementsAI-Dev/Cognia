/**
 * useWorkflowEditor Hook
 * Provides workflow editor functionality with execution integration
 */

import { useCallback, useEffect } from 'react';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useWorkflow } from './use-workflow';
import { visualToDefinition } from '@/lib/workflow-editor/converter';
import type { VisualWorkflow, ValidationError } from '@/types/workflow-editor';
import type { WorkflowExecution } from '@/types/workflow';

interface UseWorkflowEditorOptions {
  autoSave?: boolean;
  autoSaveInterval?: number;
  onExecutionComplete?: (execution: WorkflowExecution) => void;
  onExecutionError?: (error: string) => void;
}

interface UseWorkflowEditorReturn {
  // State
  currentWorkflow: VisualWorkflow | null;
  isExecuting: boolean;
  isDirty: boolean;
  validationErrors: ValidationError[];
  
  // Actions
  createWorkflow: (name?: string) => void;
  loadWorkflow: (workflow: VisualWorkflow) => void;
  saveWorkflow: () => void;
  executeWorkflow: (input?: Record<string, unknown>) => Promise<WorkflowExecution | null>;
  pauseExecution: () => void;
  resumeExecution: () => void;
  cancelExecution: () => void;
  validate: () => boolean;
  
  // Utilities
  exportWorkflow: () => string | null;
  importWorkflow: (json: string) => boolean;
}

export function useWorkflowEditor(
  options: UseWorkflowEditorOptions = {}
): UseWorkflowEditorReturn {
  const {
    autoSave = true,
    autoSaveInterval = 30000,
    onExecutionComplete,
    onExecutionError,
  } = options;

  const {
    currentWorkflow,
    isDirty,
    isExecuting,
    validationErrors,
    createWorkflow,
    loadWorkflow,
    saveWorkflow,
    validate,
    startExecution,
    pauseExecution: pauseEditorExecution,
    resumeExecution: resumeEditorExecution,
    cancelExecution: cancelEditorExecution,
    updateNodeExecutionState,
    addExecutionLog,
    clearExecutionState,
  } = useWorkflowEditorStore();

  const {
    run: runWorkflow,
    pause: pauseWorkflowExecution,
    resume: resumeWorkflowExecution,
    cancel: cancelWorkflowExecution,
    isRunning,
  } = useWorkflow({
    onStepStart: (execution, stepId) => {
      updateNodeExecutionState(stepId, {
        status: 'running',
        startedAt: new Date(),
      });
    },
    onStepComplete: (execution, stepId, output) => {
      updateNodeExecutionState(stepId, {
        status: 'completed',
        completedAt: new Date(),
        output: output as Record<string, unknown>,
      });
    },
    onStepError: (execution, stepId, error) => {
      updateNodeExecutionState(stepId, {
        status: 'failed',
        error,
      });
    },
    onProgress: (execution, progress) => {
      addExecutionLog({
        timestamp: new Date(),
        level: 'info',
        message: `Progress: ${Math.round(progress * 100)}%`,
      });
    },
    onComplete: (execution) => {
      clearExecutionState();
      onExecutionComplete?.(execution);
    },
    onError: (execution, error) => {
      clearExecutionState();
      onExecutionError?.(error);
    },
    onLog: (log) => {
      addExecutionLog({
        timestamp: new Date(),
        level: log.level,
        message: log.message,
        data: log.data,
      });
    },
  });

  // Auto-save effect
  useEffect(() => {
    if (!autoSave || !isDirty || !currentWorkflow) return;

    const timer = setTimeout(() => {
      saveWorkflow();
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [autoSave, autoSaveInterval, isDirty, currentWorkflow, saveWorkflow]);

  // Execute workflow
  const executeWorkflow = useCallback(
    async (input: Record<string, unknown> = {}): Promise<WorkflowExecution | null> => {
      if (!currentWorkflow) return null;

      // Validate first
      const errors = validate();
      if (errors.some((e) => e.severity === 'error')) {
        onExecutionError?.('Workflow has validation errors');
        return null;
      }

      // Convert to executable definition
      const definition = visualToDefinition(currentWorkflow);

      // Start execution tracking
      startExecution(input);

      try {
        // Run the workflow
        const result = await runWorkflow(definition.id, input);
        return result.execution;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onExecutionError?.(errorMessage);
        clearExecutionState();
        return null;
      }
    },
    [currentWorkflow, validate, startExecution, runWorkflow, onExecutionError, clearExecutionState]
  );

  // Pause execution
  const pauseExecution = useCallback(() => {
    pauseEditorExecution();
    pauseWorkflowExecution();
  }, [pauseEditorExecution, pauseWorkflowExecution]);

  // Resume execution
  const resumeExecution = useCallback(() => {
    resumeEditorExecution();
    resumeWorkflowExecution();
  }, [resumeEditorExecution, resumeWorkflowExecution]);

  // Cancel execution
  const cancelExecution = useCallback(() => {
    cancelEditorExecution();
    cancelWorkflowExecution();
  }, [cancelEditorExecution, cancelWorkflowExecution]);

  // Validate workflow
  const validateWorkflow = useCallback((): boolean => {
    const errors = validate();
    return !errors.some((e) => e.severity === 'error');
  }, [validate]);

  // Export workflow as JSON
  const exportWorkflow = useCallback((): string | null => {
    if (!currentWorkflow) return null;
    return JSON.stringify(currentWorkflow, null, 2);
  }, [currentWorkflow]);

  // Import workflow from JSON
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
    // State
    currentWorkflow,
    isExecuting: isExecuting || isRunning,
    isDirty,
    validationErrors,

    // Actions
    createWorkflow,
    loadWorkflow,
    saveWorkflow,
    executeWorkflow,
    pauseExecution,
    resumeExecution,
    cancelExecution,
    validate: validateWorkflow,

    // Utilities
    exportWorkflow,
    importWorkflow,
  };
}

export default useWorkflowEditor;
