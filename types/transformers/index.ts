/**
 * Transformers.js type definitions
 * Browser-based ML model inference via @huggingface/transformers
 */

/**
 * Supported Transformers.js pipeline tasks
 */
export type TransformersTask =
  | 'text-classification'
  | 'feature-extraction'
  | 'translation'
  | 'summarization'
  | 'text-generation'
  | 'text2text-generation'
  | 'fill-mask'
  | 'question-answering'
  | 'zero-shot-classification'
  | 'token-classification'
  | 'automatic-speech-recognition'
  | 'image-classification'
  | 'object-detection'
  | 'image-to-text'
  | 'text-to-speech'
  | 'image-segmentation'
  | 'depth-estimation'
  | 'sentence-similarity';

/**
 * Execution device
 */
export type TransformersDevice = 'wasm' | 'webgpu';

/**
 * Model quantization / data type
 */
export type TransformersDtype = 'fp32' | 'fp16' | 'q8' | 'q4';

/**
 * Manager/worker error codes for normalized error handling.
 */
export type TransformersErrorCode =
  | 'worker_unavailable'
  | 'manager_disposed'
  | 'request_timeout'
  | 'worker_runtime_error'
  | 'invalid_request'
  | 'runtime_unavailable';

/**
 * Worker runtime cache policy propagated from UI/store settings.
 */
export interface TransformersCachePolicy {
  enabled: boolean;
  maxCachedModels: number;
}

/**
 * Unified execution options used by manager methods.
 */
export interface TransformersExecutionOptions {
  device?: TransformersDevice;
  dtype?: TransformersDtype;
  timeoutMs?: number;
  cachePolicy?: Partial<TransformersCachePolicy>;
}

/**
 * Configuration for a single model
 */
export interface TransformersModelConfig {
  task: TransformersTask;
  modelId: string;
  device?: TransformersDevice;
  dtype?: TransformersDtype;
  quantized?: boolean;
}

/**
 * Global Transformers.js settings
 */
export interface TransformersSettings {
  enabled: boolean;
  preferWebGPU: boolean;
  defaultDtype: TransformersDtype;
  cacheModels: boolean;
  maxCachedModels: number;
}

/**
 * Model download progress event
 */
export interface ModelDownloadProgress {
  task: TransformersTask;
  modelId: string;
  status: 'initiating' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number;
  loaded?: number;
  total?: number;
  file?: string;
  error?: string;
}

/**
 * Model state in store
 */
export interface TransformersModelState {
  cacheKey: string;
  modelId: string;
  task: TransformersTask;
  status: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number;
  error?: string;
  loadedAt?: number;
  lastUsedAt?: number;
  hitCount?: number;
}

/**
 * Loaded model metadata returned by worker status endpoint.
 */
export interface TransformersLoadedModelInfo {
  cacheKey: string;
  task: TransformersTask;
  modelId: string;
  loadedAt: number;
  lastUsedAt: number;
  hitCount: number;
}

export interface TransformersWorkerStatusData {
  loadedModels: TransformersLoadedModelInfo[];
  count: number;
  cache: {
    enabled: boolean;
    maxCachedModels: number;
    currentCachedModels: number;
  };
}

/**
 * Worker message types (main → worker)
 */
export type TransformersWorkerMessageType = 'load' | 'infer' | 'dispose' | 'status';

export interface TransformersWorkerLoadRequest {
  id: string;
  type: 'load';
  payload: {
    task: TransformersTask;
    modelId: string;
    device?: TransformersDevice;
    dtype?: TransformersDtype;
    cachePolicy?: Partial<TransformersCachePolicy>;
  };
}

export interface TransformersWorkerInferRequest {
  id: string;
  type: 'infer';
  payload: {
    task: TransformersTask;
    modelId: string;
    input: unknown;
    options?: TransformersInferenceOptions;
    device?: TransformersDevice;
    dtype?: TransformersDtype;
    cachePolicy?: Partial<TransformersCachePolicy>;
  };
}

export interface TransformersWorkerDisposeRequest {
  id: string;
  type: 'dispose';
  payload: {
    task?: TransformersTask;
    modelId?: string;
  };
}

export interface TransformersWorkerStatusRequest {
  id: string;
  type: 'status';
  payload: Record<string, never>;
}

/**
 * Worker request message
 */
export type TransformersWorkerRequest =
  | TransformersWorkerLoadRequest
  | TransformersWorkerInferRequest
  | TransformersWorkerDisposeRequest
  | TransformersWorkerStatusRequest;

/**
 * Worker response types
 */
export type TransformersWorkerResponseType = 'progress' | 'result' | 'error' | 'status' | 'loaded';

interface TransformersWorkerBaseResponse {
  id: string;
  duration?: number;
}

export interface TransformersWorkerProgressResponse extends TransformersWorkerBaseResponse {
  type: 'progress';
  progress: ModelDownloadProgress;
}

export interface TransformersWorkerLoadedResponse extends TransformersWorkerBaseResponse {
  type: 'loaded';
  data: { task: TransformersTask; modelId: string };
}

export interface TransformersWorkerResultResponse extends TransformersWorkerBaseResponse {
  type: 'result';
  data: unknown;
}

export interface TransformersWorkerStatusResponse extends TransformersWorkerBaseResponse {
  type: 'status';
  data: TransformersWorkerStatusData;
}

export interface TransformersWorkerErrorResponse extends TransformersWorkerBaseResponse {
  type: 'error';
  error: string;
  errorCode?: TransformersErrorCode;
}

/**
 * Worker response message
 */
export type TransformersWorkerResponse =
  | TransformersWorkerProgressResponse
  | TransformersWorkerLoadedResponse
  | TransformersWorkerResultResponse
  | TransformersWorkerStatusResponse
  | TransformersWorkerErrorResponse;

/**
 * Inference options
 */
export interface TransformersInferenceOptions {
  topK?: number;
  temperature?: number;
  maxNewTokens?: number;
  maxLength?: number;
  language?: string;
  task?: string;
  returnTimestamps?: boolean;
  candidateLabels?: string[];
  hypothesis_template?: string;
}

/**
 * Inference result
 */
export interface TransformersInferenceResult {
  task: TransformersTask;
  modelId: string;
  output: unknown;
  duration: number;
}

/**
 * Embedding result from feature-extraction
 */
export interface TransformersEmbeddingResult {
  embedding: number[];
  modelId: string;
  dimension: number;
  duration: number;
}

/**
 * Batch embedding result
 */
export interface TransformersBatchEmbeddingResult {
  embeddings: number[][];
  modelId: string;
  dimension: number;
  duration: number;
}

/**
 * Model size categories for UI display
 */
export type ModelSize = 'tiny' | 'small' | 'medium' | 'large';

/**
 * Pipeline output tensor-like structure (from @huggingface/transformers)
 */
export interface PipelineTensorOutput {
  data?: Float32Array | number[];
  dims?: number[];
  tolist?: () => unknown;
}

export function buildTransformersModelCacheKey(task: TransformersTask, modelId: string): string {
  return `${task}::${modelId}`;
}
