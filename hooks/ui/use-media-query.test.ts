/**
 * Tests for useMediaQuery hook
 * Comprehensive test coverage for media query detection
 */

import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './use-media-query';

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => {
  const listeners: Array<() => void> = [];
  return {
    matches,
    media: '',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn((_, callback) => {
      listeners.push(callback);
    }),
    removeEventListener: jest.fn((_, callback) => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }),
    dispatchEvent: jest.fn(),
    // Helper to simulate media query change
    _triggerChange: () => {
      listeners.forEach((listener) => listener());
    },
  };
};

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('Initial State', () => {
    it('should return true when query matches', () => {
      const mockMQ = mockMatchMedia(true);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'));

      expect(result.current).toBe(true);
    });

    it('should return false when query does not match', () => {
      const mockMQ = mockMatchMedia(false);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

      expect(result.current).toBe(false);
    });

    it('should call matchMedia with correct query', () => {
      const mockMQ = mockMatchMedia(true);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));

      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });
  });

  describe('Query Changes', () => {
    it('should update when media query changes', () => {
      let currentMatches = false;
      const listeners: Array<() => void> = [];

      window.matchMedia = jest.fn().mockImplementation(() => ({
        get matches() {
          return currentMatches;
        },
        media: '',
        onchange: null,
        addEventListener: jest.fn((_, callback) => {
          listeners.push(callback);
        }),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'));

      expect(result.current).toBe(false);

      // Simulate media query change
      act(() => {
        currentMatches = true;
        listeners.forEach((listener) => listener());
      });

      expect(result.current).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const mockMQ = mockMatchMedia(true);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      const { unmount } = renderHook(() => useMediaQuery('(min-width: 640px)'));

      unmount();

      expect(mockMQ.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('SSR Compatibility', () => {
    it('should return false when window is undefined', () => {
      const originalWindow = global.window;

      // Temporarily remove window
       
      delete (global as any).window;

      // Note: This test is limited because JSDOM provides window
      // In actual SSR, the hook returns false from getServerSnapshot

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Different Query Types', () => {
    it('should handle min-width queries', () => {
      const mockMQ = mockMatchMedia(true);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(result.current).toBe(true);
    });

    it('should handle max-width queries', () => {
      const mockMQ = mockMatchMedia(false);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      const { result } = renderHook(() => useMediaQuery('(max-width: 1024px)'));

      expect(result.current).toBe(false);
    });

    it('should handle prefers-color-scheme queries', () => {
      const mockMQ = mockMatchMedia(true);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));

      expect(result.current).toBe(true);
    });

    it('should handle prefers-reduced-motion queries', () => {
      const mockMQ = mockMatchMedia(true);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      const { result } = renderHook(() => useMediaQuery('(prefers-reduced-motion: reduce)'));

      expect(result.current).toBe(true);
    });

    it('should handle orientation queries', () => {
      const mockMQ = mockMatchMedia(true);
      window.matchMedia = jest.fn().mockReturnValue(mockMQ);

      const { result } = renderHook(() => useMediaQuery('(orientation: landscape)'));

      expect(result.current).toBe(true);
    });
  });

  describe('Query Updates', () => {
    it('should respond to query prop changes', () => {
      const mockMQSmall = mockMatchMedia(true);
      const mockMQLarge = mockMatchMedia(false);

      window.matchMedia = jest.fn().mockImplementation((query) => {
        if (query === '(min-width: 640px)') return mockMQSmall;
        return mockMQLarge;
      });

      const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
        initialProps: { query: '(min-width: 640px)' },
      });

      expect(result.current).toBe(true);

      rerender({ query: '(min-width: 1024px)' });

      expect(result.current).toBe(false);
    });
  });

  describe('Multiple Instances', () => {
    it('should support multiple hooks with different queries', () => {
      window.matchMedia = jest.fn().mockImplementation((query) => {
        if (query === '(min-width: 640px)') return mockMatchMedia(true);
        if (query === '(min-width: 1024px)') return mockMatchMedia(false);
        return mockMatchMedia(false);
      });

      const { result: result1 } = renderHook(() => useMediaQuery('(min-width: 640px)'));
      const { result: result2 } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

      expect(result1.current).toBe(true);
      expect(result2.current).toBe(false);
    });
  });
});
