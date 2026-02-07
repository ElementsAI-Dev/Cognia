/**
 * ContextSyncInitializer Tests
 */

import { act } from '@testing-library/react';

// Mock useAutoSync hook
const mockStart = jest.fn();
const mockStop = jest.fn();

jest.mock('@/hooks/context', () => ({
  useAutoSync: jest.fn(() => ({
    start: mockStart,
    stop: mockStop,
    isSyncing: false,
    lastResult: null,
    error: null,
    isRunning: false,
    sync: jest.fn(),
  })),
}));

import { ContextSyncInitializer } from './context-sync-initializer';
import { render, cleanup } from '@testing-library/react';

describe('ContextSyncInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    cleanup();
  });

  it('should render nothing (null)', () => {
    const { container } = render(<ContextSyncInitializer />);
    expect(container.innerHTML).toBe('');
  });

  it('should start auto-sync after delay', () => {
    render(<ContextSyncInitializer />);

    // Should not start immediately
    expect(mockStart).not.toHaveBeenCalled();

    // Fast-forward past the 3s delay
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockStart).toHaveBeenCalledWith(60000);
  });

  it('should stop auto-sync on unmount', () => {
    const { unmount } = render(<ContextSyncInitializer />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    unmount();
    expect(mockStop).toHaveBeenCalled();
  });

  it('should only initialize once', () => {
    const { rerender } = render(<ContextSyncInitializer />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockStart).toHaveBeenCalledTimes(1);

    // Re-render should not trigger again
    rerender(<ContextSyncInitializer />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockStart).toHaveBeenCalledTimes(1);
  });
});
