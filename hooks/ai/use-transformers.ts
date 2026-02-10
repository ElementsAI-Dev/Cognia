'use client';

/**
 * useTransformers - React hook for browser-based ML inference via Transformers.js
 *
 * Manages Web Worker lifecycle, model loading, inference, and progress tracking.
 * All heavy computation runs off the main thread.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  TransformersTask,
  TransformersDevice,
  TransformersDtype,
  TransformersInferenceOptions,
  TransformersInferenceResult,
  ModelDownloadProgress,
} from '@/types/transformers';
import { useTransformersStore } from '@/stores/ai/transformers-store';
import { isWebGPUAvailable, isWebWorkerAvailable, DEFAULT_TASK_MODELS } from '@/lib/ai/transformers';

export interface UseTransformersOptions {
  task: TransformersTask;
  modelId?: string;
  device?: TransformersDevice;
  dtype?: TransformersDtype;
  autoLoad?: boolean;
  onProgress?: (progress: ModelDownloadProgress) => void;
}

export interface UseTransformersReturn {
  infer: (input: unknown, options?: TransformersInferenceOptions) => Promise<TransformersInferenceResult>;
  loadModel: () => Promise<void>;
  dispose: () => Promise<void>;
  isLoading: boolean;
  isModelReady: boolean;
  isInferring: boolean;
  progress: number;
  error: string | null;
  isSupported: boolean;
}

export function useTransformers(options: UseTransformersOptions): UseTransformersReturn {
  const { task, modelId: initialModelId, device, dtype, autoLoad = false, onProgress } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isInferring, setIsInferring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const managerRef = useRef<import('@/lib/ai/transformers/transformers-manager').TransformersManager | null>(null);
  const abortRef = useRef(false);

  const { settings, setModelStatus, updateModelProgress, isModelReady, setWebGPUAvailable } =
    useTransformersStore();

  // Resolve model ID from defaults if not provided
  const modelId = initialModelId ?? DEFAULT_TASK_MODELS[task] ?? `Xenova/${task}`;
  const modelReady = isModelReady(modelId);

  const isSupported = isWebWorkerAvailable();

  // Check WebGPU on mount
  useEffect(() => {
    setWebGPUAvailable(isWebGPUAvailable());
  }, [setWebGPUAvailable]);

  // Get or create manager (lazy)
  const getManager = useCallback(async () => {
    if (!managerRef.current) {
      const { getTransformersManager } = await import('@/lib/ai/transformers/transformers-manager');
      managerRef.current = getTransformersManager();
    }
    return managerRef.current;
  }, []);

  // Resolve device
  const resolvedDevice = device ?? (settings.preferWebGPU && isWebGPUAvailable() ? 'webgpu' : 'wasm');
  const resolvedDtype = dtype ?? settings.defaultDtype;

  // Progress handler
  const handleProgress = useCallback(
    (p: ModelDownloadProgress) => {
      setProgress(p.progress);
      updateModelProgress(p);
      onProgress?.(p);
    },
    [updateModelProgress, onProgress]
  );

  // Load model
  const loadModel = useCallback(async () => {
    if (!isSupported || !settings.enabled) {
      setError('Transformers.js is not enabled or not supported');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setModelStatus(modelId, task, 'downloading', 0);

    try {
      const manager = await getManager();
      await manager.loadModel(task, modelId, {
        device: resolvedDevice,
        dtype: resolvedDtype,
        onProgress: handleProgress,
      });
      setModelStatus(modelId, task, 'ready', 100);
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setModelStatus(modelId, task, 'error', 0, message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, settings.enabled, modelId, task, resolvedDevice, resolvedDtype, getManager, handleProgress, setModelStatus]);

  // Auto-load if enabled
  useEffect(() => {
    if (autoLoad && settings.enabled && isSupported && !modelReady && !isLoading) {
      loadModel();
    }
  }, [autoLoad, settings.enabled, isSupported, modelReady, isLoading, loadModel]);

  // Run inference
  const infer = useCallback(
    async (input: unknown, inferenceOptions?: TransformersInferenceOptions): Promise<TransformersInferenceResult> => {
      if (!isSupported || !settings.enabled) {
        throw new Error('Transformers.js is not enabled or not supported');
      }

      setIsInferring(true);
      setError(null);

      try {
        const manager = await getManager();
        const result = await manager.infer(task, modelId, input, {
          inferenceOptions: inferenceOptions,
          device: resolvedDevice,
          dtype: resolvedDtype,
          onProgress: handleProgress,
        });

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsInferring(false);
      }
    },
    [isSupported, settings.enabled, task, modelId, resolvedDevice, resolvedDtype, getManager, handleProgress]
  );

  // Dispose model
  const dispose = useCallback(async () => {
    try {
      const manager = await getManager();
      await manager.dispose(task, modelId);
      setModelStatus(modelId, task, 'idle', 0);
    } catch (err) {
      console.error('Failed to dispose model:', err);
    }
  }, [task, modelId, getManager, setModelStatus]);

  // Cleanup on unmount
  useEffect(() => {
    abortRef.current = false;
    return () => {
      abortRef.current = true;
    };
  }, []);

  return {
    infer,
    loadModel,
    dispose,
    isLoading,
    isModelReady: modelReady,
    isInferring,
    progress,
    error,
    isSupported,
  };
}

export default useTransformers;
