//! Smart selection capabilities
//!
//! Provides intelligent text selection features including:
//! - Smart expansion (word, sentence, paragraph, code block)
//! - Context-aware selection
//! - Application-specific optimizations

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Smart selection mode
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum SelectionMode {
    /// Normal character-by-character selection
    Normal,
    /// Word selection (double-click behavior)
    Word,
    /// Line selection (triple-click behavior)
    Line,
    /// Sentence selection
    Sentence,
    /// Paragraph selection
    Paragraph,
    /// Code block selection (for code editors)
    CodeBlock,
    /// Function/method selection
    Function,
    /// Bracket/parenthesis matching
    BracketMatch,
    /// Quote matching (single, double, backtick)
    QuoteMatch,
    /// URL selection
    Url,
    /// Email selection
    Email,
    /// File path selection
    FilePath,
}

/// Selection expansion result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionExpansion {
    /// Original selection start
    pub original_start: usize,
    /// Original selection end
    pub original_end: usize,
    /// Expanded selection start
    pub expanded_start: usize,
    /// Expanded selection end
    pub expanded_end: usize,
    /// The expanded text
    pub expanded_text: String,
    /// The expansion mode used
    pub mode: SelectionMode,
    /// Confidence score (0.0 - 1.0)
    pub confidence: f64,
}

/// Smart selection context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionContext {
    /// Full text content
    pub full_text: String,
    /// Current cursor/selection position
    pub cursor_pos: usize,
    /// Current selection start (if any)
    pub selection_start: Option<usize>,
    /// Current selection end (if any)
    pub selection_end: Option<usize>,
    /// Source application type
    pub app_type: Option<String>,
    /// Whether the content is code
    pub is_code: bool,
    /// Detected language (for code)
    pub language: Option<String>,
}

/// Smart selection engine
pub struct SmartSelection {
    /// Bracket pairs for matching
    bracket_pairs: Vec<(char, char)>,
    /// Quote characters
    quote_chars: Vec<char>,
}

impl SmartSelection {
    pub fn new() -> Self {
        log::debug!("[SmartSelection] Creating new instance");
        Self {
            bracket_pairs: vec![('(', ')'), ('[', ']'), ('{', '}'), ('<', '>')],
            quote_chars: vec!['"', '\'', '`'],
        }
    }

    /// Expand selection based on mode
    pub fn expand(&self, context: &SelectionContext, mode: SelectionMode) -> SelectionExpansion {
        let chars: Vec<char> = context.full_text.chars().collect();
        let cursor = context.cursor_pos.min(chars.len());

        let (start, end) = match mode {
            SelectionMode::Word => self.expand_word(&chars, cursor),
            SelectionMode::Line => self.expand_line(&chars, cursor),
            SelectionMode::Sentence => self.expand_sentence(&chars, cursor),
            SelectionMode::Paragraph => self.expand_paragraph(&chars, cursor),
            SelectionMode::CodeBlock => self.expand_code_block(&chars, cursor),
            SelectionMode::Function => {
                self.expand_function(&chars, cursor, context.language.as_deref())
            }
            SelectionMode::BracketMatch => self.expand_bracket(&chars, cursor),
            SelectionMode::QuoteMatch => self.expand_quote(&chars, cursor),
            SelectionMode::Url => self.expand_url(&chars, cursor),
            SelectionMode::Email => self.expand_email(&chars, cursor),
            SelectionMode::FilePath => self.expand_file_path(&chars, cursor),
            SelectionMode::Normal => (cursor, cursor),
        };

        let expanded_text: String = chars[start..end].iter().collect();

        SelectionExpansion {
            original_start: cursor,
            original_end: cursor,
            expanded_start: start,
            expanded_end: end,
            expanded_text,
            mode,
            confidence: 1.0,
        }
    }

