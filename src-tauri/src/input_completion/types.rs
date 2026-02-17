//! Types for input completion module

use super::ime_state::ImeState;
use serde::{Deserialize, Serialize};

/// Input surface where completion is requested.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CompletionSurface {
    ChatInput,
    ChatWidget,
    LatexEditor,
    Generic,
}

impl Default for CompletionSurface {
    fn default() -> Self {
        Self::Generic
    }
}

/// High-level completion mode used to optimize prompting strategy.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CompletionMode {
    Chat,
    Code,
    Markdown,
    PlainText,
}

impl Default for CompletionMode {
    fn default() -> Self {
        Self::PlainText
    }
}

/// Context for requesting a completion
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompletionContext {
    /// The text before the cursor
    pub text: String,
    /// Cursor position (if available)
    pub cursor_position: Option<CursorPosition>,
    /// File path (if editing a file)
    pub file_path: Option<String>,
    /// Programming language (if known)
    pub language: Option<String>,
    /// Current IME state
    pub ime_state: Option<ImeState>,
    /// Completion mode hint
    pub mode: Option<CompletionMode>,
    /// UI surface that triggered completion
    pub surface: Option<CompletionSurface>,
}

/// v2 completion request payload with explicit mode and surface.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompletionRequestV2 {
    /// Client-side request id for stale-response protection
    pub request_id: Option<String>,
    /// The text before the cursor
    pub text: String,
    /// Cursor position (if available)
    pub cursor_position: Option<CursorPosition>,
    /// File path (if editing a file)
    pub file_path: Option<String>,
    /// Programming language (if known)
    pub language: Option<String>,
    /// Current IME state
    pub ime_state: Option<ImeState>,
    /// Completion mode hint
    pub mode: Option<CompletionMode>,
    /// UI surface that triggered completion
    pub surface: Option<CompletionSurface>,
}

/// Minimal suggestion reference for v2 accept/dismiss actions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionSuggestionRef {
    pub suggestion_id: String,
}

/// v2 result payload that preserves request metadata.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompletionResultV2 {
    /// Client-side request id for response matching
    pub request_id: String,
    /// UI surface that triggered completion
    pub surface: CompletionSurface,
    /// Completion mode used by backend
    pub mode: CompletionMode,
    /// List of completion suggestions
    pub suggestions: Vec<CompletionSuggestion>,
    /// Request latency in milliseconds
    pub latency_ms: u64,
    /// Model used for completion
    pub model: String,
    /// Whether the result was cached
    pub cached: bool,
}

/// Cursor position information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPosition {
    /// Screen X coordinate
    pub x: i32,
    /// Screen Y coordinate
    pub y: i32,
    /// Line number (1-indexed)
    pub line: Option<u32>,
    /// Column number (1-indexed)
    pub column: Option<u32>,
}

/// Result of a completion request
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompletionResult {
    /// List of completion suggestions
    pub suggestions: Vec<CompletionSuggestion>,
    /// Request latency in milliseconds
    pub latency_ms: u64,
    /// Model used for completion
    pub model: String,
    /// Whether the result was cached
    pub cached: bool,
}

/// A single completion suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionSuggestion {
    /// The suggested text to insert
    pub text: String,
    /// Display text (may include formatting)
    pub display_text: String,
    /// Confidence score (0.0 - 1.0)
    pub confidence: f64,
    /// Type of completion
    pub completion_type: CompletionType,
    /// Unique identifier for this suggestion
    pub id: String,
}

/// Type of completion suggestion
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CompletionType {
    /// Single line completion
    Line,
    /// Multi-line completion (block)
    Block,
    /// Word completion
    Word,
    /// Snippet with placeholders
    Snippet,
}

/// Status of the input completion system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionStatus {
    /// Whether the system is running
    pub is_running: bool,
    /// Current IME state
    pub ime_state: ImeState,
    /// Whether there's a pending suggestion
    pub has_suggestion: bool,
    /// Current input buffer length
    pub buffer_length: usize,
}

