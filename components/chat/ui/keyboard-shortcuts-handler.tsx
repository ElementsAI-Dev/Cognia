'use client';

import { useEffect, useCallback } from 'react';
import { useUIStore, useSessionStore } from '@/stores';
import { useRouter } from 'next/navigation';

type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';
type ShortcutCategory = 'navigation' | 'chat' | 'editing' | 'general';

export interface KeyboardShortcut {
  key: string;
  modifiers?: ModifierKey[];
  action: () => void;
  description: string;
  category: ShortcutCategory;
  enabled?: boolean;
}

interface KeyboardShortcutsHandlerProps {
  onNewMessage?: () => void;
  onStopGeneration?: () => void;
  onRegenerateResponse?: () => void;
  onCopyLastResponse?: () => void;
  onFocusInput?: () => void;
  onScrollToBottom?: () => void;
  onToggleArtifactPanel?: () => void;
  customShortcuts?: KeyboardShortcut[];
}

export function useKeyboardShortcuts({
  onNewMessage,
  onStopGeneration,
  onRegenerateResponse,
  onCopyLastResponse,
  onFocusInput,
  onScrollToBottom,
  onToggleArtifactPanel,
  customShortcuts = [],
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

  // Helper to create typed modifiers
  const mods = (...keys: ModifierKey[]): ModifierKey[] => keys;

  // Define all shortcuts with explicit typing
  const shortcuts = [
    // Navigation shortcuts
    {
      key: 'b',
      modifiers: mods('ctrl'),
      action: toggleSidebar,
      description: 'Toggle sidebar',
      category: 'navigation',
    },
    {
      key: 'k',
      modifiers: mods('ctrl'),
      action: () => setCommandPaletteOpen(true),
      description: 'Open command palette',
      category: 'navigation',
    },
    {
      key: 'p',
      modifiers: mods('ctrl', 'shift'),
      action: () => router.push('/projects'),
      description: 'Go to Projects',
      category: 'navigation',
    },
    {
      key: ',',
      modifiers: mods('ctrl'),
      action: () => openModal('settings'),
      description: 'Open Settings',
      category: 'navigation',
    },
    {
      key: '[',
      modifiers: mods('ctrl'),
      action: () => navigateSession('prev'),
      description: 'Previous session',
      category: 'navigation',
    },
    {
      key: ']',
      modifiers: mods('ctrl'),
      action: () => navigateSession('next'),
      description: 'Next session',
      category: 'navigation',
    },

    // Chat shortcuts
    {
      key: 'n',
      modifiers: mods('ctrl'),
      action: () => createSession(),
      description: 'New chat',
      category: 'chat',
    },
    {
      key: 'Enter',
      modifiers: mods('ctrl'),
      action: () => onNewMessage?.(),
      description: 'Send message',
      category: 'chat',
      enabled: !!onNewMessage,
    },
    {
      key: 'Escape',
      action: () => onStopGeneration?.(),
      description: 'Stop generation',
      category: 'chat',
      enabled: !!onStopGeneration,
    },
    {
      key: 'r',
      modifiers: mods('ctrl', 'shift'),
      action: () => onRegenerateResponse?.(),
      description: 'Regenerate response',
      category: 'chat',
      enabled: !!onRegenerateResponse,
    },
    {
      key: 'c',
      modifiers: mods('ctrl', 'shift'),
      action: () => onCopyLastResponse?.(),
      description: 'Copy last response',
      category: 'chat',
      enabled: !!onCopyLastResponse,
    },

    // Editing shortcuts
    {
      key: '/',
      modifiers: mods('ctrl'),
      action: () => onFocusInput?.(),
      description: 'Focus input',
      category: 'editing',
      enabled: !!onFocusInput,
    },
    {
      key: 'End',
      modifiers: mods('ctrl'),
      action: () => onScrollToBottom?.(),
      description: 'Scroll to bottom',
      category: 'editing',
      enabled: !!onScrollToBottom,
    },

    // General shortcuts
    {
      key: '?',
      modifiers: mods('ctrl'),
      action: () => setKeyboardShortcutsOpen(true),
      description: 'Show keyboard shortcuts',
      category: 'general',
    },
    {
      key: 'i',
      modifiers: mods('ctrl', 'shift'),
      action: () => onToggleArtifactPanel?.(),
      description: 'Toggle artifact panel',
      category: 'general',
      enabled: !!onToggleArtifactPanel,
    },

    // Add custom shortcuts
    ...customShortcuts,
  ].filter(s => s.enabled !== false);

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
    general: shortcuts.filter(s => s.category === 'general'),
  };
}

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.modifiers?.includes('ctrl')) parts.push('Ctrl');
  if (shortcut.modifiers?.includes('alt')) parts.push('Alt');
  if (shortcut.modifiers?.includes('shift')) parts.push('Shift');
  if (shortcut.modifiers?.includes('meta')) parts.push('⌘');
  
  parts.push(shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1));
  
  return parts.join('+');
}

export default useKeyboardShortcuts;
