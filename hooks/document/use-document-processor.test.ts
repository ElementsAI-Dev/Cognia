/**
 * Tests for useDocumentProcessor hook
 */

import { renderHook, act } from '@testing-library/react';
import { useDocumentProcessor } from './use-document-processor';
import { processDocument, processDocumentAsync } from '@/lib/document/document-processor';

// Polyfill Blob.text() and Blob.arrayBuffer() for JSDOM
if (!Blob.prototype.text) {
  Blob.prototype.text = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock document processor
jest.mock('@/lib/document/document-processor', () => ({
  processDocument: jest.fn((id, filename, content) => ({
    id,
    filename,
    type: 'text',
    content,
    embeddableContent: content,
    metadata: {
      size: content.length,
      lineCount: content.split('\n').length,
      wordCount: content.split(/\s+/).length,
    },
    chunks: [],
  })),
  processDocumentAsync: jest.fn(async (id, filename, data) => {
    const content = typeof data === 'string' ? data : 'binary content';
    return {
      id,
      filename,
      type: filename.endsWith('.pdf') ? 'pdf' : 'text',
      content,
      embeddableContent: content,
      metadata: {
        size: content.length,
        lineCount: content.split('\n').length,
        wordCount: content.split(/\s+/).length,
      },
      chunks: [],
    };
  }),
  processDocuments: jest.fn((docs: Array<{ id: string; filename: string; content: string }>, _options?: unknown) =>
    docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      type: 'text',
      content: d.content,
      embeddableContent: d.content,
      metadata: {
        size: d.content.length,
        lineCount: d.content.split('\n').length,
        wordCount: d.content.split(/\s+/).length,
      },
      chunks: [],
    }))
  ),
  detectDocumentType: jest.fn((filename: string) => {
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.pdf')) return 'pdf';
    if (filename.endsWith('.docx')) return 'word';
    if (filename.endsWith('.xlsx')) return 'excel';
    if (filename.endsWith('.ts')) return 'code';
    return 'text';
  }),
  extractSummary: jest.fn((content: string, maxLength?: number) =>
    content.slice(0, maxLength || 200)
  ),
  isTextFile: jest.fn((filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return !['pdf', 'docx', 'xlsx'].includes(ext);
  }),
  estimateTokenCount: jest.fn((content: string) => Math.ceil(content.length / 4)),
  validateFile: jest.fn((_filename: string, size: number, options?: { maxSize?: number }) => {
    const maxSize = options?.maxSize || 50 * 1024 * 1024;
    if (size > maxSize) {
      return { valid: false, errors: ['File too large'] };
    }
    return { valid: true, errors: [] };
  }),
  isBinaryType: jest.fn((type: string) => ['pdf', 'word', 'excel'].includes(type)),
  compareDocuments: jest.fn(
    (docA: { content: string; metadata: { size: number } }, docB: { content: string; metadata: { size: number } }) => ({
      added: docB.content.length > docA.content.length ? docB.content.length - docA.content.length : 0,
      removed: docA.content.length > docB.content.length ? docA.content.length - docB.content.length : 0,
      unchanged: Math.min(docA.content.length, docB.content.length),
      similarity: docA.content === docB.content ? 1 : 0.5,
      metadataChanges: {
        size: { from: docA.metadata.size, to: docB.metadata.size },
      },
    })
  ),
  detectEncoding: jest.fn((_buffer: ArrayBuffer) => 'utf-8'),
}));

// Mock table extractor
jest.mock('@/lib/document/table-extractor', () => ({
  extractTables: jest.fn(() => ({
    tables: [],
    hasTable: false,
    tableCount: 0,
  })),
}));

// Mock document store
jest.mock('@/stores/document', () => ({
  useDocumentStore: jest.fn((selector) =>
    selector({
      addDocument: jest.fn(() => ({ id: 'test-id' })),
      saveVersion: jest.fn(),
      getVersions: jest.fn(() => []),
      restoreVersion: jest.fn(),
      selectDocument: jest.fn(),
      getSelectedDocument: jest.fn(() => null),
      searchDocuments: jest.fn(() => []),
      setLoading: jest.fn(),
      setError: jest.fn(),
    })
  ),
}));



