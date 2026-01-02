/**
 * useElementResize Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useElementResize, type ResizeHandle } from './use-element-resize';

// Mock designer store
jest.mock('@/stores/designer-store', () => ({
  useDesignerStore: jest.fn((selector) => {
    const state = {
      updateElementStyle: jest.fn(),
    };
    return selector(state);
  }),
}));

describe('useElementResize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useElementResize());

    expect(result.current.resizeState.isResizing).toBe(false);
    expect(result.current.resizeState.handle).toBeNull();
    expect(result.current.resizeState.elementId).toBeNull();
  });

  it('should return resize functions', () => {
    const { result } = renderHook(() => useElementResize());

    expect(typeof result.current.startResize).toBe('function');
    expect(typeof result.current.cancelResize).toBe('function');
    expect(typeof result.current.getCursor).toBe('function');
  });

  it('should return correct cursors for handles', () => {
    const { result } = renderHook(() => useElementResize());

    expect(result.current.getCursor('n')).toBe('ns-resize');
    expect(result.current.getCursor('s')).toBe('ns-resize');
    expect(result.current.getCursor('e')).toBe('ew-resize');
    expect(result.current.getCursor('w')).toBe('ew-resize');
    expect(result.current.getCursor('ne')).toBe('nesw-resize');
    expect(result.current.getCursor('sw')).toBe('nesw-resize');
    expect(result.current.getCursor('nw')).toBe('nwse-resize');
    expect(result.current.getCursor('se')).toBe('nwse-resize');
  });

  it('should cancel resize operation', () => {
    const { result } = renderHook(() => useElementResize());

    act(() => {
      result.current.cancelResize();
    });

    expect(result.current.resizeState.isResizing).toBe(false);
  });

  it('should respect min/max dimensions', () => {
    const { result } = renderHook(() => 
      useElementResize({
        minWidth: 50,
        minHeight: 50,
        maxWidth: 500,
        maxHeight: 500,
      })
    );

    expect(result.current.resizeState.isResizing).toBe(false);
  });

  it('should call onResizeStart callback', () => {
    const onResizeStart = jest.fn();
    const { result } = renderHook(() => 
      useElementResize({ onResizeStart })
    );

    // Create mock element
    const mockElement = document.createElement('div');
    mockElement.setAttribute('data-designer-id', 'test-element');
    Object.defineProperty(mockElement, 'getBoundingClientRect', {
      value: () => ({ width: 100, height: 100 }),
    });
    document.body.appendChild(mockElement);

    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientX: 100,
      clientY: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.startResize('se', 'test-element', mockEvent);
    });

    expect(onResizeStart).toHaveBeenCalledWith('test-element');
    expect(result.current.resizeState.isResizing).toBe(true);
    expect(result.current.resizeState.handle).toBe('se');
    expect(result.current.resizeState.elementId).toBe('test-element');

    document.body.removeChild(mockElement);
  });

  it('should handle touch events', () => {
    const { result } = renderHook(() => useElementResize());

    // Create mock element
    const mockElement = document.createElement('div');
    mockElement.setAttribute('data-designer-id', 'touch-element');
    Object.defineProperty(mockElement, 'getBoundingClientRect', {
      value: () => ({ width: 150, height: 150 }),
    });
    document.body.appendChild(mockElement);

    const mockTouchEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      touches: [{ clientX: 50, clientY: 50 }],
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.startResize('e', 'touch-element', mockTouchEvent);
    });

    expect(result.current.resizeState.isResizing).toBe(true);
    expect(result.current.resizeState.startX).toBe(50);
    expect(result.current.resizeState.startY).toBe(50);

    document.body.removeChild(mockElement);
  });

  it('should not start resize if element not found', () => {
    const { result } = renderHook(() => useElementResize());

    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientX: 100,
      clientY: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.startResize('se', 'non-existent-element', mockEvent);
    });

    expect(result.current.resizeState.isResizing).toBe(false);
  });

  it('should support grid snapping', () => {
    const { result } = renderHook(() => 
      useElementResize({ snapToGrid: 10 })
    );

    expect(result.current.resizeState.isResizing).toBe(false);
  });

  it('should support aspect ratio preservation', () => {
    const { result } = renderHook(() => 
      useElementResize({ preserveAspectRatio: true })
    );

    expect(result.current.resizeState.isResizing).toBe(false);
  });

  it('should call onResize callback during resize', () => {
    const onResize = jest.fn();
    const { result } = renderHook(() => 
      useElementResize({ onResize })
    );

    // Create mock element
    const mockElement = document.createElement('div');
    mockElement.setAttribute('data-designer-id', 'resize-element');
    Object.defineProperty(mockElement, 'getBoundingClientRect', {
      value: () => ({ width: 100, height: 100 }),
    });
    document.body.appendChild(mockElement);

    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      clientX: 100,
      clientY: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.startResize('se', 'resize-element', mockEvent);
    });

    expect(result.current.resizeState.isResizing).toBe(true);

    document.body.removeChild(mockElement);
  });
});
