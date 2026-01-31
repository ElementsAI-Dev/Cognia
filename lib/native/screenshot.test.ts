/**
 * Screenshot Tests
 *
 * Tests for screenshot API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  captureFullscreen,
  captureWindow,
  captureRegion,
  startRegionSelection,
  captureFullscreenWithHistory,
  captureWindowWithHistory,
  captureRegionWithHistory,
  extractText,
  extractTextWindows,
  extractTextWithLanguage,
  getOcrLanguages,
  isOcrAvailable,
  isOcrLanguageAvailable,
  getHistory,
  searchHistory,
  getScreenshotById,
  pinScreenshot,
  unpinScreenshot,
  deleteScreenshot,
  clearHistory,
  getConfig,
  updateConfig,
  getMonitors,
  saveToFile,
  getWindows,
  getWindowsWithThumbnails,
  getWindowAtPoint,
  getChildElements,
  captureWindowByHwnd,
  captureWindowByHwndWithHistory,
  calculateSelectionSnap,
  getPixelColor,
  getSnapConfig,
  setSnapConfig,
  type ScreenshotResult,
  type ScreenshotConfig,
  type MonitorInfo,
  type WinOcrResult,
  type WindowInfo,
  type ElementInfo,
  type SelectionSnapResult,
  type SnapConfig,
} from './screenshot';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('Screenshot - Basic Capture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('captureFullscreen', () => {
    it('should call invoke with monitor index', async () => {
      const mockResult: ScreenshotResult = {
        image_base64: 'base64data',
        metadata: { width: 1920, height: 1080, mode: 'fullscreen', timestamp: Date.now() },
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await captureFullscreen(0);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_fullscreen', { monitorIndex: 0 });
      expect(result).toEqual(mockResult);
    });

    it('should work without monitor index', async () => {
      mockInvoke.mockResolvedValue({} as ScreenshotResult);
      await captureFullscreen();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_fullscreen', { monitorIndex: undefined });
    });
  });

  describe('captureWindow', () => {
    it('should call invoke', async () => {
      const mockResult: ScreenshotResult = {
        image_base64: 'base64data',
        metadata: { width: 800, height: 600, mode: 'window', timestamp: Date.now(), window_title: 'Test' },
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await captureWindow();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_window');
      expect(result.metadata.window_title).toBe('Test');
    });
  });

  describe('captureRegion', () => {
    it('should call invoke with region parameters', async () => {
      mockInvoke.mockResolvedValue({} as ScreenshotResult);

      await captureRegion(100, 100, 400, 300);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_region', {
        x: 100,
        y: 100,
        width: 400,
        height: 300,
      });
    });
  });

  describe('startRegionSelection', () => {
    it('should call invoke and return region', async () => {
      mockInvoke.mockResolvedValue({ x: 50, y: 50, width: 200, height: 150 });

      const result = await startRegionSelection();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_start_region_selection');
      expect(result).toEqual({ x: 50, y: 50, width: 200, height: 150 });
    });
  });
});

describe('Screenshot - Capture with History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('captureFullscreenWithHistory', () => {
    it('should call invoke with monitor index', async () => {
      mockInvoke.mockResolvedValue({} as ScreenshotResult);
      await captureFullscreenWithHistory(1);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_fullscreen_with_history', { monitorIndex: 1 });
    });
  });

  describe('captureWindowWithHistory', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({} as ScreenshotResult);
      await captureWindowWithHistory();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_window_with_history');
    });
  });

  describe('captureRegionWithHistory', () => {
    it('should call invoke with region', async () => {
      mockInvoke.mockResolvedValue({} as ScreenshotResult);
      await captureRegionWithHistory(0, 0, 100, 100);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_region_with_history', {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
    });
  });
});

describe('Screenshot - OCR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractText', () => {
    it('should call invoke with image base64', async () => {
      mockInvoke.mockResolvedValue('Extracted text');
      const result = await extractText('base64data');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_ocr', { imageBase64: 'base64data' });
      expect(result).toBe('Extracted text');
    });
  });

  describe('extractTextWindows', () => {
    it('should call invoke and return detailed result', async () => {
      const mockResult: WinOcrResult = {
        text: 'Hello World',
        lines: [
          {
            text: 'Hello World',
            words: [
              { text: 'Hello', bounds: { x: 0, y: 0, width: 50, height: 20 }, confidence: 0.95 },
              { text: 'World', bounds: { x: 55, y: 0, width: 50, height: 20 }, confidence: 0.98 },
            ],
            bounds: { x: 0, y: 0, width: 110, height: 20 },
          },
        ],
        confidence: 0.96,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await extractTextWindows('base64data');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_ocr_windows', { imageBase64: 'base64data' });
      expect(result.text).toBe('Hello World');
      expect(result.lines).toHaveLength(1);
    });
  });

  describe('extractTextWithLanguage', () => {
    it('should call invoke with language', async () => {
      mockInvoke.mockResolvedValue({} as WinOcrResult);
      await extractTextWithLanguage('base64data', 'zh-Hans');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_ocr_with_language', {
        imageBase64: 'base64data',
        language: 'zh-Hans',
      });
    });
  });

  describe('getOcrLanguages', () => {
    it('should return available languages', async () => {
      mockInvoke.mockResolvedValue(['en', 'zh-Hans', 'zh-Hant', 'ja']);
      const result = await getOcrLanguages();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_ocr_languages');
      expect(result).toContain('en');
    });
  });

  describe('isOcrAvailable', () => {
    it('should return availability', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await isOcrAvailable();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_ocr_is_available');
      expect(result).toBe(true);
    });
  });

  describe('isOcrLanguageAvailable', () => {
    it('should check language availability', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await isOcrLanguageAvailable('en');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_ocr_is_language_available', { language: 'en' });
      expect(result).toBe(true);
    });
  });
});

describe('Screenshot - History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should call invoke with count', async () => {
      mockInvoke.mockResolvedValue([]);
      await getHistory(20);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_history', { count: 20 });
    });
  });

  describe('searchHistory', () => {
    it('should call invoke with query', async () => {
      mockInvoke.mockResolvedValue([]);
      await searchHistory('test query');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_search_history', { query: 'test query' });
    });
  });

  describe('getScreenshotById', () => {
    it('should call invoke with id', async () => {
      mockInvoke.mockResolvedValue({ id: 'ss-123' });
      const result = await getScreenshotById('ss-123');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_by_id', { id: 'ss-123' });
      expect(result?.id).toBe('ss-123');
    });
  });

  describe('pinScreenshot', () => {
    it('should call invoke with id', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await pinScreenshot('ss-123');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_pin', { id: 'ss-123' });
      expect(result).toBe(true);
    });
  });

  describe('unpinScreenshot', () => {
    it('should call invoke with id', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await unpinScreenshot('ss-123');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_unpin', { id: 'ss-123' });
      expect(result).toBe(true);
    });
  });

  describe('deleteScreenshot', () => {
    it('should call invoke with id', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await deleteScreenshot('ss-123');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_delete', { id: 'ss-123' });
      expect(result).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await clearHistory();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_clear_history');
    });
  });
});

describe('Screenshot - Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should call invoke', async () => {
      const mockConfig: ScreenshotConfig = {
        format: 'png',
        quality: 90,
        include_cursor: false,
        copy_to_clipboard: true,
        show_notification: true,
        auto_save: false,
        filename_template: 'screenshot_{timestamp}',
      };
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await getConfig();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_config');
      expect(result.format).toBe('png');
    });
  });

  describe('updateConfig', () => {
    it('should call invoke with config', async () => {
      const config: ScreenshotConfig = {
        format: 'jpeg',
        quality: 80,
        include_cursor: true,
        copy_to_clipboard: false,
        show_notification: false,
        auto_save: true,
        filename_template: 'ss_{timestamp}',
      };
      mockInvoke.mockResolvedValue(undefined);

      await updateConfig(config);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_update_config', { config });
    });
  });

  describe('getMonitors', () => {
    it('should return monitors', async () => {
      const mockMonitors: MonitorInfo[] = [
        { index: 0, name: 'Primary', x: 0, y: 0, width: 1920, height: 1080, is_primary: true, scale_factor: 1 },
      ];
      mockInvoke.mockResolvedValue(mockMonitors);

      const result = await getMonitors();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_monitors');
      expect(result[0].is_primary).toBe(true);
    });
  });

  describe('saveToFile', () => {
    it('should call invoke with image and path', async () => {
      mockInvoke.mockResolvedValue('/path/to/screenshot.png');
      const result = await saveToFile('base64data', '/path/to/screenshot.png');
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_save', {
        imageBase64: 'base64data',
        path: '/path/to/screenshot.png',
      });
      expect(result).toBe('/path/to/screenshot.png');
    });
  });
});

describe('Screenshot - Window Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWindows', () => {
    it('should call invoke and return windows list', async () => {
      const mockWindows: WindowInfo[] = [
        {
          hwnd: 12345,
          title: 'Test Window',
          process_name: 'test.exe',
          pid: 1000,
          x: 100,
          y: 200,
          width: 800,
          height: 600,
          is_minimized: false,
          is_maximized: false,
          is_visible: true,
        },
      ];
      mockInvoke.mockResolvedValue(mockWindows);

      const result = await getWindows();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_windows');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Window');
    });
  });

  describe('getWindowsWithThumbnails', () => {
    it('should call invoke with thumbnail size', async () => {
      mockInvoke.mockResolvedValue([]);
      await getWindowsWithThumbnails(200);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_windows_with_thumbnails', {
        thumbnailSize: 200,
      });
    });

    it('should work without thumbnail size', async () => {
      mockInvoke.mockResolvedValue([]);
      await getWindowsWithThumbnails();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_windows_with_thumbnails', {
        thumbnailSize: undefined,
      });
    });
  });

  describe('getWindowAtPoint', () => {
    it('should call invoke with coordinates', async () => {
      const mockWindow: WindowInfo = {
        hwnd: 12345,
        title: 'Window at Point',
        process_name: 'app.exe',
        pid: 2000,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        is_minimized: false,
        is_maximized: true,
        is_visible: true,
      };
      mockInvoke.mockResolvedValue(mockWindow);

      const result = await getWindowAtPoint(500, 300);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_window_at_point', { x: 500, y: 300 });
      expect(result?.title).toBe('Window at Point');
    });

    it('should return null when no window at point', async () => {
      mockInvoke.mockResolvedValue(null);
      const result = await getWindowAtPoint(0, 0);
      expect(result).toBeNull();
    });
  });

  describe('getChildElements', () => {
    it('should call invoke with hwnd and max depth', async () => {
      const mockElements: ElementInfo[] = [
        {
          x: 50,
          y: 100,
          width: 200,
          height: 30,
          element_type: 'Button',
          name: 'Submit',
          parent_hwnd: 12345,
        },
      ];
      mockInvoke.mockResolvedValue(mockElements);

      const result = await getChildElements(12345, 2);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_child_elements', {
        hwnd: 12345,
        maxDepth: 2,
      });
      expect(result).toHaveLength(1);
      expect(result[0].element_type).toBe('Button');
    });
  });

  describe('captureWindowByHwnd', () => {
    it('should call invoke with hwnd', async () => {
      mockInvoke.mockResolvedValue({} as ScreenshotResult);
      await captureWindowByHwnd(12345);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_window_by_hwnd', { hwnd: 12345 });
    });
  });

  describe('captureWindowByHwndWithHistory', () => {
    it('should call invoke with hwnd', async () => {
      mockInvoke.mockResolvedValue({} as ScreenshotResult);
      await captureWindowByHwndWithHistory(12345);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_window_by_hwnd_with_history', {
        hwnd: 12345,
      });
    });
  });
});

describe('Screenshot - Selection Snap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSelectionSnap', () => {
    it('should call invoke with selection parameters', async () => {
      const mockResult: SelectionSnapResult = {
        x: 100,
        y: 200,
        width: 800,
        height: 600,
        snapped: true,
        guides: [
          {
            orientation: 'vertical',
            position: 100,
            start: 0,
            end: 1080,
            source: 'Screen',
          },
        ],
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await calculateSelectionSnap(100, 200, 800, 600);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_calculate_selection_snap', {
        selectionX: 100,
        selectionY: 200,
        selectionWidth: 800,
        selectionHeight: 600,
      });
      expect(result.snapped).toBe(true);
      expect(result.guides).toHaveLength(1);
    });

    it('should return unsnapped result when no edges nearby', async () => {
      const mockResult: SelectionSnapResult = {
        x: 150,
        y: 250,
        width: 400,
        height: 300,
        snapped: false,
        guides: [],
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await calculateSelectionSnap(150, 250, 400, 300);
      expect(result.snapped).toBe(false);
      expect(result.guides).toHaveLength(0);
    });
  });

  describe('getSnapConfig', () => {
    it('should call invoke and return config', async () => {
      const mockConfig: SnapConfig = {
        snap_distance: 20,
        snap_to_screen: true,
        snap_to_windows: true,
        snap_to_elements: false,
        show_guide_lines: true,
        magnetic_edges: true,
      };
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await getSnapConfig();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_snap_config');
      expect(result.snap_distance).toBe(20);
      expect(result.magnetic_edges).toBe(true);
    });
  });

  describe('setSnapConfig', () => {
    it('should call invoke with config', async () => {
      const config: SnapConfig = {
        snap_distance: 30,
        snap_to_screen: false,
        snap_to_windows: true,
        snap_to_elements: true,
        show_guide_lines: false,
        magnetic_edges: true,
      };
      mockInvoke.mockResolvedValue(undefined);

      await setSnapConfig(config);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_set_snap_config', { config });
    });
  });
});

describe('Screenshot - Color Picker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPixelColor', () => {
    it('should call invoke with coordinates and return hex color', async () => {
      mockInvoke.mockResolvedValue('#FF5733');
      const result = await getPixelColor(100, 200);
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_get_pixel_color', { x: 100, y: 200 });
      expect(result).toBe('#FF5733');
    });

    it('should return null when color cannot be retrieved', async () => {
      mockInvoke.mockResolvedValue(null);
      const result = await getPixelColor(0, 0);
      expect(result).toBeNull();
    });
  });
});
