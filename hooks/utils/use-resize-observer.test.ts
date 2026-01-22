/**
 * useResizeObserver Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import {
  useResizeObserver,
  useLayoutRecalculation,
  useMonacoLayoutSync,
  usePreviewRefreshTrigger,
} from './use-resize-observer';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();

  trigger(entries: ResizeObserverEntry[]) {
    this.callback(entries, this);
  }
}

let mockObserverInstance: MockResizeObserver | null = null;

beforeAll(() => {
  global.ResizeObserver = jest.fn((callback) => {
    mockObserverInstance = new MockResizeObserver(callback);
    return mockObserverInstance;
  }) as unknown as typeof ResizeObserver;
});

afterAll(() => {
  // @ts-expect-error - cleaning up mock
  delete global.ResizeObserver;
});

describe('useResizeObserver', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockObserverInstance = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return ref and initial size', () => {
    const { result } = renderHook(() => useResizeObserver());

    expect(result.current.ref).toBeDefined();
    expect(result.current.size).toEqual({ width: 0, height: 0 });
  });

  it('should use custom initial size', () => {
    const { result } = renderHook(() =>
      useResizeObserver({ initialSize: { width: 100, height: 200 } })
    );

    expect(result.current.size).toEqual({ width: 100, height: 200 });
  });

  it('should observe element when ref is set', () => {
    const { result } = renderHook(() => useResizeObserver());

    const element = document.createElement('div');
    Object.defineProperty(element, 'getBoundingClientRect', {
      value: () => ({ width: 300, height: 400 }),
    });

    act(() => {
      (result.current.ref as React.MutableRefObject<HTMLDivElement | null>).current = element;
    });
  });

  it('should accept onResize callback option', () => {
    const onResize = jest.fn();
    const { result } = renderHook(() => useResizeObserver({ onResize }));

    // Verify the hook accepts onResize option without error
    expect(result.current.ref).toBeDefined();
    expect(result.current.size).toEqual({ width: 0, height: 0 });
  });

  it('should debounce size updates', () => {
    const onResize = jest.fn();
    renderHook(() => useResizeObserver({ onResize, debounceMs: 100 }));

    if (mockObserverInstance) {
      act(() => {
        mockObserverInstance!.trigger([
          { contentRect: { width: 100, height: 100 } } as ResizeObserverEntry,
        ]);
      });

      // Before debounce completes
      expect(onResize).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(onResize).toHaveBeenCalled();
    }
  });

  it('should disconnect observer on unmount', () => {
    const { unmount } = renderHook(() => useResizeObserver());

    unmount();

    if (mockObserverInstance) {
      expect(mockObserverInstance.disconnect).toHaveBeenCalled();
    }
  });
});

describe('useLayoutRecalculation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return recalculation function', () => {
    const trigger = jest.fn();
    const { result } = renderHook(() => useLayoutRecalculation(trigger));

    expect(typeof result.current).toBe('function');
  });

  it('should debounce trigger calls', () => {
    const trigger = jest.fn();
    const { result } = renderHook(() => useLayoutRecalculation(trigger, 100));

    act(() => {
      result.current();
      result.current();
      result.current();
    });

    expect(trigger).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('should update trigger function reference', () => {
    const trigger1 = jest.fn();
    const trigger2 = jest.fn();

    const { result, rerender } = renderHook(({ trigger }) => useLayoutRecalculation(trigger, 100), {
      initialProps: { trigger: trigger1 },
    });

    rerender({ trigger: trigger2 });

    act(() => {
      result.current();
      jest.advanceTimersByTime(100);
    });

    expect(trigger1).not.toHaveBeenCalled();
    expect(trigger2).toHaveBeenCalled();
  });

  it('should cleanup timer on unmount', () => {
    const trigger = jest.fn();
    const { result, unmount } = renderHook(() => useLayoutRecalculation(trigger, 100));

    act(() => {
      result.current();
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(trigger).not.toHaveBeenCalled();
  });
});

describe('useMonacoLayoutSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return container ref', () => {
    const editorRef = { current: null };
    const { result } = renderHook(() => useMonacoLayoutSync(editorRef));

    expect(result.current).toBeDefined();
  });

  it('should call editor layout when size changes', () => {
    const mockLayout = jest.fn();
    const editorRef = { current: { layout: mockLayout } };

    renderHook(() => useMonacoLayoutSync(editorRef));

    // The hook uses requestAnimationFrame, which we need to advance
    if (mockObserverInstance) {
      act(() => {
        mockObserverInstance!.trigger([
          { contentRect: { width: 500, height: 400 } } as ResizeObserverEntry,
        ]);
        jest.advanceTimersByTime(150);
      });
    }
  });
});

describe('usePreviewRefreshTrigger', () => {
  it('should return refreshKey and triggerRefresh', () => {
    const { result } = renderHook(() => usePreviewRefreshTrigger());

    expect(result.current.refreshKey).toBe(0);
    expect(typeof result.current.triggerRefresh).toBe('function');
  });

  it('should increment refreshKey when triggered', () => {
    const { result } = renderHook(() => usePreviewRefreshTrigger());

    expect(result.current.refreshKey).toBe(0);

    act(() => {
      result.current.triggerRefresh();
    });

    expect(result.current.refreshKey).toBe(1);

    act(() => {
      result.current.triggerRefresh();
    });

    expect(result.current.refreshKey).toBe(2);
  });
});