    /// Auto-detect best expansion mode based on context
    pub fn auto_expand(&self, context: &SelectionContext) -> SelectionExpansion {
        let chars: Vec<char> = context.full_text.chars().collect();
        let cursor = context.cursor_pos.min(chars.len());

        // Try different modes and pick the best one
        let _modes_to_try = if context.is_code {
            vec![
                SelectionMode::BracketMatch,
                SelectionMode::QuoteMatch,
                SelectionMode::Word,
                SelectionMode::Line,
            ]
        } else {
            vec![
                SelectionMode::Url,
                SelectionMode::Email,
                SelectionMode::QuoteMatch,
                SelectionMode::Word,
                SelectionMode::Sentence,
            ]
        };

        // Check if cursor is on a URL
        if let Some(url_expansion) = self.try_expand_url(&chars, cursor) {
            return url_expansion;
        }

        // Check if cursor is on an email
        if let Some(email_expansion) = self.try_expand_email(&chars, cursor) {
            return email_expansion;
        }

        // Check if cursor is inside quotes
        if let Some(quote_expansion) = self.try_expand_quote(&chars, cursor) {
            return quote_expansion;
        }

        // Check if cursor is inside brackets
        if let Some(bracket_expansion) = self.try_expand_bracket(&chars, cursor) {
            return bracket_expansion;
        }

        // Default to word expansion
        self.expand(context, SelectionMode::Word)
    }

    /// Expand to word boundaries
    fn expand_word(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        if cursor >= chars.len() {
            return (cursor, cursor);
        }

        let mut start = cursor;
        let mut end = cursor;

        // Expand left
        while start > 0 && Self::is_word_char(chars[start - 1]) {
            start -= 1;
        }

        // Expand right
        while end < chars.len() && Self::is_word_char(chars[end]) {
            end += 1;
        }

        log::trace!("[SmartSelection] expand_word: result=({}, {})", start, end);
        (start, end)
    }

    /// Expand to line boundaries
    fn expand_line(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        if cursor >= chars.len() {
            return (cursor, cursor);
        }

        let mut start = cursor;
        let mut end = cursor;

        // Find line start
        while start > 0 && chars[start - 1] != '\n' {
            start -= 1;
        }

        // Find line end
        while end < chars.len() && chars[end] != '\n' {
            end += 1;
        }

        log::trace!("[SmartSelection] expand_line: result=({}, {})", start, end);
        (start, end)
    }

    /// Expand to sentence boundaries
    fn expand_sentence(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        if cursor >= chars.len() {
            return (cursor, cursor);
        }

        let sentence_ends = ['.', '!', '?', '。', '！', '？', '；'];

        let mut start = cursor;
        let mut end = cursor;

        // Find sentence start
        while start > 0 {
            if sentence_ends.contains(&chars[start - 1]) {
                break;
            }
            start -= 1;
        }

        // Find sentence end
        while end < chars.len() {
            if sentence_ends.contains(&chars[end]) {
                end += 1; // Include the punctuation
                break;
            }
            end += 1;
        }

        // Trim leading whitespace
        while start < end && chars[start].is_whitespace() {
            start += 1;
        }

        log::trace!(
            "[SmartSelection] expand_sentence: result=({}, {})",
            start,
            end
        );
        (start, end)
    }

    /// Expand to paragraph boundaries
    fn expand_paragraph(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        if cursor >= chars.len() {
            return (cursor, cursor);
        }

        let mut start = cursor;
        let mut end = cursor;

        // Find paragraph start (double newline or start of text)
        while start > 1 {
            if chars[start - 1] == '\n' && chars[start - 2] == '\n' {
                break;
            }
            start -= 1;
        }

        // Find paragraph end
        while end < chars.len() - 1 {
            if chars[end] == '\n' && chars[end + 1] == '\n' {
                break;
            }
            end += 1;
        }

        // Trim leading whitespace
        while start < end && chars[start].is_whitespace() {
            start += 1;
        }

        log::trace!(
            "[SmartSelection] expand_paragraph: result=({}, {})",
            start,
            end
        );
        (start, end)
    }

