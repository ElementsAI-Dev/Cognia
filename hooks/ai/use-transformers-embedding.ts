'use client';

/**
 * useTransformersEmbedding - Specialized hook for browser-based embedding generation
 *
 * Wraps TransformersManager.generateEmbedding() with React state management.
 * Can be used as a drop-in replacement for cloud embedding providers (no API key needed).
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
import { isWebGPUAvailable, isWebWorkerAvailable, TRANSFORMERS_EMBEDDING_MODELS } from '@/lib/ai/transformers';
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

  const isReady = isModelReady(modelId);
  const isSupported = isWebWorkerAvailable();

  // Get dimension for the model
  const dimension =
    (TRANSFORMERS_EMBEDDING_MODELS as Record<string, { dimensions: number }>)[modelId]?.dimensions ?? 384;

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

  const resolvedDevice = device ?? (settings.preferWebGPU && isWebGPUAvailable() ? 'webgpu' : 'wasm');
  const resolvedDtype = dtype ?? settings.defaultDtype;

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
    setModelStatus(modelId, 'feature-extraction', 'downloading', 0);

    try {
      const manager = await getManager();
      await manager.loadModel('feature-extraction', modelId, {
        device: resolvedDevice,
        dtype: resolvedDtype,
        onProgress: handleProgress,
      });
      setModelStatus(modelId, 'feature-extraction', 'ready', 100);
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setModelStatus(modelId, 'feature-extraction', 'error', 0, message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, settings.enabled, modelId, resolvedDevice, resolvedDtype, getManager, handleProgress, setModelStatus]);

  // Auto-load
  useEffect(() => {
    if (autoLoad && settings.enabled && isSupported && !isReady && !isLoading) {
      loadModel();
    }
  }, [autoLoad, settings.enabled, isSupported, isReady, isLoading, loadModel]);

  // Embed single text
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
        setIsEmbedding(false);
      }
    },
    [isSupported, settings.enabled, modelId, resolvedDevice, resolvedDtype, getManager, handleProgress]
  );

  // Embed batch
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
        setIsEmbedding(false);
      }
    },
    [isSupported, settings.enabled, modelId, resolvedDevice, resolvedDtype, getManager, handleProgress]
  );

  // Dispose
  const dispose = useCallback(async () => {
    try {
      const manager = await getManager();
      await manager.dispose('feature-extraction', modelId);
      setModelStatus(modelId, 'feature-extraction', 'idle', 0);
    } catch (err) {
      console.error('Failed to dispose embedding model:', err);
    }
  }, [modelId, getManager, setModelStatus]);

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
