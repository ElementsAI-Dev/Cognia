/**
 * useBatchProcessor - Hook for batch image processing operations
 *
 * Provides:
 * - Queue management for multiple images
 * - Parallel processing with concurrency control
 * - Progress tracking and error handling
 * - Integration with worker processor for heavy operations
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBatchEditStore, type BatchImage, type BatchJob } from '@/stores/media/batch-edit-store';
import { useWorkerProcessor } from './use-worker-processor';
import type { ImageAdjustments } from '@/types/media/image-studio';

export interface UseBatchProcessorOptions {
  onProgress?: (jobId: string, progress: number) => void;
  onImageComplete?: (jobId: string, imageId: string, outputPath: string) => void;
  onImageError?: (jobId: string, imageId: string, error: string) => void;
  onJobComplete?: (jobId: string) => void;
}

export interface UseBatchProcessorReturn {
  isProcessing: boolean;
  currentJobId: string | null;
  progress: number;
  processedCount: number;
  errorCount: number;

  startJob: (jobId: string) => Promise<void>;
  pauseJob: () => void;
  resumeJob: () => void;
  cancelJob: () => void;
}

export function useBatchProcessor(
  options: UseBatchProcessorOptions = {}
): UseBatchProcessorReturn {
  const { onProgress, onImageComplete, onImageError, onJobComplete } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const activeWorkersRef = useRef(0);

  const store = useBatchEditStore();
  const workerProcessor = useWorkerProcessor({ workerCount: store.concurrency });

  // Process a single image
  const processImage = useCallback(
    async (
      job: BatchJob,
      image: BatchImage,
      adjustments: Partial<ImageAdjustments>
    ): Promise<string> => {
      // Update status to processing
      store.updateImageStatus(job.id, image.id, 'processing', 0);

      try {
        // Load image
        const response = await fetch(image.path);
        const blob = await response.blob();
        const imageBitmap = await createImageBitmap(blob);

        // Create canvas and get ImageData
        const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        ctx.drawImage(imageBitmap, 0, 0);
        let imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);

        // Apply adjustments using worker
        if (adjustments && Object.keys(adjustments).length > 0) {
          store.updateImageStatus(job.id, image.id, 'processing', 30);

          const fullAdjustments: ImageAdjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            sharpen: 0,
            ...adjustments,
          };

          imageData = await workerProcessor.processAdjustments(imageData, fullAdjustments);
        }

        store.updateImageStatus(job.id, image.id, 'processing', 60);

        // Apply transform if specified
        if (job.preset?.transform) {
          const { resize, rotate, flipH, flipV } = job.preset.transform;

          if (resize) {
            // Resize logic would go here
            store.updateImageStatus(job.id, image.id, 'processing', 70);
          }

          if (rotate || flipH || flipV) {
            imageData = await workerProcessor.processTransform(imageData, {
              rotate: rotate || 0,
              flipHorizontal: flipH || false,
              flipVertical: flipV || false,
              scale: 1,
            });
          }
        }

        store.updateImageStatus(job.id, image.id, 'processing', 80);

        // Export
        ctx.putImageData(imageData, 0, 0);

        const format = job.preset?.export?.format || 'jpeg';
        const quality = (job.preset?.export?.quality || 90) / 100;
        const suffix = job.preset?.export?.suffix || '_edited';

        const _outputBlob = await canvas.convertToBlob({
          type: `image/${format}`,
          quality,
        });

        // Generate output path
        const baseName = image.filename.replace(/\.[^/.]+$/, '');
        const outputFileName = `${baseName}${suffix}.${format}`;
        const outputPath = `${job.outputDirectory}/${outputFileName}`;

        store.updateImageStatus(job.id, image.id, 'processing', 90);

        // In a real implementation, we would save the blob to disk here
        // For now, we just simulate completion
        store.updateImageStatus(job.id, image.id, 'completed', 100);

        return outputPath;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        store.updateImageStatus(job.id, image.id, 'error', 0, errorMessage);
        throw error;
      }
    },
    [store, workerProcessor]
  );

  // Process queue with concurrency control
  const processQueue = useCallback(
    async (job: BatchJob) => {
      const pendingImages = job.images.filter((img) => img.status === 'pending');
      const adjustments = job.preset?.adjustments || {};
      const concurrency = store.concurrency;

      let currentIndex = 0;

      const processNext = async (): Promise<void> => {
        while (currentIndex < pendingImages.length) {
          // Check for pause or cancel
          if (isPausedRef.current || isCancelledRef.current) {
            return;
          }

          const image = pendingImages[currentIndex];
          currentIndex++;

          if (!image) continue;

          activeWorkersRef.current++;

          try {
            const outputPath = await processImage(job, image, adjustments);
            setProcessedCount((prev) => prev + 1);
            onImageComplete?.(job.id, image.id, outputPath);
          } catch (error) {
            setErrorCount((prev) => prev + 1);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            onImageError?.(job.id, image.id, errorMessage);
          } finally {
            activeWorkersRef.current--;
          }

          // Update overall progress
          const completed = job.images.filter(
            (img) => img.status === 'completed' || img.status === 'error'
          ).length;
          const newProgress = (completed / job.images.length) * 100;
          setProgress(newProgress);
          onProgress?.(job.id, newProgress);
        }
      };

      // Start concurrent workers
      const workers = Array(Math.min(concurrency, pendingImages.length))
        .fill(null)
        .map(() => processNext());

      await Promise.all(workers);
    },
    [store.concurrency, processImage, onProgress, onImageComplete, onImageError]
  );

  // Start processing a job
  const startJob = useCallback(
    async (jobId: string) => {
      const job = store.getJob(jobId);
      if (!job) return;

      isPausedRef.current = false;
      isCancelledRef.current = false;

      setIsProcessing(true);
      setCurrentJobId(jobId);
      setProgress(0);
      setProcessedCount(0);
      setErrorCount(0);

      store.startProcessing(jobId);

      try {
        await processQueue(job);

        if (!isCancelledRef.current) {
          store.updateJob(jobId, {
            status: 'completed',
            completedAt: Date.now(),
          });
          onJobComplete?.(jobId);
        }
      } finally {
        setIsProcessing(false);
        setCurrentJobId(null);
      }
    },
    [store, processQueue, onJobComplete]
  );

  // Pause processing
  const pauseJob = useCallback(() => {
    isPausedRef.current = true;
    if (currentJobId) {
      store.pauseProcessing(currentJobId);
    }
    setIsProcessing(false);
  }, [currentJobId, store]);

  // Resume processing
  const resumeJob = useCallback(async () => {
    if (!currentJobId) return;

    isPausedRef.current = false;
    const job = store.getJob(currentJobId);
    if (!job) return;

    setIsProcessing(true);
    store.resumeProcessing(currentJobId);

    try {
      await processQueue(job);

      if (!isCancelledRef.current) {
        store.updateJob(currentJobId, {
          status: 'completed',
          completedAt: Date.now(),
        });
        onJobComplete?.(currentJobId);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [currentJobId, store, processQueue, onJobComplete]);

  // Cancel processing
  const cancelJob = useCallback(() => {
    isCancelledRef.current = true;
    if (currentJobId) {
      store.cancelProcessing(currentJobId);
    }
    setIsProcessing(false);
    setCurrentJobId(null);
  }, [currentJobId, store]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      workerProcessor.terminate();
    };
  }, [workerProcessor]);

  return {
    isProcessing,
    currentJobId,
    progress,
    processedCount,
    errorCount,

    startJob,
    pauseJob,
    resumeJob,
    cancelJob,
  };
}

export default useBatchProcessor;
