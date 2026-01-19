/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { WindowInitializer } from './window-initializer';
import { useWindowControls } from '@/hooks';
import { useWindowStore } from '@/stores';

// Mock hooks
jest.mock('@/hooks', () => ({
  useWindowControls: jest.fn(() => ({
    isTauri: true,
    autoFitToScreen: jest.fn().mockResolvedValue(undefined),
    getScreenInfo: jest.fn().mockResolvedValue({
      workAreaWidth: 1920,
      workAreaHeight: 1080,
      scaleFactor: 1,
    }),
  })),
}));

// Mock stores
const mockSetSize = jest.fn();

jest.mock('@/stores', () => ({
  useWindowStore: jest.fn((selector) => {
    const state = {
      preferences: {
        startMaximized: false,
        rememberSize: false,
        startCentered: true,
      },
      size: { width: 0, height: 0 },
      setSize: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock Tauri APIs
jest.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: jest.fn(() => ({
    maximize: jest.fn(),
    setSize: jest.fn(),
    center: jest.fn(),
  })),
}));

jest.mock('@tauri-apps/api/dpi', () => ({
  LogicalSize: jest.fn(),
}));

describe('WindowInitializer', () => {
  let mockAutoFitToScreen: jest.Mock;
  let mockGetScreenInfo: jest.Mock;
  let mockUseWindowControls: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Get the mocked functions
    mockUseWindowControls = useWindowControls as unknown as jest.Mock;

    const autoFitToScreen = jest.fn().mockResolvedValue(undefined);
    const getScreenInfo = jest.fn().mockResolvedValue({
      workAreaWidth: 1920,
      workAreaHeight: 1080,
      scaleFactor: 1,
    });

    const controls = {
      isTauri: true,
      autoFitToScreen,
      getScreenInfo,
    };

    mockUseWindowControls.mockReturnValue(controls);
    mockAutoFitToScreen = autoFitToScreen;
    mockGetScreenInfo = getScreenInfo;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<WindowInitializer />);
    // Component returns null, so we just check it doesn't throw
  });

  it('returns null', () => {
    const { container } = render(<WindowInitializer />);
    expect(container.firstChild).toBeNull();
  });

  it('does not initialize when not in Tauri mode', () => {
    mockUseWindowControls.mockReturnValue({
      isTauri: false,
      autoFitToScreen: mockAutoFitToScreen,
      getScreenInfo: mockGetScreenInfo,
    });

    render(<WindowInitializer />);

    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Should not call any Tauri functions
    expect(mockAutoFitToScreen).not.toHaveBeenCalled();
    expect(mockGetScreenInfo).not.toHaveBeenCalled();
  });

  it('calls autoFitToScreen when no saved size', async () => {
    render(<WindowInitializer />);

    await act(async () => {
      jest.advanceTimersByTime(150);
      await Promise.resolve();
    });

    expect(mockAutoFitToScreen).toHaveBeenCalled();
  });

  it('waits 100ms before initializing', () => {
    render(<WindowInitializer />);

    // Should not initialize immediately
    expect(mockGetScreenInfo).not.toHaveBeenCalled();

    // Fast forward to 50ms - still not initialized
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(mockGetScreenInfo).not.toHaveBeenCalled();

    // Fast forward to 150ms - should be initialized
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockGetScreenInfo).toHaveBeenCalled();
  });

  it('clears timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = render(<WindowInitializer />);

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('initializes only once', () => {
    const { rerender } = render(<WindowInitializer />);

    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Re-render should not trigger another initialization
    rerender(<WindowInitializer />);

    // Should have called once
    expect(mockGetScreenInfo).toHaveBeenCalledTimes(1);
  });

  it('handles initialization errors gracefully', async () => {
    mockAutoFitToScreen.mockRejectedValue(new Error('Test error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<WindowInitializer />);

    await act(async () => {
      jest.advanceTimersByTime(150);
      await Promise.resolve();
    });

    // Should log error but not crash
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('WindowInitializer edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('handles zero saved size', async () => {
    (useWindowStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        preferences: {
          startMaximized: false,
          rememberSize: true,
          startCentered: false,
        },
        size: { width: 0, height: 0 },
        setSize: mockSetSize,
      };
      return selector ? selector(state) : state;
    });

    const controls = useWindowControls();
    const mockAutoFitToScreen = controls.autoFitToScreen;

    render(<WindowInitializer />);

    await act(async () => {
      jest.advanceTimersByTime(150);
      await Promise.resolve();
    });

    // Should treat zero size as no saved size
    expect(mockAutoFitToScreen).toHaveBeenCalled();
  });

  it('handles screen info unavailability gracefully', async () => {
    (useWindowStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        preferences: {
          startMaximized: false,
          rememberSize: true,
          startCentered: true,
        },
        size: { width: 800, height: 600 },
        setSize: mockSetSize,
      };
      return selector ? selector(state) : state;
    });

    (useWindowControls as unknown as jest.Mock).mockReturnValue({
      isTauri: true,
      autoFitToScreen: jest.fn().mockResolvedValue(undefined),
      getScreenInfo: jest.fn().mockResolvedValue(null),
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<WindowInitializer />);

    await act(async () => {
      jest.advanceTimersByTime(150);
      await Promise.resolve();
    });

    // Should handle gracefully without crashing
    consoleSpy.mockRestore();
  });
});
