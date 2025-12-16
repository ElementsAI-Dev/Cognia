/**
 * Document Tool - Document operations for AI agents
 */

import { z } from 'zod';
import { processDocument, extractSummary, isTextFile } from '@/lib/document/document-processor';
import { chunkDocument } from '@/lib/ai/chunking';

export const documentReadInputSchema = z.object({
  documentId: z.string().describe('The ID of the document to read'),
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
    .enum(['fixed', 'sentence', 'paragraph'])
    .optional()
    .default('sentence')
    .describe('Chunking strategy'),
});

export const documentAnalyzeInputSchema = z.object({
  content: z.string().describe('The document content to analyze'),
  filename: z.string().describe('The filename for type detection'),
});

export type DocumentReadInput = z.infer<typeof documentReadInputSchema>;
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
 * Execute document analysis
 */
export async function executeDocumentAnalyze(
  input: DocumentAnalyzeInput
): Promise<DocumentToolResult> {
  try {
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

    return {
      success: true,
      data: {
        type: processed.type,
        metadata: processed.metadata,
        embeddableContentLength: processed.embeddableContent.length,
        preview: extractSummary(processed.content, 300),
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
      'Analyze document structure and extract metadata. Provides information about document type, size, and content.',
    parameters: documentAnalyzeInputSchema,
    execute: executeDocumentAnalyze,
    requiresApproval: false,
    category: 'file' as const,
  },
};
