//! Text selection detector
//!
//! Main orchestrator that combines text extraction, analysis, and expansion components.

use parking_lot::RwLock;
use std::sync::Arc;

use crate::selection::analyzer::TextAnalyzer;
use crate::selection::expander::SelectionExpander;
use crate::selection::extractor::TextExtractor;
use crate::selection::types::{Selection, SourceAppInfo};

/// Text selection detector with analysis capabilities
///
/// Combines:
/// - `TextExtractor` for platform-specific text extraction
/// - `TextAnalyzer` for text analysis and classification
/// - `SelectionExpander` for selection expansion methods
pub struct SelectionDetector {
    /// Text extractor for retrieving selected text
    extractor: TextExtractor,
    /// Text analyzer for classification
    analyzer: TextAnalyzer,
    /// Selection expander for boundary expansion
    expander: SelectionExpander,
    /// Last analyzed selection
    last_selection: Arc<RwLock<Option<Selection>>>,
}

impl SelectionDetector {
    pub fn new() -> Self {
        log::debug!("[SelectionDetector] Creating new instance");
        Self {
            extractor: TextExtractor::new(),
            analyzer: TextAnalyzer::new(),
            expander: SelectionExpander::new(),
            last_selection: Arc::new(RwLock::new(None)),
        }
    }

    // ========================================================================
    // Text Extraction (delegated to TextExtractor)
    // ========================================================================

    /// Get selected text from the focused application
    pub fn get_selected_text(&self) -> Result<Option<String>, String> {
        self.extractor.get_selected_text()
    }

    /// Get detection statistics
    pub fn get_stats(&self) -> (u32, u32) {
        self.extractor.get_stats()
    }

    /// Get time since last successful detection
    pub fn time_since_last_detection(&self) -> Option<std::time::Duration> {
        self.extractor.time_since_last_detection()
    }

    /// Get the last detected text
    pub fn get_last_text(&self) -> Option<String> {
        self.extractor.get_last_text()
    }

    /// Clear the last detected text
    pub fn clear_last_text(&self) {
        self.extractor.clear_last_text()
    }

    // ========================================================================
    // Text Analysis (delegated to TextAnalyzer)
    // ========================================================================

    /// Analyze selected text and return rich selection info
    pub fn analyze(&self, text: &str, source_app: Option<SourceAppInfo>) -> Selection {
        let selection = self.analyzer.analyze(text, source_app);
        *self.last_selection.write() = Some(selection.clone());
        selection
    }

    /// Get last analyzed selection
    pub fn get_last_selection(&self) -> Option<Selection> {
        let selection = self.last_selection.read().clone();
        log::trace!(
            "[SelectionDetector] get_last_selection: has_selection={}",
            selection.is_some()
        );
        selection
    }

    // ========================================================================
    // Selection Expansion (delegated to SelectionExpander)
    // ========================================================================

    /// Expand selection to complete word
    pub fn expand_to_word(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        self.expander.expand_to_word(text, cursor_pos)
    }

    /// Expand selection to complete sentence
    pub fn expand_to_sentence(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        self.expander.expand_to_sentence(text, cursor_pos)
    }

    /// Expand selection to complete line
    pub fn expand_to_line(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        self.expander.expand_to_line(text, cursor_pos)
    }

    /// Expand selection to complete paragraph
    pub fn expand_to_paragraph(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        self.expander.expand_to_paragraph(text, cursor_pos)
    }
}

impl Default for SelectionDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::selection::types::TextType;

    #[test]
    fn test_new_detector() {
        let detector = SelectionDetector::new();
        assert!(detector.get_last_text().is_none());
        assert!(detector.get_last_selection().is_none());
    }

    #[test]
    fn test_initial_stats() {
        let detector = SelectionDetector::new();
        let (attempts, successes) = detector.get_stats();
        assert_eq!(attempts, 0);
        assert_eq!(successes, 0);
    }

    #[test]
    fn test_analyze_stores_last_selection() {
        let detector = SelectionDetector::new();

        assert!(detector.get_last_selection().is_none());

        detector.analyze("Test text", None);

        let last = detector.get_last_selection();
        assert!(last.is_some());
        assert_eq!(last.unwrap().text, "Test text");
    }

    #[test]
    fn test_analyze_plain_text() {
        let detector = SelectionDetector::new();
        let result = detector.analyze("Hello, this is a simple text.", None);

        assert_eq!(result.text_type, TextType::PlainText);
        assert!(!result.is_code);
        assert_eq!(result.word_count, 6);
    }

    #[test]
    fn test_analyze_url() {
        let detector = SelectionDetector::new();
        let result = detector.analyze("https://example.com/path", None);

        assert_eq!(result.text_type, TextType::Url);
        assert!(result.is_url);
    }

    #[test]
    fn test_analyze_code() {
        let detector = SelectionDetector::new();
        let rust_code = "fn main() {\n    let x = 5;\n}";
        let result = detector.analyze(rust_code, None);

        assert_eq!(result.text_type, TextType::Code);
        assert!(result.is_code);
    }

    #[test]
    fn test_expand_to_word() {
        let detector = SelectionDetector::new();
        let text = "hello world test";

        let (start, end) = detector.expand_to_word(text, 7);
        assert_eq!(&text[start..end], "world");
    }

    #[test]
    fn test_expand_to_sentence() {
        let detector = SelectionDetector::new();
        let text = "First sentence. Second sentence.";

        let (start, end) = detector.expand_to_sentence(text, 20);
        let sentence = &text[start..end];
        assert!(sentence.contains("Second"));
    }

    #[test]
    fn test_expand_to_line() {
        let detector = SelectionDetector::new();
        let text = "Line 1\nLine 2\nLine 3";

        let (start, end) = detector.expand_to_line(text, 8);
        assert_eq!(&text[start..end], "Line 2");
    }

    #[test]
    fn test_expand_to_paragraph() {
        let detector = SelectionDetector::new();
        let text = "Para 1 line 1\nPara 1 line 2\n\nPara 2";

        let (start, end) = detector.expand_to_paragraph(text, 5);
        let para = &text[start..end];
        assert!(para.contains("Para 1"));
    }

    #[test]
    fn test_time_since_last_detection_initial() {
        let detector = SelectionDetector::new();
        assert!(detector.time_since_last_detection().is_none());
    }

    #[test]
    fn test_default_impl() {
        let detector = SelectionDetector::default();
        assert!(detector.get_last_text().is_none());
    }
}