    /// Expand to code block (indentation-based)
    fn expand_code_block(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        // First, expand to current line
        let (line_start, line_end) = self.expand_line(chars, cursor);

        // Get indentation of current line
        let current_indent = self.get_indentation(chars, line_start);

        let mut start = line_start;
        let mut end = line_end;

        // Expand up while indentation is >= current
        let mut pos = line_start;
        while pos > 0 {
            // Find previous line start
            let mut prev_line_start = pos - 1;
            while prev_line_start > 0 && chars[prev_line_start - 1] != '\n' {
                prev_line_start -= 1;
            }

            let prev_indent = self.get_indentation(chars, prev_line_start);

            // Check if line is empty or has same/greater indentation
            let is_empty = self.is_empty_line(chars, prev_line_start);
            if is_empty || prev_indent >= current_indent {
                start = prev_line_start;
                pos = prev_line_start;
            } else {
                break;
            }
        }

        // Expand down while indentation is >= current
        pos = line_end;
        while pos < chars.len() {
            // Skip newline
            if pos < chars.len() && chars[pos] == '\n' {
                pos += 1;
            }

            if pos >= chars.len() {
                break;
            }

            let next_indent = self.get_indentation(chars, pos);
            let is_empty = self.is_empty_line(chars, pos);

            if is_empty || next_indent >= current_indent {
                // Find end of this line
                let mut next_line_end = pos;
                while next_line_end < chars.len() && chars[next_line_end] != '\n' {
                    next_line_end += 1;
                }
                end = next_line_end;
                pos = next_line_end;
            } else {
                break;
            }
        }

        log::trace!(
            "[SmartSelection] expand_code_block: result=({}, {})",
            start,
            end
        );
        (start, end)
    }

    /// Expand to function boundaries
    fn expand_function(
        &self,
        chars: &[char],
        cursor: usize,
        language: Option<&str>,
    ) -> (usize, usize) {
        // Find opening brace before cursor
        let mut brace_pos = None;
        let mut pos = cursor;

        while pos > 0 {
            if chars[pos - 1] == '{' {
                brace_pos = Some(pos - 1);
                break;
            }
            pos -= 1;
        }

        if let Some(open_pos) = brace_pos {
            // Find matching closing brace
            if let Some(close_pos) = self.find_matching_bracket(chars, open_pos) {
                // Expand to include function signature
                let mut start = open_pos;
                while start > 0 && chars[start - 1] != '\n' {
                    start -= 1;
                }

                // Look for function keyword
                let keywords = match language {
                    Some("rust") => vec!["fn ", "pub fn ", "async fn ", "pub async fn "],
                    Some("javascript") | Some("typescript") => {
                        vec!["function ", "async function ", "const ", "let ", "var "]
                    }
                    Some("python") => vec!["def ", "async def "],
                    _ => vec!["function ", "fn ", "def "],
                };

                // Search backwards for function keyword
                let mut search_pos = start;
                while search_pos > 0 {
                    let line_text: String = chars[search_pos..open_pos].iter().collect();
                    if keywords.iter().any(|k| line_text.contains(k)) {
                        start = search_pos;
                        break;
                    }

                    // Go to previous line
                    if search_pos > 0 {
                        search_pos -= 1;
                        while search_pos > 0 && chars[search_pos - 1] != '\n' {
                            search_pos -= 1;
                        }
                    }

                    // Don't search too far
                    if open_pos - search_pos > 500 {
                        break;
                    }
                }

                log::trace!(
                    "[SmartSelection] expand_function: result=({}, {})",
                    start,
                    close_pos + 1
                );
                return (start, close_pos + 1);
            }
        }

        // Fallback to code block
        self.expand_code_block(chars, cursor)
    }

