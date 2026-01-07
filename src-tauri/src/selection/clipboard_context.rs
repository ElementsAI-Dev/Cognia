//! Clipboard Context Awareness Module
//!
//! Provides intelligent content analysis, pattern recognition, and context-aware
//! clipboard operations.

use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Content category detected from clipboard
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ContentCategory {
    /// Plain text without special patterns
    PlainText,
    /// URL or web link
    Url,
    /// Email address
    Email,
    /// Phone number
    PhoneNumber,
    /// File path
    FilePath,
    /// Source code
    Code,
    /// JSON data
    Json,
    /// XML/HTML markup
    Markup,
    /// Markdown text
    Markdown,
    /// Mathematical expression
    Math,
    /// Color code (hex, rgb, etc.)
    Color,
    /// Date or timestamp
    DateTime,
    /// UUID or GUID
    Uuid,
    /// IP address
    IpAddress,
    /// Credit card number (masked for security)
    SensitiveData,
    /// Command line
    Command,
    /// SQL query
    Sql,
    /// Regex pattern
    RegexPattern,
    /// Structured data (CSV, TSV)
    StructuredData,
    /// Natural language text
    NaturalText,
    /// Unknown or unclassified
    Unknown,
}

/// Detected programming language for code content
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum DetectedLanguage {
    JavaScript,
    TypeScript,
    Python,
    Rust,
    Go,
    Java,
    CSharp,
    Cpp,
    Ruby,
    Php,
    Swift,
    Kotlin,
    Sql,
    Html,
    Css,
    Json,
    Yaml,
    Toml,
    Markdown,
    Shell,
    PowerShell,
    Unknown,
}

/// Context-aware analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardAnalysis {
    /// Primary content category
    pub category: ContentCategory,
    /// Secondary categories (content may match multiple)
    pub secondary_categories: Vec<ContentCategory>,
    /// Detected language if content is code
    pub language: Option<DetectedLanguage>,
    /// Confidence score (0.0 - 1.0)
    pub confidence: f32,
    /// Extracted entities (URLs, emails, etc.)
    pub entities: Vec<ExtractedEntity>,
    /// Suggested actions based on content
    pub suggested_actions: Vec<SuggestedAction>,
    /// Content statistics
    pub stats: ContentStats,
    /// Is content potentially sensitive
    pub is_sensitive: bool,
    /// Formatting hints
    pub formatting: FormattingHints,
}

/// Extracted entity from content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedEntity {
    pub entity_type: String,
    pub value: String,
    pub start: usize,
    pub end: usize,
}

/// Suggested action for clipboard content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedAction {
    pub action_id: String,
    pub label: String,
    pub description: String,
    pub icon: Option<String>,
    pub priority: u8,
}

/// Content statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentStats {
    pub char_count: usize,
    pub word_count: usize,
    pub line_count: usize,
    pub has_unicode: bool,
    pub has_emoji: bool,
    pub has_whitespace_only_lines: bool,
}

/// Formatting hints for display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormattingHints {
    pub syntax_highlight: bool,
    pub language_hint: Option<String>,
    pub preserve_whitespace: bool,
    pub is_multiline: bool,
    pub max_preview_lines: usize,
}

// Lazy-initialized regex patterns
static URL_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"https?://[^\s<>"']+|www\.[^\s<>"']+"#).unwrap());

static EMAIL_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap());

static PHONE_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(\+?\d{1,3}[-\.\s]?)?\(?\d{3}\)?[-\.\s]?\d{3}[-\.\s]?\d{4}").unwrap()
});

static FILE_PATH_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"(?:[A-Za-z]:)?(?:[/\\][^/\\:\*\?"<>\|]+)+"#).unwrap());

static HEX_COLOR_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"#(?:[0-9a-fA-F]{3}){1,2}\b|#(?:[0-9a-fA-F]{4}){1,2}\b").unwrap());

static RGB_COLOR_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"rgba?\s*\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*[\d.]+\s*)?\)").unwrap()
});

static UUID_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
        .unwrap()
});

static IP_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"\b(?:\d{1,3}\.){3}\d{1,3}\b").unwrap());

static DATETIME_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?|\d{2}/\d{2}/\d{4}").unwrap()
});

static CREDIT_CARD_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\b(?:\d{4}[-\s]?){3}\d{4}\b").unwrap());

/// Clipboard context analyzer
pub struct ClipboardContextAnalyzer {
    language_patterns: HashMap<DetectedLanguage, Vec<&'static str>>,
}

