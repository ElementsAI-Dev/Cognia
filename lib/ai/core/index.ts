/**
 * Core AI module - Client, providers, registry, and middleware
 */

export * from '../core/client';
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