    /// Expand to matching brackets
    fn expand_bracket(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        if cursor >= chars.len() {
            return (cursor, cursor);
        }

        // Check if cursor is on a bracket
        let current_char = chars[cursor];

        // Check opening brackets
        for (open, close) in &self.bracket_pairs {
            if current_char == *open {
                if let Some(close_pos) = self.find_matching_bracket(chars, cursor) {
                    log::trace!(
                        "[SmartSelection] expand_bracket: found matching bracket ({}, {})",
                        cursor,
                        close_pos + 1
                    );
                    return (cursor, close_pos + 1);
                }
            }
            if current_char == *close {
                if let Some(open_pos) = self.find_matching_bracket_reverse(chars, cursor) {
                    log::trace!(
                        "[SmartSelection] expand_bracket: found matching bracket ({}, {})",
                        open_pos,
                        cursor + 1
                    );
                    return (open_pos, cursor + 1);
                }
            }
        }

        // Search for enclosing brackets
        if let Some((start, end)) = self.find_enclosing_brackets(chars, cursor) {
            log::trace!(
                "[SmartSelection] expand_bracket: found enclosing brackets ({}, {})",
                start,
                end + 1
            );
            return (start, end + 1);
        }

        (cursor, cursor)
    }

    /// Expand to matching quotes
    fn expand_quote(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        if cursor >= chars.len() {
            return (cursor, cursor);
        }

        for quote in &self.quote_chars {
            if let Some((start, end)) = self.find_enclosing_quotes(chars, cursor, *quote) {
                log::trace!(
                    "[SmartSelection] expand_quote: found enclosing quotes ({}, {})",
                    start,
                    end + 1
                );
                return (start, end + 1);
            }
        }

        (cursor, cursor)
    }

    /// Expand to URL
    fn expand_url(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        if cursor >= chars.len() {
            return (cursor, cursor);
        }

        let url_chars = |c: char| c.is_alphanumeric() || "/:.-_~!$&'()*+,;=?@#%[]".contains(c);

        let mut start = cursor;
        let mut end = cursor;

        // Expand left
        while start > 0 && url_chars(chars[start - 1]) {
            start -= 1;
        }

        // Expand right
        while end < chars.len() && url_chars(chars[end]) {
            end += 1;
        }

        // Verify it looks like a URL
        let text: String = chars[start..end].iter().collect();
        if text.contains("://") || text.starts_with("www.") {
            log::trace!(
                "[SmartSelection] expand_url: found URL ({}, {})",
                start,
                end
            );
            (start, end)
        } else {
            (cursor, cursor)
        }
    }

    /// Expand to email
    fn expand_email(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        if cursor >= chars.len() {
            return (cursor, cursor);
        }

        let email_chars = |c: char| c.is_alphanumeric() || ".@_+-".contains(c);

        let mut start = cursor;
        let mut end = cursor;

        // Expand left
        while start > 0 && email_chars(chars[start - 1]) {
            start -= 1;
        }

        // Expand right
        while end < chars.len() && email_chars(chars[end]) {
            end += 1;
        }

        // Verify it looks like an email
        let text: String = chars[start..end].iter().collect();
        if text.contains('@') && text.contains('.') {
            let parts: Vec<&str> = text.split('@').collect();
            if parts.len() == 2 && !parts[0].is_empty() && parts[1].contains('.') {
                log::trace!(
                    "[SmartSelection] expand_email: found email ({}, {})",
                    start,
                    end
                );
                return (start, end);
            }
        }

        (cursor, cursor)
    }

    /// Expand to file path
    fn expand_file_path(&self, chars: &[char], cursor: usize) -> (usize, usize) {
        if cursor >= chars.len() {
            return (cursor, cursor);
        }

        let path_chars = |c: char| c.is_alphanumeric() || "/\\:._-".contains(c);

        let mut start = cursor;
        let mut end = cursor;

        // Expand left
        while start > 0 && path_chars(chars[start - 1]) {
            start -= 1;
        }

        // Expand right
        while end < chars.len() && path_chars(chars[end]) {
            end += 1;
        }

        // Verify it looks like a path
        let text: String = chars[start..end].iter().collect();
        if text.contains('/')
            || text.contains('\\')
            || (text.len() >= 3 && text.chars().nth(1) == Some(':'))
        {
            log::trace!(
                "[SmartSelection] expand_file_path: found file path ({}, {})",
                start,
                end
            );
            (start, end)
        } else {
            (cursor, cursor)
        }
    }

    // Helper methods

    fn is_word_char(c: char) -> bool {
        c.is_alphanumeric() || c == '_' || c == '-'
    }

