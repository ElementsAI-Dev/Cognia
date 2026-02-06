/**
 * useWorkflowKeyboardShortcuts - Keyboard shortcuts for workflow editor
 * Implements all shortcuts listed in KeyboardShortcutsPanel
 */

import { useEffect, useCallback } from 'react';
import { useWorkflowEditorStore } from '@/stores/workflow';

interface UseWorkflowKeyboardShortcutsOptions {
  enabled?: boolean;
  onSave?: () => void;
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function useWorkflowKeyboardShortcuts(options: UseWorkflowKeyboardShortcutsOptions = {}) {
  const { enabled = true, onSave, onFitView, onZoomIn, onZoomOut } = options;

  const {
    selectedNodes,
    undo,
    redo,
    copySelection,
    pasteSelection,
    cutSelection,
    deleteNodes,
    selectAll,
    clearSelection,
  } = useWorkflowEditorStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts if typing in an input
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInputElement) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      // === File Operations ===

      // Ctrl/Cmd + S - Save
      if (ctrlOrCmd && event.key === 's') {
        event.preventDefault();
        onSave?.();
        return;
      }

      // Ctrl/Cmd + N - New workflow
      if (ctrlOrCmd && event.key === 'n') {
        event.preventDefault();
        useWorkflowEditorStore.getState().createWorkflow('New Workflow');
        return;
      }

      // === Edit Operations ===

