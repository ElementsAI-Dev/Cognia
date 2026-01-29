/**
 * Annotation Type Guards Tests
 */

import {
  isRectangleAnnotation,
  isEllipseAnnotation,
  isArrowAnnotation,
  isFreehandAnnotation,
  isTextAnnotation,
  isBlurAnnotation,
  isHighlightAnnotation,
  isMarkerAnnotation,
  PRESET_COLORS,
  STROKE_WIDTHS,
  FONT_SIZES,
} from './annotation';
import type { Annotation, AnnotationStyle } from './annotation';

const baseStyle: AnnotationStyle = {
  color: '#FF0000',
  strokeWidth: 2,
  filled: false,
  opacity: 1,
};

const createAnnotation = (type: string, extras: Record<string, unknown> = {}): Annotation => {
  const base = {
    id: 'test-id',
    style: baseStyle,
    timestamp: Date.now(),
  };

  switch (type) {
    case 'rectangle':
      return { ...base, type: 'rectangle', x: 0, y: 0, width: 100, height: 100, ...extras };
    case 'ellipse':
      return { ...base, type: 'ellipse', cx: 50, cy: 50, rx: 50, ry: 30, ...extras };
    case 'arrow':
      return { ...base, type: 'arrow', startX: 0, startY: 0, endX: 100, endY: 100, ...extras };
    case 'freehand':
      return {
        ...base,
        type: 'freehand',
        points: [
          [0, 0],
          [10, 10],
          [20, 20],
        ],
        ...extras,
      };
    case 'text':
      return { ...base, type: 'text', x: 0, y: 0, text: 'Hello', ...extras };
    case 'blur':
      return { ...base, type: 'blur', x: 0, y: 0, width: 100, height: 100, intensity: 10, ...extras };
    case 'highlight':
      return { ...base, type: 'highlight', x: 0, y: 0, width: 100, height: 100, ...extras };
    case 'marker':
      return { ...base, type: 'marker', x: 50, y: 50, number: 1, size: 24, ...extras };
    default:
      throw new Error(`Unknown annotation type: ${type}`);
  }
};

describe('Type Guards', () => {
  describe('isRectangleAnnotation', () => {
    it('should return true for rectangle annotation', () => {
      const annotation = createAnnotation('rectangle');
      expect(isRectangleAnnotation(annotation)).toBe(true);
    });

    it('should return false for non-rectangle annotation', () => {
      const annotation = createAnnotation('ellipse');
      expect(isRectangleAnnotation(annotation)).toBe(false);
    });
  });

  describe('isEllipseAnnotation', () => {
    it('should return true for ellipse annotation', () => {
      const annotation = createAnnotation('ellipse');
      expect(isEllipseAnnotation(annotation)).toBe(true);
    });

    it('should return false for non-ellipse annotation', () => {
      const annotation = createAnnotation('rectangle');
      expect(isEllipseAnnotation(annotation)).toBe(false);
    });
  });

  describe('isArrowAnnotation', () => {
    it('should return true for arrow annotation', () => {
      const annotation = createAnnotation('arrow');
      expect(isArrowAnnotation(annotation)).toBe(true);
    });

    it('should return false for non-arrow annotation', () => {
      const annotation = createAnnotation('rectangle');
      expect(isArrowAnnotation(annotation)).toBe(false);
    });
  });

  describe('isFreehandAnnotation', () => {
    it('should return true for freehand annotation', () => {
      const annotation = createAnnotation('freehand');
      expect(isFreehandAnnotation(annotation)).toBe(true);
    });

    it('should return false for non-freehand annotation', () => {
      const annotation = createAnnotation('rectangle');
      expect(isFreehandAnnotation(annotation)).toBe(false);
    });
  });

  describe('isTextAnnotation', () => {
    it('should return true for text annotation', () => {
      const annotation = createAnnotation('text');
      expect(isTextAnnotation(annotation)).toBe(true);
    });

    it('should return false for non-text annotation', () => {
      const annotation = createAnnotation('rectangle');
      expect(isTextAnnotation(annotation)).toBe(false);
    });
  });

  describe('isBlurAnnotation', () => {
    it('should return true for blur annotation', () => {
      const annotation = createAnnotation('blur');
      expect(isBlurAnnotation(annotation)).toBe(true);
    });

    it('should return false for non-blur annotation', () => {
      const annotation = createAnnotation('rectangle');
      expect(isBlurAnnotation(annotation)).toBe(false);
    });
  });

  describe('isHighlightAnnotation', () => {
    it('should return true for highlight annotation', () => {
      const annotation = createAnnotation('highlight');
      expect(isHighlightAnnotation(annotation)).toBe(true);
    });

    it('should return false for non-highlight annotation', () => {
      const annotation = createAnnotation('rectangle');
      expect(isHighlightAnnotation(annotation)).toBe(false);
    });
  });

  describe('isMarkerAnnotation', () => {
    it('should return true for marker annotation', () => {
      const annotation = createAnnotation('marker');
      expect(isMarkerAnnotation(annotation)).toBe(true);
    });

    it('should return false for non-marker annotation', () => {
      const annotation = createAnnotation('rectangle');
      expect(isMarkerAnnotation(annotation)).toBe(false);
    });
  });
});

