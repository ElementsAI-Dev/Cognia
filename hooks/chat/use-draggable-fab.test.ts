/**
 * Tests for useDraggableFab hook
 */

import { renderHook, act } from '@testing-library/react';
import { useDraggableFab } from './use-draggable-fab';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete mockLocalStorage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    }),
  },
  writable: true,
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
Object.defineProperty(window, 'innerHeight', { value: 720, writable: true });

describe('useDraggableFab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  describe('initialization', () => {
    it('should initialize with default position', () => {
      const { result } = renderHook(() => useDraggableFab());

      expect(result.current.position).toBe('bottom-right');
      expect(result.current.offset).toEqual({ x: 0, y: 0 });
      expect(result.current.isDragging).toBe(false);
    });

    it('should initialize with custom position', () => {
      const { result } = renderHook(() =>
        useDraggableFab({ initialPosition: 'top-left' })
      );

      expect(result.current.position).toBe('top-left');
    });

    it('should load persisted position from localStorage', () => {
      mockLocalStorage['cognia-chat-fab-position'] = JSON.stringify({
        position: 'bottom-left',
        offset: { x: 10, y: 20 },
      });

      const { result } = renderHook(() => useDraggableFab());

      expect(result.current.position).toBe('bottom-left');
      expect(result.current.offset).toEqual({ x: 10, y: 20 });
    });
  });

  describe('drag handlers', () => {
    it('should provide drag handlers', () => {
      const { result } = renderHook(() => useDraggableFab());

      expect(typeof result.current.handleDragStart).toBe('function');
      expect(typeof result.current.handleDrag).toBe('function');
      expect(typeof result.current.handleDragEnd).toBe('function');
    });

    it('should handle drag start with mouse event', () => {
      const { result } = renderHook(() => useDraggableFab());

      const mockEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleDragStart(mockEvent);
      });

      // isDragging is not set immediately, only after moving past threshold
      expect(result.current.isDragging).toBe(false);
    });

    it('should handle drag start with touch event', () => {
      const { result } = renderHook(() => useDraggableFab());

      const mockEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: jest.fn(),
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handleDragStart(mockEvent);
      });

      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('resetPosition', () => {
    it('should reset to initial position', () => {
      mockLocalStorage['cognia-chat-fab-position'] = JSON.stringify({
        position: 'top-left',
        offset: { x: 50, y: 50 },
      });

      const { result } = renderHook(() =>
        useDraggableFab({ initialPosition: 'bottom-right' })
      );

      expect(result.current.position).toBe('top-left');

      act(() => {
        result.current.resetPosition();
      });

      expect(result.current.position).toBe('bottom-right');
      expect(result.current.offset).toEqual({ x: 0, y: 0 });
    });

    it('should persist reset position', () => {
      const { result } = renderHook(() => useDraggableFab());

      act(() => {
        result.current.resetPosition();
      });

      const stored = JSON.parse(mockLocalStorage['cognia-chat-fab-position']);
      expect(stored.position).toBe('bottom-right');
      expect(stored.offset).toEqual({ x: 0, y: 0 });
    });
  });

  describe('configuration', () => {
    it('should accept custom persistKey', () => {
      const { result } = renderHook(() =>
        useDraggableFab({ persistKey: 'custom-key' })
      );

      act(() => {
        result.current.resetPosition();
      });

      expect(mockLocalStorage['custom-key']).toBeDefined();
    });

    it('should accept snapToCorner option', () => {
      const { result } = renderHook(() =>
        useDraggableFab({ snapToCorner: false })
      );

      expect(result.current).toBeDefined();
    });

    it('should accept custom edgeMargin', () => {
      const { result } = renderHook(() =>
        useDraggableFab({ edgeMargin: 50 })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('position types', () => {
    const positions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const;

    positions.forEach((position) => {
      it(`should handle ${position} position`, () => {
        const { result } = renderHook(() =>
          useDraggableFab({ initialPosition: position })
        );

        expect(result.current.position).toBe(position);
      });
    });
  });
});