      // Ctrl/Cmd + Z - Undo
      if (ctrlOrCmd && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - Redo
      if ((ctrlOrCmd && event.key === 'z' && event.shiftKey) || (ctrlOrCmd && event.key === 'y')) {
        event.preventDefault();
        redo();
        return;
      }

      // Ctrl/Cmd + C - Copy
      if (ctrlOrCmd && event.key === 'c') {
        event.preventDefault();
        copySelection();
        return;
      }

      // Ctrl/Cmd + V - Paste
      if (ctrlOrCmd && event.key === 'v') {
        event.preventDefault();
        pasteSelection();
        return;
      }

      // Ctrl/Cmd + X - Cut
      if (ctrlOrCmd && event.key === 'x') {
        event.preventDefault();
        cutSelection();
        return;
      }

      // Ctrl/Cmd + A - Select All
      if (ctrlOrCmd && event.key === 'a') {
        event.preventDefault();
        selectAll();
        return;
      }

      // Ctrl/Cmd + D - Duplicate selected nodes (batch)
      if (ctrlOrCmd && event.key === 'd') {
        event.preventDefault();
        if (selectedNodes.length > 0) {
          useWorkflowEditorStore.getState().duplicateNodes(selectedNodes);
        }
        return;
      }

      // Delete or Backspace - Delete selected nodes
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodes.length > 0) {
          event.preventDefault();
          deleteNodes(selectedNodes);
          return;
        }
      }

      // Escape - Clear selection
      if (event.key === 'Escape') {
        event.preventDefault();
        clearSelection();
        return;
      }

      // === View Operations ===

      // Ctrl/Cmd + = or Ctrl/Cmd + + - Zoom In
      if (ctrlOrCmd && (event.key === '=' || event.key === '+')) {
        event.preventDefault();
        onZoomIn?.();
        return;
      }

      // Ctrl/Cmd + - - Zoom Out
      if (ctrlOrCmd && event.key === '-') {
        event.preventDefault();
        onZoomOut?.();
        return;
      }

      // Ctrl/Cmd + 0 - Fit View
      if (ctrlOrCmd && event.key === '0') {
        event.preventDefault();
        onFitView?.();
        return;
      }

      // Ctrl/Cmd + M - Toggle Minimap
      if (ctrlOrCmd && event.key === 'm') {
        event.preventDefault();
        useWorkflowEditorStore.getState().toggleMinimap();
        return;
      }

      // Ctrl/Cmd + B - Toggle Node Palette
      if (ctrlOrCmd && event.key === 'b') {
        event.preventDefault();
        useWorkflowEditorStore.getState().toggleNodePalette();
        return;
      }

      // Ctrl/Cmd + I - Toggle Config Panel
      if (ctrlOrCmd && event.key === 'i') {
        event.preventDefault();
        useWorkflowEditorStore.getState().toggleConfigPanel();
        return;
      }

      // === Layout Operations ===

      // Ctrl/Cmd + L - Auto Layout
      if (ctrlOrCmd && event.key === 'l' && !event.shiftKey) {
        event.preventDefault();
        useWorkflowEditorStore.getState().autoLayout();
        return;
      }

      // Ctrl/Cmd + Shift + L - Align Left
      if (ctrlOrCmd && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        if (selectedNodes.length >= 2) {
          useWorkflowEditorStore.getState().alignNodes('left');
        }
        return;
      }

      // Ctrl/Cmd + Shift + C - Align Center
      if (ctrlOrCmd && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        if (selectedNodes.length >= 2) {
          useWorkflowEditorStore.getState().alignNodes('center');
        }
        return;
      }

      // Ctrl/Cmd + Shift + R - Align Right
      if (ctrlOrCmd && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        if (selectedNodes.length >= 2) {
          useWorkflowEditorStore.getState().alignNodes('right');
        }
        return;
      }

      // === Execution Operations ===

      // F5 - Run Workflow
      if (event.key === 'F5' && !event.shiftKey && !ctrlOrCmd) {
        event.preventDefault();
        const state = useWorkflowEditorStore.getState();
        if (!state.isExecuting) {
          state.startExecution({});
        }
        return;
      }

      // Shift + F5 - Stop Execution
      if (event.key === 'F5' && event.shiftKey) {
        event.preventDefault();
        const state = useWorkflowEditorStore.getState();
        if (state.isExecuting) {
          state.cancelExecution();
        }
        return;
      }

      // Ctrl/Cmd + F5 - Pause Execution
      if (event.key === 'F5' && ctrlOrCmd) {
        event.preventDefault();
        const state = useWorkflowEditorStore.getState();
        if (state.isExecuting) {
          state.pauseExecution();
        }
        return;
      }

      // F9 - Toggle Breakpoint
      if (event.key === 'F9') {
        event.preventDefault();
        const state = useWorkflowEditorStore.getState();
        if (selectedNodes.length === 1) {
          const nodeId = selectedNodes[0];
          if (state.breakpoints.has(nodeId)) {
            state.removeBreakpoint(nodeId);
          } else {
            state.setBreakpoint(nodeId);
          }
        }
        return;
      }

      // F10 - Step Over (debug)
      if (event.key === 'F10') {
        event.preventDefault();
        useWorkflowEditorStore.getState().stepOver();
        return;
      }

      // F11 - Step Into (debug)
      if (event.key === 'F11') {
        event.preventDefault();
        useWorkflowEditorStore.getState().stepInto();
        return;
      }

      // F8 - Continue (debug)
      if (event.key === 'F8') {
        event.preventDefault();
        useWorkflowEditorStore.getState().continueExecution();
        return;
      }

      // Ctrl/Cmd + Shift + D - Toggle Debug Mode
      if (ctrlOrCmd && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        useWorkflowEditorStore.getState().toggleDebugMode();
        return;
      }
    },
    [
      undo,
      redo,
      copySelection,
      pasteSelection,
      cutSelection,
      selectAll,
      deleteNodes,
      selectedNodes,
      clearSelection,
      onSave,
      onFitView,
      onZoomIn,
      onZoomOut,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: [
      // File
      { key: 'Ctrl/⌘ + S', action: 'Save' },
      { key: 'Ctrl/⌘ + N', action: 'New Workflow' },
      // Edit
      { key: 'Ctrl/⌘ + Z', action: 'Undo' },
      { key: 'Ctrl/⌘ + Shift + Z', action: 'Redo' },
      { key: 'Ctrl/⌘ + C', action: 'Copy' },
      { key: 'Ctrl/⌘ + V', action: 'Paste' },
      { key: 'Ctrl/⌘ + X', action: 'Cut' },
      { key: 'Ctrl/⌘ + A', action: 'Select All' },
      { key: 'Ctrl/⌘ + D', action: 'Duplicate' },
      { key: 'Delete/Backspace', action: 'Delete' },
      { key: 'Escape', action: 'Clear Selection' },
      // View
      { key: 'Ctrl/⌘ + +', action: 'Zoom In' },
      { key: 'Ctrl/⌘ + -', action: 'Zoom Out' },
      { key: 'Ctrl/⌘ + 0', action: 'Fit View' },
      { key: 'Ctrl/⌘ + M', action: 'Toggle Minimap' },
      { key: 'Ctrl/⌘ + B', action: 'Toggle Palette' },
      { key: 'Ctrl/⌘ + I', action: 'Toggle Config' },
      // Layout
      { key: 'Ctrl/⌘ + L', action: 'Auto Layout' },
      { key: 'Ctrl/⌘ + Shift + L', action: 'Align Left' },
      { key: 'Ctrl/⌘ + Shift + C', action: 'Align Center' },
      { key: 'Ctrl/⌘ + Shift + R', action: 'Align Right' },
      // Execution
      { key: 'F5', action: 'Run Workflow' },
      { key: 'Shift + F5', action: 'Stop Execution' },
      { key: 'Ctrl/⌘ + F5', action: 'Pause Execution' },
      { key: 'F9', action: 'Toggle Breakpoint' },
      { key: 'F10', action: 'Step Over' },
      { key: 'F11', action: 'Step Into' },
      { key: 'F8', action: 'Continue (Debug)' },
      { key: 'Ctrl/⌘ + Shift + D', action: 'Toggle Debug' },
    ],
  };
}

export default useWorkflowKeyboardShortcuts;
