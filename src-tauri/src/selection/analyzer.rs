//! Text analysis module
//!
//! Provides text type detection, language detection, and content analysis.

use crate::selection::types::{Selection, TextType, SourceAppInfo};

/// Text analyzer for classifying and analyzing text content
pub struct TextAnalyzer;

impl TextAnalyzer {
    pub fn new() -> Self {
        log::debug!("[TextAnalyzer] Creating new instance");
        Self
    }

    /// Analyze text and return rich selection info
    pub fn analyze(&self, text: &str, source_app: Option<SourceAppInfo>) -> Selection {
        let text_len = text.len();
        log::debug!("[TextAnalyzer] Analyzing text: {} chars, source_app: {:?}", 
            text_len, source_app.as_ref().map(|s| &s.name));
        
        let text_type = self.detect_text_type(text);
        log::trace!("[TextAnalyzer] Detected text type: {:?}", text_type);
        
        let is_code = matches!(text_type, TextType::Code | TextType::Json | TextType::Markup);
        let language = if is_code { 
            let lang = self.detect_language(text);
            log::trace!("[TextAnalyzer] Detected language: {:?}", lang);
            lang
        } else { 
            None 
        };

        let word_count = self.count_words(text);
        let char_count = text.chars().count();
        let line_count = text.lines().count();
        let is_url = self.is_url(text);
        let is_email = self.is_email(text);
        
        let selection = Selection {
            text: text.to_string(),
            text_before: None,
            text_after: None,
            is_code,
            language: language.clone(),
            is_url,
            is_email,
            has_numbers: text.chars().any(|c| c.is_numeric()),
            word_count,
            char_count,
            line_count,
            text_type: text_type.clone(),
            source_app,
        };

        log::debug!("[TextAnalyzer] Analysis complete: type={:?}, is_code={}, language={:?}, words={}, lines={}",
            text_type, is_code, language, word_count, line_count);
        
        selection
    }

    /// Detect the type of text
    pub fn detect_text_type(&self, text: &str) -> TextType {
        log::trace!("[TextAnalyzer] detect_text_type: analyzing {} chars", text.len());
        let trimmed = text.trim();

        if self.is_url(trimmed) {
            return TextType::Url;
        }
        if self.is_email(trimmed) {
            return TextType::Email;
        }
        if self.is_file_path(trimmed) {
            return TextType::FilePath;
        }
        if self.is_json(trimmed) {
            return TextType::Json;
        }
        if self.is_markup(trimmed) {
            return TextType::Markup;
        }
        if self.is_markdown(trimmed) {
            return TextType::Markdown;
        }
        if self.is_command_line(trimmed) {
            return TextType::CommandLine;
        }
        if self.is_error_message(trimmed) {
            return TextType::ErrorMessage;
        }
        if self.is_log_entry(trimmed) {
            return TextType::LogEntry;
        }
        if self.is_code_text(trimmed) {
            return TextType::Code;
        }
        if self.is_numeric(trimmed) {
            return TextType::Numeric;
        }

        log::trace!("[TextAnalyzer] detect_text_type: defaulting to PlainText");
        TextType::PlainText
    }

    /// Check if text is a URL
    pub fn is_url(&self, text: &str) -> bool {
        let text = text.trim();
        text.starts_with("http://")
            || text.starts_with("https://")
            || text.starts_with("ftp://")
            || text.starts_with("file://")
            || (text.contains("://") && !text.contains(' '))
            || (text.starts_with("www.") && !text.contains(' '))
    }

    /// Check if text is an email
    pub fn is_email(&self, text: &str) -> bool {
        let text = text.trim();
        if text.contains(' ') || !text.contains('@') {
            return false;
        }
        let parts: Vec<&str> = text.split('@').collect();
        parts.len() == 2 && !parts[0].is_empty() && parts[1].contains('.')
    }

