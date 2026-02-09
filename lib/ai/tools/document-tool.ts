/**
 * Document Tool - Document operations for AI agents
 */

import { z } from 'zod';
import { processDocument, processDocumentAsync, extractSummary, isTextFile, detectDocumentType, isBinaryType } from '@/lib/document/document-processor';
import { extractTables } from '@/lib/document/table-extractor';
import { chunkDocument } from '@/lib/ai/embedding/chunking';
import { readTextFile, readBinaryFile, isInTauri } from '@/lib/file/file-operations';

export const documentReadFileInputSchema = z.object({
  path: z.string().describe('The absolute path to the document file to read and process'),
  extractTables: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to extract tables from the document'),
  maxSummaryLength: z
    .number()
    .min(50)
    .max(2000)
    .optional()
    .default(300)
    .describe('Maximum length of the auto-generated summary'),
});

export const documentSummarizeInputSchema = z.object({
  content: z.string().describe('The document content to summarize'),
  maxLength: z
    .number()
    .min(50)
    .max(1000)
    .optional()
    .default(200)
    .describe('Maximum length of the summary'),
});

export const documentChunkInputSchema = z.object({
  content: z.string().describe('The document content to chunk'),
  chunkSize: z
    .number()
    .min(100)
    .max(5000)
    .optional()
    .default(1000)
    .describe('Size of each chunk in characters'),
  overlap: z
    .number()
    .min(0)
    .max(500)
    .optional()
    .default(200)
    .describe('Overlap between chunks'),
  strategy: z
    .enum(['fixed', 'sentence', 'paragraph', 'heading', 'semantic', 'smart', 'recursive', 'sliding_window', 'code'])
    .optional()
    .default('semantic')
    .describe('Chunking strategy'),
});

export const documentAnalyzeInputSchema = z.object({
  content: z.string().describe('The document content to analyze'),
  filename: z.string().describe('The filename for type detection'),
});

export const documentExtractTablesInputSchema = z.object({
  content: z.string().describe('The document content to extract tables from (Markdown or HTML)'),
});

export type DocumentReadFileInput = z.infer<typeof documentReadFileInputSchema>;
export type DocumentSummarizeInput = z.infer<typeof documentSummarizeInputSchema>;
export type DocumentChunkInput = z.infer<typeof documentChunkInputSchema>;
export type DocumentAnalyzeInput = z.infer<typeof documentAnalyzeInputSchema>;

export interface DocumentToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Execute document summarization
 */
