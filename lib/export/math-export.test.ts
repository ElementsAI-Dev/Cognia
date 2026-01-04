/**
 * Tests for Math Export Utilities
 * @jest-environment jsdom
 */

import {
  mathToSvg,
  mathToPng,
  exportMath,
  copyMathAsImage,
  generateMathFilename,
  type MathExportOptions,
} from './math-export';

// Mock DOM APIs
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();

beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('mathToSvg', () => {
  it('should convert element to SVG string', () => {
    const element = document.createElement('div');
    element.innerHTML = '<span class="katex">x^2</span>';
    document.body.appendChild(element);

    const svg = mathToSvg(element);

    expect(svg).toContain('<?xml');
    expect(svg).toContain('<svg');
    expect(svg).toContain('foreignObject');

    document.body.removeChild(element);
  });

  it('should apply background color', () => {
    const element = document.createElement('div');
    element.innerHTML = '<span>test</span>';
    document.body.appendChild(element);

    const svg = mathToSvg(element, { backgroundColor: '#ffffff' });

    expect(svg).toContain('#ffffff');

    document.body.removeChild(element);
  });

  it('should apply padding', () => {
    const element = document.createElement('div');
    element.innerHTML = '<span>test</span>';
    document.body.appendChild(element);

    const svg = mathToSvg(element, { padding: 20 });

    expect(svg).toContain('x="20"');
    expect(svg).toContain('y="20"');

    document.body.removeChild(element);
  });
});

describe('mathToPng', () => {
  it('should reject when canvas context unavailable', async () => {
    const element = document.createElement('div');
    element.innerHTML = '<span>test</span>';
    document.body.appendChild(element);

    // Mock canvas without context
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        const canvas = originalCreateElement('canvas');
        jest.spyOn(canvas, 'getContext').mockReturnValue(null);
        return canvas;
      }
      return originalCreateElement(tag);
    });

    await expect(mathToPng(element)).rejects.toThrow('Failed to get canvas context');

    document.body.removeChild(element);
    jest.restoreAllMocks();
  });
});

describe('MathExportOptions type', () => {
  it('should accept valid options', () => {
    const options: MathExportOptions = {
      format: 'png',
      scale: 2,
      backgroundColor: '#ffffff',
      padding: 16,
    };
    expect(options.format).toBe('png');
  });

  it('should accept svg format', () => {
    const options: MathExportOptions = {
      format: 'svg',
    };
    expect(options.format).toBe('svg');
  });
});

describe('exportMath', () => {
  it('should be a function', () => {
    expect(typeof exportMath).toBe('function');
  });
});

describe('copyMathAsImage', () => {
  it('should be a function', () => {
    expect(typeof copyMathAsImage).toBe('function');
  });
});

describe('generateMathFilename', () => {
  it('should generate safe filename from LaTeX', () => {
    const filename = generateMathFilename('x^2 + y^2 = z^2');
    expect(filename).toBeDefined();
    expect(filename.length).toBeGreaterThan(0);
  });

  it('should handle special characters', () => {
    const filename = generateMathFilename('\\frac{1}{2}');
    expect(filename).not.toContain('\\');
  });

  it('should truncate long expressions', () => {
    const longExpression = 'x'.repeat(100);
    const filename = generateMathFilename(longExpression);
    expect(filename.length).toBeLessThan(50);
  });
});
