/**
 * Keyboard shortcuts constants
 * Extracted from components/settings/system/keyboard-settings.tsx
 * and components/settings/system/keyboard-shortcuts-settings.tsx
 */

import type { KeyboardShortcut } from '@/hooks/ui';
import type { ShortcutDefinition } from '@/types/ui/keyboard';

/**
 * Category colors for keyboard shortcuts display
 */
export const CATEGORY_COLORS: Record<KeyboardShortcut['category'], string> = {
  navigation: 'bg-blue-500',
  chat: 'bg-green-500',
  editing: 'bg-purple-500',
  system: 'bg-orange-500',
};

/**
 * Default keyboard shortcuts configuration
 */
export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Chat shortcuts
  { id: 'newChat', labelKey: 'newChat', defaultLabel: 'New Chat', defaultKey: 'Ctrl+N', category: 'chat' },
  { id: 'sendMessage', labelKey: 'sendMessage', defaultLabel: 'Send Message', defaultKey: 'Enter', category: 'chat' },
  { id: 'regenerate', labelKey: 'regenerate', defaultLabel: 'Regenerate Response', defaultKey: 'Ctrl+Shift+R', category: 'chat' },
  { id: 'stopGeneration', labelKey: 'stopGeneration', defaultLabel: 'Stop Generation', defaultKey: 'Escape', category: 'chat' },
  { id: 'clearChat', labelKey: 'clearChat', defaultLabel: 'Clear Chat', defaultKey: 'Ctrl+Shift+Delete', category: 'chat' },
  
  // Navigation shortcuts
  { id: 'toggleSidebar', labelKey: 'toggleSidebar', defaultLabel: 'Toggle Sidebar', defaultKey: 'Ctrl+B', category: 'navigation' },
  { id: 'openSettings', labelKey: 'openSettings', defaultLabel: 'Open Settings', defaultKey: 'Ctrl+,', category: 'navigation' },
  { id: 'focusInput', labelKey: 'focusInput', defaultLabel: 'Focus Input', defaultKey: 'Ctrl+/', category: 'navigation' },
  { id: 'searchChats', labelKey: 'searchChats', defaultLabel: 'Search Chats', defaultKey: 'Ctrl+K', category: 'navigation' },
  
  // Editing shortcuts
  { id: 'copyLastMessage', labelKey: 'copyLastMessage', defaultLabel: 'Copy Last Message', defaultKey: 'Ctrl+Shift+C', category: 'editing' },
  { id: 'editLastMessage', labelKey: 'editLastMessage', defaultLabel: 'Edit Last Message', defaultKey: 'Ctrl+Shift+E', category: 'editing' },
];
