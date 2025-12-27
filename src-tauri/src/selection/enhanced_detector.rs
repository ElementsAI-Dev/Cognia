//! Enhanced text selection detector
//!
//! Provides advanced text selection detection with multi-click support,
//! drag detection, and intelligent text extraction.

#![allow(dead_code)]
//! - Smart word/sentence expansion
//! - Multi-application support
//! - Selection context

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::RwLock;

/// Enhanced selection result with rich context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedSelection {
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

/// Enhanced selection detector
pub struct EnhancedSelectionDetector {
    /// Last enhanced selection
    last_selection: Arc<RwLock<Option<EnhancedSelection>>>,
}

impl EnhancedSelectionDetector {
    pub fn new() -> Self {
        Self {
            last_selection: Arc::new(RwLock::new(None)),
        }
    }

    /// Analyze selected text and return enhanced selection
    pub fn analyze(&self, text: &str, source_app: Option<SourceAppInfo>) -> EnhancedSelection {
        let text_type = self.detect_text_type(text);
        let is_code = matches!(text_type, TextType::Code | TextType::Json | TextType::Markup);
        let language = if is_code { self.detect_language(text) } else { None };

        let selection = EnhancedSelection {
            text: text.to_string(),
            text_before: None,
            text_after: None,
            is_code,
            language,
            is_url: self.is_url(text),
            is_email: self.is_email(text),
            has_numbers: text.chars().any(|c| c.is_numeric()),
            word_count: self.count_words(text),
            char_count: text.chars().count(),
            line_count: text.lines().count(),
            text_type,
            source_app,
        };

        *self.last_selection.write() = Some(selection.clone());
        selection
    }

    /// Detect the type of text
    fn detect_text_type(&self, text: &str) -> TextType {
        let trimmed = text.trim();

        // Check for URL
        if self.is_url(trimmed) {
            return TextType::Url;
        }

        // Check for email
        if self.is_email(trimmed) {
            return TextType::Email;
        }

        // Check for file path
        if self.is_file_path(trimmed) {
            return TextType::FilePath;
        }

        // Check for JSON
        if self.is_json(trimmed) {
            return TextType::Json;
        }

        // Check for XML/HTML
        if self.is_markup(trimmed) {
            return TextType::Markup;
        }

        // Check for Markdown
        if self.is_markdown(trimmed) {
            return TextType::Markdown;
        }

        // Check for command line
        if self.is_command_line(trimmed) {
            return TextType::CommandLine;
        }

        // Check for error message
        if self.is_error_message(trimmed) {
            return TextType::ErrorMessage;
        }

        // Check for log entry
        if self.is_log_entry(trimmed) {
            return TextType::LogEntry;
        }

        // Check for code
        if self.is_code(trimmed) {
            return TextType::Code;
        }

        // Check for numeric
        if self.is_numeric(trimmed) {
            return TextType::Numeric;
        }

        TextType::PlainText
    }

    /// Check if text is a URL
    fn is_url(&self, text: &str) -> bool {
        let text = text.trim();
        text.starts_with("http://")
            || text.starts_with("https://")
            || text.starts_with("ftp://")
            || text.starts_with("file://")
            || (text.contains("://") && !text.contains(' '))
            || (text.starts_with("www.") && !text.contains(' '))
    }

    /// Check if text is an email
    fn is_email(&self, text: &str) -> bool {
        let text = text.trim();
        if text.contains(' ') || !text.contains('@') {
            return false;
        }
        let parts: Vec<&str> = text.split('@').collect();
        parts.len() == 2 && !parts[0].is_empty() && parts[1].contains('.')
    }

    /// Check if text is a file path
    fn is_file_path(&self, text: &str) -> bool {
        let text = text.trim();
        // Windows path
        if text.len() >= 3 && text.chars().nth(1) == Some(':') {
            return true;
        }
        // Unix path
        if text.starts_with('/') && !text.contains("://") {
            return true;
        }
        // Relative path with extension
        if text.contains('/') || text.contains('\\') {
            let has_extension = text.split(&['/', '\\'][..])
                .last()
                .map(|f| f.contains('.') && !f.starts_with('.'))
                .unwrap_or(false);
            return has_extension;
        }
        false
    }

