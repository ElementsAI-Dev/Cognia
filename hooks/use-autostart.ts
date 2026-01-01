/**
 * useAutostart - Hook for managing application autostart on system boot
 * Uses Tauri's autostart plugin to enable/disable and check autostart status
 */

import { useState, useEffect, useCallback } from 'react';

// Check if we're in a Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

interface AutostartState {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseAutostartReturn extends AutostartState {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  toggle: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAutostart(): UseAutostartReturn {
  const [state, setState] = useState<AutostartState>({
    isEnabled: false,
    isLoading: true,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    if (!isTauri) {
      setState({
        isEnabled: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const { isEnabled } = await import('@tauri-apps/plugin-autostart');
      const enabled = await isEnabled();
      setState({
        isEnabled: enabled,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to check autostart status:', err);
      setState({
        isEnabled: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to check autostart status',
      });
    }
  }, []);

  const enable = useCallback(async () => {
    if (!isTauri) {
      console.warn('Autostart is only available in Tauri environment');
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const autostart = await import('@tauri-apps/plugin-autostart');
      await autostart.enable();
      setState({
        isEnabled: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to enable autostart:', err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to enable autostart',
      }));
    }
  }, []);

  const disable = useCallback(async () => {
    if (!isTauri) {
      console.warn('Autostart is only available in Tauri environment');
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const autostart = await import('@tauri-apps/plugin-autostart');
      await autostart.disable();
      setState({
        isEnabled: false,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to disable autostart:', err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to disable autostart',
      }));
    }
  }, []);

  const toggle = useCallback(async () => {
    if (state.isEnabled) {
      await disable();
    } else {
      await enable();
    }
  }, [state.isEnabled, enable, disable]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    ...state,
    enable,
    disable,
    toggle,
    refresh: checkStatus,
  };
}

export default useAutostart;
