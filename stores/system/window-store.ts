/**
 * Window Store - manages Tauri window customization settings
 * Provides comprehensive window control APIs for borderless window mode
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CursorIcon =
  | 'default'
  | 'pointer'
  | 'crosshair'
  | 'text'
  | 'move'
  | 'wait'
  | 'help'
  | 'progress'
  | 'notAllowed'
  | 'grab'
  | 'grabbing'
  | 'colResize'
  | 'rowResize'
  | 'nResize'
  | 'eResize'
  | 'sResize'
  | 'wResize';

export type UserAttentionType = 'critical' | 'informational';

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowConstraints {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface TitleBarCustomLayout {
  left: string[];
  center: string[];
  right: string[];
}

export interface WindowState {
  // Window state flags
  isMaximized: boolean;
  isMinimized: boolean;
  isFullscreen: boolean;
  isAlwaysOnTop: boolean;
  isFocused: boolean;
  isVisible: boolean;
  isDecorated: boolean;
  isResizable: boolean;
  isClosable: boolean;
  isMaximizable: boolean;
  isMinimizable: boolean;

  // Window properties
  title: string;
  size: WindowSize;
  position: WindowPosition;
  constraints: WindowConstraints;
  scaleFactor: number;

  // Cursor settings
  cursorIcon: CursorIcon;
  cursorVisible: boolean;
  cursorGrab: boolean;
  ignoreCursorEvents: boolean;

  // Other settings
  skipTaskbar: boolean;
  contentProtected: boolean;
  shadow: boolean;
  visibleOnAllWorkspaces: boolean;
  progressBar: number | null; // 0-100 or null for no progress
}

export interface WindowPreferences {
  // Saved preferences that persist across sessions
  rememberPosition: boolean;
  rememberSize: boolean;
  startMaximized: boolean;
  startCentered: boolean;
  defaultAlwaysOnTop: boolean;
  titleBarHeight: number;
  enableDoubleClickMaximize: boolean;
  enableDragToMove: boolean;
  titleBarCustomLayout: TitleBarCustomLayout;
}

interface WindowStoreState extends WindowState {
  // Preferences
  preferences: WindowPreferences;

  // State setters
  setIsMaximized: (value: boolean) => void;
  setIsMinimized: (value: boolean) => void;
  setIsFullscreen: (value: boolean) => void;
  setIsAlwaysOnTop: (value: boolean) => void;
  setIsFocused: (value: boolean) => void;
  setIsVisible: (value: boolean) => void;
  setIsDecorated: (value: boolean) => void;
  setIsResizable: (value: boolean) => void;
  setIsClosable: (value: boolean) => void;
  setIsMaximizable: (value: boolean) => void;
  setIsMinimizable: (value: boolean) => void;

  // Property setters
  setTitle: (title: string) => void;
  setSize: (size: WindowSize) => void;
  setPosition: (position: WindowPosition) => void;
  setConstraints: (constraints: WindowConstraints) => void;
  setScaleFactor: (factor: number) => void;

  // Cursor setters
  setCursorIcon: (icon: CursorIcon) => void;
  setCursorVisible: (visible: boolean) => void;
  setCursorGrab: (grab: boolean) => void;
  setIgnoreCursorEvents: (ignore: boolean) => void;

  // Other setters
  setSkipTaskbar: (skip: boolean) => void;
  setContentProtected: (protect: boolean) => void;
  setShadow: (shadow: boolean) => void;
  setVisibleOnAllWorkspaces: (visible: boolean) => void;
  setProgressBar: (progress: number | null) => void;

  // Preference setters
  setPreferences: (preferences: Partial<WindowPreferences>) => void;
  setRememberPosition: (remember: boolean) => void;
  setRememberSize: (remember: boolean) => void;
  setStartMaximized: (maximized: boolean) => void;
  setStartCentered: (centered: boolean) => void;
  setDefaultAlwaysOnTop: (alwaysOnTop: boolean) => void;
  setTitleBarHeight: (height: number) => void;
  setEnableDoubleClickMaximize: (enable: boolean) => void;
  setEnableDragToMove: (enable: boolean) => void;
  setTitleBarCustomLayout: (layout: TitleBarCustomLayout) => void;

  // Bulk state update
  updateWindowState: (state: Partial<WindowState>) => void;

  // Reset
  resetPreferences: () => void;
}

const defaultPreferences: WindowPreferences = {
  rememberPosition: true,
  rememberSize: true,
  startMaximized: false,
  startCentered: true,
  defaultAlwaysOnTop: false,
  titleBarHeight: 32,
  enableDoubleClickMaximize: true,
  enableDragToMove: true,
  titleBarCustomLayout: {
    left: [],
    center: [],
    right: [],
  },
};

const initialWindowState: WindowState = {
  isMaximized: false,
  isMinimized: false,
  isFullscreen: false,
  isAlwaysOnTop: false,
  isFocused: true,
  isVisible: true,
  isDecorated: false,
  isResizable: true,
  isClosable: true,
  isMaximizable: true,
  isMinimizable: true,
  title: 'Cognia',
  size: { width: 800, height: 600 },
  position: { x: 0, y: 0 },
  constraints: {
    minWidth: 400,
    minHeight: 300,
  },
  scaleFactor: 1,
  cursorIcon: 'default',
  cursorVisible: true,
  cursorGrab: false,
  ignoreCursorEvents: false,
  skipTaskbar: false,
  contentProtected: false,
  shadow: true,
  visibleOnAllWorkspaces: false,
  progressBar: null,
};

export const useWindowStore = create<WindowStoreState>()(
  persist(
    (set) => ({
      ...initialWindowState,
      preferences: defaultPreferences,

      // State setters
      setIsMaximized: (isMaximized) => set({ isMaximized }),
      setIsMinimized: (isMinimized) => set({ isMinimized }),
      setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
      setIsAlwaysOnTop: (isAlwaysOnTop) => set({ isAlwaysOnTop }),
      setIsFocused: (isFocused) => set({ isFocused }),
      setIsVisible: (isVisible) => set({ isVisible }),
      setIsDecorated: (isDecorated) => set({ isDecorated }),
      setIsResizable: (isResizable) => set({ isResizable }),
      setIsClosable: (isClosable) => set({ isClosable }),
      setIsMaximizable: (isMaximizable) => set({ isMaximizable }),
      setIsMinimizable: (isMinimizable) => set({ isMinimizable }),

      // Property setters
      setTitle: (title) => set({ title }),
      setSize: (size) => set({ size }),
      setPosition: (position) => set({ position }),
      setConstraints: (constraints) =>
        set((state) => ({
          constraints: { ...state.constraints, ...constraints },
        })),
      setScaleFactor: (scaleFactor) => set({ scaleFactor }),

      // Cursor setters
      setCursorIcon: (cursorIcon) => set({ cursorIcon }),
      setCursorVisible: (cursorVisible) => set({ cursorVisible }),
      setCursorGrab: (cursorGrab) => set({ cursorGrab }),
      setIgnoreCursorEvents: (ignoreCursorEvents) => set({ ignoreCursorEvents }),

      // Other setters
      setSkipTaskbar: (skipTaskbar) => set({ skipTaskbar }),
      setContentProtected: (contentProtected) => set({ contentProtected }),
      setShadow: (shadow) => set({ shadow }),
      setVisibleOnAllWorkspaces: (visibleOnAllWorkspaces) => set({ visibleOnAllWorkspaces }),
      setProgressBar: (progressBar) => set({ progressBar }),

      // Preference setters
      setPreferences: (preferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        })),
      setRememberPosition: (rememberPosition) =>
        set((state) => ({
          preferences: { ...state.preferences, rememberPosition },
        })),
      setRememberSize: (rememberSize) =>
        set((state) => ({
          preferences: { ...state.preferences, rememberSize },
        })),
      setStartMaximized: (startMaximized) =>
        set((state) => ({
          preferences: { ...state.preferences, startMaximized },
        })),
      setStartCentered: (startCentered) =>
        set((state) => ({
          preferences: { ...state.preferences, startCentered },
        })),
      setDefaultAlwaysOnTop: (defaultAlwaysOnTop) =>
        set((state) => ({
          preferences: { ...state.preferences, defaultAlwaysOnTop },
        })),
      setTitleBarHeight: (titleBarHeight) =>
        set((state) => ({
          preferences: { ...state.preferences, titleBarHeight },
        })),
      setEnableDoubleClickMaximize: (enableDoubleClickMaximize) =>
        set((state) => ({
          preferences: { ...state.preferences, enableDoubleClickMaximize },
        })),
      setEnableDragToMove: (enableDragToMove) =>
        set((state) => ({
          preferences: { ...state.preferences, enableDragToMove },
        })),
      setTitleBarCustomLayout: (titleBarCustomLayout) =>
        set((state) => ({
          preferences: { ...state.preferences, titleBarCustomLayout },
        })),

      // Bulk state update
      updateWindowState: (windowState) =>
        set((state) => ({
          ...state,
          ...windowState,
        })),

      // Reset
      resetPreferences: () => set({ preferences: defaultPreferences }),
    }),
    {
      name: 'cognia-window-store',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<WindowStoreState> | undefined;
        if (!persisted) return currentState;

        const persistedPreferences = persisted.preferences;
        const mergedPreferences: WindowPreferences = {
          ...currentState.preferences,
          ...(persistedPreferences ?? {}),
          titleBarCustomLayout: {
            ...currentState.preferences.titleBarCustomLayout,
            ...(persistedPreferences?.titleBarCustomLayout ?? {}),
          },
        };

        return {
          ...currentState,
          ...persisted,
          preferences: mergedPreferences,
        };
      },
      partialize: (state) => ({
        preferences: state.preferences,
        size: state.size,
        position: state.position,
        isAlwaysOnTop: state.isAlwaysOnTop,
      }),
    }
  )
);

// Selectors
export const selectWindowState = (state: WindowStoreState) => ({
  isMaximized: state.isMaximized,
  isMinimized: state.isMinimized,
  isFullscreen: state.isFullscreen,
  isAlwaysOnTop: state.isAlwaysOnTop,
  isFocused: state.isFocused,
  isVisible: state.isVisible,
});

export const selectWindowPreferences = (state: WindowStoreState) => state.preferences;
export const selectWindowSize = (state: WindowStoreState) => state.size;
export const selectWindowPosition = (state: WindowStoreState) => state.position;
export const selectWindowConstraints = (state: WindowStoreState) => state.constraints;
export const selectIsMaximized = (state: WindowStoreState) => state.isMaximized;
export const selectIsFullscreen = (state: WindowStoreState) => state.isFullscreen;
export const selectIsAlwaysOnTop = (state: WindowStoreState) => state.isAlwaysOnTop;