    /// Check if text is JSON
    fn is_json(&self, text: &str) -> bool {
        let text = text.trim();
        (text.starts_with('{') && text.ends_with('}'))
            || (text.starts_with('[') && text.ends_with(']'))
    }

    /// Check if text is XML/HTML markup
    fn is_markup(&self, text: &str) -> bool {
        let text = text.trim();
        (text.starts_with('<') && text.ends_with('>'))
            || text.contains("</")
            || text.contains("/>")
            || text.starts_with("<?xml")
            || text.starts_with("<!DOCTYPE")
    }

    /// Check if text is Markdown
    fn is_markdown(&self, text: &str) -> bool {
        let lines: Vec<&str> = text.lines().collect();
        let mut md_indicators = 0;

        for line in &lines {
            let trimmed = line.trim();
            // Headers
            if trimmed.starts_with('#') {
                md_indicators += 1;
            }
            // Lists
            if trimmed.starts_with("- ") || trimmed.starts_with("* ") || trimmed.starts_with("+ ") {
                md_indicators += 1;
            }
            // Numbered lists
            if trimmed.len() > 2 && trimmed.chars().next().map(|c| c.is_numeric()).unwrap_or(false) 
                && trimmed.contains(". ") {
                md_indicators += 1;
            }
            // Code blocks
            if trimmed.starts_with("```") {
                md_indicators += 2;
            }
            // Links
            if trimmed.contains("](") && trimmed.contains('[') {
                md_indicators += 1;
            }
            // Bold/italic
            if trimmed.contains("**") || trimmed.contains("__") {
                md_indicators += 1;
            }
        }

        md_indicators >= 2
    }

    /// Check if text is a command line
    fn is_command_line(&self, text: &str) -> bool {
        let text = text.trim();
        let first_line = text.lines().next().unwrap_or("");
        
        // Common command prefixes
        let cmd_prefixes = ["$", ">", "#", "C:\\>", "PS>", ">>>", "...", "npm ", "yarn ", 
            "pnpm ", "cargo ", "git ", "docker ", "kubectl ", "pip ", "python ", "node ",
            "go ", "rustc ", "gcc ", "make ", "cmake ", "cd ", "ls ", "dir ", "cat ",
            "echo ", "grep ", "find ", "curl ", "wget "];
        
        for prefix in &cmd_prefixes {
            if first_line.starts_with(prefix) {
                return true;
            }
        }

        // Check for pipe or redirect
        if text.contains(" | ") || text.contains(" > ") || text.contains(" >> ") 
            || text.contains(" < ") || text.contains(" && ") || text.contains(" || ") {
            return true;
        }

        false
    }

    /// Check if text is an error message
    fn is_error_message(&self, text: &str) -> bool {
        let text_lower = text.to_lowercase();
        
        let error_indicators = [
            "error:", "error[", "exception:", "traceback", "stack trace",
            "panic:", "fatal:", "failed:", "failure:", "cannot ", "could not",
            "unable to", "not found", "permission denied", "access denied",
            "segmentation fault", "null pointer", "undefined", "typeerror",
            "syntaxerror", "referenceerror", "at line", "on line",
        ];

        for indicator in &error_indicators {
            if text_lower.contains(indicator) {
                return true;
            }
        }

        // Check for stack trace pattern (file:line format)
        if text.contains("at ") && (text.contains(".js:") || text.contains(".ts:") 
            || text.contains(".py:") || text.contains(".rs:") || text.contains(".go:")) {
            return true;
        }

        false
    }

