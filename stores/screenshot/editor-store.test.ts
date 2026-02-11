/**
 * Screenshot Editor Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import {
  useEditorStore,
  selectCanUndo,
  selectCanRedo,
  selectIsEditing,
  selectHasSelection,
  selectHasAnnotations,
  selectAnnotationCount,
  selectCurrentAnnotation,
  selectAnnotationsByType,
  selectUndoStackDepth,
  selectRedoStackDepth,
  selectIsAnnotating,
} from './editor-store';
import type { Annotation, RectangleAnnotation } from '@/types/screenshot';
import { DEFAULT_STYLE } from '@/types/screenshot';

describe('useEditorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useEditorStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(result.current.mode).toBe('idle');
      expect(result.current.selection).toBeNull();
      expect(result.current.isSelecting).toBe(false);
      expect(result.current.currentTool).toBe('select');
      expect(result.current.annotations).toEqual([]);
      expect(result.current.undoStack).toEqual([]);
      expect(result.current.redoStack).toEqual([]);
      expect(result.current.markerCounter).toBe(1);
    });
  });

  describe('selection management', () => {
    it('should start selection', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.startSelection(100, 100);
      });

      expect(result.current.isSelecting).toBe(true);
      expect(result.current.startPoint).toEqual({ x: 100, y: 100 });
      expect(result.current.selection).toEqual({ x: 100, y: 100, width: 0, height: 0 });
      expect(result.current.mode).toBe('selecting');
    });

    it('should update selection', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.startSelection(100, 100);
        result.current.updateSelection(200, 150);
      });

      expect(result.current.selection).toEqual({ x: 100, y: 100, width: 100, height: 50 });
    });

    it('should handle negative direction selection', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.startSelection(200, 200);
        result.current.updateSelection(100, 100);
      });

      expect(result.current.selection).toEqual({ x: 100, y: 100, width: 100, height: 100 });
    });

    it('should end selection with valid size', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.startSelection(100, 100);
        result.current.updateSelection(200, 200);
        result.current.endSelection();
      });

      expect(result.current.isSelecting).toBe(false);
      expect(result.current.mode).toBe('editing');
      expect(result.current.selection).not.toBeNull();
    });

    it('should discard selection if too small', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.startSelection(100, 100);
        result.current.updateSelection(105, 105);
        result.current.endSelection();
      });

      expect(result.current.selection).toBeNull();
      expect(result.current.mode).toBe('idle');
    });

    it('should move selection', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setSelection({ x: 100, y: 100, width: 200, height: 200 });
        result.current.moveSelection(50, 30);
      });

      expect(result.current.selection).toEqual({ x: 150, y: 130, width: 200, height: 200 });
    });

    it('should resize selection', () => {
      const { result } = renderHook(() => useEditorStore());
      const original = { x: 100, y: 100, width: 200, height: 200 };

      act(() => {
        result.current.setSelection(original);
        result.current.resizeSelection('se', 350, 350, 300, 300, original);
      });

      expect(result.current.selection?.width).toBe(250);
      expect(result.current.selection?.height).toBe(250);
    });
  });

  describe('tool management', () => {
    it('should change current tool', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTool('rectangle');
      });

      expect(result.current.currentTool).toBe('rectangle');
    });

    it('should update style', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setStyle({ color: '#00FF00', strokeWidth: 5 });
      });

      expect(result.current.style.color).toBe('#00FF00');
      expect(result.current.style.strokeWidth).toBe(5);
    });
  });

  describe('annotation management', () => {
    const createTestAnnotation = (id: string): Annotation => ({
      id,
      type: 'rectangle',
      style: {
        color: '#FF0000',
        strokeWidth: 2,
        filled: false,
        opacity: 1,
      },
      timestamp: Date.now(),
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    });

    it('should add annotation', () => {
      const { result } = renderHook(() => useEditorStore());
      const annotation = createTestAnnotation('test-1');

      act(() => {
        result.current.addAnnotation(annotation);
      });

      expect(result.current.annotations).toHaveLength(1);
      expect(result.current.annotations[0].id).toBe('test-1');
    });

    it('should update annotation', () => {
      const { result } = renderHook(() => useEditorStore());
      const annotation = createTestAnnotation('test-1');

      act(() => {
        result.current.addAnnotation(annotation);
        result.current.updateAnnotation('test-1', { x: 50, y: 50 });
      });

      expect((result.current.annotations[0] as RectangleAnnotation).x).toBe(50);
      expect((result.current.annotations[0] as RectangleAnnotation).y).toBe(50);
    });

    it('should delete annotation', () => {
      const { result } = renderHook(() => useEditorStore());
      const annotation = createTestAnnotation('test-1');

      act(() => {
        result.current.addAnnotation(annotation);
        result.current.deleteAnnotation('test-1');
      });

      expect(result.current.annotations).toHaveLength(0);
    });

    it('should select annotation', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.selectAnnotation('test-1');
      });

      expect(result.current.selectedAnnotationId).toBe('test-1');
    });

    it('should clear annotations', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.addAnnotation(createTestAnnotation('test-1'));
        result.current.addAnnotation(createTestAnnotation('test-2'));
        result.current.clearAnnotations();
      });

      expect(result.current.annotations).toHaveLength(0);
    });
  });

  describe('undo/redo', () => {
    const createTestAnnotation = (id: string): Annotation => ({
      id,
      type: 'rectangle',
      style: {
        color: '#FF0000',
        strokeWidth: 2,
        filled: false,
        opacity: 1,
      },
      timestamp: Date.now(),
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    });

    it('should undo annotation addition', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.addAnnotation(createTestAnnotation('test-1'));
      });

      expect(result.current.annotations).toHaveLength(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.annotations).toHaveLength(0);
    });

    it('should redo after undo', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.addAnnotation(createTestAnnotation('test-1'));
        result.current.undo();
        result.current.redo();
      });

      expect(result.current.annotations).toHaveLength(1);
    });

    it('should clear redo stack on new action', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.addAnnotation(createTestAnnotation('test-1'));
        result.current.undo();
        result.current.addAnnotation(createTestAnnotation('test-2'));
      });

      expect(result.current.redoStack).toHaveLength(0);
    });
  });

  describe('marker counter', () => {
    it('should increment marker counter', () => {
      const { result } = renderHook(() => useEditorStore());

      let first: number, second: number;
      act(() => {
        first = result.current.getNextMarkerNumber();
        second = result.current.getNextMarkerNumber();
      });

      expect(first!).toBe(1);
      expect(second!).toBe(2);
    });
  });

  describe('selectors', () => {
    it('selectCanUndo should return correct value', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(selectCanUndo(result.current)).toBe(false);

      act(() => {
        result.current.addAnnotation({
          id: 'test',
          type: 'rectangle',
          style: { color: '#FF0000', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        });
      });

      expect(selectCanUndo(result.current)).toBe(true);
    });

    it('selectCanRedo should return correct value', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.addAnnotation({
          id: 'test',
          type: 'rectangle',
          style: { color: '#FF0000', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        });
      });

      expect(selectCanRedo(result.current)).toBe(false);

      act(() => {
        result.current.undo();
      });

      expect(selectCanRedo(result.current)).toBe(true);
    });

    it('selectIsEditing should return correct value', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(selectIsEditing(result.current)).toBe(false);

      act(() => {
        result.current.setMode('editing');
      });

      expect(selectIsEditing(result.current)).toBe(true);
    });

    it('selectHasSelection should return correct value', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(selectHasSelection(result.current)).toBe(false);

      act(() => {
        result.current.setSelection({ x: 0, y: 0, width: 100, height: 100 });
      });

      expect(selectHasSelection(result.current)).toBe(true);
    });

    it('selectHasAnnotations should return correct value', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(selectHasAnnotations(result.current)).toBe(false);

      act(() => {
        result.current.addAnnotation({
          id: 'test',
          type: 'rectangle',
          style: { color: '#FF0000', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        });
      });

      expect(selectHasAnnotations(result.current)).toBe(true);
    });

    it('selectAnnotationCount should return correct count', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(selectAnnotationCount(result.current)).toBe(0);

      act(() => {
        result.current.addAnnotation({
          id: 'test-1',
          type: 'rectangle',
          style: { color: '#FF0000', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        });
        result.current.addAnnotation({
          id: 'test-2',
          type: 'ellipse',
          style: { color: '#00FF00', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          cx: 50,
          cy: 50,
          rx: 30,
          ry: 20,
        });
      });

      expect(selectAnnotationCount(result.current)).toBe(2);
    });

    it('selectCurrentAnnotation should return selected annotation or null', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(selectCurrentAnnotation(result.current)).toBeNull();

      act(() => {
        result.current.addAnnotation({
          id: 'sel-test',
          type: 'rectangle',
          style: { color: '#FF0000', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        });
        result.current.selectAnnotation('sel-test');
      });

      const current = selectCurrentAnnotation(result.current);
      expect(current).not.toBeNull();
      expect(current!.id).toBe('sel-test');
    });

    it('selectCurrentAnnotation should return null for non-existent id', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.selectAnnotation('nonexistent');
      });

      expect(selectCurrentAnnotation(result.current)).toBeNull();
    });

    it('selectAnnotationsByType should filter annotations by type', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.addAnnotation({
          id: 'rect-1',
          type: 'rectangle',
          style: { color: '#FF0000', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        });
        result.current.addAnnotation({
          id: 'ellipse-1',
          type: 'ellipse',
          style: { color: '#00FF00', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          cx: 50,
          cy: 50,
          rx: 30,
          ry: 20,
        });
        result.current.addAnnotation({
          id: 'rect-2',
          type: 'rectangle',
          style: { color: '#0000FF', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 50,
          y: 50,
          width: 80,
          height: 60,
        });
      });

      const rectSelector = selectAnnotationsByType('rectangle');
      const rects = rectSelector(result.current);
      expect(rects).toHaveLength(2);
      rects.forEach((r) => expect(r.type).toBe('rectangle'));

      const ellipseSelector = selectAnnotationsByType('ellipse');
      expect(ellipseSelector(result.current)).toHaveLength(1);

      const arrowSelector = selectAnnotationsByType('arrow');
      expect(arrowSelector(result.current)).toHaveLength(0);
    });

    it('selectUndoStackDepth should return undo stack size', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(selectUndoStackDepth(result.current)).toBe(0);

      act(() => {
        result.current.addAnnotation({
          id: 'depth-test',
          type: 'rectangle',
          style: { color: '#FF0000', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        });
      });

      expect(selectUndoStackDepth(result.current)).toBe(1);
    });

    it('selectRedoStackDepth should return redo stack size', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.addAnnotation({
          id: 'redo-depth',
          type: 'rectangle',
          style: { color: '#FF0000', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        });
        result.current.undo();
      });

      expect(selectRedoStackDepth(result.current)).toBe(1);
    });

    it('selectIsAnnotating should return correct value', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(selectIsAnnotating(result.current)).toBe(false);

      act(() => {
        result.current.setMode('annotating');
      });

      expect(selectIsAnnotating(result.current)).toBe(true);
    });
  });

  describe('DEFAULT_STYLE integration', () => {
    it('should use DEFAULT_STYLE for initial style', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(result.current.style).toEqual(DEFAULT_STYLE);
    });

    it('should reset to DEFAULT_STYLE after reset()', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setStyle({ color: '#00FF00', strokeWidth: 5 });
        result.current.reset();
      });

      expect(result.current.style).toEqual(DEFAULT_STYLE);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setMode('editing');
        result.current.setSelection({ x: 100, y: 100, width: 200, height: 200 });
        result.current.setCurrentTool('rectangle');
        result.current.addAnnotation({
          id: 'test',
          type: 'rectangle',
          style: { color: '#FF0000', strokeWidth: 2, filled: false, opacity: 1 },
          timestamp: Date.now(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        });
        result.current.reset();
      });

      expect(result.current.mode).toBe('idle');
      expect(result.current.selection).toBeNull();
      expect(result.current.currentTool).toBe('select');
      expect(result.current.annotations).toHaveLength(0);
    });
  });

  describe('style persistence', () => {
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          store = {};
        }),
      };
    })();

    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
      localStorageMock.clear();
    });

    it('should save style preferences when setStyle is called', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setStyle({ color: '#00FF00' });
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1][1]
      );
      expect(savedData.style.color).toBe('#00FF00');
    });

    it('should save tool preference when setCurrentTool is called', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTool('arrow');
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1][1]
      );
      expect(savedData.currentTool).toBe('arrow');
    });

    it('should persist multiple style properties', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setStyle({ color: '#0000FF', strokeWidth: 5, fontSize: 24 });
      });

      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1][1]
      );
      expect(savedData.style.color).toBe('#0000FF');
      expect(savedData.style.strokeWidth).toBe(5);
      expect(savedData.style.fontSize).toBe(24);
    });
  });
});
