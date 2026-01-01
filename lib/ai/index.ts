/**
 * AI module exports
 * 
 * This module provides unified AI functionality using Vercel AI SDK:
 * - Multi-provider client support (OpenAI, Anthropic, Google, etc.)
 * - Provider registry for intelligent routing
 * - Middleware for caching, retry, reasoning extraction
 * - Structured output generation
 * - RAG (Retrieval Augmented Generation)
 * - Agent execution with tool calling
 * - Image generation and processing
 * - Rate limiting and caching
 * - Sequential generation workflows
 * 
 * Based on AI SDK v5+ best practices
 */

export * from './client';
export * from './provider-registry';
export * from './proxy-client';
export * from './middleware';

// AI Registry - unified provider management with model aliases
export {
  createAIRegistry,
  initializeDefaultRegistry,
  getDefaultRegistry,
  isRegistryInitialized,
  MODEL_ALIASES,
  type AIRegistry,
  type AIRegistryConfig,
  type ModelAliasConfig,
} from './ai-registry';

// Cache Middleware - response caching with simulateReadableStream
export {
  createCacheMiddleware,
  createSimpleCacheMiddleware,
  createIndexedDBCacheStore,
  generateCacheKey,
  getDefaultCacheStore,
  setDefaultCacheStore,
  type CacheMiddlewareOptions,
  // Note: CacheStore and createInMemoryCacheStore are also in middleware.ts
  // Using cache-middleware versions as they have more features
} from './cache-middleware';

// Rate Limiting
export * from './rate-limit';

// Sequential Generations
export * from './sequential';

// Image Generation (SDK-compatible)
export {
  generateImageWithSDK,
  generateImagesBatchWithSDK,
  getAvailableImageModels as getSDKAvailableImageModels,
  validateSizeForModel as validateSDKSizeForModel,
  base64ToDataURL,
  uint8ArrayToBlob,
  downloadImage as downloadSDKImage,
  estimateImageCost as estimateSDKImageCost,
  ImageGenerationError,
  DEFAULT_IMAGE_MODELS,
  MODEL_SUPPORTED_SIZES,
  type SDKImageGenerationOptions,
  type SDKGeneratedImage,
  type SDKImageGenerationResult,
  type ImageProviderType,
  type ImageSizeOption,
  type AspectRatioOption,
  type ImageQualityOption,
  type ImageStyleOption,
} from './image-generation-sdk';

// Telemetry
export {
  createTelemetryConfig,
  toExperimentalTelemetry,
  createInMemoryTelemetryCollector,
  createConsoleTelemetryCollector,
  calculateMetrics,
  getDefaultTelemetryCollector,
  setDefaultTelemetryCollector,
  TELEMETRY_PRESETS,
  type TelemetryConfig,
  type TelemetryCollector,
  type TelemetrySpan,
  type TelemetrySpanData,
  type TelemetryEvent,
  type TelemetryMetrics,
} from './telemetry';

// Embedding Utilities
export {
  embed,
  embedMany,
  cosineSimilarity,
  embedBatch,
  findSimilar,
  calculateSimilarityMatrix,
  clusterBySimilarity,
  normalizeEmbedding,
  euclideanDistance,
  dotProduct,
  averageEmbeddings,
  createInMemoryEmbeddingCache,
  EMBEDDING_MODELS,
  type EmbeddingResult,
  type BatchEmbeddingResult,
  type SimilarityResult,
  type EmbeddingCache,
  type BatchEmbedOptions,
} from './embedding-utils';

// Tool Utilities
export {
  tool,
  createTool,
  simpleTool,
  combineTools,
  withRateLimit as withToolRateLimit,
  withCache as withToolCache,
  hasApprovalRequests,
  extractApprovalRequests,
  createApprovalResponses,
  ToolRegistry,
  getDefaultToolRegistry,
  CommonSchemas,
  type EnhancedToolDefinition,
  type ToolApprovalRequest,
  type ToolApprovalResponse,
  type ToolCategory,
  type ToolMetadata,
} from './tool-utils';

// Chat and generation
export * from './use-ai-chat';
export * from './auto-router';
export * from './structured-output';
export * from './translate';
export * from './prompt-optimizer';
export * from './suggestion-generator';
export * from './canvas-actions';

// RAG and embeddings
export * from './embedding';
export * from './chunking';
export * from './rag';

// Image processing
// Note: image-utils exports isVisionModel and buildMultimodalContent which also exist in client
// We prefer the image-utils versions as they have more complete implementations
export {
  fileToBase64,
  urlToBase64,
  extractBase64,
  isImageFile,
  isVisionModel,
  resizeImageIfNeeded,
  buildMultimodalContent,
  type ImageContent,
  type TextContent,
  type MessageContent,
} from './image-utils';
export * from './image-generation';

// Video generation
export * from './video-generation';

// Agent system
export * from './agent';

// Utilities
export * from './api-test';
export * from './api-key-rotation';
export * from './oauth';
