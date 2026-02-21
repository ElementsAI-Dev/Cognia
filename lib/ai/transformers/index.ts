/**
 * Transformers.js - Browser-based ML inference
 *
 * Provides in-browser model inference via Web Workers using @huggingface/transformers.
 * Supports text classification, embeddings, translation, summarization, and more.
 */

export {
  TransformersManager,
  getTransformersManager,
  isWebGPUAvailable,
  isWebWorkerAvailable,
} from './transformers-manager';

export {
  RECOMMENDED_MODELS,
  DEFAULT_TASK_MODELS,
  TRANSFORMERS_EMBEDDING_MODELS,
  TASK_DISPLAY_NAMES,
  getModelInfo,
  getModelsForTask,
  getAvailableTasks,
  type TransformersModelInfo,
  type TransformersEmbeddingModelId,
  type ModelSize,
} from './models';

export {
  resolveTransformersDevice,
  resolveTransformersDtype,
  resolveTransformersRuntimeOptions,
  mapTransformersProgressStatus,
  syncTransformersManagerRuntime,
  type TransformersRuntimeResolvedOptions,
} from './runtime-adapter';
