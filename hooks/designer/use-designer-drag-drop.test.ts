/**
 * useDesignerDragDrop Hook Tests
 */

import { renderHook } from '@testing-library/react';
import { useDesignerDragDrop } from './use-designer-drag-drop';

// Mock dependencies
jest.mock('@/stores/designer', () => ({
  useDesignerStore: jest.fn(() => ({
    elements: {},
    addElement: jest.fn(),
    moveElement: jest.fn(),
    removeElement: jest.fn(),
    selectElement: jest.fn(),
  })),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-123'),
}));

describe('useDesignerDragDrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useDesignerDragDrop());

    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragData).toBeNull();
    expect(result.current.dropTargetId).toBeNull();
    expect(result.current.dropPosition).toBeNull();
  });

  it('should provide createDragHandlers function', () => {
    const { result } = renderHook(() => useDesignerDragDrop());

    expect(typeof result.current.createDragHandlers).toBe('function');

    const handlers = result.current.createDragHandlers({
      type: 'component',
      componentCode: '<div>Test</div>',
      componentName: 'TestComponent',
    });

    expect(handlers.draggable).toBe(true);
    expect(typeof handlers.onDragStart).toBe('function');
    expect(typeof handlers.onDragEnd).toBe('function');
  });

  it('should provide createElementDragHandlers function', () => {
    const { result } = renderHook(() => useDesignerDragDrop());

    expect(typeof result.current.createElementDragHandlers).toBe('function');

    const handlers = result.current.createElementDragHandlers('element-1');

    expect(handlers.draggable).toBe(true);
    expect(typeof handlers.onDragStart).toBe('function');
    expect(typeof handlers.onDragEnd).toBe('function');
  });

  it('should provide createDropHandlers function', () => {
    const { result } = renderHook(() => useDesignerDragDrop());

    expect(typeof result.current.createDropHandlers).toBe('function');

    const handlers = result.current.createDropHandlers('target-1');

    expect(typeof handlers.onDragOver).toBe('function');
    expect(typeof handlers.onDragEnter).toBe('function');
    expect(typeof handlers.onDragLeave).toBe('function');
    expect(typeof handlers.onDrop).toBe('function');
  });

});