/// Events emitted by the input completion system
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum InputCompletionEvent {
    /// A new suggestion is available
    Suggestion(CompletionSuggestion),
    /// Suggestion was accepted
    Accept(CompletionSuggestion),
    /// Suggestion was dismissed
    Dismiss,
    /// IME state changed
    ImeStateChanged(ImeState),
    /// Error occurred
    Error(String),
    /// System started
    Started,
    /// System stopped
    Stopped,
}

/// Statistics for the completion system
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CompletionStats {
    /// Total completion requests
    pub total_requests: u64,
    /// Successful completions
    pub successful_completions: u64,
    /// Failed completions
    pub failed_completions: u64,
    /// Accepted suggestions
    pub accepted_suggestions: u64,
    /// Dismissed suggestions
    pub dismissed_suggestions: u64,
    /// Average latency in milliseconds
    pub avg_latency_ms: f64,
    /// Cache hit rate (0.0 - 1.0)
    pub cache_hit_rate: f64,
    /// Quality feedback stats
    pub feedback_stats: FeedbackStats,
}

/// Feedback statistics for completion quality tracking
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FeedbackStats {
    /// Positive feedback count (thumbs up, full accept)
    pub positive_count: u64,
    /// Negative feedback count (thumbs down, immediate dismiss)
    pub negative_count: u64,
    /// Partial accept count (user edited the suggestion)
    pub partial_accept_count: u64,
    /// Average acceptance ratio (accepted chars / suggested chars)
    pub avg_acceptance_ratio: f64,
    /// Average time to accept (ms) - shorter is better
    pub avg_time_to_accept_ms: f64,
    /// Average time to dismiss (ms) - shorter often means low quality
    pub avg_time_to_dismiss_ms: f64,
}

/// Quality feedback type for a completion
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CompletionFeedback {
    /// User accepted the full suggestion
    FullAccept {
        suggestion_id: String,
        time_to_accept_ms: u64,
    },
    /// User partially accepted (edited after accept)
    PartialAccept {
        suggestion_id: String,
        original_length: usize,
        accepted_length: usize,
    },
    /// User dismissed quickly (likely low quality)
    QuickDismiss {
        suggestion_id: String,
        time_to_dismiss_ms: u64,
    },
    /// User explicitly rated the suggestion
    ExplicitRating {
        suggestion_id: String,
        rating: FeedbackRating,
    },
}

/// Explicit feedback rating
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FeedbackRating {
    /// Good suggestion
    Positive,
    /// Bad suggestion
    Negative,
    /// Not relevant
    Irrelevant,
}

