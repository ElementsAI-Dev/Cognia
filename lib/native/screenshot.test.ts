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
  type ScreenshotResult,
  type ScreenshotConfig,
  type MonitorInfo,
  type WinOcrResult,
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
