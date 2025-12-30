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
 */
/**
 * AI Module - Unified AI SDK exports
 */

export * from './client';
export * from './provider-registry';
export * from './proxy-client';
export * from './middleware';

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