    fn get_indentation(&self, chars: &[char], line_start: usize) -> usize {
        let mut indent = 0;
        let mut pos = line_start;
        while pos < chars.len() && (chars[pos] == ' ' || chars[pos] == '\t') {
            indent += if chars[pos] == '\t' { 4 } else { 1 };
            pos += 1;
        }
        indent
    }

    fn is_empty_line(&self, chars: &[char], line_start: usize) -> bool {
        let mut pos = line_start;
        while pos < chars.len() && chars[pos] != '\n' {
            if !chars[pos].is_whitespace() {
                return false;
            }
            pos += 1;
        }
        true
    }

    fn find_matching_bracket(&self, chars: &[char], open_pos: usize) -> Option<usize> {
        let open_char = chars[open_pos];
        let close_char = self
            .bracket_pairs
            .iter()
            .find(|(o, _)| *o == open_char)
            .map(|(_, c)| *c)?;

        let mut depth = 1;
        let mut pos = open_pos + 1;

        while pos < chars.len() && depth > 0 {
            if chars[pos] == open_char {
                depth += 1;
            } else if chars[pos] == close_char {
                depth -= 1;
            }
            if depth > 0 {
                pos += 1;
            }
        }

        if depth == 0 {
            Some(pos)
        } else {
            None
        }
    }

    fn find_matching_bracket_reverse(&self, chars: &[char], close_pos: usize) -> Option<usize> {
        let close_char = chars[close_pos];
        let open_char = self
            .bracket_pairs
            .iter()
            .find(|(_, c)| *c == close_char)
            .map(|(o, _)| *o)?;

        let mut depth = 1;
        let mut pos = close_pos;

        while pos > 0 && depth > 0 {
            pos -= 1;
            if chars[pos] == close_char {
                depth += 1;
            } else if chars[pos] == open_char {
                depth -= 1;
            }
        }

        if depth == 0 {
            Some(pos)
        } else {
            None
        }
    }

    fn find_enclosing_brackets(&self, chars: &[char], cursor: usize) -> Option<(usize, usize)> {
        for (open, close) in &self.bracket_pairs {
            // Search backwards for opening bracket
            let mut pos = cursor;
            let mut depth = 0;

            while pos > 0 {
                pos -= 1;
                if chars[pos] == *close {
                    depth += 1;
                } else if chars[pos] == *open {
                    if depth == 0 {
                        // Found opening bracket, now find closing
                        if let Some(close_pos) = self.find_matching_bracket(chars, pos) {
                            if close_pos >= cursor {
                                return Some((pos, close_pos));
                            }
                        }
                    } else {
                        depth -= 1;
                    }
                }
            }
        }
        None
    }

    fn find_enclosing_quotes(
        &self,
        chars: &[char],
        cursor: usize,
        quote: char,
    ) -> Option<(usize, usize)> {
        // Count quotes before cursor
        let mut quote_positions: Vec<usize> = Vec::new();
        for (i, &c) in chars.iter().enumerate() {
            if c == quote {
                // Check for escape
                if i > 0 && chars[i - 1] == '\\' {
                    continue;
                }
                quote_positions.push(i);
            }
        }

        // Find pair that encloses cursor
        for pair in quote_positions.chunks(2) {
            if pair.len() == 2 && pair[0] < cursor && pair[1] >= cursor {
                return Some((pair[0], pair[1]));
            }
        }

        None
    }

    // Try methods that return Option

    fn try_expand_url(&self, chars: &[char], cursor: usize) -> Option<SelectionExpansion> {
        let (start, end) = self.expand_url(chars, cursor);
        if start != end {
            let text: String = chars[start..end].iter().collect();
            Some(SelectionExpansion {
                original_start: cursor,
                original_end: cursor,
                expanded_start: start,
                expanded_end: end,
                expanded_text: text,
                mode: SelectionMode::Url,
                confidence: 0.9,
            })
        } else {
            None
        }
    }

