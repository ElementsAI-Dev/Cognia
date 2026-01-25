/**
 * RAG Progress Hook
 * 
 * Provides progress tracking and callbacks for RAG operations.
 * Enables real-time UI updates during long-running operations.
 * 
 * Features:
 * - Stage-based progress tracking
 * - Cancellation support
 * - Error handling
 * - Time estimation
 * - Detailed operation stats
 */

'use client';

import { useState, useCallback, useRef } from 'react';

export type RAGProgressStage = 
  | 'idle'
  | 'initializing'
  | 'chunking'
  | 'embedding'
  | 'indexing'
  | 'searching'
  | 'reranking'
  | 'formatting'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface RAGProgress {
  stage: RAGProgressStage;
  current: number;
  total: number;
  percentage: number;
  message: string;
  startTime: number;
  elapsedTime: number;
  estimatedRemaining?: number;
  details?: Record<string, unknown>;
}

export interface RAGOperationStats {
  totalDocuments: number;
  totalChunks: number;
  successCount: number;
  errorCount: number;
  averageTimePerChunk: number;
  totalTime: number;
}

export interface UseRAGProgressOptions {
  onStageChange?: (stage: RAGProgressStage) => void;
  onProgress?: (progress: RAGProgress) => void;
  onComplete?: (stats: RAGOperationStats) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export interface UseRAGProgressReturn {
  progress: RAGProgress;
  stats: RAGOperationStats;
  isActive: boolean;
  isCancelled: boolean;
  start: (total?: number, message?: string) => void;
  update: (current: number, stage?: RAGProgressStage, message?: string) => void;
  setStage: (stage: RAGProgressStage, message?: string) => void;
  complete: (stats?: Partial<RAGOperationStats>) => void;
  error: (err: Error) => void;
  cancel: () => void;
  reset: () => void;
  createProgressCallback: () => (update: { current: number; total: number; stage?: string }) => void;
}

const STAGE_MESSAGES: Record<RAGProgressStage, string> = {
  idle: 'Ready',
  initializing: 'Initializing...',
  chunking: 'Splitting documents into chunks...',
  embedding: 'Generating embeddings...',
  indexing: 'Indexing documents...',
  searching: 'Searching knowledge base...',
  reranking: 'Reranking results...',
  formatting: 'Formatting context...',
  complete: 'Complete',
  error: 'Error occurred',
  cancelled: 'Operation cancelled',
};

const initialProgress: RAGProgress = {
  stage: 'idle',
  current: 0,
  total: 0,
  percentage: 0,
  message: STAGE_MESSAGES.idle,
  startTime: 0,
  elapsedTime: 0,
};

const initialStats: RAGOperationStats = {
  totalDocuments: 0,
  totalChunks: 0,
  successCount: 0,
  errorCount: 0,
  averageTimePerChunk: 0,
  totalTime: 0,
};

/**
 * Hook for tracking RAG operation progress
 */
export function useRAGProgress(
  options: UseRAGProgressOptions = {}
): UseRAGProgressReturn {
  const { onStageChange, onProgress, onComplete, onError, onCancel } = options;

  const [progress, setProgress] = useState<RAGProgress>(initialProgress);
  const [stats, setStats] = useState<RAGOperationStats>(initialStats);
  const [isActive, setIsActive] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const startTimeRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const chunkTimesRef = useRef<number[]>([]);

  /**
   * Start a new operation
   */
  const start = useCallback((total: number = 0, message?: string) => {
    const now = Date.now();
    startTimeRef.current = now;
    lastUpdateRef.current = now;
    chunkTimesRef.current = [];

    setIsActive(true);
    setIsCancelled(false);
    setStats(initialStats);

    const newProgress: RAGProgress = {
      stage: 'initializing',
      current: 0,
      total,
      percentage: 0,
      message: message || STAGE_MESSAGES.initializing,
      startTime: now,
      elapsedTime: 0,
    };

    setProgress(newProgress);
    onStageChange?.('initializing');
    onProgress?.(newProgress);
  }, [onStageChange, onProgress]);

  /**
   * Update progress
   */
  const update = useCallback((
    current: number,
    stage?: RAGProgressStage,
    message?: string
  ) => {
    if (isCancelled) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    // Track chunk processing times for estimation
    if (current > 0) {
      chunkTimesRef.current.push(timeSinceLastUpdate);
      // Keep only last 10 samples for moving average
      if (chunkTimesRef.current.length > 10) {
        chunkTimesRef.current.shift();
      }
    }

    setProgress(prev => {
      const newStage = stage || prev.stage;
      const elapsedTime = now - startTimeRef.current;
      const percentage = prev.total > 0 ? Math.round((current / prev.total) * 100) : 0;

      // Estimate remaining time based on average chunk time
      let estimatedRemaining: number | undefined;
      if (chunkTimesRef.current.length > 0 && prev.total > current) {
        const avgTime = chunkTimesRef.current.reduce((a, b) => a + b, 0) / chunkTimesRef.current.length;
        estimatedRemaining = avgTime * (prev.total - current);
      }

      const newProgress: RAGProgress = {
        ...prev,
        stage: newStage,
        current,
        percentage,
        message: message || STAGE_MESSAGES[newStage] || prev.message,
        elapsedTime,
        estimatedRemaining,
      };

      if (stage && stage !== prev.stage) {
        onStageChange?.(newStage);
      }
      onProgress?.(newProgress);

      return newProgress;
    });
  }, [isCancelled, onStageChange, onProgress]);

  /**
   * Set operation stage
   */
  const setStage = useCallback((stage: RAGProgressStage, message?: string) => {
    if (isCancelled) return;

    setProgress(prev => {
      const now = Date.now();
      const newProgress: RAGProgress = {
        ...prev,
        stage,
        message: message || STAGE_MESSAGES[stage],
        elapsedTime: now - startTimeRef.current,
      };

      onStageChange?.(stage);
      onProgress?.(newProgress);

      return newProgress;
    });
  }, [isCancelled, onStageChange, onProgress]);

  /**
   * Complete the operation
   */
  const complete = useCallback((statsUpdate?: Partial<RAGOperationStats>) => {
    const now = Date.now();
    const totalTime = now - startTimeRef.current;

    const finalStats: RAGOperationStats = {
      ...stats,
      ...statsUpdate,
      totalTime,
      averageTimePerChunk: chunkTimesRef.current.length > 0
        ? chunkTimesRef.current.reduce((a, b) => a + b, 0) / chunkTimesRef.current.length
        : 0,
    };

    setStats(finalStats);
    setIsActive(false);

    const finalProgress: RAGProgress = {
      ...progress,
      stage: 'complete',
      percentage: 100,
      message: STAGE_MESSAGES.complete,
      elapsedTime: totalTime,
    };

    setProgress(finalProgress);
    onStageChange?.('complete');
    onProgress?.(finalProgress);
    onComplete?.(finalStats);
  }, [stats, progress, onStageChange, onProgress, onComplete]);

  /**
   * Handle error
   */
  const error = useCallback((err: Error) => {
    const now = Date.now();
    
    setIsActive(false);
    setProgress(prev => ({
      ...prev,
      stage: 'error',
      message: err.message,
      elapsedTime: now - startTimeRef.current,
    }));

    onStageChange?.('error');
    onError?.(err);
  }, [onStageChange, onError]);

  /**
   * Cancel the operation
   */
  const cancel = useCallback(() => {
    setIsCancelled(true);
    setIsActive(false);

    const now = Date.now();
    setProgress(prev => ({
      ...prev,
      stage: 'cancelled',
      message: STAGE_MESSAGES.cancelled,
      elapsedTime: now - startTimeRef.current,
    }));

    onStageChange?.('cancelled');
    onCancel?.();
  }, [onStageChange, onCancel]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setProgress(initialProgress);
    setStats(initialStats);
    setIsActive(false);
    setIsCancelled(false);
    startTimeRef.current = 0;
    lastUpdateRef.current = 0;
    chunkTimesRef.current = [];
  }, []);

