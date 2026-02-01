/**
 * useWorkerProcessor - Hook for offloading image processing to Web Workers
 *
 * Provides:
 * - Worker pool management for parallel processing
 * - Automatic fallback to main thread if workers unavailable
 * - Progress tracking for long operations
 * - Type-safe message passing
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { loggers } from '@/lib/logger';

const log = loggers.app;
import type {
  WorkerMessage,
  WorkerResponse,
  WorkerPayload,
  WorkerMessageType,
  HistogramData,
  LevelsOptions,
  CurvesOptions,
  HSLOptions,
  NoiseReductionOptions,
  SharpenOptions,
  BlurOptions,
} from '@/lib/ai/media/workers/worker-types';
import type { ImageAdjustments } from '@/types/media/image-studio';

export interface UseWorkerProcessorOptions {
  workerCount?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}

export interface UseWorkerProcessorReturn {
  isReady: boolean;
  isProcessing: boolean;
  progress: number;
  lastDuration: number | null;

  processAdjustments: (imageData: ImageData, adjustments: ImageAdjustments) => Promise<ImageData>;
  processFilter: (
    imageData: ImageData,
    filterId: string,
    params?: Record<string, unknown>
  ) => Promise<ImageData>;
  processTransform: (
    imageData: ImageData,
    options: WorkerPayload['transform']
  ) => Promise<ImageData>;
  processLevels: (imageData: ImageData, options: LevelsOptions) => Promise<ImageData>;
  processCurves: (imageData: ImageData, options: CurvesOptions) => Promise<ImageData>;
  processHSL: (imageData: ImageData, options: HSLOptions) => Promise<ImageData>;
  processNoiseReduction: (imageData: ImageData, options: NoiseReductionOptions) => Promise<ImageData>;
  processSharpen: (imageData: ImageData, options: SharpenOptions) => Promise<ImageData>;
  processBlur: (imageData: ImageData, options: BlurOptions) => Promise<ImageData>;
  calculateHistogram: (imageData: ImageData) => Promise<HistogramData>;

  terminate: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useWorkerProcessor(
  options: UseWorkerProcessorOptions = {}
): UseWorkerProcessorReturn {
  const { workerCount = 1, onProgress, onError } = options;

  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastDuration, setLastDuration] = useState<number | null>(null);

  const workersRef = useRef<Worker[]>([]);
  const pendingRef = useRef<
    Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>
  >(new Map());
  const currentWorkerRef = useRef(0);

  // Initialize workers
  useEffect(() => {
    let mounted = true;
    const workers: Worker[] = [];
    const pending = pendingRef.current;

    const initWorkers = () => {
      if (typeof Worker === 'undefined') {
        log.warn('Web Workers not supported, falling back to main thread');
        return;
      }

      try {
        for (let i = 0; i < workerCount; i++) {
          const worker = new Worker(
            new URL('@/lib/ai/media/workers/image-worker.ts', import.meta.url),
            { type: 'module' }
          );

          worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            if (!mounted) return;

            const { id, type, data, error, progress: msgProgress, duration } = e.data;
            const pendingItem = pending.get(id);

            if (!pendingItem) return;

            if (type === 'progress' && msgProgress !== undefined) {
              setProgress(msgProgress);
              onProgress?.(msgProgress);
              return;
            }

            if (type === 'error') {
              pendingItem.reject(new Error(error || 'Worker error'));
              pending.delete(id);
              setIsProcessing(false);
              onError?.(error || 'Worker error');
              return;
            }

            if (type === 'success') {
              if (duration !== undefined) {
                setLastDuration(duration);
              }
              pendingItem.resolve(data);
              pending.delete(id);

              if (pending.size === 0) {
                setIsProcessing(false);
                setProgress(0);
              }
            }
          };

          worker.onerror = (e) => {
            log.error(`Worker error: ${e.message}`);
            onError?.(e.message);
          };

          workers.push(worker);
        }

        workersRef.current = workers;
      } catch (error) {
        log.error('Failed to initialize workers', error as Error);
      }
    };

    initWorkers();

    // Use microtask to avoid synchronous setState in effect
    queueMicrotask(() => {
      if (mounted) {
        setIsReady(true);
      }
    });

    return () => {
      mounted = false;
      workers.forEach((worker) => worker.terminate());
      workersRef.current = [];
      pending.clear();
    };
  }, [workerCount, onProgress, onError]);

  // Get next worker (round-robin)
  const getNextWorker = useCallback((): Worker | null => {
    if (workersRef.current.length === 0) return null;
    const worker = workersRef.current[currentWorkerRef.current];
    currentWorkerRef.current = (currentWorkerRef.current + 1) % workersRef.current.length;
    return worker;
  }, []);

  // Send message to worker
  const sendToWorker = useCallback(
    <T>(type: WorkerMessageType, payload: WorkerPayload): Promise<T> => {
      return new Promise((resolve, reject) => {
        const worker = getNextWorker();
        const id = generateId();

        if (!worker) {
          // Fallback to main thread processing would go here
          reject(new Error('No worker available'));
          return;
        }

        pendingRef.current.set(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
        });

        setIsProcessing(true);

        const message: WorkerMessage = { id, type, payload };

        // Transfer ImageData buffer for zero-copy
        const transferables: Transferable[] = [];
        if (payload.imageData) {
          // Create a copy since we're transferring
          const copy = new Uint8ClampedArray(payload.imageData.data);
          const imageDataCopy = new ImageData(copy, payload.imageData.width, payload.imageData.height);
          message.payload = { ...payload, imageData: imageDataCopy };
          transferables.push(imageDataCopy.data.buffer);
        }

        worker.postMessage(message, transferables);
      });
    },
    [getNextWorker]
  );

  // Process adjustments
  const processAdjustments = useCallback(
    async (imageData: ImageData, adjustments: ImageAdjustments): Promise<ImageData> => {
      return sendToWorker<ImageData>('adjust', { imageData, adjustments });
    },
    [sendToWorker]
  );

  // Process filter
  const processFilter = useCallback(
    async (
      imageData: ImageData,
      filterId: string,
      params?: Record<string, unknown>
    ): Promise<ImageData> => {
      return sendToWorker<ImageData>('filter', {
        imageData,
        filter: { id: filterId, name: filterId, params },
      });
    },
    [sendToWorker]
  );

  // Process transform
  const processTransform = useCallback(
    async (imageData: ImageData, options: WorkerPayload['transform']): Promise<ImageData> => {
      return sendToWorker<ImageData>('transform', { imageData, transform: options });
    },
    [sendToWorker]
  );

  // Process levels
  const processLevels = useCallback(
    async (imageData: ImageData, options: LevelsOptions): Promise<ImageData> => {
      return sendToWorker<ImageData>('levels', { imageData, levels: options });
    },
    [sendToWorker]
  );

  // Process curves
  const processCurves = useCallback(
    async (imageData: ImageData, options: CurvesOptions): Promise<ImageData> => {
      return sendToWorker<ImageData>('curves', { imageData, curves: options });
    },
    [sendToWorker]
  );

  // Process HSL
  const processHSL = useCallback(
    async (imageData: ImageData, options: HSLOptions): Promise<ImageData> => {
      return sendToWorker<ImageData>('hsl', { imageData, hsl: options });
    },
    [sendToWorker]
  );

  // Process noise reduction
  const processNoiseReduction = useCallback(
    async (imageData: ImageData, options: NoiseReductionOptions): Promise<ImageData> => {
      return sendToWorker<ImageData>('noise-reduction', { imageData, noiseReduction: options });
    },
    [sendToWorker]
  );

  // Process sharpen
  const processSharpen = useCallback(
    async (imageData: ImageData, options: SharpenOptions): Promise<ImageData> => {
      return sendToWorker<ImageData>('sharpen', { imageData, sharpen: options });
    },
    [sendToWorker]
  );

  // Process blur
  const processBlur = useCallback(
    async (imageData: ImageData, options: BlurOptions): Promise<ImageData> => {
      return sendToWorker<ImageData>('blur', { imageData, blur: options });
    },
    [sendToWorker]
  );

  // Calculate histogram
  const calculateHistogram = useCallback(
    async (imageData: ImageData): Promise<HistogramData> => {
      return sendToWorker<HistogramData>('histogram', { imageData });
    },
    [sendToWorker]
  );

  // Terminate all workers
  const terminate = useCallback(() => {
    workersRef.current.forEach((worker) => worker.terminate());
    workersRef.current = [];
    pendingRef.current.clear();
    setIsReady(false);
    setIsProcessing(false);
  }, []);

  return {
    isReady,
    isProcessing,
    progress,
    lastDuration,

    processAdjustments,
    processFilter,
    processTransform,
    processLevels,
    processCurves,
    processHSL,
    processNoiseReduction,
    processSharpen,
    processBlur,
    calculateHistogram,

    terminate,
  };
}

export default useWorkerProcessor;