impl CompletionSuggestion {
    /// Create a new suggestion
    pub fn new(text: String, confidence: f64, completion_type: CompletionType) -> Self {
        Self {
            display_text: text.clone(),
            text,
            confidence,
            completion_type,
            id: uuid::Uuid::new_v4().to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_completion_suggestion_new() {
        let suggestion =
            CompletionSuggestion::new("hello world".to_string(), 0.9, CompletionType::Line);

        assert_eq!(suggestion.text, "hello world");
        assert_eq!(suggestion.display_text, "hello world");
        assert_eq!(suggestion.confidence, 0.9);
        assert_eq!(suggestion.completion_type, CompletionType::Line);
        assert!(!suggestion.id.is_empty());
    }

    #[test]
    fn test_completion_suggestion_block_type() {
        let suggestion =
            CompletionSuggestion::new("line1\nline2".to_string(), 0.8, CompletionType::Block);
        assert_eq!(suggestion.completion_type, CompletionType::Block);
    }

    #[test]
    fn test_completion_suggestion_word_type() {
        let suggestion = CompletionSuggestion::new("word".to_string(), 0.7, CompletionType::Word);
        assert_eq!(suggestion.completion_type, CompletionType::Word);
    }

    #[test]
    fn test_completion_suggestion_snippet_type() {
        let suggestion =
            CompletionSuggestion::new("fn ${1:name}()".to_string(), 0.6, CompletionType::Snippet);
        assert_eq!(suggestion.completion_type, CompletionType::Snippet);
    }

    #[test]
    fn test_completion_context_default() {
        let context = CompletionContext::default();
        assert!(context.text.is_empty());
        assert!(context.cursor_position.is_none());
        assert!(context.file_path.is_none());
        assert!(context.language.is_none());
        assert!(context.ime_state.is_none());
        assert!(context.mode.is_none());
        assert!(context.surface.is_none());
    }

    #[test]
    fn test_completion_context_with_values() {
        let context = CompletionContext {
            text: "fn main()".to_string(),
            cursor_position: Some(CursorPosition {
                x: 100,
                y: 200,
                line: Some(10),
                column: Some(5),
            }),
            file_path: Some("/path/to/file.rs".to_string()),
            language: Some("rust".to_string()),
            ime_state: None,
            mode: Some(CompletionMode::Code),
            surface: Some(CompletionSurface::Generic),
        };

        assert_eq!(context.text, "fn main()");
        assert!(context.cursor_position.is_some());
        let pos = context.cursor_position.unwrap();
        assert_eq!(pos.x, 100);
        assert_eq!(pos.y, 200);
        assert_eq!(pos.line, Some(10));
        assert_eq!(pos.column, Some(5));
    }

    #[test]
    fn test_cursor_position() {
        let pos = CursorPosition {
            x: 50,
            y: 100,
            line: Some(1),
            column: Some(10),
        };

        assert_eq!(pos.x, 50);
        assert_eq!(pos.y, 100);
        assert_eq!(pos.line, Some(1));
        assert_eq!(pos.column, Some(10));
    }

    #[test]
    fn test_completion_result_default() {
        let result = CompletionResult::default();
        assert!(result.suggestions.is_empty());
        assert_eq!(result.latency_ms, 0);
        assert!(result.model.is_empty());
        assert!(!result.cached);
    }

    #[test]
    fn test_completion_result_with_suggestions() {
        let suggestion = CompletionSuggestion::new("test".to_string(), 0.9, CompletionType::Line);

        let result = CompletionResult {
            suggestions: vec![suggestion],
            latency_ms: 150,
            model: "test-model".to_string(),
            cached: true,
        };

        assert_eq!(result.suggestions.len(), 1);
        assert_eq!(result.latency_ms, 150);
        assert_eq!(result.model, "test-model");
        assert!(result.cached);
    }

    #[test]
    fn test_completion_type_equality() {
        assert_eq!(CompletionType::Line, CompletionType::Line);
        assert_eq!(CompletionType::Block, CompletionType::Block);
        assert_eq!(CompletionType::Word, CompletionType::Word);
        assert_eq!(CompletionType::Snippet, CompletionType::Snippet);
        assert_ne!(CompletionType::Line, CompletionType::Block);
        assert_ne!(CompletionType::Word, CompletionType::Snippet);
    }

    #[test]
    fn test_completion_status() {
        let status = CompletionStatus {
            is_running: true,
            ime_state: ImeState::default(),
            has_suggestion: true,
            buffer_length: 10,
        };

        assert!(status.is_running);
        assert!(status.has_suggestion);
        assert_eq!(status.buffer_length, 10);
    }

    #[test]
    fn test_completion_stats_default() {
        let stats = CompletionStats::default();
        assert_eq!(stats.total_requests, 0);
        assert_eq!(stats.successful_completions, 0);
        assert_eq!(stats.failed_completions, 0);
        assert_eq!(stats.accepted_suggestions, 0);
        assert_eq!(stats.dismissed_suggestions, 0);
        assert_eq!(stats.avg_latency_ms, 0.0);
        assert_eq!(stats.cache_hit_rate, 0.0);
    }

    #[test]
    fn test_completion_stats_with_values() {
        let stats = CompletionStats {
            total_requests: 100,
            successful_completions: 80,
            failed_completions: 20,
            accepted_suggestions: 50,
            dismissed_suggestions: 30,
            avg_latency_ms: 150.5,
            cache_hit_rate: 0.3,
            feedback_stats: FeedbackStats::default(),
        };

        assert_eq!(stats.total_requests, 100);
        assert_eq!(stats.successful_completions, 80);
        assert_eq!(stats.cache_hit_rate, 0.3);
    }

    #[test]
    fn test_completion_event_suggestion() {
        let suggestion = CompletionSuggestion::new("test".to_string(), 0.9, CompletionType::Line);
        let event = InputCompletionEvent::Suggestion(suggestion.clone());
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("Suggestion"));
        assert!(json.contains("test"));
    }

    #[test]
    fn test_completion_event_accept() {
        let suggestion =
            CompletionSuggestion::new("accepted".to_string(), 0.8, CompletionType::Line);
        let event = InputCompletionEvent::Accept(suggestion);
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("Accept"));
    }

