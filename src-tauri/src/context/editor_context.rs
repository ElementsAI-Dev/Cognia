//! Editor context detection
//!
//! Provides detailed context for code editors and IDEs.

use log::{debug, trace};
use super::WindowInfo;
use serde::{Deserialize, Serialize};

/// Type alias for parsed editor title components
/// (file_path, file_name, file_extension, project_name, is_modified, git_branch, line_col)
#[allow(clippy::type_complexity)]
type ParsedTitleInfo = (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<String>,
    bool,
    Option<String>,
    Option<(u32, Option<u32>)>,
);

/// Editor context information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorContext {
    /// Editor name
    pub editor_name: String,
    /// Current file path (if detectable from title)
    pub file_path: Option<String>,
    /// Current file name
    pub file_name: Option<String>,
    /// File extension
    pub file_extension: Option<String>,
    /// Detected programming language
    pub language: Option<String>,
    /// Project/workspace name (if detectable)
    pub project_name: Option<String>,
    /// Whether the file is modified (unsaved)
    pub is_modified: bool,
    /// Git branch (if detectable from title)
    pub git_branch: Option<String>,
    /// Line number (if detectable)
    pub line_number: Option<u32>,
    /// Column number (if detectable)
    pub column_number: Option<u32>,
    /// Editor-specific metadata
    pub metadata: std::collections::HashMap<String, String>,
}

impl EditorContext {
    /// Create editor context from window information
    pub fn from_window_info(window: &WindowInfo) -> Result<Self, String> {
        trace!("Creating EditorContext from window: process='{}', title='{}'", window.process_name, window.title);
        
        let process_name = window.process_name.to_lowercase();
        let title = &window.title;

        // Detect editor type
        let editor_name = Self::detect_editor_name(&process_name);
        debug!("Detected editor: {}", editor_name);
        
        // Parse title for file information
        let (file_path, file_name, file_extension, project_name, is_modified, git_branch, line_col) = 
            Self::parse_editor_title(&editor_name, title);
        
        trace!(
            "Parsed editor title: file={:?}, ext={:?}, project={:?}, modified={}, branch={:?}",
            file_name, file_extension, project_name, is_modified, git_branch
        );

        let language = file_extension.as_ref().and_then(|ext| Self::extension_to_language(ext));
        if let Some(ref lang) = language {
            debug!("Detected language: {} (from extension: {:?})", lang, file_extension);
        }

        debug!(
            "Editor context created: {} - {:?} (lang: {:?}, branch: {:?}, modified: {})",
            editor_name, file_name, language, git_branch, is_modified
        );

        Ok(Self {
            editor_name,
            file_path,
            file_name,
            file_extension,
            language,
            project_name,
            is_modified,
            git_branch,
            line_number: line_col.map(|(l, _)| l),
            column_number: line_col.and_then(|(_, c)| c),
            metadata: std::collections::HashMap::new(),
        })
    }

    fn detect_editor_name(process_name: &str) -> String {
        trace!("Detecting editor from process: {}", process_name);
        if process_name.contains("code") {
            "Visual Studio Code".to_string()
        } else if process_name.contains("cursor") {
            "Cursor".to_string()
        } else if process_name.contains("windsurf") {
            "Windsurf".to_string()
        } else if process_name.contains("idea") || process_name.contains("intellij") {
            "IntelliJ IDEA".to_string()
        } else if process_name.contains("pycharm") {
            "PyCharm".to_string()
        } else if process_name.contains("webstorm") {
            "WebStorm".to_string()
        } else if process_name.contains("sublime") {
            "Sublime Text".to_string()
        } else if process_name.contains("vim") || process_name.contains("nvim") {
            "Vim/Neovim".to_string()
        } else if process_name.contains("devenv") {
            "Visual Studio".to_string()
        } else if process_name.contains("notepad++") {
            "Notepad++".to_string()
        } else if process_name.contains("zed") {
            "Zed".to_string()
        } else {
            trace!("Unknown editor for process: {}", process_name);
            "Unknown Editor".to_string()
        }
    }