    /// Check if text is a log entry
    fn is_log_entry(&self, text: &str) -> bool {
        let text_upper = text.to_uppercase();
        
        // Log level indicators
        let log_levels = ["[DEBUG]", "[INFO]", "[WARN]", "[WARNING]", "[ERROR]", 
            "[FATAL]", "[TRACE]", "DEBUG:", "INFO:", "WARN:", "ERROR:"];
        
        for level in &log_levels {
            if text_upper.contains(level) {
                return true;
            }
        }

        // Timestamp pattern at start
        let first_line = text.lines().next().unwrap_or("");
        if first_line.len() > 10 {
            let start = &first_line[..10.min(first_line.len())];
            // Check for date-like pattern
            if start.contains('-') && start.chars().filter(|c| c.is_numeric()).count() >= 4 {
                return true;
            }
        }

        false
    }

    /// Check if text is source code
    fn is_code(&self, text: &str) -> bool {
        let lines: Vec<&str> = text.lines().collect();
        let mut code_indicators = 0;

        for line in &lines {
            let trimmed = line.trim();
            
            // Common code patterns
            if trimmed.ends_with(';') || trimmed.ends_with('{') || trimmed.ends_with('}') {
                code_indicators += 1;
            }
            if trimmed.starts_with("//") || trimmed.starts_with("/*") || trimmed.starts_with('#') {
                code_indicators += 1;
            }
            if trimmed.starts_with("import ") || trimmed.starts_with("from ") 
                || trimmed.starts_with("use ") || trimmed.starts_with("require(") {
                code_indicators += 2;
            }
            if trimmed.starts_with("function ") || trimmed.starts_with("fn ") 
                || trimmed.starts_with("def ") || trimmed.starts_with("class ") 
                || trimmed.starts_with("pub ") || trimmed.starts_with("async ") {
                code_indicators += 2;
            }
            if trimmed.contains("=>") || trimmed.contains("->") {
                code_indicators += 1;
            }
            if trimmed.starts_with("if ") || trimmed.starts_with("for ") 
                || trimmed.starts_with("while ") || trimmed.starts_with("match ") {
                code_indicators += 1;
            }
            if trimmed.contains("const ") || trimmed.contains("let ") 
                || trimmed.contains("var ") || trimmed.contains("mut ") {
                code_indicators += 1;
            }
        }

        // Need at least 2 indicators or 20% of lines with indicators
        code_indicators >= 2 || (lines.len() > 0 && code_indicators as f64 / lines.len() as f64 > 0.2)
    }

    /// Check if text is primarily numeric
    fn is_numeric(&self, text: &str) -> bool {
        let text = text.trim();
        if text.is_empty() {
            return false;
        }

        // Allow numbers, operators, and common separators
        let numeric_chars: usize = text.chars()
            .filter(|c| c.is_numeric() || *c == '.' || *c == ',' || *c == '-' 
                || *c == '+' || *c == '*' || *c == '/' || *c == '=' || *c == ' '
                || *c == '(' || *c == ')' || *c == '%' || *c == '^')
            .count();

        numeric_chars as f64 / text.len() as f64 > 0.8
    }

    /// Detect programming language from code
    fn detect_language(&self, text: &str) -> Option<String> {
        let text_lower = text.to_lowercase();

        // Rust
        if text.contains("fn ") && (text.contains("->") || text.contains("pub ") || text.contains("let mut")) {
            return Some("rust".to_string());
        }

        // Python
        if text.contains("def ") && text.contains(':') && !text.contains('{') {
            return Some("python".to_string());
        }
        if text.contains("import ") && !text.contains('{') && !text.contains(';') {
            return Some("python".to_string());
        }

        // JavaScript/TypeScript
        if text.contains("const ") || text.contains("let ") || text.contains("var ") {
            if text.contains(": ") && (text.contains("string") || text.contains("number") || text.contains("boolean")) {
                return Some("typescript".to_string());
            }
            if text.contains("=>") || text.contains("function") {
                return Some("javascript".to_string());
            }
        }

        // Go
        if text.contains("func ") && text.contains("package ") {
            return Some("go".to_string());
        }

        // Java/Kotlin
        if text.contains("public class ") || text.contains("private ") || text.contains("protected ") {
            if text.contains("fun ") {
                return Some("kotlin".to_string());
            }
            return Some("java".to_string());
        }

        // C/C++
        if text.contains("#include") {
            if text.contains("std::") || text.contains("cout") || text.contains("cin") {
                return Some("cpp".to_string());
            }
            return Some("c".to_string());
        }

        // C#
        if text.contains("using System") || text.contains("namespace ") {
            return Some("csharp".to_string());
        }

        // Ruby
        if text.contains("def ") && text.contains("end") && !text.contains('{') {
            return Some("ruby".to_string());
        }

        // PHP
        if text.contains("<?php") || text.contains("$_") {
            return Some("php".to_string());
        }

        // Shell
        if text.starts_with("#!/bin/") || text.contains("echo ") || text.contains("export ") {
            return Some("shell".to_string());
        }

        // SQL
        if text_lower.contains("select ") && text_lower.contains(" from ") {
            return Some("sql".to_string());
        }

        None
    }