describe('useDocumentProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset processDocumentAsync to default working implementation
    jest.mocked(processDocumentAsync).mockImplementation(async (id, filename, data) => {
      const content = typeof data === 'string' ? data : 'binary content';
      return {
        id,
        filename,
        type: filename.endsWith('.pdf') ? 'pdf' : 'text',
        content,
        embeddableContent: content,
        metadata: {
          size: content.length,
          lineCount: content.split('\n').length,
          wordCount: content.split(/\s+/).length,
        },
        chunks: [],
      };
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.currentFile).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.results).toEqual([]);
      expect(result.current.totalFiles).toBe(0);
      expect(result.current.completedFiles).toBe(0);
    });
  });

  describe('processTextFile', () => {
    it('should process a text file', async () => {
      const { result } = renderHook(() => useDocumentProcessor());

      let processed;
      await act(async () => {
        processed = await result.current.processTextFile('test.txt', 'Hello World');
      });

      expect(processed).toBeTruthy();
      expect(processed!.filename).toBe('test.txt');
      expect(processed!.content).toBe('Hello World');
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.results).toHaveLength(1);
    });

    it('should set error on failure', async () => {
      jest.mocked(processDocument).mockImplementationOnce(() => {
        throw new Error('Parse error');
      });

      const { result } = renderHook(() => useDocumentProcessor());

      let processed;
      await act(async () => {
        processed = await result.current.processTextFile('bad.txt', 'bad content');
      });

      expect(processed).toBeNull();
      expect(result.current.error).toBe('Parse error');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('processFile', () => {
    it('should call processDocumentAsync for text File', async () => {
      const file = new File(['Hello World'], 'test.txt', { type: 'text/plain' });

      const { result } = renderHook(() => useDocumentProcessor());

      await act(async () => {
        await result.current.processFile(file);
      });

      // Verify processDocumentAsync was called with correct filename
      expect(processDocumentAsync).toHaveBeenCalledWith(
        expect.any(String),
        'test.txt',
        expect.anything(),
        expect.objectContaining({ extractEmbeddable: true })
      );
      expect(result.current.isProcessing).toBe(false);
    });

    it('should call processDocumentAsync for binary File (PDF)', async () => {
      const file = new File([new Uint8Array(10)], 'test.pdf', { type: 'application/pdf' });

      const { result } = renderHook(() => useDocumentProcessor());

      await act(async () => {
        await result.current.processFile(file);
      });

      expect(processDocumentAsync).toHaveBeenCalledWith(
        expect.any(String),
        'test.pdf',
        expect.anything(),
        expect.objectContaining({ extractEmbeddable: true })
      );
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('processFiles (batch)', () => {
    it('should process multiple files', async () => {
      const files = [
        new File(['File 1'], 'a.txt', { type: 'text/plain' }),
        new File(['File 2'], 'b.txt', { type: 'text/plain' }),
        new File(['File 3'], 'c.txt', { type: 'text/plain' }),
      ];

      const { result } = renderHook(() => useDocumentProcessor());

      let results: unknown[];
      await act(async () => {
        results = await result.current.processFiles(files);
      });

      expect(processDocumentAsync).toHaveBeenCalledTimes(3);
      expect(results!).toHaveLength(3);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(result.current.completedFiles).toBe(3);
    });

    it('should call onProgress callback', async () => {
      const files = [
        new File(['File 1'], 'a.txt', { type: 'text/plain' }),
        new File(['File 2'], 'b.txt', { type: 'text/plain' }),
      ];
      const onProgress = jest.fn();

      const { result } = renderHook(() => useDocumentProcessor());

      await act(async () => {
        await result.current.processFiles(files, { onProgress });
      });

      expect(onProgress).toHaveBeenCalledWith(0, 2, 'a.txt');
      expect(onProgress).toHaveBeenCalledWith(1, 2, 'b.txt');
      expect(onProgress).toHaveBeenCalledWith(2, 2, '');
    });

    it('should continue on error by default', async () => {
      jest.mocked(processDocumentAsync)
        .mockResolvedValueOnce({
          id: '1', filename: 'a.txt', type: 'text',
          content: 'ok', embeddableContent: 'ok',
          metadata: { size: 2, lineCount: 1, wordCount: 1 }, chunks: [],
        })
        .mockRejectedValueOnce(new Error('Bad file'))
        .mockResolvedValueOnce({
          id: '3', filename: 'c.txt', type: 'text',
          content: 'ok', embeddableContent: 'ok',
          metadata: { size: 2, lineCount: 1, wordCount: 1 }, chunks: [],
        });

      const files = [
        new File(['ok'], 'a.txt', { type: 'text/plain' }),
        new File(['bad'], 'b.txt', { type: 'text/plain' }),
        new File(['ok'], 'c.txt', { type: 'text/plain' }),
      ];

      const { result } = renderHook(() => useDocumentProcessor());

      let results: unknown[];
      await act(async () => {
        results = await result.current.processFiles(files, { continueOnError: true });
      });

      // Should have 2 successful results (skipped the failed one)
      expect(results!).toHaveLength(2);
    });
  });

  describe('utilities', () => {
    it('should detect document type', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      expect(result.current.detectType('readme.md')).toBe('markdown');
      expect(result.current.detectType('test.pdf')).toBe('pdf');
      expect(result.current.detectType('doc.docx')).toBe('word');
      expect(result.current.detectType('data.xlsx')).toBe('excel');
      expect(result.current.detectType('file.txt')).toBe('text');
    });

    it('should check if file is processable', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      expect(result.current.isProcessable('test.txt')).toBe(true);
      expect(result.current.isProcessable('readme.md')).toBe(true);
      expect(result.current.isProcessable('report.pdf')).toBe(true);
      expect(result.current.isProcessable('doc.docx')).toBe(true);
      expect(result.current.isProcessable('data.xlsx')).toBe(true);
    });

    it('should summarize content', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const summary = result.current.summarize('Hello World Test Content', 10);
      expect(summary).toBe('Hello Worl');
    });

    it('should estimate token count', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const tokens = result.current.estimateTokens('Hello World');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should extract tables', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const tableResult = result.current.extractDocumentTables('| A | B |\n|---|---|\n| 1 | 2 |');
      expect(tableResult).toBeDefined();
      expect(tableResult.tableCount).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset state', async () => {
      const { result } = renderHook(() => useDocumentProcessor());

      // Process a file first
      await act(async () => {
        await result.current.processTextFile('test.txt', 'content');
      });

      expect(result.current.results).toHaveLength(1);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.currentFile).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.results).toEqual([]);
    });
  });

  describe('compare', () => {
    it('should compare two documents and return diff', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const docA = {
        id: '1',
        filename: 'a.txt',
        type: 'text' as const,
        content: 'Hello',
        embeddableContent: 'Hello',
        metadata: { size: 5, lineCount: 1, wordCount: 1 },
        chunks: [],
      };

      const docB = {
        id: '2',
        filename: 'b.txt',
        type: 'text' as const,
        content: 'Hello World',
        embeddableContent: 'Hello World',
        metadata: { size: 11, lineCount: 1, wordCount: 2 },
        chunks: [],
      };

      const diff = result.current.compare(docA, docB);
      expect(diff).toBeDefined();
      expect(diff.similarity).toBeDefined();
      expect(typeof diff.added).toBe('number');
      expect(typeof diff.removed).toBe('number');
    });

    it('should return similarity of 1 for identical documents', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const doc = {
        id: '1',
        filename: 'same.txt',
        type: 'text' as const,
        content: 'Same content',
        embeddableContent: 'Same content',
        metadata: { size: 12, lineCount: 1, wordCount: 2 },
        chunks: [],
      };

      const diff = result.current.compare(doc, doc);
      expect(diff.similarity).toBe(1);
    });
  });

  describe('detectFileEncoding', () => {
    it('should detect encoding from ArrayBuffer', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const buffer = new ArrayBuffer(10);
      const encoding = result.current.detectFileEncoding(buffer);
      expect(encoding).toBe('utf-8');
    });
  });

  describe('processTextDocuments', () => {
    it('should process multiple text documents synchronously', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const docs = [
        { id: 'doc-1', filename: 'a.txt', content: 'Content A' },
        { id: 'doc-2', filename: 'b.txt', content: 'Content B' },
        { id: 'doc-3', filename: 'c.md', content: '# Heading' },
      ];

      const processed = result.current.processTextDocuments(docs);
      expect(processed).toHaveLength(3);
      expect(processed[0].filename).toBe('a.txt');
      expect(processed[1].filename).toBe('b.txt');
      expect(processed[2].filename).toBe('c.md');
    });

    it('should return empty array for empty input', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const processed = result.current.processTextDocuments([]);
      expect(processed).toEqual([]);
    });
  });

  describe('validate', () => {
    it('should validate a valid file', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const file = new File(['Hello'], 'test.txt', { type: 'text/plain' });
      const validation = result.current.validate(file);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should reject oversized files', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      // Create a mock File with large size
      const file = new File(['x'], 'large.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 }); // 100MB

      const validation = result.current.validate(file);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('filterValidFiles', () => {
    it('should separate valid and invalid files', () => {
      const { result } = renderHook(() => useDocumentProcessor());

      const validFile = new File(['ok'], 'good.txt', { type: 'text/plain' });
      const invalidFile = new File(['x'], 'big.txt', { type: 'text/plain' });
      Object.defineProperty(invalidFile, 'size', { value: 100 * 1024 * 1024 });

      const { valid, invalid } = result.current.filterValidFiles([validFile, invalidFile]);
      expect(valid).toHaveLength(1);
      expect(valid[0].name).toBe('good.txt');
      expect(invalid).toHaveLength(1);
      expect(invalid[0].file.name).toBe('big.txt');
      expect(invalid[0].errors.length).toBeGreaterThan(0);
    });
  });
});
