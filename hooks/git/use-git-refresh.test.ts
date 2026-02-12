import { renderHook } from '@testing-library/react';
import { useGitRefresh } from './use-git-refresh';

describe('useGitRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call refreshFn when disabled', () => {
    const refreshFn = jest.fn();
    renderHook(() => useGitRefresh(1000, false, refreshFn));

    jest.advanceTimersByTime(5000);
    expect(refreshFn).not.toHaveBeenCalled();
  });

  it('calls refreshFn at the specified interval when enabled', () => {
    const refreshFn = jest.fn();
    renderHook(() => useGitRefresh(1000, true, refreshFn));

    expect(refreshFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(refreshFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(refreshFn).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(3000);
    expect(refreshFn).toHaveBeenCalledTimes(5);
  });

  it('clears interval on unmount', () => {
    const refreshFn = jest.fn();
    const { unmount } = renderHook(() => useGitRefresh(1000, true, refreshFn));

    jest.advanceTimersByTime(2000);
    expect(refreshFn).toHaveBeenCalledTimes(2);

    unmount();

    jest.advanceTimersByTime(3000);
    // Should not have been called again after unmount
    expect(refreshFn).toHaveBeenCalledTimes(2);
  });

  it('clears interval when enabled changes to false', () => {
    const refreshFn = jest.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useGitRefresh(1000, enabled, refreshFn),
      { initialProps: { enabled: true } }
    );

    jest.advanceTimersByTime(2000);
    expect(refreshFn).toHaveBeenCalledTimes(2);

    rerender({ enabled: false });

    jest.advanceTimersByTime(3000);
    expect(refreshFn).toHaveBeenCalledTimes(2);
  });

  it('restarts interval when enabled changes back to true', () => {
    const refreshFn = jest.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useGitRefresh(1000, enabled, refreshFn),
      { initialProps: { enabled: false } }
    );

    jest.advanceTimersByTime(3000);
    expect(refreshFn).not.toHaveBeenCalled();

    rerender({ enabled: true });

    jest.advanceTimersByTime(2000);
    expect(refreshFn).toHaveBeenCalledTimes(2);
  });

  it('respects interval change', () => {
    const refreshFn = jest.fn();
    const { rerender } = renderHook(
      ({ interval }) => useGitRefresh(interval, true, refreshFn),
      { initialProps: { interval: 1000 } }
    );

    jest.advanceTimersByTime(2000);
    expect(refreshFn).toHaveBeenCalledTimes(2);

    rerender({ interval: 5000 });

    // Reset count tracking after rerender
    refreshFn.mockClear();
    jest.advanceTimersByTime(5000);
    expect(refreshFn).toHaveBeenCalledTimes(1);
  });
});