    /// Count words in text
    fn count_words(&self, text: &str) -> usize {
        text.split_whitespace().count()
    }

    /// Expand selection to complete word
    pub fn expand_to_word(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        let chars: Vec<char> = text.chars().collect();
        let len = chars.len();
        
        if cursor_pos >= len {
            return (cursor_pos, cursor_pos);
        }

        // Find word boundaries
        let mut start = cursor_pos;
        let mut end = cursor_pos;

        // Expand left
        while start > 0 && Self::is_word_char(chars[start - 1]) {
            start -= 1;
        }

        // Expand right
        while end < len && Self::is_word_char(chars[end]) {
            end += 1;
        }

        (start, end)
    }

    /// Expand selection to complete sentence
    pub fn expand_to_sentence(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        let chars: Vec<char> = text.chars().collect();
        let len = chars.len();
        
        if cursor_pos >= len {
            return (cursor_pos, cursor_pos);
        }

        let sentence_ends = ['.', '!', '?', '。', '！', '？'];
        
        // Find sentence start
        let mut start = cursor_pos;
        while start > 0 {
            if sentence_ends.contains(&chars[start - 1]) {
                break;
            }
            start -= 1;
        }

        // Find sentence end
        let mut end = cursor_pos;
        while end < len {
            if sentence_ends.contains(&chars[end]) {
                end += 1; // Include the punctuation
                break;
            }
            end += 1;
        }

        // Trim whitespace
        while start < end && chars[start].is_whitespace() {
            start += 1;
        }

        (start, end)
    }

    /// Expand selection to complete line
    pub fn expand_to_line(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        let chars: Vec<char> = text.chars().collect();
        let len = chars.len();
        
        if cursor_pos >= len {
            return (cursor_pos, cursor_pos);
        }

        // Find line start
        let mut start = cursor_pos;
        while start > 0 && chars[start - 1] != '\n' {
            start -= 1;
        }

        // Find line end
        let mut end = cursor_pos;
        while end < len && chars[end] != '\n' {
            end += 1;
        }

        (start, end)
    }

    /// Expand selection to complete paragraph
    pub fn expand_to_paragraph(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        let chars: Vec<char> = text.chars().collect();
        let len = chars.len();
        
        if cursor_pos >= len {
            return (cursor_pos, cursor_pos);
        }

        // Find paragraph start (double newline or start of text)
        let mut start = cursor_pos;
        while start > 1 {
            if chars[start - 1] == '\n' && chars[start - 2] == '\n' {
                break;
            }
            start -= 1;
        }

        // Find paragraph end
        let mut end = cursor_pos;
        while end < len - 1 {
            if chars[end] == '\n' && chars[end + 1] == '\n' {
                break;
            }
            end += 1;
        }

        // Trim leading whitespace
        while start < end && chars[start].is_whitespace() {
            start += 1;
        }

        (start, end)
    }

    /// Check if character is part of a word
    fn is_word_char(c: char) -> bool {
        c.is_alphanumeric() || c == '_' || c == '-'
    }

