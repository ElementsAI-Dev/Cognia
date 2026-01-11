/**
 * PDF to Markdown Conversion Library
 * Handles extraction of text, images, tables, and equations from PDFs
 */

import { invoke } from '@tauri-apps/api/core';
import { nanoid } from 'nanoid';
import type {
  PDFConversionOptions,
  PDFConversionResult,
  PDFExtractedElement,
  PDFDocumentMetadata,
  PDFFigureData,
  PDFTableData,
  PDFEquationData,
  PDFBoundingBox,
  KnowledgeMap,
  MindMapData,
} from '@/types/learning/knowledge-map';
import { DEFAULT_PDF_CONVERSION_OPTIONS } from '@/types/learning/knowledge-map';

// ============================================================================
// PDF Extraction Functions
// ============================================================================

export async function extractPDFContent(
  pdfPath: string,
  options: Partial<PDFConversionOptions> = {}
): Promise<PDFConversionResult> {
  const mergedOptions: PDFConversionOptions = {
    ...DEFAULT_PDF_CONVERSION_OPTIONS,
    ...options,
  };

  try {
    const result = await invoke<{
      success: boolean;
      elements: PDFExtractedElement[];
      metadata: PDFDocumentMetadata;
      errors?: string[];
    }>('academic_extract_pdf_content', {
      pdfPath,
      options: {
        preserve_images: mergedOptions.preserveImages,
        image_output_dir: mergedOptions.imageOutputDir,
        image_format: mergedOptions.imageFormat,
        extract_tables: mergedOptions.extractTables,
        extract_equations: mergedOptions.extractEquations,
        extract_figures: mergedOptions.extractFigures,
        detect_sections: mergedOptions.detectSections,
        ocr_enabled: mergedOptions.ocrEnabled,
        ocr_language: mergedOptions.ocrLanguage,
      },
    });

    if (!result.success) {
      return {
        success: false,
        markdown: '',
        elements: [],
        images: [],
        tables: [],
        equations: [],
        metadata: result.metadata,
        errors: result.errors,
      };
    }

    const markdown = convertElementsToMarkdown(result.elements, mergedOptions);
    const images = extractFigures(result.elements);
    const tables = extractTables(result.elements);
    const equations = extractEquations(result.elements);

    let knowledgeMap: KnowledgeMap | undefined;
    let mindMap: MindMapData | undefined;

    if (mergedOptions.generateKnowledgeMap) {
      knowledgeMap = await generateKnowledgeMapFromElements(
        result.elements,
        result.metadata,
        pdfPath
      );
    }

    if (mergedOptions.generateMindMap && knowledgeMap) {
      mindMap = generateMindMapFromKnowledgeMap(knowledgeMap);
    }

    return {
      success: true,
      markdown,
      elements: result.elements,
      images,
      tables,
      equations,
      knowledgeMap,
      mindMap,
      metadata: result.metadata,
    };
  } catch (error) {
    return {
      success: false,
      markdown: '',
      elements: [],
      images: [],
      tables: [],
      equations: [],
      metadata: {
        pageCount: 0,
      },
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

// ============================================================================
// Markdown Conversion
// ============================================================================

function convertElementsToMarkdown(
  elements: PDFExtractedElement[],
  options: PDFConversionOptions
): string {
  const lines: string[] = [];
  let currentListLevel = 0;
  let inCodeBlock = false;

  for (const element of elements) {
    const markdown = convertElementToMarkdown(element, options, {
      currentListLevel,
      inCodeBlock,
    });

    if (markdown.listLevel !== undefined) {
      currentListLevel = markdown.listLevel;
    }
    if (markdown.inCodeBlock !== undefined) {
      inCodeBlock = markdown.inCodeBlock;
    }

    if (markdown.content) {
      lines.push(markdown.content);
    }
  }

  return lines.join('\n\n');
}

interface MarkdownConversionContext {
  currentListLevel: number;
  inCodeBlock: boolean;
}

interface MarkdownConversionResult {
  content: string;
  listLevel?: number;
  inCodeBlock?: boolean;
}

function convertElementToMarkdown(
  element: PDFExtractedElement,
  options: PDFConversionOptions,
  context: MarkdownConversionContext
): MarkdownConversionResult {
  switch (element.type) {
    case 'title':
      return { content: `# ${element.content.trim()}` };

    case 'heading':
      const level = detectHeadingLevel(element);
      return { content: `${'#'.repeat(level)} ${element.content.trim()}` };

    case 'paragraph':
    case 'text':
      return { content: element.content.trim() };

    case 'abstract':
      return {
        content: `## Abstract\n\n${element.content.trim()}`,
      };

    case 'author':
      return { content: `**Authors:** ${element.content.trim()}` };

    case 'list':
      return convertListToMarkdown(element, context.currentListLevel);

    case 'table':
      if (options.extractTables && element.metadata?.tableData) {
        return { content: convertTableToMarkdown(element.metadata.tableData) };
      }
      return { content: element.content };

    case 'figure':
      if (options.extractFigures && element.metadata?.figureData) {
        return { content: convertFigureToMarkdown(element.metadata.figureData) };
      }
      return { content: '' };

    case 'equation':
      if (options.extractEquations && element.metadata?.equationData) {
        return { content: convertEquationToMarkdown(element.metadata.equationData) };
      }
      return { content: element.content };

    case 'code':
      return {
        content: `\`\`\`\n${element.content}\n\`\`\``,
        inCodeBlock: false,
      };

    case 'footnote':
      return { content: `[^${element.id}]: ${element.content.trim()}` };

    case 'citation':
      return { content: `[${element.content.trim()}]` };

    case 'reference':
      return { content: `- ${element.content.trim()}` };

    default:
      return { content: element.content.trim() };
  }
}

function detectHeadingLevel(element: PDFExtractedElement): number {
  const fontSize = element.metadata?.fontSize || 12;
  const isBold = element.metadata?.isBold || false;

  if (fontSize >= 24 || (fontSize >= 18 && isBold)) return 1;
  if (fontSize >= 18 || (fontSize >= 14 && isBold)) return 2;
  if (fontSize >= 14 || (fontSize >= 12 && isBold)) return 3;
  if (fontSize >= 12 && isBold) return 4;
  return 5;
}

function convertListToMarkdown(
  element: PDFExtractedElement,
  _currentLevel: number
): MarkdownConversionResult {
  const listLevel = element.metadata?.listLevel || 0;
  const indent = '  '.repeat(listLevel);
  const bullet = listLevel === 0 ? '-' : '*';
  
  return {
    content: `${indent}${bullet} ${element.content.trim()}`,
    listLevel: listLevel,
  };
}

function convertTableToMarkdown(tableData: PDFTableData): string {
  if (!tableData.cells || tableData.cells.length === 0) {
    return '';
  }

  const lines: string[] = [];
  
  if (tableData.caption) {
    lines.push(`**Table:** ${tableData.caption}`);
    lines.push('');
  }

  for (let rowIndex = 0; rowIndex < tableData.cells.length; rowIndex++) {
    const row = tableData.cells[rowIndex];
    const cells = row.map(cell => cell.content.replace(/\|/g, '\\|').trim());
    lines.push(`| ${cells.join(' | ')} |`);

    if (rowIndex === (tableData.headerRows || 1) - 1) {
      const separator = row.map(() => '---');
      lines.push(`| ${separator.join(' | ')} |`);
    }
  }

  return lines.join('\n');
}

function convertFigureToMarkdown(figureData: PDFFigureData): string {
  const altText = figureData.altText || figureData.caption || 'Figure';
  const imagePath = figureData.imagePath || figureData.imageData;
  
  if (!imagePath) {
    return figureData.caption ? `**Figure ${figureData.figureNumber || ''}:** ${figureData.caption}` : '';
  }

  const lines: string[] = [];
  
  if (figureData.imageData?.startsWith('data:')) {
    lines.push(`![${altText}](${figureData.imageData})`);
  } else if (figureData.imagePath) {
    lines.push(`![${altText}](${figureData.imagePath})`);
  }

  if (figureData.caption) {
    lines.push(`*Figure ${figureData.figureNumber || ''}: ${figureData.caption}*`);
  }

  return lines.join('\n');
}

function convertEquationToMarkdown(equationData: PDFEquationData): string {
  const latex = equationData.latex || '';
  
  if (equationData.isInline) {
    return `$${latex}$`;
  }

  const lines: string[] = [];
  lines.push('$$');
  lines.push(latex);
  lines.push('$$');

  if (equationData.equationNumber) {
    lines.push(`*(${equationData.equationNumber})*`);
  }

  return lines.join('\n');
}

// ============================================================================
// Element Extraction Helpers
// ============================================================================

function extractFigures(elements: PDFExtractedElement[]): PDFFigureData[] {
  return elements
    .filter(el => el.type === 'figure' && el.metadata?.figureData)
    .map(el => el.metadata!.figureData!);
}

function extractTables(elements: PDFExtractedElement[]): PDFTableData[] {
  return elements
    .filter(el => el.type === 'table' && el.metadata?.tableData)
    .map(el => el.metadata!.tableData!);
}

function extractEquations(elements: PDFExtractedElement[]): PDFEquationData[] {
  return elements
    .filter(el => el.type === 'equation' && el.metadata?.equationData)
    .map(el => el.metadata!.equationData!);
}

// ============================================================================
// Knowledge Map Generation
// ============================================================================

async function generateKnowledgeMapFromElements(
  elements: PDFExtractedElement[],
  metadata: PDFDocumentMetadata,
  pdfPath: string
): Promise<KnowledgeMap> {
  const id = `knowledge_map_${Date.now()}`;
  const stableId = nanoid();

  const sections = groupElementsBySection(elements);
  const traces = sections.map((section, index) => ({
    id: `trace_${index + 1}`,
    title: section.title,
    description: section.description,
    locations: section.elements.map((el, locIndex) => ({
      id: `loc_${index + 1}_${locIndex + 1}`,
      pageNumber: el.boundingBox.pageNumber,
      lineContent: el.content.substring(0, 100),
      title: el.type === 'heading' ? el.content : `${el.type} content`,
      description: el.content.substring(0, 200),
      position: {
        x: el.boundingBox.x,
        y: el.boundingBox.y,
        width: el.boundingBox.width,
        height: el.boundingBox.height,
      },
    })),
    traceTextDiagram: generateTraceTextDiagram(section),
    traceGuide: generateTraceGuide(section),
  }));

  const mermaidDiagram = generateMermaidDiagram(sections);

  return {
    schemaVersion: 1,
    id,
    stableId,
    metadata: {
      generationSource: 'pdf-extraction',
      generationTimestamp: new Date().toISOString(),
      mode: 'DETAILED',
      pdfPath,
    },
    title: metadata.title || 'Extracted Knowledge Map',
    description: `Knowledge map generated from PDF with ${metadata.pageCount} pages`,
    traces,
    mermaidDiagram,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface Section {
  title: string;
  description: string;
  elements: PDFExtractedElement[];
  level: number;
}

function groupElementsBySection(elements: PDFExtractedElement[]): Section[] {
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const element of elements) {
    if (element.type === 'title' || element.type === 'heading') {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: element.content.trim(),
        description: '',
        elements: [element],
        level: detectHeadingLevel(element),
      };
    } else if (currentSection) {
      currentSection.elements.push(element);
      if (!currentSection.description && element.type === 'paragraph') {
        currentSection.description = element.content.substring(0, 200);
      }
    } else {
      currentSection = {
        title: 'Introduction',
        description: element.content.substring(0, 200),
        elements: [element],
        level: 1,
      };
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function generateTraceTextDiagram(section: Section): string {
  const lines: string[] = [];
  lines.push(`${section.title}`);
  
  for (const element of section.elements.slice(0, 5)) {
    const prefix = element.type === 'heading' ? '├── ' : '│   ├── ';
    const label = `[${element.type}] ${element.content.substring(0, 50)}...`;
    lines.push(`${prefix}${label}`);
  }

  if (section.elements.length > 5) {
    lines.push(`│   └── ... and ${section.elements.length - 5} more elements`);
  }

  return lines.join('\n');
}

function generateTraceGuide(section: Section): string {
  const elementTypes = section.elements.map(el => el.type);
  const uniqueTypes = [...new Set(elementTypes)];
  
  return `## ${section.title}

This section contains ${section.elements.length} elements including: ${uniqueTypes.join(', ')}.

${section.description}`;
}

function generateMermaidDiagram(sections: Section[]): string {
  const lines: string[] = [];
  lines.push('graph TD');

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nodeId = `S${i + 1}`;
    const label = section.title.replace(/"/g, "'").substring(0, 30);
    lines.push(`    ${nodeId}["${label}"]`);

    if (i > 0) {
      lines.push(`    S${i} --> ${nodeId}`);
    }
  }

  return lines.join('\n');
}

// ============================================================================
// Mind Map Generation
// ============================================================================

function generateMindMapFromKnowledgeMap(knowledgeMap: KnowledgeMap): MindMapData {
  const rootNode: import('@/types/learning/knowledge-map').MindMapNode = {
    id: 'root',
    type: 'root',
    label: knowledgeMap.title,
    description: knowledgeMap.description,
    children: [],
  };

  for (const trace of knowledgeMap.traces) {
    const traceNode: import('@/types/learning/knowledge-map').MindMapNode = {
      id: trace.id,
      type: 'section',
      label: trace.title,
      description: trace.description,
      children: [],
    };

    for (const location of trace.locations.slice(0, 5)) {
      const locationNode: import('@/types/learning/knowledge-map').MindMapNode = {
        id: location.id,
        type: 'detail',
        label: location.title,
        description: location.description,
        children: [],
        locationRef: location.id,
        pageNumber: location.pageNumber,
      };
      traceNode.children.push(locationNode);
    }

    rootNode.children.push(traceNode);
  }

  const edges: import('@/types/learning/knowledge-map').MindMapEdge[] = [];
  
  function createEdges(node: import('@/types/learning/knowledge-map').MindMapNode) {
    for (const child of node.children) {
      edges.push({
        id: `edge_${node.id}_${child.id}`,
        source: node.id,
        target: child.id,
      });
      createEdges(child);
    }
  }
  
  createEdges(rootNode);

  return {
    nodes: flattenNodes(rootNode),
    edges,
    rootId: 'root',
    layout: 'tree',
  };
}

function flattenNodes(node: import('@/types/learning/knowledge-map').MindMapNode): import('@/types/learning/knowledge-map').MindMapNode[] {
  const result: import('@/types/learning/knowledge-map').MindMapNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenNodes(child));
  }
  return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function parseMarkdownToElements(markdown: string): PDFExtractedElement[] {
  const elements: PDFExtractedElement[] = [];
  const lines = markdown.split('\n');
  const currentPage = 1;
  let yPosition = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const element = parseMarkdownLine(line, currentPage, yPosition);
    if (element) {
      elements.push(element);
      yPosition += 20;
    }
  }

  return elements;
}

function parseMarkdownLine(
  line: string,
  pageNumber: number,
  yPosition: number
): PDFExtractedElement | null {
  const id = nanoid();
  const boundingBox: PDFBoundingBox = {
    x: 0,
    y: yPosition,
    width: 100,
    height: 20,
    pageNumber,
  };

  if (line.startsWith('# ')) {
    return {
      id,
      type: 'heading',
      content: line.substring(2),
      boundingBox,
      confidence: 1,
      metadata: { fontSize: 24, isBold: true },
    };
  }

  if (line.startsWith('## ')) {
    return {
      id,
      type: 'heading',
      content: line.substring(3),
      boundingBox,
      confidence: 1,
      metadata: { fontSize: 18, isBold: true },
    };
  }

  if (line.startsWith('### ')) {
    return {
      id,
      type: 'heading',
      content: line.substring(4),
      boundingBox,
      confidence: 1,
      metadata: { fontSize: 14, isBold: true },
    };
  }

  if (line.startsWith('- ') || line.startsWith('* ')) {
    return {
      id,
      type: 'list',
      content: line.substring(2),
      boundingBox,
      confidence: 1,
      metadata: { listLevel: 0 },
    };
  }

  if (line.startsWith('|')) {
    return {
      id,
      type: 'table',
      content: line,
      boundingBox,
      confidence: 1,
    };
  }

  if (line.startsWith('$$') || (line.startsWith('$') && line.endsWith('$'))) {
    return {
      id,
      type: 'equation',
      content: line.replace(/\$/g, ''),
      boundingBox,
      confidence: 1,
      metadata: {
        equationData: {
          latex: line.replace(/\$/g, ''),
          isInline: !line.startsWith('$$'),
        },
      },
    };
  }

  if (line.startsWith('![')) {
    const match = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
      return {
        id,
        type: 'figure',
        content: match[1],
        boundingBox,
        confidence: 1,
        metadata: {
          figureData: {
            altText: match[1],
            imagePath: match[2],
          },
        },
      };
    }
  }

  return {
    id,
    type: 'paragraph',
    content: line,
    boundingBox,
    confidence: 1,
  };
}

export async function convertPDFToMarkdown(
  pdfPath: string,
  options?: Partial<PDFConversionOptions>
): Promise<string> {
  const result = await extractPDFContent(pdfPath, options);
  return result.markdown;
}

export async function generateKnowledgeMapFromPDF(
  pdfPath: string,
  options?: Partial<PDFConversionOptions>
): Promise<KnowledgeMap | null> {
  const result = await extractPDFContent(pdfPath, {
    ...options,
    generateKnowledgeMap: true,
  });
  return result.knowledgeMap || null;
}

export async function generateMindMapFromPDF(
  pdfPath: string,
  options?: Partial<PDFConversionOptions>
): Promise<MindMapData | null> {
  const result = await extractPDFContent(pdfPath, {
    ...options,
    generateKnowledgeMap: true,
    generateMindMap: true,
  });
  return result.mindMap || null;
}
