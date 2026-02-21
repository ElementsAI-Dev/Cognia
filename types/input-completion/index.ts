/**
 * Types for input completion feature
 */

/** Input mode classification */
export type InputMode = 'English' | 'Chinese' | 'Japanese' | 'Korean' | { Other: string };

/** Current IME state */
export interface ImeState {
  /** Whether IME is currently active/open */
  is_active: boolean;
  /** Whether user is currently composing (e.g., typing pinyin) */
  is_composing: boolean;
  /** Current input mode */
  input_mode: InputMode;
  /** Name of the current IME (if available) */
  ime_name: string | null;
  /** Current composition string (the pinyin being typed) */
  composition_string: string | null;
  /** Candidate list (if available) */
  candidates: string[];
}

/** Cursor position information */
export interface CursorPosition {
  /** Screen X coordinate */
  x: number;
  /** Screen Y coordinate */
  y: number;
  /** Line number (1-indexed) */
  line?: number;
  /** Column number (1-indexed) */
  column?: number;
}

/** Context for requesting a completion */
export interface CompletionContext {
  /** The text before the cursor */
  text: string;
  /** Optional text after the cursor (used for suffix-aware alignment) */
  text_after_cursor?: string;
  /** Absolute cursor offset in the full text */
  cursor_offset?: number;
  /** Cursor position (if available) */
  cursor_position?: CursorPosition;
  /** File path (if editing a file) */
  file_path?: string;
  /** Programming language (if known) */
  language?: string;
  /** Optional digest of recent conversation context */
  conversation_digest?: string;
  /** Current IME state */
  ime_state?: ImeState;
  /** Completion mode hint for prompt optimization */
  mode?: CompletionMode;
  /** UI surface where completion is requested */
  surface?: CompletionSurface;
}

/** Surface of completion request */
export type CompletionSurface = 'chat_input' | 'chat_widget' | 'latex_editor' | 'generic';

/** High-level completion mode */
export type CompletionMode = 'chat' | 'code' | 'markdown' | 'plain_text';

/** Type of completion suggestion */
export type CompletionType = 'Line' | 'Block' | 'Word' | 'Snippet';

/** A single completion suggestion */
export interface CompletionSuggestion {
  /** The suggested text to insert */
  text: string;
  /** Display text (may include formatting) */
  display_text: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Type of completion */
  completion_type: CompletionType;
  /** Unique identifier for this suggestion */
  id: string;
}

/** Result of a completion request */
export interface InputCompletionResult {
  /** List of completion suggestions */
  suggestions: CompletionSuggestion[];
  /** Request latency in milliseconds */
  latency_ms: number;
  /** Model used for completion */
  model: string;
  /** Whether the result was cached */
  cached: boolean;
}

/** Status of the input completion system */
export interface CompletionStatus {
  /** Whether the system is running */
  is_running: boolean;
  /** Current IME state */
  ime_state: ImeState;
  /** Whether there's a pending suggestion */
  has_suggestion: boolean;
  /** Current input buffer length */
  buffer_length: number;
}

/** Supported completion providers */
export type CompletionProvider = 'ollama' | 'openai' | 'groq' | 'auto' | 'custom';

/** Model configuration for completions */
export interface CompletionModelConfig {
  /** Provider type */
  provider: CompletionProvider;
  /** Model identifier */
  model_id: string;
  /** API endpoint (for custom providers) */
  endpoint?: string;
  /** API key (if required) */
  api_key?: string;
  /** Maximum tokens to generate */
  max_tokens: number;
  /** Temperature for sampling */
  temperature: number;
  /** Request timeout in seconds */
  timeout_secs: number;
}

/** Adaptive debounce configuration */
export interface AdaptiveDebounceConfig {
  /** Enable adaptive debounce based on typing speed */
  enabled: boolean;
  /** Minimum debounce (ms) when typing fast */
  min_debounce_ms: number;
  /** Maximum debounce (ms) when typing slow */
  max_debounce_ms: number;
  /** Typing speed threshold (chars/sec) for fast typing */
  fast_typing_threshold: number;
  /** Typing speed threshold (chars/sec) for slow typing */
  slow_typing_threshold: number;
}

/** Trigger configuration */
export interface CompletionTriggerConfig {
  /** Debounce delay in milliseconds */
  debounce_ms: number;
  /** Minimum context length to trigger completion */
  min_context_length: number;
  /** Maximum context length to send */
  max_context_length: number;
  /** Whether to trigger on word boundaries only */
  trigger_on_word_boundary: boolean;
  /** Characters that should not trigger completion */
  skip_chars: string[];
  /** Whether to skip when modifier keys are held */
  skip_with_modifiers: boolean;
  /** Desktop trigger mode */
  input_capture_mode?: InputCaptureMode;
  /** Adaptive debounce settings */
  adaptive_debounce?: AdaptiveDebounceConfig;
}

/** Desktop input capture mode */
export type InputCaptureMode = 'local_only' | 'global_legacy';

/** UI configuration */
export interface CompletionUiConfig {
  /** Whether to show inline preview */
  show_inline_preview: boolean;
  /** Maximum number of suggestions to show */
  max_suggestions: number;
  /** Font size for suggestions */
  font_size: number;
  /** Opacity for ghost text (0.0 - 1.0) */
  ghost_text_opacity: number;
  /** Auto-dismiss timeout in milliseconds (0 = never) */
  auto_dismiss_ms: number;
  /** Whether to show accept hint (e.g., "[Tab]") */
  show_accept_hint: boolean;
}

