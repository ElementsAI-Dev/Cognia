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
  getTimeSinceLastDetection,
  getLastText,
  clearLastText,
  getLastSelection,
  saveConfig,
  getSelectionStatus,
  setSelectionEnabled,
  isSelectionEnabled,
  restartSelectionService,
  setToolbarHovered,
  getToolbarState,
  setAutoHideTimeout,
  getDetectionStats,
  getEnhancedSelection,
  analyzeCurrentSelection,
  expandToWord,
  expandToSentence,
  expandToLine,
  expandToParagraph,
  searchHistoryByTime,
  releaseStuckKeys,
  detectTextType,
  getToolbarConfig,
  setToolbarTheme,
  getStatsSummary,
  analyzeClipboardContent,
  getCurrentClipboardWithAnalysis,
  transformClipboardContent,
  writeClipboardText,
  readClipboardText,
  writeClipboardHtml,
  clearClipboard,
  getClipboardSuggestedActions,
  extractClipboardEntities,
  checkClipboardSensitive,
  getClipboardContentStats,
  detectClipboardCategory,
  detectClipboardLanguage,
  onSelectionAIChunk,
  onQuickAction,
  onQuickTranslate,
  type SelectionPayload,
  type SelectionConfig,
  type SelectionHistoryEntry,
  type ClipboardEntry,
  type Selection,
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

describe('Selection - Detection State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTimeSinceLastDetection', () => {
    it('should return time in milliseconds', async () => {
      mockInvoke.mockResolvedValue(1500);
      const result = await getTimeSinceLastDetection();
      expect(mockInvoke).toHaveBeenCalledWith('selection_time_since_last_detection');
      expect(result).toBe(1500);
    });

    it('should return null when no detection has occurred', async () => {
      mockInvoke.mockResolvedValue(null);
      const result = await getTimeSinceLastDetection();
      expect(result).toBeNull();
    });
  });

  describe('getLastText', () => {
    it('should return last detected text', async () => {
      mockInvoke.mockResolvedValue('last selected text');
      const result = await getLastText();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_last_text');
      expect(result).toBe('last selected text');
    });

    it('should return null when no text has been detected', async () => {
      mockInvoke.mockResolvedValue(null);
      const result = await getLastText();
      expect(result).toBeNull();
    });
  });

  describe('clearLastText', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await clearLastText();
      expect(mockInvoke).toHaveBeenCalledWith('selection_clear_last_text');
    });
  });

  describe('getLastSelection', () => {
    it('should return full selection context', async () => {
      const mockSelection: Selection = {
        text: 'selected code',
        text_before: 'const x = ',
        text_after: '; return x;',
        is_code: true,
        language: 'typescript',
        is_url: false,
        is_email: false,
        has_numbers: false,
        word_count: 2,
        char_count: 13,
        line_count: 1,
        text_type: 'code',
        source_app: {
          name: 'VSCode',
          process: 'code.exe',
          window_title: 'selection.ts - Cognia',
          app_type: 'editor',
        },
      };
      mockInvoke.mockResolvedValue(mockSelection);

      const result = await getLastSelection();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_last_selection');
      expect(result).not.toBeNull();
      expect(result?.text).toBe('selected code');
      expect(result?.is_code).toBe(true);
      expect(result?.language).toBe('typescript');
      expect(result?.source_app?.name).toBe('VSCode');
    });

    it('should return null when no selection has been analyzed', async () => {
      mockInvoke.mockResolvedValue(null);
      const result = await getLastSelection();
      expect(result).toBeNull();
    });
  });
});

