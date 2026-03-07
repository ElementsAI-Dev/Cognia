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

export function isEditorExecutionTerminalStatus(
  status: EditorExecutionStatus | undefined
): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export function getExecutionControlState(params: {
  isExecuting: boolean;
  status: EditorExecutionStatus | undefined;
}): ExecutionControlState {
  const { isExecuting, status } = params;
  const canRun = !isExecuting;
  const canPause = isExecuting && status === 'running';
  const canResume = isExecuting && status === 'paused';
  const canCancel =
    isExecuting && !isEditorExecutionTerminalStatus(status) && status !== 'idle';

  return { canRun, canPause, canResume, canCancel };
}