    #[test]
    fn test_completion_event_dismiss() {
        let event = InputCompletionEvent::Dismiss;
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("Dismiss"));
    }

    #[test]
    fn test_completion_event_ime_state_changed() {
        let ime_state = ImeState::default();
        let event = InputCompletionEvent::ImeStateChanged(ime_state);
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("ImeStateChanged"));
    }

    #[test]
    fn test_completion_event_error() {
        let event = InputCompletionEvent::Error("test error".to_string());
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("Error"));
        assert!(json.contains("test error"));
    }

    #[test]
    fn test_completion_event_started() {
        let event = InputCompletionEvent::Started;
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("Started"));
    }

    #[test]
    fn test_completion_event_stopped() {
        let event = InputCompletionEvent::Stopped;
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("Stopped"));
    }

    #[test]
    fn test_completion_context_serialization() {
        let context = CompletionContext {
            text: "hello".to_string(),
            cursor_position: None,
            file_path: Some("test.rs".to_string()),
            language: Some("rust".to_string()),
            ime_state: None,
            mode: Some(CompletionMode::Code),
            surface: Some(CompletionSurface::ChatInput),
        };

        let json = serde_json::to_string(&context).unwrap();
        let parsed: CompletionContext = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.text, context.text);
        assert_eq!(parsed.file_path, context.file_path);
        assert_eq!(parsed.language, context.language);
        assert_eq!(parsed.mode, context.mode);
        assert_eq!(parsed.surface, context.surface);
    }

    #[test]
    fn test_completion_result_serialization() {
        let result = CompletionResult {
            suggestions: vec![CompletionSuggestion::new(
                "test".to_string(),
                0.9,
                CompletionType::Line,
            )],
            latency_ms: 100,
            model: "model".to_string(),
            cached: false,
        };

        let json = serde_json::to_string(&result).unwrap();
        let parsed: CompletionResult = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.suggestions.len(), 1);
        assert_eq!(parsed.latency_ms, result.latency_ms);
        assert_eq!(parsed.model, result.model);
    }

    #[test]
    fn test_completion_status_serialization() {
        let status = CompletionStatus {
            is_running: true,
            ime_state: ImeState::default(),
            has_suggestion: false,
            buffer_length: 5,
        };

        let json = serde_json::to_string(&status).unwrap();
        let parsed: CompletionStatus = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.is_running, status.is_running);
        assert_eq!(parsed.has_suggestion, status.has_suggestion);
        assert_eq!(parsed.buffer_length, status.buffer_length);
    }

    #[test]
    fn test_completion_type_serialization() {
        let types = vec![
            CompletionType::Line,
            CompletionType::Block,
            CompletionType::Word,
            CompletionType::Snippet,
        ];

        for t in types {
            let json = serde_json::to_string(&t).unwrap();
            let parsed: CompletionType = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed, t);
        }
    }

    #[test]
    fn test_completion_request_v2_default() {
        let request = CompletionRequestV2::default();
        assert!(request.request_id.is_none());
        assert!(request.text.is_empty());
        assert!(request.mode.is_none());
        assert!(request.surface.is_none());
    }

    #[test]
    fn test_completion_result_v2_defaults() {
        let result = CompletionResultV2::default();
        assert!(result.request_id.is_empty());
        assert_eq!(result.mode, CompletionMode::PlainText);
        assert_eq!(result.surface, CompletionSurface::Generic);
    }
}