describe('Constants', () => {
  describe('PRESET_COLORS', () => {
    it('should have 10 preset colors', () => {
      expect(PRESET_COLORS).toHaveLength(10);
    });

    it('should contain valid hex color codes', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      PRESET_COLORS.forEach((color) => {
        expect(color).toMatch(hexColorRegex);
      });
    });

    it('should include red as first color', () => {
      expect(PRESET_COLORS[0]).toBe('#FF0000');
    });

    it('should include black as last color', () => {
      expect(PRESET_COLORS[9]).toBe('#000000');
    });
  });

  describe('STROKE_WIDTHS', () => {
    it('should have multiple stroke width options', () => {
      expect(STROKE_WIDTHS.length).toBeGreaterThan(0);
    });

    it('should be sorted in ascending order', () => {
      const sorted = [...STROKE_WIDTHS].sort((a, b) => a - b);
      expect(STROKE_WIDTHS).toEqual(sorted);
    });

    it('should contain positive numbers', () => {
      STROKE_WIDTHS.forEach((width) => {
        expect(width).toBeGreaterThan(0);
      });
    });
  });

  describe('FONT_SIZES', () => {
    it('should have multiple font size options', () => {
      expect(FONT_SIZES.length).toBeGreaterThan(0);
    });

    it('should be sorted in ascending order', () => {
      const sorted = [...FONT_SIZES].sort((a, b) => a - b);
      expect(FONT_SIZES).toEqual(sorted);
    });

    it('should contain reasonable font sizes', () => {
      FONT_SIZES.forEach((size) => {
        expect(size).toBeGreaterThanOrEqual(8);
        expect(size).toBeLessThanOrEqual(100);
      });
    });
  });
});

describe('Type Narrowing', () => {
  it('should narrow type correctly after type guard check', () => {
    const annotation = createAnnotation('rectangle');

    if (isRectangleAnnotation(annotation)) {
      // TypeScript should allow access to rectangle-specific properties
      expect(annotation.x).toBeDefined();
      expect(annotation.y).toBeDefined();
      expect(annotation.width).toBeDefined();
      expect(annotation.height).toBeDefined();
    }
  });

  it('should work in filter operations', () => {
    const annotations: Annotation[] = [
      createAnnotation('rectangle'),
      createAnnotation('ellipse'),
      createAnnotation('rectangle'),
      createAnnotation('text'),
    ];

    const rectangles = annotations.filter(isRectangleAnnotation);
    expect(rectangles).toHaveLength(2);
    rectangles.forEach((rect) => {
      expect(rect.type).toBe('rectangle');
    });
  });
});
