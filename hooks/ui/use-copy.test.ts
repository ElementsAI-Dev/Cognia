/**
 * Tests for useCopy hook
 */

import { renderHook, act } from '@testing-library/react';
import { useCopy, getCopyHistory, addToCopyHistory, clearCopyHistory } from './use-copy';
import { writeClipboardText } from '@/lib/file/clipboard';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/file/clipboard', () => ({
  writeClipboardText: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockWriteClipboard = writeClipboardText as jest.MockedFunction<typeof writeClipboardText>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
Object.defineProperty(window.crypto, 'randomUUID', {
  value: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
});

describe('useCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockWriteClipboard.mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useCopy());

      expect(result.current.isCopying).toBe(false);
      expect(result.current.lastCopied).toBeNull();
      expect(result.current.lastCopiedAt).toBeNull();
    });
  });

  describe('copy', () => {
    it('should copy text to clipboard', async () => {
      const { result } = renderHook(() => useCopy());

      let copyResult;
      await act(async () => {
        copyResult = await result.current.copy('Hello World');
      });

      expect(copyResult).toEqual({ success: true });
      expect(mockWriteClipboard).toHaveBeenCalledWith('Hello World');
      expect(result.current.lastCopied).toBe('Hello World');
      expect(result.current.lastCopiedAt).toBeInstanceOf(Date);
    });

    it('should show success toast by default', async () => {
      const { result } = renderHook(() => useCopy());

      await act(async () => {
        await result.current.copy('Test');
      });

      expect(mockToast.success).toHaveBeenCalledWith('Copied to clipboard');
    });

    it('should show custom toast message', async () => {
      const { result } = renderHook(() => useCopy());

      await act(async () => {
        await result.current.copy('Test', { toastMessage: 'Custom message' });
      });

      expect(mockToast.success).toHaveBeenCalledWith('Custom message');
    });

    it('should not show toast when showToast is false', async () => {
      const { result } = renderHook(() => useCopy());

      await act(async () => {
        await result.current.copy('Test', { showToast: false });
      });

      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useCopy());

      await act(async () => {
        await result.current.copy('Test', { onSuccess });
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should handle copy errors', async () => {
      mockWriteClipboard.mockRejectedValue(new Error('Copy failed'));
      const onError = jest.fn();
      const { result } = renderHook(() => useCopy());

      const copyResult = await act(async () => {
        return await result.current.copy('Test', { onError });
      });

      expect(copyResult.success).toBe(false);
      expect(copyResult.error?.message).toBe('Copy failed');
      expect(onError).toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('Failed to copy to clipboard');
    });

    it('should set isCopying during copy operation', async () => {
      let resolveCopy: () => void;
      mockWriteClipboard.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCopy = resolve;
          })
      );

      const { result } = renderHook(() => useCopy());

      let copyPromise: Promise<unknown>;
      act(() => {
        copyPromise = result.current.copy('Test');
      });

      expect(result.current.isCopying).toBe(true);

      await act(async () => {
        resolveCopy!();
        await copyPromise;
      });

      expect(result.current.isCopying).toBe(false);
    });
  });

  describe('copyFormatted', () => {
    it('should format and copy as JSON', async () => {
      const { result } = renderHook(() => useCopy());
      const data = { name: 'test', value: 123 };

      await act(async () => {
        await result.current.copyFormatted(data, 'json');
      });

      expect(mockWriteClipboard).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('should format and copy as markdown list', async () => {
      const { result } = renderHook(() => useCopy());
      const data = ['item1', 'item2', 'item3'];

      await act(async () => {
        await result.current.copyFormatted(data, 'markdown');
      });

      expect(mockWriteClipboard).toHaveBeenCalledWith('1. item1\n2. item2\n3. item3');
    });

    it('should format and copy as HTML', async () => {
      const { result } = renderHook(() => useCopy());
      const data = { key: 'value' };

      await act(async () => {
        await result.current.copyFormatted(data, 'html');
      });

      expect(mockWriteClipboard).toHaveBeenCalledWith(
        `<pre>${JSON.stringify(data, null, 2)}</pre>`
      );
    });

    it('should pass through string content', async () => {
      const { result } = renderHook(() => useCopy());

      await act(async () => {
        await result.current.copyFormatted('plain text', 'text');
      });

      expect(mockWriteClipboard).toHaveBeenCalledWith('plain text');
    });
  });

  describe('copyMultiple', () => {
    it('should combine multiple contents with separator', async () => {
      const { result } = renderHook(() => useCopy());

      await act(async () => {
        await result.current.copyMultiple(['first', 'second', 'third']);
      });

      expect(mockWriteClipboard).toHaveBeenCalledWith('first\n\nsecond\n\nthird');
    });

    it('should use custom separator', async () => {
      const { result } = renderHook(() => useCopy());

      await act(async () => {
        await result.current.copyMultiple(['a', 'b', 'c'], ' | ');
      });

      expect(mockWriteClipboard).toHaveBeenCalledWith('a | b | c');
    });

    it('should show count in toast message', async () => {
      const { result } = renderHook(() => useCopy());

      await act(async () => {
        await result.current.copyMultiple(['a', 'b']);
      });

      expect(mockToast.success).toHaveBeenCalledWith('Copied 2 items to clipboard');
    });
  });

  describe('default options', () => {
    it('should apply default options', async () => {
      const { result } = renderHook(() => useCopy({ showToast: false }));

      await act(async () => {
        await result.current.copy('Test');
      });

      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('should allow overriding default options', async () => {
      const { result } = renderHook(() => useCopy({ showToast: false }));

      await act(async () => {
        await result.current.copy('Test', { showToast: true });
      });

      expect(mockToast.success).toHaveBeenCalled();
    });
  });
});

describe('copy history functions', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('getCopyHistory', () => {
    it('should return empty array when no history', () => {
      const history = getCopyHistory();
      expect(history).toEqual([]);
    });

    it('should return parsed history', () => {
      const mockHistory = [
        {
          id: '1',
          content: 'test',
          format: 'text',
          timestamp: new Date().toISOString(),
          preview: 'test',
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));

      const history = getCopyHistory();
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('test');
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should handle invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const history = getCopyHistory();
      expect(history).toEqual([]);
    });
  });

  describe('addToCopyHistory', () => {
    it('should add item to history', () => {
      addToCopyHistory('test content', 'text');

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].content).toBe('test content');
      expect(savedData[0].format).toBe('text');
    });

    it('should create preview for long content', () => {
      const longContent = 'a'.repeat(150);
      addToCopyHistory(longContent, 'text');

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData[0].preview).toBe('a'.repeat(100) + '...');
    });

    it('should remove duplicates', () => {
      const existingHistory = [
        {
          id: '1',
          content: 'duplicate',
          format: 'text',
          timestamp: new Date().toISOString(),
          preview: 'duplicate',
        },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory));

      addToCopyHistory('duplicate', 'text');

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
    });
  });

  describe('clearCopyHistory', () => {
    it('should remove history from localStorage', () => {
      clearCopyHistory();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cognia-copy-history');
    });
  });
});
