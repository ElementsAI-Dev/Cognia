/**
 * Tests for useContext hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useContext } from './use-context';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock isTauri
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => true,
}));

describe('useContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockWindowInfo = {
    handle: 12345,
    title: 'Test Window',
    class_name: 'TestClass',
    process_id: 1234,
    process_name: 'test.exe',
    executable_path: 'C:\\test.exe',
    is_visible: true,
    is_minimized: false,
    is_maximized: false,
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  };

  const mockAppContext = {
    app_type: 'CodeEditor' as const,
    app_name: 'Visual Studio Code',
    version: '1.85.0',
    supports_text_input: true,
    supports_rich_text: false,
    is_dev_tool: true,
    suggested_actions: ['Explain code', 'Fix bug', 'Refactor'],
    metadata: {},
  };

  const mockFileContext = {
    file_path: 'C:\\project\\main.ts',
    file_name: 'main.ts',
    file_extension: 'ts',
    directory: 'C:\\project',
    is_modified: false,
    language: 'typescript',
    project_root: 'C:\\project',
  };

  const mockBrowserContext = {
    browser_name: 'Chrome',
    url: 'https://example.com',
    domain: 'example.com',
    page_title: 'Example Page',
    is_secure: true,
    tab_count: 5,
  };

  const mockEditorContext = {
    editor_name: 'Visual Studio Code',
    file_path: 'C:\\project\\main.ts',
    file_name: 'main.ts',
    file_extension: 'ts',
    language: 'typescript',
    project_name: 'my-project',
    is_modified: false,
    git_branch: 'main',
    line_number: 42,
    column_number: 10,
    metadata: {},
  };

  const mockFullContext = {
    window: mockWindowInfo,
    app: mockAppContext,
    file: mockFileContext,
    browser: undefined,
    editor: mockEditorContext,
    timestamp: Date.now(),
  };

  describe('initialization', () => {
    it('should initialize and fetch context on mount', async () => {
      mockInvoke.mockResolvedValue(mockFullContext);
      const { result } = renderHook(() => useContext());

      // Initially loading
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('context_get_full');
      });

      // After loading completes
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.context).toEqual(mockFullContext);
      });
    });

    it('should handle null context response', async () => {
      mockInvoke.mockResolvedValue(null);
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.context).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchContext', () => {
    it('should fetch and update context', async () => {
      mockInvoke.mockResolvedValue(mockFullContext);
      const { result } = renderHook(() => useContext());

      await act(async () => {
        const ctx = await result.current.fetchContext();
        expect(ctx).toEqual(mockFullContext);
      });

      expect(result.current.context).toEqual(mockFullContext);
    });

    it('should handle errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Context fetch failed'));
      const { result } = renderHook(() => useContext());

      await act(async () => {
        const ctx = await result.current.fetchContext();
        expect(ctx).toBeNull();
      });

      expect(result.current.error).toBe('Context fetch failed');
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValue(promise);

      const { result } = renderHook(() => useContext());

      act(() => {
        result.current.fetchContext();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolvePromise!(mockFullContext);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('getWindowInfo', () => {
    it('should get window info', async () => {
      mockInvoke.mockResolvedValue(mockWindowInfo);
      const { result } = renderHook(() => useContext());

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const window = await result.current.getWindowInfo();
        expect(window).toEqual(mockWindowInfo);
      });

      expect(mockInvoke).toHaveBeenCalledWith('context_get_window');
    });

    it('should return null on error', async () => {
      // First call for initial fetch succeeds, second call fails
      mockInvoke.mockResolvedValueOnce(mockFullContext).mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const window = await result.current.getWindowInfo();
        expect(window).toBeNull();
      });
    });
  });

  describe('getAppContext', () => {
    it('should get app context', async () => {
      mockInvoke.mockResolvedValue(mockAppContext);
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const app = await result.current.getAppContext();
        expect(app).toEqual(mockAppContext);
      });

      expect(mockInvoke).toHaveBeenCalledWith('context_get_app');
    });
  });

  describe('getFileContext', () => {
    it('should get file context', async () => {
      mockInvoke.mockResolvedValue(mockFileContext);
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const file = await result.current.getFileContext();
        expect(file).toEqual(mockFileContext);
      });

      expect(mockInvoke).toHaveBeenCalledWith('context_get_file');
    });
  });

  describe('getBrowserContext', () => {
    it('should get browser context', async () => {
      mockInvoke.mockResolvedValue(mockBrowserContext);
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const browser = await result.current.getBrowserContext();
        expect(browser).toEqual(mockBrowserContext);
      });

      expect(mockInvoke).toHaveBeenCalledWith('context_get_browser');
    });
  });

  describe('getEditorContext', () => {
    it('should get editor context', async () => {
      mockInvoke.mockResolvedValue(mockEditorContext);
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const editor = await result.current.getEditorContext();
        expect(editor).toEqual(mockEditorContext);
      });

      expect(mockInvoke).toHaveBeenCalledWith('context_get_editor');
    });
  });

  describe('getAllWindows', () => {
    it('should get all windows', async () => {
      const mockWindows = [
        mockWindowInfo,
        { ...mockWindowInfo, handle: 54321, title: 'Another Window' },
      ];
      mockInvoke.mockResolvedValue(mockWindows);
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const windows = await result.current.getAllWindows();
        expect(windows).toEqual(mockWindows);
      });

      expect(mockInvoke).toHaveBeenCalledWith('context_get_all_windows');
    });

    it('should return empty array on error', async () => {
      mockInvoke.mockResolvedValueOnce(mockFullContext).mockRejectedValueOnce(new Error('Failed'));
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const windows = await result.current.getAllWindows();
        expect(windows).toEqual([]);
      });
    });
  });

  describe('findWindowsByTitle', () => {
    it('should find windows by title pattern', async () => {
      const mockWindows = [mockWindowInfo];
      mockInvoke.mockResolvedValue(mockWindows);
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const windows = await result.current.findWindowsByTitle('Test');
        expect(windows).toEqual(mockWindows);
      });

      expect(mockInvoke).toHaveBeenCalledWith('context_find_windows_by_title', { pattern: 'Test' });
    });
  });

  describe('findWindowsByProcess', () => {
    it('should find windows by process name', async () => {
      const mockWindows = [mockWindowInfo];
      mockInvoke.mockResolvedValue(mockWindows);
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const windows = await result.current.findWindowsByProcess('test.exe');
        expect(windows).toEqual(mockWindows);
      });

      expect(mockInvoke).toHaveBeenCalledWith('context_find_windows_by_process', {
        processName: 'test.exe',
      });
    });
  });

  describe('clearCache', () => {
    it('should clear context cache', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHook(() => useContext());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearCache();
      });

      expect(mockInvoke).toHaveBeenCalledWith('context_clear_cache');
    });
  });
});