    fn try_expand_email(&self, chars: &[char], cursor: usize) -> Option<SelectionExpansion> {
        let (start, end) = self.expand_email(chars, cursor);
        if start != end {
            let text: String = chars[start..end].iter().collect();
            Some(SelectionExpansion {
                original_start: cursor,
                original_end: cursor,
                expanded_start: start,
                expanded_end: end,
                expanded_text: text,
                mode: SelectionMode::Email,
                confidence: 0.9,
            })
        } else {
            None
        }
    }

    fn try_expand_quote(&self, chars: &[char], cursor: usize) -> Option<SelectionExpansion> {
        let (start, end) = self.expand_quote(chars, cursor);
        if start != end {
            let text: String = chars[start..end].iter().collect();
            Some(SelectionExpansion {
                original_start: cursor,
                original_end: cursor,
                expanded_start: start,
                expanded_end: end,
                expanded_text: text,
                mode: SelectionMode::QuoteMatch,
                confidence: 0.85,
            })
        } else {
            None
        }
    }

    fn try_expand_bracket(&self, chars: &[char], cursor: usize) -> Option<SelectionExpansion> {
        let (start, end) = self.expand_bracket(chars, cursor);
        if start != end {
            let text: String = chars[start..end].iter().collect();
            Some(SelectionExpansion {
                original_start: cursor,
                original_end: cursor,
                expanded_start: start,
                expanded_end: end,
                expanded_text: text,
                mode: SelectionMode::BracketMatch,
                confidence: 0.85,
            })
        } else {
            None
        }
    }
}