impl ClipboardContextAnalyzer {
    pub fn new() -> Self {
        log::debug!("[ClipboardContextAnalyzer] Creating new instance");
        let mut language_patterns: HashMap<DetectedLanguage, Vec<&'static str>> = HashMap::new();

        language_patterns.insert(
            DetectedLanguage::JavaScript,
            vec![
                "const ",
                "let ",
                "var ",
                "function ",
                "=> ",
                "async ",
                "await ",
                "import ",
                "export ",
                "require(",
                "module.exports",
                ".then(",
                "console.log",
                "document.",
                "window.",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::TypeScript,
            vec![
                "interface ",
                "type ",
                ": string",
                ": number",
                ": boolean",
                ": void",
                "<T>",
                "as ",
                "readonly ",
                "enum ",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::Python,
            vec![
                "def ",
                "class ",
                "import ",
                "from ",
                "if __name__",
                "self.",
                "elif ",
                "except:",
                "lambda ",
                "print(",
                "async def ",
                "await ",
                "__init__",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::Rust,
            vec![
                "fn ", "let ", "mut ", "impl ", "struct ", "enum ", "pub ", "use ", "mod ", "&str",
                "Vec<", "Option<", "Result<", "match ", "->", "::",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::Go,
            vec![
                "func ",
                "package ",
                "import ",
                "type ",
                "struct {",
                "interface {",
                "go ",
                "defer ",
                "chan ",
                ":= ",
                "fmt.",
                "err != nil",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::Java,
            vec![
                "public class",
                "private ",
                "protected ",
                "void ",
                "System.out",
                "new ",
                "extends ",
                "implements ",
                "@Override",
                "package ",
                "import java.",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::CSharp,
            vec![
                "public class",
                "private ",
                "protected ",
                "void ",
                "Console.",
                "new ",
                "using ",
                "namespace ",
                "async Task",
                "await ",
                "var ",
                "=>",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::Sql,
            vec![
                "SELECT ", "FROM ", "WHERE ", "INSERT ", "UPDATE ", "DELETE ", "CREATE ", "DROP ",
                "ALTER ", "JOIN ", "GROUP BY", "ORDER BY", "HAVING ",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::Html,
            vec![
                "<html", "<head", "<body", "<div", "<span", "<a ", "<script", "<style", "<link",
                "</", "/>",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::Css,
            vec![
                "margin:",
                "padding:",
                "display:",
                "color:",
                "background:",
                "font-",
                "border:",
                "width:",
                "height:",
                "@media",
                "flex",
                "grid",
                "position:",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::Shell,
            vec![
                "#!/bin/bash",
                "#!/bin/sh",
                "echo ",
                "export ",
                "source ",
                "$HOME",
                "$PATH",
                "if [",
                "fi",
                "done",
                "for ",
            ],
        );

        language_patterns.insert(
            DetectedLanguage::PowerShell,
            vec![
                "$_",
                "Get-",
                "Set-",
                "New-",
                "Remove-",
                "Write-Host",
                "Invoke-",
                "param(",
                "[CmdletBinding",
                "$PSScriptRoot",
            ],
        );

        Self { language_patterns }
    }

    /// Analyze clipboard content and return detailed analysis
    pub fn analyze(&self, content: &str) -> ClipboardAnalysis {
        log::debug!(
            "[ClipboardContextAnalyzer] Analyzing {} chars",
            content.len()
        );
        let stats = self.compute_stats(content);
        let entities = self.extract_entities(content);
        let (category, secondary, confidence) = self.detect_category(content, &entities);
        let language = self.detect_language(content, &category);
        let is_sensitive = self.check_sensitive(content);
        let suggested_actions = self.generate_actions(&category, &entities, &language);
        let formatting = self.compute_formatting(&category, &language, &stats);

        log::debug!("[ClipboardContextAnalyzer] Analysis complete: type={:?}, language={:?}, actions={} confidence={}",
            category, language, suggested_actions.len(), confidence);

        ClipboardAnalysis {
            category,
            secondary_categories: secondary,
            language,
            confidence,
            entities,
            suggested_actions,
            stats,
            is_sensitive,
            formatting,
        }
    }

    fn compute_stats(&self, content: &str) -> ContentStats {
        let char_count = content.chars().count();
        let word_count = content.split_whitespace().count();
        let line_count = content.lines().count().max(1);
        let has_unicode = !content.is_ascii();
        let has_emoji = content.chars().any(|c| {
            let code = c as u32;
            (0x1F600..=0x1F64F).contains(&code) || // Emoticons
            (0x1F300..=0x1F5FF).contains(&code) || // Symbols
            (0x1F680..=0x1F6FF).contains(&code) || // Transport
            (0x2600..=0x26FF).contains(&code) // Misc symbols
        });
        let has_whitespace_only_lines = content
            .lines()
            .any(|line| !line.is_empty() && line.chars().all(|c| c.is_whitespace()));

        ContentStats {
            char_count,
            word_count,
            line_count,
            has_unicode,
            has_emoji,
            has_whitespace_only_lines,
        }
    }

    fn extract_entities(&self, content: &str) -> Vec<ExtractedEntity> {
        log::debug!(
            "[ClipboardContextAnalyzer] Extracting entities from {} chars",
            content.len()
        );
        let mut entities = Vec::new();

        // Extract URLs
        for mat in URL_REGEX.find_iter(content) {
            entities.push(ExtractedEntity {
                entity_type: "url".to_string(),
                value: mat.as_str().to_string(),
                start: mat.start(),
                end: mat.end(),
            });
        }

        // Extract emails
        for mat in EMAIL_REGEX.find_iter(content) {
            entities.push(ExtractedEntity {
                entity_type: "email".to_string(),
                value: mat.as_str().to_string(),
                start: mat.start(),
                end: mat.end(),
            });
        }

        // Extract phone numbers
        for mat in PHONE_REGEX.find_iter(content) {
            entities.push(ExtractedEntity {
                entity_type: "phone".to_string(),
                value: mat.as_str().to_string(),
                start: mat.start(),
                end: mat.end(),
            });
        }

        // Extract colors
        for mat in HEX_COLOR_REGEX.find_iter(content) {
            entities.push(ExtractedEntity {
                entity_type: "color".to_string(),
                value: mat.as_str().to_string(),
                start: mat.start(),
                end: mat.end(),
            });
        }
        for mat in RGB_COLOR_REGEX.find_iter(content) {
            entities.push(ExtractedEntity {
                entity_type: "color".to_string(),
                value: mat.as_str().to_string(),
                start: mat.start(),
                end: mat.end(),
            });
        }

        // Extract UUIDs
        for mat in UUID_REGEX.find_iter(content) {
            entities.push(ExtractedEntity {
                entity_type: "uuid".to_string(),
                value: mat.as_str().to_string(),
                start: mat.start(),
                end: mat.end(),
            });
        }

        // Extract IP addresses
        for mat in IP_REGEX.find_iter(content) {
            entities.push(ExtractedEntity {
                entity_type: "ip".to_string(),
                value: mat.as_str().to_string(),
                start: mat.start(),
                end: mat.end(),
            });
        }

        // Extract dates
        for mat in DATETIME_REGEX.find_iter(content) {
            entities.push(ExtractedEntity {
                entity_type: "datetime".to_string(),
                value: mat.as_str().to_string(),
                start: mat.start(),
                end: mat.end(),
            });
        }

        // Sort by position
        entities.sort_by_key(|e| e.start);
        log::debug!(
            "[ClipboardContextAnalyzer] Extracted {} entities",
            entities.len()
        );
        entities
    }

    fn detect_category(
        &self,
        content: &str,
        entities: &[ExtractedEntity],
    ) -> (ContentCategory, Vec<ContentCategory>, f32) {
        log::debug!(
            "[ClipboardContextAnalyzer] Detecting category for {} chars",
            content.len()
        );
        let trimmed = content.trim();
        let mut scores: HashMap<ContentCategory, f32> = HashMap::new();

        // Check for JSON
        if ((trimmed.starts_with('{') && trimmed.ends_with('}'))
            || (trimmed.starts_with('[') && trimmed.ends_with(']')))
            && serde_json::from_str::<serde_json::Value>(trimmed).is_ok()
        {
            scores.insert(ContentCategory::Json, 1.0);
        }

        // Check for HTML/XML
        if trimmed.starts_with('<') && trimmed.contains('>') {
            let html_tags = ["html", "div", "span", "body", "head", "p", "a", "script"];
            if html_tags
                .iter()
                .any(|tag| trimmed.contains(&format!("<{}", tag)))
            {
                scores.insert(ContentCategory::Markup, 0.9);
            }
        }

        // Check for Markdown
        let md_patterns = [
            "# ", "## ", "```", "**", "__", "- [ ]", "- [x]", "[](", "![](",
        ];
        let md_count = md_patterns.iter().filter(|p| content.contains(*p)).count();
        if md_count >= 2 {
            scores.insert(
                ContentCategory::Markdown,
                0.8 + (md_count as f32 * 0.02).min(0.15),
            );
        }

        // Check for SQL
        let sql_keywords = [
            "SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER",
        ];
        let upper = content.to_uppercase();
        let sql_count = sql_keywords.iter().filter(|k| upper.contains(*k)).count();
        if sql_count >= 2 {
            scores.insert(
                ContentCategory::Sql,
                0.7 + (sql_count as f32 * 0.05).min(0.25),
            );
        }

        // Check for command line
        if trimmed.starts_with('$')
            || trimmed.starts_with('>')
            || trimmed.starts_with("sudo ")
            || trimmed.starts_with("npm ")
            || trimmed.starts_with("pnpm ")
            || trimmed.starts_with("yarn ")
            || trimmed.starts_with("cargo ")
            || trimmed.starts_with("git ")
            || trimmed.starts_with("cd ")
        {
            scores.insert(ContentCategory::Command, 0.85);
        }

        // Check entity-based categories
        let url_count = entities.iter().filter(|e| e.entity_type == "url").count();
        let email_count = entities.iter().filter(|e| e.entity_type == "email").count();
        let color_count = entities.iter().filter(|e| e.entity_type == "color").count();
        let uuid_count = entities.iter().filter(|e| e.entity_type == "uuid").count();
        let ip_count = entities.iter().filter(|e| e.entity_type == "ip").count();

        // If content is mostly a URL
        if url_count > 0 && trimmed.len() < 500 {
            let url_entity = entities.iter().find(|e| e.entity_type == "url").unwrap();
            if url_entity.value.len() as f32 / trimmed.len() as f32 > 0.8 {
                scores.insert(ContentCategory::Url, 0.95);
            } else {
                scores.insert(
                    ContentCategory::Url,
                    0.5 + (url_count as f32 * 0.1).min(0.3),
                );
            }
        }

        if email_count > 0 {
            if email_count == 1 && trimmed.len() < 100 {
                scores.insert(ContentCategory::Email, 0.9);
            } else {
                scores.insert(ContentCategory::Email, 0.5);
            }
        }

        if color_count > 0 {
            scores.insert(
                ContentCategory::Color,
                0.6 + (color_count as f32 * 0.1).min(0.3),
            );
        }

        if uuid_count > 0 {
            scores.insert(ContentCategory::Uuid, 0.7);
        }

        if ip_count > 0 {
            scores.insert(ContentCategory::IpAddress, 0.7);
        }

        // Check for file path
        if FILE_PATH_REGEX.is_match(trimmed) && trimmed.len() < 500 {
            scores.insert(ContentCategory::FilePath, 0.8);
        }

        // Check for code (generic)
        let code_indicators = [
            ";", "{", "}", "()", "=>", "->", "//", "/*", "*/", "===", "!==",
        ];
        let code_count = code_indicators
            .iter()
            .filter(|i| content.contains(*i))
            .count();
        if code_count >= 3 {
            scores.insert(
                ContentCategory::Code,
                0.6 + (code_count as f32 * 0.03).min(0.3),
            );
        }

        // Check for structured data (CSV/TSV)
        let lines: Vec<&str> = content.lines().collect();
        if lines.len() > 1 {
            let first_commas = lines[0].matches(',').count();
            let first_tabs = lines[0].matches('\t').count();
            if first_commas > 2 || first_tabs > 2 {
                let consistent = lines.iter().skip(1).take(5).all(|line| {
                    let commas = line.matches(',').count();
                    let tabs = line.matches('\t').count();
                    (first_commas > 0 && commas == first_commas)
                        || (first_tabs > 0 && tabs == first_tabs)
                });
                if consistent {
                    scores.insert(ContentCategory::StructuredData, 0.85);
                }
            }
        }

        // Default to plain text or natural text
        if scores.is_empty() {
            let word_ratio =
                content.split_whitespace().count() as f32 / content.len().max(1) as f32;
            if word_ratio > 0.1 && content.len() > 50 {
                scores.insert(ContentCategory::NaturalText, 0.7);
            } else {
                scores.insert(ContentCategory::PlainText, 0.5);
            }
        }

        // Find primary and secondary categories
        let mut sorted: Vec<_> = scores.iter().collect();
        sorted.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap());

        let primary = sorted
            .first()
            .map(|(c, _)| (*c).clone())
            .unwrap_or(ContentCategory::Unknown);
        let confidence = sorted.first().map(|(_, s)| **s).unwrap_or(0.0);
        let secondary: Vec<ContentCategory> = sorted
            .iter()
            .skip(1)
            .filter(|(_, s)| **s > 0.4)
            .map(|(c, _)| (*c).clone())
            .collect();

        log::debug!(
            "[ClipboardContextAnalyzer] Detected category: {:?} with confidence: {}",
            primary,
            confidence
        );
        (primary, secondary, confidence)
    }

    fn detect_language(
        &self,
        content: &str,
        category: &ContentCategory,
    ) -> Option<DetectedLanguage> {
        log::debug!(
            "[ClipboardContextAnalyzer] Detecting language for {} chars",
            content.len()
        );
        if !matches!(
            category,
            ContentCategory::Code | ContentCategory::Markup | ContentCategory::Sql
        ) {
            return None;
        }

        let mut scores: HashMap<DetectedLanguage, usize> = HashMap::new();

        for (lang, patterns) in &self.language_patterns {
            let count = patterns.iter().filter(|p| content.contains(*p)).count();
            if count > 0 {
                scores.insert(lang.clone(), count);
            }
        }

        scores
            .into_iter()
            .max_by_key(|(_, count)| *count)
            .map(|(lang, _)| lang)
    }

    fn check_sensitive(&self, content: &str) -> bool {
        log::debug!(
            "[ClipboardContextAnalyzer] Checking for sensitive content in {} chars",
            content.len()
        );
        // Check for credit card patterns
        if CREDIT_CARD_REGEX.is_match(content) {
            return true;
        }

        // Check for password-like patterns
        let sensitive_keywords = [
            "password",
            "passwd",
            "secret",
            "api_key",
            "apikey",
            "private_key",
            "access_token",
            "bearer",
            "authorization",
        ];
        let lower = content.to_lowercase();
        if sensitive_keywords.iter().any(|k| lower.contains(k)) {
            return true;
        }

        false
    }

    fn generate_actions(
        &self,
        category: &ContentCategory,
        entities: &[ExtractedEntity],
        language: &Option<DetectedLanguage>,
    ) -> Vec<SuggestedAction> {
        log::debug!(
            "[ClipboardContextAnalyzer] Generating actions for {} entities",
            entities.len()
        );
        let mut actions = Vec::new();

        // Base copy action
        actions.push(SuggestedAction {
            action_id: "copy".to_string(),
            label: "Copy".to_string(),
            description: "Copy to clipboard".to_string(),
            icon: Some("copy".to_string()),
            priority: 100,
        });

        match category {
            ContentCategory::Url => {
                actions.push(SuggestedAction {
                    action_id: "open_url".to_string(),
                    label: "Open URL".to_string(),
                    description: "Open in browser".to_string(),
                    icon: Some("external-link".to_string()),
                    priority: 90,
                });
            }
            ContentCategory::Email => {
                actions.push(SuggestedAction {
                    action_id: "compose_email".to_string(),
                    label: "Compose Email".to_string(),
                    description: "Open email client".to_string(),
                    icon: Some("mail".to_string()),
                    priority: 90,
                });
            }
            ContentCategory::FilePath => {
                actions.push(SuggestedAction {
                    action_id: "open_file".to_string(),
                    label: "Open File".to_string(),
                    description: "Open file location".to_string(),
                    icon: Some("folder-open".to_string()),
                    priority: 90,
                });
            }
            ContentCategory::Code | ContentCategory::Sql => {
                actions.push(SuggestedAction {
                    action_id: "format_code".to_string(),
                    label: "Format Code".to_string(),
                    description: "Auto-format code".to_string(),
                    icon: Some("code".to_string()),
                    priority: 85,
                });
                actions.push(SuggestedAction {
                    action_id: "explain_code".to_string(),
                    label: "Explain with AI".to_string(),
                    description: "Get AI explanation".to_string(),
                    icon: Some("sparkles".to_string()),
                    priority: 80,
                });
            }
            ContentCategory::Json => {
                actions.push(SuggestedAction {
                    action_id: "format_json".to_string(),
                    label: "Format JSON".to_string(),
                    description: "Pretty print JSON".to_string(),
                    icon: Some("braces".to_string()),
                    priority: 90,
                });
                actions.push(SuggestedAction {
                    action_id: "minify_json".to_string(),
                    label: "Minify JSON".to_string(),
                    description: "Compress JSON".to_string(),
                    icon: Some("minimize".to_string()),
                    priority: 75,
                });
            }
            ContentCategory::Color => {
                actions.push(SuggestedAction {
                    action_id: "convert_color".to_string(),
                    label: "Convert Color".to_string(),
                    description: "Convert between formats".to_string(),
                    icon: Some("palette".to_string()),
                    priority: 90,
                });
            }
            ContentCategory::NaturalText | ContentCategory::Markdown => {
                actions.push(SuggestedAction {
                    action_id: "summarize".to_string(),
                    label: "Summarize".to_string(),
                    description: "AI summarization".to_string(),
                    icon: Some("sparkles".to_string()),
                    priority: 85,
                });
                actions.push(SuggestedAction {
                    action_id: "translate".to_string(),
                    label: "Translate".to_string(),
                    description: "Translate text".to_string(),
                    icon: Some("languages".to_string()),
                    priority: 80,
                });
            }
            _ => {}
        }

        // Add entity-specific actions
        if entities.iter().any(|e| e.entity_type == "url") && category != &ContentCategory::Url {
            actions.push(SuggestedAction {
                action_id: "extract_urls".to_string(),
                label: "Extract URLs".to_string(),
                description: "Get all URLs".to_string(),
                icon: Some("link".to_string()),
                priority: 70,
            });
        }

        // Language-specific actions
        if let Some(DetectedLanguage::Json) = language {
            actions.push(SuggestedAction {
                action_id: "validate_json".to_string(),
                label: "Validate JSON".to_string(),
                description: "Check JSON syntax".to_string(),
                icon: Some("check".to_string()),
                priority: 85,
            });
        }

        // Sort by priority
        actions.sort_by(|a, b| b.priority.cmp(&a.priority));
        log::debug!(
            "[ClipboardContextAnalyzer] Generated {} actions",
            actions.len()
        );
        actions
    }

    fn compute_formatting(
        &self,
        category: &ContentCategory,
        language: &Option<DetectedLanguage>,
        stats: &ContentStats,
    ) -> FormattingHints {
        log::debug!(
            "[ClipboardContextAnalyzer] Computing formatting hints for {} chars",
            stats.char_count
        );
        let syntax_highlight = matches!(
            category,
            ContentCategory::Code
                | ContentCategory::Json
                | ContentCategory::Sql
                | ContentCategory::Markup
                | ContentCategory::Markdown
        );

        let language_hint = language.as_ref().map(|l| {
            match l {
                DetectedLanguage::JavaScript => "javascript",
                DetectedLanguage::TypeScript => "typescript",
                DetectedLanguage::Python => "python",
                DetectedLanguage::Rust => "rust",
                DetectedLanguage::Go => "go",
                DetectedLanguage::Java => "java",
                DetectedLanguage::CSharp => "csharp",
                DetectedLanguage::Cpp => "cpp",
                DetectedLanguage::Ruby => "ruby",
                DetectedLanguage::Php => "php",
                DetectedLanguage::Swift => "swift",
                DetectedLanguage::Kotlin => "kotlin",
                DetectedLanguage::Sql => "sql",
                DetectedLanguage::Html => "html",
                DetectedLanguage::Css => "css",
                DetectedLanguage::Json => "json",
                DetectedLanguage::Yaml => "yaml",
                DetectedLanguage::Toml => "toml",
                DetectedLanguage::Markdown => "markdown",
                DetectedLanguage::Shell => "bash",
                DetectedLanguage::PowerShell => "powershell",
                DetectedLanguage::Unknown => "text",
            }
            .to_string()
        });

        let preserve_whitespace = matches!(
            category,
            ContentCategory::Code | ContentCategory::StructuredData
        );

        FormattingHints {
            syntax_highlight,
            language_hint,
            preserve_whitespace,
            is_multiline: stats.line_count > 1,
            max_preview_lines: if stats.line_count > 10 {
                10
            } else {
                stats.line_count
            },
        }
    }

    /// Transform content based on action
    pub fn transform(&self, content: &str, action: &str) -> Result<String, String> {
        log::debug!(
            "[ClipboardContextAnalyzer] Transforming content with action: {}",
            action
        );
        match action {
            "format_json" => {
                let value: serde_json::Value =
                    serde_json::from_str(content).map_err(|e| format!("Invalid JSON: {}", e))?;
                serde_json::to_string_pretty(&value)
                    .map_err(|e| format!("Formatting failed: {}", e))
            }
            "minify_json" => {
                let value: serde_json::Value =
                    serde_json::from_str(content).map_err(|e| format!("Invalid JSON: {}", e))?;
                serde_json::to_string(&value).map_err(|e| format!("Minification failed: {}", e))
            }
            "extract_urls" => {
                let urls: Vec<&str> = URL_REGEX.find_iter(content).map(|m| m.as_str()).collect();
                Ok(urls.join("\n"))
            }
            "extract_emails" => {
                let emails: Vec<&str> =
                    EMAIL_REGEX.find_iter(content).map(|m| m.as_str()).collect();
                Ok(emails.join("\n"))
            }
            "trim_whitespace" => Ok(content
                .lines()
                .map(|line| line.trim())
                .collect::<Vec<&str>>()
                .join("\n")),
            "to_uppercase" => Ok(content.to_uppercase()),
            "to_lowercase" => Ok(content.to_lowercase()),
            "remove_empty_lines" => Ok(content
                .lines()
                .filter(|line| !line.trim().is_empty())
                .collect::<Vec<&str>>()
                .join("\n")),
            "sort_lines" => {
                let mut lines: Vec<&str> = content.lines().collect();
                lines.sort();
                Ok(lines.join("\n"))
            }
            "unique_lines" => {
                let mut seen = std::collections::HashSet::new();
                let unique: Vec<&str> = content.lines().filter(|line| seen.insert(*line)).collect();
                Ok(unique.join("\n"))
            }
            "escape_html" => Ok(content
                .replace('&', "&amp;")
                .replace('<', "&lt;")
                .replace('>', "&gt;")
                .replace('"', "&quot;")
                .replace('\'', "&#39;")),
            "unescape_html" => Ok(content
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")),
            _ => Err(format!("Unknown action: {}", action)),
        }
    }
}

impl Default for ClipboardContextAnalyzer {
    fn default() -> Self {
        log::debug!("[ClipboardContextAnalyzer] Creating default instance");
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============== URL Detection Tests ==============

    #[test]
    fn test_analyze_url() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("https://www.example.com/path?query=value");
        assert_eq!(result.category, ContentCategory::Url);
        assert!(result.confidence > 0.8);
    }

    #[test]
    fn test_analyze_http_url() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("http://localhost:8080/api/test");
        assert_eq!(result.category, ContentCategory::Url);
    }

    #[test]
    fn test_analyze_ftp_url() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("ftp://files.example.com/downloads/file.zip");
        assert_eq!(result.category, ContentCategory::Url);
    }

    // ============== Email Detection Tests ==============

    #[test]
    fn test_analyze_email() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("user@example.com");
        assert_eq!(result.category, ContentCategory::Email);
    }

    #[test]
    fn test_analyze_email_with_subdomain() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("user@mail.example.co.uk");
        assert_eq!(result.category, ContentCategory::Email);
    }

    #[test]
    fn test_analyze_email_with_plus() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("user+tag@example.com");
        assert_eq!(result.category, ContentCategory::Email);
    }

    // ============== JSON Detection Tests ==============

    #[test]
    fn test_analyze_json() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze(r#"{"name": "test", "value": 123}"#);
        assert_eq!(result.category, ContentCategory::Json);
    }

    #[test]
    fn test_analyze_json_array() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze(r#"[1, 2, 3, "four", null]"#);
        assert_eq!(result.category, ContentCategory::Json);
    }

    #[test]
    fn test_analyze_json_nested() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze(r#"{"user": {"name": "John", "age": 30}, "active": true}"#);
        assert_eq!(result.category, ContentCategory::Json);
    }

    // ============== Code Detection Tests ==============

    #[test]
    fn test_analyze_code() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("const x = 10;\nfunction test() {\n  return x;\n}");
        assert_eq!(result.category, ContentCategory::Code);
        assert_eq!(result.language, Some(DetectedLanguage::JavaScript));
    }

    #[test]
    fn test_analyze_typescript_code() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("interface User {\n  name: string;\n  age: number;\n}");
        assert_eq!(result.category, ContentCategory::Code);
        assert_eq!(result.language, Some(DetectedLanguage::TypeScript));
    }

    #[test]
    fn test_analyze_python_code() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze(
            "def hello():\n    print('Hello, World!')\n\nif __name__ == '__main__':\n    hello()",
        );
        assert_eq!(result.category, ContentCategory::Code);
        assert_eq!(result.language, Some(DetectedLanguage::Python));
    }

    #[test]
    fn test_analyze_rust_code() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer
            .analyze("fn main() {\n    let x: i32 = 42;\n    println!(\"Value: {}\", x);\n}");
        assert_eq!(result.category, ContentCategory::Code);
        assert_eq!(result.language, Some(DetectedLanguage::Rust));
    }

    #[test]
    fn test_analyze_sql_code() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result =
            analyzer.analyze("SELECT * FROM users WHERE active = true ORDER BY created_at DESC");
        assert_eq!(result.category, ContentCategory::Sql);
        assert_eq!(result.language, Some(DetectedLanguage::Sql));
    }