describe('Selection - Service Management (New APIs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveConfig', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await saveConfig();
      expect(mockInvoke).toHaveBeenCalledWith('selection_save_config');
    });
  });

  describe('getSelectionStatus', () => {
    it('should return comprehensive status', async () => {
      const mockStatus = {
        is_running: true,
        toolbar_visible: false,
        toolbar_position: null,
        selected_text: null,
        last_selection_timestamp: null,
        config: { enabled: true, trigger_mode: 'auto', min_text_length: 1, max_text_length: 5000, delay_ms: 200, target_language: 'zh-CN', excluded_apps: [] },
      };
      mockInvoke.mockResolvedValue(mockStatus);
      const result = await getSelectionStatus();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_status');
      expect(result.is_running).toBe(true);
    });
  });

  describe('setSelectionEnabled', () => {
    it('should call invoke with enabled flag', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await setSelectionEnabled(true);
      expect(mockInvoke).toHaveBeenCalledWith('selection_set_enabled', { enabled: true });
    });
  });

  describe('isSelectionEnabled', () => {
    it('should return enabled state', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await isSelectionEnabled();
      expect(mockInvoke).toHaveBeenCalledWith('selection_is_enabled');
      expect(result).toBe(true);
    });
  });

  describe('restartSelectionService', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await restartSelectionService();
      expect(mockInvoke).toHaveBeenCalledWith('selection_restart');
    });
  });

  describe('setToolbarHovered', () => {
    it('should call invoke with hovered state', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await setToolbarHovered(true);
      expect(mockInvoke).toHaveBeenCalledWith('selection_set_toolbar_hovered', { hovered: true });
    });
  });

  describe('getToolbarState', () => {
    it('should return toolbar state when visible', async () => {
      mockInvoke.mockResolvedValue({ text: 'hello', x: 100, y: 200, textLength: 5 });
      const result = await getToolbarState();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_toolbar_state');
      expect(result?.text).toBe('hello');
    });

    it('should return null when toolbar is hidden', async () => {
      mockInvoke.mockResolvedValue(null);
      const result = await getToolbarState();
      expect(result).toBeNull();
    });
  });

  describe('setAutoHideTimeout', () => {
    it('should call invoke with timeout', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await setAutoHideTimeout(5000);
      expect(mockInvoke).toHaveBeenCalledWith('selection_set_auto_hide_timeout', { timeoutMs: 5000 });
    });
  });

  describe('releaseStuckKeys', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await releaseStuckKeys();
      expect(mockInvoke).toHaveBeenCalledWith('selection_release_stuck_keys');
    });
  });
});

describe('Selection - Detection & Analysis (New APIs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDetectionStats', () => {
    it('should return detection statistics', async () => {
      mockInvoke.mockResolvedValue({ attempts: 100, successes: 85, successRate: 0.85 });
      const result = await getDetectionStats();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_detection_stats');
      expect(result.successRate).toBe(0.85);
    });
  });

  describe('getEnhancedSelection', () => {
    it('should call invoke with text and app info', async () => {
      const mockSelection: Selection = {
        text: 'test', text_before: undefined, text_after: undefined, is_code: false,
        language: undefined, is_url: false, is_email: false, has_numbers: false,
        word_count: 1, char_count: 4, line_count: 1, text_type: 'text', source_app: undefined,
      };
      mockInvoke.mockResolvedValue(mockSelection);
      await getEnhancedSelection('test', 'Chrome', 'chrome.exe', 'Google');
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_enhanced', {
        text: 'test', appName: 'Chrome', processName: 'chrome.exe', windowTitle: 'Google',
      });
    });
  });

  describe('analyzeCurrentSelection', () => {
    it('should return null when nothing selected', async () => {
      mockInvoke.mockResolvedValue(null);
      const result = await analyzeCurrentSelection();
      expect(mockInvoke).toHaveBeenCalledWith('selection_analyze_current');
      expect(result).toBeNull();
    });
  });

  describe('detectTextType', () => {
    it('should return text type string', async () => {
      mockInvoke.mockResolvedValue('code');
      const result = await detectTextType('function foo() {}');
      expect(mockInvoke).toHaveBeenCalledWith('selection_detect_text_type', { text: 'function foo() {}' });
      expect(result).toBe('code');
    });
  });

  describe('getStatsSummary', () => {
    it('should return combined stats', async () => {
      mockInvoke.mockResolvedValue({
        detection: { attempts: 50, successes: 40, successRate: 0.8 },
        history: { totalSelections: 30, byApp: {}, byType: {}, averageLength: 45 },
      });
      const result = await getStatsSummary();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_stats_summary');
      expect(result.detection.attempts).toBe(50);
      expect(result.history.totalSelections).toBe(30);
    });
  });
});

