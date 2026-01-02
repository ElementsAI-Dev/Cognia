'use client';

/**
 * useWindow - hook for window management in desktop app
 */

import { useCallback, useEffect, useState } from 'react';
import { useNativeStore } from '@/stores/system';
import { isTauri } from '@/lib/native/utils';
import {
  setAlwaysOnTop,
  isAlwaysOnTop,
  setFullscreen,
  isFullscreen,
  toggleMaximize,
  isMaximized,
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  centerWindow,
  setTitle,
  focusWindow,
  requestAttention,
} from '@/lib/native/window';

export interface UseWindowReturn {
  isDesktop: boolean;
  isAlwaysOnTop: boolean;
  isFullscreen: boolean;
  isMaximized: boolean;
  toggleAlwaysOnTop: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  center: () => Promise<void>;
  setTitle: (title: string) => Promise<void>;
  focus: () => Promise<void>;
  requestAttention: (critical?: boolean) => Promise<void>;
}

export function useWindow(): UseWindowReturn {
  const [isDesktop, setIsDesktop] = useState(false);

  const {
    isAlwaysOnTop: storeAlwaysOnTop,
    isFullscreen: storeFullscreen,
    isMaximized: storeMaximized,
    setAlwaysOnTop: setStoreAlwaysOnTop,
    setFullscreen: setStoreFullscreen,
    setMaximized: setStoreMaximized,
  } = useNativeStore();

  // Initialize window state
  useEffect(() => {
    const init = async () => {
      const inTauri = isTauri();
      setIsDesktop(inTauri);

      if (inTauri) {
        const [alwaysOnTop, fullscreen, maximized] = await Promise.all([
          isAlwaysOnTop(),
          isFullscreen(),
          isMaximized(),
        ]);
        setStoreAlwaysOnTop(alwaysOnTop);
        setStoreFullscreen(fullscreen);
        setStoreMaximized(maximized);
      }
    };

    init();
  }, [setStoreAlwaysOnTop, setStoreFullscreen, setStoreMaximized]);

  const handleToggleAlwaysOnTop = useCallback(async () => {
    const newValue = !storeAlwaysOnTop;
    const success = await setAlwaysOnTop(newValue);
    if (success) {
      setStoreAlwaysOnTop(newValue);
    }
  }, [storeAlwaysOnTop, setStoreAlwaysOnTop]);

  const handleToggleFullscreen = useCallback(async () => {
    const newValue = !storeFullscreen;
    const success = await setFullscreen(newValue);
    if (success) {
      setStoreFullscreen(newValue);
    }
  }, [storeFullscreen, setStoreFullscreen]);

  const handleToggleMaximize = useCallback(async () => {
    const success = await toggleMaximize();
    if (success) {
      const maximized = await isMaximized();
      setStoreMaximized(maximized);
    }
  }, [setStoreMaximized]);

  const handleMinimize = useCallback(async () => {
    await minimizeWindow();
  }, []);

  const handleMaximize = useCallback(async () => {
    const success = await maximizeWindow();
    if (success) {
      setStoreMaximized(true);
    }
  }, [setStoreMaximized]);

  const handleClose = useCallback(async () => {
    await closeWindow();
  }, []);

  const handleCenter = useCallback(async () => {
    await centerWindow();
  }, []);

  const handleSetTitle = useCallback(async (title: string) => {
    await setTitle(title);
  }, []);

  const handleFocus = useCallback(async () => {
    await focusWindow();
  }, []);

  const handleRequestAttention = useCallback(async (critical?: boolean) => {
    await requestAttention(critical);
  }, []);

  return {
    isDesktop,
    isAlwaysOnTop: storeAlwaysOnTop,
    isFullscreen: storeFullscreen,
    isMaximized: storeMaximized,
    toggleAlwaysOnTop: handleToggleAlwaysOnTop,
    toggleFullscreen: handleToggleFullscreen,
    toggleMaximize: handleToggleMaximize,
    minimize: handleMinimize,
    maximize: handleMaximize,
    close: handleClose,
    center: handleCenter,
    setTitle: handleSetTitle,
    focus: handleFocus,
    requestAttention: handleRequestAttention,
  };
}

export default useWindow;
