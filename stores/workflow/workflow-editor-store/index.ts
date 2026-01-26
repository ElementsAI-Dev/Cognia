/**
 * Workflow Editor Store
 * Zustand store for managing workflow editor state
 * 
 * Refactored into domain-specific slices for better maintainability
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkflowEditorStore, WorkflowEditorState, ResetActions } from './types';
import {
  createWorkflowSlice,
  workflowSliceInitialState,
  clearWorkflowSliceTimers,
  createNodeSlice,
  clearNodeSliceTimers,
  createEdgeSlice,
  createSelectionSlice,
  selectionSliceInitialState,
  createHistorySlice,
  historySliceInitialState,
  createViewportSlice,
  createValidationSlice,
  validationSliceInitialState,
  createExecutionSlice,
  executionSliceInitialState,
  createDebugSlice,
  debugSliceInitialState,
  createUISlice,
  uiSliceInitialState,
  createTemplateSlice,
  templateSliceInitialState,
  createVersionSlice,
  versionSliceInitialState,
  createImportExportSlice,
  createStatisticsSlice,
  statisticsSliceInitialState,
} from './slices';

// Combined initial state
const initialState: WorkflowEditorState = {
  ...workflowSliceInitialState,
  ...selectionSliceInitialState,
  ...historySliceInitialState,
  ...validationSliceInitialState,
  ...executionSliceInitialState,
  ...debugSliceInitialState,
  ...uiSliceInitialState,
  ...templateSliceInitialState,
  ...versionSliceInitialState,
  ...statisticsSliceInitialState,
};

// Create reset action
const createResetSlice = (
  set: (partial: Partial<WorkflowEditorStore>) => void
): ResetActions => ({
  reset: () => {
    clearWorkflowSliceTimers();
    clearNodeSliceTimers();
    set(initialState);
  },
});

// Create the store with all slices composed
export const useWorkflowEditorStore = create<WorkflowEditorStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createWorkflowSlice(set, get),
      ...createNodeSlice(set, get),
      ...createEdgeSlice(set, get),
      ...createSelectionSlice(set, get),
      ...createHistorySlice(set, get),
      ...createViewportSlice(set, get),
      ...createValidationSlice(set, get),
      ...createExecutionSlice(set, get),
      ...createDebugSlice(set, get),
      ...createUISlice(set, get),
      ...createTemplateSlice(set, get),
      ...createVersionSlice(set, get),
      ...createImportExportSlice(set, get),
      ...createStatisticsSlice(set, get),
      ...createResetSlice(set),
    }),
    {
      name: 'cognia-workflow-editor',
      partialize: (state) => ({
        savedWorkflows: state.savedWorkflows,
        nodeTemplates: state.nodeTemplates,
        workflowVersions: state.workflowVersions,
        WorkflowExecutionRecords: state.WorkflowExecutionRecords,
        showNodePalette: state.showNodePalette,
        showConfigPanel: state.showConfigPanel,
        showMinimap: state.showMinimap,
      }),
    }
  )
);

// Re-export types for convenience
export type { WorkflowEditorStore, WorkflowEditorState } from './types';

export default useWorkflowEditorStore;
