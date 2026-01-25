/**
 * useWorkerProcessor Hook
 *
 * React hook for using the video worker pool for video processing operations.
 * Provides a simple interface for common video processing tasks.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import type {
  VideoFilter,
  VideoExportOptions,
  VideoMetadata,
  WorkerPoolConfig,
  ProgressCallback,
} from '@/lib/media/workers';
import { getWorkerPool, terminateWorkerPool, VideoWorkerPool } from '@/lib/media/workers';

export interface UseWorkerProcessorOptions {
  poolConfig?: Partial<WorkerPoolConfig>;
  autoTerminate?: boolean;
}

export interface WorkerProcessorState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export interface WorkerProcessorActions {
  applyFilter: (
    frameData: ImageData,
    filter: VideoFilter,
    onProgress?: ProgressCallback
  ) => Promise<ImageData>;
  processFrames: (
    frames: ImageData[],
    filter: VideoFilter,
    onProgress?: ProgressCallback
  ) => Promise<ImageData[]>;
  extractMetadata: (videoData: ArrayBuffer) => Promise<VideoMetadata>;
  exportVideo: (
    videoData: ArrayBuffer,
    options: VideoExportOptions,
    onProgress?: ProgressCallback
  ) => Promise<Blob>;
  analyzeVideo: (videoData: ArrayBuffer) => Promise<VideoMetadata>;
  cancelAll: () => void;
  getPoolStatus: () => {
    totalWorkers: number;
    busyWorkers: number;
    idleWorkers: number;
    queuedTasks: number;
  };
}

export type UseWorkerProcessorReturn = WorkerProcessorState & WorkerProcessorActions;

/**
 * Hook for video processing using Web Workers
 */
export function useWorkerProcessor(
  options: UseWorkerProcessorOptions = {}
): UseWorkerProcessorReturn {
  const { poolConfig, autoTerminate = true } = options;

  const poolRef = useRef<VideoWorkerPool | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<WorkerProcessorState>({
    isProcessing: false,
    progress: 0,
    error: null,
  });

  // Initialize worker pool
  useEffect(() => {
    poolRef.current = getWorkerPool(poolConfig);

    return () => {
      if (autoTerminate) {
        terminateWorkerPool();
        poolRef.current = null;
      }
    };
  }, [poolConfig, autoTerminate]);

  // Update progress
  const updateProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, progress }));
  }, []);

  // Set processing state
  const setProcessing = useCallback((isProcessing: boolean) => {
    setState((prev) => ({
      ...prev,
      isProcessing,
      progress: isProcessing ? 0 : prev.progress,
      error: isProcessing ? null : prev.error,
    }));
  }, []);

  // Set error state
  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, isProcessing: false }));
  }, []);

  /**
   * Apply a filter to a single frame
   */
  const applyFilter = useCallback(
    async (
      frameData: ImageData,
      filter: VideoFilter,
      onProgress?: ProgressCallback
    ): Promise<ImageData> => {
      if (!poolRef.current) {
        throw new Error('Worker pool not initialized');
      }

      setProcessing(true);

      try {
        const response = await poolRef.current.submit(
          'filter',
          {
            frameData,
            filter,
          },
          {
            onProgress: onProgress || updateProgress,
          }
        );

        if (response.type === 'error') {
          throw new Error(response.error || 'Filter operation failed');
        }

        setProcessing(false);
        return response.data as ImageData;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setError(message);
        throw error;
      }
    },
    [setProcessing, setError, updateProgress]
  );

  /**
   * Process multiple frames in parallel
   */
  const processFrames = useCallback(
    async (
      frames: ImageData[],
      filter: VideoFilter,
      onProgress?: ProgressCallback
    ): Promise<ImageData[]> => {
      if (!poolRef.current) {
        throw new Error('Worker pool not initialized');
      }

      setProcessing(true);
      abortControllerRef.current = new AbortController();

      try {
        const results: ImageData[] = [];
        let completed = 0;

        const progressHandler = () => {
          completed++;
          const progress = (completed / frames.length) * 100;
          updateProgress(progress);
          onProgress?.(progress);
        };

        // Process frames in parallel batches
        const batchSize = poolRef.current.getStatus().totalWorkers || 4;
        for (let i = 0; i < frames.length; i += batchSize) {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Processing cancelled');
          }

          const batch = frames.slice(i, i + batchSize);
          const batchPromises = batch.map((frame) =>
            poolRef.current!.submit(
              'filter',
              { frameData: frame, filter },
              { onProgress: progressHandler }
            )
          );

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults.map((r) => r.data as ImageData));
        }

        setProcessing(false);
        return results;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setError(message);
        throw error;
      }
    },
    [setProcessing, setError, updateProgress]
  );

  /**
   * Extract metadata from video data
   */
  const extractMetadata = useCallback(
    async (videoData: ArrayBuffer): Promise<VideoMetadata> => {
      if (!poolRef.current) {
        throw new Error('Worker pool not initialized');
      }

      setProcessing(true);

      try {
        const response = await poolRef.current.submit('decode', { videoData });

        if (response.type === 'error') {
          throw new Error(response.error || 'Metadata extraction failed');
        }

        setProcessing(false);
        return response.data as VideoMetadata;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setError(message);
        throw error;
      }
    },
    [setProcessing, setError]
  );

  /**
   * Export video with specified options
   */
  const exportVideo = useCallback(
    async (
      videoData: ArrayBuffer,
      exportOptions: VideoExportOptions,
      onProgress?: ProgressCallback
    ): Promise<Blob> => {
      if (!poolRef.current) {
        throw new Error('Worker pool not initialized');
      }

      setProcessing(true);

      try {
        const response = await poolRef.current.submit(
          'export',
          {
            videoData,
            exportOptions,
          },
          {
            onProgress: onProgress || updateProgress,
            priority: 1, // Higher priority for exports
          }
        );

        if (response.type === 'error') {
          throw new Error(response.error || 'Export failed');
        }

        setProcessing(false);

        // Return blob if available, otherwise create from data
        if (response.data instanceof Blob) {
          return response.data;
        }

        // Create blob from ArrayBuffer
        const mimeType = `video/${exportOptions.format}`;
        return new Blob([response.data as ArrayBuffer], { type: mimeType });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setError(message);
        throw error;
      }
    },
    [setProcessing, setError, updateProgress]
  );

  /**
   * Analyze video for metadata and statistics
   */
  const analyzeVideo = useCallback(
    async (videoData: ArrayBuffer): Promise<VideoMetadata> => {
      if (!poolRef.current) {
        throw new Error('Worker pool not initialized');
      }

      setProcessing(true);

      try {
        const response = await poolRef.current.submit('analyze', { videoData });

        if (response.type === 'error') {
          throw new Error(response.error || 'Analysis failed');
        }

        setProcessing(false);
        return response.data as VideoMetadata;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setError(message);
        throw error;
      }
    },
    [setProcessing, setError]
  );

  /**
   * Cancel all ongoing operations
   */
  const cancelAll = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setProcessing(false);
  }, [setProcessing]);

  /**
   * Get worker pool status
   */
  const getPoolStatus = useCallback(() => {
    if (!poolRef.current) {
      return {
        totalWorkers: 0,
        busyWorkers: 0,
        idleWorkers: 0,
        queuedTasks: 0,
      };
    }
    return poolRef.current.getStatus();
  }, []);

  return {
    // State
    isProcessing: state.isProcessing,
    progress: state.progress,
    error: state.error,

    // Actions
    applyFilter,
    processFrames,
    extractMetadata,
    exportVideo,
    analyzeVideo,
    cancelAll,
    getPoolStatus,
  };
}
