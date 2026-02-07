/**
 * Selection History Hook
 *
 * Provides access to selection and clipboard history functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';
import { loggers } from '@/lib/logger';

const log = loggers.native;

export interface SelectionHistoryEntry {
  text: string;
  timestamp: number;
  app_name?: string;
  window_title?: string;
  process_name?: string;
  position: [number, number];
  context_before?: string;
  context_after?: string;
  is_manual: boolean;
  tags: string[];
  text_type?: string;
  language?: string;
}

export interface SelectionHistoryStats {
  total_selections: number;
  by_app: Record<string, number>;
  by_type: Record<string, number>;
  avg_text_length: number;
  common_words: [string, number][];
  earliest_timestamp?: number;
  latest_timestamp?: number;
}

export interface ClipboardEntry {
  id: string;
  content_type: 'Text' | 'Html' | 'Image' | 'Files' | 'Unknown';
  text?: string;
  html?: string;
  image_base64?: string;
  files?: string[];
  timestamp: number;
  source_app?: string;
  source_window?: string;
  is_pinned: boolean;
  label?: string;
  preview: string;
}

export function useSelectionHistory() {
  const [history, setHistory] = useState<SelectionHistoryEntry[]>([]);
  const [stats, setStats] = useState<SelectionHistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (count?: number) => {
    if (!isTauri()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke<SelectionHistoryEntry[]>('selection_get_history', { count });
      setHistory(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const result = await invoke<SelectionHistoryStats>('selection_get_history_stats');
      setStats(result);
    } catch (err) {
      log.error('Failed to fetch selection stats', err as Error);
    }
  }, []);

  const searchHistory = useCallback(async (query: string) => {
    if (!isTauri()) return [];

    try {
      return await invoke<SelectionHistoryEntry[]>('selection_search_history', { query });
    } catch (err) {
      log.error('Failed to search history', err as Error);
      return [];
    }
  }, []);

  const searchByApp = useCallback(async (appName: string) => {
    if (!isTauri()) return [];

    try {
      return await invoke<SelectionHistoryEntry[]>('selection_search_history_by_app', { appName });
    } catch (err) {
      log.error('Failed to search by app', err as Error);
      return [];
    }
  }, []);

  const searchByType = useCallback(async (textType: string) => {
    if (!isTauri()) return [];

    try {
      return await invoke<SelectionHistoryEntry[]>('selection_search_history_by_type', {
        textType,
      });
    } catch (err) {
      log.error('Failed to search by type', err as Error);
      return [];
    }
  }, []);

  const clearHistory = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('selection_clear_history');
      setHistory([]);
      setStats(null);
    } catch (err) {
      log.error('Failed to clear history', err as Error);
    }
  }, []);

  const exportHistory = useCallback(async () => {
    if (!isTauri()) return '';

    try {
      return await invoke<string>('selection_export_history');
    } catch (err) {
      log.error('Failed to export history', err as Error);
      return '';
    }
  }, []);

  const importHistory = useCallback(
    async (json: string) => {
      if (!isTauri()) return 0;

      try {
        const count = await invoke<number>('selection_import_history', { json });
        await fetchHistory();
        return count;
      } catch (err) {
        log.error('Failed to import history', err as Error);
        return 0;
      }
    },
    [fetchHistory]
  );

  const searchByTime = useCallback(async (start: number, end: number) => {
    if (!isTauri()) return [];

    try {
      return await invoke<SelectionHistoryEntry[]>('selection_search_history_by_time', {
        start,
        end,
      });
    } catch (err) {
      log.error('Failed to search by time', err as Error);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchHistory(50);
    fetchStats();
  }, [fetchHistory, fetchStats]);

  return {
    history,
    stats,
    isLoading,
    error,
    fetchHistory,
    fetchStats,
    searchHistory,
    searchByApp,
    searchByType,
    searchByTime,
    clearHistory,
    exportHistory,
    importHistory,
  };
}

export function useClipboardHistory() {
  const [history, setHistory] = useState<ClipboardEntry[]>([]);
  const [pinnedItems, setPinnedItems] = useState<ClipboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async (count?: number) => {
    if (!isTauri()) return;

    setIsLoading(true);
    try {
      const result = await invoke<ClipboardEntry[]>('clipboard_get_history', { count });
      setHistory(result);
    } catch (err) {
      log.error('Failed to fetch clipboard history', err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPinned = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const result = await invoke<ClipboardEntry[]>('clipboard_get_pinned');
      setPinnedItems(result);
    } catch (err) {
      log.error('Failed to fetch pinned items', err as Error);
    }
  }, []);

  const searchHistory = useCallback(async (query: string) => {
    if (!isTauri()) return [];

    try {
      return await invoke<ClipboardEntry[]>('clipboard_search_history', { query });
    } catch (err) {
      log.error('Failed to search clipboard', err as Error);
      return [];
    }
  }, []);

  const pinEntry = useCallback(
    async (id: string) => {
      if (!isTauri()) return false;

      try {
        const result = await invoke<boolean>('clipboard_pin_entry', { id });
        if (result) {
          await fetchHistory();
          await fetchPinned();
        }
        return result;
      } catch (err) {
        log.error('Failed to pin entry', err as Error);
        return false;
      }
    },
    [fetchHistory, fetchPinned]
  );

  const unpinEntry = useCallback(
    async (id: string) => {
      if (!isTauri()) return false;

      try {
        const result = await invoke<boolean>('clipboard_unpin_entry', { id });
        if (result) {
          await fetchHistory();
          await fetchPinned();
        }
        return result;
      } catch (err) {
        log.error('Failed to unpin entry', err as Error);
        return false;
      }
    },
    [fetchHistory, fetchPinned]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!isTauri()) return false;

      try {
        const result = await invoke<boolean>('clipboard_delete_entry', { id });
        if (result) {
          await fetchHistory();
          await fetchPinned();
        }
        return result;
      } catch (err) {
        log.error('Failed to delete entry', err as Error);
        return false;
      }
    },
    [fetchHistory, fetchPinned]
  );

  const copyEntry = useCallback(async (id: string) => {
    if (!isTauri()) return;

    try {
      await invoke('clipboard_copy_entry', { id });
    } catch (err) {
      log.error('Failed to copy entry', err as Error);
    }
  }, []);

  const clearUnpinned = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('clipboard_clear_unpinned');
      await fetchHistory();
    } catch (err) {
      log.error('Failed to clear unpinned', err as Error);
    }
  }, [fetchHistory]);

  const clearAll = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await invoke('clipboard_clear_all');
      setHistory([]);
      setPinnedItems([]);
    } catch (err) {
      log.error('Failed to clear all', err as Error);
    }
  }, []);

  const checkAndUpdate = useCallback(async () => {
    if (!isTauri()) return false;

    try {
      const updated = await invoke<boolean>('clipboard_check_update');
      if (updated) {
        await fetchHistory();
      }
      return updated;
    } catch (err) {
      log.error('Failed to check clipboard', err as Error);
      return false;
    }
  }, [fetchHistory]);

  // Clipboard monitoring polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = useCallback(
    (intervalMs: number = 2000) => {
      if (!isTauri() || pollingRef.current) return;

      setIsMonitoring(true);
      pollingRef.current = setInterval(async () => {
        try {
          const updated = await invoke<boolean>('clipboard_check_update');
          if (updated) {
            await fetchHistory();
          }
        } catch (err) {
          log.error('Clipboard monitor error', err as Error);
        }
      }, intervalMs);
    },
    [fetchHistory]
  );

  const stopMonitoring = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsMonitoring(false);
  }, []);

  useEffect(() => {
    fetchHistory(50);
    fetchPinned();

    return () => {
      stopMonitoring();
    };
  }, [fetchHistory, fetchPinned, stopMonitoring]);

  return {
    history,
    pinnedItems,
    isLoading,
    isMonitoring,
    fetchHistory,
    fetchPinned,
    searchHistory,
    pinEntry,
    unpinEntry,
    deleteEntry,
    copyEntry,
    clearUnpinned,
    clearAll,
    checkAndUpdate,
    startMonitoring,
    stopMonitoring,
  };
}
