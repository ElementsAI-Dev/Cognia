/**
 * Element Parser - Shared utility for parsing component code to DesignerElement
 * Extracted from use-designer-drag-drop.ts and designer-dnd-context.tsx to avoid duplication
 */

import { nanoid } from 'nanoid';
import type { DesignerElement } from '@/types/designer';

/**
 * Parse component code string to create a DesignerElement
 * Handles basic HTML/JSX patterns like tag names, classes, and text content
 *
 * @param code - The component code string (e.g., '<div className="p-4">Hello</div>')
 * @param parentId - The parent element ID (null for root elements)
 * @returns A new DesignerElement with a unique ID
 */
export function parseComponentToElement(
  code: string,
  parentId: string | null
): DesignerElement {
  // Extract tag name from opening tag
  const tagMatch = code.match(/<(\w+)/);
  const tagName = tagMatch?.[1]?.toLowerCase() || 'div';

  // Extract className attribute (handles both className and class)
  const classMatch = code.match(/class(?:Name)?=["']([^"']+)["']/);
  const className = classMatch?.[1] || '';

  // Extract text content between tags
  const textMatch = code.match(/>([^<]+)</);
  const textContent = textMatch?.[1]?.trim();

  // Extract id attribute if present
  const idMatch = code.match(/\bid=["']([^"']+)["']/);

  // Extract other common attributes
  const attributes: Record<string, string> = {};

  // src attribute (for img, video, etc.)
  const srcMatch = code.match(/\bsrc=["']([^"']+)["']/);
  if (srcMatch) attributes.src = srcMatch[1];

  // href attribute (for a, link, etc.)
  const hrefMatch = code.match(/\bhref=["']([^"']+)["']/);
  if (hrefMatch) attributes.href = hrefMatch[1];

  // alt attribute (for img)
  const altMatch = code.match(/\balt=["']([^"']+)["']/);
  if (altMatch) attributes.alt = altMatch[1];

  // type attribute (for input, button)
  const typeMatch = code.match(/\btype=["']([^"']+)["']/);
  if (typeMatch) attributes.type = typeMatch[1];

  // placeholder attribute (for input)
  const placeholderMatch = code.match(/\bplaceholder=["']([^"']+)["']/);
  if (placeholderMatch) attributes.placeholder = placeholderMatch[1];

  // Extract inline styles
  const styles: Record<string, string> = {};
  const styleMatch = code.match(/style=\{\{([^}]+)\}\}/);
  if (styleMatch) {
    // Parse JSX style object: { color: 'red', fontSize: '16px' }
    const styleContent = styleMatch[1];
    const stylePairs = styleContent.match(/(\w+)\s*:\s*['"]([^'"]+)['"]/g);
    if (stylePairs) {
      stylePairs.forEach((pair) => {
        const [key, value] = pair.split(':').map((s) => s.trim().replace(/['"]/g, ''));
        if (key && value) {
          styles[key] = value;
        }
      });
    }
  }

  return {
    id: idMatch?.[1] || nanoid(),
    tagName,
    className,
    textContent,
    attributes,
    styles,
    children: [],
    parentId,
  };
}

/**
 * Check if a tag is a container that can have children
 */
export function isContainerElement(tagName: string): boolean {
  const containerTags = [
    'div',
    'section',
    'article',
    'main',
    'aside',
    'header',
    'footer',
    'nav',
    'ul',
    'ol',
    'li',
    'form',
    'fieldset',
    'figure',
    'figcaption',
    'details',
    'summary',
    'dialog',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'td',
    'th',
    'span',
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'a',
    'button',
    'label',
  ];
  return containerTags.includes(tagName.toLowerCase());
}

/**
 * Check if a tag is self-closing
 */
export function isSelfClosingElement(tagName: string): boolean {
  const selfClosingTags = [
    'img',
    'br',
    'hr',
    'input',
    'meta',
    'link',
    'area',
    'base',
    'col',
    'embed',
    'source',
    'track',
    'wbr',
  ];
  return selfClosingTags.includes(tagName.toLowerCase());
}

const elementParserAPI = {
  parseComponentToElement,
  isContainerElement,
  isSelfClosingElement,
};

export default elementParserAPI;
