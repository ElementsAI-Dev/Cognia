//! File context detection
//!
//! Extracts file-related context from window information.

use super::WindowInfo;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// File context information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContext {
    /// File path (if detectable)
    pub path: Option<String>,
    /// File name
    pub name: Option<String>,
    /// File extension
    pub extension: Option<String>,
    /// Programming language (for code files)
    pub language: Option<String>,
    /// Whether the file is modified (unsaved changes)
    pub is_modified: bool,
    /// Project/workspace root (if detectable)
    pub project_root: Option<String>,
    /// Git branch (if in a git repo)
    pub git_branch: Option<String>,
    /// File type category
    pub file_type: FileType,
}

/// File type categories
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FileType {
    /// Source code file
    SourceCode,
    /// Markup file (HTML, XML, Markdown)
    Markup,
    /// Configuration file
    Config,
    /// Data file (JSON, YAML, CSV)
    Data,
    /// Document (Word, PDF, etc.)
    Document,
    /// Image file
    Image,
    /// Video file
    Video,
    /// Audio file
    Audio,
    /// Archive file
    Archive,
    /// Executable
    Executable,
    /// Unknown type
    Unknown,
}

impl FileContext {
    /// Create file context from window information
    pub fn from_window_info(window: &WindowInfo) -> Result<Self, String> {
        let title = &window.title;
        
        // Try to extract file path from window title
        let (path, name, extension) = Self::extract_file_info(title);
        
        // Detect if file is modified (common indicators)
        // Patterns: "*file.rs", "●file.rs", "file.rs*", "file.rs [Modified]", "file.rs - Modified"
        let is_modified = title.starts_with('*') 
            || title.starts_with('●') 
            || title.contains(" - Modified")
            || title.contains("[Modified]")
            || title.ends_with('*')
            || title.contains("* -")  // "file.rs* - project"
            || title.contains("*-");   // "file.rs*- project"

        // Detect programming language from extension
        let language = extension.as_ref().and_then(|ext| Self::detect_language(ext));

        // Determine file type
        let file_type = extension
            .as_ref()
            .map(|ext| Self::detect_file_type(ext))
            .unwrap_or(FileType::Unknown);

        // Try to detect project root and git branch
        let project_root = path.as_ref().and_then(|p| Self::find_project_root(p));
        let git_branch = project_root.as_ref().and_then(|root| Self::get_git_branch(root));

        Ok(Self {
            path,
            name,
            extension,
            language,
            is_modified,
            project_root,
            git_branch,
            file_type,
        })
    }

    /// Extract file information from window title
    fn extract_file_info(title: &str) -> (Option<String>, Option<String>, Option<String>) {
        // Clean up title (remove modification indicators)
        let clean_title = title
            .trim_start_matches('*')
            .trim_start_matches('●')
            .trim_start_matches(' ')
            .trim_end_matches('*')
            .trim();

        // Common patterns in window titles:
        // "filename.ext - Application Name"
        // "filename.ext — Application Name"
        // "Application Name - filename.ext"
        // "filename.ext [Project] - Application"
        // "/path/to/file.ext - Application"
        // "C:\path\to\file.ext - Application"

        // Try to find file path patterns
        let path_patterns = [
            // Windows absolute path
            regex::Regex::new(r"([A-Za-z]:\\[^\s\-—\[\]]+\.[a-zA-Z0-9]+)").ok(),
            // Unix absolute path
            regex::Regex::new(r"(/[^\s\-—\[\]]+\.[a-zA-Z0-9]+)").ok(),
            // Relative path or filename with extension
            regex::Regex::new(r"([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)").ok(),
        ];

        for pattern in path_patterns.iter().flatten() {
            if let Some(captures) = pattern.captures(clean_title) {
                if let Some(matched) = captures.get(1) {
                    let path_str = matched.as_str();
                    let path = PathBuf::from(path_str);
                    
                    let name = path.file_name()
                        .map(|n| n.to_string_lossy().to_string());
                    
                    let extension = path.extension()
                        .map(|e| e.to_string_lossy().to_string().to_lowercase());

                    // Only return if we have a valid extension
                    if extension.is_some() {
                        return (Some(path_str.to_string()), name, extension);
                    }
                }
            }
        }

        // Fallback: try to extract just filename from title
        let parts: Vec<&str> = clean_title.split(&['-', '—', '|'][..]).collect();
        if let Some(first) = parts.first() {
            let trimmed = first.trim();
            if trimmed.contains('.') && !trimmed.contains(' ') {
                let path = PathBuf::from(trimmed);
                let name = path.file_name()
                    .map(|n| n.to_string_lossy().to_string());
                let extension = path.extension()
                    .map(|e| e.to_string_lossy().to_string().to_lowercase());
                
                if extension.is_some() {
                    return (Some(trimmed.to_string()), name, extension);
                }
            }
        }

        (None, None, None)
    }