describe('Selection - Expansion (New APIs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('expandToWord', () => {
    it('should call invoke and return expansion result', async () => {
      mockInvoke.mockResolvedValue([0, 5, 'hello']);
      const result = await expandToWord('hello world', 3);
      expect(mockInvoke).toHaveBeenCalledWith('selection_expand_to_word', { text: 'hello world', cursorPos: 3 });
      expect(result).toEqual([0, 5, 'hello']);
    });
  });

  describe('expandToSentence', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue([0, 12, 'Hello world.']);
      const result = await expandToSentence('Hello world. Goodbye.', 5);
      expect(mockInvoke).toHaveBeenCalledWith('selection_expand_to_sentence', { text: 'Hello world. Goodbye.', cursorPos: 5 });
      expect(result[2]).toBe('Hello world.');
    });
  });

  describe('expandToLine', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue([0, 5, 'line1']);
      await expandToLine('line1\nline2', 3);
      expect(mockInvoke).toHaveBeenCalledWith('selection_expand_to_line', { text: 'line1\nline2', cursorPos: 3 });
    });
  });

  describe('expandToParagraph', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue([0, 10, 'paragraph1']);
      await expandToParagraph('paragraph1\n\nparagraph2', 5);
      expect(mockInvoke).toHaveBeenCalledWith('selection_expand_to_paragraph', { text: 'paragraph1\n\nparagraph2', cursorPos: 5 });
    });
  });
});

describe('Selection - History Time Search (New API)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchHistoryByTime', () => {
    it('should call invoke with time range', async () => {
      mockInvoke.mockResolvedValue([]);
      await searchHistoryByTime(1000, 2000);
      expect(mockInvoke).toHaveBeenCalledWith('selection_search_history_by_time', { start: 1000, end: 2000 });
    });
  });
});

describe('Selection - Toolbar Config (New APIs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getToolbarConfig', () => {
    it('should return config object', async () => {
      mockInvoke.mockResolvedValue({ theme: 'dark', autoHide: true });
      const result = await getToolbarConfig();
      expect(mockInvoke).toHaveBeenCalledWith('selection_get_toolbar_config');
      expect(result).toHaveProperty('theme');
    });
  });

  describe('setToolbarTheme', () => {
    it('should persist theme locally', async () => {
      await setToolbarTheme('glass');
      expect(localStorage.getItem('selection:toolbar-theme')).toBe('glass');
    });
  });
});

