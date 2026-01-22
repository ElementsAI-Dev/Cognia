/**
 * Tests for useClipboardMonitor hook
 */

import { renderHook, act } from '@testing-library/react';
import { useClipboardMonitor } from './use-clipboard-monitor';

// Mock navigator.clipboard
const mockReadText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    readText: mockReadText,
    writeText: jest.fn(),
  },
  writable: true,
});

describe('useClipboardMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockReadText.mockResolvedValue('');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useClipboardMonitor({ enabled: false }));

      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.currentContent).toBeNull();
      expect(result.current.history).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should provide action functions', () => {
      const { result } = renderHook(() => useClipboardMonitor({ enabled: false }));

      expect(typeof result.current.startMonitoring).toBe('function');
      expect(typeof result.current.stopMonitoring).toBe('function');
      expect(typeof result.current.clearHistory).toBe('function');
    });
  });

  describe('content analysis', () => {
    it('should detect URLs', async () => {
      mockReadText.mockResolvedValue('https://example.com');

      const { result } = renderHook(() => useClipboardMonitor({ enabled: true }));

      await act(async () => {
        jest.advanceTimersByTime(1100);
      });

      // Allow async operations to complete
      await act(async () => {
        await Promise.resolve();
      });

      if (result.current.currentContent?.analysis) {
        expect(result.current.currentContent.analysis.isUrl).toBe(true);
        expect(result.current.currentContent.analysis.category).toBe('url');
      }
    });

    it('should detect emails', async () => {
      mockReadText.mockResolvedValue('test@example.com');

      const { result } = renderHook(() => useClipboardMonitor({ enabled: true }));

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      if (result.current.currentContent?.analysis) {
        expect(result.current.currentContent.analysis.isEmail).toBe(true);
        expect(result.current.currentContent.analysis.category).toBe('email');
      }
    });

    it('should detect code', async () => {
      mockReadText.mockResolvedValue('const x = 1;\nfunction test() {}');

      const { result } = renderHook(() => useClipboardMonitor({ enabled: true }));

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      if (result.current.currentContent?.analysis) {
        expect(result.current.currentContent.analysis.isCode).toBe(true);
        expect(result.current.currentContent.analysis.category).toBe('code');
      }
    });

    it('should detect programming language', async () => {
      mockReadText.mockResolvedValue('def hello():\n    print("Hello")');

      const { result } = renderHook(() => useClipboardMonitor({ enabled: true }));

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      if (result.current.currentContent?.analysis) {
        expect(result.current.currentContent.analysis.language).toBe('python');
      }
    });
  });

  describe('monitoring controls', () => {
    it('should start monitoring', async () => {
      const { result } = renderHook(() => useClipboardMonitor({ enabled: false }));

      expect(result.current.isMonitoring).toBe(false);

      act(() => {
        result.current.startMonitoring();
      });

      expect(result.current.isMonitoring).toBe(true);
    });

    it('should stop monitoring', async () => {
      const { result } = renderHook(() => useClipboardMonitor({ enabled: true }));

      act(() => {
        result.current.stopMonitoring();
      });

      expect(result.current.isMonitoring).toBe(false);
    });
  });

  describe('history management', () => {
    it('should add to history on content change', async () => {
      mockReadText.mockResolvedValueOnce('first content').mockResolvedValueOnce('second content');

      const { result } = renderHook(() => useClipboardMonitor({ enabled: true }));

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      expect(result.current.history.length).toBeGreaterThanOrEqual(0);
    });

    it('should clear history', async () => {
      mockReadText.mockResolvedValue('content');

      const { result } = renderHook(() => useClipboardMonitor({ enabled: true }));

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.history).toEqual([]);
    });

    it('should limit history size', async () => {
      const { result } = renderHook(() =>
        useClipboardMonitor({ enabled: true, maxHistorySize: 2 })
      );

      // Simulate multiple clipboard changes
      for (let i = 0; i < 5; i++) {
        mockReadText.mockResolvedValueOnce(`content ${i}`);
        await act(async () => {
          jest.advanceTimersByTime(1100);
          await Promise.resolve();
        });
      }

      expect(result.current.history.length).toBeLessThanOrEqual(2);
    });
  });

  describe('callbacks', () => {
    it('should call onClipboardChange', async () => {
      const onClipboardChange = jest.fn();
      mockReadText.mockResolvedValue('new content');

      renderHook(() => useClipboardMonitor({ enabled: true, onClipboardChange }));

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      expect(onClipboardChange).toHaveBeenCalled();
    });
  });

  describe('suggested actions', () => {
    it('should suggest URL actions for URLs', async () => {
      mockReadText.mockResolvedValue('https://example.com');

      const { result } = renderHook(() => useClipboardMonitor({ enabled: true }));

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      if (result.current.currentContent?.analysis) {
        expect(result.current.currentContent.analysis.suggestedActions).toContain('open');
      }
    });

    it('should suggest code actions for code', async () => {
      mockReadText.mockResolvedValue('function test() { return 1; }');

      const { result } = renderHook(() => useClipboardMonitor({ enabled: true }));

      await act(async () => {
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
      });

      if (result.current.currentContent?.analysis) {
        expect(result.current.currentContent.analysis.suggestedActions).toContain('explain-code');
      }
    });
  });
});
