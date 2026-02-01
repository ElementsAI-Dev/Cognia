/**
 * Tests for useReactFlowConfig hook
 */

import { renderHook, act } from '@testing-library/react';
import { useReactFlowConfig, REACTFLOW_DEFAULT_PROPS } from './use-reactflow-config';

// Mock dependencies
const mockScreenToFlowPosition = jest.fn();
const mockAddNode = jest.fn();
const mockSetViewport = jest.fn();
const mockPushHistory = jest.fn();

jest.mock('@xyflow/react', () => ({
  useReactFlow: jest.fn(() => ({
    screenToFlowPosition: mockScreenToFlowPosition,
  })),
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn((selector) => {
    const state = {
      addNode: mockAddNode,
      setViewport: mockSetViewport,
      pushHistory: mockPushHistory,
    };
    return selector(state);
  }),
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: jest.fn((selector) => selector),
}));

describe('useReactFlowConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScreenToFlowPosition.mockReturnValue({ x: 100, y: 200 });
  });

  describe('initialization', () => {
    it('should return handlers and default props', () => {
      const { result } = renderHook(() => useReactFlowConfig());

      expect(result.current.defaultProps).toBe(REACTFLOW_DEFAULT_PROPS);
      expect(typeof result.current.handleDragOver).toBe('function');
      expect(typeof result.current.handleDrop).toBe('function');
      expect(typeof result.current.handleNodeDragStart).toBe('function');
      expect(typeof result.current.handleNodeDragStop).toBe('function');
      expect(typeof result.current.handleMoveEnd).toBe('function');
    });

    it('should expose isDragHistoryPendingRef', () => {
      const { result } = renderHook(() => useReactFlowConfig());

      expect(result.current.isDragHistoryPendingRef).toBeDefined();
      expect(result.current.isDragHistoryPendingRef.current).toBe(false);
    });
  });

  describe('REACTFLOW_DEFAULT_PROPS', () => {
    it('should have correct default values', () => {
      expect(REACTFLOW_DEFAULT_PROPS.fitView).toBe(true);
      expect(REACTFLOW_DEFAULT_PROPS.fitViewOptions).toEqual({ padding: 0.2 });
      expect(REACTFLOW_DEFAULT_PROPS.deleteKeyCode).toEqual(['Backspace', 'Delete']);
      expect(REACTFLOW_DEFAULT_PROPS.multiSelectionKeyCode).toEqual(['Shift', 'Meta', 'Control']);
      expect(REACTFLOW_DEFAULT_PROPS.selectionOnDrag).toBe(true);
      expect(REACTFLOW_DEFAULT_PROPS.panOnScroll).toBe(true);
      expect(REACTFLOW_DEFAULT_PROPS.zoomOnPinch).toBe(true);
      expect(REACTFLOW_DEFAULT_PROPS.selectNodesOnDrag).toBe(false);
      expect(REACTFLOW_DEFAULT_PROPS.proOptions).toEqual({ hideAttribution: true });
    });
  });

  describe('handleDragOver', () => {
    it('should prevent default and set drop effect', () => {
      const { result } = renderHook(() => useReactFlowConfig());

      const mockEvent = {
        preventDefault: jest.fn(),
        dataTransfer: { dropEffect: '' },
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDragOver(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.dataTransfer.dropEffect).toBe('move');
    });
  });

  describe('handleDrop', () => {
    it('should add node at drop position', () => {
      const { result } = renderHook(() => useReactFlowConfig());

      const mockEvent = {
        preventDefault: jest.fn(),
        dataTransfer: {
          getData: jest.fn().mockReturnValue('start'),
        },
        clientX: 500,
        clientY: 300,
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDrop(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockScreenToFlowPosition).toHaveBeenCalledWith({ x: 500, y: 300 });
      expect(mockAddNode).toHaveBeenCalledWith('start', { x: 100, y: 200 });
    });

    it('should not add node when no type in dataTransfer', () => {
      const { result } = renderHook(() => useReactFlowConfig());

      const mockEvent = {
        preventDefault: jest.fn(),
        dataTransfer: {
          getData: jest.fn().mockReturnValue(''),
        },
        clientX: 500,
        clientY: 300,
      } as unknown as React.DragEvent;

      act(() => {
        result.current.handleDrop(mockEvent);
      });

      expect(mockAddNode).not.toHaveBeenCalled();
    });
  });

  describe('handleNodeDragStart', () => {
    it('should set isDragHistoryPending to true', () => {
      const { result } = renderHook(() => useReactFlowConfig());

      expect(result.current.isDragHistoryPendingRef.current).toBe(false);

      act(() => {
        result.current.handleNodeDragStart();
      });

      expect(result.current.isDragHistoryPendingRef.current).toBe(true);
    });
  });

  describe('handleNodeDragStop', () => {
    it('should push history and reset flag when pending', () => {
      const { result } = renderHook(() => useReactFlowConfig());

      // Set pending flag
      act(() => {
        result.current.handleNodeDragStart();
      });

      expect(result.current.isDragHistoryPendingRef.current).toBe(true);

      act(() => {
        result.current.handleNodeDragStop();
      });

      expect(mockPushHistory).toHaveBeenCalled();
      expect(result.current.isDragHistoryPendingRef.current).toBe(false);
    });

    it('should not push history when not pending', () => {
      const { result } = renderHook(() => useReactFlowConfig());

      act(() => {
        result.current.handleNodeDragStop();
      });

      expect(mockPushHistory).not.toHaveBeenCalled();
    });
  });

  describe('handleMoveEnd', () => {
    it('should set viewport', () => {
      const { result } = renderHook(() => useReactFlowConfig());

      const viewport = { x: 10, y: 20, zoom: 1.5 };

      act(() => {
        result.current.handleMoveEnd(null, viewport);
      });

      expect(mockSetViewport).toHaveBeenCalledWith(viewport);
    });
  });

  describe('options', () => {
    it('should accept onDragStart option', () => {
      const onDragStart = jest.fn();

      const { result } = renderHook(() => useReactFlowConfig({ onDragStart }));

      // Option is accepted but not used directly in the hook
      expect(result.current.handleDragOver).toBeDefined();
    });
  });
});