describe('Selection - Clipboard Context Analysis (New APIs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeClipboardContent', () => {
    it('should return analysis result', async () => {
      mockInvoke.mockResolvedValue({
        category: 'code', secondary_categories: [], language: 'javascript',
        confidence: 0.9, entities: [], suggested_actions: [],
        stats: { char_count: 20, word_count: 5, line_count: 1, has_unicode: false, has_emoji: false, has_whitespace_only_lines: false },
        is_sensitive: false, formatting: { syntax_highlight: true, language_hint: 'javascript', preserve_whitespace: true, is_multiline: false, max_preview_lines: 1 },
      });
      const result = await analyzeClipboardContent('const x = 5;');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_analyze_content', { content: 'const x = 5;' });
      expect(result.category).toBe('code');
    });
  });

  describe('getCurrentClipboardWithAnalysis', () => {
    it('should return null when clipboard is empty', async () => {
      mockInvoke.mockResolvedValue(null);
      const result = await getCurrentClipboardWithAnalysis();
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_get_current_with_analysis');
      expect(result).toBeNull();
    });
  });

  describe('transformClipboardContent', () => {
    it('should call invoke with content and action', async () => {
      mockInvoke.mockResolvedValue('HELLO WORLD');
      const result = await transformClipboardContent('hello world', 'to_uppercase');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_transform_content', { content: 'hello world', action: 'to_uppercase' });
      expect(result).toBe('HELLO WORLD');
    });
  });

  describe('writeClipboardText', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await writeClipboardText('test text');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_write_text', { text: 'test text' });
    });
  });

  describe('readClipboardText', () => {
    it('should return clipboard text', async () => {
      mockInvoke.mockResolvedValue('clipboard content');
      const result = await readClipboardText();
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_read_text');
      expect(result).toBe('clipboard content');
    });
  });

  describe('writeClipboardHtml', () => {
    it('should call invoke with html and alt text', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await writeClipboardHtml('<b>bold</b>', 'bold');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_write_html', { html: '<b>bold</b>', altText: 'bold' });
    });
  });

  describe('clearClipboard', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await clearClipboard();
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_clear');
    });
  });

  describe('getClipboardSuggestedActions', () => {
    it('should return actions', async () => {
      mockInvoke.mockResolvedValue([{ action_id: 'open_url', label: 'Open', description: 'Open URL', icon: 'globe', priority: 1 }]);
      const result = await getClipboardSuggestedActions('https://example.com');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_get_suggested_actions', { content: 'https://example.com' });
      expect(result).toHaveLength(1);
      expect(result[0].action_id).toBe('open_url');
    });
  });

  describe('extractClipboardEntities', () => {
    it('should return entities', async () => {
      mockInvoke.mockResolvedValue([{ entity_type: 'email', value: 'test@example.com', start: 0, end: 16 }]);
      const result = await extractClipboardEntities('test@example.com');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_extract_entities', { content: 'test@example.com' });
      expect(result[0].entity_type).toBe('email');
    });
  });

  describe('checkClipboardSensitive', () => {
    it('should return sensitivity status', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await checkClipboardSensitive('password=secret123');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_check_sensitive', { content: 'password=secret123' });
      expect(result).toBe(true);
    });
  });

  describe('getClipboardContentStats', () => {
    it('should return stats', async () => {
      mockInvoke.mockResolvedValue({ char_count: 11, word_count: 2, line_count: 1, has_unicode: false, has_emoji: false, has_whitespace_only_lines: false });
      const result = await getClipboardContentStats('hello world');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_get_stats', { content: 'hello world' });
      expect(result.word_count).toBe(2);
    });
  });

  describe('detectClipboardCategory', () => {
    it('should return category info', async () => {
      mockInvoke.mockResolvedValue(['Url', [], 0.95]);
      const result = await detectClipboardCategory('https://example.com');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_detect_category', { content: 'https://example.com' });
      expect(result[0]).toBe('Url');
    });
  });

  describe('detectClipboardLanguage', () => {
    it('should return language', async () => {
      mockInvoke.mockResolvedValue('javascript');
      const result = await detectClipboardLanguage('const x = 5;');
      expect(mockInvoke).toHaveBeenCalledWith('clipboard_detect_language', { content: 'const x = 5;' });
      expect(result).toBe('javascript');
    });

    it('should return null for non-code', async () => {
      mockInvoke.mockResolvedValue(null);
      const result = await detectClipboardLanguage('hello world');
      expect(result).toBeNull();
    });
  });
});

describe('Selection - Event Listeners (New APIs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onSelectionAIChunk', () => {
    it('should set up listener', async () => {
      mockListen.mockResolvedValue(jest.fn());
      await onSelectionAIChunk(jest.fn());
      expect(mockListen).toHaveBeenCalledWith('selection-ai-chunk', expect.any(Function));
    });
  });

  describe('onQuickAction', () => {
    it('should set up listener', async () => {
      mockListen.mockResolvedValue(jest.fn());
      await onQuickAction(jest.fn());
      expect(mockListen).toHaveBeenCalledWith('selection-quick-action', expect.any(Function));
    });
  });

  describe('onQuickTranslate', () => {
    it('should set up listener', async () => {
      mockListen.mockResolvedValue(jest.fn());
      await onQuickTranslate(jest.fn());
      expect(mockListen).toHaveBeenCalledWith('selection-quick-translate', expect.any(Function));
    });
  });
});
