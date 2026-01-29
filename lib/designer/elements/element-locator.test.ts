/**
 * Element Locator Tests
 */

import {
  getVisualBounds,
  calculateDropPosition,
  calculateDropPositionHorizontal,
  findElementByPattern,
  findElementByTagAndClass,
  findClosingTag,
  getElementLocation,
  getInsertionPoint,
  optimizeForModelOutput,
  generateCompactTree,
  clearAstCache,
  type VisualBounds,
  type ElementLocation,
} from './element-locator';
import type { DesignerElement } from '@/types/designer';

describe('element-locator', () => {
  beforeEach(() => {
    clearAstCache();
  });

  // ==========================================================================
  // Visual Positioning Tests
  // ==========================================================================

  describe('getVisualBounds', () => {
    it('should calculate bounds relative to viewport', () => {
      const element = {
        getBoundingClientRect: () => ({
          top: 100,
          left: 50,
          right: 250,
          bottom: 200,
          width: 200,
          height: 100,
        }),
      } as HTMLElement;

      const bounds = getVisualBounds(element);

      expect(bounds.top).toBe(100);
      expect(bounds.left).toBe(50);
      expect(bounds.width).toBe(200);
      expect(bounds.height).toBe(100);
    });

    it('should calculate bounds relative to container', () => {
      const element = {
        getBoundingClientRect: () => ({
          top: 150,
          left: 100,
          right: 300,
          bottom: 250,
          width: 200,
          height: 100,
        }),
      } as HTMLElement;

      const containerRect = {
        top: 50,
        left: 50,
        right: 400,
        bottom: 400,
      } as DOMRect;

      const bounds = getVisualBounds(element, containerRect);

      expect(bounds.top).toBe(100); // 150 - 50
      expect(bounds.left).toBe(50); // 100 - 50
    });
  });

  describe('calculateDropPosition', () => {
    const elementRect: VisualBounds = {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 100,
      height: 100,
    };

    it('should return "before" for top 25%', () => {
      expect(calculateDropPosition(10, elementRect)).toBe('before');
      expect(calculateDropPosition(24, elementRect)).toBe('before');
    });

    it('should return "after" for bottom 25%', () => {
      expect(calculateDropPosition(76, elementRect)).toBe('after');
      expect(calculateDropPosition(90, elementRect)).toBe('after');
    });

    it('should return "inside" for middle 50%', () => {
      expect(calculateDropPosition(25, elementRect)).toBe('inside');
      expect(calculateDropPosition(50, elementRect)).toBe('inside');
      expect(calculateDropPosition(75, elementRect)).toBe('inside');
    });

    it('should support custom edge zone', () => {
      // 10% edge zone
      expect(calculateDropPosition(5, elementRect, { edgeZone: 0.1 })).toBe('before');
      expect(calculateDropPosition(15, elementRect, { edgeZone: 0.1 })).toBe('inside');
      expect(calculateDropPosition(95, elementRect, { edgeZone: 0.1 })).toBe('after');
    });

    it('should support child positions', () => {
      expect(
        calculateDropPosition(40, elementRect, { enableChildPositions: true })
      ).toBe('first-child');
      expect(
        calculateDropPosition(60, elementRect, { enableChildPositions: true })
      ).toBe('last-child');
    });
  });

  describe('calculateDropPositionHorizontal', () => {
    const elementRect: VisualBounds = {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 100,
      height: 50,
    };

    it('should return "before" for left edge', () => {
      expect(calculateDropPositionHorizontal(10, elementRect)).toBe('before');
    });

    it('should return "after" for right edge', () => {
      expect(calculateDropPositionHorizontal(90, elementRect)).toBe('after');
    });

    it('should return "inside" for middle', () => {
      expect(calculateDropPositionHorizontal(50, elementRect)).toBe('inside');
    });
  });

  // ==========================================================================
  // Pattern Matching Tests
  // ==========================================================================

  describe('findElementByPattern', () => {
    it('should find element by data-element-id', () => {
      const code = `<div data-element-id="el-1" className="container">Hello</div>`;
      const result = findElementByPattern(code, 'el-1');

      expect(result).not.toBeNull();
      expect(result?.line).toBe(1);
      expect(result?.content).toContain('data-element-id="el-1"');
    });

    it('should find element by id attribute', () => {
      const code = `<div id="my-element" className="box">Content</div>`;
      const result = findElementByPattern(code, 'my-element');

      expect(result).not.toBeNull();
      expect(result?.content).toContain('id="my-element"');
    });

    it('should return null for non-existent element', () => {
      const code = `<div id="other">Content</div>`;
      const result = findElementByPattern(code, 'non-existent');

      expect(result).toBeNull();
    });

    it('should handle multi-line code', () => {
      const code = `
<div>
  <span data-element-id="target" className="text">
    Hello World
  </span>
</div>`;
      const result = findElementByPattern(code, 'target');

      expect(result).not.toBeNull();
      expect(result?.line).toBe(3);
    });
  });

  describe('findElementByTagAndClass', () => {
    it('should find element by tag and class', () => {
      const code = `<div className="container"><p className="text-lg font-bold">Hello</p></div>`;
      const result = findElementByTagAndClass(code, 'p', 'text-lg');

      expect(result).not.toBeNull();
      expect(result?.content).toContain('<p');
    });

    it('should find element by tag only', () => {
      const code = `<div><button>Click me</button></div>`;
      const result = findElementByTagAndClass(code, 'button');

      expect(result).not.toBeNull();
      expect(result?.content).toBe('<button>');
    });

    it('should find nth occurrence', () => {
      const code = `<div><p>First</p><p>Second</p><p>Third</p></div>`;
      
      const first = findElementByTagAndClass(code, 'p', undefined, 1);
      const second = findElementByTagAndClass(code, 'p', undefined, 2);
      const third = findElementByTagAndClass(code, 'p', undefined, 3);

      expect(first?.startIndex).toBeLessThan(second?.startIndex || 0);
      expect(second?.startIndex).toBeLessThan(third?.startIndex || 0);
    });
  });

  describe('findClosingTag', () => {
    it('should find simple closing tag', () => {
      const code = `<div className="box">Content</div>`;
      const result = findClosingTag(code, 'div', 0);

      expect(result).not.toBeNull();
      expect(result?.content).toBe('</div>');
    });

    it('should handle nested elements', () => {
      const code = `<div><div>Inner</div></div>`;
      const result = findClosingTag(code, 'div', 0);

      expect(result).not.toBeNull();
      // Should find the outer closing tag
      expect(result?.startIndex).toBe(code.lastIndexOf('</div>'));
    });

    it('should handle deeply nested elements', () => {
      const code = `<div><div><div>Deep</div></div></div>`;
      const result = findClosingTag(code, 'div', 0);

      expect(result).not.toBeNull();
      expect(result?.endIndex).toBe(code.length);
    });
  });

  // ==========================================================================
  // Combined Positioning Tests
  // ==========================================================================

  describe('getElementLocation', () => {
    it('should get element location in rough mode', async () => {
      const code = `<div data-element-id="el-1" className="container">Hello</div>`;
      const visualBounds: VisualBounds = {
        top: 10,
        left: 20,
        right: 30,
        bottom: 40,
        width: 200,
        height: 100,
      };

      const location = await getElementLocation(code, 'el-1', visualBounds, 'rough');

      expect(location.elementId).toBe('el-1');
      expect(location.visual).toEqual(visualBounds);
      expect(location.confidence).toBeGreaterThan(0);
    });

    it('should use pattern matching as fallback', async () => {
      const code = `<div data-element-id="el-1" className="box">Content</div>`;
      const location = await getElementLocation(code, 'el-1', null, 'precise');

      expect(location.elementId).toBe('el-1');
      expect(location.source).not.toBeNull();
      expect(location.method).toMatch(/ast|pattern/);
    });

    it('should return combined method when both visual and source available', async () => {
      const code = `<div data-element-id="el-1">Test</div>`;
      const visualBounds: VisualBounds = {
        top: 0, left: 0, right: 0, bottom: 0, width: 100, height: 50,
      };

      const location = await getElementLocation(code, 'el-1', visualBounds, 'precise');

      if (location.source) {
        expect(location.method).toBe('combined');
        expect(location.confidence).toBeGreaterThan(0.7);
      }
    });
  });

  describe('getInsertionPoint', () => {
    const code = `<div data-element-id="root">
  <p data-element-id="para">Hello</p>
</div>`;

    it('should calculate insertion point for "before" position', async () => {
      const point = await getInsertionPoint(code, 'para', 'before');

      expect(point).not.toBeNull();
      expect(point?.position).toBe('before');
      expect(point?.targetElementId).toBe('para');
    });

    it('should calculate insertion point for "after" position', async () => {
      const point = await getInsertionPoint(code, 'para', 'after');

      expect(point).not.toBeNull();
      expect(point?.position).toBe('after');
    });

    it('should calculate insertion point for "inside" position', async () => {
      const point = await getInsertionPoint(code, 'root', 'inside');

      expect(point).not.toBeNull();
      expect(point?.position).toBe('inside');
    });

    it('should return null for root insertion without code', async () => {
      const point = await getInsertionPoint('', null, 'inside');
      expect(point).toBeNull();
    });
  });

  // ==========================================================================
  // Model Output Optimization Tests
  // ==========================================================================

  describe('optimizeForModelOutput', () => {
    it('should create compact reference format', () => {
      const location: ElementLocation = {
        elementId: 'el-1',
        tagName: 'div',
        className: 'container mx-auto',
        visual: { top: 10, left: 20, right: 30, bottom: 40, width: 200, height: 100 },
        source: { startLine: 5, endLine: 10, startColumn: 0, endColumn: 6 },
        confidence: 0.95,
        method: 'combined',
        parentId: null,
        childIds: [],
      };

      const optimized = optimizeForModelOutput(location);

      expect(optimized.ref).toBe('el-1@L5-10');
      expect(optimized.tag).toBe('div');
      expect(optimized.cls).toBe('container');
      expect(optimized.box).toEqual([10, 20, 200, 100]);
      expect(optimized.src).toEqual([5, 10]);
      expect(optimized.conf).toBe(95);
    });

    it('should handle minimal location data', () => {
      const location: ElementLocation = {
        elementId: 'el-2',
        tagName: 'span',
        visual: null,
        source: null,
        confidence: 0.5,
        method: 'visual',
        parentId: null,
        childIds: [],
      };

      const optimized = optimizeForModelOutput(location);

      expect(optimized.ref).toBe('el-2');
      expect(optimized.tag).toBe('span');
      expect(optimized.cls).toBeUndefined();
      expect(optimized.box).toBeUndefined();
      expect(optimized.src).toBeUndefined();
      expect(optimized.conf).toBe(50);
    });
  });

  describe('generateCompactTree', () => {
    it('should generate readable tree format', () => {
      const elements: DesignerElement[] = [
        {
          id: 'root',
          tagName: 'div',
          className: 'container',
          attributes: {},
          styles: {},
          children: [
            {
              id: 'child1',
              tagName: 'p',
              className: 'text',
              attributes: {},
              styles: {},
              children: [],
              parentId: 'root',
              sourceRange: { startLine: 2, endLine: 2, startColumn: 0, endColumn: 20 },
            },
            {
              id: 'child2',
              tagName: 'img',
              className: '',
              attributes: {},
              styles: {},
              children: [],
              parentId: 'root',
            },
          ],
          parentId: null,
          sourceRange: { startLine: 1, endLine: 5, startColumn: 0, endColumn: 6 },
        },
      ];

      const tree = generateCompactTree(elements);

      expect(tree).toContain('div.container[L1-5]');
      expect(tree).toContain('p.text[L2-2]');
      expect(tree).toContain('img');
      expect(tree).toContain('├─');
      expect(tree).toContain('└─');
    });

    it('should respect maxDepth', () => {
      const deepElement: DesignerElement = {
        id: 'level0',
        tagName: 'div',
        className: 'l0',
        attributes: {},
        styles: {},
        parentId: null,
        children: [
          {
            id: 'level1',
            tagName: 'div',
            className: 'l1',
            attributes: {},
            styles: {},
            parentId: 'level0',
            children: [
              {
                id: 'level2',
                tagName: 'div',
                className: 'l2',
                attributes: {},
                styles: {},
                parentId: 'level1',
                children: [
                  {
                    id: 'level3',
                    tagName: 'div',
                    className: 'l3',
                    attributes: {},
                    styles: {},
                    parentId: 'level2',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const tree = generateCompactTree([deepElement], 2);

      expect(tree).toContain('l0');
      expect(tree).toContain('l1');
      expect(tree).toContain('l2');
      expect(tree).not.toContain('l3'); // Should be cut off at depth 2
    });
  });
});
