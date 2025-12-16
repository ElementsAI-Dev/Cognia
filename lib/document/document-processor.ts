/**
 * Document Processor - Unified document processing for various file types
 */

import { parseMarkdown, extractEmbeddableContent as extractMarkdownContent } from './parsers/markdown-parser';
import { parseCode, extractCodeEmbeddableContent, detectLanguage } from './parsers/code-parser';
import { chunkDocument, type ChunkingOptions, type DocumentChunk } from '@/lib/ai/chunking';

export type DocumentType = 'markdown' | 'code' | 'text' | 'json' | 'unknown';

export interface ProcessedDocument {
  id: string;
  filename: string;
  type: DocumentType;
  content: string;
  embeddableContent: string;
  metadata: DocumentMetadata;
  chunks?: DocumentChunk[];
}

export interface DocumentMetadata {
  title?: string;
  language?: string;
  size: number;
  lineCount: number;
  wordCount: number;
  createdAt?: Date;
  modifiedAt?: Date;
  tags?: string[];
  [key: string]: unknown;
}

export interface ProcessingOptions {
  extractEmbeddable?: boolean;
  generateChunks?: boolean;
  chunkingOptions?: Partial<ChunkingOptions>;
}

const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  extractEmbeddable: true,
  generateChunks: false,
};

/**
 * Detect document type from filename
 */
export function detectDocumentType(filename: string): DocumentType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const markdownExts = ['md', 'markdown', 'mdx'];
  const codeExts = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'kt', 'go', 'rs',
    'cpp', 'c', 'h', 'hpp', 'cs', 'php', 'swift', 'scala', 'r',
    'sh', 'bash', 'zsh', 'ps1', 'vue', 'svelte', 'sql',
    'yaml', 'yml', 'css', 'scss', 'less', 'html', 'xml',
  ];

  if (markdownExts.includes(ext)) return 'markdown';
  if (codeExts.includes(ext)) return 'code';
  if (ext === 'json') return 'json';
  if (ext === 'txt') return 'text';

  return 'unknown';
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Process a document based on its type
 */
export function processDocument(
  id: string,
  filename: string,
  content: string,
  options: ProcessingOptions = {}
): ProcessedDocument {
  const opts = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
  const type = detectDocumentType(filename);
  const lines = content.split('\n');

  let embeddableContent = content;
  let metadata: DocumentMetadata = {
    size: content.length,
    lineCount: lines.length,
    wordCount: countWords(content),
  };

  // Process based on type
  switch (type) {
    case 'markdown': {
      const parsed = parseMarkdown(content);
      if (opts.extractEmbeddable) {
        embeddableContent = extractMarkdownContent(content);
      }
      metadata = {
        ...metadata,
        title: parsed.title,
        language: 'markdown',
        tags: parsed.frontmatter?.tags as string[] | undefined,
      };
      break;
    }

    case 'code': {
      const parsed = parseCode(content, filename);
      if (opts.extractEmbeddable) {
        embeddableContent = extractCodeEmbeddableContent(content, filename);
      }
      metadata = {
        ...metadata,
        language: parsed.language,
        functionCount: parsed.functions.length,
        importCount: parsed.imports.length,
      };
      break;
    }

    case 'json': {
      try {
        const parsed = JSON.parse(content);
        metadata = {
          ...metadata,
          language: 'json',
          isArray: Array.isArray(parsed),
          keyCount: typeof parsed === 'object' && parsed !== null
            ? Object.keys(parsed).length
            : 0,
        };
      } catch {
        // Invalid JSON, treat as text
      }
      break;
    }

    case 'text':
    default: {
      metadata = {
        ...metadata,
        language: detectLanguage(filename),
      };
      break;
    }
  }

  const result: ProcessedDocument = {
    id,
    filename,
    type,
    content,
    embeddableContent,
    metadata,
  };

  // Generate chunks if requested
  if (opts.generateChunks) {
    const chunkResult = chunkDocument(
      embeddableContent,
      opts.chunkingOptions,
      id
    );
    result.chunks = chunkResult.chunks;
  }

  return result;
}

/**
 * Process multiple documents
 */
export function processDocuments(
  documents: { id: string; filename: string; content: string }[],
  options: ProcessingOptions = {}
): ProcessedDocument[] {
  return documents.map(doc => processDocument(doc.id, doc.filename, doc.content, options));
}

/**
 * Extract summary from document (first N characters or sentences)
 */
export function extractSummary(content: string, maxLength: number = 200): string {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Try to break at sentence boundary
  const truncated = cleaned.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclaim = truncated.lastIndexOf('!');
  
  const breakPoint = Math.max(lastPeriod, lastQuestion, lastExclaim);
  
  if (breakPoint > maxLength * 0.5) {
    return truncated.slice(0, breakPoint + 1);
  }

  // Break at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Check if file is a text-based file that can be processed
 */
export function isTextFile(filename: string): boolean {
  const textExtensions = [
    'txt', 'md', 'markdown', 'mdx',
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
    'py', 'rb', 'java', 'kt', 'go', 'rs', 'cpp', 'c', 'h', 'hpp', 'cs',
    'php', 'swift', 'scala', 'r', 'sql',
    'sh', 'bash', 'zsh', 'ps1',
    'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
    'xml', 'html', 'htm', 'css', 'scss', 'less', 'sass',
    'vue', 'svelte',
    'env', 'gitignore', 'dockerignore', 'editorconfig',
    'log', 'csv', 'tsv',
  ];

  const ext = getFileExtension(filename);
  return textExtensions.includes(ext) || ext === '';
}

/**
 * Estimate token count for content (rough approximation)
 */
export function estimateTokenCount(content: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  // Adjust for code which tends to have more tokens per character
  return Math.ceil(content.length / 4);
}
