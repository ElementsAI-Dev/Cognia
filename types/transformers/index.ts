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
  modelId: string;
  task: TransformersTask;
  status: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number;
  error?: string;
  loadedAt?: number;
}

/**
 * Worker message types (main → worker)
 */
export type TransformersWorkerMessageType = 'load' | 'infer' | 'dispose' | 'status';

/**
 * Worker request message
 */
export interface TransformersWorkerRequest {
  id: string;
  type: TransformersWorkerMessageType;
  payload: {
    task?: TransformersTask;
    modelId?: string;
    input?: unknown;
    options?: TransformersInferenceOptions;
    device?: TransformersDevice;
    dtype?: TransformersDtype;
  };
}

/**
 * Worker response types
 */
export type TransformersWorkerResponseType = 'progress' | 'result' | 'error' | 'status' | 'loaded';

/**
 * Worker response message
 */
export interface TransformersWorkerResponse {
  id: string;
  type: TransformersWorkerResponseType;
  data?: unknown;
  error?: string;
  progress?: ModelDownloadProgress;
  duration?: number;
}

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
