/// <reference lib="webworker" />

/**
 * Transformers.js Web Worker
 * Runs ML model inference off the main thread using @huggingface/transformers pipeline API.
 * Uses Singleton pattern per task+model combination to avoid redundant model loading.
 */

import { pipeline, env } from '@huggingface/transformers';

// Disable local model checks in browser
env.allowLocalModels = false;

// Pipeline cache: key = `${task}::${modelId}`
const pipelineCache = new Map<string, unknown>();

// Track loading promises to avoid duplicate loads
const loadingPromises = new Map<string, Promise<unknown>>();

function getCacheKey(task: string, modelId: string): string {
  return `${task}::${modelId}`;
}

/**
 * Get or create a pipeline instance (singleton per task+model)
 */
async function getPipeline(
  task: string,
  modelId: string,
  options: {
    device?: string;
    dtype?: string;
    requestId?: string;
  } = {}
): Promise<unknown> {
  const key = getCacheKey(task, modelId);

  // Return cached pipeline
  if (pipelineCache.has(key)) {
    return pipelineCache.get(key)!;
  }

  // If already loading, wait for existing promise
  if (loadingPromises.has(key)) {
    return loadingPromises.get(key)!;
  }

  // Start loading
  const loadPromise = (async () => {
    try {
      const pipelineOptions: Record<string, unknown> = {};

      if (options.device) {
        pipelineOptions.device = options.device;
      }

      if (options.dtype) {
        pipelineOptions.dtype = options.dtype;
      }

      // Progress callback for model download
      pipelineOptions.progress_callback = (progress: {
        status: string;
        file?: string;
        progress?: number;
        loaded?: number;
        total?: number;
      }) => {
        self.postMessage({
          id: options.requestId || '',
          type: 'progress',
          progress: {
            modelId,
            status: progress.status === 'ready' ? 'ready' : progress.status === 'done' ? 'ready' : 'downloading',
            progress: progress.progress ?? 0,
            loaded: progress.loaded,
            total: progress.total,
            file: progress.file,
          },
        });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pipe = await (pipeline as any)(task, modelId, pipelineOptions);
      pipelineCache.set(key, pipe);
      return pipe;
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
async function disposePipeline(task: string, modelId: string): Promise<void> {
  const key = getCacheKey(task, modelId);
  const pipe = pipelineCache.get(key);
  if (pipe) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (pipe as any).dispose === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (pipe as any).dispose();
    }
    pipelineCache.delete(key);
  }
}

/**
 * Run inference on a loaded pipeline
 */
async function runInference(
  task: string,
  modelId: string,
  input: unknown,
  options: Record<string, unknown> = {}
): Promise<unknown> {
  const pipe = await getPipeline(task, modelId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (pipe as any)(input, options);
  return result;
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', async (event: MessageEvent) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'load': {
        const { task, modelId, device, dtype } = payload;
        if (!task || !modelId) {
          throw new Error('task and modelId are required for load');
        }

        const startTime = performance.now();
        await getPipeline(task, modelId, { device, dtype, requestId: id });
        const duration = performance.now() - startTime;

        self.postMessage({
          id,
          type: 'loaded',
          data: { task, modelId },
          duration,
        });
        break;
      }

      case 'infer': {
        const { task, modelId, input, options: inferOptions, device, dtype } = payload;
        if (!task || !modelId) {
          throw new Error('task and modelId are required for infer');
        }

        // Ensure model is loaded
        await getPipeline(task, modelId, { device, dtype, requestId: id });

        const startTime = performance.now();
        const result = await runInference(task, modelId, input, inferOptions || {});
        const duration = performance.now() - startTime;

        self.postMessage({
          id,
          type: 'result',
          data: result,
          duration,
        });
        break;
      }

      case 'dispose': {
        const { task: disposeTask, modelId: disposeModelId } = payload;
        if (disposeTask && disposeModelId) {
          await disposePipeline(disposeTask, disposeModelId);
        } else {
          // Dispose all
          for (const [key, pipe] of pipelineCache.entries()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof (pipe as any).dispose === 'function') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (pipe as any).dispose();
            }
            pipelineCache.delete(key);
          }
        }

        self.postMessage({
          id,
          type: 'result',
          data: { disposed: true },
        });
        break;
      }

      case 'status': {
        const loadedModels = Array.from(pipelineCache.keys()).map((key) => {
          const [task, modelId] = key.split('::');
          return { task, modelId };
        });

        self.postMessage({
          id,
          type: 'status',
          data: { loadedModels, count: loadedModels.length },
        });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
