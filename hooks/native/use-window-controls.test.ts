/**
 * Tests for useWindowControls hook
 */

import { renderHook, act } from '@testing-library/react';
import { useWindowControls } from './use-window-controls';

// Mock Tauri window API
const mockGetCurrentWindow = jest.fn();
const mockIsMaximized = jest.fn(() => Promise.resolve(false));
const mockIsMinimized = jest.fn(() => Promise.resolve(false));
const mockIsFullscreen = jest.fn(() => Promise.resolve(false));
const mockIsFocused = jest.fn(() => Promise.resolve(true));
const mockIsVisible = jest.fn(() => Promise.resolve(true));
const mockScaleFactor = jest.fn(() => Promise.resolve(1));
const mockMaximize = jest.fn(() => Promise.resolve());
const mockMinimize = jest.fn(() => Promise.resolve());
const mockUnmaximize = jest.fn(() => Promise.resolve());
const mockClose = jest.fn(() => Promise.resolve());
const mockSetFullscreen = jest.fn(() => Promise.resolve());
const mockSetAlwaysOnTop = jest.fn(() => Promise.resolve());
const mockSetFocus = jest.fn(() => Promise.resolve());

const mockAppWindow = {
  isMaximized: mockIsMaximized,
  isMinimized: mockIsMinimized,
  isFullscreen: mockIsFullscreen,
  isFocused: mockIsFocused,
  isVisible: mockIsVisible,
  scaleFactor: mockScaleFactor,
  maximize: mockMaximize,
  minimize: mockMinimize,
  unmaximize: mockUnmaximize,
  close: mockClose,
  setFullscreen: mockSetFullscreen,
  setAlwaysOnTop: mockSetAlwaysOnTop,
  setFocus: mockSetFocus,
  innerSize: jest.fn(() => Promise.resolve({ width: 1280, height: 720 })),
  outerSize: jest.fn(() => Promise.resolve({ width: 1280, height: 720 })),
  outerPosition: jest.fn(() => Promise.resolve({ x: 0, y: 0 })),
  setSize: jest.fn(() => Promise.resolve()),
  setPosition: jest.fn(() => Promise.resolve()),
  center: jest.fn(() => Promise.resolve()),
  onResized: jest.fn(() => Promise.resolve(() => {})),
  onMoved: jest.fn(() => Promise.resolve(() => {})),
  onFocusChanged: jest.fn(() => Promise.resolve(() => {})),
  onScaleChanged: jest.fn(() => Promise.resolve(() => {})),
  onCloseRequested: jest.fn(() => Promise.resolve(() => {})),
};

mockGetCurrentWindow.mockReturnValue(mockAppWindow);

jest.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => mockGetCurrentWindow(),
  currentMonitor: jest.fn(() => Promise.resolve(null)),
  primaryMonitor: jest.fn(() => Promise.resolve(null)),
  availableMonitors: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@tauri-apps/api/dpi', () => ({
  LogicalSize: class LogicalSize {
    constructor(public width: number, public height: number) {}
  },
  LogicalPosition: class LogicalPosition {
    constructor(public x: number, public y: number) {}
  },
}));

jest.mock('@tauri-apps/plugin-os', () => ({
  platform: jest.fn(() => Promise.resolve('windows')),
}));

// Mock store
const mockSetIsMaximized = jest.fn();
const mockSetIsMinimized = jest.fn();
const mockSetIsFullscreen = jest.fn();
const mockSetIsAlwaysOnTop = jest.fn();
const mockSetIsFocused = jest.fn();
const mockSetIsVisible = jest.fn();
const mockSetSize = jest.fn();
const mockSetPosition = jest.fn();
const mockSetScaleFactor = jest.fn();
const mockUpdateWindowState = jest.fn();

let mockWindowState = {
  isMaximized: false,
  isMinimized: false,
  isFullscreen: false,
  isAlwaysOnTop: false,
  isFocused: true,
  isVisible: true,
  preferences: {
    enableDragToMove: true,
    enableDoubleClickMaximize: true,
  },
};

jest.mock('@/stores', () => ({
  useWindowStore: jest.fn((selector) => {
    const state = {
      ...mockWindowState,
      setIsMaximized: mockSetIsMaximized,
      setIsMinimized: mockSetIsMinimized,
      setIsFullscreen: mockSetIsFullscreen,
      setIsAlwaysOnTop: mockSetIsAlwaysOnTop,
      setIsFocused: mockSetIsFocused,
      setIsVisible: mockSetIsVisible,
      setSize: mockSetSize,
      setPosition: mockSetPosition,
      setScaleFactor: mockSetScaleFactor,
      updateWindowState: mockUpdateWindowState,
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock Tauri environment
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {},
  writable: true,
});

describe('useWindowControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowState = {
      isMaximized: false,
      isMinimized: false,
      isFullscreen: false,
      isAlwaysOnTop: false,
      isFocused: true,
      isVisible: true,
      preferences: {
        enableDragToMove: true,
        enableDoubleClickMaximize: true,
      },
    };
  });

  describe('initialization', () => {
    it('should return window state', () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      expect(result.current.isMaximized).toBe(false);
      expect(result.current.isMinimized).toBe(false);
      expect(result.current.isFullscreen).toBe(false);
      expect(result.current.isFocused).toBe(true);
    });

    it('should provide window control functions', () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      expect(typeof result.current.maximize).toBe('function');
      expect(typeof result.current.minimize).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggleFullscreen).toBe('function');
      expect(typeof result.current.toggleAlwaysOnTop).toBe('function');
    });
  });

  describe('window actions', () => {
    it('should maximize window', async () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.maximize();
      });

      expect(mockMaximize).toHaveBeenCalled();
    });

    it('should minimize window', async () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.minimize();
      });

      expect(mockMinimize).toHaveBeenCalled();
    });

    it('should unmaximize window', async () => {
      mockWindowState.isMaximized = true;
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.unmaximize();
      });

      expect(mockUnmaximize).toHaveBeenCalled();
    });

    it('should close window', async () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.close();
      });

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('fullscreen toggle', () => {
    it('should toggle fullscreen on', async () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockSetFullscreen).toHaveBeenCalledWith(true);
    });

    it('should toggle fullscreen off when already fullscreen', async () => {
      mockIsFullscreen.mockResolvedValue(true);
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockSetFullscreen).toHaveBeenCalledWith(false);
    });
  });

  describe('always on top toggle', () => {
    it('should toggle always on top', async () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.toggleAlwaysOnTop();
      });

      expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(true);
    });
  });

  describe('focus', () => {
    it('should focus window', async () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.setFocus();
      });

      expect(mockSetFocus).toHaveBeenCalled();
    });
  });

  describe('size and position', () => {
    it('should set window size', async () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.setWindowSize(800, 600);
      });

      expect(mockAppWindow.setSize).toHaveBeenCalled();
    });

    it('should set window position', async () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.setWindowPosition(100, 100);
      });

      expect(mockAppWindow.setPosition).toHaveBeenCalled();
    });

    it('should center window', async () => {
      const { result } = renderHook(() => useWindowControls({ syncState: false }));

      await act(async () => {
        await result.current.center();
      });

      expect(mockAppWindow.center).toHaveBeenCalled();
    });
  });
});
