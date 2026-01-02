/**
 * Tests for useWindow hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWindow } from './use-window';

// Mock native utils
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => true),
}));

// Mock window functions
const mockSetAlwaysOnTop = jest.fn();
const mockIsAlwaysOnTop = jest.fn();
const mockSetFullscreen = jest.fn();
const mockIsFullscreen = jest.fn();
const mockToggleMaximize = jest.fn();
const mockIsMaximized = jest.fn();
const mockMinimizeWindow = jest.fn();
const mockMaximizeWindow = jest.fn();
const mockCloseWindow = jest.fn();
const mockCenterWindow = jest.fn();
const mockSetTitle = jest.fn();
const mockFocusWindow = jest.fn();
const mockRequestAttention = jest.fn();

jest.mock('@/lib/native/window', () => ({
  setAlwaysOnTop: (...args: unknown[]) => mockSetAlwaysOnTop(...args),
  isAlwaysOnTop: () => mockIsAlwaysOnTop(),
  setFullscreen: (...args: unknown[]) => mockSetFullscreen(...args),
  isFullscreen: () => mockIsFullscreen(),
  toggleMaximize: () => mockToggleMaximize(),
  isMaximized: () => mockIsMaximized(),
  minimizeWindow: () => mockMinimizeWindow(),
  maximizeWindow: () => mockMaximizeWindow(),
  closeWindow: () => mockCloseWindow(),
  centerWindow: () => mockCenterWindow(),
  setTitle: (...args: unknown[]) => mockSetTitle(...args),
  focusWindow: () => mockFocusWindow(),
  requestAttention: (...args: unknown[]) => mockRequestAttention(...args),
}));

// Mock native store
const mockSetStoreAlwaysOnTop = jest.fn();
const mockSetStoreFullscreen = jest.fn();
const mockSetStoreMaximized = jest.fn();

jest.mock('@/stores/native-store', () => ({
  useNativeStore: () => ({
    isAlwaysOnTop: false,
    isFullscreen: false,
    isMaximized: false,
    setAlwaysOnTop: mockSetStoreAlwaysOnTop,
    setFullscreen: mockSetStoreFullscreen,
    setMaximized: mockSetStoreMaximized,
  }),
}));

describe('useWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAlwaysOnTop.mockResolvedValue(false);
    mockIsFullscreen.mockResolvedValue(false);
    mockIsMaximized.mockResolvedValue(false);
  });

  describe('initialization', () => {
    it('should initialize with desktop detection', async () => {
      const { result } = renderHook(() => useWindow());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });
    });

    it('should fetch initial window state', async () => {
      mockIsAlwaysOnTop.mockResolvedValue(true);
      mockIsFullscreen.mockResolvedValue(false);
      mockIsMaximized.mockResolvedValue(true);

      renderHook(() => useWindow());

      await waitFor(() => {
        expect(mockIsAlwaysOnTop).toHaveBeenCalled();
        expect(mockIsFullscreen).toHaveBeenCalled();
        expect(mockIsMaximized).toHaveBeenCalled();
      });
    });
  });

  describe('toggleAlwaysOnTop', () => {
    it('should toggle always on top', async () => {
      mockSetAlwaysOnTop.mockResolvedValue(true);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.toggleAlwaysOnTop();
      });

      expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(true);
      expect(mockSetStoreAlwaysOnTop).toHaveBeenCalledWith(true);
    });

    it('should handle toggle failure gracefully', async () => {
      mockSetAlwaysOnTop.mockResolvedValue(false);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.toggleAlwaysOnTop();
      });

      expect(mockSetAlwaysOnTop).toHaveBeenCalled();
      // Store may or may not be called depending on implementation
    });
  });

  describe('toggleFullscreen', () => {
    it('should toggle fullscreen', async () => {
      mockSetFullscreen.mockResolvedValue(true);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockSetFullscreen).toHaveBeenCalledWith(true);
      expect(mockSetStoreFullscreen).toHaveBeenCalledWith(true);
    });
  });

  describe('toggleMaximize', () => {
    it('should toggle maximize and update state', async () => {
      mockToggleMaximize.mockResolvedValue(true);
      mockIsMaximized.mockResolvedValue(true);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.toggleMaximize();
      });

      expect(mockToggleMaximize).toHaveBeenCalled();
      expect(mockSetStoreMaximized).toHaveBeenCalledWith(true);
    });
  });

  describe('window actions', () => {
    it('should minimize window', async () => {
      mockMinimizeWindow.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.minimize();
      });

      expect(mockMinimizeWindow).toHaveBeenCalled();
    });

    it('should maximize window', async () => {
      mockMaximizeWindow.mockResolvedValue(true);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.maximize();
      });

      expect(mockMaximizeWindow).toHaveBeenCalled();
      expect(mockSetStoreMaximized).toHaveBeenCalledWith(true);
    });

    it('should close window', async () => {
      mockCloseWindow.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.close();
      });

      expect(mockCloseWindow).toHaveBeenCalled();
    });

    it('should center window', async () => {
      mockCenterWindow.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.center();
      });

      expect(mockCenterWindow).toHaveBeenCalled();
    });

    it('should set window title', async () => {
      mockSetTitle.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.setTitle('New Title');
      });

      expect(mockSetTitle).toHaveBeenCalledWith('New Title');
    });

    it('should focus window', async () => {
      mockFocusWindow.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.focus();
      });

      expect(mockFocusWindow).toHaveBeenCalled();
    });

    it('should request attention', async () => {
      mockRequestAttention.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWindow());

      await act(async () => {
        await result.current.requestAttention(true);
      });

      expect(mockRequestAttention).toHaveBeenCalledWith(true);
    });
  });

  describe('return values', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useWindow());

      expect(result.current).toHaveProperty('isDesktop');
      expect(result.current).toHaveProperty('isAlwaysOnTop');
      expect(result.current).toHaveProperty('isFullscreen');
      expect(result.current).toHaveProperty('isMaximized');
      expect(result.current).toHaveProperty('toggleAlwaysOnTop');
      expect(result.current).toHaveProperty('toggleFullscreen');
      expect(result.current).toHaveProperty('toggleMaximize');
      expect(result.current).toHaveProperty('minimize');
      expect(result.current).toHaveProperty('maximize');
      expect(result.current).toHaveProperty('close');
      expect(result.current).toHaveProperty('center');
      expect(result.current).toHaveProperty('setTitle');
      expect(result.current).toHaveProperty('focus');
      expect(result.current).toHaveProperty('requestAttention');
    });
  });
});
