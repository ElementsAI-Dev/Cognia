/**
 * Selection History Hook
 *
 * Provides access to selection and clipboard history functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';

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
      console.error('Failed to fetch selection stats:', err);
    }
  }, []);

  const searchHistory = useCallback(async (query: string) => {
    if (!isTauri()) return [];
    
    try {
      return await invoke<SelectionHistoryEntry[]>('selection_search_history', { query });
    } catch (err) {
      console.error('Failed to search history:', err);
      return [];
    }
  }, []);

  const searchByApp = useCallback(async (appName: string) => {
    if (!isTauri()) return [];
    
    try {
      return await invoke<SelectionHistoryEntry[]>('selection_search_history_by_app', { appName });
    } catch (err) {
      console.error('Failed to search by app:', err);
      return [];
    }
  }, []);

  const searchByType = useCallback(async (textType: string) => {
    if (!isTauri()) return [];
    
    try {
      return await invoke<SelectionHistoryEntry[]>('selection_search_history_by_type', { textType });
    } catch (err) {
      console.error('Failed to search by type:', err);
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
      console.error('Failed to clear history:', err);
    }
  }, []);

  const exportHistory = useCallback(async () => {
    if (!isTauri()) return '';
    
    try {
      return await invoke<string>('selection_export_history');
    } catch (err) {
      console.error('Failed to export history:', err);
      return '';
    }
  }, []);

  const importHistory = useCallback(async (json: string) => {
    if (!isTauri()) return 0;
    
    try {
      const count = await invoke<number>('selection_import_history', { json });
      await fetchHistory();
      return count;
    } catch (err) {
      console.error('Failed to import history:', err);
      return 0;
    }
  }, [fetchHistory]);

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
      console.error('Failed to fetch clipboard history:', err);
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
      console.error('Failed to fetch pinned items:', err);
    }
  }, []);

  const searchHistory = useCallback(async (query: string) => {
    if (!isTauri()) return [];
    
    try {
      return await invoke<ClipboardEntry[]>('clipboard_search_history', { query });
    } catch (err) {
      console.error('Failed to search clipboard:', err);
      return [];
    }
  }, []);

  const pinEntry = useCallback(async (id: string) => {
    if (!isTauri()) return false;
    
    try {
      const result = await invoke<boolean>('clipboard_pin_entry', { id });
      if (result) {
        await fetchHistory();
        await fetchPinned();
      }
      return result;
    } catch (err) {
      console.error('Failed to pin entry:', err);
      return false;
    }
  }, [fetchHistory, fetchPinned]);

  const unpinEntry = useCallback(async (id: string) => {
    if (!isTauri()) return false;
    
    try {
      const result = await invoke<boolean>('clipboard_unpin_entry', { id });
      if (result) {
        await fetchHistory();
        await fetchPinned();
      }
      return result;
    } catch (err) {
      console.error('Failed to unpin entry:', err);
      return false;
    }
  }, [fetchHistory, fetchPinned]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!isTauri()) return false;
    
    try {
      const result = await invoke<boolean>('clipboard_delete_entry', { id });
      if (result) {
        await fetchHistory();
        await fetchPinned();
      }
      return result;
    } catch (err) {
      console.error('Failed to delete entry:', err);
      return false;
    }
  }, [fetchHistory, fetchPinned]);

  const copyEntry = useCallback(async (id: string) => {
    if (!isTauri()) return;
    
    try {
      await invoke('clipboard_copy_entry', { id });
    } catch (err) {
      console.error('Failed to copy entry:', err);
    }
  }, []);

  const clearUnpinned = useCallback(async () => {
    if (!isTauri()) return;
    
    try {
      await invoke('clipboard_clear_unpinned');
      await fetchHistory();
    } catch (err) {
      console.error('Failed to clear unpinned:', err);
    }
  }, [fetchHistory]);

  const clearAll = useCallback(async () => {
    if (!isTauri()) return;
    
    try {
      await invoke('clipboard_clear_all');
      setHistory([]);
      setPinnedItems([]);
    } catch (err) {
      console.error('Failed to clear all:', err);
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
      console.error('Failed to check clipboard:', err);
      return false;
    }
  }, [fetchHistory]);

  useEffect(() => {
    fetchHistory(50);
    fetchPinned();
  }, [fetchHistory, fetchPinned]);

  return {
    history,
    pinnedItems,
    isLoading,
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
  };
}
