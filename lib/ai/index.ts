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

// Core - Client, providers, registry, middleware
export * from './core';

// Providers - Ollama, OpenRouter, OAuth
export * from './providers';

// Generation - Chat, structured output, summarization
export * from './generation';

// Embedding - Embeddings, chunking, compression
export * from './embedding';

// Media - Image, video, speech
export * from './media';

// Infrastructure - Rate limiting, caching, telemetry
export * from './infrastructure';

// Tools
export * from './tools';

// RAG
export * from './rag';

// Memory
export * from './memory';

// Agent system
export * from './agent';

// Workflows
export * from './workflows';
