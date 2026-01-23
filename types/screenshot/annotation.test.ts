/**
 * Screenshot Annotation Types Tests
 */

import {
  DEFAULT_STYLE,
  PRESET_COLORS,
  STROKE_WIDTHS,
  FONT_SIZES,
} from './annotation';
import type {
  AnnotationTool,
  AnnotationStyle,
  Annotation,
  RectangleAnnotation,
  EllipseAnnotation,
  ArrowAnnotation,
  FreehandAnnotation,
  TextAnnotation,
  BlurAnnotation,
  HighlightAnnotation,
  MarkerAnnotation,
  SelectionRegion,
  ResizeHandle,
} from './annotation';

describe('Annotation Types', () => {
  describe('DEFAULT_STYLE', () => {
    it('should have required properties', () => {
      expect(DEFAULT_STYLE).toHaveProperty('color');
      expect(DEFAULT_STYLE).toHaveProperty('strokeWidth');
      expect(DEFAULT_STYLE).toHaveProperty('filled');
      expect(DEFAULT_STYLE).toHaveProperty('opacity');
    });

    it('should have valid default values', () => {
      expect(typeof DEFAULT_STYLE.color).toBe('string');
      expect(DEFAULT_STYLE.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(DEFAULT_STYLE.strokeWidth).toBeGreaterThan(0);
      expect(DEFAULT_STYLE.opacity).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_STYLE.opacity).toBeLessThanOrEqual(1);
    });
  });

  describe('PRESET_COLORS', () => {
    it('should have multiple colors', () => {
      expect(PRESET_COLORS.length).toBeGreaterThan(0);
    });

    it('should contain valid hex colors', () => {
      PRESET_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('STROKE_WIDTHS', () => {
    it('should have multiple widths', () => {
      expect(STROKE_WIDTHS.length).toBeGreaterThan(0);
    });

    it('should contain positive numbers', () => {
      STROKE_WIDTHS.forEach((width) => {
        expect(width).toBeGreaterThan(0);
      });
    });

    it('should be sorted ascending', () => {
      for (let i = 1; i < STROKE_WIDTHS.length; i++) {
        expect(STROKE_WIDTHS[i]).toBeGreaterThan(STROKE_WIDTHS[i - 1]);
      }
    });
  });

  describe('FONT_SIZES', () => {
    it('should have multiple sizes', () => {
      expect(FONT_SIZES.length).toBeGreaterThan(0);
    });

    it('should contain positive numbers', () => {
      FONT_SIZES.forEach((size) => {
        expect(size).toBeGreaterThan(0);
      });
    });
  });

  describe('Type Guards', () => {
    const baseStyle: AnnotationStyle = {
      color: '#FF0000',
      strokeWidth: 2,
      filled: false,
      opacity: 1,
    };

    it('should create valid RectangleAnnotation', () => {
      const annotation: RectangleAnnotation = {
        id: 'rect-1',
        type: 'rectangle',
        style: baseStyle,
        timestamp: Date.now(),
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      };

      expect(annotation.type).toBe('rectangle');
      expect(annotation.x).toBe(10);
      expect(annotation.y).toBe(20);
    });

    it('should create valid EllipseAnnotation', () => {
      const annotation: EllipseAnnotation = {
        id: 'ellipse-1',
        type: 'ellipse',
        style: baseStyle,
        timestamp: Date.now(),
        cx: 100,
        cy: 100,
        rx: 50,
        ry: 30,
      };

      expect(annotation.type).toBe('ellipse');
      expect(annotation.cx).toBe(100);
      expect(annotation.rx).toBe(50);
    });

    it('should create valid ArrowAnnotation', () => {
      const annotation: ArrowAnnotation = {
        id: 'arrow-1',
        type: 'arrow',
        style: baseStyle,
        timestamp: Date.now(),
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 100,
      };

      expect(annotation.type).toBe('arrow');
      expect(annotation.startX).toBe(0);
      expect(annotation.endX).toBe(100);
    });

    it('should create valid FreehandAnnotation', () => {
      const annotation: FreehandAnnotation = {
        id: 'freehand-1',
        type: 'freehand',
        style: baseStyle,
        timestamp: Date.now(),
        points: [[0, 0], [10, 10], [20, 15]],
      };

      expect(annotation.type).toBe('freehand');
      expect(annotation.points).toHaveLength(3);
    });

    it('should create valid TextAnnotation', () => {
      const annotation: TextAnnotation = {
        id: 'text-1',
        type: 'text',
        style: { ...baseStyle, fontSize: 16 },
        timestamp: Date.now(),
        x: 50,
        y: 50,
        text: 'Hello World',
      };

      expect(annotation.type).toBe('text');
      expect(annotation.text).toBe('Hello World');
    });

    it('should create valid BlurAnnotation', () => {
      const annotation: BlurAnnotation = {
        id: 'blur-1',
        type: 'blur',
        style: baseStyle,
        timestamp: Date.now(),
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        intensity: 0.8,
      };

      expect(annotation.type).toBe('blur');
      expect(annotation.intensity).toBe(0.8);
    });

    it('should create valid HighlightAnnotation', () => {
      const annotation: HighlightAnnotation = {
        id: 'highlight-1',
        type: 'highlight',
        style: { ...baseStyle, opacity: 0.3 },
        timestamp: Date.now(),
        x: 10,
        y: 10,
        width: 200,
        height: 30,
      };

      expect(annotation.type).toBe('highlight');
      expect(annotation.style.opacity).toBe(0.3);
    });

    it('should create valid MarkerAnnotation', () => {
      const annotation: MarkerAnnotation = {
        id: 'marker-1',
        type: 'marker',
        style: baseStyle,
        timestamp: Date.now(),
        x: 100,
        y: 100,
        number: 1,
        size: 24,
      };

      expect(annotation.type).toBe('marker');
      expect(annotation.number).toBe(1);
      expect(annotation.size).toBe(24);
    });
  });

  describe('SelectionRegion', () => {
    it('should have required properties', () => {
      const region: SelectionRegion = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      };

      expect(region.x).toBe(0);
      expect(region.y).toBe(0);
      expect(region.width).toBe(100);
      expect(region.height).toBe(100);
    });
  });

  describe('ResizeHandle', () => {
    it('should accept all valid handle positions', () => {
      const handles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

      expect(handles).toHaveLength(8);
      handles.forEach((handle) => {
        expect(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']).toContain(handle);
      });
    });
  });

  describe('AnnotationTool', () => {
    it('should accept all valid tool types', () => {
      const tools: AnnotationTool[] = [
        'select',
        'rectangle',
        'ellipse',
        'arrow',
        'freehand',
        'text',
        'blur',
        'highlight',
        'marker',
      ];

      expect(tools).toHaveLength(9);
    });
  });
});
