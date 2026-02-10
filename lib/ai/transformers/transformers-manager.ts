/**
 * Transformers.js Manager
 * Manages Web Worker lifecycle and provides a Promise-based API for browser ML inference.
 * All model loading and inference runs in a dedicated Web Worker thread.
 */

import type {
  TransformersTask,
  TransformersDevice,
  TransformersDtype,
  TransformersInferenceOptions,
  TransformersWorkerRequest,
  TransformersWorkerResponse,
  ModelDownloadProgress,
  TransformersInferenceResult,
  TransformersEmbeddingResult,
  TransformersBatchEmbeddingResult,
} from '@/types/transformers';

type ProgressCallback = (progress: ModelDownloadProgress) => void;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  progressCallback?: ProgressCallback;
  startTime: number;
}

/**
 * Check if WebGPU is available in the current browser
 */
export function isWebGPUAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'gpu' in navigator;
}

/**
 * Check if Web Workers are available
 */
export function isWebWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined';
}

let instance: TransformersManager | null = null;

/**
 * TransformersManager - singleton manager for browser ML inference
 */
export class TransformersManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounter = 0;
  private globalProgressCallback: ProgressCallback | null = null;
  private isDisposed = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TransformersManager {
    if (!instance) {
      instance = new TransformersManager();
    }
    return instance;
  }

  /**
   * Set global progress callback for all model downloads
   */
  setProgressCallback(callback: ProgressCallback | null): void {
    this.globalProgressCallback = callback;
  }

  /**
   * Initialize the Web Worker
   */
  private ensureWorker(): Worker {
    if (this.isDisposed) {
      throw new Error('TransformersManager has been disposed');
    }

    if (!this.worker) {
      if (!isWebWorkerAvailable()) {
        throw new Error('Web Workers are not available in this environment');
      }

      this.worker = new Worker(
        new URL('./worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.addEventListener('message', this.handleMessage.bind(this));
      this.worker.addEventListener('error', this.handleError.bind(this));
    }

    return this.worker;
  }

  /**
   * Generate unique request ID
   */
  private nextId(): string {
    return `tfjs_${++this.requestCounter}_${Date.now()}`;
  }

  /**
   * Handle messages from worker
   */
  private handleMessage(event: MessageEvent<TransformersWorkerResponse>): void {
    const { id, type, data, error, progress, duration } = event.data;

    // Progress events: forward to callbacks
    if (type === 'progress' && progress) {
      const pending = this.pendingRequests.get(id);
      pending?.progressCallback?.(progress);
      this.globalProgressCallback?.(progress);
      return;
    }

    const pending = this.pendingRequests.get(id);
    if (!pending) return;

    if (type === 'error') {
      pending.reject(new Error(error || 'Unknown worker error'));
    } else {
      pending.resolve({ data, duration, type });
    }

    this.pendingRequests.delete(id);
  }

  /**
   * Handle worker errors
   */
  private handleError(event: ErrorEvent): void {
    console.error('Transformers Worker error:', event.message);
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error(`Worker error: ${event.message}`));
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Send a message to the worker and wait for response
   */
  private sendMessage(
    request: Omit<TransformersWorkerRequest, 'id'>,
    progressCallback?: ProgressCallback
  ): Promise<{ data: unknown; duration?: number; type: string }> {
    const id = this.nextId();
    const worker = this.ensureWorker();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        progressCallback,
        startTime: performance.now(),
      });

      worker.postMessage({ ...request, id });
    });
  }

  /**
   * Load a model into the worker
   */
  async loadModel(
    task: TransformersTask,
    modelId: string,
    options?: {
      device?: TransformersDevice;
      dtype?: TransformersDtype;
      onProgress?: ProgressCallback;
    }
  ): Promise<{ task: TransformersTask; modelId: string; duration: number }> {
    const result = await this.sendMessage(
      {
        type: 'load',
        payload: {
          task,
          modelId,
          device: options?.device,
          dtype: options?.dtype,
        },
      },
      options?.onProgress
    );

    return {
      task,
      modelId,
      duration: result.duration ?? 0,
    };
  }

  /**
   * Run inference on a model
   */
  async infer(
    task: TransformersTask,
    modelId: string,
    input: unknown,
    options?: {
      inferenceOptions?: TransformersInferenceOptions;
      device?: TransformersDevice;
      dtype?: TransformersDtype;
      onProgress?: ProgressCallback;
    }
  ): Promise<TransformersInferenceResult> {
    const result = await this.sendMessage(
      {
        type: 'infer',
        payload: {
          task,
          modelId,
          input,
          options: options?.inferenceOptions,
          device: options?.device,
          dtype: options?.dtype,
        },
      },
      options?.onProgress
    );

    return {
      task,
      modelId,
      output: result.data,
      duration: result.duration ?? 0,
    };
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    modelId: string = 'Xenova/all-MiniLM-L6-v2',
    options?: {
      device?: TransformersDevice;
      dtype?: TransformersDtype;
      onProgress?: ProgressCallback;
    }
  ): Promise<TransformersEmbeddingResult> {
    const startTime = performance.now();

    const result = await this.infer(
      'feature-extraction',
      modelId,
      text,
      {
        inferenceOptions: {},
        device: options?.device,
        dtype: options?.dtype,
        onProgress: options?.onProgress,
      }
    );

    // feature-extraction returns nested arrays: [[embedding]]
    // We need to extract the first (and only) embedding and mean-pool
    const rawOutput = result.output;
    const embedding = extractEmbedding(rawOutput);
    const duration = performance.now() - startTime;

    return {
      embedding,
      modelId,
      dimension: embedding.length,
      duration,
    };
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(
    texts: string[],
    modelId: string = 'Xenova/all-MiniLM-L6-v2',
    options?: {
      device?: TransformersDevice;
      dtype?: TransformersDtype;
      onProgress?: ProgressCallback;
    }
  ): Promise<TransformersBatchEmbeddingResult> {
    const startTime = performance.now();
    const embeddings: number[][] = [];

    // Process texts sequentially to avoid overwhelming the worker
    for (const text of texts) {
      const result = await this.generateEmbedding(text, modelId, options);
      embeddings.push(result.embedding);
    }

    const duration = performance.now() - startTime;
    const dimension = embeddings[0]?.length ?? 0;

    return {
      embeddings,
      modelId,
      dimension,
      duration,
    };
  }

  /**
   * Dispose a specific model or all models
   */
  async dispose(task?: TransformersTask, modelId?: string): Promise<void> {
    if (!this.worker) return;

    await this.sendMessage({
      type: 'dispose',
      payload: { task, modelId },
    });
  }

  /**
   * Get status of loaded models
   */
  async getStatus(): Promise<{ loadedModels: { task: string; modelId: string }[]; count: number }> {
    if (!this.worker) {
      return { loadedModels: [], count: 0 };
    }

    const result = await this.sendMessage({
      type: 'status',
      payload: {},
    });

    return result.data as { loadedModels: { task: string; modelId: string }[]; count: number };
  }

  /**
   * Terminate the worker and clean up
   */
  terminate(): void {
    this.isDisposed = true;

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error('Manager terminated'));
      this.pendingRequests.delete(id);
    }

    this.globalProgressCallback = null;
    instance = null;
  }
}

