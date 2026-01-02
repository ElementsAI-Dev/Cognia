/**
 * useWorkflowExecution - Custom hook for workflow execution
 * Simplifies workflow execution with automatic state management
 */

import { useCallback, useEffect } from 'react';
import { useWorkflowEditorStore } from '@/stores/workflow';
import type { WorkflowExecutionState, ExecutionLog, NodeExecutionState } from '@/types/workflow-editor';

// Execution result type
export interface ExecutionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  executionId: string;
  duration: number;
}

// Hook options
export interface UseWorkflowExecutionOptions {
  /** Callback when execution completes successfully */
  onSuccess?: (result: ExecutionResult) => void;
  /** Callback when execution fails */
  onError?: (error: string) => void;
  /** Callback when execution is paused */
  onPaused?: () => void;
  /** Callback when execution is resumed */
  onResumed?: () => void;
  /** Callback when execution is cancelled */
  onCancelled?: () => void;
  /** Callback for progress updates (0-100) */
  onProgress?: (progress: number) => void;
  /** Callback for node state changes */
  onNodeStateChange?: (nodeId: string, state: NodeExecutionState) => void;
  /** Callback for new logs */
  onLog?: (log: ExecutionLog) => void;
  /** Auto-start execution on mount (requires input) */
  autoStart?: boolean;
  /** Input data for auto-start */
  initialInput?: Record<string, unknown>;
}

// Hook return value
export interface UseWorkflowExecutionReturn {
  // Current state
  executionState: WorkflowExecutionState | null;
  isExecuting: boolean;
  isPaused: boolean;
  progress: number;
  currentStep: string | undefined;
  logs: ExecutionLog[];

  // Actions
  start: (input?: Record<string, unknown>) => Promise<void>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;

  // Utilities
  getNodeState: (nodeId: string) => NodeExecutionState | undefined;
  getStepLogs: (stepId: string) => ExecutionLog[];
  clearLogs: () => void;

  // Status helpers
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
}

/**
 * Hook for workflow execution with automatic state management
 */