    fn parse_editor_title(editor_name: &str, title: &str) -> ParsedTitleInfo {
        trace!("Parsing editor title: '{}' for editor: {}", title, editor_name);
        let is_modified = title.contains("●") || title.contains("*") || title.contains("[Modified]");
        
        // VS Code style: "filename.ext - folder - Visual Studio Code"
        // Or: "● filename.ext - folder - Visual Studio Code"
        if editor_name.contains("Visual Studio Code") || editor_name.contains("Cursor") || editor_name.contains("Windsurf") {
            return Self::parse_vscode_title(title, is_modified);
        }

        // JetBrains style: "project – file.ext [branch]"
        if editor_name.contains("IntelliJ") || editor_name.contains("PyCharm") || 
           editor_name.contains("WebStorm") || editor_name.contains("GoLand") {
            return Self::parse_jetbrains_title(title, is_modified);
        }

        // Sublime style: "filename.ext - Sublime Text"
        if editor_name.contains("Sublime") {
            return Self::parse_sublime_title(title, is_modified);
        }

        // Vim style: "filename.ext + VIM"
        if editor_name.contains("Vim") {
            return Self::parse_vim_title(title, is_modified);
        }

        // Generic parsing
        Self::parse_generic_title(title, is_modified)
    }

    fn parse_vscode_title(title: &str, is_modified: bool) -> ParsedTitleInfo {
        // Remove modification indicator
        let clean_title = title.replace("●", "").replace("•", "").trim().to_string();
        
        // Split by " - "
        let parts: Vec<&str> = clean_title.split(" - ").collect();
        
        if parts.is_empty() {
            return (None, None, None, None, is_modified, None, None);
        }

        let file_part = parts[0].trim();
        let project_name = if parts.len() > 1 {
            Some(parts[1].trim().to_string())
        } else {
            None
        };

        // Extract file name and extension
        let (file_name, file_extension) = if file_part.contains('.') {
            let name = file_part.to_string();
            let ext = file_part.rsplit('.').next().map(|s| s.to_string());
            (Some(name), ext)
        } else {
            (Some(file_part.to_string()), None)
        };

        // Try to detect git branch from title (some extensions show it)
        let git_branch = if clean_title.contains('[') && clean_title.contains(']') {
            let start = clean_title.find('[').unwrap();
            let end = clean_title.find(']').unwrap();
            if end > start {
                Some(clean_title[start+1..end].to_string())
            } else {
                None
            }
        } else {
            None
        };

        (None, file_name, file_extension, project_name, is_modified, git_branch, None)
    }

    fn parse_jetbrains_title(title: &str, is_modified: bool) -> ParsedTitleInfo {
        // JetBrains format: "project – file.ext [branch]" or "project – path/to/file.ext"
        let parts: Vec<&str> = title.split(" – ").collect();
        
        let project_name = parts.first().map(|s| s.trim().to_string());
        
        let (file_path, file_name, file_extension, git_branch) = if parts.len() > 1 {
            let file_part = parts[1].trim();
            
            // Check for branch in brackets
            let (file_str, branch) = if file_part.contains('[') && file_part.contains(']') {
                let bracket_start = file_part.find('[').unwrap();
                let bracket_end = file_part.find(']').unwrap();
                let branch = file_part[bracket_start+1..bracket_end].to_string();
                let file = file_part[..bracket_start].trim();
                (file, Some(branch))
            } else {
                (file_part, None)
            };

            let path = if file_str.contains('/') || file_str.contains('\\') {
                Some(file_str.to_string())
            } else {
                None
            };

            let name = file_str.rsplit(&['/', '\\'][..]).next().map(|s| s.to_string());
            let ext = name.as_ref().and_then(|n| {
                if n.contains('.') {
                    n.rsplit('.').next().map(|s| s.to_string())
                } else {
                    None
                }
            });

            (path, name, ext, branch)
        } else {
            (None, None, None, None)
        };

        (file_path, file_name, file_extension, project_name, is_modified, git_branch, None)
    }

