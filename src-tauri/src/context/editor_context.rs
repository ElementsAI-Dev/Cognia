//! Editor context detection
//!
//! Provides detailed context for code editors and IDEs.

use super::WindowInfo;
use serde::{Deserialize, Serialize};

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
        let process_name = window.process_name.to_lowercase();
        let title = &window.title;

        // Detect editor type
        let editor_name = Self::detect_editor_name(&process_name);
        
        // Parse title for file information
        let (file_path, file_name, file_extension, project_name, is_modified, git_branch, line_col) = 
            Self::parse_editor_title(&editor_name, title);

        let language = file_extension.as_ref().and_then(|ext| Self::extension_to_language(ext));

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
            "Unknown Editor".to_string()
        }
    }

    fn parse_editor_title(editor_name: &str, title: &str) -> (
        Option<String>, // file_path
        Option<String>, // file_name
        Option<String>, // file_extension
        Option<String>, // project_name
        bool,           // is_modified
        Option<String>, // git_branch
        Option<(u32, Option<u32>)>, // line, column
    ) {
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

    fn parse_vscode_title(title: &str, is_modified: bool) -> (
        Option<String>, Option<String>, Option<String>, Option<String>, bool, Option<String>, Option<(u32, Option<u32>)>
    ) {
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

    fn parse_jetbrains_title(title: &str, is_modified: bool) -> (
        Option<String>, Option<String>, Option<String>, Option<String>, bool, Option<String>, Option<(u32, Option<u32>)>
    ) {
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

    fn parse_sublime_title(title: &str, is_modified: bool) -> (
        Option<String>, Option<String>, Option<String>, Option<String>, bool, Option<String>, Option<(u32, Option<u32>)>
    ) {
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

    fn parse_vim_title(title: &str, is_modified: bool) -> (
        Option<String>, Option<String>, Option<String>, Option<String>, bool, Option<String>, Option<(u32, Option<u32>)>
    ) {
        // Vim format varies: "filename.ext + VIM" or "filename.ext [+] - VIM"
        let clean = title.replace("[+]", "").replace(" + ", " ");
        let parts: Vec<&str> = clean.split(" - ").collect();
        
        let file_part = parts.first().map(|s| s.trim()).unwrap_or("");
        
        let file_name = if !file_part.is_empty() {
            Some(file_part.to_string())
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

    fn parse_generic_title(title: &str, is_modified: bool) -> (
        Option<String>, Option<String>, Option<String>, Option<String>, bool, Option<String>, Option<(u32, Option<u32>)>
    ) {
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
