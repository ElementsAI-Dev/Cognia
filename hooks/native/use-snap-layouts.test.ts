/**
 * Tests for useSnapLayouts hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSnapLayouts, SNAP_LAYOUTS, type SnapPosition } from './use-snap-layouts';

// Mock window.addEventListener and window.removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
});

// Mock useWindowControls hook
const mockSnapToEdge = jest.fn().mockResolvedValue(undefined);
const mockSnapToCorner = jest.fn().mockResolvedValue(undefined);
const mockCenter = jest.fn().mockResolvedValue(undefined);
const mockToggleMaximize = jest.fn().mockResolvedValue(undefined);

jest.mock('./use-window-controls', () => ({
  useWindowControls: () => ({
    isTauri: true,
    snapToEdge: mockSnapToEdge,
    snapToCorner: mockSnapToCorner,
    center: mockCenter,
    toggleMaximize: mockToggleMaximize,
  }),
}));

describe('useSnapLayouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
  });

  describe('initialization', () => {
    it('should initialize with null currentSnap', () => {
      const { result } = renderHook(() => useSnapLayouts());

      expect(result.current.currentSnap).toBeNull();
      expect(result.current.isSupported).toBe(true);
      expect(result.current.layouts).toEqual(SNAP_LAYOUTS);
      expect(typeof result.current.snapTo).toBe('function');
    });

    it('should return correct layouts constant', () => {
      const { result } = renderHook(() => useSnapLayouts());

      expect(result.current.layouts).toHaveLength(10);
      expect(result.current.layouts[0]).toEqual({
        id: 'left-half',
        label: 'Left Half',
        shortcut: 'Win+Left',
      });
      expect(result.current.layouts[8]).toEqual({
        id: 'center',
        label: 'Center',
        shortcut: 'Win+C',
      });
    });
  });

  describe('snapTo function', () => {
    it('should snap to left half', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('left-half');
      });

      expect(mockSnapToEdge).toHaveBeenCalledWith('left');
      expect(result.current.currentSnap).toBe('left-half');
    });

    it('should snap to right half', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('right-half');
      });

      expect(mockSnapToEdge).toHaveBeenCalledWith('right');
      expect(result.current.currentSnap).toBe('right-half');
    });

    it('should snap to top half', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('top-half');
      });

      expect(mockSnapToEdge).toHaveBeenCalledWith('top');
      expect(result.current.currentSnap).toBe('top-half');
    });

    it('should snap to bottom half', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('bottom-half');
      });

      expect(mockSnapToEdge).toHaveBeenCalledWith('bottom');
      expect(result.current.currentSnap).toBe('bottom-half');
    });

    it('should snap to top-left corner', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('top-left');
      });

      expect(mockSnapToCorner).toHaveBeenCalledWith('topLeft');
      expect(result.current.currentSnap).toBe('top-left');
    });

    it('should snap to top-right corner', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('top-right');
      });

      expect(mockSnapToCorner).toHaveBeenCalledWith('topRight');
      expect(result.current.currentSnap).toBe('top-right');
    });

    it('should snap to bottom-left corner', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('bottom-left');
      });

      expect(mockSnapToCorner).toHaveBeenCalledWith('bottomLeft');
      expect(result.current.currentSnap).toBe('bottom-left');
    });

    it('should snap to bottom-right corner', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('bottom-right');
      });

      expect(mockSnapToCorner).toHaveBeenCalledWith('bottomRight');
      expect(result.current.currentSnap).toBe('bottom-right');
    });

    it('should center window', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('center');
      });

      expect(mockCenter).toHaveBeenCalled();
      expect(result.current.currentSnap).toBe('center');
    });

    it('should toggle maximize', async () => {
      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('maximize');
      });

      expect(mockToggleMaximize).toHaveBeenCalled();
      expect(result.current.currentSnap).toBe('maximize');
    });

    it('should handle errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSnapToEdge.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useSnapLayouts());

      await act(async () => {
        await result.current.snapTo('left-half');
      });

      expect(consoleError).toHaveBeenCalledWith('Failed to snap window:', expect.any(Error));
      expect(result.current.currentSnap).toBeNull(); // Should not update on error

      consoleError.mockRestore();
    });
  });

  describe('keyboard shortcuts', () => {
    beforeEach(() => {
      mockAddEventListener.mockClear();
      mockRemoveEventListener.mockClear();
    });

    it('should set up keyboard event listener on mount', () => {
      renderHook(() => useSnapLayouts());

      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should clean up keyboard event listener on unmount', () => {
      const { unmount } = renderHook(() => useSnapLayouts());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should handle Win+Left arrow', async () => {
      renderHook(() => useSnapLayouts());
      
      // Get the event handler function
      const eventHandler = mockAddEventListener.mock.calls[0][1];
      
      const mockEvent = {
        metaKey: true,
        key: 'ArrowLeft',
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent;

      // Clear previous calls to snapToEdge
      mockSnapToEdge.mockClear();

      eventHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockSnapToEdge).toHaveBeenCalledWith('left');
    });

    it('should handle Win+Right arrow', async () => {
      renderHook(() => useSnapLayouts());
      
      const eventHandler = mockAddEventListener.mock.calls[0][1];
      
      const mockEvent = {
        metaKey: true,
        key: 'ArrowRight',
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent;

      // Clear previous calls to snapToEdge
      mockSnapToEdge.mockClear();

      eventHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockSnapToEdge).toHaveBeenCalledWith('right');
    });

    it('should handle Win+Up arrow', async () => {
      renderHook(() => useSnapLayouts());
      
      const eventHandler = mockAddEventListener.mock.calls[0][1];
      
      const mockEvent = {
        metaKey: true,
        key: 'ArrowUp',
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent;

      // Clear previous calls to toggleMaximize
      mockToggleMaximize.mockClear();

      eventHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockToggleMaximize).toHaveBeenCalled();
    });

    it('should handle Win+Down arrow', async () => {
      renderHook(() => useSnapLayouts());
      
      const eventHandler = mockAddEventListener.mock.calls[0][1];
      
      const mockEvent = {
        metaKey: true,
        key: 'ArrowDown',
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent;

      // Clear previous calls to center
      mockCenter.mockClear();

      eventHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCenter).toHaveBeenCalled();
    });

    it('should ignore events without meta key', async () => {
      const { result } = renderHook(() => useSnapLayouts());
      
      const eventHandler = mockAddEventListener.mock.calls[0][1];
      
      const mockEvent = {
        metaKey: false,
        key: 'ArrowLeft',
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent;

      await act(async () => {
        eventHandler(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result.current.currentSnap).toBeNull();
    });

    it('should ignore non-arrow keys', async () => {
      const { result } = renderHook(() => useSnapLayouts());
      
      const eventHandler = mockAddEventListener.mock.calls[0][1];
      
      const mockEvent = {
        metaKey: true,
        key: 'A',
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent;

      await act(async () => {
        eventHandler(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result.current.currentSnap).toBeNull();
    });
  });

  describe('SNAP_LAYOUTS constant', () => {
    it('should contain all expected snap positions', () => {
      const expectedPositions: SnapPosition[] = [
        'left-half',
        'right-half',
        'top-half',
        'bottom-half',
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'center',
        'maximize',
      ];

      expect(SNAP_LAYOUTS.map(layout => layout.id)).toEqual(expectedPositions);
    });

    it('should have proper labels for all positions', () => {
      SNAP_LAYOUTS.forEach(layout => {
        expect(layout.label).toBeTruthy();
        expect(typeof layout.label).toBe('string');
      });
    });

    it('should have shortcuts for some positions', () => {
      const layoutsWithShortcuts = SNAP_LAYOUTS.filter(layout => layout.shortcut);
      expect(layoutsWithShortcuts).toHaveLength(4); // left-half, right-half, center, maximize
      
      expect(SNAP_LAYOUTS.find(l => l.id === 'left-half')?.shortcut).toBe('Win+Left');
      expect(SNAP_LAYOUTS.find(l => l.id === 'right-half')?.shortcut).toBe('Win+Right');
      expect(SNAP_LAYOUTS.find(l => l.id === 'center')?.shortcut).toBe('Win+C');
      expect(SNAP_LAYOUTS.find(l => l.id === 'maximize')?.shortcut).toBe('Win+Up');
    });
  });

  describe('return values', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useSnapLayouts());

      expect(result.current).toHaveProperty('snapTo');
      expect(result.current).toHaveProperty('currentSnap');
      expect(result.current).toHaveProperty('layouts');
      expect(result.current).toHaveProperty('isSupported');
      expect(typeof result.current.snapTo).toBe('function');
      expect(Array.isArray(result.current.layouts)).toBe(true);
      expect(typeof result.current.isSupported).toBe('boolean');
    });
  });
});