  /**
   * Create a progress callback for use with RAG functions
   */
  const createProgressCallback = useCallback(() => {
    return (progressUpdate: { current: number; total: number; stage?: string }) => {
      setProgress(prev => {
        if (progressUpdate.total !== prev.total) {
          return { ...prev, total: progressUpdate.total };
        }
        return prev;
      });

      const stage = progressUpdate.stage as RAGProgressStage | undefined;
      update(progressUpdate.current, stage);
    };
  }, [update]);

  return {
    progress,
    stats,
    isActive,
    isCancelled,
    start,
    update,
    setStage,
    complete,
    error,
    cancel,
    reset,
    createProgressCallback,
  };
}

/**
 * Format elapsed time for display
 */
export function formatElapsedTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format estimated remaining time
 */
export function formatRemainingTime(ms: number | undefined): string {
  if (ms === undefined) return 'Calculating...';
  if (ms < 1000) return 'Almost done';
  if (ms < 60000) return `~${Math.ceil(ms / 1000)}s remaining`;
  const minutes = Math.ceil(ms / 60000);
  return `~${minutes}m remaining`;
}

/**
 * Get stage display info
 */
export function getStageInfo(stage: RAGProgressStage): {
  label: string;
  icon: string;
  color: string;
} {
  const info: Record<RAGProgressStage, { label: string; icon: string; color: string }> = {
    idle: { label: 'Ready', icon: '⏸️', color: 'gray' },
    initializing: { label: 'Initializing', icon: '🔄', color: 'blue' },
    chunking: { label: 'Chunking', icon: '✂️', color: 'blue' },
    embedding: { label: 'Embedding', icon: '🧠', color: 'purple' },
    indexing: { label: 'Indexing', icon: '📥', color: 'blue' },
    searching: { label: 'Searching', icon: '🔍', color: 'blue' },
    reranking: { label: 'Reranking', icon: '📊', color: 'purple' },
    formatting: { label: 'Formatting', icon: '📝', color: 'blue' },
    complete: { label: 'Complete', icon: '✅', color: 'green' },
    error: { label: 'Error', icon: '❌', color: 'red' },
    cancelled: { label: 'Cancelled', icon: '🚫', color: 'orange' },
  };

  return info[stage];
}
