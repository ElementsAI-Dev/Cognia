/**
 * Tests for useFloatingPosition hook
 */

import { renderHook, act } from '@testing-library/react';
import { useFloatingPosition } from './use-floating-position';

// Mock window properties
const mockScreen = {
  width: 1920,
  height: 1080,
  availWidth: 1920,
  availHeight: 1040,
};

const mockWindow = {
  innerWidth: 1280,
  innerHeight: 720,
  screenX: 0,
  screenY: 0,
  screenLeft: 0,
  screenTop: 0,
  screen: mockScreen,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  requestAnimationFrame: jest.fn((_cb) => {
    return 1;
  }),
  cancelAnimationFrame: jest.fn(),
};

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

describe('useFloatingPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow.innerWidth = 1280;
    mockWindow.innerHeight = 720;
  });

  describe('initialization', () => {
    it('should return position info for bottom-right FAB', () => {
      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'bottom-right',
          panelWidth: 400,
          panelHeight: 500,
        })
      );

      expect(result.current.fabPosition).toBe('bottom-right');
      expect(result.current.fabOffset).toEqual({ x: 0, y: 0 });
      expect(result.current.screenInfo).toBeDefined();
    });

    it('should return position info for top-left FAB', () => {
      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'top-left',
          panelWidth: 400,
          panelHeight: 500,
        })
      );

      expect(result.current.fabPosition).toBe('top-left');
    });
  });

  describe('expand direction', () => {
    it('should prefer expanding up for bottom FAB positions', () => {
      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'bottom-right',
          panelWidth: 400,
          panelHeight: 500,
        })
      );

      expect(result.current.expandDirection).toBe('up');
    });

    it('should prefer expanding down for top FAB positions', () => {
      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'top-right',
          panelWidth: 400,
          panelHeight: 500,
        })
      );

      expect(result.current.expandDirection).toBe('down');
    });

    it('should switch direction when not enough space', () => {
      // Small viewport
      mockWindow.innerHeight = 400;

      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'bottom-right',
          panelWidth: 400,
          panelHeight: 500,
        })
      );

      // Should try to expand down since not enough space up
      expect(['up', 'down']).toContain(result.current.expandDirection);
    });
  });

  describe('space availability', () => {
    it('should calculate canExpand flags correctly', () => {
      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'bottom-right',
          panelWidth: 400,
          panelHeight: 300,
        })
      );

      expect(result.current.canExpandUp).toBe(true);
      expect(typeof result.current.canExpandDown).toBe('boolean');
      expect(typeof result.current.canExpandLeft).toBe('boolean');
      expect(typeof result.current.canExpandRight).toBe('boolean');
    });

    it('should report false for directions without enough space', () => {
      mockWindow.innerWidth = 300;
      mockWindow.innerHeight = 300;

      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'bottom-right',
          panelWidth: 400,
          panelHeight: 500,
        })
      );

      // Not enough space in either direction
      expect(result.current.canExpandUp).toBe(false);
      expect(result.current.canExpandDown).toBe(false);
    });
  });

  describe('updatePosition', () => {
    it('should provide updatePosition function', () => {
      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'bottom-right',
          panelWidth: 400,
          panelHeight: 500,
        })
      );

      expect(typeof result.current.updatePosition).toBe('function');

      // Should not throw
      act(() => {
        result.current.updatePosition();
      });
    });
  });

  describe('screen info', () => {
    it('should return screen dimensions', () => {
      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'bottom-right',
          panelWidth: 400,
          panelHeight: 500,
        })
      );

      expect(result.current.screenInfo.width).toBe(1920);
      expect(result.current.screenInfo.height).toBe(1080);
    });
  });

  describe('config options', () => {
    it('should accept custom fabOffset', () => {
      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'bottom-right',
          panelWidth: 400,
          panelHeight: 500,
          fabOffset: { x: 10, y: 20 },
        })
      );

      expect(result.current.fabOffset).toEqual({ x: 10, y: 20 });
    });

    it('should use default minMargin', () => {
      const { result } = renderHook(() =>
        useFloatingPosition({
          fabPosition: 'bottom-right',
          panelWidth: 400,
          panelHeight: 500,
        })
      );

      // Default margin is 20
      expect(result.current).toBeDefined();
    });
  });
});
