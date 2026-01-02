/**
 * Tests for useSelectionHistory and useClipboardHistory hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSelectionHistory, useClipboardHistory } from './use-selection-history';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock isTauri
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => true,
}));

describe('useSelectionHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockHistoryEntry = {
    text: 'selected text',
    timestamp: Date.now(),
    app_name: 'VSCode',
    window_title: 'main.ts',
    process_name: 'code.exe',
    position: [100, 200] as [number, number],
    context_before: 'before',
    context_after: 'after',
    is_manual: false,
    tags: ['code'],
    text_type: 'Code',
    language: 'typescript',
  };

  const mockStats = {
    total_selections: 100,
    by_app: { VSCode: 50, Chrome: 30 },
    by_type: { Code: 60, PlainText: 40 },
    avg_text_length: 50,
    common_words: [['function', 10], ['const', 8]] as [string, number][],
    earliest_timestamp: Date.now() - 86400000,
    latest_timestamp: Date.now(),
  };

  describe('initialization', () => {
    it('should initialize and fetch history on mount', async () => {
      mockInvoke.mockResolvedValue([mockHistoryEntry]);
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('selection_get_history', { count: 50 });
      });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.history).toEqual([mockHistoryEntry]);
      });
    });
  });

  describe('fetchHistory', () => {
    it('should fetch and update history', async () => {
      mockInvoke.mockResolvedValue([mockHistoryEntry]);
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.fetchHistory(10);
      });
      expect(result.current.history).toEqual([mockHistoryEntry]);
    });

    it('should handle errors', async () => {
      mockInvoke
        .mockResolvedValueOnce([]) // initial fetch
        .mockResolvedValueOnce(null) // stats fetch
        .mockRejectedValueOnce(new Error('Failed')); // manual fetch
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.fetchHistory();
      });
      expect(result.current.error).toBe('Failed');
    });
  });

  describe('searchHistory', () => {
    it('should search history with query', async () => {
      mockInvoke.mockResolvedValue([mockHistoryEntry]);
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const results = await result.current.searchHistory('function');
        expect(results).toEqual([mockHistoryEntry]);
      });
      expect(mockInvoke).toHaveBeenCalledWith('selection_search_history', { query: 'function' });
    });
  });

  describe('searchByApp', () => {
    it('should search by app name', async () => {
      mockInvoke.mockResolvedValue([mockHistoryEntry]);
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const results = await result.current.searchByApp('VSCode');
        expect(results).toEqual([mockHistoryEntry]);
      });
      expect(mockInvoke).toHaveBeenCalledWith('selection_search_history_by_app', { appName: 'VSCode' });
    });
  });

  describe('searchByType', () => {
    it('should search by text type', async () => {
      mockInvoke.mockResolvedValue([mockHistoryEntry]);
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const results = await result.current.searchByType('Code');
        expect(results).toEqual([mockHistoryEntry]);
      });
      expect(mockInvoke).toHaveBeenCalledWith('selection_search_history_by_type', { textType: 'Code' });
    });
  });

  describe('clearHistory', () => {
    it('should clear history and reset state', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.clearHistory();
      });
      expect(mockInvoke).toHaveBeenCalledWith('selection_clear_history');
      expect(result.current.history).toEqual([]);
      expect(result.current.stats).toBeNull();
    });
  });

  describe('exportHistory', () => {
    it('should export history as JSON', async () => {
      const mockJson = JSON.stringify([mockHistoryEntry]);
      mockInvoke.mockResolvedValue(mockJson);
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const json = await result.current.exportHistory();
        expect(json).toBe(mockJson);
      });
      expect(mockInvoke).toHaveBeenCalledWith('selection_export_history');
    });
  });

  describe('importHistory', () => {
    it('should import history from JSON', async () => {
      mockInvoke
        .mockResolvedValueOnce([]) // initial history fetch
        .mockResolvedValueOnce(null) // initial stats fetch
        .mockResolvedValueOnce(5) // import
        .mockResolvedValueOnce([]); // refresh after import
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const count = await result.current.importHistory('[]');
        expect(count).toBe(5);
      });
      expect(mockInvoke).toHaveBeenCalledWith('selection_import_history', { json: '[]' });
    });
  });

  describe('fetchStats', () => {
    it('should fetch and update stats', async () => {
      mockInvoke.mockResolvedValue(mockStats);
      const { result } = renderHook(() => useSelectionHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.fetchStats();
      });
      expect(result.current.stats).toEqual(mockStats);
    });
  });
});

describe('useClipboardHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClipboardEntry = {
    id: 'entry-1',
    content_type: 'Text' as const,
    text: 'clipboard text',
    timestamp: Date.now(),
    source_app: 'VSCode',
    source_window: 'main.ts',
    is_pinned: false,
    label: undefined,
    preview: 'clipboard text',
  };

  describe('initialization', () => {
    it('should initialize and fetch on mount', async () => {
      mockInvoke.mockResolvedValue([]);
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.history).toEqual([]);
      expect(result.current.pinnedItems).toEqual([]);
    });
  });

  describe('fetchHistory', () => {
    it('should fetch and update history', async () => {
      mockInvoke.mockResolvedValue([mockClipboardEntry]);
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.fetchHistory(10);
      });
      expect(result.current.history).toEqual([mockClipboardEntry]);
    });
  });

  describe('fetchPinned', () => {
    it('should fetch pinned items', async () => {
      const pinnedEntry = { ...mockClipboardEntry, is_pinned: true };
      mockInvoke.mockResolvedValue([pinnedEntry]);
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.fetchPinned();
      });
      expect(result.current.pinnedItems).toEqual([pinnedEntry]);
    });
  });

  describe('searchHistory', () => {
    it('should search clipboard history', async () => {
      mockInvoke.mockResolvedValue([mockClipboardEntry]);
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const results = await result.current.searchHistory('clipboard');
        expect(results).toEqual([mockClipboardEntry]);
      });
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_search_history', { query: 'clipboard' });
    });
  });

  describe('pinEntry', () => {
    it('should pin entry and refresh', async () => {
      mockInvoke
        .mockResolvedValueOnce([]) // initial history
        .mockResolvedValueOnce([]) // initial pinned
        .mockResolvedValueOnce(true) // pin
        .mockResolvedValue([]); // refresh
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const success = await result.current.pinEntry('entry-1');
        expect(success).toBe(true);
      });
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_pin_entry', { id: 'entry-1' });
    });
  });

  describe('unpinEntry', () => {
    it('should unpin entry and refresh', async () => {
      mockInvoke
        .mockResolvedValueOnce([]) // initial history
        .mockResolvedValueOnce([]) // initial pinned
        .mockResolvedValueOnce(true) // unpin
        .mockResolvedValue([]); // refresh
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const success = await result.current.unpinEntry('entry-1');
        expect(success).toBe(true);
      });
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_unpin_entry', { id: 'entry-1' });
    });
  });

  describe('deleteEntry', () => {
    it('should delete entry and refresh', async () => {
      mockInvoke
        .mockResolvedValueOnce([]) // initial history
        .mockResolvedValueOnce([]) // initial pinned
        .mockResolvedValueOnce(true) // delete
        .mockResolvedValue([]); // refresh
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const success = await result.current.deleteEntry('entry-1');
        expect(success).toBe(true);
      });
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_delete_entry', { id: 'entry-1' });
    });
  });

  describe('copyEntry', () => {
    it('should copy entry to clipboard', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.copyEntry('entry-1');
      });
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_copy_entry', { id: 'entry-1' });
    });
  });

  describe('clearUnpinned', () => {
    it('should clear unpinned entries', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.clearUnpinned();
      });
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_clear_unpinned');
    });
  });

  describe('clearAll', () => {
    it('should clear all entries', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.clearAll();
      });
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_clear_all');
      expect(result.current.history).toEqual([]);
      expect(result.current.pinnedItems).toEqual([]);
    });
  });

  describe('checkAndUpdate', () => {
    it('should check for updates and refresh if needed', async () => {
      mockInvoke
        .mockResolvedValueOnce([]) // initial history
        .mockResolvedValueOnce([]) // initial pinned
        .mockResolvedValueOnce(true) // check update
        .mockResolvedValue([]); // refresh
      const { result } = renderHook(() => useClipboardHistory());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const updated = await result.current.checkAndUpdate();
        expect(updated).toBe(true);
      });
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_check_update');
    });
  });
});
