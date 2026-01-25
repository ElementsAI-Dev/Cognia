/**
 * Knowledge Map Type Definitions
 * Types for knowledge maps, mind maps, and PDF-to-markdown conversion
 * Inspired by Windsurf's codemap format
 */

// ============================================================================
// Knowledge Map Core Types (Codemap-style)
// ============================================================================

export interface KnowledgeMapMetadata {
  cascadeId?: string;
  generationSource: 'manual' | 'ai-generated' | 'pdf-extraction' | 'paper-analysis';
  generationTimestamp: string;
  mode: 'FAST' | 'DETAILED' | 'COMPREHENSIVE';
  originalPrompt?: string;
  paperId?: string;
  pdfPath?: string;
}

export interface KnowledgeMapLocation {
  id: string;
  path?: string;
  pageNumber?: number;
  lineNumber?: number;
  lineContent?: string;
  title: string;
  description: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  highlightColor?: string;
}

export interface KnowledgeMapTrace {
  id: string;
  title: string;
  description: string;
  locations: KnowledgeMapLocation[];
  traceTextDiagram: string;
  traceGuide: string;
  relatedTraces?: string[];
  tags?: string[];
}

export interface KnowledgeMap {
  schemaVersion: number;
  id: string;
  stableId: string;
  metadata: KnowledgeMapMetadata;
  title: string;
  description: string;
  traces: KnowledgeMapTrace[];
  mermaidDiagram?: string;
  mindMapData?: MindMapData;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Mind Map Types
// ============================================================================

export type MindMapNodeType =
  | 'root'
  | 'concept'
  | 'section'
  | 'subsection'
  | 'detail'
  | 'reference'
  | 'figure'
  | 'table'
  | 'equation'
  | 'citation';

export interface MindMapNodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  shape?: 'rectangle' | 'rounded' | 'ellipse' | 'diamond' | 'hexagon';
  icon?: string;
}

export interface MindMapNode {
  id: string;
  type: MindMapNodeType;
  label: string;
  description?: string;
  children: MindMapNode[];
  style?: MindMapNodeStyle;
  collapsed?: boolean;
  position?: {
    x: number;
    y: number;
  };
  locationRef?: string;
  pageNumber?: number;
  metadata?: Record<string, unknown>;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: {
    strokeColor?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    animated?: boolean;
  };
  type?: 'default' | 'smoothstep' | 'step' | 'straight' | 'bezier';
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  rootId: string;
  layout: 'radial' | 'tree' | 'horizontal' | 'vertical' | 'force';
  theme?: MindMapTheme;
}

export interface MindMapTheme {
  name: string;
  nodeColors: Record<MindMapNodeType, string>;
  edgeColor: string;
  backgroundColor: string;
  fontFamily: string;
}

// ============================================================================
// PDF Conversion Types
// ============================================================================

export type PDFElementType =
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'table'
  | 'figure'
  | 'equation'
  | 'code'
  | 'footnote'
  | 'citation'
  | 'abstract'
  | 'title'
  | 'author'
  | 'reference';

export interface PDFBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface PDFExtractedElement {
  id: string;
  type: PDFElementType;
  content: string;
  boundingBox: PDFBoundingBox;
  confidence: number;
  metadata?: {
    fontSize?: number;
    fontName?: string;
    isBold?: boolean;
    isItalic?: boolean;
    indentation?: number;
    listLevel?: number;
    tableData?: PDFTableData;
    figureData?: PDFFigureData;
    equationData?: PDFEquationData;
  };
}

export interface PDFTableData {
  rows: number;
  columns: number;
  cells: PDFTableCell[][];
  caption?: string;
  headerRows?: number;
}

export interface PDFTableCell {
  content: string;
  rowSpan?: number;
  colSpan?: number;
  isHeader?: boolean;
}

