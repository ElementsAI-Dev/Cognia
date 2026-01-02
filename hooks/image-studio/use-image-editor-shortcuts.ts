import { useEffect, useCallback } from 'react';

export interface ImageEditorShortcuts {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onToggleFullscreen?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onDeselect?: () => void;
  enabled?: boolean;
}

/**
 * Custom hook for handling keyboard shortcuts in image editor components
 * Provides standard shortcuts for common editing operations
 */
export function useImageEditorShortcuts({
  onUndo,
  onRedo,
  onSave,
  onCancel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleFullscreen,
  onDelete,
  onCopy,
  onPaste,
  onSelectAll,
  onDeselect,
  enabled = true,
}: ImageEditorShortcuts) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl/Cmd + Z
      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl + Y
      if ((modKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Save: Ctrl/Cmd + S
      if (modKey && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Cancel: Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
        return;
      }

      // Zoom in: Ctrl/Cmd + Plus or =
      if (modKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        onZoomIn?.();
        return;
      }

      // Zoom out: Ctrl/Cmd + Minus
      if (modKey && e.key === '-') {
        e.preventDefault();
        onZoomOut?.();
        return;
      }

      // Zoom reset: Ctrl/Cmd + 0
      if (modKey && e.key === '0') {
        e.preventDefault();
        onZoomReset?.();
        return;
      }

      // Fullscreen: F11 or Ctrl/Cmd + Shift + F
      if (e.key === 'F11' || (modKey && e.shiftKey && e.key === 'f')) {
        e.preventDefault();
        onToggleFullscreen?.();
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete?.();
        return;
      }

      // Copy: Ctrl/Cmd + C
      if (modKey && e.key === 'c') {
        e.preventDefault();
        onCopy?.();
        return;
      }

      // Paste: Ctrl/Cmd + V
      if (modKey && e.key === 'v') {
        e.preventDefault();
        onPaste?.();
        return;
      }

      // Select all: Ctrl/Cmd + A
      if (modKey && e.key === 'a') {
        e.preventDefault();
        onSelectAll?.();
        return;
      }

      // Deselect: Ctrl/Cmd + D
      if (modKey && e.key === 'd') {
        e.preventDefault();
        onDeselect?.();
        return;
      }
    },
    [
      enabled,
      onUndo,
      onRedo,
      onSave,
      onCancel,
      onZoomIn,
      onZoomOut,
      onZoomReset,
      onToggleFullscreen,
      onDelete,
      onCopy,
      onPaste,
      onSelectAll,
      onDeselect,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Get shortcut display string for tooltips
 */
export function getShortcutDisplay(action: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  const shortcuts: Record<string, string> = {
    undo: `${mod}+Z`,
    redo: isMac ? `${mod}+Shift+Z` : 'Ctrl+Y',
    save: `${mod}+S`,
    cancel: 'Esc',
    zoomIn: `${mod}++`,
    zoomOut: `${mod}+-`,
    zoomReset: `${mod}+0`,
    fullscreen: 'F11',
    delete: 'Del',
    copy: `${mod}+C`,
    paste: `${mod}+V`,
    selectAll: `${mod}+A`,
    deselect: `${mod}+D`,
  };

  return shortcuts[action] || '';
}

export default useImageEditorShortcuts;
