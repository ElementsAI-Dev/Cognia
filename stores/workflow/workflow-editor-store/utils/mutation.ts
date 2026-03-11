/**
 * Shared mutation helper for workflow graph updates.
 */

import type {
  WorkflowEditorStore,
  WorkflowMutationKind,
  VisualWorkflow,
} from '../types';
import { scheduleWorkflowValidation } from './validation-scheduler';
import { isWorkflowEditorFeatureEnabled } from '@/lib/workflow-editor/feature-flags';

type StoreSetter = (
  partial: Partial<WorkflowEditorStore> | ((state: WorkflowEditorStore) => Partial<WorkflowEditorStore>)
) => void;

interface ApplyWorkflowMutationParams {
  set: StoreSetter;
  get: () => WorkflowEditorStore;
  kind: WorkflowMutationKind;
  updateWorkflow: (workflow: VisualWorkflow) => VisualWorkflow;
  nodeIds?: string[];
  edgeIds?: string[];
  metadata?: Record<string, unknown>;
  selectionPatch?: Partial<Pick<WorkflowEditorStore, 'selectedNodes' | 'selectedEdges'>>;
  pushHistory?: boolean;
  validate?: boolean;
  clearServerErrors?: boolean;
}

export function applyWorkflowMutation(params: ApplyWorkflowMutationParams): VisualWorkflow | null {
  const currentWorkflow = params.get().currentWorkflow;
  if (!currentWorkflow) {
    return null;
  }

  const updatedWorkflow = params.updateWorkflow(currentWorkflow);
  const mutationRecord = {
    kind: params.kind,
    nodeIds: params.nodeIds,
    edgeIds: params.edgeIds,
    metadata: params.metadata,
    occurredAt: new Date(),
  };

  params.set({
    currentWorkflow: updatedWorkflow,
    isDirty: true,
    editorLifecycleState: 'dirty',
    lastSaveError: null,
    lastMutation: mutationRecord,
    ...(params.selectionPatch || {}),
  });

  if (params.clearServerErrors !== false) {
    params.get().clearServerValidationErrors();
  }

  if (params.pushHistory) {
    params.get().pushHistory();
  }

  if (params.validate) {
    scheduleWorkflowValidation(params.get);
  }

  return updatedWorkflow;
}

export function confirmDestructiveAction(message: string): boolean {
  if (!isWorkflowEditorFeatureEnabled('workflow.editor.v2')) {
    return true;
  }

  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    return true;
  }

  try {
    return window.confirm(message);
  } catch {
    return true;
  }
}
