/**
 * Tests for useSandpackBundler hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSandpackBundler } from './use-sandpack-bundler';

// Use fake timers for debounce testing
jest.useFakeTimers();

describe('useSandpackBundler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('initialization', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => useSandpackBundler());

      expect(result.current.bundlerState.status).toBe('idle');
      expect(result.current.bundlerState.progress).toBe(0);
      expect(result.current.bundlerState.message).toBeUndefined();
      expect(result.current.isPending).toBe(false);
      expect(result.current.isBundling).toBe(false);
    });

    it('should accept custom options', () => {
      const onProgress = jest.fn();
      const onBundleComplete = jest.fn();

      const { result } = renderHook(() =>
        useSandpackBundler({
          debounceMs: 2000,
          minChangeDelay: 1000,
          onProgress,
          onBundleComplete,
        })
      );

      expect(result.current.bundlerState.status).toBe('idle');
    });
  });

  describe('scheduleBundle', () => {
    it('should transition to pending state immediately', () => {
      const { result } = renderHook(() => useSandpackBundler());

      act(() => {
        result.current.scheduleBundle('const x = 1;');
      });

      expect(result.current.bundlerState.status).toBe('pending');
      expect(result.current.bundlerState.progress).toBe(10);
      expect(result.current.isPending).toBe(true);
    });

    it('should debounce bundle execution', () => {
      const onBundleComplete = jest.fn();
      const { result } = renderHook(() =>
        useSandpackBundler({ debounceMs: 1000, onBundleComplete })
      );

      act(() => {
        result.current.scheduleBundle('const x = 1;');
      });

      expect(result.current.bundlerState.status).toBe('pending');
      expect(onBundleComplete).not.toHaveBeenCalled();

      // Fast forward less than debounce time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onBundleComplete).not.toHaveBeenCalled();

      // Fast forward past debounce time
      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(result.current.bundlerState.status).toBe('bundling');
    });

    it('should reset timer on subsequent calls', () => {
      const { result } = renderHook(() =>
        useSandpackBundler({ debounceMs: 1000 })
      );

      act(() => {
        result.current.scheduleBundle('const x = 1;');
      });

      // Advance 500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Schedule again - should reset timer
      act(() => {
        result.current.scheduleBundle('const x = 2;');
      });

      // Advance another 500ms (total 1000ms from start, but only 500ms from second schedule)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should still be pending because timer was reset
      expect(result.current.bundlerState.status).toBe('pending');
    });

    it('should call onProgress callback', () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useSandpackBundler({ debounceMs: 100, onProgress })
      );

      act(() => {
        result.current.scheduleBundle('code');
      });

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          progress: 10,
        })
      );
    });
  });

  describe('cancelPendingBundle', () => {
    it('should cancel pending bundle', () => {
      const { result } = renderHook(() => useSandpackBundler());

      act(() => {
        result.current.scheduleBundle('const x = 1;');
      });

      expect(result.current.isPending).toBe(true);

      act(() => {
        result.current.cancelPendingBundle();
      });

      expect(result.current.bundlerState.status).toBe('idle');
      expect(result.current.bundlerState.progress).toBe(0);
      expect(result.current.isPending).toBe(false);
    });

    it('should prevent scheduled bundle from executing', () => {
      const onBundleComplete = jest.fn();
      const { result } = renderHook(() =>
        useSandpackBundler({ debounceMs: 1000, onBundleComplete })
      );

      act(() => {
        result.current.scheduleBundle('code');
      });

      act(() => {
        result.current.cancelPendingBundle();
      });

      // Fast forward past debounce time
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onBundleComplete).not.toHaveBeenCalled();
    });
  });

  describe('forceBundle', () => {
    it('should execute bundle immediately', async () => {
      jest.useRealTimers();

      const onBundleComplete = jest.fn();
      const { result } = renderHook(() =>
        useSandpackBundler({ onBundleComplete })
      );

      await act(async () => {
        result.current.forceBundle();
        // Wait for simulated progress
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      expect(onBundleComplete).toHaveBeenCalled();

      jest.useFakeTimers();
    });

    it('should cancel any pending bundle first', () => {
      const { result } = renderHook(() => useSandpackBundler());

      act(() => {
        result.current.scheduleBundle('code');
      });

      expect(result.current.isPending).toBe(true);

      act(() => {
        result.current.forceBundle();
      });

      expect(result.current.bundlerState.status).toBe('bundling');
    });
  });

  describe('bundling state transitions', () => {
    it('should transition through states: idle -> pending -> bundling -> complete -> idle', async () => {
      jest.useRealTimers();

      const states: string[] = [];
      const onProgress = jest.fn((progress) => {
        states.push(progress.status);
      });

      const { result } = renderHook(() =>
        useSandpackBundler({ debounceMs: 50, onProgress })
      );

      await act(async () => {
        result.current.scheduleBundle('code');
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Wait for bundling to complete
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      expect(states).toContain('pending');
      expect(states).toContain('bundling');
      expect(states).toContain('complete');

      jest.useFakeTimers();
    });

    it('should show progress during bundling', async () => {
      jest.useRealTimers();

      const progressValues: number[] = [];
      const onProgress = jest.fn((progress) => {
        progressValues.push(progress.progress);
      });

      const { result } = renderHook(() =>
        useSandpackBundler({ debounceMs: 10, onProgress })
      );

      await act(async () => {
        result.current.scheduleBundle('code');
        await new Promise((resolve) => setTimeout(resolve, 700));
      });

      // Should have various progress values
      expect(progressValues.some((p) => p > 10)).toBe(true);
      expect(progressValues.some((p) => p === 100)).toBe(true);

      jest.useFakeTimers();
    });
  });

  describe('callbacks', () => {
    it('should call onBundleComplete when bundle finishes', async () => {
      jest.useRealTimers();

      const onBundleComplete = jest.fn();
      const { result } = renderHook(() =>
        useSandpackBundler({ debounceMs: 10, onBundleComplete })
      );

      await act(async () => {
        result.current.scheduleBundle('code');
        await new Promise((resolve) => setTimeout(resolve, 700));
      });

      expect(onBundleComplete).toHaveBeenCalled();

      jest.useFakeTimers();
    });

    it('should call onProgress throughout the process', async () => {
      jest.useRealTimers();

      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useSandpackBundler({ debounceMs: 10, onProgress })
      );

      await act(async () => {
        result.current.scheduleBundle('code');
        await new Promise((resolve) => setTimeout(resolve, 700));
      });

      expect(onProgress.mock.calls.length).toBeGreaterThan(1);

      jest.useFakeTimers();
    });
  });

  describe('computed properties', () => {
    it('should set isPending correctly', () => {
      const { result } = renderHook(() => useSandpackBundler());

      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.scheduleBundle('code');
      });

      expect(result.current.isPending).toBe(true);
    });

    it('should set isBundling correctly', async () => {
      jest.useRealTimers();

      const { result } = renderHook(() =>
        useSandpackBundler({ debounceMs: 10 })
      );

      expect(result.current.isBundling).toBe(false);

      await act(async () => {
        result.current.scheduleBundle('code');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // During bundling
      expect(result.current.isBundling).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      // After completion
      expect(result.current.isBundling).toBe(false);

      jest.useFakeTimers();
    });
  });

  describe('minChangeDelay', () => {
    it('should respect minChangeDelay for rapid changes', async () => {
      jest.useRealTimers();

      const onBundleComplete = jest.fn();
      const { result } = renderHook(() =>
        useSandpackBundler({
          debounceMs: 100,
          minChangeDelay: 500,
          onBundleComplete,
        })
      );

      // First bundle
      await act(async () => {
        result.current.scheduleBundle('code1');
        await new Promise((resolve) => setTimeout(resolve, 700));
      });

      expect(onBundleComplete).toHaveBeenCalledTimes(1);

      // Immediate second bundle - should respect minChangeDelay
      onBundleComplete.mockClear();

      await act(async () => {
        result.current.scheduleBundle('code2');
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should still be pending due to minChangeDelay
      expect(result.current.bundlerState.status).toBe('pending');

      jest.useFakeTimers();
    });
  });

  describe('cleanup', () => {
    it('should cleanup timer on unmount', () => {
      const { result, unmount } = renderHook(() => useSandpackBundler());

      act(() => {
        result.current.scheduleBundle('code');
      });

      unmount();

      // Should not throw or cause issues
      act(() => {
        jest.advanceTimersByTime(5000);
      });
    });

    it('should not update state after unmount', () => {
      const onProgress = jest.fn();
      const { result, unmount } = renderHook(() =>
        useSandpackBundler({ debounceMs: 100, onProgress })
      );

      act(() => {
        result.current.scheduleBundle('code');
      });

      unmount();

      // Advance timers - should not cause errors
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty code string', () => {
      const { result } = renderHook(() => useSandpackBundler());

      act(() => {
        result.current.scheduleBundle('');
      });

      expect(result.current.bundlerState.status).toBe('pending');
    });

    it('should handle very long code string', () => {
      const { result } = renderHook(() => useSandpackBundler());
      const longCode = 'x'.repeat(100000);

      act(() => {
        result.current.scheduleBundle(longCode);
      });

      expect(result.current.bundlerState.status).toBe('pending');
    });

    it('should handle rapid schedule-cancel cycles', () => {
      const { result } = renderHook(() => useSandpackBundler());

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.scheduleBundle(`code ${i}`);
          result.current.cancelPendingBundle();
        });
      }

      expect(result.current.bundlerState.status).toBe('idle');
    });
  });
});
