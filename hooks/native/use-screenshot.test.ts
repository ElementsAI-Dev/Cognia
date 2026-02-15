/**
 * Tests for useScreenshot and useScreenshotHistory hooks
 *
 * The hooks are thin proxies over useScreenshotStore.
 * Store-delegated methods are tested in screenshot-store.test.ts.
 * Here we test the pure API wrappers and non-Tauri fallbacks.
 */

import { renderHook, act } from '@testing-library/react';
import { useScreenshot, useScreenshotHistory } from './use-screenshot';
import { useScreenshotStore } from '@/stores/media';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock isTauri
const mockIsTauri = jest.fn(() => true);
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

// Mock console.error to suppress error output in tests
const _mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('useScreenshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  afterAll(() => {
    _mockConsoleError.mockRestore();
  });

  describe('initialization', () => {
    it('should initialize with default values from store', () => {
      const { result } = renderHook(() => useScreenshot());
      expect(result.current.isCapturing).toBe(false);
      expect(result.current.lastScreenshot).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should expose store-delegated methods', () => {
      const { result } = renderHook(() => useScreenshot());
      expect(typeof result.current.captureFullscreen).toBe('function');
      expect(typeof result.current.captureWindow).toBe('function');
      expect(typeof result.current.captureRegion).toBe('function');
      expect(typeof result.current.extractText).toBe('function');
      expect(typeof result.current.saveToFile).toBe('function');
    });

    it('should expose pure API wrappers', () => {
      const { result } = renderHook(() => useScreenshot());
      expect(typeof result.current.startRegionSelection).toBe('function');
      expect(typeof result.current.getMonitors).toBe('function');
      expect(typeof result.current.validateSelection).toBe('function');
      expect(typeof result.current.calculateSnap).toBe('function');
      expect(typeof result.current.getCurrentOcrLanguage).toBe('function');
    });
  });

  describe('pure API wrappers', () => {
    it('should start region selection via API', async () => {
      const mockRegion = { x: 50, y: 50, width: 200, height: 150 };
      mockInvoke.mockResolvedValue(mockRegion);
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const region = await result.current.startRegionSelection();
        expect(region).toEqual(mockRegion);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_start_region_selection');
    });

    it('should get monitors via API', async () => {
      const mockMonitors = [
        { index: 0, name: 'Primary', x: 0, y: 0, width: 1920, height: 1080, is_primary: true, scale_factor: 1.0 },
      ];
      mockInvoke.mockResolvedValue(mockMonitors);
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const monitors = await result.current.getMonitors();
        expect(monitors).toEqual(mockMonitors);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_monitors');
    });

    it('should handle startRegionSelection errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Selection failed'));
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const region = await result.current.startRegionSelection();
        expect(region).toBeNull();
      });
    });

    it('should handle getMonitors errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Monitor error'));
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const monitors = await result.current.getMonitors();
        expect(monitors).toEqual([]);
      });
    });
  });

  describe('store-delegated capture methods', () => {
    it('should call captureFullscreen on the store', async () => {
      const mockResult = {
        image_base64: 'base64imagedata',
        metadata: { width: 1920, height: 1080, mode: 'fullscreen', timestamp: Date.now() },
      };
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_capture_fullscreen_with_history') return Promise.resolve(mockResult);
        if (command === 'screenshot_get_history') return Promise.resolve([]);
        return Promise.resolve();
      });
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const screenshot = await result.current.captureFullscreen();
        // Store transforms snake_case → camelCase
        expect(screenshot?.imageBase64).toBe('base64imagedata');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_fullscreen_with_history', {
        monitorIndex: undefined,
      });
    });

    it('should handle capture errors via store', async () => {
      mockInvoke.mockRejectedValue(new Error('Capture failed'));
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const screenshot = await result.current.captureFullscreen();
        expect(screenshot).toBeNull();
      });

      expect(result.current.error).toBe('Capture failed');
    });

    it('should call extractText on the store', async () => {
      mockInvoke.mockResolvedValue('Extracted text content');
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const text = await result.current.extractText('base64image');
        expect(text).toBe('Extracted text content');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_ocr', { imageBase64: 'base64image' });
    });

    it('should call saveToFile on the store', async () => {
      mockInvoke.mockResolvedValue('/path/to/saved/screenshot.png');
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const path = await result.current.saveToFile('base64image', '/path/to/save.png');
        expect(path).toBe('/path/to/saved/screenshot.png');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_save', {
        imageBase64: 'base64image',
        path: '/path/to/save.png',
      });
    });
  });
});