    fn parse_sublime_title(title: &str, is_modified: bool) -> ParsedTitleInfo {
        // Sublime format: "filename.ext - Sublime Text" or "path/to/file.ext - Sublime Text"
        let parts: Vec<&str> = title.split(" - ").collect();
        
        if parts.is_empty() {
            return (None, None, None, None, is_modified, None, None);
        }

        let file_part = parts[0].trim();
        let file_path = if file_part.contains('/') || file_part.contains('\\') {
            Some(file_part.to_string())
        } else {
            None
        };

        let file_name = file_part.rsplit(&['/', '\\'][..]).next().map(|s| s.to_string());
        let file_extension = file_name.as_ref().and_then(|n| {
            if n.contains('.') {
                n.rsplit('.').next().map(|s| s.to_string())
            } else {
                None
            }
        });

        (file_path, file_name, file_extension, None, is_modified, None, None)
    }

    fn parse_vim_title(title: &str, is_modified: bool) -> ParsedTitleInfo {
        // Vim format varies: "filename.ext + VIM" or "filename.ext [+] - VIM"
        let clean = title.replace("[+]", "").replace(" + ", " ").trim().to_string();
        
        // Remove VIM/NVIM suffix
        let without_vim = clean
            .trim_end_matches(" VIM")
            .trim_end_matches(" NVIM")
            .trim_end_matches(" vim")
            .trim_end_matches(" nvim")
            .trim_end_matches(" - VIM")
            .trim_end_matches(" - NVIM")
            .trim();
        
        let file_name = if !without_vim.is_empty() && without_vim.contains('.') {
            Some(without_vim.to_string())
        } else {
            None
        };

        let file_extension = file_name.as_ref().and_then(|n| {
            if n.contains('.') {
                n.rsplit('.').next().map(|s| s.to_string())
            } else {
                None
            }
        });

        (None, file_name, file_extension, None, is_modified || title.contains("+"), None, None)
    }

    fn parse_generic_title(title: &str, is_modified: bool) -> ParsedTitleInfo {
        // Try to extract file name from title
        let parts: Vec<&str> = title.split(" - ").collect();
        
        let file_part = parts.first().map(|s| s.trim()).unwrap_or("");
        
        // Check if it looks like a file name
        if file_part.contains('.') && !file_part.contains(' ') {
            let file_name = Some(file_part.to_string());
            let file_extension = file_part.rsplit('.').next().map(|s| s.to_string());
            return (None, file_name, file_extension, None, is_modified, None, None);
        }

        (None, None, None, None, is_modified, None, None)
    }

    /// Map file extension to programming language
    fn extension_to_language(ext: &str) -> Option<String> {
        trace!("Mapping extension to language: {}", ext);
        let lang = match ext.to_lowercase().as_str() {
            // Rust
            "rs" => "Rust",
            // JavaScript/TypeScript
            "js" | "mjs" | "cjs" => "JavaScript",
            "ts" | "mts" | "cts" => "TypeScript",
            "jsx" => "JavaScript (React)",
            "tsx" => "TypeScript (React)",
            // Python
            "py" | "pyw" | "pyi" => "Python",
            "ipynb" => "Jupyter Notebook",
            // Go
            "go" => "Go",
            // Java/Kotlin
            "java" => "Java",
            "kt" | "kts" => "Kotlin",
            // C/C++
            "c" | "h" => "C",
            "cpp" | "cc" | "cxx" | "hpp" | "hxx" => "C++",
            // C#
            "cs" => "C#",
            // Ruby
            "rb" | "erb" => "Ruby",
            // PHP
            "php" => "PHP",
            // Swift
            "swift" => "Swift",
            // Dart
            "dart" => "Dart",
            // Shell
            "sh" | "bash" | "zsh" => "Shell",
            "ps1" | "psm1" => "PowerShell",
            "bat" | "cmd" => "Batch",
            // Web
            "html" | "htm" => "HTML",
            "css" => "CSS",
            "scss" | "sass" => "SCSS",
            "less" => "Less",
            "vue" => "Vue",
            "svelte" => "Svelte",
            // Data formats
            "json" => "JSON",
            "yaml" | "yml" => "YAML",
            "xml" => "XML",
            "toml" => "TOML",
            "ini" | "cfg" => "INI",
            // Markup
            "md" | "markdown" => "Markdown",
            "rst" => "reStructuredText",
            "tex" | "latex" => "LaTeX",
            // Database
            "sql" => "SQL",
            // Config
            "dockerfile" => "Dockerfile",
            "makefile" => "Makefile",
            // Other
            "r" => "R",
            "scala" => "Scala",
            "clj" | "cljs" => "Clojure",
            "ex" | "exs" => "Elixir",
            "erl" | "hrl" => "Erlang",
            "hs" | "lhs" => "Haskell",
            "lua" => "Lua",
            "pl" | "pm" => "Perl",
            "groovy" => "Groovy",
            "gradle" => "Gradle",
            _ => return None,
        };
        Some(lang.to_string())
    }

