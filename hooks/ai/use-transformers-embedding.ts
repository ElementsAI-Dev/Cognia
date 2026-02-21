'use client';

/**
 * useTransformersEmbedding - Specialized hook for browser-based embedding generation.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  TransformersDevice,
  TransformersDtype,
  TransformersEmbeddingResult,
  TransformersBatchEmbeddingResult,
  ModelDownloadProgress,
} from '@/types/transformers';
import { useTransformersStore } from '@/stores/ai/transformers-store';
import {
  isWebGPUAvailable,
  isWebWorkerAvailable,
  TRANSFORMERS_EMBEDDING_MODELS,
  resolveTransformersRuntimeOptions,
  syncTransformersManagerRuntime,
  mapTransformersProgressStatus,
} from '@/lib/ai/transformers';
import type { TransformersEmbeddingModelId } from '@/lib/ai/transformers';

export interface UseTransformersEmbeddingOptions {
  modelId?: TransformersEmbeddingModelId | string;
  device?: TransformersDevice;
  dtype?: TransformersDtype;
  autoLoad?: boolean;
  onProgress?: (progress: ModelDownloadProgress) => void;
}

export interface UseTransformersEmbeddingReturn {
  embed: (text: string) => Promise<TransformersEmbeddingResult>;
  embedBatch: (texts: string[]) => Promise<TransformersBatchEmbeddingResult>;
  loadModel: () => Promise<void>;
  dispose: () => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
  isEmbedding: boolean;
  progress: number;
  error: string | null;
  dimension: number;
  isSupported: boolean;
}

const DEFAULT_EMBEDDING_MODEL: TransformersEmbeddingModelId = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_TASK = 'feature-extraction' as const;

export function useTransformersEmbedding(
  options: UseTransformersEmbeddingOptions = {}
): UseTransformersEmbeddingReturn {
  const {
    modelId = DEFAULT_EMBEDDING_MODEL,
    device,
    dtype,
    autoLoad = false,
    onProgress,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const managerRef = useRef<import('@/lib/ai/transformers/transformers-manager').TransformersManager | null>(null);

  const { settings, setModelStatus, updateModelProgress, isModelReady, setWebGPUAvailable } =
    useTransformersStore();

  const isReady = isModelReady(EMBEDDING_TASK, modelId);
  const isSupported = isWebWorkerAvailable();

  const dimension =
    (TRANSFORMERS_EMBEDDING_MODELS as Record<string, { dimensions: number }>)[modelId]?.dimensions ?? 384;

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
      if (p.task === EMBEDDING_TASK && p.modelId === modelId) {
        setModelStatus(EMBEDDING_TASK, modelId, mapTransformersProgressStatus(p.status), p.progress, p.error);
      }
      onProgress?.(p);
    },
    [modelId, onProgress, setModelStatus, updateModelProgress]
  );

  const loadModel = useCallback(async () => {
    if (!isSupported || !settings.enabled) {
      setError('Transformers.js is not enabled or not supported');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setModelStatus(EMBEDDING_TASK, modelId, 'downloading', 0);

    try {
      const manager = await getManager();
      await manager.loadModel(EMBEDDING_TASK, modelId, {
        device: runtime.device,
        dtype: runtime.dtype,
        cachePolicy: runtime.cachePolicy,
        onProgress: handleProgress,
      });
      setModelStatus(EMBEDDING_TASK, modelId, 'ready', 100);
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setModelStatus(EMBEDDING_TASK, modelId, 'error', 0, message);
    } finally {
      setIsLoading(false);
    }
  }, [getManager, handleProgress, isSupported, modelId, runtime.cachePolicy, runtime.device, runtime.dtype, setModelStatus, settings.enabled]);

  useEffect(() => {
    if (autoLoad && settings.enabled && isSupported && !isReady && !isLoading) {
      loadModel();
    }
  }, [autoLoad, settings.enabled, isSupported, isReady, isLoading, loadModel]);

  const embed = useCallback(
    async (text: string): Promise<TransformersEmbeddingResult> => {
      if (!isSupported || !settings.enabled) {
        throw new Error('Transformers.js is not enabled or not supported');
      }

      setIsEmbedding(true);
      setError(null);

      try {
        const manager = await getManager();
        const result = await manager.generateEmbedding(text, modelId, {
          device: runtime.device,
          dtype: runtime.dtype,
          cachePolicy: runtime.cachePolicy,
          onProgress: handleProgress,
        });
        setModelStatus(EMBEDDING_TASK, modelId, 'ready', 100);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsEmbedding(false);
      }
    },
    [getManager, handleProgress, isSupported, modelId, runtime.cachePolicy, runtime.device, runtime.dtype, setModelStatus, settings.enabled]
  );

  const embedBatch = useCallback(
    async (texts: string[]): Promise<TransformersBatchEmbeddingResult> => {
      if (!isSupported || !settings.enabled) {
        throw new Error('Transformers.js is not enabled or not supported');
      }

      setIsEmbedding(true);
      setError(null);

      try {
        const manager = await getManager();
        const result = await manager.generateEmbeddings(texts, modelId, {
          device: runtime.device,
          dtype: runtime.dtype,
          cachePolicy: runtime.cachePolicy,
          onProgress: handleProgress,
        });
        setModelStatus(EMBEDDING_TASK, modelId, 'ready', 100);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsEmbedding(false);
      }
    },
    [getManager, handleProgress, isSupported, modelId, runtime.cachePolicy, runtime.device, runtime.dtype, setModelStatus, settings.enabled]
  );

  const dispose = useCallback(async () => {
    try {
      const manager = await getManager();
      await manager.dispose(EMBEDDING_TASK, modelId);
      setModelStatus(EMBEDDING_TASK, modelId, 'idle', 0);
    } catch (err) {
      console.error('Failed to dispose embedding model:', err);
    }
  }, [getManager, modelId, setModelStatus]);

  return {
    embed,
    embedBatch,
    loadModel,
    dispose,
    isLoading,
    isReady,
    isEmbedding,
    progress,
    error,
    dimension,
    isSupported,
  };
}

export default useTransformersEmbedding;