    #[test]
    fn test_analyze_html_code() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer
            .analyze("<div class=\"container\">\n  <h1>Hello</h1>\n  <p>Welcome</p>\n</div>");
        assert_eq!(result.category, ContentCategory::Markup);
        assert_eq!(result.language, Some(DetectedLanguage::Html));
    }

    #[test]
    fn test_analyze_css_code() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze(".container {\n  display: flex;\n  margin: 0 auto;\n}");
        assert_eq!(result.category, ContentCategory::Code);
        assert_eq!(result.language, Some(DetectedLanguage::Css));
    }

    // ============== Entity Extraction Tests ==============

    #[test]
    fn test_extract_entities() {
        let analyzer = ClipboardContextAnalyzer::new();
        let content = "Contact us at info@example.com or visit https://example.com";
        let result = analyzer.analyze(content);
        assert!(result.entities.iter().any(|e| e.entity_type == "email"));
        assert!(result.entities.iter().any(|e| e.entity_type == "url"));
    }

    #[test]
    fn test_extract_phone_number() {
        let analyzer = ClipboardContextAnalyzer::new();
        let content = "Call us at +1 (555) 123-4567 for support";
        let result = analyzer.analyze(content);
        assert!(result.entities.iter().any(|e| e.entity_type == "phone"));
    }

    #[test]
    fn test_extract_color() {
        let analyzer = ClipboardContextAnalyzer::new();
        let content = "Primary color: #FF5733, Secondary: rgb(100, 150, 200)";
        let result = analyzer.analyze(content);
        assert!(result.entities.iter().any(|e| e.entity_type == "color"));
    }

    #[test]
    fn test_extract_uuid() {
        let analyzer = ClipboardContextAnalyzer::new();
        let content = "User ID: 550e8400-e29b-41d4-a716-446655440000";
        let result = analyzer.analyze(content);
        assert!(result.entities.iter().any(|e| e.entity_type == "uuid"));
    }

    #[test]
    fn test_extract_ip_address() {
        let analyzer = ClipboardContextAnalyzer::new();
        let content = "Server IP: 192.168.1.100";
        let result = analyzer.analyze(content);
        assert!(result.entities.iter().any(|e| e.entity_type == "ip"));
    }

    // ============== Transform Tests ==============

    #[test]
    fn test_transform_json() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer
            .transform(r#"{"a":1,"b":2}"#, "format_json")
            .unwrap();
        assert!(result.contains('\n'));
    }

    #[test]
    fn test_transform_minify_json() {
        let analyzer = ClipboardContextAnalyzer::new();
        let input = "{\n  \"a\": 1,\n  \"b\": 2\n}";
        let result = analyzer.transform(input, "minify_json").unwrap();
        assert!(!result.contains('\n'));
        assert!(result.contains("\"a\":1"));
    }

    #[test]
    fn test_transform_to_uppercase() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.transform("hello world", "to_uppercase").unwrap();
        assert_eq!(result, "HELLO WORLD");
    }

    #[test]
    fn test_transform_to_lowercase() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.transform("HELLO WORLD", "to_lowercase").unwrap();
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_transform_trim_whitespace() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer
            .transform("  hello  \n  world  ", "trim_whitespace")
            .unwrap();
        assert_eq!(result, "hello\nworld");
    }

    #[test]
    fn test_transform_remove_empty_lines() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer
            .transform("line1\n\nline2\n\n\nline3", "remove_empty_lines")
            .unwrap();
        assert_eq!(result, "line1\nline2\nline3");
    }

    #[test]
    fn test_transform_sort_lines() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer
            .transform("banana\napple\ncherry", "sort_lines")
            .unwrap();
        assert_eq!(result, "apple\nbanana\ncherry");
    }

    #[test]
    fn test_transform_unique_lines() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer
            .transform("apple\nbanana\napple\ncherry\nbanana", "unique_lines")
            .unwrap();
        assert!(result.contains("apple"));
        assert!(result.contains("banana"));
        assert!(result.contains("cherry"));
        assert_eq!(result.lines().count(), 3);
    }

    #[test]
    fn test_transform_extract_urls() {
        let analyzer = ClipboardContextAnalyzer::new();
        let content = "Visit https://example.com and http://test.org for more";
        let result = analyzer.transform(content, "extract_urls").unwrap();
        assert!(result.contains("https://example.com"));
        assert!(result.contains("http://test.org"));
    }

    #[test]
    fn test_transform_extract_emails() {
        let analyzer = ClipboardContextAnalyzer::new();
        let content = "Contact user@example.com or admin@test.org";
        let result = analyzer.transform(content, "extract_emails").unwrap();
        assert!(result.contains("user@example.com"));
        assert!(result.contains("admin@test.org"));
    }

    #[test]
    fn test_transform_escape_html() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer
            .transform("<div>Hello & World</div>", "escape_html")
            .unwrap();
        assert!(result.contains("&lt;"));
        assert!(result.contains("&gt;"));
        assert!(result.contains("&amp;"));
    }

    #[test]
    fn test_transform_unescape_html() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer
            .transform("&lt;div&gt;Hello &amp; World&lt;/div&gt;", "unescape_html")
            .unwrap();
        assert!(result.contains("<div>"));
        assert!(result.contains("</div>"));
        assert!(result.contains("&"));
    }

    // ============== Sensitive Data Detection Tests ==============

    #[test]
    fn test_sensitive_detection() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("password=secret123");
        assert!(result.is_sensitive);
    }

    #[test]
    fn test_sensitive_credit_card() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("Card: 4111-1111-1111-1111");
        assert!(result.is_sensitive);
    }

    #[test]
    fn test_sensitive_api_key() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("api_key=sk_live_abcd1234567890");
        assert!(result.is_sensitive);
    }

    #[test]
    fn test_sensitive_ssn() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("SSN: 123-45-6789");
        assert!(result.is_sensitive);
    }

    // ============== Content Statistics Tests ==============

    #[test]
    fn test_content_stats() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("Hello World\nThis is a test");
        assert_eq!(result.stats.line_count, 2);
        assert!(result.stats.word_count >= 5);
        assert!(result.stats.char_count > 0);
    }

    #[test]
    fn test_content_stats_unicode() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("Hello 你好 World");
        assert!(result.stats.has_unicode);
    }

    #[test]
    fn test_content_stats_emoji() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("Hello 👋 World 🌍");
        assert!(result.stats.has_emoji);
    }

    // ============== Suggested Actions Tests ==============

    #[test]
    fn test_suggested_actions_url() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("https://example.com");
        assert!(result
            .suggested_actions
            .iter()
            .any(|a| a.action_id == "open_url"));
    }

    #[test]
    fn test_suggested_actions_email() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("user@example.com");
        assert!(result
            .suggested_actions
            .iter()
            .any(|a| a.action_id == "compose_email"));
    }

    #[test]
    fn test_suggested_actions_json() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze(r#"{"key": "value"}"#);
        assert!(result
            .suggested_actions
            .iter()
            .any(|a| a.action_id == "format_json"));
    }

    #[test]
    fn test_suggested_actions_code() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("function test() { return 42; }");
        assert!(result
            .suggested_actions
            .iter()
            .any(|a| a.action_id == "format_code" || a.action_id == "explain_code"));
    }

    // ============== File Path Detection Tests ==============

    #[test]
    fn test_analyze_unix_path() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("/usr/local/bin/node");
        assert_eq!(result.category, ContentCategory::FilePath);
    }

    #[test]
    fn test_analyze_windows_path() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("C:\\Users\\Admin\\Documents\\file.txt");
        assert_eq!(result.category, ContentCategory::FilePath);
    }

    // ============== Other Category Tests ==============

    #[test]
    fn test_analyze_markdown() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("# Heading\n\n- Item 1\n- Item 2\n\n**Bold** and *italic*");
        assert_eq!(result.category, ContentCategory::Markdown);
    }

    #[test]
    fn test_analyze_command() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("$ npm install --save-dev typescript");
        assert_eq!(result.category, ContentCategory::Command);
    }

    #[test]
    fn test_analyze_plain_text() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result =
            analyzer.analyze("This is just some regular plain text without any special patterns.");
        assert!(
            result.category == ContentCategory::PlainText
                || result.category == ContentCategory::NaturalText
        );
    }

    // ============== Edge Cases ==============

    #[test]
    fn test_empty_content() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("");
        assert_eq!(result.category, ContentCategory::PlainText);
        assert_eq!(result.stats.char_count, 0);
    }

    #[test]
    fn test_whitespace_only() {
        let analyzer = ClipboardContextAnalyzer::new();
        let result = analyzer.analyze("   \n\t  \n  ");
        assert!(result.stats.has_whitespace_only_lines);
    }

    #[test]
    fn test_mixed_content() {
        let analyzer = ClipboardContextAnalyzer::new();
        let content = "Email me at user@example.com\nVisit https://example.com\nColor: #FF5733";
        let result = analyzer.analyze(content);
        assert!(result.entities.len() >= 3);
        assert!(!result.secondary_categories.is_empty() || !result.entities.is_empty());
    }
}