    /// Check if this is a code editor context
    pub fn is_code_editor(&self) -> bool {
        self.language.is_some() || self.file_extension.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context::WindowInfo;

    fn create_test_window_info(process_name: &str, title: &str) -> WindowInfo {
        WindowInfo {
            handle: 12345,
            title: title.to_string(),
            class_name: "TestClass".to_string(),
            process_id: 1234,
            process_name: process_name.to_string(),
            exe_path: Some(format!("C:\\Program Files\\{}", process_name)),
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
        }
    }

    // Editor detection tests
    #[test]
    fn test_detect_editor_vscode() {
        let window = create_test_window_info("code.exe", "main.rs - myproject - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Visual Studio Code");
    }

    #[test]
    fn test_detect_editor_cursor() {
        let window = create_test_window_info("cursor.exe", "main.rs - myproject - Cursor");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Cursor");
    }

    #[test]
    fn test_detect_editor_windsurf() {
        let window = create_test_window_info("windsurf.exe", "main.rs - Windsurf");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Windsurf");
    }

    #[test]
    fn test_detect_editor_intellij() {
        let window = create_test_window_info("idea64.exe", "myproject – Main.java [master]");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "IntelliJ IDEA");
    }

    #[test]
    fn test_detect_editor_pycharm() {
        let window = create_test_window_info("pycharm64.exe", "myproject – main.py [main]");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "PyCharm");
    }

    #[test]
    fn test_detect_editor_webstorm() {
        let window = create_test_window_info("webstorm64.exe", "myproject – index.ts");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "WebStorm");
    }

    #[test]
    fn test_detect_editor_sublime() {
        let window = create_test_window_info("sublime_text.exe", "main.rs - Sublime Text");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Sublime Text");
    }

    #[test]
    fn test_detect_editor_vim() {
        let window = create_test_window_info("vim.exe", "main.rs + VIM");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Vim/Neovim");
    }

    #[test]
    fn test_detect_editor_neovim() {
        let window = create_test_window_info("nvim.exe", "main.rs - NVIM");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Vim/Neovim");
    }

    #[test]
    fn test_detect_editor_visual_studio() {
        let window = create_test_window_info("devenv.exe", "Solution - Visual Studio");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Visual Studio");
    }

    #[test]
    fn test_detect_editor_notepad_plus_plus() {
        let window = create_test_window_info("notepad++.exe", "main.rs - Notepad++");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Notepad++");
    }

    #[test]
    fn test_detect_editor_zed() {
        let window = create_test_window_info("zed.exe", "main.rs - Zed");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Zed");
    }

    #[test]
    fn test_detect_editor_unknown() {
        let window = create_test_window_info("unknown_editor.exe", "main.rs - Unknown");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.editor_name, "Unknown Editor");
    }

    // VSCode title parsing tests
    #[test]
    fn test_vscode_parse_file_name() {
        let window = create_test_window_info("code.exe", "main.rs - myproject - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_name, Some("main.rs".to_string()));
    }

    #[test]
    fn test_vscode_parse_project_name() {
        let window = create_test_window_info("code.exe", "main.rs - myproject - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.project_name, Some("myproject".to_string()));
    }

    #[test]
    fn test_vscode_parse_modified_indicator() {
        let window = create_test_window_info("code.exe", "● main.rs - myproject - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert!(context.is_modified);
    }

    #[test]
    fn test_vscode_parse_modified_indicator_dot() {
        let window = create_test_window_info("code.exe", "• main.rs - myproject - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_name, Some("main.rs".to_string()));
    }

    #[test]
    fn test_vscode_parse_git_branch() {
        let window = create_test_window_info("code.exe", "main.rs - myproject [main] - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.git_branch, Some("main".to_string()));
    }

    // JetBrains title parsing tests
    #[test]
    fn test_jetbrains_parse_project_name() {
        let window = create_test_window_info("idea64.exe", "myproject – Main.java");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.project_name, Some("myproject".to_string()));
    }

    #[test]
    fn test_jetbrains_parse_file_name() {
        let window = create_test_window_info("idea64.exe", "myproject – Main.java");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_name, Some("Main.java".to_string()));
    }

    #[test]
    fn test_jetbrains_parse_git_branch() {
        let window = create_test_window_info("idea64.exe", "myproject – Main.java [feature-branch]");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.git_branch, Some("feature-branch".to_string()));
    }

    #[test]
    fn test_jetbrains_parse_file_path() {
        let window = create_test_window_info("idea64.exe", "myproject – src/main/java/Main.java");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_path, Some("src/main/java/Main.java".to_string()));
    }

    // Sublime title parsing tests
    #[test]
    fn test_sublime_parse_file_name() {
        let window = create_test_window_info("sublime_text.exe", "main.rs - Sublime Text");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_name, Some("main.rs".to_string()));
    }

    #[test]
    fn test_sublime_parse_file_path() {
        let window = create_test_window_info("sublime_text.exe", "C:\\project\\src\\main.rs - Sublime Text");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_path, Some("C:\\project\\src\\main.rs".to_string()));
    }

    // Vim title parsing tests
    #[test]
    fn test_vim_parse_file_name() {
        let window = create_test_window_info("vim.exe", "main.rs + VIM");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_name, Some("main.rs".to_string()));
    }

    #[test]
    fn test_vim_parse_modified() {
        let window = create_test_window_info("vim.exe", "main.rs [+] - VIM");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert!(context.is_modified);
    }

    // File extension parsing tests
    #[test]
    fn test_parse_extension_rs() {
        let window = create_test_window_info("code.exe", "main.rs - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_extension, Some("rs".to_string()));
    }

    #[test]
    fn test_parse_extension_ts() {
        let window = create_test_window_info("code.exe", "index.ts - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_extension, Some("ts".to_string()));
    }

    #[test]
    fn test_parse_extension_tsx() {
        let window = create_test_window_info("code.exe", "App.tsx - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_extension, Some("tsx".to_string()));
    }

    // Language detection tests
    #[test]
    fn test_language_rust() {
        let window = create_test_window_info("code.exe", "main.rs - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Rust".to_string()));
    }

    #[test]
    fn test_language_typescript() {
        let window = create_test_window_info("code.exe", "index.ts - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("TypeScript".to_string()));
    }

    #[test]
    fn test_language_typescript_react() {
        let window = create_test_window_info("code.exe", "App.tsx - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("TypeScript (React)".to_string()));
    }

    #[test]
    fn test_language_javascript() {
        let window = create_test_window_info("code.exe", "index.js - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("JavaScript".to_string()));
    }

    #[test]
    fn test_language_python() {
        let window = create_test_window_info("code.exe", "main.py - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Python".to_string()));
    }

    #[test]
    fn test_language_go() {
        let window = create_test_window_info("code.exe", "main.go - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Go".to_string()));
    }

    #[test]
    fn test_language_java() {
        let window = create_test_window_info("code.exe", "Main.java - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Java".to_string()));
    }

    #[test]
    fn test_language_kotlin() {
        let window = create_test_window_info("code.exe", "Main.kt - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Kotlin".to_string()));
    }

    #[test]
    fn test_language_cpp() {
        let window = create_test_window_info("code.exe", "main.cpp - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("C++".to_string()));
    }

    #[test]
    fn test_language_c() {
        let window = create_test_window_info("code.exe", "main.c - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("C".to_string()));
    }

    #[test]
    fn test_language_csharp() {
        let window = create_test_window_info("code.exe", "Program.cs - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("C#".to_string()));
    }

    #[test]
    fn test_language_ruby() {
        let window = create_test_window_info("code.exe", "app.rb - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Ruby".to_string()));
    }

    #[test]
    fn test_language_php() {
        let window = create_test_window_info("code.exe", "index.php - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("PHP".to_string()));
    }

    #[test]
    fn test_language_swift() {
        let window = create_test_window_info("code.exe", "main.swift - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Swift".to_string()));
    }

    #[test]
    fn test_language_shell() {
        let window = create_test_window_info("code.exe", "script.sh - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Shell".to_string()));
    }

    #[test]
    fn test_language_powershell() {
        let window = create_test_window_info("code.exe", "script.ps1 - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("PowerShell".to_string()));
    }

    #[test]
    fn test_language_html() {
        let window = create_test_window_info("code.exe", "index.html - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("HTML".to_string()));
    }

    #[test]
    fn test_language_css() {
        let window = create_test_window_info("code.exe", "styles.css - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("CSS".to_string()));
    }

    #[test]
    fn test_language_json() {
        let window = create_test_window_info("code.exe", "package.json - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("JSON".to_string()));
    }

    #[test]
    fn test_language_yaml() {
        let window = create_test_window_info("code.exe", "config.yaml - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("YAML".to_string()));
    }

    #[test]
    fn test_language_markdown() {
        let window = create_test_window_info("code.exe", "README.md - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Markdown".to_string()));
    }

    #[test]
    fn test_language_sql() {
        let window = create_test_window_info("code.exe", "query.sql - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("SQL".to_string()));
    }

    #[test]
    fn test_language_vue() {
        let window = create_test_window_info("code.exe", "App.vue - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Vue".to_string()));
    }

    #[test]
    fn test_language_svelte() {
        let window = create_test_window_info("code.exe", "App.svelte - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Svelte".to_string()));
    }

    #[test]
    fn test_language_unknown_extension() {
        let window = create_test_window_info("code.exe", "file.xyz - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert!(context.language.is_none());
    }

    // is_code_editor tests
    #[test]
    fn test_is_code_editor_with_language() {
        let window = create_test_window_info("code.exe", "main.rs - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert!(context.is_code_editor());
    }

    #[test]
    fn test_is_code_editor_with_extension_only() {
        let window = create_test_window_info("code.exe", "file.xyz - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert!(context.is_code_editor());
    }

    #[test]
    fn test_is_not_code_editor() {
        let window = create_test_window_info("code.exe", "Welcome - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert!(!context.is_code_editor());
    }

    // Serialization tests
    #[test]
    fn test_editor_context_serialization() {
        let window = create_test_window_info("code.exe", "main.rs - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        
        let json = serde_json::to_string(&context);
        assert!(json.is_ok());
        
        let parsed: Result<EditorContext, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
        assert_eq!(parsed.unwrap().editor_name, "Visual Studio Code");
    }

    // Edge cases
    #[test]
    fn test_empty_title() {
        let window = create_test_window_info("code.exe", "");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert!(context.file_name.is_none() || context.file_name.as_ref().unwrap().is_empty());
    }

    #[test]
    fn test_title_without_file() {
        let window = create_test_window_info("code.exe", "Welcome Tab - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        // Should not detect file extension in welcome text
        assert!(context.file_extension.is_none() || context.file_name.as_ref().map(|n| n.contains(' ')).unwrap_or(true));
    }

    #[test]
    fn test_modified_indicator_star() {
        let window = create_test_window_info("code.exe", "*main.rs - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert!(context.is_modified);
    }

    #[test]
    fn test_modified_indicator_text() {
        let window = create_test_window_info("code.exe", "main.rs [Modified] - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert!(context.is_modified);
    }

    #[test]
    fn test_case_insensitive_extension() {
        let window = create_test_window_info("code.exe", "main.RS - project - Visual Studio Code");
        let context = EditorContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Rust".to_string()));
    }
}
