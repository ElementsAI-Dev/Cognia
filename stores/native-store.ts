/**
 * Native Store - Zustand store for managing native desktop functionality
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShortcutConfig {
  id: string;
  name: string;
  shortcut: string;
  enabled: boolean;
  action: string;
}

export interface NativeState {
  // System info
  platform: string | null;
  appVersion: string | null;
  isDesktop: boolean;

  // Window state
  isAlwaysOnTop: boolean;
  isFullscreen: boolean;
  isMaximized: boolean;

  // Update state
  updateAvailable: boolean;
  updateVersion: string | null;
  updateDownloading: boolean;
  updateProgress: number;

  // Notification settings
  notificationsEnabled: boolean;
  notificationPermission: boolean;

  // Shortcut settings
  shortcuts: ShortcutConfig[];
  shortcutsEnabled: boolean;
}

export interface NativeActions {
  // System actions
  setSystemInfo: (platform: string | null, appVersion: string | null) => void;
  setIsDesktop: (isDesktop: boolean) => void;

  // Window actions
  setAlwaysOnTop: (enabled: boolean) => void;
  setFullscreen: (enabled: boolean) => void;
  setMaximized: (maximized: boolean) => void;

  // Update actions
  setUpdateAvailable: (available: boolean, version?: string) => void;
  setUpdateDownloading: (downloading: boolean) => void;
  setUpdateProgress: (progress: number) => void;
  clearUpdateState: () => void;

  // Notification actions
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationPermission: (granted: boolean) => void;

  // Shortcut actions
  setShortcuts: (shortcuts: ShortcutConfig[]) => void;
  addShortcut: (shortcut: ShortcutConfig) => void;
  updateShortcut: (id: string, config: Partial<ShortcutConfig>) => void;
  removeShortcut: (id: string) => void;
  setShortcutsEnabled: (enabled: boolean) => void;

  // Reset
  reset: () => void;
}

const defaultShortcuts: ShortcutConfig[] = [
  {
    id: 'new-chat',
    name: 'New Chat',
    shortcut: 'CommandOrControl+N',
    enabled: true,
    action: 'NEW_CHAT',
  },
  {
    id: 'toggle-sidebar',
    name: 'Toggle Sidebar',
    shortcut: 'CommandOrControl+B',
    enabled: true,
    action: 'TOGGLE_SIDEBAR',
  },
  {
    id: 'open-settings',
    name: 'Open Settings',
    shortcut: 'CommandOrControl+,',
    enabled: true,
    action: 'OPEN_SETTINGS',
  },
  {
    id: 'search',
    name: 'Search',
    shortcut: 'CommandOrControl+K',
    enabled: true,
    action: 'SEARCH',
  },
  {
    id: 'toggle-fullscreen',
    name: 'Toggle Fullscreen',
    shortcut: 'F11',
    enabled: true,
    action: 'TOGGLE_FULLSCREEN',
  },
];

const initialState: NativeState = {
  platform: null,
  appVersion: null,
  isDesktop: false,
  isAlwaysOnTop: false,
  isFullscreen: false,
  isMaximized: false,
  updateAvailable: false,
  updateVersion: null,
  updateDownloading: false,
  updateProgress: 0,
  notificationsEnabled: true,
  notificationPermission: false,
  shortcuts: defaultShortcuts,
  shortcutsEnabled: true,
};

export const useNativeStore = create<NativeState & NativeActions>()(
  persist(
    (set) => ({
      ...initialState,

      setSystemInfo: (platform, appVersion) =>
        set({ platform, appVersion }),

      setIsDesktop: (isDesktop) =>
        set({ isDesktop }),

      setAlwaysOnTop: (isAlwaysOnTop) =>
        set({ isAlwaysOnTop }),

      setFullscreen: (isFullscreen) =>
        set({ isFullscreen }),

      setMaximized: (isMaximized) =>
        set({ isMaximized }),

      setUpdateAvailable: (updateAvailable, updateVersion) =>
        set({ updateAvailable, updateVersion: updateVersion ?? null }),

      setUpdateDownloading: (updateDownloading) =>
        set({ updateDownloading }),

      setUpdateProgress: (updateProgress) =>
        set({ updateProgress }),

      clearUpdateState: () =>
        set({
          updateAvailable: false,
          updateVersion: null,
          updateDownloading: false,
          updateProgress: 0,
        }),

      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),

      setNotificationPermission: (notificationPermission) =>
        set({ notificationPermission }),

      setShortcuts: (shortcuts) =>
        set({ shortcuts }),

      addShortcut: (shortcut) =>
        set((state) => ({
          shortcuts: [...state.shortcuts, shortcut],
        })),

      updateShortcut: (id, config) =>
        set((state) => ({
          shortcuts: state.shortcuts.map((s) =>
            s.id === id ? { ...s, ...config } : s
          ),
        })),

      removeShortcut: (id) =>
        set((state) => ({
          shortcuts: state.shortcuts.filter((s) => s.id !== id),
        })),

      setShortcutsEnabled: (shortcutsEnabled) =>
        set({ shortcutsEnabled }),

      reset: () => set(initialState),
    }),
    {
      name: 'native-store',
      partialize: (state) => ({
        isAlwaysOnTop: state.isAlwaysOnTop,
        notificationsEnabled: state.notificationsEnabled,
        shortcuts: state.shortcuts,
        shortcutsEnabled: state.shortcutsEnabled,
      }),
    }
  )
);
