/**
 * useEnhancedImageEditor - Extended image editor with worker and WebGL acceleration
 *
 * Builds on useImageEditor with:
 * - Web Worker offloading for heavy operations
 * - WebGL acceleration when available
 * - Advanced adjustments (levels, curves, HSL)
 * - Progressive loading support
 * - Performance monitoring
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useImageEditor, type UseImageEditorOptions, type UseImageEditorReturn } from './use-image-editor';
import { useWorkerProcessor } from './use-worker-processor';
import { GLProcessor } from '@/lib/ai/media/webgl/gl-processor';
import { ProgressiveImageLoader } from '@/lib/ai/media/progressive-loader';
import {
  applyLevels,
  applyCurves,
  applyHSL,
  applyNoiseReduction,
  applySharpen,
  applyClarity,
  applyDehaze,
  type LevelsOptions,
  type CurvesOptions,
  type HSLOptions,
  type NoiseReductionOptions,
  type SharpenOptions,
} from '@/lib/ai/media/adjustments';
import type { ImageAdjustments } from '@/types/media/image-studio';

export interface EnhancedEditorOptions extends UseImageEditorOptions {
  useWorker?: boolean;
  useWebGL?: boolean;
  workerCount?: number;
  onPerformanceMetric?: (metric: PerformanceMetric) => void;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  method: 'worker' | 'webgl' | 'main-thread';
  imageSize: { width: number; height: number };
}

export interface UseEnhancedImageEditorReturn extends UseImageEditorReturn {
  // Performance
  isWorkerReady: boolean;
  isWebGLSupported: boolean;
  lastOperationDuration: number | null;

  // Advanced adjustments
  applyLevels: (options: LevelsOptions) => Promise<void>;
  applyCurves: (options: CurvesOptions) => Promise<void>;
  applyHSL: (options: HSLOptions) => Promise<void>;
  applyNoiseReduction: (options: NoiseReductionOptions) => Promise<void>;
  applySharpen: (options: SharpenOptions) => Promise<void>;
  applyClarity: (amount: number) => Promise<void>;
  applyDehaze: (amount: number) => Promise<void>;

  // Histogram
  getHistogram: () => Promise<{
    red: number[];
    green: number[];
    blue: number[];
    luminance: number[];
  } | null>;

  // Progressive loading
  loadImageProgressive: (
    source: string | File,
    onPreview?: (previewUrl: string) => void
  ) => Promise<void>;

  // Batch adjustments
  applyAdjustmentsBatch: (adjustments: Partial<ImageAdjustments>) => Promise<void>;
}

export function useEnhancedImageEditor(
  options: EnhancedEditorOptions = {}
): UseEnhancedImageEditorReturn {
  const {
    useWorker = true,
    useWebGL = true,
    workerCount = 2,
    onPerformanceMetric,
    ...baseOptions
  } = options;

  // Base editor
  const baseEditor = useImageEditor(baseOptions);

  // Worker processor
  const workerProcessor = useWorkerProcessor({
    workerCount,
    onError: baseOptions.onError,
  });

  // WebGL processor
  const glProcessorRef = useRef<GLProcessor | null>(null);
  const [isWebGLSupported, setIsWebGLSupported] = useState(false);
  const [lastOperationDuration, setLastOperationDuration] = useState<number | null>(null);

  // Progressive loader
  const progressiveLoaderRef = useRef<ProgressiveImageLoader | null>(null);

  // Initialize WebGL
  useEffect(() => {
    let mounted = true;

    const initWebGL = () => {
      if (useWebGL && GLProcessor.isSupported()) {
        try {
          glProcessorRef.current = new GLProcessor();
          glProcessorRef.current.initialize();
          return true;
        } catch {
          return false;
        }
      }
      return false;
    };

    const supported = initWebGL();
    queueMicrotask(() => {
      if (mounted) {
        setIsWebGLSupported(supported);
      }
    });

    return () => {
      mounted = false;
      glProcessorRef.current?.cleanup();
    };
  }, [useWebGL]);

  // Initialize progressive loader
  useEffect(() => {
    progressiveLoaderRef.current = new ProgressiveImageLoader({
      maxPreviewSize: 64,
      previewQuality: 0.3,
      useBlurhash: true,
    });

    return () => {
      progressiveLoaderRef.current?.cancel();
    };
  }, []);

  // Track performance
  const trackPerformance = useCallback(
    (operation: string, duration: number, method: 'worker' | 'webgl' | 'main-thread') => {
      setLastOperationDuration(duration);
      if (onPerformanceMetric && baseEditor.state.imageData) {
        onPerformanceMetric({
          operation,
          duration,
          method,
          imageSize: {
            width: baseEditor.state.imageData.width,
            height: baseEditor.state.imageData.height,
          },
        });
      }
    },
    [onPerformanceMetric, baseEditor.state.imageData]
  );

  // Process with best available method
  const processWithBestMethod = useCallback(
    async <T>(
      operation: string,
      workerFn: () => Promise<T>,
      webglFn: (() => T) | null,
      mainThreadFn: () => T
    ): Promise<T> => {
      const startTime = performance.now();

      try {
        // Try worker first
        if (useWorker && workerProcessor.isReady) {
          const result = await workerFn();
          trackPerformance(operation, performance.now() - startTime, 'worker');
          return result;
        }

        // Try WebGL
        if (useWebGL && isWebGLSupported && webglFn && glProcessorRef.current) {
          const result = webglFn();
          trackPerformance(operation, performance.now() - startTime, 'webgl');
          return result;
        }

        // Fallback to main thread
        const result = mainThreadFn();
        trackPerformance(operation, performance.now() - startTime, 'main-thread');
        return result;
      } catch (_error) {
        // Fallback to main thread on error
        const result = mainThreadFn();
        trackPerformance(operation, performance.now() - startTime, 'main-thread');
        return result;
      }
    },
    [useWorker, useWebGL, workerProcessor.isReady, isWebGLSupported, trackPerformance]
  );

  // Apply levels adjustment
  const applyLevelsAdjustment = useCallback(
    async (levelOptions: LevelsOptions): Promise<void> => {
      const { imageData } = baseEditor.state;
      if (!imageData) return;

      const result = await processWithBestMethod(
        'levels',
        () => workerProcessor.processLevels(imageData, levelOptions),
        null,
        () => applyLevels(imageData, levelOptions)
      );

      baseEditor.putImageData(result);
    },
    [baseEditor, processWithBestMethod, workerProcessor]
  );

  // Apply curves adjustment
  const applyCurvesAdjustment = useCallback(
    async (curvesOptions: CurvesOptions): Promise<void> => {
      const { imageData } = baseEditor.state;
      if (!imageData) return;

      const result = await processWithBestMethod(
        'curves',
        () => workerProcessor.processCurves(imageData, curvesOptions),
        null,
        () => applyCurves(imageData, curvesOptions)
      );

      baseEditor.putImageData(result);
    },
    [baseEditor, processWithBestMethod, workerProcessor]
  );

  // Apply HSL adjustment
  const applyHSLAdjustment = useCallback(
    async (hslOptions: HSLOptions): Promise<void> => {
      const { imageData } = baseEditor.state;
      if (!imageData) return;

      const result = await processWithBestMethod(
        'hsl',
        () => workerProcessor.processHSL(imageData, hslOptions),
        () => glProcessorRef.current!.processHSL(imageData, hslOptions),
        () => applyHSL(imageData, hslOptions)
      );

      baseEditor.putImageData(result);
    },
    [baseEditor, processWithBestMethod, workerProcessor]
  );

  // Apply noise reduction
  const applyNoiseReductionAdjustment = useCallback(
    async (noiseOptions: NoiseReductionOptions): Promise<void> => {
      const { imageData } = baseEditor.state;
      if (!imageData) return;

      const result = await processWithBestMethod(
        'noise-reduction',
        () => workerProcessor.processNoiseReduction(imageData, noiseOptions),
        null,
        () => applyNoiseReduction(imageData, noiseOptions)
      );

      baseEditor.putImageData(result);
    },
    [baseEditor, processWithBestMethod, workerProcessor]
  );

  // Apply sharpen
  const applySharpenAdjustment = useCallback(
    async (sharpenOptions: SharpenOptions): Promise<void> => {
      const { imageData } = baseEditor.state;
      if (!imageData) return;

      const result = await processWithBestMethod(
        'sharpen',
        () => workerProcessor.processSharpen(imageData, sharpenOptions),
        () => glProcessorRef.current!.processSharpen(imageData, sharpenOptions.amount),
        () => applySharpen(imageData, sharpenOptions)
      );

      baseEditor.putImageData(result);
    },
    [baseEditor, processWithBestMethod, workerProcessor]
  );

  // Apply clarity
  const applyClarityAdjustment = useCallback(
    async (amount: number): Promise<void> => {
      const { imageData } = baseEditor.state;
      if (!imageData) return;

      const result = applyClarity(imageData, amount);
      baseEditor.putImageData(result);
    },
    [baseEditor]
  );

  // Apply dehaze
  const applyDehazeAdjustment = useCallback(
    async (amount: number): Promise<void> => {
      const { imageData } = baseEditor.state;
      if (!imageData) return;

      const result = applyDehaze(imageData, amount);
      baseEditor.putImageData(result);
    },
    [baseEditor]
  );

  // Get histogram
  const getHistogram = useCallback(async () => {
    const { imageData } = baseEditor.state;
    if (!imageData) return null;

    if (useWorker && workerProcessor.isReady) {
      return workerProcessor.calculateHistogram(imageData);
    }

    // Main thread calculation
    const { data } = imageData;
    const red = new Array(256).fill(0);
    const green = new Array(256).fill(0);
    const blue = new Array(256).fill(0);
    const luminance = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      red[data[i]]++;
      green[data[i + 1]]++;
      blue[data[i + 2]]++;

      const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
      luminance[Math.min(255, Math.max(0, lum))]++;
    }

    return { red, green, blue, luminance };
  }, [baseEditor.state, useWorker, workerProcessor]);

  // Progressive image loading
  const loadImageProgressive = useCallback(
    async (source: string | File, onPreview?: (previewUrl: string) => void): Promise<void> => {
      if (!progressiveLoaderRef.current) {
        await baseEditor.loadImage(source);
        return;
      }

      const loader = progressiveLoaderRef.current;

      try {
        if (typeof source === 'string') {
          const result = await loader.loadFromUrl(source);
          if (result.preview && onPreview) {
            onPreview(result.preview);
          }
          if (result.full) {
            baseEditor.loadImageData(result.full);
          }
        } else {
          const result = await loader.loadFromFile(source);
          if (result.preview && onPreview) {
            onPreview(result.preview);
          }
          if (result.full) {
            baseEditor.loadImageData(result.full);
          }
        }
      } catch {
        await baseEditor.loadImage(source);
      }
    },
    [baseEditor]
  );

  // Batch adjustments using worker
  const applyAdjustmentsBatch = useCallback(
    async (adjustments: Partial<ImageAdjustments>): Promise<void> => {
      const { originalImageData } = baseEditor.state;
      if (!originalImageData) return;

      const fullAdjustments: ImageAdjustments = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        blur: 0,
        sharpen: 0,
        ...adjustments,
      };

      const result = await processWithBestMethod(
        'adjustments-batch',
        () => workerProcessor.processAdjustments(originalImageData, fullAdjustments),
        () => {
          const gl = glProcessorRef.current!;
          return gl.processAdjustments(originalImageData, {
            brightness: fullAdjustments.brightness,
            contrast: fullAdjustments.contrast,
            saturation: fullAdjustments.saturation,
            hue: fullAdjustments.hue,
          });
        },
        () => {
          // Simple main thread fallback
          const data = new Uint8ClampedArray(originalImageData.data);
          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Brightness
            if (fullAdjustments.brightness) {
              const brightness = fullAdjustments.brightness * 2.55;
              r = Math.min(255, Math.max(0, r + brightness));
              g = Math.min(255, Math.max(0, g + brightness));
              b = Math.min(255, Math.max(0, b + brightness));
            }

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }
          return new ImageData(data, originalImageData.width, originalImageData.height);
        }
      );

      baseEditor.putImageData(result);
    },
    [baseEditor, processWithBestMethod, workerProcessor]
  );

  // Memoized return value
  return useMemo(
    () => ({
      ...baseEditor,

      // Performance
      isWorkerReady: workerProcessor.isReady,
      isWebGLSupported,
      lastOperationDuration,

      // Advanced adjustments
      applyLevels: applyLevelsAdjustment,
      applyCurves: applyCurvesAdjustment,
      applyHSL: applyHSLAdjustment,
      applyNoiseReduction: applyNoiseReductionAdjustment,
      applySharpen: applySharpenAdjustment,
      applyClarity: applyClarityAdjustment,
      applyDehaze: applyDehazeAdjustment,

      // Histogram
      getHistogram,

      // Progressive loading
      loadImageProgressive,

      // Batch adjustments
      applyAdjustmentsBatch,
    }),
    [
      baseEditor,
      workerProcessor.isReady,
      isWebGLSupported,
      lastOperationDuration,
      applyLevelsAdjustment,
      applyCurvesAdjustment,
      applyHSLAdjustment,
      applyNoiseReductionAdjustment,
      applySharpenAdjustment,
      applyClarityAdjustment,
      applyDehazeAdjustment,
      getHistogram,
      loadImageProgressive,
      applyAdjustmentsBatch,
    ]
  );
}

export default useEnhancedImageEditor;
