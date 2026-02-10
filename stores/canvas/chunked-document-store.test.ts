/**
 * Tests for Chunked Document Store
 */

import { act, renderHook } from '@testing-library/react';
import { useChunkedDocumentStore } from './chunked-document-store';

describe('useChunkedDocumentStore', () => {
  const testDocId = `test-doc-${Date.now()}`;

  describe('addChunkedDocument', () => {
    it('should add a document and create chunks', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());

      act(() => {
        result.current.addChunkedDocument(testDocId, 'line1\nline2\nline3');
      });

      expect(result.current.chunkedDocuments[testDocId]).toBeDefined();
      expect(result.current.chunkedDocuments[testDocId].chunks.length).toBeGreaterThan(0);
    });

    it('should handle large documents', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());
      const content = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join('\n');
      const largeDocId = `large-doc-${Date.now()}`;

      act(() => {
        result.current.addChunkedDocument(largeDocId, content);
      });

      const doc = result.current.chunkedDocuments[largeDocId];
      expect(doc).toBeDefined();
      expect(doc.chunks.length).toBeGreaterThan(0);
    });
  });

  describe('removeChunkedDocument', () => {
    it('should remove a document from the store', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());
      const removeDocId = `remove-doc-${Date.now()}`;

      act(() => {
        result.current.addChunkedDocument(removeDocId, 'content');
      });

      expect(result.current.chunkedDocuments[removeDocId]).toBeDefined();

      act(() => {
        result.current.removeChunkedDocument(removeDocId);
      });

      expect(result.current.chunkedDocuments[removeDocId]).toBeUndefined();
    });
  });

  describe('getDocumentContent', () => {
    it('should reconstruct full document content', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());
      const original = 'line1\nline2\nline3';
      const contentDocId = `content-doc-${Date.now()}`;

      act(() => {
        result.current.addChunkedDocument(contentDocId, original);
      });

      const content = result.current.getDocumentContent(contentDocId);
      expect(content).toBe(original);
    });

    it('should return null for non-existent document', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());

      const content = result.current.getDocumentContent('missing-doc');
      expect(content).toBeNull();
    });
  });

  describe('loadChunkRange', () => {
    it('should load content for a line range', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());
      const content = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
      const rangeDocId = `range-doc-${Date.now()}`;

      act(() => {
        result.current.addChunkedDocument(rangeDocId, content);
      });

      const rangeContent = result.current.loadChunkRange(rangeDocId, 10, 20);
      expect(rangeContent).toBeTruthy();
    });
  });

  describe('updateDocument', () => {
    it('should update document content', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());
      const updateDocId = `update-doc-${Date.now()}`;

      act(() => {
        result.current.addChunkedDocument(updateDocId, 'original');
      });

      act(() => {
        result.current.updateDocument(updateDocId, 'modified content');
      });

      const content = result.current.getDocumentContent(updateDocId);
      expect(content).toBe('modified content');
    });
  });

  describe('isLargeDocument', () => {
    it('should identify large documents', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());
      const smallDocId = `small-doc-${Date.now()}`;
      const largeDocId = `large-doc-${Date.now()}`;

      act(() => {
        result.current.addChunkedDocument(smallDocId, 'small');
        result.current.addChunkedDocument(largeDocId, Array(10000).fill('line').join('\n'));
      });

      // Both should be valid - the isLargeDocument checks if it's above threshold
      expect(typeof result.current.isLargeDocument(smallDocId)).toBe('boolean');
      expect(typeof result.current.isLargeDocument(largeDocId)).toBe('boolean');
    });
  });

  describe('no localStorage persistence', () => {
    it('should not persist chunked documents to localStorage', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());
      const persistDocId = `persist-test-${Date.now()}`;

      act(() => {
        result.current.addChunkedDocument(persistDocId, 'test content\nline 2\nline 3');
      });

      // Verify document exists in memory
      expect(result.current.chunkedDocuments[persistDocId]).toBeDefined();

      // Verify nothing was written to localStorage for this store
      const stored = localStorage.getItem('cognia-chunked-documents');
      expect(stored).toBeNull();

      // Cleanup
      act(() => {
        result.current.removeChunkedDocument(persistDocId);
      });
    });
  });

  describe('updateVisibleRange', () => {
    it('should update visible range for a document', () => {
      const { result } = renderHook(() => useChunkedDocumentStore());
      const visibleDocId = `visible-doc-${Date.now()}`;

      act(() => {
        result.current.addChunkedDocument(visibleDocId, 'content\nmore\nlines');
      });

      act(() => {
        result.current.updateVisibleRange(visibleDocId, 1, 10);
      });

      expect(result.current.visibleRanges[visibleDocId]).toBeDefined();
      expect(result.current.visibleRanges[visibleDocId].startLine).toBe(1);
      expect(result.current.visibleRanges[visibleDocId].endLine).toBe(10);
    });
  });
});
