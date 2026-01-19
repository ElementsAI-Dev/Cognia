/**
 * useWindowControls - Comprehensive hook for Tauri window control APIs
 * Provides all window customization functions with state synchronization
 */

import { useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow, currentMonitor, primaryMonitor, availableMonitors } from '@tauri-apps/api/window';
import type { PhysicalPosition, ProgressBarStatus, CursorIcon as TauriCursorIcon } from '@tauri-apps/api/window';
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi';
import { useWindowStore, type UserAttentionType } from '@/stores';

export interface ScreenInfo {
  width: number;
  height: number;
  workAreaWidth: number;
  workAreaHeight: number;
  scaleFactor: number;
  name: string | null;
}

export interface WindowSizePreset {
  name: string;
  width: number;
  height: number;
  description?: string;
}

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
          const [max, size, currentScaleFactor] = await Promise.all([
            appWindow.isMaximized(),
            appWindow.innerSize(),
            appWindow.scaleFactor(),
          ]);
          setIsMaximized(max);
          // Convert physical pixels to logical pixels for consistent storage
          // innerSize() returns physical pixels, but we store logical pixels
          const logicalWidth = Math.round(size.width / currentScaleFactor);
          const logicalHeight = Math.round(size.height / currentScaleFactor);
          setSize({ width: logicalWidth, height: logicalHeight });
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
      // Use LogicalSize for consistency - store values are in logical pixels
      await appWindow.setSize(new LogicalSize(width, height));
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
      // Use LogicalSize for consistency - all size values are in logical pixels
      await appWindow.setMinSize(new LogicalSize(width, height));
    } catch (error) {
      console.error('Failed to set min size:', error);
    }
  }, [isTauri]);

  const setMaxSize = useCallback(async (width: number, height: number) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      // Use LogicalSize for consistency - all size values are in logical pixels
      await appWindow.setMaxSize(new LogicalSize(width, height));
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

  // Get current screen info with proper work area calculation
  const getScreenInfo = useCallback(async (): Promise<ScreenInfo | null> => {
    if (!isTauri) return null;
    try {
      const monitor = await currentMonitor();
      const targetMonitor = monitor || await primaryMonitor();
      if (!targetMonitor) return null;
      
      // Try to get work area from backend for accurate multi-monitor support
      let workAreaWidth = targetMonitor.size.width;
      let workAreaHeight = targetMonitor.size.height;
      let actualScaleFactor = targetMonitor.scaleFactor;
      
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const appWindow = getCurrentWindow();
        const position = await appWindow.outerPosition();
        
        // Get work area at current window position for accurate multi-monitor DPI
        const workArea = await invoke<{
          width: number;
          height: number;
          x: number;
          y: number;
          scaleFactor: number;
        }>('get_work_area_at_position', { x: position.x, y: position.y });
        
        // Work area from backend is in physical pixels
        workAreaWidth = workArea.width;
        workAreaHeight = workArea.height;
        actualScaleFactor = workArea.scaleFactor;
      } catch {
        // Fallback: try bubble's work area
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const workArea = await invoke<{
            width: number;
            height: number;
            x: number;
            y: number;
            scaleFactor: number;
          }>('assistant_bubble_get_work_area');
          workAreaWidth = workArea.width;
          workAreaHeight = workArea.height;
          actualScaleFactor = workArea.scaleFactor;
        } catch {
          // Final fallback: estimate work area as 95% of screen (accounting for taskbar)
          workAreaWidth = Math.floor(targetMonitor.size.width * 0.95);
          workAreaHeight = Math.floor(targetMonitor.size.height * 0.95);
        }
      }
      
      return {
        width: targetMonitor.size.width,
        height: targetMonitor.size.height,
        workAreaWidth,
        workAreaHeight,
        scaleFactor: actualScaleFactor,
        name: targetMonitor.name,
      };
    } catch (error) {
      console.error('Failed to get screen info:', error);
      return null;
    }
  }, [isTauri]);

  // Calculate optimal window size based on screen
  const calculateOptimalSize = useCallback(async (): Promise<{ width: number; height: number } | null> => {
    const screenInfo = await getScreenInfo();
    if (!screenInfo) return null;

    const { workAreaWidth, workAreaHeight, scaleFactor } = screenInfo;
    
    // Calculate logical pixels
    const logicalWidth = workAreaWidth / scaleFactor;
    const logicalHeight = workAreaHeight / scaleFactor;

    // Define size presets based on screen size
    let width: number;
    let height: number;

    if (logicalWidth >= 2560) {
      // 4K or larger displays: use 70% of screen
      width = Math.floor(logicalWidth * 0.7);
      height = Math.floor(logicalHeight * 0.8);
    } else if (logicalWidth >= 1920) {
      // Full HD displays: use 75% of screen
      width = Math.floor(logicalWidth * 0.75);
      height = Math.floor(logicalHeight * 0.85);
    } else if (logicalWidth >= 1366) {
      // HD displays: use 85% of screen
      width = Math.floor(logicalWidth * 0.85);
      height = Math.floor(logicalHeight * 0.9);
    } else {
      // Smaller displays: use 95% of screen
      width = Math.floor(logicalWidth * 0.95);
      height = Math.floor(logicalHeight * 0.95);
    }

    // Ensure minimum size
    width = Math.max(width, 800);
    height = Math.max(height, 600);

    return { width, height };
  }, [getScreenInfo]);

  // Auto-fit window to screen
  const autoFitToScreen = useCallback(async () => {
    if (!isTauri) return;
    try {
      const optimalSize = await calculateOptimalSize();
      if (optimalSize) {
        const appWindow = getCurrentWindow();
        await appWindow.setSize(new LogicalSize(optimalSize.width, optimalSize.height));
        await appWindow.center();
        setSize({ width: optimalSize.width, height: optimalSize.height });
      }
    } catch (error) {
      console.error('Failed to auto-fit window:', error);
    }
  }, [isTauri, calculateOptimalSize, setSize]);

  // Get predefined size presets
  const getSizePresets = useCallback(async (): Promise<WindowSizePreset[]> => {
    const screenInfo = await getScreenInfo();
    const presets: WindowSizePreset[] = [
      { name: 'Compact', width: 800, height: 600, description: 'Minimal size for focused work' },
      { name: 'Default', width: 1200, height: 800, description: 'Standard comfortable size' },
      { name: 'Large', width: 1400, height: 900, description: 'Expanded workspace' },
    ];

    if (screenInfo) {
      const { workAreaWidth, workAreaHeight, scaleFactor } = screenInfo;
      const logicalWidth = workAreaWidth / scaleFactor;
      const logicalHeight = workAreaHeight / scaleFactor;

      presets.push({
        name: 'Optimal',
        width: Math.floor(logicalWidth * 0.75),
        height: Math.floor(logicalHeight * 0.85),
        description: 'Best fit for your screen',
      });

      presets.push({
        name: 'Full Screen',
        width: Math.floor(logicalWidth),
        height: Math.floor(logicalHeight),
        description: 'Maximum window size',
      });
    }

    return presets;
  }, [getScreenInfo]);

  // Apply a size preset
  const applySizePreset = useCallback(async (preset: WindowSizePreset) => {
    if (!isTauri) return;
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new LogicalSize(preset.width, preset.height));
      await appWindow.center();
      setSize({ width: preset.width, height: preset.height });
    } catch (error) {
      console.error('Failed to apply size preset:', error);
    }
  }, [isTauri, setSize]);

  // Snap window to screen edge
  const snapToEdge = useCallback(async (edge: 'left' | 'right' | 'top' | 'bottom') => {
    if (!isTauri) return;
    try {
      const screenInfo = await getScreenInfo();
      if (!screenInfo) return;

      const appWindow = getCurrentWindow();
      const { workAreaWidth, workAreaHeight, scaleFactor } = screenInfo;
      const logicalWidth = workAreaWidth / scaleFactor;
      const logicalHeight = workAreaHeight / scaleFactor;

      let width: number;
      let height: number;
      let x: number;
      let y: number;

      switch (edge) {
        case 'left':
          width = Math.floor(logicalWidth / 2);
          height = Math.floor(logicalHeight);
          x = 0;
          y = 0;
          break;
        case 'right':
          width = Math.floor(logicalWidth / 2);
          height = Math.floor(logicalHeight);
          x = Math.floor(logicalWidth / 2);
          y = 0;
          break;
        case 'top':
          width = Math.floor(logicalWidth);
          height = Math.floor(logicalHeight / 2);
          x = 0;
          y = 0;
          break;
        case 'bottom':
          width = Math.floor(logicalWidth);
          height = Math.floor(logicalHeight / 2);
          x = 0;
          y = Math.floor(logicalHeight / 2);
          break;
      }

      await appWindow.setSize(new LogicalSize(width, height));
      await appWindow.setPosition(new LogicalPosition(x, y));
      setSize({ width, height });
      setPosition({ x, y });
    } catch (error) {
      console.error('Failed to snap to edge:', error);
    }
  }, [isTauri, getScreenInfo, setSize, setPosition]);

  // Snap to corner
  const snapToCorner = useCallback(async (corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => {
    if (!isTauri) return;
    try {
      const screenInfo = await getScreenInfo();
      if (!screenInfo) return;

      const appWindow = getCurrentWindow();
      const { workAreaWidth, workAreaHeight, scaleFactor } = screenInfo;
      const logicalWidth = workAreaWidth / scaleFactor;
      const logicalHeight = workAreaHeight / scaleFactor;

      const width = Math.floor(logicalWidth / 2);
      const height = Math.floor(logicalHeight / 2);
      let x: number;
      let y: number;

      switch (corner) {
        case 'topLeft':
          x = 0;
          y = 0;
          break;
        case 'topRight':
          x = Math.floor(logicalWidth / 2);
          y = 0;
          break;
        case 'bottomLeft':
          x = 0;
          y = Math.floor(logicalHeight / 2);
          break;
        case 'bottomRight':
          x = Math.floor(logicalWidth / 2);
          y = Math.floor(logicalHeight / 2);
          break;
      }

      await appWindow.setSize(new LogicalSize(width, height));
      await appWindow.setPosition(new LogicalPosition(x, y));
      setSize({ width, height });
      setPosition({ x, y });
    } catch (error) {
      console.error('Failed to snap to corner:', error);
    }
  }, [isTauri, getScreenInfo, setSize, setPosition]);

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

    // Screen & size management
    getScreenInfo,
    calculateOptimalSize,
    autoFitToScreen,
    getSizePresets,
    applySizePreset,
    snapToEdge,
    snapToCorner,
  };
}

export type UseWindowControlsReturn = ReturnType<typeof useWindowControls>;
