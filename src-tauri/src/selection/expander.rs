//! Selection expansion module
//!
//! Provides methods to expand text selection to word, sentence, line, and paragraph boundaries.

/// Selection expander for expanding selections to logical boundaries
pub struct SelectionExpander;

impl SelectionExpander {
    pub fn new() -> Self {
        log::debug!("[SelectionExpander] Creating new instance");
        Self
    }

    /// Expand selection to complete word
    pub fn expand_to_word(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        log::trace!(
            "[SelectionExpander] expand_to_word: cursor_pos={}, text_len={}",
            cursor_pos,
            text.len()
        );
        let chars: Vec<char> = text.chars().collect();
        let len = chars.len();

        if cursor_pos >= len {
            log::trace!("[SelectionExpander] expand_to_word: cursor out of bounds");
            return (cursor_pos, cursor_pos);
        }

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

        log::trace!(
            "[SelectionExpander] expand_to_word: result=({}, {})",
            start,
            end
        );
        (start, end)
    }

    /// Expand selection to complete sentence
    pub fn expand_to_sentence(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        log::trace!(
            "[SelectionExpander] expand_to_sentence: cursor_pos={}, text_len={}",
            cursor_pos,
            text.len()
        );
        let chars: Vec<char> = text.chars().collect();
        let len = chars.len();

        if cursor_pos >= len {
            log::trace!("[SelectionExpander] expand_to_sentence: cursor out of bounds");
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

        // Trim leading whitespace
        while start < end && chars[start].is_whitespace() {
            start += 1;
        }

        log::trace!(
            "[SelectionExpander] expand_to_sentence: result=({}, {})",
            start,
            end
        );
        (start, end)
    }

    /// Expand selection to complete line
    pub fn expand_to_line(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        log::trace!(
            "[SelectionExpander] expand_to_line: cursor_pos={}, text_len={}",
            cursor_pos,
            text.len()
        );
        let chars: Vec<char> = text.chars().collect();
        let len = chars.len();

        if cursor_pos >= len {
            log::trace!("[SelectionExpander] expand_to_line: cursor out of bounds");
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

        log::trace!(
            "[SelectionExpander] expand_to_line: result=({}, {})",
            start,
            end
        );
        (start, end)
    }

    /// Expand selection to complete paragraph
    pub fn expand_to_paragraph(&self, text: &str, cursor_pos: usize) -> (usize, usize) {
        log::trace!(
            "[SelectionExpander] expand_to_paragraph: cursor_pos={}, text_len={}",
            cursor_pos,
            text.len()
        );
        let chars: Vec<char> = text.chars().collect();
        let len = chars.len();

        if cursor_pos >= len {
            log::trace!("[SelectionExpander] expand_to_paragraph: cursor out of bounds");
            return (cursor_pos, cursor_pos);
        }

        // Find paragraph start (double newline or start of text)
        let mut start = cursor_pos;
        while start > 0 {
            if start >= 2 && chars[start - 1] == '\n' && chars[start - 2] == '\n' {
                break;
            }
            start -= 1;
        }

        // Find paragraph end (double newline or end of text)
        let mut end = cursor_pos;
        while end < len {
            if end + 1 < len && chars[end] == '\n' && chars[end + 1] == '\n' {
                break;
            }
            end += 1;
        }

        // Trim leading whitespace
        while start < end && chars[start].is_whitespace() {
            start += 1;
        }

        log::trace!(
            "[SelectionExpander] expand_to_paragraph: result=({}, {})",
            start,
            end
        );
        (start, end)
    }

    /// Check if character is part of a word
    pub fn is_word_char(c: char) -> bool {
        c.is_alphanumeric() || c == '_' || c == '-'
    }
}

impl Default for SelectionExpander {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expand_to_word() {
        let expander = SelectionExpander::new();
        let text = "hello world test";

        let (start, end) = expander.expand_to_word(text, 7); // cursor on 'o' in 'world'
        assert_eq!(&text[start..end], "world");

        let (start, end) = expander.expand_to_word(text, 0); // cursor at start
        assert_eq!(&text[start..end], "hello");
    }

    #[test]
    fn test_expand_to_sentence() {
        let expander = SelectionExpander::new();
        let text = "First sentence. Second sentence. Third sentence.";

        let (start, end) = expander.expand_to_sentence(text, 20); // cursor in "Second"
        let sentence = &text[start..end];
        assert!(sentence.contains("Second"));
    }

    #[test]
    fn test_expand_to_line() {
        let expander = SelectionExpander::new();
        let text = "Line 1\nLine 2\nLine 3";

        let (start, end) = expander.expand_to_line(text, 8); // cursor in "Line 2"
        assert_eq!(&text[start..end], "Line 2");
    }

    #[test]
    fn test_expand_to_paragraph() {
        let expander = SelectionExpander::new();
        let text = "Paragraph 1 line 1\nParagraph 1 line 2\n\nParagraph 2";

        let (start, end) = expander.expand_to_paragraph(text, 5); // cursor in first paragraph
        let para = &text[start..end];
        assert!(para.contains("Paragraph 1"));
    }

    #[test]
    fn test_expand_word_out_of_bounds() {
        let expander = SelectionExpander::new();
        let text = "hello";

        let (start, end) = expander.expand_to_word(text, 100);
        assert_eq!(start, 100);
        assert_eq!(end, 100);
    }

    #[test]
    fn test_is_word_char() {
        assert!(SelectionExpander::is_word_char('a'));
        assert!(SelectionExpander::is_word_char('Z'));
        assert!(SelectionExpander::is_word_char('5'));
        assert!(SelectionExpander::is_word_char('_'));
        assert!(SelectionExpander::is_word_char('-'));
        assert!(!SelectionExpander::is_word_char(' '));
        assert!(!SelectionExpander::is_word_char('.'));
    }

    #[test]
    fn test_expand_to_word_with_underscore() {
        let expander = SelectionExpander::new();
        let text = "hello_world test";

        let (start, end) = expander.expand_to_word(text, 5);
        assert_eq!(&text[start..end], "hello_world");
    }

    #[test]
    fn test_expand_sentence_chinese() {
        let expander = SelectionExpander::new();
        let text = "第一句话。第二句话。第三句话。";

        // Cursor at position 2 (in "第一句话")
        let (start, end) = expander.expand_to_sentence(text, 2);
        let sentence = text
            .chars()
            .skip(start)
            .take(end - start)
            .collect::<String>();
        assert!(sentence.contains("第一"));
    }

    #[test]
    fn test_expand_line_empty() {
        let expander = SelectionExpander::new();
        let text = "";

        let (start, end) = expander.expand_to_line(text, 0);
        assert_eq!(start, 0);
        assert_eq!(end, 0);
    }

    #[test]
    fn test_expand_paragraph_single() {
        let expander = SelectionExpander::new();
        let text = "Single paragraph without breaks";

        let (start, end) = expander.expand_to_paragraph(text, 10);
        assert_eq!(&text[start..end], "Single paragraph without breaks");
    }
}
