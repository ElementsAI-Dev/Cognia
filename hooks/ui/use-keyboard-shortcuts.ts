'use client';

/**
 * useKeyboardShortcuts - hook for global keyboard shortcuts
 */

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore, useUIStore, useArtifactStore } from '@/stores';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command key on Mac
  description: string;
  category: 'navigation' | 'chat' | 'editing' | 'system';
  action: () => void;
}

// Check if running on Mac
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// Format shortcut for display
export function formatShortcut(
  shortcut: Omit<KeyboardShortcut, 'description' | 'category' | 'action'>
): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Win');

  // Format key
  let keyDisplay = shortcut.key.toUpperCase();
  if (shortcut.key === ' ') keyDisplay = 'Space';
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';
  if (shortcut.key === 'ArrowUp') keyDisplay = '↑';
  if (shortcut.key === 'ArrowDown') keyDisplay = '↓';
  if (shortcut.key === 'ArrowLeft') keyDisplay = '←';
  if (shortcut.key === 'ArrowRight') keyDisplay = '→';
  if (shortcut.key === 'Enter') keyDisplay = '↵';
  if (shortcut.key === 'Backspace') keyDisplay = '⌫';
  if (shortcut.key === 'Delete') keyDisplay = 'Del';

  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
}

interface UseKeyboardShortcutsOptions {
  onNewChat?: () => void;
  onFocusInput?: () => void;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onOpenProjects?: () => void;
  onStopGeneration?: () => void;
  onToggleCanvas?: () => void;
  onToggleArtifact?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNewChat,
  onFocusInput,
  onToggleSidebar,
  onOpenSettings,
  onOpenProjects,
  onStopGeneration,
  onToggleCanvas,
  onToggleArtifact,
  enabled = true,
}: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const createSession = useSessionStore((state) => state.createSession);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const setKeyboardShortcutsOpen = useUIStore((state) => state.setKeyboardShortcutsOpen);
  const panelOpen = useArtifactStore((state) => state.panelOpen);
  const openPanel = useArtifactStore((state) => state.openPanel);
  const closePanel = useArtifactStore((state) => state.closePanel);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields (unless it's a global shortcut)
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl/Cmd + K - Command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Escape - Stop generation or close dialogs
      if (e.key === 'Escape') {
        onStopGeneration?.();
        return;
      }

      // Ctrl/Cmd + N - New chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (onNewChat) {
          onNewChat();
        } else {
          createSession();
        }
        return;
      }

      // Ctrl/Cmd + B - Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        onToggleSidebar?.();
        return;
      }

      // Ctrl/Cmd + , - Open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        if (onOpenSettings) {
          onOpenSettings();
        } else {
          router.push('/settings');
        }
        return;
      }

      // Ctrl/Cmd + P - Open projects
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && e.shiftKey) {
        e.preventDefault();
        if (onOpenProjects) {
          onOpenProjects();
        } else {
          router.push('/projects');
        }
        return;
      }

      // / - Focus input (only when not in input field)
      if (e.key === '/' && !isInputField) {
        e.preventDefault();
        onFocusInput?.();
        return;
      }

      // ? - Open keyboard shortcuts help (only when not in input field)
      if (e.key === '?' && !isInputField) {
        e.preventDefault();
        setKeyboardShortcutsOpen(true);
        return;
      }

      // Ctrl/Cmd + . - Toggle Canvas panel
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        if (onToggleCanvas) {
          onToggleCanvas();
        } else {
          if (panelOpen) {
            closePanel();
          } else {
            openPanel('canvas');
          }
        }
        return;
      }

      // Ctrl/Cmd + ; - Toggle Artifact panel
      if ((e.ctrlKey || e.metaKey) && e.key === ';') {
        e.preventDefault();
        if (onToggleArtifact) {
          onToggleArtifact();
        } else {
          if (panelOpen) {
            closePanel();
          } else {
            openPanel('artifact');
          }
        }
        return;
      }

      // Ctrl/Cmd + Enter - Submit (handled by individual components)
    },
    [
      enabled,
      createSession,
      router,
      setCommandPaletteOpen,
      setKeyboardShortcutsOpen,
      onNewChat,
      onFocusInput,
      onToggleSidebar,
      onOpenSettings,
      onOpenProjects,
      onStopGeneration,
      onToggleCanvas,
      onToggleArtifact,
      panelOpen,
      openPanel,
      closePanel,
    ]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  // Return list of available shortcuts for documentation
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrl: true,
      description: 'Open command palette',
      category: 'system',
      action: () => setCommandPaletteOpen(true),
    },
    {
      key: 'n',
      ctrl: true,
      description: 'New chat',
      category: 'chat',
      action: () => (onNewChat ? onNewChat() : createSession()),
    },
    {
      key: 'b',
      ctrl: true,
      description: 'Toggle sidebar',
      category: 'navigation',
      action: () => onToggleSidebar?.(),
    },
    {
      key: ',',
      ctrl: true,
      description: 'Open settings',
      category: 'navigation',
      action: () => router.push('/settings'),
    },
    {
      key: 'p',
      ctrl: true,
      shift: true,
      description: 'Open projects',
      category: 'navigation',
      action: () => router.push('/projects'),
    },
    {
      key: '/',
      description: 'Focus chat input',
      category: 'chat',
      action: () => onFocusInput?.(),
    },
    {
      key: 'Escape',
      description: 'Stop generation',
      category: 'chat',
      action: () => onStopGeneration?.(),
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      category: 'system',
      action: () => setKeyboardShortcutsOpen(true),
    },
    {
      key: 'Enter',
      ctrl: true,
      description: 'Send message',
      category: 'chat',
      action: () => {},
    },
    {
      key: '.',
      ctrl: true,
      description: 'Toggle Canvas panel',
      category: 'navigation',
      action: () => (panelOpen ? closePanel() : openPanel('canvas')),
    },
    {
      key: ';',
      ctrl: true,
      description: 'Toggle Artifact panel',
      category: 'navigation',
      action: () => (panelOpen ? closePanel() : openPanel('artifact')),
    },
  ];

  return { shortcuts };
}

export default useKeyboardShortcuts;