impl Default for SmartSelection {
    fn default() -> Self {
        log::debug!("[SmartSelection] Creating default instance");
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_word_expansion() {
        let smart = SmartSelection::new();
        let text = "hello world test";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_word(&chars, 7); // cursor on 'o' in 'world'
        assert_eq!(&text[start..end], "world");
    }

    #[test]
    fn test_url_expansion() {
        let smart = SmartSelection::new();
        let text = "visit https://example.com/path for more";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_url(&chars, 15); // cursor in URL
        assert_eq!(&text[start..end], "https://example.com/path");
    }

    #[test]
    fn test_bracket_expansion() {
        let smart = SmartSelection::new();
        let text = "function(arg1, arg2)";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_bracket(&chars, 8); // cursor on '('
        assert_eq!(&text[start..end], "(arg1, arg2)");
    }

    #[test]
    fn test_line_expansion() {
        let smart = SmartSelection::new();
        let text = "line 1\nline 2\nline 3";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_line(&chars, 10); // cursor in "line 2"
        assert_eq!(&text[start..end], "line 2");
    }

    #[test]
    fn test_sentence_expansion() {
        let smart = SmartSelection::new();
        let text = "First sentence. Second sentence. Third sentence.";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_sentence(&chars, 20); // cursor in "Second"
        let sentence = &text[start..end];
        assert!(sentence.contains("Second"));
        assert!(sentence.ends_with('.'));
    }

    #[test]
    fn test_paragraph_expansion() {
        let smart = SmartSelection::new();
        let text = "Para 1 line 1\nPara 1 line 2\n\nPara 2 line 1";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_paragraph(&chars, 5); // cursor in first paragraph
        let para = &text[start..end];
        assert!(para.contains("Para 1"));
    }

    #[test]
    fn test_email_expansion() {
        let smart = SmartSelection::new();
        let text = "Contact us at user@example.com for more info";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_email(&chars, 20); // cursor in email
        assert_eq!(&text[start..end], "user@example.com");
    }

    #[test]
    fn test_file_path_expansion() {
        let smart = SmartSelection::new();
        let text = "Open the file C:/Users/test/file.txt to edit";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_file_path(&chars, 20); // cursor in path
        let path = &text[start..end];
        assert!(path.contains("C:"));
        assert!(path.contains("file.txt"));
    }

    #[test]
    fn test_code_block_expansion() {
        let smart = SmartSelection::new();
        let text = "fn main() {\n    let x = 5;\n    println!(\"{}\", x);\n}";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_code_block(&chars, 20); // cursor inside function
        let block = &text[start..end];
        assert!(block.contains("let x"));
    }

    #[test]
    fn test_quote_expansion() {
        let smart = SmartSelection::new();
        let text = r#"He said "hello world" to everyone"#;
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_quote(&chars, 15); // cursor inside quotes
        let quoted = &text[start..end];
        assert!(quoted.contains("hello world"));
    }

    #[test]
    fn test_auto_expand_url() {
        let smart = SmartSelection::new();
        let context = SelectionContext {
            full_text: "Visit https://example.com for more".to_string(),
            cursor_pos: 10,
            selection_start: None,
            selection_end: None,
            app_type: None,
            is_code: false,
            language: None,
        };

        let expansion = smart.auto_expand(&context);
        assert_eq!(expansion.mode, SelectionMode::Url);
    }

    #[test]
    fn test_auto_expand_email() {
        let smart = SmartSelection::new();
        let context = SelectionContext {
            full_text: "Email me at test@example.com please".to_string(),
            cursor_pos: 18,
            selection_start: None,
            selection_end: None,
            app_type: None,
            is_code: false,
            language: None,
        };

        let expansion = smart.auto_expand(&context);
        assert_eq!(expansion.mode, SelectionMode::Email);
    }

    #[test]
    fn test_expand_with_context() {
        let smart = SmartSelection::new();
        let context = SelectionContext {
            full_text: "hello world test".to_string(),
            cursor_pos: 7,
            selection_start: None,
            selection_end: None,
            app_type: None,
            is_code: false,
            language: None,
        };

        let expansion = smart.expand(&context, SelectionMode::Word);
        assert_eq!(expansion.expanded_text, "world");
        assert_eq!(expansion.mode, SelectionMode::Word);
        assert_eq!(expansion.confidence, 1.0);
    }

    #[test]
    fn test_selection_mode_serialization() {
        let modes = vec![
            SelectionMode::Normal,
            SelectionMode::Word,
            SelectionMode::Line,
            SelectionMode::Sentence,
            SelectionMode::Paragraph,
            SelectionMode::CodeBlock,
            SelectionMode::Function,
            SelectionMode::BracketMatch,
            SelectionMode::QuoteMatch,
            SelectionMode::Url,
            SelectionMode::Email,
            SelectionMode::FilePath,
        ];

        for mode in modes {
            let json = serde_json::to_string(&mode);
            assert!(json.is_ok());
        }
    }

    #[test]
    fn test_selection_expansion_serialization() {
        let expansion = SelectionExpansion {
            original_start: 0,
            original_end: 5,
            expanded_start: 0,
            expanded_end: 10,
            expanded_text: "hello world".to_string(),
            mode: SelectionMode::Word,
            confidence: 0.95,
        };

        let json = serde_json::to_string(&expansion);
        assert!(json.is_ok());

        let parsed: Result<SelectionExpansion, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
    }

    #[test]
    fn test_nested_brackets() {
        let smart = SmartSelection::new();
        let text = "outer(inner(deep))";
        let chars: Vec<char> = text.chars().collect();

        // Cursor on outer opening bracket
        let (start, end) = smart.expand_bracket(&chars, 5);
        assert_eq!(&text[start..end], "(inner(deep))");
    }

    #[test]
    fn test_edge_cases_empty_text() {
        let smart = SmartSelection::new();
        let text = "";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_word(&chars, 0);
        assert_eq!(start, 0);
        assert_eq!(end, 0);
    }

    #[test]
    fn test_edge_cases_cursor_at_end() {
        let smart = SmartSelection::new();
        let text = "hello";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_word(&chars, 10); // cursor beyond text
        assert_eq!(start, 10);
        assert_eq!(end, 10);
    }

    #[test]
    fn test_function_expansion_rust() {
        let smart = SmartSelection::new();
        let text = "fn hello() {\n    println!(\"hi\");\n}";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_function(&chars, 15, Some("rust"));
        let func = &text[start..end];
        assert!(func.contains("fn hello"));
    }

    #[test]
    fn test_default_trait() {
        let smart = SmartSelection::default();
        let text = "test word";
        let chars: Vec<char> = text.chars().collect();

        let (start, end) = smart.expand_word(&chars, 6);
        assert_eq!(&text[start..end], "word");
    }
}
