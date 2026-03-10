/**
 * Shared execution status helpers used across workflow surfaces.
 */

import type { WorkflowExecutionStatus } from '@/types/workflow/workflow';
import type { EditorExecutionStatus } from '@/types/workflow/workflow-editor';

export interface ExecutionControlState {
  canRun: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
}

export type WorkflowLifecycleAction =
  | 'run'
  | 'pause'
  | 'resume'
  | 'cancel'
  | 'save'
  | 'schedule'
  | 'viewHistory'
  | 'viewResult';

export interface WorkflowLifecycleActionState {
  allowed: boolean;
  reason?: string;
  recoveryHint?: string;
}

export interface WorkflowLifecycleCapability {
  actions: Record<WorkflowLifecycleAction, WorkflowLifecycleActionState>;
}

export interface CanonicalExecutionState {
  status: WorkflowExecutionStatus;
  progress: number;
  isTerminal: boolean;
  source: 'runtime' | 'history' | 'none';
}

const WORKFLOW_STATUS_PRIORITY: Record<WorkflowExecutionStatus, number> = {
  idle: 0,
  planning: 1,
  executing: 2,
  paused: 2,
  completed: 3,
  failed: 3,
  cancelled: 3,
};

function clampProgress(progress: number | undefined): number {
  if (progress === undefined || Number.isNaN(progress)) return 0;
  if (progress < 0) return 0;
  if (progress > 100) return 100;
  return progress;
}

function allowed(): WorkflowLifecycleActionState {
  return { allowed: true };
}

function blocked(reason: string, recoveryHint: string): WorkflowLifecycleActionState {
  return {
    allowed: false,
    reason,
    recoveryHint,
  };
}

export function mapEditorToWorkflowExecutionStatus(
  status: EditorExecutionStatus
): WorkflowExecutionStatus {
  if (status === 'running') return 'executing';
  if (status === 'pending') return 'planning';
  if (
    status === 'idle' ||
    status === 'paused' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled'
  ) {
    return status;
  }
  return 'planning';
}

export function mapAnyToWorkflowExecutionStatus(
  status: EditorExecutionStatus | WorkflowExecutionStatus
): WorkflowExecutionStatus {
  if (
    status === 'planning' ||
    status === 'executing' ||
    status === 'idle' ||
    status === 'paused' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled'
  ) {
    return status;
  }
  return mapEditorToWorkflowExecutionStatus(status);
}

export function isEditorExecutionTerminalStatus(
  status: EditorExecutionStatus | undefined
): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export function reconcileEditorExecutionStatus(
  current: EditorExecutionStatus | undefined,
  incoming: EditorExecutionStatus
): EditorExecutionStatus {
  if (!current) return incoming;
  if (current === incoming) return current;

  // Once terminal, never regress to non-terminal states.
  if (isEditorExecutionTerminalStatus(current)) {
    return current;
  }

  if (incoming === 'idle') {
    return current;
  }

  if (isEditorExecutionTerminalStatus(incoming)) {
    return incoming;
  }

  // Explicit pause/resume transitions.
  if (current === 'running' && incoming === 'paused') return incoming;
  if (current === 'paused' && incoming === 'running') return incoming;

  // Promote from pending to active execution states.
  if (current === 'pending' && (incoming === 'running' || incoming === 'paused')) {
    return incoming;
  }

  return current;
}

