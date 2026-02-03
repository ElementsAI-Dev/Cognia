'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useUIStore, useSessionStore, useSettingsStore } from '@/stores';
import { useRouter } from 'next/navigation';
import { DEFAULT_SHORTCUTS, parseShortcut } from '@/lib/ui/keyboard-constants';
import type { ShortcutCategory } from '@/types/ui/keyboard';

type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers?: ModifierKey[];
  action: () => void;
  description: string;
  category: ShortcutCategory;
  enabled?: boolean;
  isCustomized?: boolean;
}

interface KeyboardShortcutsHandlerProps {
  onNewMessage?: () => void;
  onStopGeneration?: () => void;
  onRegenerateResponse?: () => void;
  onCopyLastResponse?: () => void;
  onFocusInput?: () => void;
  onScrollToBottom?: () => void;
  onToggleArtifactPanel?: () => void;
  additionalShortcuts?: KeyboardShortcut[];
}

export function useKeyboardShortcuts({
  onNewMessage,
  onStopGeneration,
  onRegenerateResponse,
  onCopyLastResponse,
  onFocusInput,
  onScrollToBottom,
  onToggleArtifactPanel,
  additionalShortcuts = [],
}: KeyboardShortcutsHandlerProps) {
  const router = useRouter();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const setKeyboardShortcutsOpen = useUIStore((state) => state.setKeyboardShortcutsOpen);
  const openModal = useUIStore((state) => state.openModal);
  const createSession = useSessionStore((state) => state.createSession);
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const toggleSimplifiedMode = useSettingsStore((state) => state.toggleSimplifiedMode);

  // Read custom shortcuts from settings store
  const customShortcuts = useSettingsStore((state) => state.customShortcuts);
  const disabledShortcuts = useSettingsStore((state) => state.disabledShortcuts);

  // Navigate to adjacent session
  const navigateSession = useCallback((direction: 'prev' | 'next') => {
    if (!activeSessionId || sessions.length === 0) return;
    
    const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(sessions.length - 1, currentIndex + 1);
    
    if (newIndex !== currentIndex) {
      setActiveSession(sessions[newIndex].id);
    }
  }, [activeSessionId, sessions, setActiveSession]);

  // Map shortcut IDs to their action handlers
  const actionMap: Record<string, { action: () => void; enabled?: boolean }> = useMemo(() => ({
    toggleSidebar: { action: toggleSidebar },
    commandPalette: { action: () => setCommandPaletteOpen(true) },
    openSettings: { action: () => openModal('settings') },
    openProjects: { action: () => router.push('/projects') },
    prevSession: { action: () => navigateSession('prev') },
    nextSession: { action: () => navigateSession('next') },
    newChat: { action: () => createSession() },
    sendMessage: { action: () => onNewMessage?.(), enabled: !!onNewMessage },
    stopGeneration: { action: () => onStopGeneration?.(), enabled: !!onStopGeneration },
    regenerate: { action: () => onRegenerateResponse?.(), enabled: !!onRegenerateResponse },
    copyLastResponse: { action: () => onCopyLastResponse?.(), enabled: !!onCopyLastResponse },
    focusInput: { action: () => onFocusInput?.(), enabled: !!onFocusInput },
    scrollToBottom: { action: () => onScrollToBottom?.(), enabled: !!onScrollToBottom },
    showShortcuts: { action: () => setKeyboardShortcutsOpen(true) },
    toggleArtifactPanel: { action: () => onToggleArtifactPanel?.(), enabled: !!onToggleArtifactPanel },
    toggleSimplifiedMode: { action: toggleSimplifiedMode },
  }), [
    toggleSidebar, setCommandPaletteOpen, openModal, router, navigateSession,
    createSession, onNewMessage, onStopGeneration, onRegenerateResponse,
    onCopyLastResponse, onFocusInput, onScrollToBottom, setKeyboardShortcutsOpen,
    onToggleArtifactPanel, toggleSimplifiedMode
  ]);

  // Build shortcuts from DEFAULT_SHORTCUTS with custom overrides
  const shortcuts: KeyboardShortcut[] = useMemo(() => {
    const result: KeyboardShortcut[] = [];

    for (const def of DEFAULT_SHORTCUTS) {
      const handler = actionMap[def.id];
      if (!handler) continue;

      // Check if this shortcut is disabled
      if (disabledShortcuts?.[def.id]) continue;

      // Check if action is available
      if (handler.enabled === false) continue;

      // Get the shortcut key (custom or default)
      const shortcutKey = customShortcuts?.[def.id] || def.defaultKey;
      const { modifiers, key } = parseShortcut(shortcutKey);

      result.push({
        id: def.id,
        key,
        modifiers: modifiers as ModifierKey[],
        action: handler.action,
        description: def.defaultLabel,
        category: def.category,
        enabled: true,
        isCustomized: !!customShortcuts?.[def.id],
      });
    }

    // Add any additional shortcuts passed as props
    return [...result, ...additionalShortcuts];
  }, [actionMap, customShortcuts, disabledShortcuts, additionalShortcuts]);

  // Handle key events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;

      for (const shortcut of shortcuts) {
        const modifiers = shortcut.modifiers || [];
        
        const ctrlMatch = modifiers.includes('ctrl') === (e.ctrlKey || e.metaKey);
        const altMatch = modifiers.includes('alt') === e.altKey;
        const shiftMatch = modifiers.includes('shift') === e.shiftKey;
        const _metaMatch = modifiers.includes('meta') === e.metaKey;
        
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          // Allow some shortcuts even when typing
          const allowWhileTyping = ['Escape', 'Enter'].includes(shortcut.key) ||
                                   modifiers.includes('ctrl');
          
          if (!isTyping || allowWhileTyping) {
            e.preventDefault();
            shortcut.action();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return { shortcuts };
}

// Export grouped shortcuts for display
export function getShortcutsByCategory(shortcuts: KeyboardShortcut[]) {
  return {
    navigation: shortcuts.filter(s => s.category === 'navigation'),
    chat: shortcuts.filter(s => s.category === 'chat'),
    editing: shortcuts.filter(s => s.category === 'editing'),
    system: shortcuts.filter(s => s.category === 'system'),
  };
}

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];
  
  if (shortcut.modifiers?.includes('ctrl')) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.modifiers?.includes('alt')) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.modifiers?.includes('shift')) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.modifiers?.includes('meta')) parts.push(isMac ? '⌘' : 'Win');
  
  // Format key display
  let keyDisplay = shortcut.key;
  if (keyDisplay === 'escape') keyDisplay = 'Esc';
  else if (keyDisplay === 'enter') keyDisplay = isMac ? '↵' : 'Enter';
  else keyDisplay = keyDisplay.charAt(0).toUpperCase() + keyDisplay.slice(1);
  
  parts.push(keyDisplay);
  
  return parts.join(isMac ? '' : '+');
}

export default useKeyboardShortcuts;
