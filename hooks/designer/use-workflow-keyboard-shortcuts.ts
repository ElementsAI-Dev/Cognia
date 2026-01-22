/**
 * useWorkflowKeyboardShortcuts - Keyboard shortcuts for workflow editor
 */

import { useEffect, useCallback } from 'react';
import { useWorkflowEditorStore } from '@/stores/workflow';

interface UseWorkflowKeyboardShortcutsOptions {
  enabled?: boolean;
  onSave?: () => void;
}

export function useWorkflowKeyboardShortcuts(options: UseWorkflowKeyboardShortcutsOptions = {}) {
  const { enabled = true, onSave } = options;

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

      // Ctrl/Cmd + S - Save
      if (ctrlOrCmd && event.key === 's') {
        event.preventDefault();
        onSave?.();
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

      // Ctrl/Cmd + D - Duplicate
      if (ctrlOrCmd && event.key === 'd') {
        event.preventDefault();
        if (selectedNodes.length > 0) {
          selectedNodes.forEach((nodeId) => {
            useWorkflowEditorStore.getState().duplicateNode(nodeId);
          });
        }
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
      { key: 'Ctrl/⌘ + Z', action: 'Undo' },
      { key: 'Ctrl/⌘ + Shift + Z', action: 'Redo' },
      { key: 'Ctrl/⌘ + C', action: 'Copy' },
      { key: 'Ctrl/⌘ + V', action: 'Paste' },
      { key: 'Ctrl/⌘ + X', action: 'Cut' },
      { key: 'Ctrl/⌘ + A', action: 'Select All' },
      { key: 'Ctrl/⌘ + S', action: 'Save' },
      { key: 'Ctrl/⌘ + D', action: 'Duplicate' },
      { key: 'Delete/Backspace', action: 'Delete' },
      { key: 'Escape', action: 'Clear Selection' },
    ],
  };
}

export default useWorkflowKeyboardShortcuts;
