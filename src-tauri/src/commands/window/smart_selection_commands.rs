//! Smart Selection Tauri commands
//!
//! Commands for intelligent text selection expansion.

use crate::selection::{
    SelectionContext, SelectionExpansion, SelectionManager, SelectionMode, TextAnalyzer,
};
use tauri::State;

/// Smart expand selection based on mode
#[tauri::command]
pub async fn selection_smart_expand(
    manager: State<'_, SelectionManager>,
    text: String,
    cursor_pos: usize,
    mode: String,
    is_code: Option<bool>,
    language: Option<String>,
) -> Result<SelectionExpansion, String> {
    let context = SelectionContext {
        full_text: text,
        cursor_pos,
        selection_start: None,
        selection_end: None,
        app_type: None,
        is_code: is_code.unwrap_or(false),
        language,
    };

    let selection_mode = match mode.as_str() {
        "word" => SelectionMode::Word,
        "line" => SelectionMode::Line,
        "sentence" => SelectionMode::Sentence,
        "paragraph" => SelectionMode::Paragraph,
        "code_block" => SelectionMode::CodeBlock,
        "function" => SelectionMode::Function,
        "bracket" => SelectionMode::BracketMatch,
        "quote" => SelectionMode::QuoteMatch,
        "url" => SelectionMode::Url,
        "email" => SelectionMode::Email,
        "file_path" => SelectionMode::FilePath,
        _ => SelectionMode::Word,
    };

    Ok(manager.smart_selection.expand(&context, selection_mode))
}

/// Auto-detect best expansion mode and expand
#[tauri::command]
pub async fn selection_auto_expand(
    manager: State<'_, SelectionManager>,
    text: String,
    cursor_pos: usize,
    is_code: Option<bool>,
    language: Option<String>,
) -> Result<SelectionExpansion, String> {
    let context = SelectionContext {
        full_text: text,
        cursor_pos,
        selection_start: None,
        selection_end: None,
        app_type: None,
        is_code: is_code.unwrap_or(false),
        language,
    };

    Ok(manager.smart_selection.auto_expand(&context))
}

/// Get available selection modes
#[tauri::command]
pub async fn selection_get_modes() -> Result<Vec<String>, String> {
    Ok(vec![
        "word".to_string(),
        "line".to_string(),
        "sentence".to_string(),
        "paragraph".to_string(),
        "code_block".to_string(),
        "function".to_string(),
        "bracket".to_string(),
        "quote".to_string(),
        "url".to_string(),
        "email".to_string(),
        "file_path".to_string(),
    ])
}

/// Detect text type (code, url, email, etc.) using TextAnalyzer
#[tauri::command]
pub async fn selection_detect_text_type(text: String) -> Result<String, String> {
    let analyzer = TextAnalyzer::new();
    let text_type = analyzer.detect_text_type(&text);
    Ok(format!("{:?}", text_type).to_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_selection_detect_text_type_url() {
        let result = tokio::runtime::Runtime::new().unwrap().block_on(async {
            selection_detect_text_type("https://example.com".to_string()).await
        });
        assert_eq!(result.unwrap(), "url");

        let result2 = tokio::runtime::Runtime::new().unwrap().block_on(async {
            selection_detect_text_type("http://test.org/page".to_string()).await
        });
        assert_eq!(result2.unwrap(), "url");
    }

    #[test]
    fn test_selection_detect_text_type_email() {
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async { selection_detect_text_type("user@example.com".to_string()).await });
        assert_eq!(result.unwrap(), "email");
    }

    #[test]
    fn test_selection_detect_text_type_path() {
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async { selection_detect_text_type("/usr/local/bin".to_string()).await });
        assert_eq!(result.unwrap(), "filepath");

        let result2 = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async { selection_detect_text_type("C:\\Users\\test".to_string()).await });
        assert_eq!(result2.unwrap(), "filepath");
    }

    #[test]
    fn test_selection_detect_text_type_code() {
        let result = tokio::runtime::Runtime::new().unwrap().block_on(async {
            selection_detect_text_type("function test() { return 1; }".to_string()).await
        });
        assert_eq!(result.unwrap(), "code");
    }

    #[test]
    fn test_selection_detect_text_type_number() {
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async { selection_detect_text_type("12345".to_string()).await });
        assert_eq!(result.unwrap(), "numeric");
    }

    #[test]
    fn test_selection_detect_text_type_text() {
        let result = tokio::runtime::Runtime::new().unwrap().block_on(async {
            selection_detect_text_type("Hello world, this is plain text.".to_string()).await
        });
        assert_eq!(result.unwrap(), "plaintext");
    }

    #[test]
    fn test_selection_get_modes() {
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(async { selection_get_modes().await });
        let modes = result.unwrap();

        assert!(modes.contains(&"word".to_string()));
        assert!(modes.contains(&"line".to_string()));
        assert!(modes.contains(&"sentence".to_string()));
        assert!(modes.contains(&"paragraph".to_string()));
        assert!(modes.contains(&"code_block".to_string()));
        assert!(modes.contains(&"url".to_string()));
        assert!(modes.contains(&"email".to_string()));
    }

    #[test]
    fn test_selection_mode_parsing() {
        let modes = vec![
            ("word", SelectionMode::Word),
            ("line", SelectionMode::Line),
            ("sentence", SelectionMode::Sentence),
            ("paragraph", SelectionMode::Paragraph),
            ("code_block", SelectionMode::CodeBlock),
            ("function", SelectionMode::Function),
            ("bracket", SelectionMode::BracketMatch),
            ("quote", SelectionMode::QuoteMatch),
            ("url", SelectionMode::Url),
            ("email", SelectionMode::Email),
            ("file_path", SelectionMode::FilePath),
        ];

        for (mode_str, _expected) in modes {
            let parsed = match mode_str {
                "word" => SelectionMode::Word,
                "line" => SelectionMode::Line,
                "sentence" => SelectionMode::Sentence,
                "paragraph" => SelectionMode::Paragraph,
                "code_block" => SelectionMode::CodeBlock,
                "function" => SelectionMode::Function,
                "bracket" => SelectionMode::BracketMatch,
                "quote" => SelectionMode::QuoteMatch,
                "url" => SelectionMode::Url,
                "email" => SelectionMode::Email,
                "file_path" => SelectionMode::FilePath,
                _ => SelectionMode::Word,
            };
            assert!(
                matches!(parsed, _expected),
                "Mode {} should match",
                mode_str
            );
        }
    }
}
