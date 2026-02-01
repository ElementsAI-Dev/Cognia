/**
 * Element Locator - Multi-method positioning utility for Designer
 *
 * Provides accurate element positioning through combined methods:
 * - Visual: getBoundingClientRect for rough positioning
 * - AST: Babel parser for precise source code location
 * - Text: Pattern matching for fallback positioning
 *
 * Supports two modes:
 * - Rough: Fast, visual-based positioning for real-time interaction
 * - Precise: AST-based positioning for accurate code manipulation
 */

import type { DesignerElement } from '@/types/designer';
import { loggers } from '@/lib/logger';

const log = loggers.app;

// ============================================================================
// Types
// ============================================================================

/** Positioning mode for different use cases */
export type PositioningMode = 'rough' | 'precise';

/** Source location in code */
export interface SourceLocation {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  startOffset?: number;
  endOffset?: number;
}

/** Visual bounds relative to container */
export interface VisualBounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** Drop position indicator */
export type DropPosition = 'before' | 'after' | 'inside' | 'first-child' | 'last-child';

/** Complete element location combining all methods */
export interface ElementLocation {
  elementId: string;
  tagName: string;
  className?: string;
  /** Visual bounds from getBoundingClientRect */
  visual: VisualBounds | null;
  /** Source code location from AST or pattern matching */
  source: SourceLocation | null;
  /** Confidence score 0-1 indicating accuracy */
  confidence: number;
  /** Method used for positioning */
  method: 'ast' | 'visual' | 'pattern' | 'combined';
  /** Parent element ID */
  parentId: string | null;
  /** Child element IDs */
  childIds: string[];
}

/** Code insertion point with context */
export interface InsertionPoint {
  /** Line number for insertion */
  line: number;
  /** Column for insertion */
  column: number;
  /** Character offset from start of file */
  offset: number;
  /** Indentation to use */
  indentation: string;
  /** Position relative to target element */
  position: DropPosition;
  /** The target element ID */
  targetElementId: string | null;
}

