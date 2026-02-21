/**
 * TTS (Text-to-Speech) module exports
 * Provides multi-provider TTS functionality with caching and streaming support
 */

// Core service
export * from './tts-service';

// Providers
export * from './providers/system-tts';
export * from './providers/openai-tts';
export * from './providers/gemini-tts';
export * from './providers/edge-tts';
export * from './providers/elevenlabs-tts';
export * from './providers/lmnt-tts';
export * from './providers/hume-tts';
export * from './providers/cartesia-tts';
export * from './providers/deepgram-tts';

// Caching
export * from './tts-cache';

// Text utilities
export * from './tts-text-utils';

// Streaming
export * from './tts-streaming';

// Orchestration + settings adapter
export * from './tts-orchestrator';
export * from './speech-settings-adapter';
