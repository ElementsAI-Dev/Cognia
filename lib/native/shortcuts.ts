/**
 * Global Shortcuts - System-wide keyboard shortcuts for desktop
 */

import { isTauri } from './utils';

export type ShortcutHandler = () => void;

const registeredShortcuts = new Map<string, ShortcutHandler>();

/**
 * Register a global shortcut
 */
export async function registerShortcut(
  shortcut: string,
  handler: ShortcutHandler
): Promise<boolean> {
  if (!isTauri()) {
    console.warn('Global shortcuts are only available in Tauri');
    return false;
  }

  try {
    const { register: tauriRegister } = await import('@tauri-apps/plugin-global-shortcut');
    
    await tauriRegister(shortcut, () => {
      handler();
    });
    
    registeredShortcuts.set(shortcut, handler);
    return true;
  } catch (error) {
    console.error(`Failed to register shortcut ${shortcut}:`, error);
    return false;
  }
}

/**
 * Unregister a global shortcut
 */
export async function unregisterShortcut(shortcut: string): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { unregister: tauriUnregister } = await import('@tauri-apps/plugin-global-shortcut');
    
    await tauriUnregister(shortcut);
    registeredShortcuts.delete(shortcut);
    return true;
  } catch (error) {
    console.error(`Failed to unregister shortcut ${shortcut}:`, error);
    return false;
  }
}

/**
 * Unregister all global shortcuts
 */
export async function unregisterAllShortcuts(): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
    
    await unregisterAll();
    registeredShortcuts.clear();
    return true;
  } catch (error) {
    console.error('Failed to unregister all shortcuts:', error);
    return false;
  }
}

/**
 * Check if a shortcut is registered
 */
export async function isShortcutRegistered(shortcut: string): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { isRegistered } = await import('@tauri-apps/plugin-global-shortcut');
    return await isRegistered(shortcut);
  } catch {
    return false;
  }
}

/**
 * Get all registered shortcuts
 */
export function getRegisteredShortcuts(): string[] {
  return Array.from(registeredShortcuts.keys());
}

/**
 * Common shortcut definitions for convenience
 */
export const Shortcuts = {
  // Window controls
  TOGGLE_FULLSCREEN: 'F11',
  TOGGLE_DEVTOOLS: 'CommandOrControl+Shift+I',
  RELOAD: 'CommandOrControl+R',
  QUIT: 'CommandOrControl+Q',
  
  // App shortcuts
  NEW_CHAT: 'CommandOrControl+N',
  OPEN_SETTINGS: 'CommandOrControl+,',
  SEARCH: 'CommandOrControl+K',
  TOGGLE_SIDEBAR: 'CommandOrControl+B',
  
  // Edit shortcuts
  UNDO: 'CommandOrControl+Z',
  REDO: 'CommandOrControl+Shift+Z',
  CUT: 'CommandOrControl+X',
  COPY: 'CommandOrControl+C',
  PASTE: 'CommandOrControl+V',
  SELECT_ALL: 'CommandOrControl+A',
  
  // Navigation
  FOCUS_INPUT: 'CommandOrControl+L',
  PREVIOUS_CHAT: 'CommandOrControl+[',
  NEXT_CHAT: 'CommandOrControl+]',
} as const;

export type ShortcutName = keyof typeof Shortcuts;
