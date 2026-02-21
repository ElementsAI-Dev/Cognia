'use client';

/**
 * useTransformers - React hook for browser-based ML inference via Transformers.js
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
import {
  isWebGPUAvailable,
  isWebWorkerAvailable,
  DEFAULT_TASK_MODELS,
  resolveTransformersRuntimeOptions,
  syncTransformersManagerRuntime,
  mapTransformersProgressStatus,
} from '@/lib/ai/transformers';

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

  const { settings, setModelStatus, updateModelProgress, isModelReady, setWebGPUAvailable } =
    useTransformersStore();

  const modelId = initialModelId ?? DEFAULT_TASK_MODELS[task] ?? `Xenova/${task}`;
  const modelReady = isModelReady(task, modelId);
  const isSupported = isWebWorkerAvailable();

  const runtime = resolveTransformersRuntimeOptions(settings, { device, dtype });

  useEffect(() => {
    setWebGPUAvailable(isWebGPUAvailable());
  }, [setWebGPUAvailable]);

  const getManager = useCallback(async () => {
    if (!managerRef.current) {
      const { getTransformersManager } = await import('@/lib/ai/transformers/transformers-manager');
      managerRef.current = getTransformersManager();
    }

    syncTransformersManagerRuntime(managerRef.current, settings);
    return managerRef.current;
  }, [settings]);

  useEffect(() => {
    if (managerRef.current) {
      syncTransformersManagerRuntime(managerRef.current, settings);
    }
  }, [settings]);

  const handleProgress = useCallback(
    (p: ModelDownloadProgress) => {
      setProgress(p.progress);
      updateModelProgress(p);
      if (p.task === task && p.modelId === modelId) {
        setModelStatus(task, modelId, mapTransformersProgressStatus(p.status), p.progress, p.error);
      }
      onProgress?.(p);
    },
    [modelId, onProgress, setModelStatus, task, updateModelProgress]
  );

  const loadModel = useCallback(async () => {
    if (!isSupported || !settings.enabled) {
      setError('Transformers.js is not enabled or not supported');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setModelStatus(task, modelId, 'downloading', 0);

    try {
      const manager = await getManager();
      await manager.loadModel(task, modelId, {
        device: runtime.device,
        dtype: runtime.dtype,
        cachePolicy: runtime.cachePolicy,
        onProgress: handleProgress,
      });
      setModelStatus(task, modelId, 'ready', 100);
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setModelStatus(task, modelId, 'error', 0, message);
    } finally {
      setIsLoading(false);
    }
  }, [getManager, handleProgress, isSupported, modelId, runtime.cachePolicy, runtime.device, runtime.dtype, setModelStatus, settings.enabled, task]);

  useEffect(() => {
    if (autoLoad && settings.enabled && isSupported && !modelReady && !isLoading) {
      loadModel();
    }
  }, [autoLoad, settings.enabled, isSupported, modelReady, isLoading, loadModel]);

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
          inferenceOptions,
          device: runtime.device,
          dtype: runtime.dtype,
          cachePolicy: runtime.cachePolicy,
          onProgress: handleProgress,
          autoLoad: true,
        });

        setModelStatus(task, modelId, 'ready', 100);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsInferring(false);
      }
    },
    [getManager, handleProgress, isSupported, modelId, runtime.cachePolicy, runtime.device, runtime.dtype, setModelStatus, settings.enabled, task]
  );

  const dispose = useCallback(async () => {
    try {
      const manager = await getManager();
      await manager.dispose(task, modelId);
      setModelStatus(task, modelId, 'idle', 0);
    } catch (err) {
      console.error('Failed to dispose model:', err);
    }
  }, [getManager, modelId, setModelStatus, task]);

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
