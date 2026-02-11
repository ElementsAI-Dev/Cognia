/**
 * Draw Utils Tests
 *
 * Tests for the extracted annotation drawing utility functions.
 */

import type { Annotation, AnnotationStyle } from '@/types/screenshot';
import {
  getAnnotationBounds,
  getAnnotationPosition,
  moveAnnotation,
} from './draw-utils';

const baseStyle: AnnotationStyle = {
  color: '#FF0000',
  strokeWidth: 2,
  filled: false,
  opacity: 1,
  fontSize: 16,
};

// ============== getAnnotationBounds ==============

describe('getAnnotationBounds', () => {
  it('should return bounds for rectangle annotation', () => {
    const annotation: Annotation = {
      id: 'r1',
      type: 'rectangle',
      style: baseStyle,
      timestamp: 0,
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('should return bounds for ellipse annotation', () => {
    const annotation: Annotation = {
      id: 'e1',
      type: 'ellipse',
      style: baseStyle,
      timestamp: 0,
      cx: 100,
      cy: 80,
      rx: 50,
      ry: 30,
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 50, y: 50, width: 100, height: 60 });
  });

  it('should return bounds for arrow annotation', () => {
    const annotation: Annotation = {
      id: 'a1',
      type: 'arrow',
      style: baseStyle,
      timestamp: 0,
      startX: 10,
      startY: 20,
      endX: 110,
      endY: 70,
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('should return bounds for arrow with reversed direction', () => {
    const annotation: Annotation = {
      id: 'a2',
      type: 'arrow',
      style: baseStyle,
      timestamp: 0,
      startX: 200,
      startY: 150,
      endX: 50,
      endY: 30,
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 50, y: 30, width: 150, height: 120 });
  });

  it('should return bounds for freehand annotation', () => {
    const annotation: Annotation = {
      id: 'f1',
      type: 'freehand',
      style: baseStyle,
      timestamp: 0,
      points: [
        [10, 20],
        [50, 80],
        [30, 40],
      ],
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 10, y: 20, width: 40, height: 60 });
  });

  it('should return zero bounds for empty freehand', () => {
    const annotation: Annotation = {
      id: 'f2',
      type: 'freehand',
      style: baseStyle,
      timestamp: 0,
      points: [],
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('should return estimated bounds for text annotation', () => {
    const annotation: Annotation = {
      id: 't1',
      type: 'text',
      style: { ...baseStyle, fontSize: 20 },
      timestamp: 0,
      x: 50,
      y: 100,
      text: 'Hello',
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds.x).toBe(50);
    expect(bounds.y).toBe(80); // y - fontSize
    expect(bounds.height).toBe(20); // fontSize
    // Width is estimated: max(20, 5 * 20 * 0.6) = max(20, 60) = 60
    expect(bounds.width).toBe(60);
  });

  it('should return minimum width for short text', () => {
    const annotation: Annotation = {
      id: 't2',
      type: 'text',
      style: { ...baseStyle, fontSize: 16 },
      timestamp: 0,
      x: 10,
      y: 30,
      text: 'H',
    };
    const bounds = getAnnotationBounds(annotation);
    // Width: max(20, 1 * 16 * 0.6) = max(20, 9.6) = 20
    expect(bounds.width).toBe(20);
  });

  it('should return bounds for blur annotation', () => {
    const annotation: Annotation = {
      id: 'b1',
      type: 'blur',
      style: baseStyle,
      timestamp: 0,
      x: 30,
      y: 40,
      width: 200,
      height: 150,
      intensity: 0.8,
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 30, y: 40, width: 200, height: 150 });
  });

  it('should return bounds for highlight annotation', () => {
    const annotation: Annotation = {
      id: 'h1',
      type: 'highlight',
      style: baseStyle,
      timestamp: 0,
      x: 5,
      y: 10,
      width: 300,
      height: 25,
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 5, y: 10, width: 300, height: 25 });
  });

  it('should return bounds for marker annotation', () => {
    const annotation: Annotation = {
      id: 'm1',
      type: 'marker',
      style: baseStyle,
      timestamp: 0,
      x: 100,
      y: 100,
      number: 1,
      size: 24,
    };
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 88, y: 88, width: 24, height: 24 });
  });

  it('should default marker size to 24 if not specified', () => {
    const annotation: Annotation = {
      id: 'm2',
      type: 'marker',
      style: baseStyle,
      timestamp: 0,
      x: 50,
      y: 50,
      number: 2,
    } as Annotation;
    const bounds = getAnnotationBounds(annotation);
    expect(bounds).toEqual({ x: 38, y: 38, width: 24, height: 24 });
  });
});

// ============== getAnnotationPosition ==============

describe('getAnnotationPosition', () => {
  it('should return position for rectangle', () => {
    const annotation: Annotation = {
      id: 'r1',
      type: 'rectangle',
      style: baseStyle,
      timestamp: 0,
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    };
    expect(getAnnotationPosition(annotation)).toEqual({ x: 10, y: 20 });
  });

  it('should return position for ellipse (top-left of bounding box)', () => {
    const annotation: Annotation = {
      id: 'e1',
      type: 'ellipse',
      style: baseStyle,
      timestamp: 0,
      cx: 100,
      cy: 80,
      rx: 50,
      ry: 30,
    };
    expect(getAnnotationPosition(annotation)).toEqual({ x: 50, y: 50 });
  });

  it('should return start point for arrow', () => {
    const annotation: Annotation = {
      id: 'a1',
      type: 'arrow',
      style: baseStyle,
      timestamp: 0,
      startX: 10,
      startY: 20,
      endX: 110,
      endY: 70,
    };
    expect(getAnnotationPosition(annotation)).toEqual({ x: 10, y: 20 });
  });

  it('should return first point for freehand', () => {
    const annotation: Annotation = {
      id: 'f1',
      type: 'freehand',
      style: baseStyle,
      timestamp: 0,
      points: [
        [15, 25],
        [50, 80],
      ],
    };
    expect(getAnnotationPosition(annotation)).toEqual({ x: 15, y: 25 });
  });

  it('should return origin for empty freehand', () => {
    const annotation: Annotation = {
      id: 'f2',
      type: 'freehand',
      style: baseStyle,
      timestamp: 0,
      points: [],
    };
    expect(getAnnotationPosition(annotation)).toEqual({ x: 0, y: 0 });
  });

  it('should return position for text', () => {
    const annotation: Annotation = {
      id: 't1',
      type: 'text',
      style: baseStyle,
      timestamp: 0,
      x: 30,
      y: 40,
      text: 'test',
    };
    expect(getAnnotationPosition(annotation)).toEqual({ x: 30, y: 40 });
  });

  it('should return position for marker', () => {
    const annotation: Annotation = {
      id: 'm1',
      type: 'marker',
      style: baseStyle,
      timestamp: 0,
      x: 100,
      y: 200,
      number: 1,
      size: 24,
    };
    expect(getAnnotationPosition(annotation)).toEqual({ x: 100, y: 200 });
  });

  it('should return position for blur', () => {
    const annotation: Annotation = {
      id: 'b1',
      type: 'blur',
      style: baseStyle,
      timestamp: 0,
      x: 50,
      y: 60,
      width: 200,
      height: 100,
      intensity: 0.5,
    };
    expect(getAnnotationPosition(annotation)).toEqual({ x: 50, y: 60 });
  });

  it('should return position for highlight', () => {
    const annotation: Annotation = {
      id: 'h1',
      type: 'highlight',
      style: baseStyle,
      timestamp: 0,
      x: 70,
      y: 80,
      width: 150,
      height: 30,
    };
    expect(getAnnotationPosition(annotation)).toEqual({ x: 70, y: 80 });
  });
});

// ============== moveAnnotation ==============

describe('moveAnnotation', () => {
  const dx = 10;
  const dy = 20;

  it('should move rectangle', () => {
    const annotation: Annotation = {
      id: 'r1',
      type: 'rectangle',
      style: baseStyle,
      timestamp: 0,
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    };
    const updates = moveAnnotation(annotation, dx, dy);
    expect(updates).toEqual({ x: 20, y: 40 });
  });

  it('should move ellipse by shifting center', () => {
    const annotation: Annotation = {
      id: 'e1',
      type: 'ellipse',
      style: baseStyle,
      timestamp: 0,
      cx: 100,
      cy: 80,
      rx: 50,
      ry: 30,
    };
    const updates = moveAnnotation(annotation, dx, dy);
    expect(updates).toEqual({ cx: 110, cy: 100 });
  });

  it('should move arrow by shifting both endpoints', () => {
    const annotation: Annotation = {
      id: 'a1',
      type: 'arrow',
      style: baseStyle,
      timestamp: 0,
      startX: 10,
      startY: 20,
      endX: 110,
      endY: 70,
    };
    const updates = moveAnnotation(annotation, dx, dy);
    expect(updates).toEqual({
      startX: 20,
      startY: 40,
      endX: 120,
      endY: 90,
    });
  });

  it('should move marker', () => {
    const annotation: Annotation = {
      id: 'm1',
      type: 'marker',
      style: baseStyle,
      timestamp: 0,
      x: 100,
      y: 200,
      number: 1,
      size: 24,
    };
    const updates = moveAnnotation(annotation, dx, dy);
    expect(updates).toEqual({ x: 110, y: 220 });
  });

  it('should move freehand by shifting all points', () => {
    const annotation: Annotation = {
      id: 'f1',
      type: 'freehand',
      style: baseStyle,
      timestamp: 0,
      points: [
        [10, 20],
        [30, 40],
        [50, 60],
      ],
    };
    const updates = moveAnnotation(annotation, dx, dy);
    expect(updates).toEqual({
      points: [
        [20, 40],
        [40, 60],
        [60, 80],
      ],
    });
  });

  it('should move text', () => {
    const annotation: Annotation = {
      id: 't1',
      type: 'text',
      style: baseStyle,
      timestamp: 0,
      x: 30,
      y: 40,
      text: 'test',
    };
    const updates = moveAnnotation(annotation, dx, dy);
    expect(updates).toEqual({ x: 40, y: 60 });
  });

  it('should move blur', () => {
    const annotation: Annotation = {
      id: 'b1',
      type: 'blur',
      style: baseStyle,
      timestamp: 0,
      x: 50,
      y: 60,
      width: 200,
      height: 100,
      intensity: 0.5,
    };
    const updates = moveAnnotation(annotation, dx, dy);
    expect(updates).toEqual({ x: 60, y: 80 });
  });

  it('should move highlight', () => {
    const annotation: Annotation = {
      id: 'h1',
      type: 'highlight',
      style: baseStyle,
      timestamp: 0,
      x: 70,
      y: 80,
      width: 150,
      height: 30,
    };
    const updates = moveAnnotation(annotation, dx, dy);
    expect(updates).toEqual({ x: 80, y: 100 });
  });

  it('should handle negative deltas', () => {
    const annotation: Annotation = {
      id: 'r2',
      type: 'rectangle',
      style: baseStyle,
      timestamp: 0,
      x: 100,
      y: 200,
      width: 50,
      height: 50,
    };
    const updates = moveAnnotation(annotation, -30, -50);
    expect(updates).toEqual({ x: 70, y: 150 });
  });
});