export async function executeDocumentSummarize(
  input: DocumentSummarizeInput
): Promise<DocumentToolResult> {
  try {
    const summary = extractSummary(input.content, input.maxLength);
    
    return {
      success: true,
      data: {
        summary,
        originalLength: input.content.length,
        summaryLength: summary.length,
        compressionRatio: (summary.length / input.content.length * 100).toFixed(1) + '%',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Summarization failed',
    };
  }
}

/**
 * Execute document chunking
 */
export async function executeDocumentChunk(
  input: DocumentChunkInput
): Promise<DocumentToolResult> {
  try {
    const result = chunkDocument(input.content, {
      strategy: input.strategy,
      chunkSize: input.chunkSize,
      chunkOverlap: input.overlap,
    });

    return {
      success: true,
      data: {
        chunks: result.chunks.map((c) => ({
          id: c.id,
          content: c.content,
          index: c.index,
          length: c.content.length,
        })),
        totalChunks: result.totalChunks,
        originalLength: result.originalLength,
        strategy: result.strategy,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Chunking failed',
    };
  }
}

/**
 * Execute document analysis - supports both text and binary files
 */
export async function executeDocumentAnalyze(
  input: DocumentAnalyzeInput
): Promise<DocumentToolResult> {
  try {
    const docType = detectDocumentType(input.filename);
    const isBinary = ['pdf', 'word', 'excel'].includes(docType);

    if (isBinary) {
      // For binary files, use async processor with the content as-is
      // Note: AI agents pass pre-extracted text content, so process as text
      const processed = await processDocumentAsync(
        'temp-' + Date.now(),
        input.filename,
        input.content,
        { extractEmbeddable: true }
      );

      return {
        success: true,
        data: {
          type: processed.type,
          metadata: processed.metadata,
          embeddableContentLength: processed.embeddableContent.length,
          preview: extractSummary(processed.content, 300),
          tables: extractTables(processed.content),
        },
      };
    }

    if (!isTextFile(input.filename)) {
      return {
        success: false,
        error: 'File type not supported for analysis',
      };
    }

    const processed = processDocument(
      'temp-' + Date.now(),
      input.filename,
      input.content,
      { extractEmbeddable: true }
    );

    const tableResult = extractTables(processed.content);

    return {
      success: true,
      data: {
        type: processed.type,
        metadata: processed.metadata,
        embeddableContentLength: processed.embeddableContent.length,
        preview: extractSummary(processed.content, 300),
        tables: tableResult.tableCount > 0 ? tableResult : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    };
  }
}

/**
 * Execute document read from file path — reads + processes in one step
 */
export async function executeDocumentReadFile(
  input: DocumentReadFileInput
): Promise<DocumentToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'Document file reading is only available in the desktop app',
    };
  }

  try {
    const filename = input.path.split(/[\\/]/).pop() || input.path;
    const docType = detectDocumentType(filename);
    const isBinary = isBinaryType(docType);

    let content: string;

    if (isBinary) {
      // Read binary file and process async
      const binResult = await readBinaryFile(input.path);
      if (!binResult.success || !binResult.data) {
        return { success: false, error: binResult.error || 'Failed to read binary file' };
      }
      // Convert to base64 for async processor
      const base64 = btoa(String.fromCharCode(...binResult.data));
      const processed = await processDocumentAsync(
        'file-' + Date.now(),
        filename,
        base64,
        { extractEmbeddable: true }
      );
      content = processed.content;

      return {
        success: true,
        data: {
          path: input.path,
          type: processed.type,
          metadata: processed.metadata,
          content: content.length > 50000 ? content.slice(0, 50000) + '\n... [truncated]' : content,
          summary: extractSummary(content, input.maxSummaryLength ?? 300),
          contentLength: content.length,
          tables: input.extractTables ? extractTables(content) : undefined,
        },
      };
    }

    // Text file
    if (!isTextFile(filename)) {
      return { success: false, error: `File type '${docType}' is not supported for document processing` };
    }

    const textResult = await readTextFile(input.path);
    if (!textResult.success || !textResult.content) {
      return { success: false, error: textResult.error || 'Failed to read file' };
    }

    content = textResult.content;
    const processed = processDocument(
      'file-' + Date.now(),
      filename,
      content,
      { extractEmbeddable: true }
    );

    return {
      success: true,
      data: {
        path: input.path,
        type: processed.type,
        metadata: processed.metadata,
        content: content.length > 50000 ? content.slice(0, 50000) + '\n... [truncated]' : content,
        summary: extractSummary(content, input.maxSummaryLength ?? 300),
        contentLength: content.length,
        tables: input.extractTables ? extractTables(content) : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Document read failed',
    };
  }
}

/**
 * Execute table extraction from document content
 */
export async function executeDocumentExtractTables(
  input: z.infer<typeof documentExtractTablesInputSchema>
): Promise<DocumentToolResult> {
  try {
    const result = extractTables(input.content);

    return {
      success: true,
      data: {
        tables: result.tables.map((t) => ({
          headers: t.headers,
          rows: t.rows,
          rowCount: t.rows.length,
          columnCount: t.headers.length,
        })),
        totalTables: result.tableCount,
        hasTable: result.hasTable,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Table extraction failed',
    };
  }
}

/**
 * Document tool definitions
 */
export const documentTools = {
  document_summarize: {
    name: 'document_summarize',
    description:
      'Generate a concise summary of document content. Useful for getting a quick overview of long documents.',
    parameters: documentSummarizeInputSchema,
    execute: executeDocumentSummarize,
    requiresApproval: false,
    category: 'file' as const,
  },
  document_chunk: {
    name: 'document_chunk',
    description:
      'Split document content into smaller chunks. Useful for processing large documents or preparing for embedding.',
    parameters: documentChunkInputSchema,
    execute: executeDocumentChunk,
    requiresApproval: false,
    category: 'file' as const,
  },
  document_analyze: {
    name: 'document_analyze',
    description:
      'Analyze document structure and extract metadata. Supports text, code, markdown, PDF, Word, and Excel files.',
    parameters: documentAnalyzeInputSchema,
    execute: executeDocumentAnalyze,
    requiresApproval: false,
    category: 'file' as const,
  },
  document_extract_tables: {
    name: 'document_extract_tables',
    description:
      'Extract tables from document content. Supports Markdown and HTML table formats. Returns structured table data.',
    parameters: documentExtractTablesInputSchema,
    execute: executeDocumentExtractTables,
    requiresApproval: false,
    category: 'file' as const,
  },
  document_read_file: {
    name: 'document_read_file',
    description:
      'Read a document file from the local file system and process it in one step. Supports text, code, markdown, PDF, Word, Excel, CSV, HTML, and other formats. Returns structured content with type detection, metadata, and optional summary/table extraction.',
    parameters: documentReadFileInputSchema,
    execute: executeDocumentReadFile,
    requiresApproval: false,
    category: 'file' as const,
  },
};

// ==================== System Prompt ====================

/**
 * System prompt guidance for document tools
 */
export const documentToolSystemPrompt = `## Document Tools Guide

You have access to document processing tools for analyzing, summarizing, and extracting information from documents.

### Available Operations
- **document_read_file**: Read a document file and process it in one step. Supports text, code, markdown, PDF, Word (.docx), Excel (.xlsx), CSV, HTML. Returns structured content with type detection, metadata, summary, and optional table extraction.
- **document_summarize**: Generate a concise summary from document content. Supports configurable max length.
- **document_chunk**: Split document content into smaller chunks for processing. Useful for large documents that exceed context limits.
- **document_analyze**: Analyze document structure — detects type, extracts metadata, headings, word count, language.
- **document_extract_tables**: Extract tables from Markdown or HTML content. Returns structured data with headers and rows.

### Best Practices
1. Use \`document_read_file\` when you have a file path — it combines reading and processing in one step.
2. Use \`document_summarize\` when you need a quick overview of long content.
3. Use \`document_chunk\` to break large documents into manageable pieces for analysis.
4. Use \`document_extract_tables\` when the user needs data from tables in documents.
5. For binary formats (PDF, Word, Excel), use \`document_read_file\` which handles parsing automatically.`;

/**
 * Short snippet version of document tools prompt
 */
export const documentToolPromptSnippet = `Document tools: document_read_file (read+process any file type), document_summarize, document_chunk, document_analyze, document_extract_tables. Use document_read_file for file-path-based access to PDF/Word/Excel/text files.`;
