/**
 * Selection Tests
 *
 * Tests for selection toolbar API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  startSelectionService,
  stopSelectionService,
  getSelectedText,
  showToolbar,
  hideToolbar,
  updateConfig,
  getConfig,
  triggerSelection,
  onSelectionDetected,
  onToolbarShow,
  onToolbarHide,
  getHistory,
  searchHistory,
  clearHistory,
  getHistoryStats,
  getClipboardHistory,
  pinClipboardEntry,
  unpinClipboardEntry,
  deleteClipboardEntry,
  clearClipboardAll,
  smartExpand,
  autoExpand,
  type SelectionPayload,
  type SelectionConfig,
  type SelectionHistoryEntry,
  type ClipboardEntry,
} from './selection';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockListen = listen as jest.MockedFunction<typeof listen>;

describe('Selection - Service Control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startSelectionService', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await startSelectionService();
      expect(mockInvoke).toHaveBeenCalledWith('selection_start');
    });
  });

  describe('stopSelectionService', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await stopSelectionService();
      expect(mockInvoke).toHaveBeenCalledWith('selection_stop');
    });
  });

  describe('getSelectedText', () => {
    it('should return selected text', async () => {
      mockInvoke.mockResolvedValue('selected text');
      const result = await getSelectedText();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_text');
      expect(result).toBe('selected text');
    });
  });
});

describe('Selection - Toolbar Control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showToolbar', () => {
    it('should call invoke with position and text', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await showToolbar(100, 200, 'selected text');
      expect(mockInvoke).toHaveBeenCalledWith('selection_show_toolbar', { x: 100, y: 200, text: 'selected text' });
    });
  });

  describe('hideToolbar', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await hideToolbar();
      expect(mockInvoke).toHaveBeenCalledWith('selection_hide_toolbar');
    });
  });

  describe('triggerSelection', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await triggerSelection();
      expect(mockInvoke).toHaveBeenCalledWith('selection_trigger');
    });
  });
});

describe('Selection - Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return config', async () => {
      const mockConfig: SelectionConfig = {
        enabled: true,
        trigger_mode: 'auto',
        min_text_length: 3,
        max_text_length: 10000,
        delay_ms: 300,
        target_language: 'en',
        excluded_apps: [],
      };
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await getConfig();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_config');
      expect(result.enabled).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should call invoke with config', async () => {
      const config: SelectionConfig = {
        enabled: false,
        trigger_mode: 'manual',
        min_text_length: 5,
        max_text_length: 5000,
        delay_ms: 500,
        target_language: 'zh',
        excluded_apps: ['notepad.exe'],
      };
      mockInvoke.mockResolvedValue(undefined);

      await updateConfig(config);
      expect(mockInvoke).toHaveBeenCalledWith('selection_update_config', { config });
    });
  });
});

describe('Selection - Event Listeners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onSelectionDetected', () => {
    it('should set up listener', async () => {
      const mockUnlisten = jest.fn();
      mockListen.mockResolvedValue(mockUnlisten);
      const callback = jest.fn();

      await onSelectionDetected(callback);
      expect(mockListen).toHaveBeenCalledWith('selection-detected', expect.any(Function));
    });

    it('should call callback with payload', async () => {
      let capturedHandler: ((event: { payload: SelectionPayload }) => void) | null = null;
      mockListen.mockImplementation((_, handler) => {
        capturedHandler = handler as (event: { payload: SelectionPayload }) => void;
        return Promise.resolve(jest.fn());
      });
      const callback = jest.fn();

      await onSelectionDetected(callback);

      const mockPayload: SelectionPayload = {
        text: 'selected text',
        x: 100,
        y: 200,
        timestamp: Date.now(),
      };

      capturedHandler!({ payload: mockPayload });
      expect(callback).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('onToolbarShow', () => {
    it('should set up listener', async () => {
      mockListen.mockResolvedValue(jest.fn());
      await onToolbarShow(jest.fn());
      expect(mockListen).toHaveBeenCalledWith('selection-toolbar-show', expect.any(Function));
    });
  });

  describe('onToolbarHide', () => {
    it('should set up listener', async () => {
      mockListen.mockResolvedValue(jest.fn());
      await onToolbarHide(jest.fn());
      expect(mockListen).toHaveBeenCalledWith('selection-toolbar-hide', expect.any(Function));
    });
  });

});

describe('Selection - History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should call invoke with count', async () => {
      const mockHistory: SelectionHistoryEntry[] = [
        {
          text: 'selected text',
          timestamp: Date.now(),
          app_name: 'Chrome',
          window_title: 'Test',
          position: [100, 200],
          is_manual: false,
          tags: [],
        },
      ];
      mockInvoke.mockResolvedValue(mockHistory);

      const result = await getHistory(10);
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_history', { count: 10 });
      expect(result).toHaveLength(1);
    });
  });

  describe('searchHistory', () => {
    it('should call invoke with query', async () => {
      mockInvoke.mockResolvedValue([]);
      await searchHistory('test query');
      expect(mockInvoke).toHaveBeenCalledWith('selection_search_history', { query: 'test query' });
    });
  });

  describe('clearHistory', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await clearHistory();
      expect(mockInvoke).toHaveBeenCalledWith('selection_clear_history');
    });
  });

  describe('getHistoryStats', () => {
    it('should return stats', async () => {
      mockInvoke.mockResolvedValue({
        total_selections: 100,
        total_characters: 5000,
        by_app: { Chrome: 50, VSCode: 50 },
        by_day: { '2024-01-15': 30 },
      });

      const result = await getHistoryStats();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_history_stats');
      expect(result.total_selections).toBe(100);
    });
  });
});

describe('Selection - Clipboard History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClipboardHistory', () => {
    it('should call invoke with count', async () => {
      const mockHistory: ClipboardEntry[] = [
        {
          id: 'clip-1',
          text: 'clipboard text',
          content_type: 'Text',
          timestamp: Date.now(),
          is_pinned: false,
          preview: 'clipboard text',
        },
      ];
      mockInvoke.mockResolvedValue(mockHistory);

      const result = await getClipboardHistory(20);
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_get_history', { count: 20 });
      expect(result).toHaveLength(1);
    });
  });

  describe('pinClipboardEntry', () => {
    it('should call invoke with id', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await pinClipboardEntry('clip-1');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_pin_entry', { id: 'clip-1' });
      expect(result).toBe(true);
    });
  });

  describe('unpinClipboardEntry', () => {
    it('should call invoke with id', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await unpinClipboardEntry('clip-1');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_unpin_entry', { id: 'clip-1' });
      expect(result).toBe(true);
    });
  });

  describe('deleteClipboardEntry', () => {
    it('should call invoke with id', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await deleteClipboardEntry('clip-1');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_delete_entry', { id: 'clip-1' });
      expect(result).toBe(true);
    });
  });

  describe('clearClipboardAll', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await clearClipboardAll();
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_clear_all');
    });
  });
});

describe('Selection - Smart Expansion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('smartExpand', () => {
    it('should call invoke with text, cursor position and mode', async () => {
      mockInvoke.mockResolvedValue({
        original_start: 0,
        original_end: 8,
        expanded_start: 0,
        expanded_end: 18,
        expanded_text: 'selected text here',
        mode: 'sentence',
        confidence: 0.9,
      });

      const result = await smartExpand('some text selected text here more', 10, 'sentence');
      expect(mockInvoke).toHaveBeenCalledWith('selection_smart_expand', {
        text: 'some text selected text here more',
        cursorPos: 10,
        mode: 'sentence',
        isCode: undefined,
        language: undefined,
      });
      expect(result.expanded_text).toBe('selected text here');
    });
  });

  describe('autoExpand', () => {
    it('should call invoke with text and cursor position', async () => {
      mockInvoke.mockResolvedValue({
        original_start: 0,
        original_end: 3,
        expanded_start: 0,
        expanded_end: 8,
        expanded_text: 'selected',
        mode: 'word',
        confidence: 0.95,
      });

      const result = await autoExpand('sel text', 2);
      expect(mockInvoke).toHaveBeenCalledWith('selection_auto_expand', {
        text: 'sel text',
        cursorPos: 2,
        isCode: undefined,
        language: undefined,
      });
      expect(result.mode).toBe('word');
    });
  });
});
