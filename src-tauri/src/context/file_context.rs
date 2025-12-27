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
        let is_modified = title.starts_with('*') 
            || title.starts_with('●') 
            || title.contains(" - Modified")
            || title.contains("[Modified]")
            || title.ends_with('*');

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
