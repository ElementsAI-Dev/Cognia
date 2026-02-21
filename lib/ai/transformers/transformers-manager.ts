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
  PipelineTensorOutput,
  TransformersCachePolicy,
  TransformersErrorCode,
  TransformersSettings,
  TransformersWorkerStatusData,
} from '@/types/transformers';
import { buildTransformersModelCacheKey } from '@/types/transformers';

type ProgressCallback = (progress: ModelDownloadProgress) => void;

type TransformersWorkerSuccessResponse = Exclude<TransformersWorkerResponse, { type: 'progress' | 'error' }>;

const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_EMBEDDING_BATCH_SIZE = 16;

export class TransformersManagerError extends Error {
  readonly code: TransformersErrorCode;
  readonly cause?: unknown;

  constructor(message: string, code: TransformersErrorCode, cause?: unknown) {
    super(message);
    this.name = 'TransformersManagerError';
    this.code = code;
    this.cause = cause;
  }
}

export interface TransformersManagerRuntimeSettings {
  cacheModels: boolean;
  maxCachedModels: number;
  requestTimeoutMs: number;
  embeddingBatchSize: number;
}

export interface TransformersLoadOptions {
  device?: TransformersDevice;
  dtype?: TransformersDtype;
  timeoutMs?: number;
  cachePolicy?: Partial<TransformersCachePolicy>;
  onProgress?: ProgressCallback;
}

export interface TransformersInferOptions {
  inferenceOptions?: TransformersInferenceOptions;
  device?: TransformersDevice;
  dtype?: TransformersDtype;
  timeoutMs?: number;
  autoLoad?: boolean;
  cachePolicy?: Partial<TransformersCachePolicy>;
  onProgress?: ProgressCallback;
}

export interface TransformersEmbeddingOptions {
  device?: TransformersDevice;
  dtype?: TransformersDtype;
  timeoutMs?: number;
  batchSize?: number;
  cachePolicy?: Partial<TransformersCachePolicy>;
  onProgress?: ProgressCallback;
  onBatchComplete?: (batch: {
    batchIndex: number;
    totalBatches: number;
    processed: number;
    total: number;
  }) => void;
}

interface PendingRequest {
  resolve: (value: TransformersWorkerSuccessResponse) => void;
  reject: (reason: unknown) => void;
  progressCallback?: ProgressCallback;
  timeoutHandle: ReturnType<typeof setTimeout>;
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
  private knownLoadedModelKeys = new Set<string>();
  private manuallyLoadedModelKeys = new Set<string>();

  private runtimeSettings: TransformersManagerRuntimeSettings = {
    cacheModels: true,
    maxCachedModels: 5,
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    embeddingBatchSize: DEFAULT_EMBEDDING_BATCH_SIZE,
  };

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

  setRuntimeSettings(settings: Partial<TransformersManagerRuntimeSettings>): void {
    this.runtimeSettings = {
      ...this.runtimeSettings,
      ...settings,
    };
  }

  syncFromTransformersSettings(settings: Pick<TransformersSettings, 'cacheModels' | 'maxCachedModels'>): void {
    this.setRuntimeSettings({
      cacheModels: settings.cacheModels,
      maxCachedModels: settings.maxCachedModels,
    });
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
      throw new TransformersManagerError('TransformersManager has been disposed', 'manager_disposed');
    }

    if (!this.worker) {
      if (!isWebWorkerAvailable()) {
        throw new TransformersManagerError(
          'Web Workers are not available in this environment',
          'worker_unavailable'
        );
      }

      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
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

  private makeCachePolicy(overrides?: Partial<TransformersCachePolicy>): Partial<TransformersCachePolicy> {
    return {
      enabled: overrides?.enabled ?? this.runtimeSettings.cacheModels,
      maxCachedModels: overrides?.maxCachedModels ?? this.runtimeSettings.maxCachedModels,
    };
  }

  /**
   * Handle messages from worker
   */
  private handleMessage(event: MessageEvent<TransformersWorkerResponse>): void {
    const message = event.data;

    if (message.type === 'progress') {
      const pending = this.pendingRequests.get(message.id);
      pending?.progressCallback?.(message.progress);
      this.globalProgressCallback?.(message.progress);
      return;
    }

    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutHandle);

    if (message.type === 'error') {
      pending.reject(
        new TransformersManagerError(
          message.error,
          message.errorCode || 'worker_runtime_error'
        )
      );
    } else {
      pending.resolve(message);
    }

    this.pendingRequests.delete(message.id);
  }

