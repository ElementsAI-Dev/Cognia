/**
 * Document Management Types
 */

export type DocumentType = 'markdown' | 'code' | 'text' | 'json' | 'unknown';

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

export interface ProcessedDocument {
  id: string;
  filename: string;
  type: DocumentType;
  content: string;
  embeddableContent: string;
  metadata: DocumentMetadata;
  chunks?: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, unknown>;
}

export interface StoredDocument {
  id: string;
  filename: string;
  type: DocumentType;
  content: string;
  embeddableContent?: string;
  metadata: DocumentMetadata;
  projectId?: string;
  collectionId?: string;
  isIndexed: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  createdAt: Date;
  createdBy?: string;
}

export interface DocumentFilter {
  type?: DocumentType;
  projectId?: string;
  collectionId?: string;
  isIndexed?: boolean;
  searchQuery?: string;
}

// Markdown Parser Types
export interface MarkdownSection {
  level: number;
  title: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface MarkdownParseResult {
  title?: string;
  content: string;
  sections: MarkdownSection[];
  frontmatter?: Record<string, unknown>;
  links: { text: string; url: string }[];
  codeBlocks: { language: string; code: string }[];
  images: { alt: string; url: string }[];
}

// Code Parser Types
export interface CodeFunction {
  name: string;
  startLine: number;
  endLine: number;
  signature: string;
  docstring?: string;
}

export interface CodeClass {
  name: string;
  startLine: number;
  endLine: number;
  methods: CodeFunction[];
  docstring?: string;
}

export interface CodeImport {
  module: string;
  items?: string[];
  line: number;
}

export interface CodeParseResult {
  language: string;
  imports: CodeImport[];
  functions: CodeFunction[];
  classes: CodeClass[];
  comments: string[];
  content: string;
}
