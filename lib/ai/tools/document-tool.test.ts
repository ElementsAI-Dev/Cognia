/**
 * Tests for Document Tool
 */

import {
  executeDocumentSummarize,
  executeDocumentChunk,
  executeDocumentAnalyze,
  documentTools,
  documentReadInputSchema,
  documentSummarizeInputSchema,
  documentChunkInputSchema,
  documentAnalyzeInputSchema,
  type DocumentSummarizeInput,
  type DocumentChunkInput,
  type DocumentAnalyzeInput,
} from './document-tool';

// Mock dependencies
import * as documentProcessorModule from '@/lib/document/document-processor';
import * as chunkingModule from '@/lib/ai/embedding/chunking';

jest.mock('@/lib/document/document-processor', () => ({
  processDocument: jest.fn((id, filename, content) => ({
    id,
    type: 'text',
    content,
    embeddableContent: content,
    metadata: {
      wordCount: content.split(/\s+/).length,
      characterCount: content.length,
    },
  })),
  extractSummary: jest.fn((content, maxLength) => {
    return content.slice(0, maxLength || 200);
  }),
  isTextFile: jest.fn((filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['txt', 'md', 'json', 'ts', 'js'].includes(ext || '');
  }),
}));

jest.mock('@/lib/ai/embedding/chunking', () => ({
  chunkDocument: jest.fn((content, options) => ({
    chunks: [
      {
        id: 'chunk-0',
        content: content.slice(0, options?.chunkSize || 1000),
        index: 0,
        startOffset: 0,
        endOffset: Math.min(content.length, options?.chunkSize || 1000),
      },
    ],
    totalChunks: 1,
    originalLength: content.length,
    strategy: options?.strategy || 'sentence',
  })),
}));

describe('executeDocumentSummarize', () => {
  it('summarizes document content', async () => {
    const input: DocumentSummarizeInput = {
      content: 'This is a long document that needs to be summarized. It contains many sentences and paragraphs.',
      maxLength: 50,
    };

    const result = await executeDocumentSummarize(input);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as { summary: string }).summary).toBeDefined();
  });

  it('includes compression ratio in result', async () => {
    const input: DocumentSummarizeInput = {
      content: 'A'.repeat(1000),
      maxLength: 100,
    };

    const result = await executeDocumentSummarize(input);

    expect(result.success).toBe(true);
    const data = result.data as {
      originalLength: number;
      summaryLength: number;
      compressionRatio: string;
    };
    expect(data.originalLength).toBe(1000);
    expect(data.compressionRatio).toBeDefined();
  });

  it('uses default maxLength', async () => {
    const input: DocumentSummarizeInput = {
      content: 'Short content',
      maxLength: 200,
    };

    const result = await executeDocumentSummarize(input);

    expect(result.success).toBe(true);
  });

  it('handles errors gracefully', async () => {
    const mockExtractSummary = documentProcessorModule.extractSummary as jest.Mock;
    mockExtractSummary.mockImplementationOnce(() => {
      throw new Error('Summarization error');
    });

    const input: DocumentSummarizeInput = {
      content: 'Content',
      maxLength: 200,
    };

    const result = await executeDocumentSummarize(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Summarization error');
  });
});

