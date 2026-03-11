/**
 * Workflow editor lifecycle and validation helpers.
 */

import type {
  ValidationError,
  WorkflowEditorLifecycleState,
} from '../types';

export function isBlockingValidationError(error: ValidationError): boolean {
  if (typeof error.blocking === 'boolean') {
    return error.blocking;
  }
  return error.severity !== 'warning' && error.severity !== 'info';
}

export function deriveEditorLifecycleState(params: {
  hasWorkflow: boolean;
  isDirty: boolean;
  isSaving: boolean;
  hasSaveError: boolean;
  validationErrors: ValidationError[];
}): WorkflowEditorLifecycleState {
  if (!params.hasWorkflow) {
    return 'clean';
  }

  if (params.isSaving) {
    return 'saving';
  }

  if (params.hasSaveError) {
    return 'saveFailed';
  }

  if (params.validationErrors.some(isBlockingValidationError)) {
    return 'publishBlocked';
  }

  if (params.isDirty) {
    return 'readyToPublish';
  }

  return 'clean';
}

export function createValidationIssueId(error: ValidationError, index: number): string {
  if (error.id) {
    return error.id;
  }

  const source = error.source || 'client';
  const target = error.nodeId || error.edgeId || error.field || 'global';
  const code = error.code || 'validation';
  return `${source}:${target}:${code}:${index}`;
}
