import type {
  EditorExecutionStatus,
  ValidationError,
} from '@/types/workflow/workflow-editor';
import type { WorkflowEditorLifecycleState } from '@/stores/workflow/workflow-editor-store/types';

import { getWorkflowLifecycleCapability } from './execution-status';

export interface WorkflowValidationSummary {
  blockingErrors: ValidationError[];
  warnings: ValidationError[];
  hasBlockingErrors: boolean;
  hasWarnings: boolean;
  blockingCount: number;
  warningCount: number;
}

export interface WorkflowExecutionControlsSummary {
  canRun: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  runReason?: string;
  runRecoveryHint?: string;
}

export function getWorkflowValidationSummary(
  validationErrors: ValidationError[]
): WorkflowValidationSummary {
  const blockingErrors = validationErrors.filter(
    (error) => error.blocking ?? (error.severity !== 'warning' && error.severity !== 'info')
  );
  const warnings = validationErrors.filter(
    (error) => !(error.blocking ?? (error.severity !== 'warning' && error.severity !== 'info'))
  );

  return {
    blockingErrors,
    warnings,
    hasBlockingErrors: blockingErrors.length > 0,
    hasWarnings: warnings.length > 0,
    blockingCount: blockingErrors.length,
    warningCount: warnings.length,
  };
}

export function getWorkflowLifecycleLabel(
  editorLifecycleState: WorkflowEditorLifecycleState
): string {
  if (editorLifecycleState === 'saving') return 'Saving...';
  if (editorLifecycleState === 'saveFailed') return 'Save failed';
  if (editorLifecycleState === 'publishBlocked') return 'Publish blocked';
  if (editorLifecycleState === 'readyToPublish') return 'Ready to publish';
  if (editorLifecycleState === 'dirty') return 'Unsaved changes';
  return 'Saved';
}

export function getWorkflowExecutionControlsSummary(params: {
  hasWorkflow: boolean;
  isExecuting: boolean;
  status: EditorExecutionStatus | undefined;
  validationErrors: ValidationError[];
}): WorkflowExecutionControlsSummary {
  const validationSummary = getWorkflowValidationSummary(params.validationErrors);
  const capability = getWorkflowLifecycleCapability({
    hasWorkflow: params.hasWorkflow,
    isExecuting: params.isExecuting,
    status: params.status,
    hasValidationErrors: validationSummary.hasBlockingErrors,
  });

  return {
    canRun: capability.actions.run.allowed,
    canPause: capability.actions.pause.allowed,
    canResume: capability.actions.resume.allowed,
    canCancel: capability.actions.cancel.allowed,
    runReason: capability.actions.run.reason,
    runRecoveryHint: capability.actions.run.recoveryHint,
  };
}