/**
 * Extract a 1D embedding vector from the pipeline output.
 * feature-extraction pipeline returns Tensor objects or nested arrays.
 * We perform mean pooling across the token dimension.
 */
function extractEmbedding(output: unknown): number[] {
  // Handle Tensor-like objects with .data and .dims
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = output as any;

  // If it has a tolist() method (Tensor), use it
  if (out && typeof out.tolist === 'function') {
    const list = out.tolist();
    // Result shape is [1, seq_len, hidden_dim] — mean pool over seq_len
    if (Array.isArray(list) && Array.isArray(list[0]) && Array.isArray(list[0][0])) {
      return meanPool(list[0]);
    }
    if (Array.isArray(list) && Array.isArray(list[0]) && typeof list[0][0] === 'number') {
      return list[0] as number[];
    }
    return list as number[];
  }

  // If it's a typed array with dims metadata
  if (out && out.data && out.dims) {
    const data = Array.from(out.data as Float32Array);
    const dims = out.dims as number[];

    if (dims.length === 3) {
      // [batch=1, seq_len, hidden_dim]
      const seqLen = dims[1];
      const hiddenDim = dims[2];
      const tokenEmbeddings: number[][] = [];
      for (let i = 0; i < seqLen; i++) {
        tokenEmbeddings.push(data.slice(i * hiddenDim, (i + 1) * hiddenDim));
      }
      return meanPool(tokenEmbeddings);
    }
    if (dims.length === 2) {
      // [batch=1, hidden_dim] — already pooled
      return data.slice(0, dims[1]);
    }
    return data;
  }

  // Nested arrays fallback
  if (Array.isArray(out)) {
    if (Array.isArray(out[0]) && Array.isArray(out[0][0])) {
      return meanPool(out[0]);
    }
    if (Array.isArray(out[0]) && typeof out[0][0] === 'number') {
      return out[0] as number[];
    }
    return out as number[];
  }

  throw new Error('Unable to extract embedding from pipeline output');
}

/**
 * Mean pooling over token dimension: [seq_len, hidden_dim] → [hidden_dim]
 */
function meanPool(tokenEmbeddings: number[][]): number[] {
  if (tokenEmbeddings.length === 0) return [];
  const dim = tokenEmbeddings[0].length;
  const result = new Array(dim).fill(0);

  for (const token of tokenEmbeddings) {
    for (let i = 0; i < dim; i++) {
      result[i] += token[i];
    }
  }

  const len = tokenEmbeddings.length;
  for (let i = 0; i < dim; i++) {
    result[i] /= len;
  }

  return result;
}

/**
 * Convenience function to get the singleton manager
 */
export function getTransformersManager(): TransformersManager {
  return TransformersManager.getInstance();
}
