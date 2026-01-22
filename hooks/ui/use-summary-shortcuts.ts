/**
 * useSummaryShortcuts - Keyboard shortcuts for summary functionality
 *
 * Shortcuts:
 * - Ctrl/Cmd + Shift + S: Open summary dialog
 * - Ctrl/Cmd + Shift + D: Generate diagram
 */

import { useEffect, useCallback } from 'react';

interface UseSummaryShortcutsOptions {
  /** Callback when summary shortcut is triggered */
  onSummaryShortcut?: () => void;
  /** Callback when diagram shortcut is triggered */
  onDiagramShortcut?: () => void;
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

/**
 * Hook for summary-related keyboard shortcuts
 */
export function useSummaryShortcuts({
  onSummaryShortcut,
  onDiagramShortcut,
  enabled = true,
}: UseSummaryShortcutsOptions = {}) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd + Shift + S: Summary
      if (modifierKey && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSummaryShortcut?.();
        return;
      }

      // Ctrl/Cmd + Shift + D: Diagram
      if (modifierKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        onDiagramShortcut?.();
        return;
      }
    },
    [enabled, onSummaryShortcut, onDiagramShortcut]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: {
      summary: { key: 'S', modifiers: ['Ctrl/Cmd', 'Shift'] },
      diagram: { key: 'D', modifiers: ['Ctrl/Cmd', 'Shift'] },
    },
  };
}

export default useSummaryShortcuts;
