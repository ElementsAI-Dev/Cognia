/// <reference lib="webworker" />

/**
 * Transformers.js Web Worker
 * Runs ML model inference off the main thread using @huggingface/transformers pipeline API.
 * Uses singleton caching per task+model with cache policy controls.
 */

import { pipeline, env } from '@huggingface/transformers';
import type {
  TransformersCachePolicy,
  TransformersErrorCode,
  TransformersLoadedModelInfo,
  TransformersWorkerRequest,
  TransformersWorkerResponse,
  TransformersTask,
} from '@/types/transformers';
import { buildTransformersModelCacheKey } from '@/types/transformers';

// Disable local model checks in browser
env.allowLocalModels = false;

type PipelineProgressEvent = {
  status?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

type PipelineCallable = ((input: unknown, options?: Record<string, unknown>) => Promise<unknown>) & {
  dispose?: () => Promise<void> | void;
};

interface CachedPipelineEntry {
  pipeline: PipelineCallable;
  metadata: TransformersLoadedModelInfo;
}

interface PipelineRequestOptions {
  device?: string;
  dtype?: string;
  requestId: string;
  cachePolicy?: Partial<TransformersCachePolicy>;
}

class WorkerRuntimeError extends Error {
  readonly code: TransformersErrorCode;

  constructor(message: string, code: TransformersErrorCode) {
    super(message);
    this.name = 'WorkerRuntimeError';
    this.code = code;
  }
}

const defaultCachePolicy: TransformersCachePolicy = {
  enabled: true,
  maxCachedModels: 5,
};

let activeCachePolicy: TransformersCachePolicy = { ...defaultCachePolicy };

// Pipeline cache: key = `${task}::${modelId}`
const pipelineCache = new Map<string, CachedPipelineEntry>();

// Track loading promises to avoid duplicate loads
const loadingPromises = new Map<string, Promise<CachedPipelineEntry>>();

const pipelineFactory = pipeline as unknown as (
  task: string,
  modelId: string,
  options: Record<string, unknown>
) => Promise<unknown>;

function getCacheKey(task: TransformersTask, modelId: string): string {
  return buildTransformersModelCacheKey(task, modelId);
}

function normalizeCachePolicy(policy?: Partial<TransformersCachePolicy>): TransformersCachePolicy {
  const maxCachedModels = policy?.maxCachedModels;
  return {
    enabled: policy?.enabled ?? activeCachePolicy.enabled,
    maxCachedModels:
      typeof maxCachedModels === 'number' && Number.isFinite(maxCachedModels) && maxCachedModels > 0
        ? Math.floor(maxCachedModels)
        : activeCachePolicy.maxCachedModels,
  };
}

function setActiveCachePolicy(policy?: Partial<TransformersCachePolicy>): void {
  activeCachePolicy = normalizeCachePolicy(policy);
}

function asPipelineCallable(value: unknown): PipelineCallable {
  if (typeof value !== 'function') {
    throw new WorkerRuntimeError('Loaded pipeline is not callable', 'worker_runtime_error');
  }
  return value as PipelineCallable;
}

function touchEntry(entry: CachedPipelineEntry): void {
  entry.metadata.lastUsedAt = Date.now();
  entry.metadata.hitCount += 1;
}

async function disposeEntry(key: string, entry: CachedPipelineEntry): Promise<void> {
  if (typeof entry.pipeline.dispose === 'function') {
    await entry.pipeline.dispose();
  }
  pipelineCache.delete(key);
}

async function enforceCachePolicy(exemptKey?: string): Promise<void> {
  if (!activeCachePolicy.enabled) {
    const entries = Array.from(pipelineCache.entries());
    for (const [key, entry] of entries) {
      if (key === exemptKey) {
        continue;
      }
      await disposeEntry(key, entry);
    }
    return;
  }

  while (pipelineCache.size > activeCachePolicy.maxCachedModels) {
    const lru = Array.from(pipelineCache.entries())
      .filter(([key]) => key !== exemptKey)
      .sort((a, b) => a[1].metadata.lastUsedAt - b[1].metadata.lastUsedAt)[0];

    if (!lru) {
      break;
    }

    await disposeEntry(lru[0], lru[1]);
  }
}

function normalizeProgressStatus(status?: string): 'downloading' | 'ready' {
  if (!status) {
    return 'downloading';
  }
  if (status === 'ready' || status === 'done') {
    return 'ready';
  }
  return 'downloading';
}

function postMessage(message: TransformersWorkerResponse): void {
  self.postMessage(message);
}

function postError(id: string, error: unknown, fallbackCode: TransformersErrorCode = 'worker_runtime_error'): void {
  const parsed =
    error instanceof WorkerRuntimeError
      ? { message: error.message, code: error.code }
      : error instanceof Error
        ? { message: error.message, code: fallbackCode }
        : { message: String(error), code: fallbackCode };

  postMessage({
    id,
    type: 'error',
    error: parsed.message,
    errorCode: parsed.code,
  });
}

/**
 * Get or create a pipeline instance (singleton per task+model)
 */
async function getPipeline(task: TransformersTask, modelId: string, options: PipelineRequestOptions): Promise<CachedPipelineEntry> {
  setActiveCachePolicy(options.cachePolicy);

  const key = getCacheKey(task, modelId);

  // Return cached pipeline
  const cached = pipelineCache.get(key);
  if (cached) {
    touchEntry(cached);
    return cached;
  }

  // If already loading, wait for existing promise
  const existingLoad = loadingPromises.get(key);
  if (existingLoad) {
    const entry = await existingLoad;
    touchEntry(entry);
    return entry;
  }

  // Start loading
  const loadPromise = (async (): Promise<CachedPipelineEntry> => {
    try {
      const pipelineOptions: Record<string, unknown> = {};

      if (options.device) {
        pipelineOptions.device = options.device;
      }

      if (options.dtype) {
        pipelineOptions.dtype = options.dtype;
      }

      // Progress callback for model download
      pipelineOptions.progress_callback = (progress: PipelineProgressEvent) => {
        postMessage({
          id: options.requestId,
          type: 'progress',
          progress: {
            task,
            modelId,
            status: normalizeProgressStatus(progress.status),
            progress: progress.progress ?? 0,
            loaded: progress.loaded,
            total: progress.total,
            file: progress.file,
          },
        });
      };

      const loadedPipeline = await pipelineFactory(task, modelId, pipelineOptions);
      const callablePipeline = asPipelineCallable(loadedPipeline);
      const now = Date.now();

      const entry: CachedPipelineEntry = {
        pipeline: callablePipeline,
        metadata: {
          cacheKey: getCacheKey(task, modelId),
          task,
          modelId,
          loadedAt: now,
          lastUsedAt: now,
          hitCount: 0,
        },
      };

      touchEntry(entry);
      pipelineCache.set(key, entry);
      await enforceCachePolicy(key);
      return entry;
    } finally {
      loadingPromises.delete(key);
    }
  })();

  loadingPromises.set(key, loadPromise);
  return loadPromise;
}

/**
 * Dispose a specific pipeline
 */
async function disposePipeline(task: TransformersTask, modelId: string): Promise<void> {
  const key = getCacheKey(task, modelId);
  const entry = pipelineCache.get(key);
  if (!entry) {
    return;
  }
  await disposeEntry(key, entry);
}

/**
 * Run inference on a loaded pipeline
 */
async function runInference(
  task: TransformersTask,
  modelId: string,
  input: unknown,
  options: Record<string, unknown>,
  requestOptions: PipelineRequestOptions
): Promise<unknown> {
  const entry = await getPipeline(task, modelId, requestOptions);
  touchEntry(entry);
  return entry.pipeline(input, options);
}

function parseRequest(eventData: unknown): TransformersWorkerRequest {
  const payload = eventData as Partial<TransformersWorkerRequest> | undefined;
  if (!payload || typeof payload !== 'object') {
    throw new WorkerRuntimeError('Invalid worker message payload', 'invalid_request');
  }
  if (!payload.id || typeof payload.id !== 'string') {
    throw new WorkerRuntimeError('Worker request id is required', 'invalid_request');
  }
  if (!payload.type || typeof payload.type !== 'string') {
    throw new WorkerRuntimeError('Worker request type is required', 'invalid_request');
  }
  return payload as TransformersWorkerRequest;
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', async (event: MessageEvent) => {
  let requestId = '';
  try {
    const request = parseRequest(event.data);
    requestId = request.id;

    switch (request.type) {
      case 'load': {
        const { task, modelId, device, dtype, cachePolicy } = request.payload;
        if (!task || !modelId) {
          throw new WorkerRuntimeError('task and modelId are required for load', 'invalid_request');
        }

        const startTime = performance.now();
        await getPipeline(task, modelId, { device, dtype, requestId, cachePolicy });
        const duration = performance.now() - startTime;

        postMessage({
          id: requestId,
          type: 'loaded',
          data: { task, modelId },
          duration,
        });
        break;
      }

      case 'infer': {
        const { task, modelId, input, options: inferOptions, device, dtype, cachePolicy } = request.payload;
        if (!task || !modelId) {
          throw new WorkerRuntimeError('task and modelId are required for infer', 'invalid_request');
        }

        const startTime = performance.now();
        const inferenceOptions = (inferOptions ?? {}) as Record<string, unknown>;
        const result = await runInference(task, modelId, input, inferenceOptions, {
          device,
          dtype,
          requestId,
          cachePolicy,
        });
        const duration = performance.now() - startTime;

        postMessage({
          id: requestId,
          type: 'result',
          data: result,
          duration,
        });
        break;
      }

      case 'dispose': {
        const { task, modelId } = request.payload;

        if (task && modelId) {
          await disposePipeline(task, modelId);
        } else {
          const entries = Array.from(pipelineCache.entries());
          for (const [key, entry] of entries) {
            await disposeEntry(key, entry);
          }
        }

        postMessage({
          id: requestId,
          type: 'result',
          data: { disposed: true },
        });
        break;
      }

      case 'status': {
        const loadedModels = Array.from(pipelineCache.values()).map((entry) => ({ ...entry.metadata }));

        postMessage({
          id: requestId,
          type: 'status',
          data: {
            loadedModels,
            count: loadedModels.length,
            cache: {
              enabled: activeCachePolicy.enabled,
              maxCachedModels: activeCachePolicy.maxCachedModels,
              currentCachedModels: loadedModels.length,
            },
          },
        });
        break;
      }

      default: {
        const unknownType = (request as { type: string }).type;
        throw new WorkerRuntimeError(`Unknown message type: ${String(unknownType)}`, 'invalid_request');
      }
    }
  } catch (error) {
    postError(requestId, error);
  }
});
