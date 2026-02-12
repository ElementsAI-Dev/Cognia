/**
 * Tests for preview utility functions
 */

import { escapeHtml, getReactShellHtml, renderHTML, renderSVG } from './preview-utils';

// Mock DOMPurify for renderHTML/renderSVG tests
jest.mock('dompurify', () => ({
  sanitize: jest.fn((input: string) => input),
}));

describe('escapeHtml', () => {
  it('should escape ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should escape less-than signs', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('should escape greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('should escape all special characters together', () => {
    expect(escapeHtml('<a href="test">&</a>')).toBe(
      '&lt;a href=&quot;test&quot;&gt;&amp;&lt;/a&gt;'
    );
  });

  it('should return empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should not modify text without special characters', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });
});

describe('renderHTML', () => {
  it('should call doc.open, doc.write, doc.close', () => {
    const doc = {
      open: jest.fn(),
      write: jest.fn(),
      close: jest.fn(),
    };
    renderHTML(doc as unknown as Document, '<p>Hello</p>');
    expect(doc.open).toHaveBeenCalled();
    expect(doc.write).toHaveBeenCalledWith(expect.stringContaining('<p>Hello</p>'));
    expect(doc.close).toHaveBeenCalled();
  });
});

describe('renderSVG', () => {
  it('should call doc.open, doc.write with SVG wrapper, doc.close', () => {
    const doc = {
      open: jest.fn(),
      write: jest.fn(),
      close: jest.fn(),
    };
    renderSVG(doc as unknown as Document, '<svg><circle r="10"/></svg>');
    expect(doc.open).toHaveBeenCalled();
    expect(doc.write).toHaveBeenCalledWith(expect.stringContaining('<svg><circle r="10"/></svg>'));
    expect(doc.write).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'));
    expect(doc.close).toHaveBeenCalled();
  });
});

describe('getReactShellHtml', () => {
  it('should return a string containing DOCTYPE html', () => {
    const html = getReactShellHtml();
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('should contain React 19 CDN references', () => {
    const html = getReactShellHtml();
    expect(html).toContain('react@19');
    expect(html).toContain('react-dom@19');
  });

  it('should contain Babel standalone', () => {
    const html = getReactShellHtml();
    expect(html).toContain('@babel/standalone');
  });

  it('should contain Tailwind CDN', () => {
    const html = getReactShellHtml();
    expect(html).toContain('tailwindcss.com');
  });

  it('should contain CSP meta tag', () => {
    const html = getReactShellHtml();
    expect(html).toContain('Content-Security-Policy');
  });

  it('should contain postMessage listener for render-component', () => {
    const html = getReactShellHtml();
    expect(html).toContain('render-component');
    expect(html).toContain('postMessage');
  });

  it('should contain root div', () => {
    const html = getReactShellHtml();
    expect(html).toContain('id="root"');
  });
});
