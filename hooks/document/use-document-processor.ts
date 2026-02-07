'use client';

/**
 * useDocumentProcessor - Hook for processing documents through the unified pipeline
 * Bridges lib/document → React components with state management and progress tracking
 */

import { useState, useCallback, useRef } from 'react';
import {
  processDocument,
  processDocumentAsync,
  detectDocumentType,
  extractSummary,
  isTextFile,
  estimateTokenCount,
  type ProcessedDocument,
  type ProcessingOptions,
  type DocumentType,
} from '@/lib/document/document-processor';
import { extractTables, type TableExtractionResult } from '@/lib/document/table-extractor';
import { useDocumentStore } from '@/stores/document';

export interface DocumentProcessingState {
  /** Whether processing is in progress */
  isProcessing: boolean;
  /** Current progress (0-100) */
  progress: number;
  /** Current file being processed */
  currentFile: string | null;
  /** Last error that occurred */
  error: string | null;
  /** Results of last batch processing */
  results: ProcessedDocument[];
  /** Total files in current batch */
  totalFiles: number;
  /** Number of files completed */
  completedFiles: number;
}

export interface ProcessFileOptions extends ProcessingOptions {
  /** Store document in document store after processing */
  storeResult?: boolean;
  /** Project ID to associate with stored document */
  projectId?: string;
}

export interface ProcessBatchOptions extends ProcessFileOptions {
  /** Continue processing on individual file error */
  continueOnError?: boolean;
  /** Progress callback */
  onProgress?: (completed: number, total: number, currentFile: string) => void;
}

const BINARY_EXTENSIONS = ['pdf', 'docx', 'doc', 'xlsx', 'xls'];

function isBinaryType(type: DocumentType): boolean {
  return ['pdf', 'word', 'excel'].includes(type);
}

export function useDocumentProcessor() {
  const [state, setState] = useState<DocumentProcessingState>({
    isProcessing: false,
    progress: 0,
    currentFile: null,
    error: null,
    results: [],
    totalFiles: 0,
    completedFiles: 0,
  });

  const abortRef = useRef(false);
  const addDocument = useDocumentStore((s) => s.addDocument);

  /**
   * Process a single text file
   */
  const processTextFile = useCallback(
    async (
      filename: string,
      content: string,
      options: ProcessFileOptions = {}
    ): Promise<ProcessedDocument | null> => {
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        currentFile: filename,
        error: null,
      }));

      try {
        const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const processed = processDocument(id, filename, content, {
          extractEmbeddable: options.extractEmbeddable ?? true,
          generateChunks: options.generateChunks,
          chunkingOptions: options.chunkingOptions,
        });

        if (options.storeResult) {
          addDocument({
            filename: processed.filename,
            type: processed.type,
            content: processed.content,
            embeddableContent: processed.embeddableContent,
            metadata: processed.metadata,
            projectId: options.projectId,
          });
        }

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          currentFile: null,
          results: [processed],
        }));

        return processed;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Processing failed';
        console.error('Document processing failed:', filename, error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          currentFile: null,
          error: errorMsg,
        }));
        return null;
      }
    },
    [addDocument]
  );

  /**
   * Process a single file (text or binary)
   */
  const processFile = useCallback(
    async (
      file: File,
      options: ProcessFileOptions = {}
    ): Promise<ProcessedDocument | null> => {
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        currentFile: file.name,
        error: null,
      }));

      try {
        const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const docType = detectDocumentType(file.name);
        let data: string | ArrayBuffer;

        if (isBinaryType(docType)) {
          data = await file.arrayBuffer();
        } else {
          data = await file.text();
        }

        const processed = await processDocumentAsync(id, file.name, data, {
          extractEmbeddable: options.extractEmbeddable ?? true,
          generateChunks: options.generateChunks,
          chunkingOptions: options.chunkingOptions,
        });

        if (options.storeResult) {
          addDocument({
            filename: processed.filename,
            type: processed.type,
            content: processed.content,
            embeddableContent: processed.embeddableContent,
            metadata: processed.metadata,
            projectId: options.projectId,
          });
        }

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          currentFile: null,
          results: [processed],
        }));

        return processed;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Processing failed';
        console.error('Document processing failed:', file.name, error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          currentFile: null,
          error: errorMsg,
        }));
        return null;
      }
    },
    [addDocument]
  );

  /**
   * Process multiple files in batch
   */
  const processFiles = useCallback(
    async (
      files: File[],
      options: ProcessBatchOptions = {}
    ): Promise<ProcessedDocument[]> => {
      const { continueOnError = true, onProgress } = options;
      abortRef.current = false;

      setState({
        isProcessing: true,
        progress: 0,
        currentFile: null,
        error: null,
        results: [],
        totalFiles: files.length,
        completedFiles: 0,
      });

      const results: ProcessedDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        if (abortRef.current) break;

        const file = files[i];
        setState((prev) => ({
          ...prev,
          currentFile: file.name,
          progress: Math.round((i / files.length) * 100),
        }));
        onProgress?.(i, files.length, file.name);

        try {
          const id = `doc-${Date.now()}-${i}`;
          const docType = detectDocumentType(file.name);
          let data: string | ArrayBuffer;

          if (isBinaryType(docType)) {
            data = await file.arrayBuffer();
          } else {
            data = await file.text();
          }

          const processed = await processDocumentAsync(id, file.name, data, {
            extractEmbeddable: options.extractEmbeddable ?? true,
            generateChunks: options.generateChunks,
            chunkingOptions: options.chunkingOptions,
          });

          if (options.storeResult) {
            addDocument({
              filename: processed.filename,
              type: processed.type,
              content: processed.content,
              embeddableContent: processed.embeddableContent,
              metadata: processed.metadata,
              projectId: options.projectId,
            });
          }

          results.push(processed);
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
          if (!continueOnError) {
            setState((prev) => ({
              ...prev,
              isProcessing: false,
              error: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }));
            break;
          }
        }

        setState((prev) => ({
          ...prev,
          completedFiles: i + 1,
        }));
      }

      onProgress?.(files.length, files.length, '');
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        currentFile: null,
        results,
      }));

      return results;
    },
    [addDocument]
  );

  /**
   * Abort batch processing
   */
  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  /**
   * Reset processing state
   */
  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      progress: 0,
      currentFile: null,
      error: null,
      results: [],
      totalFiles: 0,
      completedFiles: 0,
    });
  }, []);

  /**
   * Extract tables from content
   */
  const extractDocumentTables = useCallback(
    (content: string): TableExtractionResult => {
      return extractTables(content);
    },
    []
  );

  /**
   * Get document summary
   */
  const summarize = useCallback(
    (content: string, maxLength?: number): string => {
      return extractSummary(content, maxLength);
    },
    []
  );

  /**
   * Detect document type from filename
   */
  const detectType = useCallback((filename: string): DocumentType => {
    return detectDocumentType(filename);
  }, []);

  /**
   * Check if file is processable
   */
  const isProcessable = useCallback((filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return isTextFile(filename) || BINARY_EXTENSIONS.includes(ext);
  }, []);

  /**
   * Estimate token count for content
   */
  const estimateTokens = useCallback((content: string): number => {
    return estimateTokenCount(content);
  }, []);

  return {
    // State
    ...state,

    // Processing
    processTextFile,
    processFile,
    processFiles,
    abort,
    reset,

    // Utilities
    extractDocumentTables,
    summarize,
    detectType,
    isProcessable,
    estimateTokens,
  };
}

export default useDocumentProcessor;
