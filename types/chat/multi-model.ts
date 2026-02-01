/**
 * Multi-model chat types for Arena mode in chat page
 * Supports parallel execution of multiple AI models
 */

import type { ProviderName } from '../provider/provider';

/**
 * Arena model configuration for multi-model chat
 */
export interface ArenaModelConfig {
  /** Unique model instance ID */
  id: string;
  /** Provider name */
  provider: ProviderName;
  /** Model identifier */
  model: string;
  /** Display name for UI */
  displayName: string;
  /** Column index (0-3) */
  columnIndex: number;
  /** Theme color (optional) */
  color?: string;
}

/**
 * Multi-model session configuration
 */
export interface MultiModelConfig {
  /** Whether multi-model mode is enabled */
  enabled: boolean;
  /** Selected models (2-4) */
  models: ArenaModelConfig[];
  /** Layout mode */
  layout: 'columns' | 'tabs';
  /** Sync scroll across columns */
  syncScroll: boolean;
  /** Show performance metrics */
  showMetrics: boolean;
}

/**
 * Column message state for each model
 */
export interface ColumnMessageState {
  /** Model instance ID */
  modelId: string;
  /** Current status */
  status: 'pending' | 'streaming' | 'completed' | 'error';
  /** Response content */
  content: string;
  /** Error message if failed */
  error?: string;
  /** Performance metrics */
  metrics?: ColumnMetrics;
}

/**
 * Performance metrics for a column
 */
export interface ColumnMetrics {
  /** Response latency in milliseconds */
  latencyMs: number;
  /** Token counts */
  tokenCount: {
    input: number;
    output: number;
    total: number;
  };
  /** Estimated cost in USD */
  estimatedCost?: number;
}

/**
 * Multi-model message containing responses from all models
 */
export interface MultiModelMessage {
  /** Unique message ID */
  id: string;
  /** User input (shared across all models) */
  userContent: string;
  /** Responses from each model */
  columns: ColumnMessageState[];
  /** Creation timestamp */
  createdAt: Date;
  /** Voted winner model ID (if voted) */
  votedModelId?: string;
  /** Whether declared as tie */
  isTie?: boolean;
  /** Vote reason */
  voteReason?: string;
}

/**
 * Default multi-model configuration
 */
export const DEFAULT_MULTI_MODEL_CONFIG: MultiModelConfig = {
  enabled: false,
  models: [],
  layout: 'columns',
  syncScroll: true,
  showMetrics: true,
};

/**
 * Maximum number of models in multi-model mode
 */
export const MAX_MULTI_MODELS = 4;

/**
 * Minimum number of models required for multi-model mode
 */
export const MIN_MULTI_MODELS = 2;
