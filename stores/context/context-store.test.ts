/**
 * Context Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import {
  useContextStore,
  selectContext,
  selectWindow,
  selectApp,
  selectFile,
  selectBrowser,
  selectEditor,
  selectUiElements,
  selectIsLoading,
  selectError,
  selectAutoRefreshEnabled,
  selectRefreshIntervalMs,
  selectCacheDurationMs,
} from './context-store';
import type { FullContext, WindowInfo, UiElement } from '@/lib/native/context';

describe('Context Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useContextStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have null context initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.context).toBeNull();
    });

    it('should have default configuration', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.autoRefreshEnabled).toBe(true);
      expect(result.current.refreshIntervalMs).toBe(5000);
      expect(result.current.cacheDurationMs).toBe(500);
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.error).toBeNull();
    });
  });

  describe('setContext', () => {
    it('should set full context and extract components', () => {
      const { result } = renderHook(() => useContextStore());

      const mockWindow: WindowInfo = {
        handle: 12345,
        title: 'Test Window',
        class_name: 'TestClass',
        process_id: 1234,
        process_name: 'test.exe',
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        is_minimized: false,
        is_maximized: false,
        is_focused: true,
        is_visible: true,
      };

      const mockContext: FullContext = {
        window: mockWindow,
        app: {
          app_type: 'Browser',
          app_name: 'Chrome',
          supports_text_input: true,
          supports_rich_text: true,
          is_dev_tool: false,
          suggested_actions: [],
          metadata: {},
        },
        timestamp: Date.now(),
      };

      act(() => {
        result.current.setContext(mockContext);
      });

      expect(result.current.context).toEqual(mockContext);
      expect(result.current.window).toEqual(mockWindow);
      expect(result.current.app?.app_type).toBe('Browser');
      expect(result.current.lastUpdated).not.toBeNull();
    });

    it('should clear components when setting null context', () => {
      const { result } = renderHook(() => useContextStore());

      // First set a context
      act(() => {
        result.current.setContext({
          window: {
            handle: 1,
            title: 'Test',
            class_name: 'Test',
            process_id: 1,
            process_name: 'test',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
          },
          timestamp: Date.now(),
        });
      });

      expect(result.current.window).not.toBeNull();

      // Then clear it
      act(() => {
        result.current.setContext(null);
      });

      expect(result.current.context).toBeNull();
      expect(result.current.window).toBeNull();
    });
  });

  describe('setUiElements', () => {
    it('should set UI elements', () => {
      const { result } = renderHook(() => useContextStore());

      const mockElements: UiElement[] = [
        {
          element_type: 'Button',
          text: 'Click Me',
          x: 100,
          y: 100,
          width: 80,
          height: 30,
          is_interactive: true,
        },
      ];

      act(() => {
        result.current.setUiElements(mockElements);
      });

      expect(result.current.uiElements).toHaveLength(1);
      expect(result.current.uiElements[0].text).toBe('Click Me');
    });
  });

  describe('Loading and Error State', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setIsLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });
  });

  describe('Configuration', () => {
    it('should update auto refresh setting', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setAutoRefreshEnabled(false);
      });

      expect(result.current.autoRefreshEnabled).toBe(false);
    });

    it('should update refresh interval', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setRefreshIntervalMs(10000);
      });

      expect(result.current.refreshIntervalMs).toBe(10000);
    });

    it('should update cache duration', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setCacheDurationMs(1000);
      });

      expect(result.current.cacheDurationMs).toBe(1000);
    });
  });

  describe('clearContext', () => {
    it('should clear all context data', () => {
      const { result } = renderHook(() => useContextStore());

      // Set some context first
      act(() => {
        result.current.setContext({
          window: {
            handle: 1,
            title: 'Test',
            class_name: 'Test',
            process_id: 1,
            process_name: 'test',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
          },
          timestamp: Date.now(),
        });
        result.current.setUiElements([
          {
            element_type: 'Button',
            x: 0,
            y: 0,
            width: 50,
            height: 20,
            is_interactive: true,
          },
        ]);
      });

      expect(result.current.context).not.toBeNull();
      expect(result.current.uiElements).toHaveLength(1);

      act(() => {
        result.current.clearContext();
      });

      expect(result.current.context).toBeNull();
      expect(result.current.window).toBeNull();
      expect(result.current.uiElements).toHaveLength(0);
      expect(result.current.lastUpdated).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useContextStore());

      // Modify state
      act(() => {
        result.current.setAutoRefreshEnabled(false);
        result.current.setRefreshIntervalMs(10000);
        result.current.setCacheDurationMs(2000);
        result.current.setError('Some error');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.autoRefreshEnabled).toBe(true);
      expect(result.current.refreshIntervalMs).toBe(5000);
      expect(result.current.cacheDurationMs).toBe(500);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Context History', () => {
    const makeContext = (title: string, appName?: string): FullContext => ({
      window: {
        handle: 1,
        title,
        class_name: 'Test',
        process_id: 1,
        process_name: 'test',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        is_minimized: false,
        is_maximized: false,
        is_focused: true,
        is_visible: true,
      },
      app: appName
        ? {
            app_type: 'Browser',
            app_name: appName,
            supports_text_input: true,
            supports_rich_text: false,
            is_dev_tool: false,
            suggested_actions: [],
            metadata: {},
          }
        : undefined,
      timestamp: Date.now(),
    });

    it('should have empty history initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.contextHistory).toEqual([]);
      expect(result.current.historyIndex).toBeNull();
    });

    it('should push to history when setting new context', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setContext(makeContext('Window A'));
      });

      expect(result.current.contextHistory).toHaveLength(1);
      expect(result.current.contextHistory[0].context.window?.title).toBe('Window A');
    });

    it('should deduplicate consecutive identical contexts', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setContext(makeContext('Window A', 'App1'));
      });
      act(() => {
        result.current.setContext(makeContext('Window A', 'App1'));
      });

      expect(result.current.contextHistory).toHaveLength(1);
    });

    it('should add to history when context differs', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setContext(makeContext('Window A'));
      });
      act(() => {
        result.current.setContext(makeContext('Window B'));
      });

      expect(result.current.contextHistory).toHaveLength(2);
    });

    it('should cap history at MAX_CONTEXT_HISTORY', () => {
      const { result } = renderHook(() => useContextStore());

      for (let i = 0; i < 25; i++) {
        act(() => {
          result.current.setContext(makeContext(`Window ${i}`));
        });
      }

      expect(result.current.contextHistory).toHaveLength(20);
      // Should retain the most recent entries
      expect(result.current.contextHistory[19].context.window?.title).toBe('Window 24');
    });

    it('should reset historyIndex to null when new context arrives', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setContext(makeContext('Window A'));
      });
      act(() => {
        result.current.setContext(makeContext('Window B'));
      });
      act(() => {
        result.current.viewHistoryEntry(0);
      });

      expect(result.current.historyIndex).toBe(0);

      act(() => {
        result.current.setContext(makeContext('Window C'));
      });

      expect(result.current.historyIndex).toBeNull();
    });
  });

  describe('viewHistoryEntry', () => {
    it('should view a specific history entry', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setContext({
          window: {
            handle: 1, title: 'First', class_name: 'T', process_id: 1, process_name: 'p',
            x: 0, y: 0, width: 100, height: 100,
            is_minimized: false, is_maximized: false, is_focused: true, is_visible: true,
          },
          timestamp: Date.now(),
        });
      });
      act(() => {
        result.current.setContext({
          window: {
            handle: 2, title: 'Second', class_name: 'T', process_id: 2, process_name: 'p2',
            x: 0, y: 0, width: 100, height: 100,
            is_minimized: false, is_maximized: false, is_focused: true, is_visible: true,
          },
          timestamp: Date.now(),
        });
      });

      act(() => {
        result.current.viewHistoryEntry(0);
      });

      expect(result.current.historyIndex).toBe(0);
      expect(result.current.context?.window?.title).toBe('First');
    });

    it('should ignore invalid index', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.viewHistoryEntry(99);
      });

      expect(result.current.historyIndex).toBeNull();
    });
  });

  describe('viewLatest', () => {
    it('should restore the latest context and clear historyIndex', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setContext({
          window: {
            handle: 1, title: 'Old', class_name: 'T', process_id: 1, process_name: 'p',
            x: 0, y: 0, width: 100, height: 100,
            is_minimized: false, is_maximized: false, is_focused: true, is_visible: true,
          },
          timestamp: Date.now(),
        });
      });
      act(() => {
        result.current.setContext({
          window: {
            handle: 2, title: 'Latest', class_name: 'T', process_id: 2, process_name: 'p2',
            x: 0, y: 0, width: 100, height: 100,
            is_minimized: false, is_maximized: false, is_focused: true, is_visible: true,
          },
          timestamp: Date.now(),
        });
      });

      // Navigate back
      act(() => {
        result.current.viewHistoryEntry(0);
      });
      expect(result.current.context?.window?.title).toBe('Old');

      // Restore latest
      act(() => {
        result.current.viewLatest();
      });

      expect(result.current.historyIndex).toBeNull();
      expect(result.current.context?.window?.title).toBe('Latest');
    });
  });

  describe('clearHistory', () => {
    it('should clear history and reset historyIndex', () => {
      const { result } = renderHook(() => useContextStore());

      act(() => {
        result.current.setContext({
          window: {
            handle: 1, title: 'T', class_name: 'T', process_id: 1, process_name: 'p',
            x: 0, y: 0, width: 100, height: 100,
            is_minimized: false, is_maximized: false, is_focused: true, is_visible: true,
          },
          timestamp: Date.now(),
        });
      });

      expect(result.current.contextHistory).toHaveLength(1);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.contextHistory).toEqual([]);
      expect(result.current.historyIndex).toBeNull();
    });
  });

  describe('Selectors', () => {
    it('should select context', () => {
      const { result } = renderHook(() => useContextStore());
      const context = selectContext(result.current);
      expect(context).toBeNull();
    });

    it('should select window', () => {
      const { result } = renderHook(() => useContextStore());
      const window = selectWindow(result.current);
      expect(window).toBeNull();
    });

    it('should select app', () => {
      const { result } = renderHook(() => useContextStore());
      const app = selectApp(result.current);
      expect(app).toBeNull();
    });

    it('should select file', () => {
      const { result } = renderHook(() => useContextStore());
      const file = selectFile(result.current);
      expect(file).toBeNull();
    });

    it('should select browser', () => {
      const { result } = renderHook(() => useContextStore());
      const browser = selectBrowser(result.current);
      expect(browser).toBeNull();
    });

    it('should select editor', () => {
      const { result } = renderHook(() => useContextStore());
      const editor = selectEditor(result.current);
      expect(editor).toBeNull();
    });

    it('should select UI elements', () => {
      const { result } = renderHook(() => useContextStore());
      const elements = selectUiElements(result.current);
      expect(elements).toEqual([]);
    });

    it('should select loading state', () => {
      const { result } = renderHook(() => useContextStore());
      const isLoading = selectIsLoading(result.current);
      expect(isLoading).toBe(false);
    });

    it('should select error', () => {
      const { result } = renderHook(() => useContextStore());
      const error = selectError(result.current);
      expect(error).toBeNull();
    });

    it('should select auto refresh enabled', () => {
      const { result } = renderHook(() => useContextStore());
      const enabled = selectAutoRefreshEnabled(result.current);
      expect(enabled).toBe(true);
    });

    it('should select refresh interval', () => {
      const { result } = renderHook(() => useContextStore());
      const interval = selectRefreshIntervalMs(result.current);
      expect(interval).toBe(5000);
    });

    it('should select cache duration', () => {
      const { result } = renderHook(() => useContextStore());
      const duration = selectCacheDurationMs(result.current);
      expect(duration).toBe(500);
    });
  });
});
