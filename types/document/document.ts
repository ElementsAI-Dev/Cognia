/**
 * Document Management Types
 */

export type DocumentType =
  | 'markdown'
  | 'code'
  | 'text'
  | 'json'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'csv'
  | 'html'
  | 'unknown';

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

// PDF Parser Types
export interface PDFParseResult {
  text: string;
  pageCount: number;
  pages: PDFPage[];
  metadata: PDFMetadata;
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

// Office Parser Types
export interface WordParseResult {
  text: string;
  html: string;
  messages: WordMessage[];
  images: WordImage[];
}

export interface WordMessage {
  type: 'warning' | 'error';
  message: string;
}

export interface WordImage {
  contentType: string;
  base64: string;
}

export interface ExcelParseResult {
  text: string;
  sheets: ExcelSheet[];
  sheetNames: string[];
}

export interface ExcelSheet {
  name: string;
  data: (string | number | boolean | null)[][];
  rowCount: number;
  columnCount: number;
}

// CSV Parser Types
export interface CSVParseResult {
  text: string;
  data: string[][];
  headers: string[];
  rowCount: number;
  columnCount: number;
  delimiter: string;
}

export interface CSVParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
  trimValues?: boolean;
}

// HTML Parser Types
export interface HTMLParseResult {
  text: string;
  title?: string;
  headings: HTMLHeading[];
  links: HTMLLink[];
  images: HTMLImage[];
  metadata: HTMLMetadata;
  tables: HTMLTable[];
}

export interface HTMLHeading {
  level: number;
  text: string;
}

export interface HTMLLink {
  text: string;
  href: string;
  isExternal: boolean;
}

export interface HTMLImage {
  src: string;
  alt: string;
  title?: string;
}

export interface HTMLMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface HTMLTable {
  headers: string[];
  rows: string[][];
  caption?: string;
}
