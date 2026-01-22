/**
 * Hook for managing selection toolbar settings with proper Rust backend synchronization.
 *
 * This hook ensures that the enabled state is properly synced between:
 * - Frontend Zustand store (for UI reactivity)
 * - Rust backend (for actual functionality)
 * - Persisted config file (for state across restarts)
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useSelectionStore } from '@/stores/context/selection-store';
import { isTauri } from '@/lib/native/utils';

export interface UseSelectionSettingsReturn {
  /** Whether the selection toolbar is enabled */
  isEnabled: boolean;
  /** Whether the settings are being loaded from backend */
  isLoading: boolean;
  /** Error message if sync failed */
  error: string | null;
  /** Toggle or set the enabled state - syncs with backend */
  setEnabled: (enabled: boolean) => Promise<void>;
  /** Refresh state from backend */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing selection toolbar settings with Rust backend sync.
 * Use this in settings pages to ensure proper state synchronization.
 */
export function useSelectionSettings(): UseSelectionSettingsReturn {
  const store = useSelectionStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Load initial state from Rust backend
  const loadFromBackend = useCallback(async () => {
    if (!isTauri()) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const { invoke } = await import('@tauri-apps/api/core');

      // Get the current config from Rust backend
      const config = await invoke<{
        enabled: boolean;
        trigger_mode: string;
        min_text_length: number;
        max_text_length: number;
        delay_ms: number;
        target_language: string;
        excluded_apps: string[];
      }>('selection_get_config');

      // Sync the enabled state to the store
      store.setEnabled(config.enabled);

      setIsLoading(false);
    } catch (err) {
      console.error('[useSelectionSettings] Failed to load config from backend:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setIsLoading(false);
    }
  }, [store]);

  // Initialize on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      loadFromBackend();
    }
  }, [loadFromBackend]);

  // Set enabled state with backend sync
  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!isTauri()) {
        store.setEnabled(enabled);
        return;
      }

      try {
        setError(null);
        const { invoke } = await import('@tauri-apps/api/core');

        // 1. Update the Rust backend enabled state
        await invoke('selection_set_enabled', { enabled });

        // 2. Save the config to file for persistence
        await invoke('selection_save_config');

        // 3. Start or stop the selection service based on enabled state
        if (enabled) {
          await invoke('selection_start');
        } else {
          await invoke('selection_stop');
        }

        // 4. Update the local store (for UI reactivity)
        store.setEnabled(enabled);

        console.log(`[useSelectionSettings] Selection toolbar ${enabled ? 'enabled' : 'disabled'}`);
      } catch (err) {
        console.error('[useSelectionSettings] Failed to set enabled state:', err);
        setError(err instanceof Error ? err.message : 'Failed to update settings');
        // Revert local store on error
        store.setEnabled(!enabled);
        throw err;
      }
    },
    [store]
  );

  return {
    isEnabled: store.isEnabled,
    isLoading,
    error,
    setEnabled,
    refresh: loadFromBackend,
  };
}

export default useSelectionSettings;
