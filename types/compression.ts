/**
 * Compression type definitions for chat context management
 *
 * Provides types for:
 * - Compression strategies (summary, sliding-window, selective, hybrid)
 * - Compression settings (global and per-session)
 * - Compression state and metadata
 * - Compression triggers (manual and automatic)
 */

/**
 * Available compression strategies
 * - summary: Summarize older messages into a concise summary
 * - sliding-window: Keep only the most recent N messages
 * - selective: Keep important messages (system, key exchanges) and summarize others
 * - hybrid: Combination of sliding window for recent + summary for older
 */
export type CompressionStrategy = 'summary' | 'sliding-window' | 'selective' | 'hybrid';

/**
 * Trigger modes for automatic compression
 * - token-threshold: Trigger when total tokens exceed threshold percentage
 * - message-count: Trigger when message count exceeds threshold
 * - manual: Only compress when user explicitly requests
 */
export type CompressionTrigger = 'token-threshold' | 'message-count' | 'manual';

/**
 * Model configuration for compression summarization
 */
export interface CompressionModelConfig {
  /** Provider to use for summarization (defaults to current session provider) */
  provider?: string;
  /** Model to use for summarization (defaults to fast tier model) */
  model?: string;
  /** Max tokens for summary output */
  maxSummaryTokens?: number;
}

/**
 * Global compression settings stored in settings store
 */
export interface CompressionSettings {
  /** Enable/disable compression globally */
  enabled: boolean;
  /** Compression strategy to use */
  strategy: CompressionStrategy;
  /** Trigger mode for automatic compression */
  trigger: CompressionTrigger;
  /** Token threshold percentage (0-100) to trigger compression */
  tokenThreshold: number;
  /** Message count threshold to trigger compression */
  messageCountThreshold: number;
  /** Number of recent messages to always preserve uncompressed */
  preserveRecentMessages: number;
  /** Always preserve system messages */
  preserveSystemMessages: boolean;
  /** Target compression ratio (0.1 to 0.9) for summary strategy */
  compressionRatio: number;
  /** Model configuration for summarization */
  compressionModel: CompressionModelConfig;
  /** Show notification when compression is triggered */
  showCompressionNotification: boolean;
  /** Allow user to undo/restore compressed messages */
  enableUndo: boolean;
}

/**
 * Per-session compression overrides
 */
export interface SessionCompressionOverrides {
  /** Override global compression enabled setting */
  compressionEnabled?: boolean;
  /** Override compression strategy for this session */
  compressionStrategy?: CompressionStrategy;
  /** Override trigger mode */
  compressionTrigger?: CompressionTrigger;
  /** Override token threshold */
  tokenThreshold?: number;
  /** Override message count threshold */
  messageCountThreshold?: number;
  /** Override preserve recent messages count */
  preserveRecentMessages?: number;
}

/**
 * Compression state for a message
 */
export interface MessageCompressionState {
  /** Whether this message is a compression summary */
  isSummary: boolean;
  /** IDs of messages that were summarized into this one */
  summarizedMessageIds?: string[];
  /** Original message count before compression */
  originalMessageCount?: number;
  /** Original token count before compression */
  originalTokenCount?: number;
  /** Compression timestamp */
  compressedAt?: Date;
  /** Compression strategy used */
  strategyUsed?: CompressionStrategy;
}

/**
 * Compression history entry for undo support
 */
export interface CompressionHistoryEntry {
  id: string;
  sessionId: string;
  timestamp: Date;
  /** Strategy used for this compression */
  strategy: CompressionStrategy;
  /** Messages that were compressed */
  compressedMessages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
  /** Summary message ID created */
  summaryMessageId: string;
  /** Token count before compression */
  tokensBefore: number;
  /** Token count after compression */
  tokensAfter: number;
}

/**
 * Compression result returned by compression functions
 */
export interface CompressionResult {
  /** Whether compression was successful */
  success: boolean;
  /** Summary text generated (for summary/hybrid strategies) */
  summaryText?: string;
  /** Number of messages compressed */
  messagesCompressed: number;
  /** Token count before compression */
  tokensBefore: number;
  /** Token count after compression */
  tokensAfter: number;
  /** Compression ratio achieved */
  compressionRatio: number;
  /** IDs of messages that were compressed */
  compressedMessageIds: string[];
  /** Error message if compression failed */
  error?: string;
}

/**
 * Context state for compression decision making
 */
export interface ContextState {
  /** Total tokens in current context */
  totalTokens: number;
  /** Maximum tokens for current model */
  maxTokens: number;
  /** Current utilization percentage */
  utilizationPercent: number;
  /** Number of messages in context */
  messageCount: number;
  /** Compression status */
  status: 'healthy' | 'warning' | 'danger';
  /** Whether compression is recommended */
  compressionRecommended: boolean;
  /** Recommended compression strategy based on context */
  recommendedStrategy?: CompressionStrategy;
}

/**
 * Default compression settings
 */
export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  enabled: false,
  strategy: 'hybrid',
  trigger: 'token-threshold',
  tokenThreshold: 70, // Trigger at 70% of context window
  messageCountThreshold: 50,
  preserveRecentMessages: 10,
  preserveSystemMessages: true,
  compressionRatio: 0.3, // Target 30% of original size
  compressionModel: {
    maxSummaryTokens: 500,
  },
  showCompressionNotification: true,
  enableUndo: true,
};
