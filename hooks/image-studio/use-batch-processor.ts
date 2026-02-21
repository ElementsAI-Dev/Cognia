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
import { exists, writeBinaryFile } from '@/lib/file/file-operations';
import { isTauri } from '@/lib/utils';

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
  const webOutputNamesRef = useRef(new Set<string>());

  const store = useBatchEditStore();
  const workerProcessor = useWorkerProcessor({ workerCount: store.concurrency });

  const resolveOutputPath = useCallback(async (desiredPath: string, overwrite: boolean): Promise<string> => {
    if (overwrite) {
      return desiredPath;
    }

    const normalizedPath = desiredPath.replace(/\\/g, '/');
    const extIndex = normalizedPath.lastIndexOf('.');
    const hasExt = extIndex > normalizedPath.lastIndexOf('/');
    const base = hasExt ? normalizedPath.slice(0, extIndex) : normalizedPath;
    const ext = hasExt ? normalizedPath.slice(extIndex) : '';

    let candidate = normalizedPath;
    let index = 1;
    while (await exists(candidate)) {
      candidate = `${base}_${index}${ext}`;
      index += 1;
    }
    return candidate;
  }, []);

  const saveBlobWeb = useCallback(
    async (blob: Blob, outputDirectory: string, fileName: string, overwrite: boolean): Promise<string> => {
      let resolvedName = fileName;
      if (!overwrite) {
        const extIndex = fileName.lastIndexOf('.');
        const hasExt = extIndex > 0;
        const base = hasExt ? fileName.slice(0, extIndex) : fileName;
        const ext = hasExt ? fileName.slice(extIndex) : '';
        let suffix = 1;
        while (webOutputNamesRef.current.has(`${outputDirectory}/${resolvedName}`)) {
          resolvedName = `${base}_${suffix}${ext}`;
          suffix += 1;
        }
      }

      const path = `${outputDirectory}/${resolvedName}`;
      webOutputNamesRef.current.add(path);

      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        const picker = window as Window & {
          showSaveFilePicker?: (options: {
            suggestedName: string;
            types?: Array<{ description?: string; accept: Record<string, string[]> }>;
          }) => Promise<{
            createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
          }>;
        };
        try {
          const handle = await picker.showSaveFilePicker?.({
            suggestedName: resolvedName,
            types: [
              {
                description: 'Image files',
                accept: { [blob.type || 'image/jpeg']: ['.jpg', '.jpeg', '.png', '.webp', '.avif'] },
              },
            ],
          });
          if (handle) {
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return path;
          }
        } catch {
          // User cancelled picker, fallback to download.
        }
      }

      const hasDownloadFallback =
        typeof document !== 'undefined' &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function';

      if (!hasDownloadFallback) {
        return path;
      }

      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = resolvedName;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } finally {
        URL.revokeObjectURL(url);
      }
      return path;
    },
    []
  );

  const saveOutputBlob = useCallback(
    async (job: BatchJob, blob: Blob, fileName: string): Promise<string> => {
      const desiredPath = `${job.outputDirectory}/${fileName}`;
      if (!isTauri()) {
        return saveBlobWeb(blob, job.outputDirectory, fileName, job.overwrite);
      }

      const finalPath = await resolveOutputPath(desiredPath, job.overwrite);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const writeResult = await writeBinaryFile(finalPath, bytes, {
        overwrite: true,
        createDirectories: true,
      });
      if (!writeResult.success) {
        throw new Error(writeResult.error || 'Failed to write processed image');
      }
      return finalPath;
    },
    [resolveOutputPath, saveBlobWeb]
  );

  // Process a single image
  const processImage = useCallback(
    async (
      job: BatchJob,
      image: BatchImage,
      adjustments: Partial<ImageAdjustments>
    ): Promise<string> => {
      const attempts = (image.attempts ?? 0) + 1;
      // Update status to processing
      store.updateImageStatus(job.id, image.id, 'processing', 0, undefined, { attempts });

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

        const outputBlob = await canvas.convertToBlob({
          type: `image/${format}`,
          quality,
        });

        // Generate output path
        const baseName = image.filename.replace(/\.[^/.]+$/, '');
        const outputFileName = `${baseName}${suffix}.${format}`;
        const outputPath = await saveOutputBlob(job, outputBlob, outputFileName);

        store.updateImageStatus(job.id, image.id, 'processing', 90);

        store.updateImageStatus(job.id, image.id, 'completed', 100, undefined, {
          outputPath,
          attempts,
          lastError: undefined,
        });

        return outputPath;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        store.updateImageStatus(job.id, image.id, 'error', 0, errorMessage, {
          attempts,
          lastError: errorMessage,
        });
        throw error;
      }
    },
    [saveOutputBlob, store, workerProcessor]
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
          const latestJob = store.getJob(job.id);
          const totalImages = latestJob?.images.length ?? job.images.length;
          const completed =
            latestJob?.images.filter((img) => img.status === 'completed' || img.status === 'error')
              .length ?? 0;
          const newProgress = totalImages > 0 ? (completed / totalImages) * 100 : 0;
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
    [store, processImage, onProgress, onImageComplete, onImageError]
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
