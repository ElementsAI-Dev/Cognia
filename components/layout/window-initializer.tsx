'use client';

/**
 * WindowInitializer - Initializes window size based on screen dimensions
 * Runs once when the app starts in Tauri mode
 */

import { useEffect, useRef } from 'react';
import { useWindowControls } from '@/hooks';
import { useWindowStore } from '@/stores';

export function WindowInitializer() {
  const { isTauri, autoFitToScreen, getScreenInfo } = useWindowControls();
  const preferences = useWindowStore((state) => state.preferences);
  const size = useWindowStore((state) => state.size);
  const setSize = useWindowStore((state) => state.setSize);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isTauri || hasInitialized.current) return;

    const initializeWindow = async () => {
      try {
        hasInitialized.current = true;

        // If user prefers to start maximized, skip auto-fit
        if (preferences.startMaximized) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const appWindow = getCurrentWindow();
          await appWindow.maximize();
          return;
        }

        // Check if we have saved size preferences
        const hasSavedSize = preferences.rememberSize && size.width > 0 && size.height > 0;
        
        // Get screen info to validate saved size
        const screenInfo = await getScreenInfo();
        if (!screenInfo) return;

        const { workAreaWidth, workAreaHeight, scaleFactor } = screenInfo;
        const maxWidth = workAreaWidth / scaleFactor;
        const maxHeight = workAreaHeight / scaleFactor;

        // If saved size is valid and within screen bounds, use it
        if (hasSavedSize && size.width <= maxWidth && size.height <= maxHeight) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const { LogicalSize } = await import('@tauri-apps/api/dpi');
          const appWindow = getCurrentWindow();
          await appWindow.setSize(new LogicalSize(size.width, size.height));
          
          if (preferences.startCentered) {
            await appWindow.center();
          }
          return;
        }

        // Otherwise, auto-fit to screen
        await autoFitToScreen();
      } catch (error) {
        console.error('Failed to initialize window:', error);
      }
    };

    // Small delay to ensure window is ready
    const timer = setTimeout(initializeWindow, 100);
    return () => clearTimeout(timer);
  }, [isTauri, autoFitToScreen, getScreenInfo, preferences, size, setSize]);

  return null;
}

export default WindowInitializer;