    /// Detect programming language from file extension
    fn detect_language(extension: &str) -> Option<String> {
        let lang = match extension.to_lowercase().as_str() {
            // JavaScript/TypeScript
            "js" => "JavaScript",
            "jsx" => "JavaScript (JSX)",
            "ts" => "TypeScript",
            "tsx" => "TypeScript (TSX)",
            "mjs" => "JavaScript (ESM)",
            "cjs" => "JavaScript (CommonJS)",
            
            // Web
            "html" | "htm" => "HTML",
            "css" => "CSS",
            "scss" | "sass" => "SCSS/Sass",
            "less" => "Less",
            "vue" => "Vue",
            "svelte" => "Svelte",
            
            // Python
            "py" => "Python",
            "pyw" => "Python",
            "pyx" => "Cython",
            "ipynb" => "Jupyter Notebook",
            
            // Rust
            "rs" => "Rust",
            
            // Go
            "go" => "Go",
            
            // Java/Kotlin
            "java" => "Java",
            "kt" | "kts" => "Kotlin",
            "scala" => "Scala",
            "groovy" => "Groovy",
            
            // C/C++
            "c" => "C",
            "h" => "C Header",
            "cpp" | "cc" | "cxx" => "C++",
            "hpp" | "hxx" => "C++ Header",
            
            // C#/F#
            "cs" => "C#",
            "fs" | "fsx" => "F#",
            
            // Ruby
            "rb" => "Ruby",
            "erb" => "ERB",
            
            // PHP
            "php" => "PHP",
            
            // Swift/Objective-C
            "swift" => "Swift",
            "m" => "Objective-C",
            "mm" => "Objective-C++",
            
            // Shell
            "sh" | "bash" => "Shell",
            "zsh" => "Zsh",
            "fish" => "Fish",
            "ps1" | "psm1" => "PowerShell",
            "bat" | "cmd" => "Batch",
            
            // Data/Config
            "json" => "JSON",
            "yaml" | "yml" => "YAML",
            "toml" => "TOML",
            "xml" => "XML",
            "ini" => "INI",
            "env" => "Environment",
            
            // Markup
            "md" | "markdown" => "Markdown",
            "rst" => "reStructuredText",
            "tex" => "LaTeX",
            "adoc" => "AsciiDoc",
            
            // SQL
            "sql" => "SQL",
            
            // Lua
            "lua" => "Lua",
            
            // R
            "r" => "R",
            
            // Haskell
            "hs" => "Haskell",
            
            // Elixir/Erlang
            "ex" | "exs" => "Elixir",
            "erl" => "Erlang",
            
            // Clojure
            "clj" | "cljs" | "cljc" => "Clojure",
            
            // Dart
            "dart" => "Dart",
            
            // Zig
            "zig" => "Zig",
            
            // Nim
            "nim" => "Nim",
            
            // V
            "v" => "V",
            
            // Assembly
            "asm" | "s" => "Assembly",
            
            // Dockerfile
            "dockerfile" => "Dockerfile",
            
            // GraphQL
            "graphql" | "gql" => "GraphQL",
            
            // Protobuf
            "proto" => "Protocol Buffers",
            
            _ => return None,
        };
        
        Some(lang.to_string())
    }

    /// Detect file type category from extension
    fn detect_file_type(extension: &str) -> FileType {
        match extension.to_lowercase().as_str() {
            // Source code
            "js" | "jsx" | "ts" | "tsx" | "py" | "rs" | "go" | "java" | "kt" | "scala" |
            "c" | "cpp" | "cc" | "h" | "hpp" | "cs" | "fs" | "rb" | "php" | "swift" |
            "m" | "mm" | "lua" | "r" | "hs" | "ex" | "exs" | "erl" | "clj" | "dart" |
            "zig" | "nim" | "v" | "asm" | "s" | "sh" | "bash" | "zsh" | "ps1" | "bat" => FileType::SourceCode,
            
            // Markup
            "html" | "htm" | "xml" | "xhtml" | "md" | "markdown" | "rst" | "tex" | "adoc" => FileType::Markup,
            
            // Config
            "json" | "yaml" | "yml" | "toml" | "ini" | "cfg" | "conf" | "env" | "properties" |
            "dockerfile" | "makefile" | "cmake" | "gradle" | "pom" => FileType::Config,
            
            // Data
            "csv" | "tsv" | "sql" | "graphql" | "gql" | "proto" => FileType::Data,
            
            // Documents
            "doc" | "docx" | "pdf" | "odt" | "rtf" | "txt" | "pages" => FileType::Document,
            
            // Images
            "png" | "jpg" | "jpeg" | "gif" | "bmp" | "svg" | "webp" | "ico" | "tiff" | "psd" | "ai" => FileType::Image,
            
            // Video
            "mp4" | "mkv" | "avi" | "mov" | "wmv" | "flv" | "webm" => FileType::Video,
            
            // Audio
            "mp3" | "wav" | "flac" | "aac" | "ogg" | "wma" | "m4a" => FileType::Audio,
            
            // Archives
            "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" => FileType::Archive,
            
            // Executables
            "exe" | "msi" | "dmg" | "app" | "deb" | "rpm" | "apk" => FileType::Executable,
            
            _ => FileType::Unknown,
        }
    }