export interface PDFFigureData {
  imageData?: string;
  imagePath?: string;
  caption?: string;
  figureNumber?: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface PDFEquationData {
  latex?: string;
  mathML?: string;
  equationNumber?: string;
  isInline: boolean;
}

export interface PDFConversionOptions {
  preserveImages: boolean;
  imageOutputDir?: string;
  imageFormat: 'png' | 'jpeg' | 'webp' | 'base64';
  extractTables: boolean;
  extractEquations: boolean;
  extractFigures: boolean;
  detectSections: boolean;
  generateKnowledgeMap: boolean;
  generateMindMap: boolean;
  ocrEnabled: boolean;
  ocrLanguage?: string;
}

export interface PDFConversionResult {
  success: boolean;
  markdown: string;
  elements: PDFExtractedElement[];
  images: PDFFigureData[];
  tables: PDFTableData[];
  equations: PDFEquationData[];
  knowledgeMap?: KnowledgeMap;
  mindMap?: MindMapData;
  metadata: PDFDocumentMetadata;
  errors?: string[];
}

export interface PDFDocumentMetadata {
  title?: string;
  authors?: string[];
  abstract?: string;
  keywords?: string[];
  pageCount: number;
  creationDate?: string;
  modificationDate?: string;
  producer?: string;
  creator?: string;
}

// ============================================================================
// Knowledge Map Annotation Types
// ============================================================================

export type KnowledgeAnnotationType =
  | 'highlight'
  | 'note'
  | 'question'
  | 'definition'
  | 'important'
  | 'todo'
  | 'link'
  | 'bookmark';

export interface KnowledgeAnnotation {
  id: string;
  knowledgeMapId: string;
  type: KnowledgeAnnotationType;
  content: string;
  locationRef: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color?: string;
  tags?: string[];
  linkedAnnotations?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface KnowledgeMapNavigationTarget {
  knowledgeMapId: string;
  traceId?: string;
  locationId?: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
  };
}

export interface KnowledgeMapNavigationHistory {
  entries: KnowledgeMapNavigationTarget[];
  currentIndex: number;
}

// ============================================================================
// Generation Request Types
// ============================================================================

export interface KnowledgeMapGenerationRequest {
  paperId?: string;
  pdfPath?: string;
  content?: string;
  title: string;
  mode: 'FAST' | 'DETAILED' | 'COMPREHENSIVE';
  options?: {
    generateMindMap: boolean;
    generateMermaid: boolean;
    extractConcepts: boolean;
    linkToReferences: boolean;
    maxTraces?: number;
    focusTopics?: string[];
  };
}

export interface MindMapGenerationRequest {
  knowledgeMapId?: string;
  content?: string;
  title: string;
  layout: 'radial' | 'tree' | 'horizontal' | 'vertical' | 'force';
  maxDepth?: number;
  theme?: string;
}

// ============================================================================
// Store State Types
// ============================================================================

export interface KnowledgeMapState {
  knowledgeMaps: Record<string, KnowledgeMap>;
  activeKnowledgeMapId: string | null;
  annotations: Record<string, KnowledgeAnnotation[]>;
  navigationHistory: KnowledgeMapNavigationHistory;
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_KNOWLEDGE_MAP_SCHEMA_VERSION = 1;

export const DEFAULT_MIND_MAP_THEME: MindMapTheme = {
  name: 'default',
  nodeColors: {
    root: '#3b82f6',
    concept: '#8b5cf6',
    section: '#10b981',
    subsection: '#14b8a6',
    detail: '#6b7280',
    reference: '#f59e0b',
    figure: '#ec4899',
    table: '#06b6d4',
    equation: '#6366f1',
    citation: '#78716c',
  },
  edgeColor: '#9ca3af',
  backgroundColor: 'transparent',
  fontFamily: 'Inter, system-ui, sans-serif',
};

export const DEFAULT_PDF_CONVERSION_OPTIONS: PDFConversionOptions = {
  preserveImages: true,
  imageFormat: 'png',
  extractTables: true,
  extractEquations: true,
  extractFigures: true,
  detectSections: true,
  generateKnowledgeMap: true,
  generateMindMap: true,
  ocrEnabled: false,
};

// ============================================================================
// Codemap File Format (for import/export compatibility)
// ============================================================================

export interface CodemapFileFormat {
  schemaVersion: number;
  id: string;
  stableId: string;
  metadata: {
    cascadeId?: string;
    generationSource: string;
    generationTimestamp: string;
    mode: string;
    originalPrompt?: string;
  };
  title: string;
  description: string;
  traces: Array<{
    id: string;
    title: string;
    description: string;
    locations: Array<{
      id: string;
      path?: string;
      lineNumber?: number;
      lineContent?: string;
      title: string;
      description: string;
    }>;
    traceTextDiagram: string;
    traceGuide: string;
  }>;
  mermaidDiagram?: string;
}

export function isValidCodemapFile(data: unknown): data is CodemapFileFormat {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.schemaVersion === 'number' &&
    typeof obj.id === 'string' &&
    typeof obj.stableId === 'string' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.traces)
  );
}

export function convertCodemapToKnowledgeMap(codemap: CodemapFileFormat): KnowledgeMap {
  return {
    schemaVersion: codemap.schemaVersion,
    id: codemap.id,
    stableId: codemap.stableId,
    metadata: {
      cascadeId: codemap.metadata.cascadeId,
      generationSource: codemap.metadata
        .generationSource as KnowledgeMapMetadata['generationSource'],
      generationTimestamp: codemap.metadata.generationTimestamp,
      mode: codemap.metadata.mode as 'FAST' | 'DETAILED' | 'COMPREHENSIVE',
      originalPrompt: codemap.metadata.originalPrompt,
    },
    title: codemap.title,
    description: codemap.description,
    traces: codemap.traces.map((trace) => ({
      id: trace.id,
      title: trace.title,
      description: trace.description,
      locations: trace.locations.map((loc) => ({
        id: loc.id,
        path: loc.path,
        lineNumber: loc.lineNumber,
        lineContent: loc.lineContent,
        title: loc.title,
        description: loc.description,
      })),
      traceTextDiagram: trace.traceTextDiagram,
      traceGuide: trace.traceGuide,
    })),
    mermaidDiagram: codemap.mermaidDiagram,
    createdAt: codemap.metadata.generationTimestamp,
    updatedAt: codemap.metadata.generationTimestamp,
  };
}

export function convertKnowledgeMapToCodemap(knowledgeMap: KnowledgeMap): CodemapFileFormat {
  return {
    schemaVersion: knowledgeMap.schemaVersion,
    id: knowledgeMap.id,
    stableId: knowledgeMap.stableId,
    metadata: {
      cascadeId: knowledgeMap.metadata.cascadeId,
      generationSource: knowledgeMap.metadata.generationSource,
      generationTimestamp: knowledgeMap.metadata.generationTimestamp,
      mode: knowledgeMap.metadata.mode,
      originalPrompt: knowledgeMap.metadata.originalPrompt,
    },
    title: knowledgeMap.title,
    description: knowledgeMap.description,
    traces: knowledgeMap.traces.map((trace) => ({
      id: trace.id,
      title: trace.title,
      description: trace.description,
      locations: trace.locations.map((loc) => ({
        id: loc.id,
        path: loc.path,
        lineNumber: loc.lineNumber,
        lineContent: loc.lineContent,
        title: loc.title,
        description: loc.description,
      })),
      traceTextDiagram: trace.traceTextDiagram,
      traceGuide: trace.traceGuide,
    })),
    mermaidDiagram: knowledgeMap.mermaidDiagram,
  };
}
