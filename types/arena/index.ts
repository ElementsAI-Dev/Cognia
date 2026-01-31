/**
 * Arena Types - Types for the Chat Arena feature
 * Enables multi-model comparison and preference-based routing optimization
 */

import type { ProviderName } from '../provider/provider';
import type { TaskCategory, TaskClassification } from '../provider/auto-router';

/**
 * Status of an arena contestant
 */
export type ArenaContestantStatus = 'pending' | 'streaming' | 'completed' | 'error' | 'cancelled';

/**
 * Reason for selecting a winner
 */
export type ArenaWinReason = 
  | 'quality'      // Better overall quality
  | 'accuracy'     // More accurate/correct
  | 'clarity'      // Clearer explanation
  | 'speed'        // Faster response
  | 'completeness' // More comprehensive
  | 'creativity'   // More creative/innovative
  | 'conciseness'  // More concise
  | 'other';       // Other reason

/**
 * Arena battle mode
 */
export type ArenaBattleMode = 
  | 'normal'       // User sees model names
  | 'blind';       // Model names hidden until selection

/**
 * Individual contestant in an arena battle
 */
export interface ArenaContestant {
  /** Unique contestant ID */
  id: string;
  /** Provider name */
  provider: ProviderName;
  /** Model identifier */
  model: string;
  /** Display name for the model */
  displayName: string;
  /** Generated response content */
  response: string;
  /** Error message if failed */
  error?: string;
  /** Response latency in milliseconds */
  latencyMs?: number;
  /** Token count (input + output) */
  tokenCount?: {
    input: number;
    output: number;
    total: number;
  };
  /** Estimated cost in USD */
  estimatedCost?: number;
  /** User rating (1-5 stars) */
  rating?: number;
  /** Current status */
  status: ArenaContestantStatus;
  /** Streaming start time */
  startedAt?: Date;
  /** Completion time */
  completedAt?: Date;
}

/**
 * An arena battle session
 */
export interface ArenaBattle {
  /** Unique battle ID */
  id: string;
  /** Session ID this battle belongs to */
  sessionId?: string;
  /** The prompt sent to all models */
  prompt: string;
  /** System prompt (if any) */
  systemPrompt?: string;
  /** Battle mode */
  mode: ArenaBattleMode;
  /** Contestants in this battle */
  contestants: ArenaContestant[];
  /** Winner contestant ID */
  winnerId?: string;
  /** Reason for winner selection */
  winReason?: ArenaWinReason;
  /** Task classification for this prompt */
  taskClassification?: TaskClassification;
  /** Whether this was a tie (no clear winner) */
  isTie?: boolean;
  /** User notes about the battle */
  notes?: string;
  /** Battle creation time */
  createdAt: Date;
  /** Battle completion time */
  completedAt?: Date;
}

/**
 * User preference record from arena battles
 */
export interface ArenaPreference {
  /** Unique preference ID */
  id: string;
  /** Battle ID this preference came from */
  battleId: string;
  /** Winning model identifier (provider:model) */
  winner: string;
  /** Losing model identifier (provider:model) */
  loser: string;
  /** Task category for this preference */
  taskCategory?: TaskCategory;
  /** Reason for preference */
  reason?: ArenaWinReason;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Model rating using ELO-like system
 */
export interface ArenaModelRating {
  /** Model identifier (provider:model) */
  modelId: string;
  /** Provider name */
  provider: ProviderName;
  /** Model name */
  model: string;
  /** Overall ELO rating */
  rating: number;
  /** Category-specific ratings */
  categoryRatings: Partial<Record<TaskCategory, number>>;
  /** Total battles participated */
  totalBattles: number;
  /** Total wins */
  wins: number;
  /** Total losses */
  losses: number;
  /** Total ties */
  ties: number;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Arena statistics
 */
export interface ArenaStats {
  /** Total battles conducted */
  totalBattles: number;
  /** Total battles completed (with winner selected) */
  completedBattles: number;
  /** Total ties */
  totalTies: number;
  /** Model win rates */
  modelWinRates: Record<string, { wins: number; losses: number; total: number; winRate: number }>;
  /** Category distribution */
  categoryDistribution: Partial<Record<TaskCategory, number>>;
  /** Average battle duration in ms */
  avgBattleDuration: number;
  /** Most used models */
  topModels: Array<{ modelId: string; count: number }>;
}

/**
 * Arena settings
 */
export interface ArenaSettings {
  /** Whether arena feature is enabled */
  enabled: boolean;
  /** Default number of models to compare (2-4) */
  defaultModelCount: number;
  /** Auto-select models based on tier */
  autoSelectModels: boolean;
  /** Enable preference learning for routing */
  preferenceLearning: boolean;
  /** History retention period in days */
  historyRetentionDays: number;
  /** Default battle mode */
  defaultMode: ArenaBattleMode;
  /** Show cost estimates */
  showCostEstimates: boolean;
  /** Show token counts */
  showTokenCounts: boolean;
}

/**
 * Default arena settings
 */
export const DEFAULT_ARENA_SETTINGS: ArenaSettings = {
  enabled: true,
  defaultModelCount: 2,
  autoSelectModels: false,
  preferenceLearning: true,
  historyRetentionDays: 30,
  defaultMode: 'normal',
  showCostEstimates: true,
  showTokenCounts: true,
};

/**
 * Default ELO rating for new models
 */
export const DEFAULT_ELO_RATING = 1500;

/**
 * ELO K-factor for rating adjustments
 */
export const ELO_K_FACTOR = 32;

/**
 * Model presets for quick selection
 */
export interface ArenaModelPreset {
  id: string;
  name: string;
  description: string;
  models: Array<{ provider: ProviderName; model: string }>;
}

/**
 * Default model presets
 */
export const ARENA_MODEL_PRESETS: ArenaModelPreset[] = [
  {
    id: 'top-tier',
    name: 'Top Tier',
    description: 'Compare the best models from major providers',
    models: [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'google', model: 'gemini-1.5-pro' },
    ],
  },
  {
    id: 'fast-models',
    name: 'Speed Demons',
    description: 'Compare fast, efficient models',
    models: [
      { provider: 'openai', model: 'gpt-4o-mini' },
      { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    ],
  },
  {
    id: 'budget-friendly',
    name: 'Budget Friendly',
    description: 'Compare cost-effective models',
    models: [
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      { provider: 'openai', model: 'gpt-4o-mini' },
    ],
  },
  {
    id: 'reasoning',
    name: 'Deep Reasoning',
    description: 'Compare models optimized for complex reasoning',
    models: [
      { provider: 'openai', model: 'o1' },
      { provider: 'deepseek', model: 'deepseek-reasoner' },
      { provider: 'anthropic', model: 'claude-opus-4-20250514' },
    ],
  },
];