export function deriveCanonicalExecutionState(params: {
  isExecuting: boolean;
  runtimeStatus?: EditorExecutionStatus;
  runtimeProgress?: number;
  historyStatus?: EditorExecutionStatus | WorkflowExecutionStatus;
  historyProgress?: number;
}): CanonicalExecutionState {
  const runtimeStatus = params.runtimeStatus
    ? mapEditorToWorkflowExecutionStatus(params.runtimeStatus)
    : undefined;
  const historyStatus = params.historyStatus
    ? mapAnyToWorkflowExecutionStatus(params.historyStatus)
    : undefined;

  if (!runtimeStatus && !historyStatus) {
    return {
      status: 'idle',
      progress: 0,
      isTerminal: false,
      source: 'none',
    };
  }

  if (params.isExecuting && runtimeStatus) {
    return {
      status: runtimeStatus,
      progress: clampProgress(params.runtimeProgress),
      isTerminal:
        runtimeStatus === 'completed' || runtimeStatus === 'failed' || runtimeStatus === 'cancelled',
      source: 'runtime',
    };
  }

  if (runtimeStatus && historyStatus) {
    const runtimePriority = WORKFLOW_STATUS_PRIORITY[runtimeStatus];
    const historyPriority = WORKFLOW_STATUS_PRIORITY[historyStatus];

    if (runtimePriority >= historyPriority) {
      return {
        status: runtimeStatus,
        progress: Math.max(
          clampProgress(params.runtimeProgress),
          clampProgress(params.historyProgress)
        ),
        isTerminal:
          runtimeStatus === 'completed' ||
          runtimeStatus === 'failed' ||
          runtimeStatus === 'cancelled',
        source: 'runtime',
      };
    }
  }

  if (historyStatus) {
    return {
      status: historyStatus,
      progress: clampProgress(params.historyProgress),
      isTerminal:
        historyStatus === 'completed' || historyStatus === 'failed' || historyStatus === 'cancelled',
      source: 'history',
    };
  }

  return {
    status: runtimeStatus || 'idle',
    progress: clampProgress(params.runtimeProgress),
    isTerminal:
      runtimeStatus === 'completed' || runtimeStatus === 'failed' || runtimeStatus === 'cancelled',
    source: 'runtime',
  };
}

export function getWorkflowLifecycleCapability(params: {
  hasWorkflow: boolean;
  isExecuting: boolean;
  status: EditorExecutionStatus | undefined;
  hasValidationErrors?: boolean;
}): WorkflowLifecycleCapability {
  const { hasWorkflow, isExecuting, status, hasValidationErrors = false } = params;
  const canRun = hasWorkflow && !isExecuting && !hasValidationErrors;
  const canPause = isExecuting && status === 'running';
  const canResume = isExecuting && status === 'paused';
  const canCancel =
    isExecuting && !isEditorExecutionTerminalStatus(status) && status !== 'idle' && status !== undefined;
  const canSave = hasWorkflow;
  const canSchedule = hasWorkflow;
  const canViewHistory = hasWorkflow;
  const canViewResult = status !== undefined && status !== 'idle';

  const runState = !hasWorkflow
    ? blocked('No workflow loaded', 'Load or create a workflow first')
    : hasValidationErrors
      ? blocked('Validation errors present', 'Fix validation errors and retry')
      : isExecuting
        ? blocked('Workflow is executing', 'Pause or cancel current execution before rerun')
        : allowed();

  return {
    actions: {
      run: canRun ? allowed() : runState,
      pause: canPause
        ? allowed()
        : blocked('Execution is not running', 'Start or resume execution to enable pause'),
      resume: canResume
        ? allowed()
        : blocked('Execution is not paused', 'Pause a running execution first'),
      cancel: canCancel
        ? allowed()
        : blocked('Execution cannot be cancelled', 'Start a workflow execution first'),
      save: canSave
        ? allowed()
        : blocked('No workflow loaded', 'Load or create a workflow first'),
      schedule: canSchedule
        ? allowed()
        : blocked('No workflow loaded', 'Load or create a workflow first'),
      viewHistory: canViewHistory
        ? allowed()
        : blocked('No workflow loaded', 'Load or create a workflow first'),
      viewResult: canViewResult
        ? allowed()
        : blocked('No execution result yet', 'Run the workflow to generate results'),
    },
  };
}

export function getExecutionControlState(params: {
  isExecuting: boolean;
  status: EditorExecutionStatus | undefined;
}): ExecutionControlState {
  const capability = getWorkflowLifecycleCapability({
    hasWorkflow: true,
    isExecuting: params.isExecuting,
    status: params.status,
  });

  return {
    canRun: capability.actions.run.allowed,
    canPause: capability.actions.pause.allowed,
    canResume: capability.actions.resume.allowed,
    canCancel: capability.actions.cancel.allowed,
  };
}

