/**
 * Element Parser Tests
 */

import {
  parseComponentToElement,
  isContainerElement,
  isSelfClosingElement,
} from './element-parser';

describe('element-parser', () => {
  describe('parseComponentToElement', () => {
    it('should parse basic div element', () => {
      const code = '<div className="p-4">Hello World</div>';
      const result = parseComponentToElement(code, null);

      expect(result.tagName).toBe('div');
      expect(result.className).toBe('p-4');
      expect(result.textContent).toBe('Hello World');
      expect(result.parentId).toBeNull();
      expect(result.id).toBeDefined();
    });

    it('should parse element with multiple classes', () => {
      const code = '<section className="flex items-center justify-between p-4">Content</section>';
      const result = parseComponentToElement(code, 'parent-123');

      expect(result.tagName).toBe('section');
      expect(result.className).toBe('flex items-center justify-between p-4');
      expect(result.parentId).toBe('parent-123');
    });

    it('should parse element with class attribute (HTML style)', () => {
      const code = '<div class="container mx-auto">Content</div>';
      const result = parseComponentToElement(code, null);

      expect(result.className).toBe('container mx-auto');
    });

    it('should parse img element with src and alt', () => {
      const code = '<img src="/image.png" alt="Test image" className="w-full" />';
      const result = parseComponentToElement(code, null);

      expect(result.tagName).toBe('img');
      expect(result.attributes.src).toBe('/image.png');
      expect(result.attributes.alt).toBe('Test image');
      expect(result.className).toBe('w-full');
    });

    it('should parse anchor element with href', () => {
      const code = '<a href="https://example.com" className="text-blue-500">Link</a>';
      const result = parseComponentToElement(code, null);

      expect(result.tagName).toBe('a');
      expect(result.attributes.href).toBe('https://example.com');
      expect(result.textContent).toBe('Link');
    });

    it('should parse input element with type and placeholder', () => {
      const code = '<input type="text" placeholder="Enter name" className="border p-2" />';
      const result = parseComponentToElement(code, null);

      expect(result.tagName).toBe('input');
      expect(result.attributes.type).toBe('text');
      expect(result.attributes.placeholder).toBe('Enter name');
    });

    it('should parse element with inline styles', () => {
      const code = '<div style={{ color: \'red\', fontSize: \'16px\' }}>Styled</div>';
      const result = parseComponentToElement(code, null);

      expect(result.styles.color).toBe('red');
      expect(result.styles.fontSize).toBe('16px');
    });

    it('should handle element without className', () => {
      const code = '<span>Just text</span>';
      const result = parseComponentToElement(code, null);

      expect(result.tagName).toBe('span');
      expect(result.className).toBe('');
      expect(result.textContent).toBe('Just text');
    });

    it('should handle self-closing tags', () => {
      const code = '<br />';
      const result = parseComponentToElement(code, null);

      expect(result.tagName).toBe('br');
      expect(result.textContent).toBeUndefined();
    });

    it('should use provided id from code if present', () => {
      const code = '<div id="custom-id" className="test">Content</div>';
      const result = parseComponentToElement(code, null);

      expect(result.id).toBe('custom-id');
    });

    it('should generate unique id when not provided', () => {
      const code = '<div className="test">Content</div>';
      const result1 = parseComponentToElement(code, null);
      const result2 = parseComponentToElement(code, null);

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toBe(result2.id);
    });

    it('should handle empty code gracefully', () => {
      const result = parseComponentToElement('', null);

      expect(result.tagName).toBe('div');
      expect(result.className).toBe('');
    });

    it('should initialize children as empty array', () => {
      const code = '<div>Parent</div>';
      const result = parseComponentToElement(code, null);

      expect(result.children).toEqual([]);
    });
  });

  describe('isContainerElement', () => {
    it('should return true for container elements', () => {
      expect(isContainerElement('div')).toBe(true);
      expect(isContainerElement('section')).toBe(true);
      expect(isContainerElement('article')).toBe(true);
      expect(isContainerElement('main')).toBe(true);
      expect(isContainerElement('header')).toBe(true);
      expect(isContainerElement('footer')).toBe(true);
      expect(isContainerElement('nav')).toBe(true);
      expect(isContainerElement('ul')).toBe(true);
      expect(isContainerElement('ol')).toBe(true);
      expect(isContainerElement('form')).toBe(true);
    });

    it('should return true for inline container elements', () => {
      expect(isContainerElement('span')).toBe(true);
      expect(isContainerElement('a')).toBe(true);
      expect(isContainerElement('button')).toBe(true);
      expect(isContainerElement('label')).toBe(true);
    });

    it('should return false for non-container elements', () => {
      expect(isContainerElement('img')).toBe(false);
      expect(isContainerElement('input')).toBe(false);
      expect(isContainerElement('br')).toBe(false);
      expect(isContainerElement('hr')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isContainerElement('DIV')).toBe(true);
      expect(isContainerElement('Section')).toBe(true);
      expect(isContainerElement('IMG')).toBe(false);
    });
  });

  describe('isSelfClosingElement', () => {
    it('should return true for self-closing elements', () => {
      expect(isSelfClosingElement('img')).toBe(true);
      expect(isSelfClosingElement('br')).toBe(true);
      expect(isSelfClosingElement('hr')).toBe(true);
      expect(isSelfClosingElement('input')).toBe(true);
      expect(isSelfClosingElement('meta')).toBe(true);
      expect(isSelfClosingElement('link')).toBe(true);
    });

    it('should return false for non-self-closing elements', () => {
      expect(isSelfClosingElement('div')).toBe(false);
      expect(isSelfClosingElement('span')).toBe(false);
      expect(isSelfClosingElement('p')).toBe(false);
      expect(isSelfClosingElement('a')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isSelfClosingElement('IMG')).toBe(true);
      expect(isSelfClosingElement('Input')).toBe(true);
      expect(isSelfClosingElement('DIV')).toBe(false);
    });
  });
});
