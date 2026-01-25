/**
 * Screenshot Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useScreenshotStore } from './screenshot-store';
import * as utilsModule from '@/lib/native/utils';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock isTauri
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn().mockReturnValue(true),
}));

// Mock console.error to suppress error output in tests
const _mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

const mockIsTauri = utilsModule.isTauri as jest.Mock;

describe('useScreenshotStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useScreenshotStore.setState({
        isCapturing: false,
        lastScreenshot: null,
        history: [],
        pinnedCount: 0,
        monitors: [],
        selectedMonitor: null,
        ocrAvailable: false,
        isLoading: false,
        isInitialized: false,
        error: null,
      });
    });
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  afterAll(() => {
    // Restore console.error mock
    _mockConsoleError.mockRestore();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useScreenshotStore());

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.lastScreenshot).toBeNull();
      expect(result.current.history).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have default config', () => {
      const { result } = renderHook(() => useScreenshotStore());

      expect(result.current.config.format).toBe('png');
      expect(result.current.config.quality).toBe(95);
      expect(result.current.config.copyToClipboard).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should initialize store with monitors and OCR availability', async () => {
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
      ];

      mockInvoke.mockImplementation((command: string) => {
        switch (command) {
          case 'screenshot_get_monitors':
            return Promise.resolve(mockMonitors);
          case 'screenshot_ocr_is_available':
            return Promise.resolve(true);
          case 'screenshot_get_history':
            return Promise.resolve([]);
          default:
            return Promise.resolve();
        }
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.monitors.length).toBe(1);
      expect(result.current.monitors[0].isPrimary).toBe(true);
      expect(result.current.ocrAvailable).toBe(true);
    });

    it('should set isInitialized when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('captureFullscreen', () => {
    it('should capture fullscreen and update state', async () => {
      const mockResult = {
        image_base64: 'base64imagedata',
        metadata: {
          width: 1920,
          height: 1080,
          mode: 'fullscreen',
          timestamp: Date.now(),
          monitor_index: 0,
        },
      };

      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_capture_fullscreen_with_history') {
          return Promise.resolve(mockResult);
        }
        if (command === 'screenshot_get_history') {
          return Promise.resolve([]);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        const screenshot = await result.current.captureFullscreen(0);
        expect(screenshot).not.toBeNull();
        expect(screenshot?.imageBase64).toBe('base64imagedata');
      });

      expect(result.current.lastScreenshot).not.toBeNull();
      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_fullscreen_with_history', {
        monitorIndex: 0,
      });
    });

    it('should handle capture errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Capture failed'));

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        const screenshot = await result.current.captureFullscreen();
        expect(screenshot).toBeNull();
      });

      expect(result.current.error).toBe('Capture failed');
      expect(result.current.isCapturing).toBe(false);
    });

    it('should return null when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        const screenshot = await result.current.captureFullscreen();
        expect(screenshot).toBeNull();
      });

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('captureWindow', () => {
    it('should capture window and update state', async () => {
      const mockResult = {
        image_base64: 'base64imagedata',
        metadata: {
          width: 800,
          height: 600,
          mode: 'window',
          timestamp: Date.now(),
          window_title: 'Test Window',
        },
      };

      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_capture_window_with_history') {
          return Promise.resolve(mockResult);
        }
        if (command === 'screenshot_get_history') {
          return Promise.resolve([]);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        const screenshot = await result.current.captureWindow();
        expect(screenshot?.metadata.windowTitle).toBe('Test Window');
      });
    });
  });

  describe('captureRegion', () => {
    it('should capture region with coordinates', async () => {
      const mockResult = {
        image_base64: 'base64imagedata',
        metadata: {
          width: 400,
          height: 300,
          mode: 'region',
          timestamp: Date.now(),
        },
      };

      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_capture_region_with_history') {
          return Promise.resolve(mockResult);
        }
        if (command === 'screenshot_get_history') {
          return Promise.resolve([]);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        const screenshot = await result.current.captureRegion(100, 100, 400, 300);
        expect(screenshot).not.toBeNull();
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_capture_region_with_history', {
        x: 100,
        y: 100,
        width: 400,
        height: 300,
      });
    });
  });

  describe('history management', () => {
    const mockHistory = [
      {
        id: '1',
        timestamp: Date.now(),
        thumbnail_base64: 'thumb1',
        width: 1920,
        height: 1080,
        mode: 'fullscreen',
        tags: [],
        is_pinned: false,
      },
      {
        id: '2',
        timestamp: Date.now() - 1000,
        thumbnail_base64: 'thumb2',
        width: 800,
        height: 600,
        mode: 'window',
        window_title: 'Test',
        tags: ['tag1'],
        is_pinned: true,
      },
    ];

    it('should refresh history', async () => {
      mockInvoke.mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.refreshHistory(50);
      });

      expect(result.current.history.length).toBe(2);
      expect(result.current.pinnedCount).toBe(1);
    });

    it('should search history', async () => {
      mockInvoke.mockResolvedValue([mockHistory[1]]);

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        const results = await result.current.searchHistory('Test');
        expect(results.length).toBe(1);
        expect(results[0].windowTitle).toBe('Test');
      });
    });

    it('should pin screenshot', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_pin') {
          return Promise.resolve();
        }
        if (command === 'screenshot_get_history') {
          return Promise.resolve(mockHistory);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.pinScreenshot('1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_pin', { id: '1' });
    });

    it('should unpin screenshot', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_unpin') {
          return Promise.resolve();
        }
        if (command === 'screenshot_get_history') {
          return Promise.resolve(mockHistory);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.unpinScreenshot('2');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_unpin', { id: '2' });
    });

    it('should delete screenshot', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_delete') {
          return Promise.resolve();
        }
        if (command === 'screenshot_get_history') {
          return Promise.resolve([mockHistory[1]]);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.deleteScreenshot('1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_delete', { id: '1' });
    });

    it('should clear history', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.clearHistory();
      });

      expect(result.current.history).toEqual([]);
      expect(result.current.pinnedCount).toBe(0);
    });

    it('should add tag to screenshot', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_add_tag') {
          return Promise.resolve(true);
        }
        if (command === 'screenshot_get_history') {
          return Promise.resolve([
            {
              id: '1',
              timestamp: Date.now(),
              width: 1920,
              height: 1080,
              mode: 'fullscreen',
              tags: ['new-tag'],
              is_pinned: false,
            },
          ]);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.addTag('1', 'new-tag');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_add_tag', { id: '1', tag: 'new-tag' });
    });

    it('should remove tag from screenshot', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_remove_tag') {
          return Promise.resolve(true);
        }
        if (command === 'screenshot_get_history') {
          return Promise.resolve([
            {
              id: '1',
              timestamp: Date.now(),
              width: 1920,
              height: 1080,
              mode: 'fullscreen',
              tags: [],
              is_pinned: false,
            },
          ]);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.removeTag('1', 'old-tag');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_remove_tag', { id: '1', tag: 'old-tag' });
    });

    it('should set label for screenshot', async () => {
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'screenshot_set_label') {
          return Promise.resolve(true);
        }
        if (command === 'screenshot_get_history') {
          return Promise.resolve([
            {
              id: '1',
              timestamp: Date.now(),
              width: 1920,
              height: 1080,
              mode: 'fullscreen',
              tags: [],
              label: 'My Label',
              is_pinned: false,
            },
          ]);
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.setLabel('1', 'My Label');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_set_label', {
        id: '1',
        label: 'My Label',
      });
    });
  });

  describe('OCR', () => {
    it('should extract text from image', async () => {
      mockInvoke.mockResolvedValue('Extracted text content');

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        const text = await result.current.extractText('base64image');
        expect(text).toBe('Extracted text content');
      });

      expect(mockInvoke).toHaveBeenCalledWith('screenshot_ocr', { imageBase64: 'base64image' });
    });

    it('should return empty string on OCR failure', async () => {
      mockInvoke.mockRejectedValue(new Error('OCR failed'));

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        const text = await result.current.extractText('base64image');
        expect(text).toBe('');
      });
    });
  });

  describe('configuration', () => {
    it('should update config', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useScreenshotStore());

      await act(async () => {
        await result.current.updateConfig({ quality: 85, format: 'jpg' });
      });

      expect(result.current.config.quality).toBe(85);
      expect(result.current.config.format).toBe('jpg');
    });

    it('should reset config to defaults', () => {
      const { result } = renderHook(() => useScreenshotStore());

      act(() => {
        useScreenshotStore.setState({
          config: { ...result.current.config, quality: 50 },
        });
      });

      act(() => {
        result.current.resetConfig();
      });

      expect(result.current.config.quality).toBe(95);
      expect(result.current.config.format).toBe('png');
    });
  });

  describe('monitor selection', () => {
    it('should set selected monitor', () => {
      const { result } = renderHook(() => useScreenshotStore());

      act(() => {
        result.current.setSelectedMonitor(1);
      });

      expect(result.current.selectedMonitor).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useScreenshotStore());

      act(() => {
        useScreenshotStore.setState({ error: 'Test error' });
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('utilities', () => {
    it('should clear last screenshot', () => {
      const { result } = renderHook(() => useScreenshotStore());

      act(() => {
        useScreenshotStore.setState({
          lastScreenshot: {
            imageBase64: 'test',
            metadata: { width: 100, height: 100, mode: 'fullscreen', timestamp: Date.now() },
          },
        });
      });

      expect(result.current.lastScreenshot).not.toBeNull();

      act(() => {
        result.current.clearLastScreenshot();
      });

      expect(result.current.lastScreenshot).toBeNull();
    });
  });
});