export function useWorkflowExecution(
  options: UseWorkflowExecutionOptions = {}
): UseWorkflowExecutionReturn {
  const {
    onSuccess,
    onError,
    onPaused,
    onResumed,
    onCancelled,
    onProgress,
    onNodeStateChange,
    onLog,
    autoStart = false,
    initialInput = {},
  } = options;

  // Store selectors
  const currentWorkflow = useWorkflowEditorStore((s) => s.currentWorkflow);
  const executionState = useWorkflowEditorStore((s) => s.executionState);
  const isExecuting = useWorkflowEditorStore((s) => s.isExecuting);
  const showExecutionPanel = useWorkflowEditorStore((s) => s.showExecutionPanel);

  // Store actions
  const startExecution = useWorkflowEditorStore((s) => s.startExecution);
  const pauseExecution = useWorkflowEditorStore((s) => s.pauseExecution);
  const resumeExecution = useWorkflowEditorStore((s) => s.resumeExecution);
  const cancelExecution = useWorkflowEditorStore((s) => s.cancelExecution);
  const clearLogs = useWorkflowEditorStore((s) => s.clearExecutionState);
  const updateShowPanel = useWorkflowEditorStore((s) => s.toggleExecutionPanel);

  // Derived state
  const isPaused = executionState?.status === 'paused';
  const progress = executionState?.progress ?? 0;
  const currentStep = executionState?.currentNodeId;
  const logs = executionState?.logs ?? [];

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart && currentWorkflow && !isExecuting && !executionState) {
      startExecution(initialInput);
    }
  }, [autoStart, currentWorkflow, isExecuting, executionState, initialInput, startExecution]);

  // Watch for execution state changes and trigger callbacks
  useEffect(() => {
    if (!executionState) return;

    // Progress updates
    if (onProgress) {
      onProgress(executionState.progress);
    }

    // Log updates
    if (onLog && executionState.logs.length > 0) {
      const latestLog = executionState.logs[executionState.logs.length - 1];
      onLog(latestLog);
    }

    // Status changes
    switch (executionState.status) {
      case 'completed':
        if (onSuccess) {
          const duration = executionState.completedAt && executionState.startedAt
            ? executionState.completedAt.getTime() - executionState.startedAt.getTime()
            : 0;

          onSuccess({
            success: true,
            output: executionState.output,
            executionId: executionState.executionId,
            duration,
          });
        }
        break;

      case 'failed':
        if (onError) {
          onError(executionState.error || 'Unknown error');
        }
        break;

      case 'paused':
        onPaused?.();
        break;

      case 'running':
        if (isPaused && onResumed) {
          onResumed();
        }
        break;

      case 'cancelled':
        onCancelled?.();
        break;
    }
  }, [executionState, onProgress, onLog, onSuccess, onError, onPaused, onResumed, onCancelled, isPaused]);

  // Watch for node state changes
  useEffect(() => {
    if (!onNodeStateChange || !executionState) return;

    Object.entries(executionState.nodeStates).forEach(([nodeId, state]) => {
      onNodeStateChange(nodeId, state);
    });
  }, [executionState, onNodeStateChange]);

  // Start execution
  const start = useCallback(
    async (input?: Record<string, unknown>) => {
      if (!currentWorkflow) {
        console.error('Cannot start execution: No workflow loaded');
        return;
      }

      try {
        // Show execution panel if not visible
        if (!showExecutionPanel) {
          updateShowPanel();
        }

        await startExecution(input ?? initialInput);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onError?.(errorMessage);
      }
    },
    [
      currentWorkflow,
      showExecutionPanel,
      startExecution,
      initialInput,
      updateShowPanel,
      onError,
    ]
  );

  // Pause execution
  const pause = useCallback(() => {
    if (!isExecuting || isPaused) return;
    pauseExecution();
  }, [isExecuting, isPaused, pauseExecution]);

  // Resume execution
  const resume = useCallback(() => {
    if (!isPaused) return;
    resumeExecution();
  }, [isPaused, resumeExecution]);

  // Cancel execution
  const cancel = useCallback(() => {
    if (!isExecuting && !isPaused) return;
    cancelExecution();
  }, [isExecuting, isPaused, cancelExecution]);

  // Get node state
  const getNodeState = useCallback(
    (nodeId: string) => {
      return executionState?.nodeStates[nodeId];
    },
    [executionState]
  );

  // Get logs for a specific step
  const getStepLogs = useCallback(
    (stepId: string) => {
      if (!executionState) return [];
      return executionState.logs.filter((log) =>
        log.message.includes(stepId)
      );
    },
    [executionState]
  );

  // Status helpers
  const canStart = Boolean(currentWorkflow) && !isExecuting && !isPaused;
  const canPause = isExecuting && !isPaused;
  const canResume = isPaused;
  const canCancel = isExecuting || isPaused;

  return {
    // Current state
    executionState,
    isExecuting,
    isPaused,
    progress,
    currentStep,
    logs,

    // Actions
    start,
    pause,
    resume,
    cancel,

    // Utilities
    getNodeState,
    getStepLogs,
    clearLogs,

    // Status helpers
    canStart,
    canPause,
    canResume,
    canCancel,
  };
}

/**
 * Simplified hook for quick workflow execution
 * Just provide input and get execution state
 */
export function useQuickWorkflowExecution(
  input: Record<string, unknown> = {}
): UseWorkflowExecutionReturn {
  return useWorkflowExecution({
    autoStart: true,
    initialInput: input,
  });
}

/**
 * Hook for workflow execution with keyboard shortcuts
 * Space = pause/resume, Esc = cancel
 */
export function useWorkflowExecutionWithKeyboard(
  options: UseWorkflowExecutionOptions = {}
): UseWorkflowExecutionReturn {
  const execution = useWorkflowExecution(options);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (execution.canPause) {
            execution.pause();
          } else if (execution.canResume) {
            execution.resume();
          }
          break;

        case 'Escape':
          if (execution.canCancel) {
            execution.cancel();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [execution]);

  return execution;
}

export default useWorkflowExecution;
