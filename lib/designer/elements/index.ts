/**
 * Element utilities for designer - Re-export element parsing and location functionality
 */

export {
  parseComponentToElement,
  isContainerElement,
  isSelfClosingElement,
} from './element-parser';

export {
  type PositioningMode,
  type SourceLocation,
  type VisualBounds,
  type DropPosition,
  type ElementLocation,
  type InsertionPoint,
  type ElementCodeMapping,
  type LocatorConfig,
  type OptimizedElementLocation,
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
} from './element-locator';