  /**
   * Handle worker errors
   */
  private handleError(event: ErrorEvent): void {
    const error = new TransformersManagerError(`Worker error: ${event.message}`, 'worker_runtime_error', event);

    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Send a message to the worker and wait for response
   */
  private sendMessage(
    request: Omit<TransformersWorkerRequest, 'id'>,
    options?: {
      progressCallback?: ProgressCallback;
      timeoutMs?: number;
    }
  ): Promise<TransformersWorkerSuccessResponse> {
    const id = this.nextId();
    const worker = this.ensureWorker();
    const timeoutMs = options?.timeoutMs ?? this.runtimeSettings.requestTimeoutMs;

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new TransformersManagerError(`Request timed out after ${timeoutMs}ms`, 'request_timeout'));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        progressCallback: options?.progressCallback,
        timeoutHandle,
      });

      worker.postMessage({ ...request, id });
    });
  }

  private markModelLoaded(task: TransformersTask, modelId: string, manual: boolean): void {
    const key = buildTransformersModelCacheKey(task, modelId);
    this.knownLoadedModelKeys.add(key);
    if (manual) {
      this.manuallyLoadedModelKeys.add(key);
    }
  }

  private markModelUnloaded(task: TransformersTask, modelId: string): void {
    const key = buildTransformersModelCacheKey(task, modelId);
    this.knownLoadedModelKeys.delete(key);
    this.manuallyLoadedModelKeys.delete(key);
  }

  /**
   * Load a model into the worker
   */
  async loadModel(
    task: TransformersTask,
    modelId: string,
    options?: TransformersLoadOptions & { markAsManual?: boolean }
  ): Promise<{ task: TransformersTask; modelId: string; duration: number }> {
    const response = await this.sendMessage(
      {
        type: 'load',
        payload: {
          task,
          modelId,
          device: options?.device,
          dtype: options?.dtype,
          cachePolicy: this.makeCachePolicy(options?.cachePolicy),
        },
      },
      {
        progressCallback: options?.onProgress,
        timeoutMs: options?.timeoutMs,
      }
    );

    if (response.type !== 'loaded') {
      throw new TransformersManagerError(
        `Unexpected worker response type for load: ${response.type}`,
        'worker_runtime_error'
      );
    }

    this.markModelLoaded(task, modelId, options?.markAsManual ?? true);

    return {
      task,
      modelId,
      duration: response.duration ?? 0,
    };
  }

  /**
   * Run inference on a model
   */
  async infer(
    task: TransformersTask,
    modelId: string,
    input: unknown,
    options?: TransformersInferOptions
  ): Promise<TransformersInferenceResult> {
    const autoLoad = options?.autoLoad ?? true;
    const cacheKey = buildTransformersModelCacheKey(task, modelId);

    if (!this.knownLoadedModelKeys.has(cacheKey) && autoLoad) {
      await this.loadModel(task, modelId, {
        device: options?.device,
        dtype: options?.dtype,
        timeoutMs: options?.timeoutMs,
        cachePolicy: options?.cachePolicy,
        onProgress: options?.onProgress,
        markAsManual: false,
      });
    }

    if (!this.knownLoadedModelKeys.has(cacheKey) && !autoLoad) {
      throw new TransformersManagerError(
        `Model is not loaded: ${task}/${modelId}`,
        'invalid_request'
      );
    }

    const response = await this.sendMessage(
      {
        type: 'infer',
        payload: {
          task,
          modelId,
          input,
          options: options?.inferenceOptions,
          device: options?.device,
          dtype: options?.dtype,
          cachePolicy: this.makeCachePolicy(options?.cachePolicy),
        },
      },
      {
        progressCallback: options?.onProgress,
        timeoutMs: options?.timeoutMs,
      }
    );

    if (response.type !== 'result') {
      throw new TransformersManagerError(
        `Unexpected worker response type for infer: ${response.type}`,
        'worker_runtime_error'
      );
    }

    this.markModelLoaded(task, modelId, false);

    return {
      task,
      modelId,
      output: response.data,
      duration: response.duration ?? 0,
    };
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    modelId: string = 'Xenova/all-MiniLM-L6-v2',
    options?: TransformersEmbeddingOptions
  ): Promise<TransformersEmbeddingResult> {
    const startTime = performance.now();

    const result = await this.infer('feature-extraction', modelId, text, {
      inferenceOptions: {},
      device: options?.device,
      dtype: options?.dtype,
      timeoutMs: options?.timeoutMs,
      cachePolicy: options?.cachePolicy,
      onProgress: options?.onProgress,
      autoLoad: true,
    });

    const embeddings = extractEmbeddings(result.output);
    const embedding = embeddings[0];
    const duration = performance.now() - startTime;

    if (!embedding) {
      throw new TransformersManagerError('Unable to extract embedding from pipeline output', 'worker_runtime_error');
    }

    return {
      embedding,
      modelId,
      dimension: embedding.length,
      duration,
    };
  }

  /**
   * Generate embeddings for multiple texts (batched)
   */
  async generateEmbeddings(
    texts: string[],
    modelId: string = 'Xenova/all-MiniLM-L6-v2',
    options?: TransformersEmbeddingOptions
  ): Promise<TransformersBatchEmbeddingResult> {
    const startTime = performance.now();
    const embeddings: number[][] = [];

    if (texts.length === 0) {
      return {
        embeddings,
        modelId,
        dimension: 0,
        duration: 0,
      };
    }

    const batchSize = Math.max(1, Math.floor(options?.batchSize ?? this.runtimeSettings.embeddingBatchSize));
    const totalBatches = Math.ceil(texts.length / batchSize);

    for (let i = 0, batchIndex = 0; i < texts.length; i += batchSize, batchIndex += 1) {
      const batchTexts = texts.slice(i, i + batchSize);

      const batchResult = await this.infer('feature-extraction', modelId, batchTexts, {
        inferenceOptions: {},
        device: options?.device,
        dtype: options?.dtype,
        timeoutMs: options?.timeoutMs,
        cachePolicy: options?.cachePolicy,
        onProgress: options?.onProgress,
        autoLoad: true,
      });

      const parsed = extractEmbeddings(batchResult.output);
      if (parsed.length !== batchTexts.length) {
        // Fallback to single inference for shape-incompatible outputs.
        for (const text of batchTexts) {
          const single = await this.generateEmbedding(text, modelId, options);
          embeddings.push(single.embedding);
        }
      } else {
        embeddings.push(...parsed);
      }

      const progress = Math.round(((i + batchTexts.length) / texts.length) * 100);
      options?.onProgress?.({
        task: 'feature-extraction',
        modelId,
        status: 'loading',
        progress,
      });
      options?.onBatchComplete?.({
        batchIndex,
        totalBatches,
        processed: i + batchTexts.length,
        total: texts.length,
      });
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
  async dispose(task?: TransformersTask, modelId?: string, timeoutMs?: number): Promise<void> {
    if (!this.worker) {
      return;
    }

    const response = await this.sendMessage(
      {
        type: 'dispose',
        payload: { task, modelId },
      },
      { timeoutMs }
    );

    if (response.type !== 'result') {
      throw new TransformersManagerError(
        `Unexpected worker response type for dispose: ${response.type}`,
        'worker_runtime_error'
      );
    }

    if (task && modelId) {
      this.markModelUnloaded(task, modelId);
    } else {
      this.knownLoadedModelKeys.clear();
      this.manuallyLoadedModelKeys.clear();
    }
  }

  async disposeAll(timeoutMs?: number): Promise<void> {
    await this.dispose(undefined, undefined, timeoutMs);
  }

  /**
   * Get status of loaded models
   */
  async getStatus(timeoutMs?: number): Promise<TransformersWorkerStatusData> {
    if (!this.worker) {
      return {
        loadedModels: [],
        count: 0,
        cache: {
          enabled: this.runtimeSettings.cacheModels,
          maxCachedModels: this.runtimeSettings.maxCachedModels,
          currentCachedModels: 0,
        },
      };
    }

    const response = await this.sendMessage(
      {
        type: 'status',
        payload: {},
      },
      { timeoutMs }
    );

    if (response.type !== 'status') {
      throw new TransformersManagerError(
        `Unexpected worker response type for status: ${response.type}`,
        'worker_runtime_error'
      );
    }

    this.knownLoadedModelKeys = new Set(response.data.loadedModels.map((model) => model.cacheKey));

    return response.data;
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
      clearTimeout(pending.timeoutHandle);
      pending.reject(new TransformersManagerError('Manager terminated', 'manager_disposed'));
      this.pendingRequests.delete(id);
    }

    this.globalProgressCallback = null;
    this.knownLoadedModelKeys.clear();
    this.manuallyLoadedModelKeys.clear();
    instance = null;
  }
}

