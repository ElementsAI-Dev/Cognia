/**
 * useChunkLoader - Hook for lazy loading chunks from large documents
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChunkedDocumentStore } from '@/stores/canvas';
import { LargeFileOptimizer } from '@/lib/canvas/large-file-optimizer';

interface ChunkLoaderState {
  content: string;
  startLine: number;
  endLine: number;
  isLoading: boolean;
  totalLines: number;
}

interface UseChunkLoaderReturn {
  state: ChunkLoaderState;
  loadRange: (startLine: number, endLine: number) => void;
  loadMore: (direction: 'up' | 'down', lines?: number) => void;
  isLargeDocument: boolean;
  getFullContent: () => string | null;
}

const BUFFER_LINES = 100;
const LOAD_THRESHOLD = 50;

export function useChunkLoader(documentId: string | null): UseChunkLoaderReturn {
  const [state, setState] = useState<ChunkLoaderState>({
    content: '',
    startLine: 0,
    endLine: 0,
    isLoading: false,
    totalLines: 0,
  });

  const _optimizerRef = useRef(new LargeFileOptimizer());
  const loadingRef = useRef(false);

  const {
    chunkedDocuments,
    loadChunkRange,
    updateVisibleRange,
    isLargeDocument,
    getDocumentContent,
  } = useChunkedDocumentStore();

  const isLarge = documentId ? isLargeDocument(documentId) : false;
  const chunkedDoc = documentId ? chunkedDocuments[documentId] : null;

  const loadRange = useCallback((startLine: number, endLine: number) => {
    if (!documentId || loadingRef.current) return;

    loadingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true }));

    const bufferedStart = Math.max(0, startLine - BUFFER_LINES);
    const bufferedEnd = endLine + BUFFER_LINES;

    const content = loadChunkRange(documentId, bufferedStart, bufferedEnd);
    updateVisibleRange(documentId, startLine, endLine);

    if (content !== null) {
      setState({
        content,
        startLine: bufferedStart,
        endLine: bufferedEnd,
        isLoading: false,
        totalLines: chunkedDoc?.lineCount || 0,
      });
    }

    loadingRef.current = false;
  }, [documentId, loadChunkRange, updateVisibleRange, chunkedDoc]);

  const loadMore = useCallback((direction: 'up' | 'down', lines: number = LOAD_THRESHOLD) => {
    if (!documentId || loadingRef.current) return;

    const { startLine, endLine, totalLines } = state;

    if (direction === 'up' && startLine > 0) {
      const newStart = Math.max(0, startLine - lines);
      loadRange(newStart, endLine);
    } else if (direction === 'down' && endLine < totalLines) {
      const newEnd = Math.min(totalLines, endLine + lines);
      loadRange(startLine, newEnd);
    }
  }, [documentId, state, loadRange]);

  const getFullContent = useCallback(() => {
    if (!documentId) return null;
    return getDocumentContent(documentId);
  }, [documentId, getDocumentContent]);

  useEffect(() => {
    if (documentId && chunkedDoc) {
      // Use queueMicrotask to avoid sync setState in effect
      queueMicrotask(() => {
        loadRange(0, Math.min(200, chunkedDoc.lineCount));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return {
    state,
    loadRange,
    loadMore,
    isLargeDocument: isLarge,
    getFullContent,
  };
}

export default useChunkLoader;
