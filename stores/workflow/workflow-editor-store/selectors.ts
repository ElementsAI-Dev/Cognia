import type { WorkflowEditorStore } from './types';

export const selectWorkflowNodeCatalogState = (state: WorkflowEditorStore) => ({
  nodeTemplates: state.nodeTemplates,
  recentNodes: state.recentNodes,
  favoriteNodes: state.favoriteNodes,
});

export const selectWorkflowEditorShellState = (state: WorkflowEditorStore) => ({
  showNodePalette: state.showNodePalette,
  showConfigPanel: state.showConfigPanel,
  showExecutionPanel: state.showExecutionPanel,
  activeInspectorSection: state.activeInspectorSection,
  insertionIntent: state.insertionIntent,
  executionFocus: state.executionFocus,
});
