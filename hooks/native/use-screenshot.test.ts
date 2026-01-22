/**
 * Tests for useScreenshot and useScreenshotHistory hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useScreenshot, useScreenshotHistory } from './use-screenshot';

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

describe('useScreenshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  const mockScreenshotResult = {
    image_base64: 'base64imagedata',
    metadata: {
      width: 1920,
      height: 1080,
      mode: 'fullscreen',
      timestamp: Date.now(),
      window_title: undefined,
      monitor_index: 0,
    },
  };

  const mockMonitors = [
    {
      index: 0,
      name: 'Primary Monitor',
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      is_primary: true,
      scale_factor: 1.0,
    },
    {
      index: 1,
      name: 'Secondary Monitor',
      x: 1920,
      y: 0,
      width: 1920,
      height: 1080,
      is_primary: false,
      scale_factor: 1.0,
    },
  ];

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useScreenshot());
      expect(result.current.isCapturing).toBe(false);
      expect(result.current.lastScreenshot).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('captureFullscreen', () => {
    it('should capture fullscreen and update state', async () => {
      mockInvoke.mockResolvedValue(mockScreenshotResult);
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const screenshot = await result.current.captureFullscreen();
        expect(screenshot).toEqual(mockScreenshotResult);
      });

      expect(result.current.lastScreenshot).toEqual(mockScreenshotResult);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_fullscreen_with_history', {
        monitorIndex: undefined,
      });
    });

    it('should capture specific monitor', async () => {
      mockInvoke.mockResolvedValue(mockScreenshotResult);
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        await result.current.captureFullscreen(1);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_fullscreen_with_history', {
        monitorIndex: 1,
      });
    });

    it('should handle capture errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Capture failed'));
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const screenshot = await result.current.captureFullscreen();
        expect(screenshot).toBeNull();
      });

      expect(result.current.error).toBe('Capture failed');
    });

    it('should set isCapturing during capture', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValue(promise);

      const { result } = renderHook(() => useScreenshot());

      act(() => {
        result.current.captureFullscreen();
      });

      await waitFor(() => {
        expect(result.current.isCapturing).toBe(true);
      });

      await act(async () => {
        resolvePromise!(mockScreenshotResult);
        await promise;
      });

      expect(result.current.isCapturing).toBe(false);
    });
  });

  describe('captureWindow', () => {
    it('should capture active window', async () => {
      const windowResult = {
        ...mockScreenshotResult,
        metadata: { ...mockScreenshotResult.metadata, mode: 'window', window_title: 'Test Window' },
      };
      mockInvoke.mockResolvedValue(windowResult);
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const screenshot = await result.current.captureWindow();
        expect(screenshot).toEqual(windowResult);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_window_with_history');
    });
  });

  describe('captureRegion', () => {
    it('should capture specified region', async () => {
      const regionResult = {
        ...mockScreenshotResult,
        metadata: { ...mockScreenshotResult.metadata, mode: 'region', width: 400, height: 300 },
      };
      mockInvoke.mockResolvedValue(regionResult);
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const screenshot = await result.current.captureRegion(100, 100, 400, 300);
        expect(screenshot).toEqual(regionResult);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_region_with_history', {
        x: 100,
        y: 100,
        width: 400,
        height: 300,
      });
    });
  });

  describe('startRegionSelection', () => {
    it('should start region selection and return coordinates', async () => {
      const mockRegion = { x: 50, y: 50, width: 200, height: 150 };
      mockInvoke.mockResolvedValue(mockRegion);
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const region = await result.current.startRegionSelection();
        expect(region).toEqual(mockRegion);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_start_region_selection');
    });
  });

  describe('extractText', () => {
    it('should extract text from image using OCR', async () => {
      mockInvoke.mockResolvedValue('Extracted text content');
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const text = await result.current.extractText('base64image');
        expect(text).toBe('Extracted text content');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_ocr', { imageBase64: 'base64image' });
    });

    it('should return empty string on OCR failure', async () => {
      mockInvoke.mockRejectedValue(new Error('OCR failed'));
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const text = await result.current.extractText('base64image');
        expect(text).toBe('');
      });
    });
  });

  describe('extractTextWindows', () => {
    it('should extract text using Windows OCR', async () => {
      const mockOcrResult = {
        text: 'Windows OCR text',
        lines: [{ text: 'Line 1', words: [], bounds: { x: 0, y: 0, width: 100, height: 20 } }],
        language: 'en',
        confidence: 0.95,
      };
      mockInvoke.mockResolvedValue(mockOcrResult);
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const ocrResult = await result.current.extractTextWindows('base64image');
        expect(ocrResult).toEqual(mockOcrResult);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_ocr_windows', {
        imageBase64: 'base64image',
      });
    });
  });

  describe('getMonitors', () => {
    it('should return list of monitors', async () => {
      mockInvoke.mockResolvedValue(mockMonitors);
      const { result } = renderHook(() => useScreenshot());

      await act(async () => {
        const monitors = await result.current.getMonitors();
        expect(monitors).toEqual(mockMonitors);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_monitors');
    });
  });

  describe('saveToFile', () => {
    it('should save screenshot to file', async () => {
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
  });

  const mockHistoryEntry = {
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
    it('should initialize with empty history', () => {
      mockInvoke.mockResolvedValue([]);
      const { result } = renderHook(() => useScreenshotHistory());
      expect(result.current.history).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('fetchHistory', () => {
    it('should fetch and update history', async () => {
      mockInvoke.mockResolvedValue([mockHistoryEntry]);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        await result.current.fetchHistory(10);
      });

      expect(result.current.history).toEqual([mockHistoryEntry]);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_history', { count: 10 });
    });
  });

  describe('searchHistory', () => {
    it('should search history by OCR text', async () => {
      mockInvoke.mockResolvedValue([mockHistoryEntry]);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        const results = await result.current.searchHistory('Some text');
        expect(results).toEqual([mockHistoryEntry]);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_search_history', { query: 'Some text' });
    });
  });

  describe('getById', () => {
    it('should get screenshot by ID', async () => {
      mockInvoke.mockResolvedValue(mockHistoryEntry);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        const entry = await result.current.getById('screenshot-1');
        expect(entry).toEqual(mockHistoryEntry);
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
    it('should pin screenshot and refresh history', async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValue([]);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        const success = await result.current.pinScreenshot('screenshot-1');
        expect(success).toBe(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_pin', { id: 'screenshot-1' });
    });
  });

  describe('unpinScreenshot', () => {
    it('should unpin screenshot and refresh history', async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValue([]);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        const success = await result.current.unpinScreenshot('screenshot-1');
        expect(success).toBe(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_unpin', { id: 'screenshot-1' });
    });
  });

  describe('deleteScreenshot', () => {
    it('should delete screenshot and refresh history', async () => {
      mockInvoke.mockResolvedValueOnce(true).mockResolvedValue([]);
      const { result } = renderHook(() => useScreenshotHistory());

      await act(async () => {
        const success = await result.current.deleteScreenshot('screenshot-1');
        expect(success).toBe(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_delete', { id: 'screenshot-1' });
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', async () => {
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

  it('returns null when capturing outside Tauri', async () => {
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