/** Element-to-code mapping entry */
export interface ElementCodeMapping {
  elementId: string;
  source: SourceLocation;
  code: string;
  /** Hash of the code for change detection */
  codeHash: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface LocatorConfig {
  /** Default positioning mode */
  defaultMode: PositioningMode;
  /** Minimum confidence threshold for AST matching */
  minAstConfidence: number;
  /** Fallback to pattern matching if AST fails */
  enablePatternFallback: boolean;
  /** Cache AST parsing results */
  enableAstCache: boolean;
  /** Maximum cache entries */
  maxCacheEntries: number;
}

const DEFAULT_CONFIG: LocatorConfig = {
  defaultMode: 'rough',
  minAstConfidence: 0.8,
  enablePatternFallback: true,
  enableAstCache: true,
  maxCacheEntries: 100,
};

// ============================================================================
// Visual Positioning (Rough Mode)
// ============================================================================

/**
 * Get element bounds using getBoundingClientRect
 * Fast method for real-time interaction
 */
export function getVisualBounds(
  element: HTMLElement,
  containerRect?: DOMRect
): VisualBounds {
  const rect = element.getBoundingClientRect();
  const container = containerRect || { top: 0, left: 0, right: 0, bottom: 0 };

  return {
    top: rect.top - container.top,
    left: rect.left - container.left,
    right: container.right - rect.right,
    bottom: container.bottom - rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Get element bounds from iframe content
 * Handles cross-origin and sandbox restrictions
 */
export function getIframeElementBounds(
  iframe: HTMLIFrameElement,
  elementId: string,
  containerRect?: DOMRect
): VisualBounds | null {
  try {
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return null;

    const element = iframeDoc.querySelector(`[data-element-id="${elementId}"]`);
    if (!element) return null;

    const iframeRect = iframe.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const container = containerRect || iframeRect;

    return {
      top: iframeRect.top - container.top + elementRect.top,
      left: iframeRect.left - container.left + elementRect.left,
      right: container.right - (iframeRect.left + elementRect.right),
      bottom: container.bottom - (iframeRect.top + elementRect.bottom),
      width: elementRect.width,
      height: elementRect.height,
    };
  } catch {
    // Cross-origin or sandbox restriction
    return null;
  }
}

/**
 * Calculate drop position based on mouse coordinates
 * Uses configurable zones for different drop behaviors
 */
export function calculateDropPosition(
  mouseY: number,
  elementRect: VisualBounds,
  options: {
    /** Zone size for before/after (0-0.5) */
    edgeZone?: number;
    /** Enable first-child/last-child detection */
    enableChildPositions?: boolean;
  } = {}
): DropPosition {
  const { edgeZone = 0.25, enableChildPositions = false } = options;
  
  const relativeY = mouseY - elementRect.top;
  const height = elementRect.height;

  // Edge zones for before/after
  if (relativeY < height * edgeZone) {
    return 'before';
  }
  if (relativeY > height * (1 - edgeZone)) {
    return 'after';
  }

  // Middle zone for inside
  if (enableChildPositions) {
    // Further subdivide middle zone
    const middlePoint = height / 2;
    if (relativeY < middlePoint) {
      return 'first-child';
    }
    return 'last-child';
  }

  return 'inside';
}

/**
 * Calculate precise drop position using horizontal zones
 * Useful for horizontal layouts (flex-row, grid)
 */
export function calculateDropPositionHorizontal(
  mouseX: number,
  elementRect: VisualBounds,
  edgeZone = 0.25
): DropPosition {
  const relativeX = mouseX - elementRect.left;
  const width = elementRect.width;

  if (relativeX < width * edgeZone) {
    return 'before';
  }
  if (relativeX > width * (1 - edgeZone)) {
    return 'after';
  }
  return 'inside';
}

// ============================================================================
// Pattern-based Positioning (Fallback)
// ============================================================================

/** Pattern matching result */
interface PatternMatch {
  startIndex: number;
  endIndex: number;
  line: number;
  column: number;
  content: string;
}

/**
 * Find element location using pattern matching
 * Fallback when AST parsing is not available
 */
export function findElementByPattern(
  code: string,
  elementId: string
): PatternMatch | null {
  // Try data-element-id first
  const idPattern = new RegExp(
    `data-element-id=["']${escapeRegex(elementId)}["']`,
    'g'
  );
  let match = idPattern.exec(code);
  if (match) {
    return createPatternMatch(code, match);
  }

  // Try id attribute
  const regularIdPattern = new RegExp(
    `\\bid=["']${escapeRegex(elementId)}["']`,
    'g'
  );
  match = regularIdPattern.exec(code);
  if (match) {
    return createPatternMatch(code, match);
  }

  return null;
}

/**
 * Find element by tag and class combination
 */
export function findElementByTagAndClass(
  code: string,
  tagName: string,
  className?: string,
  occurrence = 1
): PatternMatch | null {
  let pattern: RegExp;
  if (className) {
    // Match tag with specific class
    pattern = new RegExp(
      `<${tagName}[^>]*class(?:Name)?=["'][^"']*${escapeRegex(className)}[^"']*["'][^>]*>`,
      'g'
    );
  } else {
    // Match tag without class requirement
    pattern = new RegExp(`<${tagName}[^>]*>`, 'g');
  }

  let match: RegExpExecArray | null = null;
  let count = 0;
  while ((match = pattern.exec(code)) !== null) {
    count++;
    if (count === occurrence) {
      return createPatternMatch(code, match);
    }
  }

  return null;
}

/**
 * Find closing tag for an element
 */
export function findClosingTag(
  code: string,
  tagName: string,
  startIndex: number
): PatternMatch | null {
  let depth = 1;
  const openPattern = new RegExp(`<${tagName}[^>]*>`, 'g');
  const closePattern = new RegExp(`</${tagName}>`, 'g');
  
  openPattern.lastIndex = startIndex;
  closePattern.lastIndex = startIndex;

  let openMatch = openPattern.exec(code);
  let closeMatch = closePattern.exec(code);

  while (closeMatch) {
    // Skip opens that come before this close
    while (openMatch && openMatch.index < closeMatch.index) {
      if (openMatch.index > startIndex) {
        depth++;
      }
      openMatch = openPattern.exec(code);
    }

    depth--;
    if (depth === 0) {
      return createPatternMatch(code, closeMatch);
    }

    closeMatch = closePattern.exec(code);
  }

  return null;
}

function createPatternMatch(code: string, match: RegExpExecArray): PatternMatch {
  const beforeMatch = code.slice(0, match.index);
  const lines = beforeMatch.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  return {
    startIndex: match.index,
    endIndex: match.index + match[0].length,
    line,
    column,
    content: match[0],
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// AST-based Positioning (Precise Mode)
// ============================================================================

/** AST node with location information */
interface AstNode {
  type: string;
  start: number;
  end: number;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  openingElement?: {
    name: { name?: string; type: string };
    attributes: Array<{
      type: string;
      name?: { name: string };
      value?: { value: string };
    }>;
  };
  children?: AstNode[];
}

/** Parsed AST cache entry */
interface AstCacheEntry {
  code: string;
  codeHash: string;
  ast: AstNode | null;
  timestamp: number;
}

// Simple LRU cache for AST results
const astCache = new Map<string, AstCacheEntry>();

/**
 * Parse JSX/TSX code to AST
 * Uses dynamic import to load Babel only when needed
 */
export async function parseCodeToAst(code: string): Promise<AstNode | null> {
  const codeHash = simpleHash(code);

  // Check cache
  const cached = astCache.get(codeHash);
  if (cached && cached.codeHash === codeHash) {
    return cached.ast;
  }

  try {
    // Dynamic import Babel parser
    const { parse } = await import('@babel/parser');
    
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });

    // Cache the result
    if (astCache.size >= DEFAULT_CONFIG.maxCacheEntries) {
      // Remove oldest entry
      const firstKey = astCache.keys().next().value;
      if (firstKey) astCache.delete(firstKey);
    }

    astCache.set(codeHash, {
      code,
      codeHash,
      ast: ast.program as unknown as AstNode,
      timestamp: Date.now(),
    });

    return ast.program as unknown as AstNode;
  } catch (error) {
    log.warn('ElementLocator: AST parsing failed', { error });
    return null;
  }
}

/**
 * Find JSX element by ID in AST
 */
export function findElementInAst(
  ast: AstNode,
  elementId: string,
  _code: string
): SourceLocation | null {
  const result = traverseAstForElement(ast, elementId);
  if (!result) return null;

  return {
    startLine: result.loc.start.line,
    endLine: result.loc.end.line,
    startColumn: result.loc.start.column,
    endColumn: result.loc.end.column,
    startOffset: result.start,
    endOffset: result.end,
  };
}

function traverseAstForElement(node: AstNode, elementId: string): AstNode | null {
  if (!node) return null;

  // Check if this is a JSX element with matching ID
  if (node.type === 'JSXElement' && node.openingElement) {
    const attrs = node.openingElement.attributes || [];
    for (const attr of attrs) {
      if (attr.type === 'JSXAttribute') {
        const attrName = attr.name?.name;
        const attrValue = attr.value?.value;
        
        if (
          (attrName === 'data-element-id' || attrName === 'id') &&
          attrValue === elementId
        ) {
          return node;
        }
      }
    }
  }

  // Traverse children
  if (node.children) {
    for (const child of node.children) {
      const result = traverseAstForElement(child, elementId);
      if (result) return result;
    }
  }

  // Traverse other common properties
  const traverseProps = ['body', 'declarations', 'init', 'argument', 'expression'];
  for (const prop of traverseProps) {
    const value = (node as unknown as Record<string, unknown>)[prop];
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = traverseAstForElement(item as AstNode, elementId);
        if (result) return result;
      }
    } else if (value && typeof value === 'object') {
      const result = traverseAstForElement(value as AstNode, elementId);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Build element-to-code mapping from AST
 */
export function buildElementCodeMapping(
  ast: AstNode,
  code: string
): Map<string, ElementCodeMapping> {
  const mapping = new Map<string, ElementCodeMapping>();
  traverseAstForMapping(ast, code, mapping);
  return mapping;
}

function traverseAstForMapping(
  node: AstNode,
  code: string,
  mapping: Map<string, ElementCodeMapping>
): void {
  if (!node) return;

  if (node.type === 'JSXElement' && node.openingElement) {
    const attrs = node.openingElement.attributes || [];
    let elementId: string | null = null;

    for (const attr of attrs) {
      if (attr.type === 'JSXAttribute') {
        const attrName = attr.name?.name;
        if (attrName === 'data-element-id' || attrName === 'id') {
          elementId = attr.value?.value || null;
          break;
        }
      }
    }

    if (elementId) {
      const elementCode = code.slice(node.start, node.end);
      mapping.set(elementId, {
        elementId,
        source: {
          startLine: node.loc.start.line,
          endLine: node.loc.end.line,
          startColumn: node.loc.start.column,
          endColumn: node.loc.end.column,
          startOffset: node.start,
          endOffset: node.end,
        },
        code: elementCode,
        codeHash: simpleHash(elementCode),
      });
    }
  }

  // Continue traversal
  if (node.children) {
    for (const child of node.children) {
      traverseAstForMapping(child, code, mapping);
    }
  }

  const traverseProps = ['body', 'declarations', 'init', 'argument', 'expression'];
  for (const prop of traverseProps) {
    const value = (node as unknown as Record<string, unknown>)[prop];
    if (Array.isArray(value)) {
      for (const item of value) {
        traverseAstForMapping(item as AstNode, code, mapping);
      }
    } else if (value && typeof value === 'object') {
      traverseAstForMapping(value as AstNode, code, mapping);
    }
  }
}

// ============================================================================
// Combined Positioning
// ============================================================================

/**
 * Get complete element location using combined methods
 * Automatically falls back from AST to pattern matching
 */
export async function getElementLocation(
  code: string,
  elementId: string,
  visualBounds?: VisualBounds | null,
  mode: PositioningMode = 'rough'
): Promise<ElementLocation> {
  let source: SourceLocation | null = null;
  let confidence = 0;
  let method: ElementLocation['method'] = 'visual';

  // Try AST-based positioning for precise mode
  if (mode === 'precise') {
    const ast = await parseCodeToAst(code);
    if (ast) {
      source = findElementInAst(ast, elementId, code);
      if (source) {
        confidence = 0.95;
        method = 'ast';
      }
    }
  }

  // Fallback to pattern matching
  if (!source && DEFAULT_CONFIG.enablePatternFallback) {
    const patternMatch = findElementByPattern(code, elementId);
    if (patternMatch) {
      // Find closing tag for complete range
      const tagMatch = code.slice(patternMatch.startIndex).match(/<(\w+)/);
      const tagName = tagMatch?.[1];
      
      if (tagName) {
        const closingTag = findClosingTag(code, tagName, patternMatch.startIndex);
        if (closingTag) {
          source = {
            startLine: patternMatch.line,
            endLine: closingTag.line,
            startColumn: patternMatch.column,
            endColumn: closingTag.column + closingTag.content.length,
            startOffset: patternMatch.startIndex,
            endOffset: closingTag.endIndex,
          };
          confidence = 0.7;
          method = 'pattern';
        }
      }
    }
  }

  // Combine with visual bounds if available
  if (visualBounds && source) {
    method = 'combined';
    confidence = Math.min(confidence + 0.1, 1.0);
  } else if (visualBounds && !source) {
    confidence = 0.5;
    method = 'visual';
  }

  // Extract tag name and class from code
  const tagMatch = code.match(new RegExp(`<(\\w+)[^>]*data-element-id=["']${elementId}["']`));
  const tagName = tagMatch?.[1] || 'div';
  const classMatch = code.match(new RegExp(`data-element-id=["']${elementId}["'][^>]*class(?:Name)?=["']([^"']+)["']`));
  const className = classMatch?.[1];

  return {
    elementId,
    tagName,
    className,
    visual: visualBounds || null,
    source,
    confidence,
    method,
    parentId: null, // Would need tree context to determine
    childIds: [], // Would need tree context to determine
  };
}

/**
 * Calculate insertion point for code manipulation
 */
export async function getInsertionPoint(
  code: string,
  targetElementId: string | null,
  position: DropPosition
): Promise<InsertionPoint | null> {
  if (!targetElementId) {
    // Insert at root level
    const lastClose = code.lastIndexOf('</');
    if (lastClose === -1) return null;

    const lines = code.slice(0, lastClose).split('\n');
    const lastLine = lines[lines.length - 1];
    const indentation = lastLine.match(/^(\s*)/)?.[1] || '';

    return {
      line: lines.length,
      column: lastLine.length,
      offset: lastClose,
      indentation,
      position,
      targetElementId: null,
    };
  }

  const location = await getElementLocation(code, targetElementId, null, 'precise');
  if (!location.source) return null;

  const { source } = location;
  const lines = code.split('\n');
  
  // Get indentation of target element
  const targetLine = lines[source.startLine - 1] || '';
  const baseIndent = targetLine.match(/^(\s*)/)?.[1] || '';
  const childIndent = baseIndent + '  ';

  switch (position) {
    case 'before':
      return {
        line: source.startLine,
        column: 1,
        offset: source.startOffset || 0,
        indentation: baseIndent,
        position,
        targetElementId,
      };

    case 'after':
      return {
        line: source.endLine + 1,
        column: 1,
        offset: (source.endOffset || 0) + 1,
        indentation: baseIndent,
        position,
        targetElementId,
      };

    case 'first-child':
    case 'inside': {
      // Find the end of opening tag
      const openingTagEnd = code.indexOf('>', source.startOffset || 0);
      if (openingTagEnd === -1) return null;

      const afterOpen = code.slice(0, openingTagEnd + 1);
      const openLines = afterOpen.split('\n');

      return {
        line: openLines.length,
        column: openLines[openLines.length - 1].length + 1,
        offset: openingTagEnd + 1,
        indentation: childIndent,
        position,
        targetElementId,
      };
    }

    case 'last-child': {
      // Find the closing tag
      const tagMatch = code.slice(source.startOffset).match(/<(\w+)/);
      const tagName = tagMatch?.[1];
      if (!tagName) return null;

      const closingTag = findClosingTag(code, tagName, source.startOffset || 0);
      if (!closingTag) return null;

      return {
        line: closingTag.line,
        column: closingTag.column,
        offset: closingTag.startIndex,
        indentation: childIndent,
        position,
        targetElementId,
      };
    }

    default:
      return null;
  }
}

// ============================================================================
// Model Output Optimization
// ============================================================================

/** Optimized location data for model output */
export interface OptimizedElementLocation {
  /** Short form: "el-1@L5-10" */
  ref: string;
  /** Tag name */
  tag: string;
  /** First class name only */
  cls?: string;
  /** Bounding box [top, left, width, height] */
  box?: [number, number, number, number];
  /** Source lines [start, end] */
  src?: [number, number];
  /** Confidence 0-100 */
  conf: number;
}

/**
 * Convert ElementLocation to optimized format for model output
 * Reduces token usage while preserving essential information
 */
export function optimizeForModelOutput(
  location: ElementLocation
): OptimizedElementLocation {
  const result: OptimizedElementLocation = {
    ref: location.elementId,
    tag: location.tagName,
    conf: Math.round(location.confidence * 100),
  };

  // Add source reference if available
  if (location.source) {
    result.ref = `${location.elementId}@L${location.source.startLine}-${location.source.endLine}`;
    result.src = [location.source.startLine, location.source.endLine];
  }

  // Add first class name only
  if (location.className) {
    const firstClass = location.className.split(/\s+/)[0];
    if (firstClass) result.cls = firstClass;
  }

  // Add bounding box
  if (location.visual) {
    result.box = [
      Math.round(location.visual.top),
      Math.round(location.visual.left),
      Math.round(location.visual.width),
      Math.round(location.visual.height),
    ];
  }

  return result;
}

/**
 * Batch optimize multiple locations
 */
export function optimizeLocationsForModel(
  locations: ElementLocation[]
): OptimizedElementLocation[] {
  return locations.map(optimizeForModelOutput);
}

/**
 * Generate compact element tree for model context
 * Uses minimal format: "div.container[L1-50] > p.text[L5] + img[L10]"
 */
export function generateCompactTree(
  elements: DesignerElement[],
  maxDepth = 3
): string {
  const lines: string[] = [];

  function formatElement(el: DesignerElement, depth: number, prefix: string): void {
    if (depth > maxDepth) return;

    const tag = el.tagName;
    const cls = el.className?.split(/\s+/)[0];
    const srcRange = el.sourceRange
      ? `[L${el.sourceRange.startLine}-${el.sourceRange.endLine}]`
      : '';
    
    const name = cls ? `${tag}.${cls}${srcRange}` : `${tag}${srcRange}`;
    lines.push(`${prefix}${name}`);

    el.children.forEach((child, i) => {
      const isLast = i === el.children.length - 1;
      const childPrefix = prefix.replace(/├─/g, '│ ').replace(/└─/g, '  ');
      formatElement(child, depth + 1, childPrefix + (isLast ? '└─' : '├─'));
    });
  }

  elements.forEach((el) => formatElement(el, 0, ''));
  return lines.join('\n');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple string hash for caching
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Clear AST cache
 */
export function clearAstCache(): void {
  astCache.clear();
}

/**
 * Get cache statistics
 */
export function getAstCacheStats(): { size: number; maxSize: number } {
  return {
    size: astCache.size,
    maxSize: DEFAULT_CONFIG.maxCacheEntries,
  };
}

// ============================================================================
// Exports
// ============================================================================

const elementLocatorAPI = {
  // Visual positioning
  getVisualBounds,
  getIframeElementBounds,
  calculateDropPosition,
  calculateDropPositionHorizontal,
  
  // Pattern matching
  findElementByPattern,
  findElementByTagAndClass,
  findClosingTag,
  
  // AST positioning
  parseCodeToAst,
  findElementInAst,
  buildElementCodeMapping,
  
  // Combined
  getElementLocation,
  getInsertionPoint,
  
  // Model output
  optimizeForModelOutput,
  optimizeLocationsForModel,
  generateCompactTree,
  
  // Utilities
  clearAstCache,
  getAstCacheStats,
};

export default elementLocatorAPI;
