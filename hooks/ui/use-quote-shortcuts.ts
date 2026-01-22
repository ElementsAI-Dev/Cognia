/**
 * useQuoteShortcuts - Keyboard shortcuts for quote operations
 *
 * Shortcuts:
 * - Escape: Exit selection mode / Clear all quotes (when not in selection mode)
 * - Ctrl/Cmd + A: Select all quotes (in selection mode)
 * - Ctrl/Cmd + Shift + A: Deselect all quotes (in selection mode)
 * - Delete/Backspace: Remove selected quotes (in selection mode)
 * - Ctrl/Cmd + M: Merge selected quotes (in selection mode, 2+ selected)
 * - Ctrl/Cmd + E: Export all quotes as text
 * - Ctrl/Cmd + Shift + E: Export all quotes as markdown
 * - Ctrl/Cmd + S: Toggle selection mode
 */

import { useEffect, useCallback } from 'react';
import { useQuoteStore } from '@/stores/chat';
import { toast } from 'sonner';

interface UseQuoteShortcutsOptions {
  enabled?: boolean;
}

export function useQuoteShortcuts(options: UseQuoteShortcutsOptions = {}) {
  const { enabled = true } = options;

  const quotedTexts = useQuoteStore((state) => state.quotedTexts);
  const isSelectionMode = useQuoteStore((state) => state.isSelectionMode);
  const selectedIds = useQuoteStore((state) => state.selectedIds);
  const toggleSelectionMode = useQuoteStore((state) => state.toggleSelectionMode);
  const selectAll = useQuoteStore((state) => state.selectAll);
  const deselectAll = useQuoteStore((state) => state.deselectAll);
  const removeSelected = useQuoteStore((state) => state.removeSelected);
  const mergeSelected = useQuoteStore((state) => state.mergeSelected);
  const exportQuotes = useQuoteStore((state) => state.exportQuotes);
  const exportSelected = useQuoteStore((state) => state.exportSelected);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if no quotes or disabled
      if (!enabled || quotedTexts.length === 0) return;

      // Skip if focused on input elements
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMod = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      // Escape: Exit selection mode or clear all
      if (event.key === 'Escape') {
        event.preventDefault();
        if (isSelectionMode) {
          toggleSelectionMode();
          toast.info('Exited selection mode');
        }
        return;
      }

      // Ctrl/Cmd + S: Toggle selection mode
      if (isMod && event.key.toLowerCase() === 's' && !isShift) {
        // Only handle if we have multiple quotes
        if (quotedTexts.length > 1) {
          event.preventDefault();
          toggleSelectionMode();
          toast.info(isSelectionMode ? 'Exited selection mode' : 'Entered selection mode');
        }
        return;
      }

      // Selection mode shortcuts
      if (isSelectionMode) {
        // Ctrl/Cmd + A: Select all
        if (isMod && event.key.toLowerCase() === 'a' && !isShift) {
          event.preventDefault();
          selectAll();
          toast.info('All quotes selected');
          return;
        }

        // Ctrl/Cmd + Shift + A: Deselect all
        if (isMod && event.key.toLowerCase() === 'a' && isShift) {
          event.preventDefault();
          deselectAll();
          toast.info('All quotes deselected');
          return;
        }

        // Delete/Backspace: Remove selected
        if (event.key === 'Delete' || event.key === 'Backspace') {
          if (selectedIds.size > 0) {
            event.preventDefault();
            const count = selectedIds.size;
            removeSelected();
            toast.success(`Removed ${count} quote${count > 1 ? 's' : ''}`);
          }
          return;
        }

        // Ctrl/Cmd + M: Merge selected
        if (isMod && event.key.toLowerCase() === 'm') {
          if (selectedIds.size >= 2) {
            event.preventDefault();
            mergeSelected();
            toast.success('Quotes merged');
          } else if (selectedIds.size > 0) {
            toast.error('Select at least 2 quotes to merge');
          }
          return;
        }
      }

      // Export shortcuts (work in both modes)
      // Ctrl/Cmd + E: Export as text
      if (isMod && event.key.toLowerCase() === 'e' && !isShift) {
        event.preventDefault();
        const content =
          isSelectionMode && selectedIds.size > 0 ? exportSelected('text') : exportQuotes('text');
        if (content) {
          navigator.clipboard.writeText(content);
          toast.success('Exported as text');
        }
        return;
      }

      // Ctrl/Cmd + Shift + E: Export as markdown
      if (isMod && event.key.toLowerCase() === 'e' && isShift) {
        event.preventDefault();
        const content =
          isSelectionMode && selectedIds.size > 0
            ? exportSelected('markdown')
            : exportQuotes('markdown');
        if (content) {
          navigator.clipboard.writeText(content);
          toast.success('Exported as Markdown');
        }
        return;
      }
    },
    [
      enabled,
      quotedTexts.length,
      isSelectionMode,
      selectedIds,
      toggleSelectionMode,
      selectAll,
      deselectAll,
      removeSelected,
      mergeSelected,
      exportQuotes,
      exportSelected,
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
      { key: 'Esc', description: 'Exit selection mode', condition: 'selection mode' },
      { key: 'Ctrl+S', description: 'Toggle selection mode', condition: '2+ quotes' },
      { key: 'Ctrl+A', description: 'Select all', condition: 'selection mode' },
      { key: 'Ctrl+Shift+A', description: 'Deselect all', condition: 'selection mode' },
      { key: 'Delete', description: 'Remove selected', condition: 'selection mode' },
      { key: 'Ctrl+M', description: 'Merge selected', condition: '2+ selected' },
      { key: 'Ctrl+E', description: 'Export as text', condition: 'has quotes' },
      { key: 'Ctrl+Shift+E', description: 'Export as Markdown', condition: 'has quotes' },
    ],
  };
}

export default useQuoteShortcuts;