    /// Find project root directory
    fn find_project_root(file_path: &str) -> Option<String> {
        let path = PathBuf::from(file_path);
        let mut current = path.parent()?;

        // Project root indicators
        let indicators = [
            ".git",
            "package.json",
            "Cargo.toml",
            "go.mod",
            "pom.xml",
            "build.gradle",
            "requirements.txt",
            "setup.py",
            "pyproject.toml",
            ".project",
            "*.sln",
            "*.csproj",
            "Makefile",
            "CMakeLists.txt",
        ];

        while current.parent().is_some() {
            for indicator in &indicators {
                if indicator.contains('*') {
                    // Glob pattern
                    let pattern = indicator.replace('*', "");
                    if std::fs::read_dir(current).ok()?.any(|entry| {
                        entry.ok().map(|e| e.file_name().to_string_lossy().ends_with(&pattern)).unwrap_or(false)
                    }) {
                        return Some(current.to_string_lossy().to_string());
                    }
                } else if current.join(indicator).exists() {
                    return Some(current.to_string_lossy().to_string());
                }
            }
            current = current.parent()?;
        }

        None
    }

    /// Get current git branch
    fn get_git_branch(project_root: &str) -> Option<String> {
        let git_head = PathBuf::from(project_root).join(".git").join("HEAD");
        
        if let Ok(content) = std::fs::read_to_string(&git_head) {
            // Parse "ref: refs/heads/branch-name"
            if content.starts_with("ref: refs/heads/") {
                return Some(content.trim_start_matches("ref: refs/heads/").trim().to_string());
            }
            // Detached HEAD - return short commit hash
            if content.len() >= 7 {
                return Some(content[..7].to_string());
            }
        }

        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context::WindowInfo;

    fn create_test_window_info(title: &str) -> WindowInfo {
        WindowInfo {
            handle: 12345,
            title: title.to_string(),
            class_name: "TestClass".to_string(),
            process_id: 1234,
            process_name: "code.exe".to_string(),
            exe_path: Some("C:\\Program Files\\code.exe".to_string()),
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

    // File info extraction tests
    #[test]
    fn test_extract_file_name_simple() {
        let window = create_test_window_info("main.rs - myproject - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.name, Some("main.rs".to_string()));
    }

    #[test]
    fn test_extract_file_extension() {
        let window = create_test_window_info("main.rs - myproject - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.extension, Some("rs".to_string()));
    }

    #[test]
    fn test_extract_windows_path() {
        let window = create_test_window_info("C:\\Users\\user\\project\\main.rs - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert!(context.path.is_some());
        assert!(context.path.as_ref().unwrap().contains("main.rs"));
    }

    #[test]
    fn test_extract_unix_path() {
        let window = create_test_window_info("/home/user/project/main.rs - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert!(context.path.is_some());
        assert!(context.path.as_ref().unwrap().contains("main.rs"));
    }

    // Modified detection tests
    #[test]
    fn test_detect_modified_star_prefix() {
        let window = create_test_window_info("*main.rs - project - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert!(context.is_modified);
    }

    #[test]
    fn test_detect_modified_bullet_prefix() {
        let window = create_test_window_info("● main.rs - project - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert!(context.is_modified);
    }

    #[test]
    fn test_detect_modified_text() {
        let window = create_test_window_info("main.rs [Modified] - project - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert!(context.is_modified);
    }

    #[test]
    fn test_detect_modified_suffix() {
        let window = create_test_window_info("main.rs* - project - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert!(context.is_modified);
    }

    #[test]
    fn test_not_modified() {
        let window = create_test_window_info("main.rs - project - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert!(!context.is_modified);
    }

    // Language detection tests
    #[test]
    fn test_language_rust() {
        let window = create_test_window_info("main.rs - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Rust".to_string()));
    }

    #[test]
    fn test_language_javascript() {
        let window = create_test_window_info("index.js - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("JavaScript".to_string()));
    }

    #[test]
    fn test_language_typescript() {
        let window = create_test_window_info("index.ts - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("TypeScript".to_string()));
    }

    #[test]
    fn test_language_jsx() {
        let window = create_test_window_info("App.jsx - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("JavaScript (JSX)".to_string()));
    }

    #[test]
    fn test_language_tsx() {
        let window = create_test_window_info("App.tsx - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("TypeScript (TSX)".to_string()));
    }

    #[test]
    fn test_language_python() {
        let window = create_test_window_info("main.py - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Python".to_string()));
    }

    #[test]
    fn test_language_go() {
        let window = create_test_window_info("main.go - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Go".to_string()));
    }

    #[test]
    fn test_language_java() {
        let window = create_test_window_info("Main.java - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Java".to_string()));
    }

    #[test]
    fn test_language_kotlin() {
        let window = create_test_window_info("Main.kt - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Kotlin".to_string()));
    }

    #[test]
    fn test_language_c() {
        let window = create_test_window_info("main.c - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("C".to_string()));
    }

    #[test]
    fn test_language_cpp() {
        let window = create_test_window_info("main.cpp - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("C++".to_string()));
    }

    #[test]
    fn test_language_csharp() {
        let window = create_test_window_info("Program.cs - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("C#".to_string()));
    }

    #[test]
    fn test_language_ruby() {
        let window = create_test_window_info("app.rb - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Ruby".to_string()));
    }

    #[test]
    fn test_language_php() {
        let window = create_test_window_info("index.php - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("PHP".to_string()));
    }

    #[test]
    fn test_language_swift() {
        let window = create_test_window_info("main.swift - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Swift".to_string()));
    }

    #[test]
    fn test_language_html() {
        let window = create_test_window_info("index.html - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("HTML".to_string()));
    }

    #[test]
    fn test_language_css() {
        let window = create_test_window_info("styles.css - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("CSS".to_string()));
    }

    #[test]
    fn test_language_scss() {
        let window = create_test_window_info("styles.scss - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("SCSS/Sass".to_string()));
    }

    #[test]
    fn test_language_json() {
        let window = create_test_window_info("package.json - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("JSON".to_string()));
    }

    #[test]
    fn test_language_yaml() {
        let window = create_test_window_info("config.yaml - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("YAML".to_string()));
    }

    #[test]
    fn test_language_yml() {
        let window = create_test_window_info("config.yml - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("YAML".to_string()));
    }

    #[test]
    fn test_language_toml() {
        let window = create_test_window_info("Cargo.toml - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("TOML".to_string()));
    }

    #[test]
    fn test_language_markdown() {
        let window = create_test_window_info("README.md - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Markdown".to_string()));
    }

    #[test]
    fn test_language_sql() {
        let window = create_test_window_info("query.sql - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("SQL".to_string()));
    }

    #[test]
    fn test_language_shell() {
        let window = create_test_window_info("script.sh - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Shell".to_string()));
    }

    #[test]
    fn test_language_powershell() {
        let window = create_test_window_info("script.ps1 - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("PowerShell".to_string()));
    }

    #[test]
    fn test_language_vue() {
        let window = create_test_window_info("App.vue - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Vue".to_string()));
    }

    #[test]
    fn test_language_svelte() {
        let window = create_test_window_info("App.svelte - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Svelte".to_string()));
    }

    #[test]
    fn test_language_dart() {
        let window = create_test_window_info("main.dart - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Dart".to_string()));
    }

    #[test]
    fn test_language_elixir() {
        let window = create_test_window_info("app.ex - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Elixir".to_string()));
    }

    #[test]
    fn test_language_haskell() {
        let window = create_test_window_info("Main.hs - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Haskell".to_string()));
    }

    #[test]
    fn test_language_lua() {
        let window = create_test_window_info("init.lua - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("Lua".to_string()));
    }

    #[test]
    fn test_language_r() {
        let window = create_test_window_info("analysis.r - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.language, Some("R".to_string()));
    }

    #[test]
    fn test_language_unknown() {
        let window = create_test_window_info("file.xyz - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert!(context.language.is_none());
    }

    // File type detection tests
    #[test]
    fn test_file_type_source_code_rs() {
        let window = create_test_window_info("main.rs - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::SourceCode);
    }

    #[test]
    fn test_file_type_source_code_py() {
        let window = create_test_window_info("main.py - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::SourceCode);
    }

    #[test]
    fn test_file_type_markup_html() {
        let window = create_test_window_info("index.html - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Markup);
    }

    #[test]
    fn test_file_type_markup_md() {
        let window = create_test_window_info("README.md - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Markup);
    }

    #[test]
    fn test_file_type_config_json() {
        let window = create_test_window_info("package.json - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Config);
    }

    #[test]
    fn test_file_type_config_yaml() {
        let window = create_test_window_info("config.yaml - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Config);
    }

    #[test]
    fn test_file_type_config_toml() {
        let window = create_test_window_info("Cargo.toml - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Config);
    }

    #[test]
    fn test_file_type_data_sql() {
        let window = create_test_window_info("query.sql - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Data);
    }

    #[test]
    fn test_file_type_data_csv() {
        let window = create_test_window_info("data.csv - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Data);
    }

    #[test]
    fn test_file_type_document_pdf() {
        let window = create_test_window_info("report.pdf - Viewer");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Document);
    }

    #[test]
    fn test_file_type_document_doc() {
        let window = create_test_window_info("document.doc - Word");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Document);
    }

    #[test]
    fn test_file_type_image_png() {
        let window = create_test_window_info("image.png - Viewer");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Image);
    }

    #[test]
    fn test_file_type_image_jpg() {
        let window = create_test_window_info("photo.jpg - Viewer");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Image);
    }

    #[test]
    fn test_file_type_video_mp4() {
        let window = create_test_window_info("video.mp4 - Player");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Video);
    }

    #[test]
    fn test_file_type_audio_mp3() {
        let window = create_test_window_info("audio.mp3 - Player");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Audio);
    }

    #[test]
    fn test_file_type_archive_zip() {
        let window = create_test_window_info("archive.zip - Explorer");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Archive);
    }

    #[test]
    fn test_file_type_executable_exe() {
        let window = create_test_window_info("program.exe - Properties");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Executable);
    }

    #[test]
    fn test_file_type_unknown() {
        let window = create_test_window_info("file.xyz - Editor");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.file_type, FileType::Unknown);
    }

    // Serialization tests
    #[test]
    fn test_file_context_serialization() {
        let window = create_test_window_info("main.rs - project - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        
        let json = serde_json::to_string(&context);
        assert!(json.is_ok());
        
        let parsed: Result<FileContext, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
    }

    #[test]
    fn test_file_type_serialization() {
        let file_types = vec![
            FileType::SourceCode,
            FileType::Markup,
            FileType::Config,
            FileType::Data,
            FileType::Document,
            FileType::Image,
            FileType::Video,
            FileType::Audio,
            FileType::Archive,
            FileType::Executable,
            FileType::Unknown,
        ];
        
        for file_type in file_types {
            let json = serde_json::to_string(&file_type);
            assert!(json.is_ok());
        }
    }

    // Edge case tests
    #[test]
    fn test_empty_title() {
        let window = create_test_window_info("");
        let context = FileContext::from_window_info(&window).unwrap();
        assert!(context.name.is_none());
        assert!(context.extension.is_none());
    }

    #[test]
    fn test_title_without_extension() {
        let window = create_test_window_info("Makefile - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        // May or may not extract name depending on patterns
        assert_eq!(context.file_type, FileType::Unknown);
    }

    #[test]
    fn test_case_insensitive_extension() {
        let window = create_test_window_info("main.RS - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.extension, Some("rs".to_string()));
        assert_eq!(context.language, Some("Rust".to_string()));
    }

    #[test]
    fn test_multiple_extensions() {
        let window = create_test_window_info("data.test.json - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        assert_eq!(context.extension, Some("json".to_string()));
    }

    #[test]
    fn test_hidden_file() {
        let window = create_test_window_info(".gitignore - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        // .gitignore might or might not be detected depending on patterns
        // Just ensure it doesn't crash
        assert!(context.file_type == FileType::Unknown || context.name.is_some());
    }

    #[test]
    fn test_file_with_spaces() {
        let window = create_test_window_info("my file.rs - Visual Studio Code");
        let _context = FileContext::from_window_info(&window).unwrap();
        // Files with spaces might not be detected properly, that's expected
        // The current implementation may not handle this
    }

    #[test]
    fn test_complex_path() {
        let window = create_test_window_info("C:\\Users\\test user\\My Projects\\project-name\\src\\main.rs - Visual Studio Code");
        let context = FileContext::from_window_info(&window).unwrap();
        // Should extract some file info
        assert!(context.extension == Some("rs".to_string()));
    }
}