    /// Check if text is a file path
    pub fn is_file_path(&self, text: &str) -> bool {
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
                .next_back()
                .map(|f| f.contains('.') && !f.starts_with('.'))
                .unwrap_or(false);
            return has_extension;
        }
        false
    }

    /// Check if text is JSON
    pub fn is_json(&self, text: &str) -> bool {
        let text = text.trim();
        (text.starts_with('{') && text.ends_with('}'))
            || (text.starts_with('[') && text.ends_with(']'))
    }

    /// Check if text is XML/HTML markup
    pub fn is_markup(&self, text: &str) -> bool {
        let text = text.trim();
        (text.starts_with('<') && text.ends_with('>'))
            || text.contains("</")
            || text.contains("/>")
            || text.starts_with("<?xml")
            || text.starts_with("<!DOCTYPE")
    }

    /// Check if text is Markdown
    pub fn is_markdown(&self, text: &str) -> bool {
        let lines: Vec<&str> = text.lines().collect();
        let mut md_indicators = 0;

        for line in &lines {
            let trimmed = line.trim();
            if trimmed.starts_with('#') {
                md_indicators += 1;
            }
            if trimmed.starts_with("- ") || trimmed.starts_with("* ") || trimmed.starts_with("+ ") {
                md_indicators += 1;
            }
            if trimmed.len() > 2 && trimmed.chars().next().map(|c| c.is_numeric()).unwrap_or(false) 
                && trimmed.contains(". ") {
                md_indicators += 1;
            }
            if trimmed.starts_with("```") {
                md_indicators += 2;
            }
            if trimmed.contains("](") && trimmed.contains('[') {
                md_indicators += 1;
            }
            if trimmed.contains("**") || trimmed.contains("__") {
                md_indicators += 1;
            }
        }

        md_indicators >= 2
    }

    /// Check if text is a command line
    pub fn is_command_line(&self, text: &str) -> bool {
        let text = text.trim();
        let first_line = text.lines().next().unwrap_or("");
        
        let cmd_prefixes = ["$", ">", "#", "C:\\>", "PS>", ">>>", "...", "npm ", "yarn ", 
            "pnpm ", "cargo ", "git ", "docker ", "kubectl ", "pip ", "python ", "node ",
            "go ", "rustc ", "gcc ", "make ", "cmake ", "cd ", "ls ", "dir ", "cat ",
            "echo ", "grep ", "find ", "curl ", "wget "];
        
        for prefix in &cmd_prefixes {
            if first_line.starts_with(prefix) {
                return true;
            }
        }

        if text.contains(" | ") || text.contains(" > ") || text.contains(" >> ") 
            || text.contains(" < ") || text.contains(" && ") || text.contains(" || ") {
            return true;
        }

        false
    }

    /// Check if text is an error message
    pub fn is_error_message(&self, text: &str) -> bool {
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

        if text.contains("at ") && (text.contains(".js:") || text.contains(".ts:") 
            || text.contains(".py:") || text.contains(".rs:") || text.contains(".go:")) {
            return true;
        }

        false
    }

    /// Check if text is a log entry
    pub fn is_log_entry(&self, text: &str) -> bool {
        let text_upper = text.to_uppercase();
        
        let log_levels = ["[DEBUG]", "[INFO]", "[WARN]", "[WARNING]", "[ERROR]", 
            "[FATAL]", "[TRACE]", "DEBUG:", "INFO:", "WARN:", "ERROR:"];
        
        for level in &log_levels {
            if text_upper.contains(level) {
                return true;
            }
        }

        let first_line = text.lines().next().unwrap_or("");
        if first_line.len() > 10 {
            let start = &first_line[..10.min(first_line.len())];
            if start.contains('-') && start.chars().filter(|c| c.is_numeric()).count() >= 4 {
                return true;
            }
        }

        false
    }

    /// Check if text is source code
    pub fn is_code_text(&self, text: &str) -> bool {
        let lines: Vec<&str> = text.lines().collect();
        let mut code_indicators = 0;

        for line in &lines {
            let trimmed = line.trim();
            
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

        code_indicators >= 2 || (!lines.is_empty() && code_indicators as f64 / lines.len() as f64 > 0.2)
    }

    /// Check if text is primarily numeric
    pub fn is_numeric(&self, text: &str) -> bool {
        let text = text.trim();
        if text.is_empty() {
            return false;
        }

        let numeric_chars: usize = text.chars()
            .filter(|c| c.is_numeric() || *c == '.' || *c == ',' || *c == '-' 
                || *c == '+' || *c == '*' || *c == '/' || *c == '=' || *c == ' '
                || *c == '(' || *c == ')' || *c == '%' || *c == '^')
            .count();

        numeric_chars as f64 / text.len() as f64 > 0.8
    }

    /// Detect programming language from code
    pub fn detect_language(&self, text: &str) -> Option<String> {
        log::trace!("[TextAnalyzer] detect_language: analyzing {} chars", text.len());
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
    pub fn count_words(&self, text: &str) -> usize {
        text.split_whitespace().count()
    }
}

impl Default for TextAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_plain_text() {
        let analyzer = TextAnalyzer::new();
        let result = analyzer.analyze("Hello, this is a simple text.", None);
        
        assert_eq!(result.text_type, TextType::PlainText);
        assert!(!result.is_code);
        assert_eq!(result.word_count, 6);
    }

    #[test]
    fn test_analyze_url() {
        let analyzer = TextAnalyzer::new();
        
        let result = analyzer.analyze("https://example.com/path", None);
        assert_eq!(result.text_type, TextType::Url);
        assert!(result.is_url);
    }

    #[test]
    fn test_analyze_email() {
        let analyzer = TextAnalyzer::new();
        
        let result = analyzer.analyze("user@example.com", None);
        assert_eq!(result.text_type, TextType::Email);
        assert!(result.is_email);
    }

    #[test]
    fn test_analyze_code() {
        let analyzer = TextAnalyzer::new();
        
        let rust_code = "fn main() {\n    let x = 5;\n}";
        let result = analyzer.analyze(rust_code, None);
        assert_eq!(result.text_type, TextType::Code);
        assert!(result.is_code);
    }

    #[test]
    fn test_detect_language_rust() {
        let analyzer = TextAnalyzer::new();
        let code = "fn main() -> Result<(), Error> { let mut x = 5; }";
        let lang = analyzer.detect_language(code);
        assert_eq!(lang, Some("rust".to_string()));
    }

    #[test]
    fn test_detect_language_python() {
        let analyzer = TextAnalyzer::new();
        let code = "def hello():\n    print('Hello')";
        let lang = analyzer.detect_language(code);
        assert_eq!(lang, Some("python".to_string()));
    }

    #[test]
    fn test_word_count() {
        let analyzer = TextAnalyzer::new();
        let result = analyzer.analyze("one two three four five", None);
        assert_eq!(result.word_count, 5);
    }

    #[test]
    fn test_is_file_path() {
        let analyzer = TextAnalyzer::new();
        assert!(analyzer.is_file_path("C:\\Users\\test\\file.txt"));
        assert!(analyzer.is_file_path("/home/user/file.rs"));
    }

    #[test]
    fn test_is_json() {
        let analyzer = TextAnalyzer::new();
        assert!(analyzer.is_json(r#"{"key": "value"}"#));
        assert!(analyzer.is_json("[1, 2, 3]"));
    }
}
