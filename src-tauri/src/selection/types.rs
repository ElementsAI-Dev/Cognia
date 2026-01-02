//! Selection data types
//!
//! Common data structures for text selection functionality.

use serde::{Deserialize, Serialize};

/// Selection result with rich context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Selection {
    /// The selected text
    pub text: String,
    /// Text before selection (context)
    pub text_before: Option<String>,
    /// Text after selection (context)
    pub text_after: Option<String>,
    /// Whether the text appears to be code
    pub is_code: bool,
    /// Detected language (for code)
    pub language: Option<String>,
    /// Whether the text is a URL
    pub is_url: bool,
    /// Whether the text is an email
    pub is_email: bool,
    /// Whether the text contains numbers
    pub has_numbers: bool,
    /// Word count
    pub word_count: usize,
    /// Character count
    pub char_count: usize,
    /// Line count
    pub line_count: usize,
    /// Detected text type
    pub text_type: TextType,
    /// Source application info
    pub source_app: Option<SourceAppInfo>,
}

/// Text type classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TextType {
    /// Plain text
    PlainText,
    /// Source code
    Code,
    /// URL
    Url,
    /// Email address
    Email,
    /// File path
    FilePath,
    /// Command line
    CommandLine,
    /// JSON data
    Json,
    /// XML/HTML markup
    Markup,
    /// Markdown
    Markdown,
    /// Error message/stack trace
    ErrorMessage,
    /// Log entry
    LogEntry,
    /// Number/calculation
    Numeric,
    /// Mixed content
    Mixed,
}

/// Source application information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceAppInfo {
    /// Application name
    pub name: String,
    /// Process name
    pub process: String,
    /// Window title
    pub window_title: String,
    /// Application type
    pub app_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_selection_creation() {
        let selection = Selection {
            text: "test".to_string(),
            text_before: None,
            text_after: None,
            is_code: false,
            language: None,
            is_url: false,
            is_email: false,
            has_numbers: false,
            word_count: 1,
            char_count: 4,
            line_count: 1,
            text_type: TextType::PlainText,
            source_app: None,
        };
        assert_eq!(selection.text, "test");
        assert_eq!(selection.text_type, TextType::PlainText);
    }

    #[test]
    fn test_text_type_equality() {
        assert_eq!(TextType::Code, TextType::Code);
        assert_ne!(TextType::Code, TextType::PlainText);
    }

    #[test]
    fn test_source_app_info() {
        let info = SourceAppInfo {
            name: "Test App".to_string(),
            process: "test.exe".to_string(),
            window_title: "Test Window".to_string(),
            app_type: "editor".to_string(),
        };
        assert_eq!(info.name, "Test App");
    }

    #[test]
    fn test_selection_serialization() {
        let selection = Selection {
            text: "test".to_string(),
            text_before: None,
            text_after: None,
            is_code: true,
            language: Some("rust".to_string()),
            is_url: false,
            is_email: false,
            has_numbers: false,
            word_count: 1,
            char_count: 4,
            line_count: 1,
            text_type: TextType::Code,
            source_app: None,
        };
        let json = serde_json::to_string(&selection);
        assert!(json.is_ok());
    }
}