describe('executeDocumentChunk', () => {
  it('chunks document content', async () => {
    const input: DocumentChunkInput = {
      content: 'This is content that will be chunked into smaller pieces.',
      chunkSize: 500,
      overlap: 100,
      strategy: 'sentence',
    };

    const result = await executeDocumentChunk(input);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    const data = result.data as { chunks: unknown[]; totalChunks: number };
    expect(data.chunks).toBeDefined();
    expect(data.totalChunks).toBeGreaterThan(0);
  });

  it('uses default options', async () => {
    const input: DocumentChunkInput = {
      content: 'Simple content',
      chunkSize: 1000,
      overlap: 200,
      strategy: 'sentence',
    };

    const result = await executeDocumentChunk(input);

    expect(result.success).toBe(true);
  });

  it('includes strategy in result', async () => {
    const input: DocumentChunkInput = {
      content: 'Content to chunk',
      chunkSize: 1000,
      overlap: 200,
      strategy: 'paragraph',
    };

    const result = await executeDocumentChunk(input);

    expect(result.success).toBe(true);
    const data = result.data as { strategy: string };
    expect(data.strategy).toBeDefined();
  });

  it('handles errors gracefully', async () => {
    const mockChunkDocument = chunkingModule.chunkDocument as jest.Mock;
    mockChunkDocument.mockImplementationOnce(() => {
      throw new Error('Chunking error');
    });

    const input: DocumentChunkInput = {
      content: 'Content',
      chunkSize: 1000,
      overlap: 200,
      strategy: 'sentence',
    };

    const result = await executeDocumentChunk(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Chunking error');
  });
});

describe('executeDocumentAnalyze', () => {
  it('analyzes document content', async () => {
    const input: DocumentAnalyzeInput = {
      content: 'Document content to analyze',
      filename: 'test.txt',
    };

    const result = await executeDocumentAnalyze(input);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    const data = result.data as { type: string; metadata: unknown };
    expect(data.type).toBeDefined();
    expect(data.metadata).toBeDefined();
  });

  it('rejects unsupported file types', async () => {
    const input: DocumentAnalyzeInput = {
      content: 'Binary content',
      filename: 'file.exe',
    };

    const result = await executeDocumentAnalyze(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File type not supported for analysis');
  });

  it('includes preview in result', async () => {
    const input: DocumentAnalyzeInput = {
      content: 'Long document content that should have a preview generated.',
      filename: 'document.md',
    };

    const result = await executeDocumentAnalyze(input);

    expect(result.success).toBe(true);
    const data = result.data as { preview: string };
    expect(data.preview).toBeDefined();
  });

  it('handles errors gracefully', async () => {
    const mockProcessDocument = documentProcessorModule.processDocument as jest.Mock;
    mockProcessDocument.mockImplementationOnce(() => {
      throw new Error('Analysis error');
    });

    const input: DocumentAnalyzeInput = {
      content: 'Content',
      filename: 'test.txt',
    };

    const result = await executeDocumentAnalyze(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Analysis error');
  });
});

describe('Schema validation', () => {
  describe('documentReadInputSchema', () => {
    it('validates valid input', () => {
      const result = documentReadInputSchema.safeParse({
        documentId: 'doc-123',
      });

      expect(result.success).toBe(true);
    });

    it('rejects missing documentId', () => {
      const result = documentReadInputSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe('documentSummarizeInputSchema', () => {
    it('validates valid input', () => {
      const result = documentSummarizeInputSchema.safeParse({
        content: 'Test content',
        maxLength: 100,
      });

      expect(result.success).toBe(true);
    });

    it('uses default maxLength', () => {
      const result = documentSummarizeInputSchema.safeParse({
        content: 'Test content',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxLength).toBe(200);
      }
    });

    it('rejects maxLength below minimum', () => {
      const result = documentSummarizeInputSchema.safeParse({
        content: 'Test',
        maxLength: 10,
      });

      expect(result.success).toBe(false);
    });

    it('rejects maxLength above maximum', () => {
      const result = documentSummarizeInputSchema.safeParse({
        content: 'Test',
        maxLength: 2000,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('documentChunkInputSchema', () => {
    it('validates valid input', () => {
      const result = documentChunkInputSchema.safeParse({
        content: 'Test content',
        chunkSize: 500,
        overlap: 100,
        strategy: 'sentence',
      });

      expect(result.success).toBe(true);
    });

    it('uses default values', () => {
      const result = documentChunkInputSchema.safeParse({
        content: 'Test content',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.chunkSize).toBe(1000);
        expect(result.data.overlap).toBe(200);
        expect(result.data.strategy).toBe('semantic');
      }
    });

    it('validates strategy enum', () => {
      const validStrategies = ['fixed', 'sentence', 'paragraph', 'heading', 'semantic', 'smart', 'recursive', 'sliding_window', 'code'];

      for (const strategy of validStrategies) {
        const result = documentChunkInputSchema.safeParse({
          content: 'Test',
          strategy,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid strategy', () => {
      const result = documentChunkInputSchema.safeParse({
        content: 'Test',
        strategy: 'invalid',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('documentAnalyzeInputSchema', () => {
    it('validates valid input', () => {
      const result = documentAnalyzeInputSchema.safeParse({
        content: 'Test content',
        filename: 'test.txt',
      });

      expect(result.success).toBe(true);
    });

    it('requires both content and filename', () => {
      const result1 = documentAnalyzeInputSchema.safeParse({
        content: 'Test',
      });
      expect(result1.success).toBe(false);

      const result2 = documentAnalyzeInputSchema.safeParse({
        filename: 'test.txt',
      });
      expect(result2.success).toBe(false);
    });
  });
});

describe('documentTools', () => {
  it('exports document_summarize tool', () => {
    expect(documentTools.document_summarize).toBeDefined();
    expect(documentTools.document_summarize.name).toBe('document_summarize');
    expect(documentTools.document_summarize.description).toBeTruthy();
    expect(documentTools.document_summarize.execute).toBe(executeDocumentSummarize);
    expect(documentTools.document_summarize.category).toBe('file');
  });

  it('exports document_chunk tool', () => {
    expect(documentTools.document_chunk).toBeDefined();
    expect(documentTools.document_chunk.name).toBe('document_chunk');
    expect(documentTools.document_chunk.description).toBeTruthy();
    expect(documentTools.document_chunk.execute).toBe(executeDocumentChunk);
    expect(documentTools.document_chunk.category).toBe('file');
  });

  it('exports document_analyze tool', () => {
    expect(documentTools.document_analyze).toBeDefined();
    expect(documentTools.document_analyze.name).toBe('document_analyze');
    expect(documentTools.document_analyze.description).toBeTruthy();
    expect(documentTools.document_analyze.execute).toBe(executeDocumentAnalyze);
    expect(documentTools.document_analyze.category).toBe('file');
  });

  it('all tools do not require approval', () => {
    expect(documentTools.document_summarize.requiresApproval).toBe(false);
    expect(documentTools.document_chunk.requiresApproval).toBe(false);
    expect(documentTools.document_analyze.requiresApproval).toBe(false);
  });
});
