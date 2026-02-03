/**
 * Keyboard shortcuts constants
 * Single source of truth for all keyboard shortcuts in the application
 */

import type { ShortcutDefinition, ShortcutCategory } from '@/types/ui/keyboard';

/**
 * Category colors for keyboard shortcuts display
 */
export const CATEGORY_COLORS: Record<ShortcutCategory, string> = {
  navigation: 'bg-blue-500',
  chat: 'bg-green-500',
  editing: 'bg-purple-500',
  system: 'bg-orange-500',
};

/**
 * Category icons for keyboard shortcuts display (Lucide icon names)
 */
export const CATEGORY_ICONS: Record<ShortcutCategory, string> = {
  navigation: 'Compass',
  chat: 'MessageSquare',
  editing: 'Edit3',
  system: 'Settings',
};

/**
 * Parse shortcut string to modifiers and key
 * e.g., "Ctrl+Shift+N" -> { modifiers: ['ctrl', 'shift'], key: 'n' }
 */
export function parseShortcut(shortcutStr: string): { modifiers: string[]; key: string } {
  const parts = shortcutStr.split('+').map(p => p.trim().toLowerCase());
  const modifiers: string[] = [];
  let key = '';

  for (const part of parts) {
    if (['ctrl', 'control', 'cmd', 'command', 'meta'].includes(part)) {
      modifiers.push('ctrl');
    } else if (['alt', 'option'].includes(part)) {
      modifiers.push('alt');
    } else if (['shift'].includes(part)) {
      modifiers.push('shift');
    } else {
      key = part;
    }
  }

  return { modifiers, key };
}

/**
 * Format shortcut for display with platform-specific symbols
 */
export function formatShortcutDisplay(shortcutStr: string, isMac: boolean = false): string {
  const parts = shortcutStr.split('+').map(p => p.trim());
  const result: string[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (['ctrl', 'control'].includes(lower)) {
      result.push(isMac ? '⌃' : 'Ctrl');
    } else if (['cmd', 'command', 'meta'].includes(lower)) {
      result.push(isMac ? '⌘' : 'Win');
    } else if (['alt', 'option'].includes(lower)) {
      result.push(isMac ? '⌥' : 'Alt');
    } else if (lower === 'shift') {
      result.push(isMac ? '⇧' : 'Shift');
    } else if (lower === 'enter') {
      result.push(isMac ? '↵' : 'Enter');
    } else if (lower === 'escape') {
      result.push('Esc');
    } else if (lower === 'backspace') {
      result.push(isMac ? '⌫' : 'Backspace');
    } else if (lower === 'delete') {
      result.push('Del');
    } else {
      result.push(part.charAt(0).toUpperCase() + part.slice(1));
    }
  }

  return result.join(isMac ? '' : '+');
}

/**
 * Default keyboard shortcuts configuration
 * This is the single source of truth for all app shortcuts
 */
export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Navigation shortcuts
  { id: 'toggleSidebar', labelKey: 'toggleSidebar', defaultLabel: 'Toggle Sidebar', defaultKey: 'Ctrl+B', category: 'navigation' },
  { id: 'commandPalette', labelKey: 'commandPalette', defaultLabel: 'Command Palette', defaultKey: 'Ctrl+K', category: 'navigation' },
  { id: 'openSettings', labelKey: 'openSettings', defaultLabel: 'Open Settings', defaultKey: 'Ctrl+,', category: 'navigation' },
  { id: 'openProjects', labelKey: 'openProjects', defaultLabel: 'Open Projects', defaultKey: 'Ctrl+Shift+P', category: 'navigation' },
  { id: 'prevSession', labelKey: 'prevSession', defaultLabel: 'Previous Session', defaultKey: 'Ctrl+[', category: 'navigation' },
  { id: 'nextSession', labelKey: 'nextSession', defaultLabel: 'Next Session', defaultKey: 'Ctrl+]', category: 'navigation' },

  // Chat shortcuts
  { id: 'newChat', labelKey: 'newChat', defaultLabel: 'New Chat', defaultKey: 'Ctrl+N', category: 'chat' },
  { id: 'sendMessage', labelKey: 'sendMessage', defaultLabel: 'Send Message', defaultKey: 'Ctrl+Enter', category: 'chat' },
  { id: 'stopGeneration', labelKey: 'stopGeneration', defaultLabel: 'Stop Generation', defaultKey: 'Escape', category: 'chat' },
  { id: 'regenerate', labelKey: 'regenerate', defaultLabel: 'Regenerate Response', defaultKey: 'Ctrl+Shift+R', category: 'chat' },
  { id: 'copyLastResponse', labelKey: 'copyLastResponse', defaultLabel: 'Copy Last Response', defaultKey: 'Ctrl+Shift+C', category: 'chat' },

  // Editing shortcuts
  { id: 'focusInput', labelKey: 'focusInput', defaultLabel: 'Focus Input', defaultKey: 'Ctrl+/', category: 'editing' },
  { id: 'scrollToBottom', labelKey: 'scrollToBottom', defaultLabel: 'Scroll to Bottom', defaultKey: 'Ctrl+End', category: 'editing' },

  // System shortcuts
  { id: 'showShortcuts', labelKey: 'showShortcuts', defaultLabel: 'Show Shortcuts', defaultKey: 'Ctrl+?', category: 'system' },
  { id: 'toggleArtifactPanel', labelKey: 'toggleArtifactPanel', defaultLabel: 'Toggle Artifact Panel', defaultKey: 'Ctrl+Shift+I', category: 'system' },
  { id: 'toggleSimplifiedMode', labelKey: 'toggleSimplifiedMode', defaultLabel: 'Toggle Simplified Mode', defaultKey: 'Ctrl+Shift+S', category: 'system' },
];

/**
 * Get shortcut by ID
 */
export function getShortcutById(id: string): ShortcutDefinition | undefined {
  return DEFAULT_SHORTCUTS.find(s => s.id === id);
}

/**
 * Get shortcuts grouped by category
 */
export function getShortcutsByCategory(): Record<ShortcutCategory, ShortcutDefinition[]> {
  return DEFAULT_SHORTCUTS.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<ShortcutCategory, ShortcutDefinition[]>
  );
}
