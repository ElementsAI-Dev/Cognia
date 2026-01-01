/**
 * useWindowControls - Comprehensive hook for Tauri window control APIs
 * Provides all window customization functions with state synchronization
 */

import { useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { PhysicalSize, PhysicalPosition, ProgressBarStatus, CursorIcon as TauriCursorIcon } from '@tauri-apps/api/window';
import { useWindowStore, type UserAttentionType } from '@/stores';

interface UseWindowControlsOptions {
  syncState?: boolean;
  enableKeyboardShortcuts?: boolean;
}

export function useWindowControls(options: UseWindowControlsOptions = {}) {
  const { syncState = true, enableKeyboardShortcuts = true } = options;
  const unlistenersRef = useRef<Array<() => void>>([]);

  const {
    isMaximized,
    isMinimized,
    isFullscreen,
    isAlwaysOnTop,
    isFocused,
    isVisible,
    preferences,
    setIsMaximized,
    setIsMinimized,
    setIsFullscreen,
    setIsAlwaysOnTop,
    setIsFocused,
    setIsVisible,
    setSize,
    setPosition,
    setScaleFactor,
    updateWindowState,
  } = useWindowStore();

  // Check if running in Tauri environment
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  // Initialize and sync window state
  useEffect(() => {
    if (!isTauri || !syncState) return;

    const initWindowState = async () => {
      try {
        const appWindow = getCurrentWindow();

        // Get initial state
        const [maximized, minimized, fullscreen, focused, visible, scaleFactor] =
          await Promise.all([
            appWindow.isMaximized(),
            appWindow.isMinimized(),
            appWindow.isFullscreen(),
            appWindow.isFocused(),
            appWindow.isVisible(),
            appWindow.scaleFactor(),
          ]);

        updateWindowState({
          isMaximized: maximized,
          isMinimized: minimized,
          isFullscreen: fullscreen,
          isFocused: focused,
          isVisible: visible,
          scaleFactor,
        });

        // Set up event listeners
        const unlistenResize = await appWindow.onResized(async () => {
          const [max, size] = await Promise.all([
            appWindow.isMaximized(),
            appWindow.innerSize(),
          ]);
          setIsMaximized(max);
          setSize({ width: size.width, height: size.height });
        });
        unlistenersRef.current.push(unlistenResize);

        const unlistenMove = await appWindow.onMoved(async (event) => {
          setPosition({ x: event.payload.x, y: event.payload.y });
        });
        unlistenersRef.current.push(unlistenMove);

        const unlistenFocus = await appWindow.onFocusChanged(({ payload }) => {
          setIsFocused(payload);
        });
        unlistenersRef.current.push(unlistenFocus);

        const unlistenScale = await appWindow.onScaleChanged(({ payload }) => {
          setScaleFactor(payload.scaleFactor);
        });
        unlistenersRef.current.push(unlistenScale);
      } catch (error) {
        console.error('Failed to initialize window state:', error);
      }
    };

    initWindowState();

    return () => {
      unlistenersRef.current.forEach((unlisten) => unlisten());
      unlistenersRef.current = [];
    };
  }, [isTauri, syncState, updateWindowState, setIsMaximized, setSize, setPosition, setIsFocused, setScaleFactor]);

  // Toggle fullscreen helper - defined early for keyboard shortcut use
  const toggleFullscreenFn = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      const current = await appWindow.isFullscreen();
      await appWindow.setFullscreen(!current);
      setIsFullscreen(!current);
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    }
  }, [isTauri, setIsFullscreen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isTauri || !enableKeyboardShortcuts) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // F11 - Toggle Fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        await toggleFullscreenFn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTauri, enableKeyboardShortcuts, toggleFullscreenFn]);

  // Window control functions
  const minimize = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
      setIsMinimized(true);
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  }, [isTauri, setIsMinimized]);

  const maximize = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.maximize();
      setIsMaximized(true);
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  }, [isTauri, setIsMaximized]);

  const unmaximize = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.unmaximize();
      setIsMaximized(false);
    } catch (error) {
      console.error('Failed to unmaximize window:', error);
    }
  }, [isTauri, setIsMaximized]);

  const toggleMaximize = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  }, [isTauri, setIsMaximized]);

  const close = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }, [isTauri]);

  const hide = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.hide();
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to hide window:', error);
    }
  }, [isTauri, setIsVisible]);

  const show = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.show();
      setIsVisible(true);
    } catch (error) {
      console.error('Failed to show window:', error);
    }
  }, [isTauri, setIsVisible]);

  const setFullscreen = useCallback(async (fullscreen: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setFullscreen(fullscreen);
      setIsFullscreen(fullscreen);
    } catch (error) {
      console.error('Failed to set fullscreen:', error);
    }
  }, [isTauri, setIsFullscreen]);

  // Use the already defined toggleFullscreenFn
  const toggleFullscreen = toggleFullscreenFn;

  const setAlwaysOnTop = useCallback(async (alwaysOnTop: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setAlwaysOnTop(alwaysOnTop);
      setIsAlwaysOnTop(alwaysOnTop);
    } catch (error) {
      console.error('Failed to set always on top:', error);
    }
  }, [isTauri, setIsAlwaysOnTop]);

  const toggleAlwaysOnTop = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      const newValue = !isAlwaysOnTop;
      await appWindow.setAlwaysOnTop(newValue);
      setIsAlwaysOnTop(newValue);
    } catch (error) {
      console.error('Failed to toggle always on top:', error);
    }
  }, [isTauri, isAlwaysOnTop, setIsAlwaysOnTop]);

  const center = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.center();
    } catch (error) {
      console.error('Failed to center window:', error);
    }
  }, [isTauri]);

  const setFocus = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setFocus();
      setIsFocused(true);
    } catch (error) {
      console.error('Failed to set focus:', error);
    }
  }, [isTauri, setIsFocused]);

  const setTitle = useCallback(async (title: string) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setTitle(title);
    } catch (error) {
      console.error('Failed to set title:', error);
    }
  }, [isTauri]);

  const setWindowSize = useCallback(async (width: number, height: number) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setSize({ type: 'Physical', width, height } as PhysicalSize);
      setSize({ width, height });
    } catch (error) {
      console.error('Failed to set size:', error);
    }
  }, [isTauri, setSize]);

  const setWindowPosition = useCallback(async (x: number, y: number) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setPosition({ type: 'Physical', x, y } as PhysicalPosition);
      setPosition({ x, y });
    } catch (error) {
      console.error('Failed to set position:', error);
    }
  }, [isTauri, setPosition]);

  const setMinSize = useCallback(async (width: number, height: number) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setMinSize({ type: 'Physical', width, height } as PhysicalSize);
    } catch (error) {
      console.error('Failed to set min size:', error);
    }
  }, [isTauri]);

  const setMaxSize = useCallback(async (width: number, height: number) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setMaxSize({ type: 'Physical', width, height } as PhysicalSize);
    } catch (error) {
      console.error('Failed to set max size:', error);
    }
  }, [isTauri]);

  const setResizable = useCallback(async (resizable: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setResizable(resizable);
    } catch (error) {
      console.error('Failed to set resizable:', error);
    }
  }, [isTauri]);

  const setDecorations = useCallback(async (decorations: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setDecorations(decorations);
    } catch (error) {
      console.error('Failed to set decorations:', error);
    }
  }, [isTauri]);

  const setShadow = useCallback(async (shadow: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setShadow(shadow);
    } catch (error) {
      console.error('Failed to set shadow:', error);
    }
  }, [isTauri]);

  const setSkipTaskbar = useCallback(async (skip: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setSkipTaskbar(skip);
    } catch (error) {
      console.error('Failed to set skip taskbar:', error);
    }
  }, [isTauri]);

  const setContentProtected = useCallback(async (protect: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setContentProtected(protect);
    } catch (error) {
      console.error('Failed to set content protected:', error);
    }
  }, [isTauri]);

  const setCursorGrab = useCallback(async (grab: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setCursorGrab(grab);
    } catch (error) {
      console.error('Failed to set cursor grab:', error);
    }
  }, [isTauri]);

  const setCursorVisible = useCallback(async (visible: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setCursorVisible(visible);
    } catch (error) {
      console.error('Failed to set cursor visible:', error);
    }
  }, [isTauri]);

  const setCursorIcon = useCallback(async (icon: TauriCursorIcon) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setCursorIcon(icon);
    } catch (error) {
      console.error('Failed to set cursor icon:', error);
    }
  }, [isTauri]);

  const setCursorPosition = useCallback(async (x: number, y: number) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setCursorPosition({ type: 'Physical', x, y } as PhysicalPosition);
    } catch (error) {
      console.error('Failed to set cursor position:', error);
    }
  }, [isTauri]);

  const setIgnoreCursorEvents = useCallback(async (ignore: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setIgnoreCursorEvents(ignore);
    } catch (error) {
      console.error('Failed to set ignore cursor events:', error);
    }
  }, [isTauri]);

  const requestUserAttention = useCallback(async (type: UserAttentionType | null) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      const attentionType = type === 'critical' ? 1 : type === 'informational' ? 2 : null;
      await appWindow.requestUserAttention(attentionType);
    } catch (error) {
      console.error('Failed to request user attention:', error);
    }
  }, [isTauri]);

  const setProgressBar = useCallback(async (progress: number | null) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      if (progress === null) {
        await appWindow.setProgressBar({ status: 'None' as ProgressBarStatus });
      } else {
        await appWindow.setProgressBar({ progress: Math.max(0, Math.min(100, progress)) / 100 });
      }
    } catch (error) {
      console.error('Failed to set progress bar:', error);
    }
  }, [isTauri]);

  const setVisibleOnAllWorkspaces = useCallback(async (visible: boolean) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setVisibleOnAllWorkspaces(visible);
    } catch (error) {
      console.error('Failed to set visible on all workspaces:', error);
    }
  }, [isTauri]);

  const startDragging = useCallback(async () => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.startDragging();
    } catch (error) {
      console.error('Failed to start dragging:', error);
    }
  }, [isTauri]);

  // Manual drag handler with double-click to maximize
  const handleDragMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (!isTauri || !preferences.enableDragToMove) return;
    if (e.buttons !== 1) return; // Only primary button

    if (e.detail === 2 && preferences.enableDoubleClickMaximize) {
      // Double click - toggle maximize
      await toggleMaximize();
    } else {
      // Single click - start dragging
      await startDragging();
    }
  }, [isTauri, preferences.enableDragToMove, preferences.enableDoubleClickMaximize, toggleMaximize, startDragging]);

  // Get window info
  const getWindowInfo = useCallback(async () => {
    if (!isTauri) return null;
    try {
      const appWindow = getCurrentWindow();
      const [
        innerSize,
        outerSize,
        innerPosition,
        outerPosition,
        scaleFactor,
        isMaximizedVal,
        isMinimizedVal,
        isFullscreenVal,
        isFocusedVal,
        isVisibleVal,
        isDecorated,
        isResizable,
        theme,
      ] = await Promise.all([
        appWindow.innerSize(),
        appWindow.outerSize(),
        appWindow.innerPosition(),
        appWindow.outerPosition(),
        appWindow.scaleFactor(),
        appWindow.isMaximized(),
        appWindow.isMinimized(),
        appWindow.isFullscreen(),
        appWindow.isFocused(),
        appWindow.isVisible(),
        appWindow.isDecorated(),
        appWindow.isResizable(),
        appWindow.theme(),
      ]);

      return {
        innerSize: { width: innerSize.width, height: innerSize.height },
        outerSize: { width: outerSize.width, height: outerSize.height },
        innerPosition: { x: innerPosition.x, y: innerPosition.y },
        outerPosition: { x: outerPosition.x, y: outerPosition.y },
        scaleFactor,
        isMaximized: isMaximizedVal,
        isMinimized: isMinimizedVal,
        isFullscreen: isFullscreenVal,
        isFocused: isFocusedVal,
        isVisible: isVisibleVal,
        isDecorated,
        isResizable,
        theme,
      };
    } catch (error) {
      console.error('Failed to get window info:', error);
      return null;
    }
  }, [isTauri]);

  // Get monitors info
  const getMonitors = useCallback(async () => {
    if (!isTauri) return null;
    try {
      // Monitor APIs are available from @tauri-apps/api/window module
      const { currentMonitor, primaryMonitor, availableMonitors } = await import('@tauri-apps/api/window');
      const [current, primary, available] = await Promise.all([
        currentMonitor(),
        primaryMonitor(),
        availableMonitors(),
      ]);

      return {
        current,
        primary,
        available,
      };
    } catch (error) {
      console.error('Failed to get monitors:', error);
      return null;
    }
  }, [isTauri]);

  return {
    // State
    isTauri,
    isMaximized,
    isMinimized,
    isFullscreen,
    isAlwaysOnTop,
    isFocused,
    isVisible,
    preferences,

    // Basic controls
    minimize,
    maximize,
    unmaximize,
    toggleMaximize,
    close,
    hide,
    show,

    // Fullscreen
    setFullscreen,
    toggleFullscreen,

    // Always on top
    setAlwaysOnTop,
    toggleAlwaysOnTop,

    // Position & size
    center,
    setFocus,
    setTitle,
    setWindowSize,
    setWindowPosition,
    setMinSize,
    setMaxSize,

    // Window properties
    setResizable,
    setDecorations,
    setShadow,
    setSkipTaskbar,
    setContentProtected,
    setVisibleOnAllWorkspaces,

    // Cursor
    setCursorGrab,
    setCursorVisible,
    setCursorIcon,
    setCursorPosition,
    setIgnoreCursorEvents,

    // Notifications
    requestUserAttention,
    setProgressBar,

    // Dragging
    startDragging,
    handleDragMouseDown,

    // Info
    getWindowInfo,
    getMonitors,
  };
}

export type UseWindowControlsReturn = ReturnType<typeof useWindowControls>;
