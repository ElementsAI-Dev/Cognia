'use client';

/**
 * useGlobalShortcuts - hook for system-wide keyboard shortcuts (Tauri only)
 * 
 * This is different from useKeyboardShortcuts which handles in-app shortcuts.
 * Global shortcuts work even when the app is not focused.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNativeStore, type ShortcutConfig } from '@/stores/system';
import { isTauri } from '@/lib/native/utils';
import {
  registerShortcut,
  unregisterShortcut,
  unregisterAllShortcuts,
} from '@/lib/native/shortcuts';

export type GlobalShortcutAction = 
  | 'NEW_CHAT'
  | 'TOGGLE_SIDEBAR'
  | 'OPEN_SETTINGS'
  | 'SEARCH'
  | 'TOGGLE_FULLSCREEN'
  | 'FOCUS_APP'
  | 'TOGGLE_ALWAYS_ON_TOP'
  | 'SELECTION_TRIGGER'
  | 'SELECTION_TRANSLATE'
  | 'SELECTION_EXPLAIN';

export interface UseGlobalShortcutsOptions {
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onSearch?: () => void;
  onToggleFullscreen?: () => void;
  onFocusApp?: () => void;
  onToggleAlwaysOnTop?: () => void;
  onSelectionTrigger?: () => void;
  onSelectionTranslate?: () => void;
  onSelectionExplain?: () => void;
  enabled?: boolean;
}

export interface UseGlobalShortcutsReturn {
  shortcuts: ShortcutConfig[];
  isEnabled: boolean;
  registerAll: () => Promise<void>;
  unregisterAll: () => Promise<void>;
  updateShortcut: (id: string, shortcut: string) => Promise<boolean>;
  toggleShortcut: (id: string, enabled: boolean) => Promise<void>;
}

export function useGlobalShortcuts(
  options: UseGlobalShortcutsOptions = {}
): UseGlobalShortcutsReturn {
  const { enabled = true } = options;
  const registeredRef = useRef<Set<string>>(new Set());

  const {
    shortcuts,
    shortcutsEnabled,
    updateShortcut: storeUpdateShortcut,
  } = useNativeStore();

  const getHandler = useCallback(
    (action: string): (() => void) | undefined => {
      switch (action) {
        case 'NEW_CHAT':
          return options.onNewChat;
        case 'TOGGLE_SIDEBAR':
          return options.onToggleSidebar;
        case 'OPEN_SETTINGS':
          return options.onOpenSettings;
        case 'SEARCH':
          return options.onSearch;
        case 'TOGGLE_FULLSCREEN':
          return options.onToggleFullscreen;
        case 'FOCUS_APP':
          return options.onFocusApp;
        case 'TOGGLE_ALWAYS_ON_TOP':
          return options.onToggleAlwaysOnTop;
        case 'SELECTION_TRIGGER':
          return options.onSelectionTrigger;
        case 'SELECTION_TRANSLATE':
          return options.onSelectionTranslate;
        case 'SELECTION_EXPLAIN':
          return options.onSelectionExplain;
        default:
          return undefined;
      }
    },
    [options]
  );

  const registerAllShortcuts = useCallback(async () => {
    if (!isTauri() || !enabled || !shortcutsEnabled) return;

    for (const config of shortcuts) {
      if (!config.enabled) continue;

      const handler = getHandler(config.action);
      if (!handler) continue;

      // Skip if already registered
      if (registeredRef.current.has(config.shortcut)) continue;

      const success = await registerShortcut(config.shortcut, handler);
      if (success) {
        registeredRef.current.add(config.shortcut);
      }
    }
  }, [enabled, shortcutsEnabled, shortcuts, getHandler]);

  const unregisterAllRegistered = useCallback(async () => {
    if (!isTauri()) return;

    await unregisterAllShortcuts();
    registeredRef.current.clear();
  }, []);

  const handleUpdateShortcut = useCallback(
    async (id: string, newShortcut: string): Promise<boolean> => {
      const config = shortcuts.find((s) => s.id === id);
      if (!config) return false;

      // Unregister old shortcut
      if (registeredRef.current.has(config.shortcut)) {
        await unregisterShortcut(config.shortcut);
        registeredRef.current.delete(config.shortcut);
      }

      // Update store
      storeUpdateShortcut(id, { shortcut: newShortcut });

      // Register new shortcut if enabled
      if (config.enabled && shortcutsEnabled) {
        const handler = getHandler(config.action);
        if (handler) {
          const success = await registerShortcut(newShortcut, handler);
          if (success) {
            registeredRef.current.add(newShortcut);
          }
          return success;
        }
      }

      return true;
    },
    [shortcuts, shortcutsEnabled, storeUpdateShortcut, getHandler]
  );

  const handleToggleShortcut = useCallback(
    async (id: string, newEnabled: boolean) => {
      const config = shortcuts.find((s) => s.id === id);
      if (!config) return;

      if (newEnabled && !registeredRef.current.has(config.shortcut)) {
        const handler = getHandler(config.action);
        if (handler) {
          const success = await registerShortcut(config.shortcut, handler);
          if (success) {
            registeredRef.current.add(config.shortcut);
          }
        }
      } else if (!newEnabled && registeredRef.current.has(config.shortcut)) {
        await unregisterShortcut(config.shortcut);
        registeredRef.current.delete(config.shortcut);
      }

      storeUpdateShortcut(id, { enabled: newEnabled });
    },
    [shortcuts, storeUpdateShortcut, getHandler]
  );

  // Register shortcuts on mount and when dependencies change
  useEffect(() => {
    if (enabled && shortcutsEnabled) {
      registerAllShortcuts();
    }

    return () => {
      unregisterAllRegistered();
    };
  }, [enabled, shortcutsEnabled, registerAllShortcuts, unregisterAllRegistered]);

  return {
    shortcuts,
    isEnabled: shortcutsEnabled,
    registerAll: registerAllShortcuts,
    unregisterAll: unregisterAllRegistered,
    updateShortcut: handleUpdateShortcut,
    toggleShortcut: handleToggleShortcut,
  };
}

export default useGlobalShortcuts;
