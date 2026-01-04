/**
 * Layout Engine Tests
 */

import {
  LAYOUT_TEMPLATES,
  calculateOptimalFontSize,
  suggestLayout,
  calculateSnapGuides,
  snapToGuide,
  autoArrangeElements,
  distributeElements,
  alignElements,
  type LayoutZone,
  type SnapGuide,
} from './layout-engine';
import type { PPTSlideElement } from '@/types/workflow';

describe('Layout Engine', () => {
  describe('LAYOUT_TEMPLATES', () => {
    it('should have all required layout types', () => {
      const requiredLayouts = [
        'title',
        'title-content',
        'section',
        'two-column',
        'image-left',
        'image-right',
        'full-image',
        'bullets',
        'numbered',
        'comparison',
        'quote',
        'blank',
        'chart',
        'table',
        'timeline',
        'closing',
      ];

      requiredLayouts.forEach(layout => {
        expect(LAYOUT_TEMPLATES).toHaveProperty(layout);
      });
    });

    it('should have valid zones for title layout', () => {
      const titleZones = LAYOUT_TEMPLATES['title'];
      expect(titleZones).toHaveLength(2);
      expect(titleZones[0].contentType).toBe('title');
      expect(titleZones[1].contentType).toBe('subtitle');
    });

    it('should have empty zones for blank layout', () => {
      expect(LAYOUT_TEMPLATES['blank']).toHaveLength(0);
    });

    it('should have valid zone structure', () => {
      const titleContentZones = LAYOUT_TEMPLATES['title-content'];
      
      titleContentZones.forEach((zone: LayoutZone) => {
        expect(zone).toHaveProperty('id');
        expect(zone).toHaveProperty('name');
        expect(zone).toHaveProperty('x');
        expect(zone).toHaveProperty('y');
        expect(zone).toHaveProperty('width');
        expect(zone).toHaveProperty('height');
        expect(zone).toHaveProperty('contentType');
        expect(zone).toHaveProperty('priority');
        
        // Validate percentages are in valid range
        expect(zone.x).toBeGreaterThanOrEqual(0);
        expect(zone.x).toBeLessThanOrEqual(100);
        expect(zone.y).toBeGreaterThanOrEqual(0);
        expect(zone.y).toBeLessThanOrEqual(100);
        expect(zone.width).toBeGreaterThan(0);
        expect(zone.height).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateOptimalFontSize', () => {
    it('should return size within min/max bounds', () => {
      const result = calculateOptimalFontSize('Test', 100, 100, 12, 72);
      expect(result).toBeGreaterThanOrEqual(12);
      expect(result).toBeLessThanOrEqual(72);
    });

    it('should return larger size for shorter text', () => {
      const shortText = calculateOptimalFontSize('Hi', 200, 100);
      const longText = calculateOptimalFontSize('This is a much longer piece of text that spans multiple words', 200, 100);
      expect(shortText).toBeGreaterThanOrEqual(longText);
    });

    it('should respect minimum size', () => {
      const result = calculateOptimalFontSize(
        'Very long text '.repeat(100),
        50,
        50,
        14,
        72
      );
      expect(result).toBeGreaterThanOrEqual(14);
    });

    it('should respect maximum size', () => {
      const result = calculateOptimalFontSize('A', 1000, 1000, 12, 48);
      expect(result).toBeLessThanOrEqual(48);
    });
  });

  describe('suggestLayout', () => {
    it('should suggest title layout for title and subtitle only', () => {
      const result = suggestLayout({
        title: 'My Title',
        subtitle: 'My Subtitle',
      });
      expect(result).toBe('title');
    });

    it('should suggest section layout for title only', () => {
      const result = suggestLayout({
        title: 'Section Header',
      });
      expect(result).toBe('section');
    });

    it('should suggest image-left for image with many bullets', () => {
      const result = suggestLayout({
        title: 'Title',
        images: ['image.jpg'],
        bullets: ['1', '2', '3', '4'],
      });
      expect(result).toBe('image-left');
    });

    it('should suggest image-right for image with few bullets', () => {
      const result = suggestLayout({
        title: 'Title',
        images: ['image.jpg'],
        bullets: ['1', '2'],
      });
      expect(result).toBe('image-right');
    });

    it('should suggest comparison for even number of bullets >= 4', () => {
      const result = suggestLayout({
        title: 'Compare',
        bullets: ['A1', 'A2', 'B1', 'B2'],
      });
      expect(result).toBe('comparison');
    });

    it('should suggest bullets layout for bullet content', () => {
      const result = suggestLayout({
        title: 'Points',
        bullets: ['Point 1', 'Point 2', 'Point 3'],
      });
      expect(result).toBe('bullets');
    });

    it('should default to title-content', () => {
      const result = suggestLayout({
        title: 'Title',
        subtitle: 'Sub',
        bullets: ['One'],
      });
      expect(result).toBe('title-content');
    });
  });

  describe('calculateSnapGuides', () => {
    const mockElement: PPTSlideElement = {
      id: 'current',
      type: 'text',
      content: 'Test',
      position: { x: 10, y: 10, width: 20, height: 10 },
    };

    const otherElements: PPTSlideElement[] = [
      {
        id: 'other1',
        type: 'text',
        content: 'Other',
        position: { x: 30, y: 20, width: 20, height: 10 },
      },
    ];

    it('should always include center guides', () => {
      const guides = calculateSnapGuides([], mockElement);
      
      const verticalCenter = guides.find(g => g.type === 'vertical' && g.position === 50);
      const horizontalCenter = guides.find(g => g.type === 'horizontal' && g.position === 50);
      
      expect(verticalCenter).toBeDefined();
      expect(horizontalCenter).toBeDefined();
    });

    it('should include guides from other elements', () => {
      const guides = calculateSnapGuides(otherElements, mockElement);
      
      // Should have guide at x=30 (left edge of other1)
      const leftEdge = guides.find(g => g.type === 'vertical' && g.position === 30);
      expect(leftEdge).toBeDefined();
      
      // Should have guide at x=50 (right edge of other1: 30 + 20)
      const rightEdge = guides.find(g => g.type === 'vertical' && g.position === 50);
      expect(rightEdge).toBeDefined();
    });

    it('should not include guides from current element', () => {
      const guides = calculateSnapGuides([mockElement, ...otherElements], mockElement);
      
      // Should not have duplicate guides from current element at x=10
      const currentLeftGuides = guides.filter(g => g.type === 'vertical' && g.position === 10);
      expect(currentLeftGuides.length).toBe(0);
    });
  });

  describe('snapToGuide', () => {
    const guides: SnapGuide[] = [
      { type: 'vertical', position: 50, label: 'Center' },
      { type: 'horizontal', position: 50, label: 'Middle' },
      { type: 'vertical', position: 25 },
    ];

    it('should snap to nearby guide within threshold', () => {
      const result = snapToGuide(51, guides, 'vertical', 2);
      expect(result.snapped).toBe(50);
      expect(result.guide?.position).toBe(50);
    });

    it('should not snap if outside threshold', () => {
      const result = snapToGuide(55, guides, 'vertical', 2);
      expect(result.snapped).toBe(55);
      expect(result.guide).toBeNull();
    });

    it('should only consider guides of matching orientation', () => {
      const result = snapToGuide(50, guides, 'horizontal', 2);
      expect(result.snapped).toBe(50);
      expect(result.guide?.type).toBe('horizontal');
    });
  });

  describe('autoArrangeElements', () => {
    it('should return empty array for empty input', () => {
      const result = autoArrangeElements([]);
      expect(result).toHaveLength(0);
    });

    it('should arrange single element', () => {
      const elements: PPTSlideElement[] = [
        { id: '1', type: 'text', content: 'Test' },
      ];
      
      const result = autoArrangeElements(elements);
      expect(result).toHaveLength(1);
      expect(result[0].position).toBeDefined();
    });

    it('should arrange elements in grid pattern', () => {
      const elements: PPTSlideElement[] = [
        { id: '1', type: 'text', content: 'A' },
        { id: '2', type: 'text', content: 'B' },
        { id: '3', type: 'text', content: 'C' },
        { id: '4', type: 'text', content: 'D' },
      ];
      
      const result = autoArrangeElements(elements);
      
      // 4 elements should be in 2x2 grid
      expect(result).toHaveLength(4);
      
      // All should have positions
      result.forEach(el => {
        expect(el.position).toBeDefined();
        expect(el.position!.x).toBeGreaterThanOrEqual(0);
        expect(el.position!.y).toBeGreaterThanOrEqual(0);
      });
    });

    it('should respect container dimensions', () => {
      const elements: PPTSlideElement[] = [
        { id: '1', type: 'text', content: 'A' },
        { id: '2', type: 'text', content: 'B' },
      ];
      
      const result = autoArrangeElements(elements, 80, 60, 5, 2);
      
      result.forEach(el => {
        expect(el.position!.x + el.position!.width).toBeLessThanOrEqual(80);
        expect(el.position!.y + el.position!.height).toBeLessThanOrEqual(60);
      });
    });
  });

  describe('distributeElements', () => {
    const createElements = (count: number): PPTSlideElement[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `el-${i}`,
        type: 'text' as const,
        content: `Element ${i}`,
        position: { x: 10, y: 10, width: 15, height: 10 },
      }));
    };

    it('should return unchanged for single element', () => {
      const elements = createElements(1);
      const result = distributeElements(elements, 'horizontal');
      expect(result).toHaveLength(1);
    });

    it('should distribute horizontally', () => {
      const elements = createElements(3);
      const result = distributeElements(elements, 'horizontal', 10, 90);
      
      // First element should be at start
      expect(result[0].position!.x).toBeCloseTo(10 - result[0].position!.width / 2, 1);
      
      // Last element should be at end
      expect(result[2].position!.x).toBeCloseTo(90 - result[2].position!.width / 2, 1);
      
      // Middle element should be centered
      expect(result[1].position!.x).toBeCloseTo(50 - result[1].position!.width / 2, 1);
    });

    it('should distribute vertically', () => {
      const elements = createElements(3);
      const result = distributeElements(elements, 'vertical', 10, 90);
      
      // First element should be at start
      expect(result[0].position!.y).toBeCloseTo(10 - result[0].position!.height / 2, 1);
      
      // Last element should be at end
      expect(result[2].position!.y).toBeCloseTo(90 - result[2].position!.height / 2, 1);
    });

    it('should handle elements without position', () => {
      const elements: PPTSlideElement[] = [
        { id: '1', type: 'text', content: 'A' },
        { id: '2', type: 'text', content: 'B' },
      ];
      
      const result = distributeElements(elements, 'horizontal');
      
      result.forEach(el => {
        expect(el.position).toBeDefined();
      });
    });
  });

  describe('alignElements', () => {
    const createElements = (): PPTSlideElement[] => [
      {
        id: '1',
        type: 'text',
        content: 'A',
        position: { x: 10, y: 20, width: 20, height: 10 },
      },
      {
        id: '2',
        type: 'text',
        content: 'B',
        position: { x: 40, y: 30, width: 25, height: 15 },
      },
      {
        id: '3',
        type: 'text',
        content: 'C',
        position: { x: 25, y: 50, width: 15, height: 20 },
      },
    ];

    it('should return empty array for empty input', () => {
      const result = alignElements([], 'left');
      expect(result).toHaveLength(0);
    });

    it('should align left', () => {
      const elements = createElements();
      const result = alignElements(elements, 'left');
      
      // All x positions should be 10 (minimum)
      result.forEach(el => {
        expect(el.position!.x).toBe(10);
      });
    });

    it('should align right', () => {
      const elements = createElements();
      const result = alignElements(elements, 'right');
      
      // All right edges should align to maximum (40 + 25 = 65)
      const maxRight = 65;
      result.forEach(el => {
        expect(el.position!.x + el.position!.width).toBeCloseTo(maxRight, 1);
      });
    });

    it('should align center horizontally', () => {
      const elements = createElements();
      const result = alignElements(elements, 'center');
      
      // All centers should be the same
      const centers = result.map(el => el.position!.x + el.position!.width / 2);
      const firstCenter = centers[0];
      centers.forEach(center => {
        expect(center).toBeCloseTo(firstCenter, 1);
      });
    });

    it('should align top', () => {
      const elements = createElements();
      const result = alignElements(elements, 'top');
      
      // All y positions should be 20 (minimum)
      result.forEach(el => {
        expect(el.position!.y).toBe(20);
      });
    });

    it('should align bottom', () => {
      const elements = createElements();
      const result = alignElements(elements, 'bottom');
      
      // All bottom edges should align to maximum (50 + 20 = 70)
      const maxBottom = 70;
      result.forEach(el => {
        expect(el.position!.y + el.position!.height).toBeCloseTo(maxBottom, 1);
      });
    });

    it('should align middle vertically', () => {
      const elements = createElements();
      const result = alignElements(elements, 'middle');
      
      // All vertical centers should be the same
      const centers = result.map(el => el.position!.y + el.position!.height / 2);
      const firstCenter = centers[0];
      centers.forEach(center => {
        expect(center).toBeCloseTo(firstCenter, 1);
      });
    });
  });
});
