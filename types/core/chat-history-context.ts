/**
 * Chat History Context Type Definitions
 *
 * Provides types for cross-session context injection feature:
 * - Settings for controlling history context behavior
 * - Compression levels and strategies
 * - Session summary structures
 */

/**
 * Compression level for chat history context
 * - minimal: Only session titles and key topics
 * - moderate: Titles, topics, and brief summary
 * - detailed: Full compressed summary with key exchanges
 */
export type HistoryContextCompressionLevel = 'minimal' | 'moderate' | 'detailed';

/**
 * Settings for chat history context injection
 */
export interface ChatHistoryContextSettings {
  /** Enable/disable chat history context injection */
  enabled: boolean;
  /** Number of recent sessions to include (1-10) */
  recentSessionCount: number;
  /** Maximum token budget for history context (100-2000) */
  maxTokenBudget: number;
  /** Compression level for summaries */
  compressionLevel: HistoryContextCompressionLevel;
  /** Include session titles in context */
  includeSessionTitles: boolean;
  /** Exclude sessions with no messages */
  excludeEmptySessions: boolean;
  /** Minimum messages required to include a session */
  minMessagesThreshold: number;
  /** Include timestamps in context */
  includeTimestamps: boolean;
  /** Only include sessions from same project (if applicable) */
  sameProjectOnly: boolean;
}

/**
 * Default settings for chat history context
 */
export const DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS: ChatHistoryContextSettings = {
  enabled: false,
  recentSessionCount: 3,
  maxTokenBudget: 500,
  compressionLevel: 'moderate',
  includeSessionTitles: true,
  excludeEmptySessions: true,
  minMessagesThreshold: 2,
  includeTimestamps: false,
  sameProjectOnly: false,
};

/**
 * Compressed summary of a single session for context injection
 */
export interface SessionContextSummary {
  /** Session ID */
  sessionId: string;
  /** Session title */
  title: string;
  /** When the session was created */
  createdAt: Date;
  /** When the session was last updated */
  updatedAt: Date;
  /** Number of messages in session */
  messageCount: number;
  /** Compressed summary text */
  summary: string;
  /** Key topics discussed */
  topics: string[];
  /** Chat mode used */
  mode: string;
  /** Project ID if associated */
  projectId?: string;
}

/**
 * Result of building history context
 */
export interface HistoryContextResult {
  /** Whether context was successfully built */
  success: boolean;
  /** The formatted context string to inject */
  contextText: string;
  /** Number of sessions included */
  sessionCount: number;
  /** Estimated token count */
  tokenCount: number;
  /** Session summaries used */
  summaries: SessionContextSummary[];
  /** Error message if failed */
  error?: string;
}

/**
 * Options for building history context
 */
export interface BuildHistoryContextOptions {
  /** Current session ID to exclude */
  excludeSessionId?: string;
  /** Project ID to filter by (if sameProjectOnly is true) */
  projectId?: string;
  /** Override settings */
  settingsOverride?: Partial<ChatHistoryContextSettings>;
}