function toNumberArray(values: unknown[]): number[] {
  return values.map((value) => Number(value));
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

function isMatrix(value: unknown): value is number[][] {
  return Array.isArray(value) && value.every((row) => isNumberArray(row));
}

function meanPool(tokenEmbeddings: number[][]): number[] {
  if (tokenEmbeddings.length === 0) {
    return [];
  }

  const dim = tokenEmbeddings[0].length;
  const result = new Array(dim).fill(0);

  for (const token of tokenEmbeddings) {
    for (let i = 0; i < dim; i += 1) {
      result[i] += token[i];
    }
  }

  for (let i = 0; i < dim; i += 1) {
    result[i] /= tokenEmbeddings.length;
  }

  return result;
}

function parseEmbeddingArray(value: unknown): number[][] {
  if (isNumberArray(value)) {
    return [value];
  }

  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  if (isMatrix(value)) {
    return [meanPool(value)];
  }

  if (Array.isArray(value[0]) && isMatrix(value[0])) {
    return (value as unknown[]).map((item) => meanPool(item as number[][]));
  }

  if (Array.isArray(value[0]) && isNumberArray(value[0])) {
    return value as number[][];
  }

  return [];
}

/**
 * Extract embedding vectors from feature-extraction outputs.
 */
function extractEmbeddings(output: unknown): number[][] {
  const out = output as PipelineTensorOutput | unknown[];

  if (out && typeof (out as PipelineTensorOutput).tolist === 'function') {
    const list = (out as PipelineTensorOutput).tolist?.();
    return parseEmbeddingArray(list);
  }

  const tensor = out as PipelineTensorOutput;
  if (tensor && tensor.data && tensor.dims) {
    const data = Array.from(tensor.data as Float32Array | number[]);
    const dims = tensor.dims;

    if (dims.length === 3) {
      const [batchSize, seqLen, hiddenDim] = dims;
      const result: number[][] = [];

      for (let batch = 0; batch < batchSize; batch += 1) {
        const start = batch * seqLen * hiddenDim;
        const tokens: number[][] = [];
        for (let tokenIndex = 0; tokenIndex < seqLen; tokenIndex += 1) {
          const tokenStart = start + tokenIndex * hiddenDim;
          tokens.push(toNumberArray(data.slice(tokenStart, tokenStart + hiddenDim)));
        }
        result.push(meanPool(tokens));
      }

      return result;
    }

    if (dims.length === 2) {
      const [batchSize, hiddenDim] = dims;
      const result: number[][] = [];
      for (let batch = 0; batch < batchSize; batch += 1) {
        const start = batch * hiddenDim;
        result.push(toNumberArray(data.slice(start, start + hiddenDim)));
      }
      return result;
    }

    if (dims.length === 1) {
      return [toNumberArray(data)];
    }
  }

  return parseEmbeddingArray(output);
}

/**
 * Convenience function to get the singleton manager
 */
export function getTransformersManager(): TransformersManager {
  return TransformersManager.getInstance();
}
