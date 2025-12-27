'use client';

import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Check if running in Tauri
    const checkTauri = async () => {
      // Check for Tauri environment
      if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
        setIsTauri(false);
        return;
      }

      try {
        setIsTauri(true);
        // Add padding to body for titlebar
        document.body.style.paddingTop = '32px';
        
        const appWindow = getCurrentWindow();
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);

        // Listen to window resize events
        const unlisten = await appWindow.onResized(() => {
          appWindow.isMaximized().then(setIsMaximized);
        });

        return () => {
          unlisten();
          document.body.style.paddingTop = '';
        };
      } catch {
        setIsTauri(false);
        document.body.style.paddingTop = '';
      }
    };

    checkTauri();
  }, []);

  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      if (isMaximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  // Don't render if not in Tauri or if decorations are enabled
  if (!isTauri) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex h-8 select-none items-center justify-end bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-tauri-drag-region
    >
      {/* Drag region - takes all available space except controls */}
      <div className="flex-1" data-tauri-drag-region />

      {/* Window controls */}
      <div className="flex h-full items-center">
        <button
          onClick={handleMinimize}
          className="flex h-full w-12 items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Minimize"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <rect x="0" y="5.5" width="12" height="0.5" />
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          className="flex h-full w-12 items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          type="button"
        >
          {isMaximized ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <rect x="2" y="0" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <rect x="0" y="2" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <rect x="0.5" y="0.5" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          className="flex h-full w-12 items-center justify-center transition-colors hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Close"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