    /// Get last enhanced selection
    pub fn get_last_selection(&self) -> Option<EnhancedSelection> {
        self.last_selection.read().clone()
    }
}

impl Default for EnhancedSelectionDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_detector() {
        let detector = EnhancedSelectionDetector::new();
        assert!(detector.get_last_selection().is_none());
    }

    #[test]
    fn test_analyze_plain_text() {
        let detector = EnhancedSelectionDetector::new();
        let result = detector.analyze("Hello, this is a simple text.", None);
        
        assert_eq!(result.text_type, TextType::PlainText);
        assert!(!result.is_code);
        assert!(!result.is_url);
        assert!(!result.is_email);
        assert_eq!(result.word_count, 6);
    }

    #[test]
    fn test_analyze_url() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("https://example.com/path", None);
        assert_eq!(result.text_type, TextType::Url);
        assert!(result.is_url);
        
        let result = detector.analyze("http://localhost:3000", None);
        assert!(result.is_url);
        
        let result = detector.analyze("www.google.com", None);
        assert!(result.is_url);
    }

    #[test]
    fn test_analyze_email() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("user@example.com", None);
        assert_eq!(result.text_type, TextType::Email);
        assert!(result.is_email);
        
        let result = detector.analyze("test.user+tag@domain.co.uk", None);
        assert!(result.is_email);
    }

    #[test]
    fn test_analyze_file_path() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("C:\\Users\\test\\file.txt", None);
        assert_eq!(result.text_type, TextType::FilePath);
        
        let result = detector.analyze("/home/user/documents/file.rs", None);
        assert_eq!(result.text_type, TextType::FilePath);
    }

    #[test]
    fn test_analyze_json() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze(r#"{"key": "value"}"#, None);
        assert_eq!(result.text_type, TextType::Json);
        
        let result = detector.analyze(r#"[1, 2, 3]"#, None);
        assert_eq!(result.text_type, TextType::Json);
    }

    #[test]
    fn test_analyze_markup() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("<div>Hello</div>", None);
        assert_eq!(result.text_type, TextType::Markup);
        
        let result = detector.analyze("<?xml version=\"1.0\"?>", None);
        assert_eq!(result.text_type, TextType::Markup);
    }

    #[test]
    fn test_analyze_code() {
        let detector = EnhancedSelectionDetector::new();
        
        let rust_code = r#"
fn main() {
    let x = 5;
    println!("{}", x);
}
"#;
        let result = detector.analyze(rust_code, None);
        assert_eq!(result.text_type, TextType::Code);
        assert!(result.is_code);
    }

    #[test]
    fn test_analyze_command_line() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("$ cargo build --release", None);
        assert_eq!(result.text_type, TextType::CommandLine);
        
        let result = detector.analyze("npm install express", None);
        assert_eq!(result.text_type, TextType::CommandLine);
        
        let result = detector.analyze("git commit -m 'message'", None);
        assert_eq!(result.text_type, TextType::CommandLine);
    }

    #[test]
    fn test_analyze_error_message() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("Error: Cannot find module 'express'", None);
        assert_eq!(result.text_type, TextType::ErrorMessage);
        
        let result = detector.analyze("TypeError: undefined is not a function", None);
        assert_eq!(result.text_type, TextType::ErrorMessage);
    }

    #[test]
    fn test_analyze_log_entry() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("[INFO] Application started", None);
        assert_eq!(result.text_type, TextType::LogEntry);
        
        let result = detector.analyze("[ERROR] Connection failed", None);
        assert_eq!(result.text_type, TextType::LogEntry);
    }

    #[test]
    fn test_detect_language_rust() {
        let detector = EnhancedSelectionDetector::new();
        
        let code = "fn main() -> Result<(), Error> { let mut x = 5; }";
        let result = detector.analyze(code, None);
        
        assert!(result.is_code);
        assert_eq!(result.language, Some("rust".to_string()));
    }

    #[test]
    fn test_detect_language_python() {
        let detector = EnhancedSelectionDetector::new();
        
        let code = "def hello():\n    print('Hello')";
        let result = detector.analyze(code, None);
        
        assert_eq!(result.language, Some("python".to_string()));
    }

    #[test]
    fn test_detect_language_javascript() {
        let detector = EnhancedSelectionDetector::new();
        
        let code = "const x = () => { return 5; }";
        let result = detector.analyze(code, None);
        
        assert_eq!(result.language, Some("javascript".to_string()));
    }

    #[test]
    fn test_expand_to_word() {
        let detector = EnhancedSelectionDetector::new();
        let text = "hello world test";
        
        let (start, end) = detector.expand_to_word(text, 7); // cursor on 'o' in 'world'
        assert_eq!(&text[start..end], "world");
        
        let (start, end) = detector.expand_to_word(text, 0); // cursor at start
        assert_eq!(&text[start..end], "hello");
    }

    #[test]
    fn test_expand_to_sentence() {
        let detector = EnhancedSelectionDetector::new();
        let text = "First sentence. Second sentence. Third sentence.";
        
        let (start, end) = detector.expand_to_sentence(text, 20); // cursor in "Second"
        let sentence = &text[start..end];
        assert!(sentence.contains("Second"));
    }

    #[test]
    fn test_expand_to_line() {
        let detector = EnhancedSelectionDetector::new();
        let text = "Line 1\nLine 2\nLine 3";
        
        let (start, end) = detector.expand_to_line(text, 8); // cursor in "Line 2"
        assert_eq!(&text[start..end], "Line 2");
    }

    #[test]
    fn test_expand_to_paragraph() {
        let detector = EnhancedSelectionDetector::new();
        let text = "Paragraph 1 line 1\nParagraph 1 line 2\n\nParagraph 2";
        
        let (start, end) = detector.expand_to_paragraph(text, 5); // cursor in first paragraph
        let para = &text[start..end];
        assert!(para.contains("Paragraph 1"));
    }

    #[test]
    fn test_word_count() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("one two three four five", None);
        assert_eq!(result.word_count, 5);
        
        let result = detector.analyze("   spaced   words   ", None);
        assert_eq!(result.word_count, 2);
    }

    #[test]
    fn test_char_and_line_count() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("Line 1\nLine 2\nLine 3", None);
        assert_eq!(result.line_count, 3);
        assert_eq!(result.char_count, 20);
    }

    #[test]
    fn test_has_numbers() {
        let detector = EnhancedSelectionDetector::new();
        
        let result = detector.analyze("No numbers here", None);
        assert!(!result.has_numbers);
        
        let result = detector.analyze("Has 123 numbers", None);
        assert!(result.has_numbers);
    }

    #[test]
    fn test_get_last_selection() {
        let detector = EnhancedSelectionDetector::new();
        
        assert!(detector.get_last_selection().is_none());
        
        detector.analyze("Test text", None);
        
        let last = detector.get_last_selection();
        assert!(last.is_some());
        assert_eq!(last.unwrap().text, "Test text");
    }

    #[test]
    fn test_source_app_info() {
        let detector = EnhancedSelectionDetector::new();
        
        let source = SourceAppInfo {
            name: "VSCode".to_string(),
            process: "code.exe".to_string(),
            window_title: "main.rs".to_string(),
            app_type: "CodeEditor".to_string(),
        };
        
        let result = detector.analyze("test", Some(source.clone()));
        assert!(result.source_app.is_some());
        assert_eq!(result.source_app.unwrap().name, "VSCode");
    }

    #[test]
    fn test_text_type_serialization() {
        let types = vec![
            TextType::PlainText,
            TextType::Code,
            TextType::Url,
            TextType::Email,
            TextType::FilePath,
            TextType::CommandLine,
            TextType::Json,
            TextType::Markup,
            TextType::Markdown,
            TextType::ErrorMessage,
            TextType::LogEntry,
            TextType::Numeric,
            TextType::Mixed,
        ];
        
        for t in types {
            let json = serde_json::to_string(&t);
            assert!(json.is_ok());
        }
    }
}
