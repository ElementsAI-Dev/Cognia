/**
 * Academic Library exports
 * PDF conversion, knowledge map generation, and utilities
 */

export {
  extractPDFContent,
  convertPDFToMarkdown,
  generateKnowledgeMapFromPDF,
  generateMindMapFromPDF,
  parseMarkdownToElements,
} from './pdf-to-markdown';

// Integration utilities
export {
  generateKnowledgeMapFromSelection,
  generateKnowledgeMapFromPDFFile,
  generateKnowledgeMapWithAI,
  generateMindMapFromKnowledgeMap,
  generateMindMapFromContent,
  hasKnowledgeMapForSource,
  getKnowledgeMapForSource,
  createKnowledgeMapHandler,
  exportKnowledgeMapToJSON,
  importKnowledgeMapFromJSON,
} from './knowledge-map-integration';

// Re-export types for convenience
export type {
  PDFConversionOptions,
  PDFConversionResult,
  PDFExtractedElement,
  KnowledgeMap,
  KnowledgeMapTrace,
  KnowledgeMapLocation,
  MindMapData,
  MindMapNode,
  KnowledgeAnnotation,
} from '@/types/knowledge-map';
