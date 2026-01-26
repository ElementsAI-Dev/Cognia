/**
 * useTray Hook
 * React hook for managing system tray configuration
 */

import { useState, useEffect, useCallback } from 'react';
import { useTrayStore } from '@/stores/system/tray-store';
import {
  getTrayState,
  getTrayConfig,
  setTrayConfig,
  setTrayDisplayMode,
  toggleTrayDisplayMode,
  setTrayItemVisibility,
  setTrayCompactItems,
  refreshTrayMenu,
  onTrayConfigChanged,
  onTrayStateChanged,
} from '@/lib/native/tray';
import { isTauri } from '@/lib/native/utils';
import type { TrayConfig, TrayDisplayMode, TrayState } from '@/types/system/tray';

export interface UseTrayReturn {
  /** Whether in Tauri desktop environment */
  isDesktop: boolean;
  /** Current display mode */
  displayMode: TrayDisplayMode;
  /** Current tray state */
  trayState: TrayState;
  /** Current tray configuration */
  config: TrayConfig;
  /** Whether config is syncing */
  isSyncing: boolean;
  /** Error message if any */
  error: string | null;
  /** Set display mode */
  setDisplayMode: (mode: TrayDisplayMode) => Promise<void>;
  /** Toggle display mode */
  toggleMode: () => Promise<void>;
  /** Set item visibility */
  setItemVisibility: (itemId: string, visible: boolean) => Promise<void>;
  /** Set compact mode items */
  setCompactItems: (items: string[]) => Promise<void>;
  /** Toggle shortcuts display */
  setShowShortcuts: (show: boolean) => void;
  /** Toggle icons display */
  setShowIcons: (show: boolean) => void;
  /** Sync config with backend */
  syncConfig: () => Promise<void>;
  /** Refresh tray menu */
  refresh: () => Promise<void>;
  /** Reset to defaults */
  resetConfig: () => void;
}

export function useTray(): UseTrayReturn {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const store = useTrayStore();
  const {
    config,
    trayState,
    setDisplayMode: storeSetDisplayMode,
    setItemVisibility: storeSetItemVisibility,
    setCompactModeItems: storeSetCompactModeItems,
    setShowShortcuts: storeSetShowShortcuts,
    setShowIcons: storeSetShowIcons,
    setTrayState: storeSetTrayState,
    markSynced,
    resetConfig: storeResetConfig,
  } = store;

  // Check if running in Tauri
  useEffect(() => {
    setIsDesktop(isTauri());
  }, []);

  // Initial sync and event listeners
  useEffect(() => {
    if (!isDesktop) return;

    let unlistenConfig: (() => void) | undefined;
    let unlistenState: (() => void) | undefined;

    const setup = async () => {
      try {
        // Get initial state
        const state = await getTrayState();
        storeSetTrayState(state);

        // Listen for config changes
        unlistenConfig = await onTrayConfigChanged(() => {
          // Config changed from backend, refresh
          getTrayConfig()
            .then((newConfig) => {
              storeSetDisplayMode(newConfig.displayMode);
              storeSetShowShortcuts(newConfig.showShortcuts);
              storeSetShowIcons(newConfig.showIcons);
              if (newConfig.compactModeItems) {
                storeSetCompactModeItems(newConfig.compactModeItems);
              }
              markSynced();
            })
            .catch(console.error);
        });

        // Listen for state changes
        unlistenState = await onTrayStateChanged((state) => {
          storeSetTrayState(state);
        });
      } catch (err) {
        console.error('Failed to setup tray listeners:', err);
        setError(err instanceof Error ? err.message : 'Failed to setup tray');
      }
    };

    setup();

    return () => {
      unlistenConfig?.();
      unlistenState?.();
    };
  }, [
    isDesktop,
    storeSetTrayState,
    storeSetDisplayMode,
    storeSetShowShortcuts,
    storeSetShowIcons,
    storeSetCompactModeItems,
    markSynced,
  ]);

  // Set display mode
  const setDisplayMode = useCallback(
    async (mode: TrayDisplayMode) => {
      if (!isDesktop) return;

      setIsSyncing(true);
      setError(null);

      try {
        await setTrayDisplayMode(mode);
        storeSetDisplayMode(mode);
        markSynced();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set display mode');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [isDesktop, storeSetDisplayMode, markSynced]
  );

  // Toggle display mode
  const toggleMode = useCallback(async () => {
    if (!isDesktop) return;

    setIsSyncing(true);
    setError(null);

    try {
      const newMode = await toggleTrayDisplayMode();
      storeSetDisplayMode(newMode);
      markSynced();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle display mode');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [isDesktop, storeSetDisplayMode, markSynced]);

  // Set item visibility
  const setItemVisibilityHandler = useCallback(
    async (itemId: string, visible: boolean) => {
      if (!isDesktop) return;

      setError(null);

      try {
        await setTrayItemVisibility(itemId, visible);
        storeSetItemVisibility(itemId, visible);
        markSynced();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set item visibility');
        throw err;
      }
    },
    [isDesktop, storeSetItemVisibility, markSynced]
  );

  // Set compact mode items
  const setCompactItems = useCallback(
    async (items: string[]) => {
      if (!isDesktop) return;

      setError(null);

      try {
        await setTrayCompactItems(items);
        storeSetCompactModeItems(items);
        markSynced();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set compact items');
        throw err;
      }
    },
    [isDesktop, storeSetCompactModeItems, markSynced]
  );

  // Sync config with backend
  const syncConfig = useCallback(async () => {
    if (!isDesktop) return;

    setIsSyncing(true);
    setError(null);

    try {
      await setTrayConfig(config);
      markSynced();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync config');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [isDesktop, config, markSynced]);

  // Refresh tray menu
  const refresh = useCallback(async () => {
    if (!isDesktop) return;

    try {
      await refreshTrayMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh menu');
      throw err;
    }
  }, [isDesktop]);

  // Reset config
  const resetConfig = useCallback(() => {
    storeResetConfig();
    if (isDesktop) {
      syncConfig().catch(console.error);
    }
  }, [isDesktop, storeResetConfig, syncConfig]);

  return {
    isDesktop,
    displayMode: config.displayMode,
    trayState,
    config,
    isSyncing,
    error,
    setDisplayMode,
    toggleMode,
    setItemVisibility: setItemVisibilityHandler,
    setCompactItems,
    setShowShortcuts: storeSetShowShortcuts,
    setShowIcons: storeSetShowIcons,
    syncConfig,
    refresh,
    resetConfig,
  };
}

export default useTray;