describe('useScreenshotHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
    // Reset the store
    useScreenshotStore.setState({ history: [], isLoading: false, pinnedCount: 0 });
  });

  // The store transforms snake_case API responses to camelCase
  const mockHistoryEntryFromApi = {
    id: 'screenshot-1',
    timestamp: Date.now(),
    thumbnail_base64: 'thumbnaildata',
    file_path: '/path/to/screenshot.png',
    width: 1920,
    height: 1080,
    mode: 'fullscreen',
    window_title: undefined,
    ocr_text: 'Some text',
    label: 'Important screenshot',
    tags: ['work', 'bug'],
    is_pinned: false,
  };

  describe('initialization', () => {
    it('should initialize with empty history from store', () => {
      const { result } = renderHook(() => useScreenshotHistory());
      expect(result.current.history).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should expose all history methods', () => {
      const { result } = renderHook(() => useScreenshotHistory());
      expect(typeof result.current.fetchHistory).toBe('function');
      expect(typeof result.current.searchHistory).toBe('function');
      expect(typeof result.current.getById).toBe('function');
      expect(typeof result.current.pinScreenshot).toBe('function');
      expect(typeof result.current.unpinScreenshot).toBe('function');
      expect(typeof result.current.deleteScreenshot).toBe('function');
      expect(typeof result.current.clearHistory).toBe('function');
      expect(typeof result.current.clearAllHistory).toBe('function');
    });
  });

  describe('fetchHistory', () => {
    it('should fetch and update history via store', async () => {
      mockInvoke.mockResolvedValue([mockHistoryEntryFromApi]);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        await result.current.fetchHistory(10);
      });

      // Store transforms to camelCase
      expect(result.current.history.length).toBe(1);
      expect(result.current.history[0].thumbnailBase64).toBe('thumbnaildata');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_history', { count: 10 });
    });
  });

  describe('searchHistory', () => {
    it('should search history by OCR text via store', async () => {
      mockInvoke.mockResolvedValue([mockHistoryEntryFromApi]);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        const results = await result.current.searchHistory('Some text');
        expect(results.length).toBe(1);
        expect(results[0].thumbnailBase64).toBe('thumbnaildata');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_search_history', { query: 'Some text' });
    });
  });

  describe('getById', () => {
    it('should get screenshot by ID via store', async () => {
      mockInvoke.mockResolvedValue(mockHistoryEntryFromApi);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        const entry = await result.current.getById('screenshot-1');
        // Store transforms to camelCase
        expect(entry?.thumbnailBase64).toBe('thumbnaildata');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_by_id', { id: 'screenshot-1' });
    });

    it('should return null for non-existent ID', async () => {
      mockInvoke.mockResolvedValue(null);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        const entry = await result.current.getById('nonexistent');
        expect(entry).toBeNull();
      });
    });
  });

  describe('pinScreenshot', () => {
    it('should pin screenshot via store (optimistic update, void return)', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        // pinScreenshot is now void (optimistic update)
        await result.current.pinScreenshot('screenshot-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_pin', { id: 'screenshot-1' });
    });
  });

  describe('unpinScreenshot', () => {
    it('should unpin screenshot via store (optimistic update, void return)', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        await result.current.unpinScreenshot('screenshot-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_unpin', { id: 'screenshot-1' });
    });
  });

  describe('deleteScreenshot', () => {
    it('should delete screenshot via store (optimistic update, void return)', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        await result.current.deleteScreenshot('screenshot-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_delete', { id: 'screenshot-1' });
    });
  });

  describe('clearHistory', () => {
    it('should clear history via store', async () => {
      mockInvoke.mockResolvedValue(undefined);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        await result.current.clearHistory();
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_clear_history');
      expect(result.current.history).toEqual([]);
    });
  });
});

describe('useScreenshot non-tauri fallback', () => {
  beforeEach(() => {
    mockIsTauri.mockReturnValue(false);
    mockInvoke.mockReset();
  });

  it('returns null for pure API wrappers when not in Tauri', async () => {
    const { result } = renderHook(() => useScreenshot());

    await act(async () => {
      const region = await result.current.startRegionSelection();
      expect(region).toBeNull();
    });

    await act(async () => {
      const monitors = await result.current.getMonitors();
      expect(monitors).toEqual([]);
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns null for store-delegated capture when not in Tauri', async () => {
    const { result } = renderHook(() => useScreenshot());

    await act(async () => {
      const capture = await result.current.captureFullscreen();
      expect(capture).toBeNull();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('skips history fetch when not in Tauri', async () => {
    const { result } = renderHook(() => useScreenshotHistory());

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.current.history).toEqual([]);
  });
});
