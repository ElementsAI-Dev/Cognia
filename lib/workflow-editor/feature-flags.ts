export type WorkflowEditorFeatureFlag = 'workflow.editor.v2';

const WORKFLOW_EDITOR_FEATURE_FLAGS_KEY = 'cognia-workflow-editor-feature-flags-v1';

const DEFAULT_WORKFLOW_EDITOR_FEATURE_FLAGS: Record<WorkflowEditorFeatureFlag, boolean> = {
  'workflow.editor.v2': true,
};

function readStoredWorkflowEditorFeatureFlags(): Partial<Record<WorkflowEditorFeatureFlag, boolean>> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(WORKFLOW_EDITOR_FEATURE_FLAGS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Partial<Record<WorkflowEditorFeatureFlag, unknown>>;
    const result: Partial<Record<WorkflowEditorFeatureFlag, boolean>> = {};
    if (typeof parsed['workflow.editor.v2'] === 'boolean') {
      result['workflow.editor.v2'] = parsed['workflow.editor.v2'];
    }
    return result;
  } catch {
    return {};
  }
}

function readEnvWorkflowEditorFlags(): Partial<Record<WorkflowEditorFeatureFlag, boolean>> {
  const raw = process.env.NEXT_PUBLIC_WORKFLOW_EDITOR_V2;
  if (raw === '0' || raw === 'false') {
    return { 'workflow.editor.v2': false };
  }
  if (raw === '1' || raw === 'true') {
    return { 'workflow.editor.v2': true };
  }
  return {};
}

export function getWorkflowEditorFeatureFlags(): Record<WorkflowEditorFeatureFlag, boolean> {
  return {
    ...DEFAULT_WORKFLOW_EDITOR_FEATURE_FLAGS,
    ...readEnvWorkflowEditorFlags(),
    ...readStoredWorkflowEditorFeatureFlags(),
  };
}

export function isWorkflowEditorFeatureEnabled(flag: WorkflowEditorFeatureFlag): boolean {
  return getWorkflowEditorFeatureFlags()[flag];
}