/** Main configuration for input completion */
export interface CompletionConfig {
  /** Whether input completion is enabled */
  enabled: boolean;
  /** Model configuration */
  model: CompletionModelConfig;
  /** Trigger configuration */
  trigger: CompletionTriggerConfig;
  /** UI configuration */
  ui: CompletionUiConfig;
}

/** v2 request payload */
export interface TriggerCompletionV2Request extends CompletionContext {
  /** Optional client request id for stale-response protection */
  request_id?: string;
}

/** v2 suggestion reference */
export interface CompletionSuggestionRef {
  suggestion_id: string;
}

/** v2 response payload */
export interface TriggerCompletionV2Result extends InputCompletionResult {
  request_id: string;
  surface: CompletionSurface;
  mode: CompletionMode;
}

/** v3 request payload with explicit cursor slicing for alignment */
export interface TriggerCompletionV3Request {
  /** Optional client request id for stale-response protection */
  request_id?: string;
  /** Text before cursor (required) */
  text_before_cursor: string;
  /** Optional text after cursor for suffix-aware alignment */
  text_after_cursor?: string;
  /** Absolute cursor offset in the full text (if known) */
  cursor_offset?: number;
  /** Cursor position (if available) */
  cursor_position?: CursorPosition;
  /** File path (if editing a file) */
  file_path?: string;
  /** Programming language (if known) */
  language?: string;
  /** Completion mode hint */
  mode?: CompletionMode;
  /** UI surface hint */
  surface?: CompletionSurface;
  /** Optional digest of recent conversation context */
  conversation_digest?: string;
  /** Current IME state */
  ime_state?: ImeState;
}

/** v3 response payload preserving alignment metadata */
export interface TriggerCompletionV3Result extends InputCompletionResult {
  request_id: string;
  surface: CompletionSurface;
  mode: CompletionMode;
  /** Echoed cursor offset for stale response guards */
  cursor_offset?: number;
}

/** Events emitted by the input completion system */
export type InputCompletionEvent =
  | { type: 'Suggestion'; data: CompletionSuggestion }
  | { type: 'Accept'; data: CompletionSuggestion }
  | { type: 'Dismiss' }
  | { type: 'ImeStateChanged'; data: ImeState }
  | { type: 'Error'; data: string }
  | { type: 'Started' }
  | { type: 'Stopped' };

/** Statistics for the completion system */
export interface CompletionStats {
  /** Total completion requests */
  total_requests: number;
  /** Successful completions */
  successful_completions: number;
  /** Failed completions */
  failed_completions: number;
  /** Accepted suggestions */
  accepted_suggestions: number;
  /** Dismissed suggestions */
  dismissed_suggestions: number;
  /** Average latency in milliseconds */
  avg_latency_ms: number;
  /** Cache hit rate (0.0 - 1.0) */
  cache_hit_rate: number;
  /** Structured cache breakdown counters */
  cache_hits_exact?: number;
  cache_hits_prefix?: number;
  cache_hits_normalized?: number;
  cache_stale_rejects?: number;
  /** Quality feedback statistics */
  feedback_stats: FeedbackStats;
}

/** Feedback statistics for completion quality tracking */
export interface FeedbackStats {
  /** Positive feedback count (thumbs up, full accept) */
  positive_count: number;
  /** Negative feedback count (thumbs down, immediate dismiss) */
  negative_count: number;
  /** Partial accept count (user edited the suggestion) */
  partial_accept_count: number;
  /** Average acceptance ratio (accepted chars / suggested chars) */
  avg_acceptance_ratio: number;
  /** Average time to accept (ms) */
  avg_time_to_accept_ms: number;
  /** Average time to dismiss (ms) */
  avg_time_to_dismiss_ms: number;
}

/** Quality feedback type for a completion */
export type CompletionFeedback =
  | { type: 'FullAccept'; suggestion_id: string; time_to_accept_ms: number }
  | { type: 'PartialAccept'; suggestion_id: string; original_length: number; accepted_length: number }
  | { type: 'QuickDismiss'; suggestion_id: string; time_to_dismiss_ms: number }
  | { type: 'ExplicitRating'; suggestion_id: string; rating: FeedbackRating };

/** Explicit feedback rating */
export type FeedbackRating = 'Positive' | 'Negative' | 'Irrelevant';

/** Default configuration values */
export const DEFAULT_COMPLETION_CONFIG: CompletionConfig = {
  enabled: true,
  model: {
    provider: 'ollama',
    model_id: 'qwen2.5-coder:0.5b',
    max_tokens: 128,
    temperature: 0.1,
    timeout_secs: 5,
  },
  trigger: {
    debounce_ms: 400,
    min_context_length: 5,
    max_context_length: 500,
    trigger_on_word_boundary: false,
    skip_chars: [' ', '\n', '\t', '\r'],
    skip_with_modifiers: true,
    input_capture_mode: 'local_only',
  },
  ui: {
    show_inline_preview: true,
    max_suggestions: 3,
    font_size: 14,
    ghost_text_opacity: 0.5,
    auto_dismiss_ms: 5000,
    show_accept_hint: true,
  },
};

/** Multi-suggestion navigation state */
export interface SuggestionNavigationState {
  /** All available suggestions */
  suggestions: CompletionSuggestion[];
  /** Currently selected index */
  selectedIndex: number;
  /** Total count */
  totalCount: number;
}

/** Keyboard shortcuts for suggestion navigation */
export const SUGGESTION_SHORTCUTS = {
  /** Accept current suggestion */
  accept: 'Tab',
  /** Dismiss all suggestions */
  dismiss: 'Escape',
  /** Navigate to next suggestion */
  next: 'Alt+]',
  /** Navigate to previous suggestion */
  prev: 'Alt+[',
} as const;
