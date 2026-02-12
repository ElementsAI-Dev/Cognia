/**
 * Tests for theme editor constants and utilities
 */

import { COLOR_FIELDS, SAMPLE_CODE, generatePreviewStyles, generateHighlightedCode } from './theme-editor-constants';

describe('COLOR_FIELDS', () => {
  it('should have 17 color field entries', () => {
    expect(COLOR_FIELDS).toHaveLength(17);
  });

  it('should have required properties on each entry', () => {
    for (const field of COLOR_FIELDS) {
      expect(field).toHaveProperty('key');
      expect(field).toHaveProperty('labelKey');
      expect(field).toHaveProperty('descKey');
      expect(typeof field.key).toBe('string');
      expect(typeof field.labelKey).toBe('string');
      expect(typeof field.descKey).toBe('string');
    }
  });

  it('should include essential color keys', () => {
    const keys = COLOR_FIELDS.map((f) => f.key);
    expect(keys).toContain('background');
    expect(keys).toContain('foreground');
    expect(keys).toContain('keyword');
    expect(keys).toContain('string');
    expect(keys).toContain('comment');
    expect(keys).toContain('function');
  });
});

describe('SAMPLE_CODE', () => {
  it('should be a non-empty string', () => {
    expect(typeof SAMPLE_CODE).toBe('string');
    expect(SAMPLE_CODE.length).toBeGreaterThan(0);
  });

  it('should contain JavaScript syntax elements', () => {
    expect(SAMPLE_CODE).toContain('function');
    expect(SAMPLE_CODE).toContain('const');
    expect(SAMPLE_CODE).toContain('return');
    expect(SAMPLE_CODE).toContain('//');
  });
});

describe('generatePreviewStyles', () => {
  const mockColors = {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    comment: '#6a9955',
    keyword: '#569cd6',
    string: '#ce9178',
    number: '#b5cea8',
    function: '#dcdcaa',
    operator: '#d4d4d4',
    property: '#9cdcfe',
    className: '#4ec9b0',
    constant: '#4fc1ff',
    tag: '#569cd6',
    attrName: '#9cdcfe',
    attrValue: '#ce9178',
    punctuation: '#d4d4d4',
    selection: '#264f78',
    lineHighlight: '#2a2d2e',
  };

  it('should return a string containing CSS rules', () => {
    const result = generatePreviewStyles(mockColors);
    expect(typeof result).toBe('string');
    expect(result).toContain('.preview-code');
  });

  it('should include background and foreground colors', () => {
    const result = generatePreviewStyles(mockColors);
    expect(result).toContain(mockColors.background);
    expect(result).toContain(mockColors.foreground);
  });

  it('should include syntax highlight classes', () => {
    const result = generatePreviewStyles(mockColors);
    expect(result).toContain('.comment');
    expect(result).toContain('.keyword');
    expect(result).toContain('.string');
    expect(result).toContain('.number');
    expect(result).toContain('.function');
    expect(result).toContain('.operator');
    expect(result).toContain('.punctuation');
  });

  it('should use the provided color values', () => {
    const result = generatePreviewStyles(mockColors);
    expect(result).toContain(mockColors.comment);
    expect(result).toContain(mockColors.keyword);
    expect(result).toContain(mockColors.string);
  });
});

describe('generateHighlightedCode', () => {
  it('should wrap comments in span tags', () => {
    const result = generateHighlightedCode('// hello');
    expect(result).toContain('comment');
    expect(result).toContain('// hello');
  });

  it('should wrap keywords in span tags', () => {
    const result = generateHighlightedCode('function foo() {}');
    expect(result).toContain('keyword');
    expect(result).toContain('function');
  });

  it('should wrap strings in span tags', () => {
    const result = generateHighlightedCode('const x = "hello"');
    expect(result).toContain('<span class="string">');
  });

  it('should wrap numbers in span tags', () => {
    const result = generateHighlightedCode('const x = 42');
    expect(result).toContain('<span class="number">42</span>');
  });

  it('should wrap function calls in span tags', () => {
    const result = generateHighlightedCode('console.log(x)');
    expect(result).toContain('<span class="function">');
  });

  it('should handle empty string', () => {
    const result = generateHighlightedCode('');
    expect(result).toBe('');
  });
});
