/**
 * useToolbarActions - Shared toolbar actions hook for workflow editor
 * Extracts common action handlers used by both mobile and desktop toolbars
 */

import { useMemo, useCallback } from 'react';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';

export interface ToolbarState {
  canUndo: boolean;
  canRedo: boolean;
  canSave: boolean;
  canRun: boolean;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  isValid: boolean;
  hasSelection: boolean;
  isSaving: boolean;
  isPublishBlocked: boolean;
  blockingErrorCount: number;
}

export function useToolbarActions() {
  const {
    currentWorkflow,
    isDirty,
    editorLifecycleState,
    isExecuting,
    executionState,
    selectedNodes,
    historyLength,
    historyIndex,
    validationErrors,
    showNodePalette,
    showConfigPanel,
    showMinimap,
    saveWorkflow,
    undo,
    redo,
    deleteNodes,
    duplicateNodes,
    startExecution,
    pauseExecution,
    resumeExecution,
    cancelExecution,
    autoLayout,
    alignNodes,
    distributeNodes,
    toggleNodePalette,
    toggleConfigPanel,
    toggleMinimap,
    validate,
    focusValidationIssue,
  } = useWorkflowEditorStore(
    useShallow((state) => ({
      currentWorkflow: state.currentWorkflow,
      isDirty: state.isDirty,
      editorLifecycleState: state.editorLifecycleState,
      isExecuting: state.isExecuting,
      executionState: state.executionState,
      selectedNodes: state.selectedNodes,
      historyLength: state.history.length,
      historyIndex: state.historyIndex,
      validationErrors: state.validationErrors,
      showNodePalette: state.showNodePalette,
      showConfigPanel: state.showConfigPanel,
      showMinimap: state.showMinimap,
      saveWorkflow: state.saveWorkflow,
      undo: state.undo,
      redo: state.redo,
      deleteNodes: state.deleteNodes,
      duplicateNodes: state.duplicateNodes,
      startExecution: state.startExecution,
      pauseExecution: state.pauseExecution,
      resumeExecution: state.resumeExecution,
      cancelExecution: state.cancelExecution,
      autoLayout: state.autoLayout,
      alignNodes: state.alignNodes,
      distributeNodes: state.distributeNodes,
      toggleNodePalette: state.toggleNodePalette,
      toggleConfigPanel: state.toggleConfigPanel,
      toggleMinimap: state.toggleMinimap,
      validate: state.validate,
      focusValidationIssue: state.focusValidationIssue,
    }))
  );

  const blockingValidationErrors = useMemo(
    () =>
      validationErrors.filter(
        (error) => error.blocking ?? (error.severity !== 'warning' && error.severity !== 'info')
      ),
    [validationErrors]
  );

  // Computed state
  const state: ToolbarState = useMemo(() => ({
    canUndo: historyIndex > 0,
    canRedo: historyIndex < historyLength - 1,
    canSave: isDirty && currentWorkflow !== null && editorLifecycleState !== 'saving',
    canRun: !isExecuting && currentWorkflow !== null && blockingValidationErrors.length === 0,
    canPause: isExecuting && executionState?.status === 'running',
    canResume: isExecuting && executionState?.status === 'paused',
    canStop: isExecuting,
    isValid: blockingValidationErrors.length === 0,
    hasSelection: selectedNodes.length > 0,
    isSaving: editorLifecycleState === 'saving',
    isPublishBlocked:
      editorLifecycleState === 'publishBlocked' || blockingValidationErrors.length > 0,
    blockingErrorCount: blockingValidationErrors.length,
  }), [
    historyIndex,
    historyLength,
    isDirty,
    currentWorkflow,
    editorLifecycleState,
    isExecuting,
    executionState,
    selectedNodes,
    blockingValidationErrors,
  ]);

  // Action handlers
  const handleSave = useCallback(() => {
    if (state.canSave) {
      saveWorkflow();
    }
  }, [state.canSave, saveWorkflow]);

  const handleRun = useCallback(() => {
    if (state.canRun) {
      const errors = validate();
      const blockingErrors = errors.filter(
        (error) => error.blocking ?? (error.severity !== 'warning' && error.severity !== 'info')
      );
      if (blockingErrors.length === 0) {
        startExecution({});
      } else {
        const errorCount = blockingErrors.length;
        const firstError = blockingErrors[0]?.message;
        toast.error('Workflow validation failed', {
          description:
            firstError ||
            (errorCount > 0
              ? `${errorCount} validation error(s) must be fixed before running`
              : 'Fix validation warnings before running'),
        });
      }
    }
  }, [state.canRun, validate, startExecution]);

  const handleDeleteSelection = useCallback(() => {
    if (state.hasSelection) {
      deleteNodes(selectedNodes);
    }
  }, [state.hasSelection, deleteNodes, selectedNodes]);

  const handleDuplicateSelection = useCallback(() => {
    if (state.hasSelection) {
      duplicateNodes(selectedNodes);
    }
  }, [state.hasSelection, duplicateNodes, selectedNodes]);

  const handleAlign = useCallback((direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (state.hasSelection && selectedNodes.length >= 2) {
      alignNodes(direction);
    }
  }, [state.hasSelection, selectedNodes.length, alignNodes]);

  const handleDistribute = useCallback((direction: 'horizontal' | 'vertical') => {
    if (state.hasSelection && selectedNodes.length >= 3) {
      distributeNodes(direction);
    }
  }, [state.hasSelection, selectedNodes.length, distributeNodes]);

  const handleUndo = useCallback(() => {
    if (state.canUndo) {
      undo();
      toast.info('Undo', { duration: 1500 });
    }
  }, [state.canUndo, undo]);

  const handleRedo = useCallback(() => {
    if (state.canRedo) {
      redo();
      toast.info('Redo', { duration: 1500 });
    }
  }, [state.canRedo, redo]);

  return {
    // State
    state,
    currentWorkflow,
    showNodePalette,
    showConfigPanel,
    showMinimap,
    selectedNodes,
    validationErrors,
    blockingValidationErrors,
    editorLifecycleState,
    isExecuting,
    executionState,
    
    // Actions
    handleSave,
    handleRun,
    handleDeleteSelection,
    handleDuplicateSelection,
    handleAlign,
    handleDistribute,
    handleUndo,
    handleRedo,
    autoLayout,
    pauseExecution,
    resumeExecution,
    cancelExecution,
    toggleNodePalette,
    toggleConfigPanel,
    toggleMinimap,
    validate,
    focusValidationIssue,
  };
}

export default useToolbarActions;
