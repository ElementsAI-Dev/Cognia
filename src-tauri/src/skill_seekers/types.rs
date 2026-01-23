//! Skill Seekers Type Definitions
//!
//! Data structures for the Skill Seekers integration - a tool for generating
//! AI skills from documentation, GitHub repositories, and PDFs.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ========== Source Types ==========

/// Source type for skill generation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SourceType {
    /// Documentation website
    Website,
    /// GitHub repository
    GitHub,
    /// PDF document
    Pdf,
    /// Unified (multiple sources)
    Unified,
}

impl Default for SourceType {
    fn default() -> Self {
        Self::Website
    }
}

// ========== Scrape Configuration ==========

/// URL pattern configuration for scraping
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UrlPatterns {
    /// URL patterns to include
    #[serde(default)]
    pub include: Vec<String>,
    /// URL patterns to exclude
    #[serde(default)]
    pub exclude: Vec<String>,
}

/// CSS selectors for content extraction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentSelectors {
    /// Main content selector
    #[serde(default = "default_main_content")]
    pub main_content: String,
    /// Title selector
    #[serde(default = "default_title")]
    pub title: String,
    /// Code block selector
    #[serde(default = "default_code_blocks")]
    pub code_blocks: String,
    /// Navigation selector (to exclude)
    #[serde(default)]
    pub navigation: Option<String>,
    /// Sidebar selector (to exclude)
    #[serde(default)]
    pub sidebar: Option<String>,
}

fn default_main_content() -> String {
    "article, main, .content, .documentation".to_string()
}

fn default_title() -> String {
    "h1".to_string()
}

fn default_code_blocks() -> String {
    "pre code".to_string()
}

impl Default for ContentSelectors {
    fn default() -> Self {
        Self {
            main_content: default_main_content(),
            title: default_title(),
            code_blocks: default_code_blocks(),
            navigation: None,
            sidebar: None,
        }
    }
}

/// Category keywords for auto-categorization
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CategoryKeywords {
    /// Getting started keywords
    #[serde(default)]
    pub getting_started: Vec<String>,
    /// API reference keywords
    #[serde(default)]
    pub api: Vec<String>,
    /// Guides keywords
    #[serde(default)]
    pub guides: Vec<String>,
    /// Examples keywords
    #[serde(default)]
    pub examples: Vec<String>,
    /// Configuration keywords
    #[serde(default)]
    pub configuration: Vec<String>,
}

/// Website scrape configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebsiteScrapeConfig {
    /// Skill name
    pub name: String,
    /// Base URL to scrape
    pub base_url: String,
    /// Skill description
    #[serde(default)]
    pub description: String,
    /// Starting URLs (if different from base_url)
    #[serde(default)]
    pub start_urls: Vec<String>,
    /// CSS selectors for content extraction
    #[serde(default)]
    pub selectors: ContentSelectors,
    /// URL patterns to include/exclude
    #[serde(default)]
    pub url_patterns: UrlPatterns,
    /// Category keywords
    #[serde(default)]
    pub categories: CategoryKeywords,
    /// Rate limit (seconds between requests)
    #[serde(default = "default_rate_limit")]
    pub rate_limit: f64,
    /// Maximum pages to scrape
    #[serde(default = "default_max_pages")]
    pub max_pages: u32,
    /// Enable async mode
    #[serde(default)]
    pub async_mode: bool,
    /// Number of parallel workers
    #[serde(default = "default_workers")]
    pub workers: u32,
}

fn default_rate_limit() -> f64 {
    0.5
}

fn default_max_pages() -> u32 {
    300
}

fn default_workers() -> u32 {
    4
}

impl Default for WebsiteScrapeConfig {
    fn default() -> Self {
        Self {
            name: String::new(),
            base_url: String::new(),
            description: String::new(),
            start_urls: Vec::new(),
            selectors: ContentSelectors::default(),
            url_patterns: UrlPatterns::default(),
            categories: CategoryKeywords::default(),
            rate_limit: default_rate_limit(),
            max_pages: default_max_pages(),
            async_mode: false,
            workers: default_workers(),
        }
    }
}

// ========== GitHub Configuration ==========

/// Code analysis depth for GitHub scraping
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CodeAnalysisDepth {
    /// Fast analysis - file structure, imports, entry points
    Surface,
    /// Standard analysis - adds function/class signatures
    Medium,
    /// Deep analysis - includes design patterns, test examples
    Deep,
}

impl Default for CodeAnalysisDepth {
    fn default() -> Self {
        Self::Medium
    }
}

/// GitHub repository scrape configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubScrapeConfig {
    /// Repository in owner/repo format
    pub repo: String,
    /// Skill name (defaults to repo name)
    #[serde(default)]
    pub name: Option<String>,
    /// Include GitHub issues
    #[serde(default)]
    pub include_issues: bool,
    /// Maximum issues to fetch
    #[serde(default = "default_max_issues")]
    pub max_issues: u32,
    /// Include CHANGELOG.md
    #[serde(default)]
    pub include_changelog: bool,
    /// Include GitHub releases
    #[serde(default)]
    pub include_releases: bool,
    /// Code analysis depth
    #[serde(default)]
    pub code_analysis_depth: CodeAnalysisDepth,
    /// Directories to exclude
    #[serde(default)]
    pub exclude_dirs: Vec<String>,
}

fn default_max_issues() -> u32 {
    50
}

impl Default for GitHubScrapeConfig {
    fn default() -> Self {
        Self {
            repo: String::new(),
            name: None,
            include_issues: false,
            max_issues: default_max_issues(),
            include_changelog: false,
            include_releases: false,
            code_analysis_depth: CodeAnalysisDepth::default(),
            exclude_dirs: vec![
                "node_modules".to_string(),
                ".git".to_string(),
                "__pycache__".to_string(),
                ".venv".to_string(),
                "dist".to_string(),
                "build".to_string(),
            ],
        }
    }
}

// ========== PDF Configuration ==========

/// PDF extraction configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdfScrapeConfig {
    /// Path to PDF file
    pub pdf_path: String,
    /// Skill name
    pub name: String,
    /// Enable OCR for scanned PDFs
    #[serde(default)]
    pub enable_ocr: bool,
    /// Extract tables
    #[serde(default = "default_true")]
    pub extract_tables: bool,
    /// Extract images
    #[serde(default)]
    pub extract_images: bool,
}

fn default_true() -> bool {
    true
}

impl Default for PdfScrapeConfig {
    fn default() -> Self {
        Self {
            pdf_path: String::new(),
            name: String::new(),
            enable_ocr: false,
            extract_tables: true,
            extract_images: false,
        }
    }
}

// ========== Enhancement Configuration ==========

/// AI provider for enhancement
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EnhanceProvider {
    /// Anthropic Claude
    Anthropic,
    /// Google Gemini
    Google,
    /// OpenAI GPT
    OpenAI,
}

impl Default for EnhanceProvider {
    fn default() -> Self {
        Self::Anthropic
    }
}

/// Enhancement mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EnhanceMode {
    /// Local mode using Claude Code (free)
    Local,
    /// API mode using provider API
    Api,
}

impl Default for EnhanceMode {
    fn default() -> Self {
        Self::Local
    }
}

/// Enhancement quality level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EnhanceQuality {
    /// Fast enhancement (15-30 sec)
    Minimal,
    /// Standard enhancement (30-60 sec)
    Standard,
    /// Comprehensive enhancement (1-2 min)
    Comprehensive,
}

impl Default for EnhanceQuality {
    fn default() -> Self {
        Self::Standard
    }
}

/// Skill enhancement configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhanceConfig {
    /// Enhancement mode
    #[serde(default)]
    pub mode: EnhanceMode,
    /// AI provider (for API mode)
    #[serde(default)]
    pub provider: EnhanceProvider,
    /// API key (optional, can use from settings)
    #[serde(default)]
    pub api_key: Option<String>,
    /// Quality level
    #[serde(default)]
    pub quality: EnhanceQuality,
}

impl Default for EnhanceConfig {
    fn default() -> Self {
        Self {
            mode: EnhanceMode::default(),
            provider: EnhanceProvider::default(),
            api_key: None,
            quality: EnhanceQuality::default(),
        }
    }
}

// ========== Package Configuration ==========

/// Target platform for packaging
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PackageTarget {
    /// Claude AI (default)
    Claude,
    /// Google Gemini
    Gemini,
    /// OpenAI ChatGPT
    OpenAI,
    /// Generic Markdown
    Markdown,
}

impl Default for PackageTarget {
    fn default() -> Self {
        Self::Claude
    }
}

/// Skill packaging configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageConfig {
    /// Target platform
    #[serde(default)]
    pub target: PackageTarget,
    /// Custom output filename
    #[serde(default)]
    pub output_filename: Option<String>,
}

impl Default for PackageConfig {
    fn default() -> Self {
        Self {
            target: PackageTarget::default(),
            output_filename: None,
        }
    }
}

// ========== Job Management ==========

/// Job status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    /// Job is queued
    Queued,
    /// Job is running
    Running,
    /// Job completed successfully
    Completed,
    /// Job failed
    Failed,
    /// Job was cancelled
    Cancelled,
    /// Job is paused (can be resumed)
    Paused,
}

impl Default for JobStatus {
    fn default() -> Self {
        Self::Queued
    }
}

/// Job phase
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum JobPhase {
    /// Initializing
    Init,
    /// Scraping content
    Scraping,
    /// Building skill
    Building,
    /// Enhancing with AI
    Enhancing,
    /// Packaging for platform
    Packaging,
    /// Installing to library
    Installing,
    /// Completed
    Done,
}

impl Default for JobPhase {
    fn default() -> Self {
        Self::Init
    }
}

/// Job progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobProgress {
    /// Current phase
    pub phase: JobPhase,
    /// Progress percentage (0-100)
    pub percent: u8,
    /// Current status message
    pub message: String,
    /// Pages scraped (for scraping phase)
    #[serde(default)]
    pub pages_scraped: u32,
    /// Total pages estimated
    #[serde(default)]
    pub pages_total: Option<u32>,
    /// Current file being processed
    #[serde(default)]
    pub current_file: Option<String>,
}

impl Default for JobProgress {
    fn default() -> Self {
        Self {
            phase: JobPhase::default(),
            percent: 0,
            message: String::new(),
            pages_scraped: 0,
            pages_total: None,
            current_file: None,
        }
    }
}

/// Skill generation job
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillGenerationJob {
    /// Unique job ID
    pub id: String,
    /// Source type
    pub source_type: SourceType,
    /// Skill name
    pub name: String,
    /// Job status
    pub status: JobStatus,
    /// Progress information
    pub progress: JobProgress,
    /// Created timestamp
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    /// Started timestamp
    #[serde(rename = "startedAt")]
    pub started_at: Option<DateTime<Utc>>,
    /// Completed timestamp
    #[serde(rename = "completedAt")]
    pub completed_at: Option<DateTime<Utc>>,
    /// Error message (if failed)
    pub error: Option<String>,
    /// Output directory
    #[serde(rename = "outputDir")]
    pub output_dir: Option<String>,
    /// Generated skill path
    #[serde(rename = "skillPath")]
    pub skill_path: Option<String>,
    /// Checkpoint ID for resume
    #[serde(rename = "checkpointId")]
    pub checkpoint_id: Option<String>,
    /// Can be resumed
    pub resumable: bool,
}

impl SkillGenerationJob {
    /// Create a new job
    pub fn new(id: String, source_type: SourceType, name: String) -> Self {
        Self {
            id,
            source_type,
            name,
            status: JobStatus::Queued,
            progress: JobProgress::default(),
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
            error: None,
            output_dir: None,
            skill_path: None,
            checkpoint_id: None,
            resumable: false,
        }
    }

    /// Mark job as started
    pub fn start(&mut self) {
        self.status = JobStatus::Running;
        self.started_at = Some(Utc::now());
    }

    /// Mark job as completed
    pub fn complete(&mut self, skill_path: String) {
        self.status = JobStatus::Completed;
        self.completed_at = Some(Utc::now());
        self.skill_path = Some(skill_path);
        self.progress.phase = JobPhase::Done;
        self.progress.percent = 100;
    }

    /// Mark job as failed
    pub fn fail(&mut self, error: String) {
        self.status = JobStatus::Failed;
        self.completed_at = Some(Utc::now());
        self.error = Some(error);
    }

    /// Mark job as cancelled
    pub fn cancel(&mut self) {
        self.status = JobStatus::Cancelled;
        self.completed_at = Some(Utc::now());
    }

    /// Update progress
    pub fn update_progress(&mut self, progress: JobProgress) {
        self.progress = progress;
    }
}

// ========== Preset Configuration ==========

/// Preset configuration metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetConfig {
    /// Config name (e.g., "react", "vue")
    pub name: String,
    /// Display name
    #[serde(rename = "displayName")]
    pub display_name: String,
    /// Description
    pub description: String,
    /// Category (e.g., "web-frameworks", "game-engines")
    pub category: String,
    /// Config file path
    #[serde(rename = "configPath")]
    pub config_path: String,
    /// Icon (emoji or icon name)
    #[serde(default)]
    pub icon: Option<String>,
    /// Estimated page count
    #[serde(rename = "estimatedPages", default)]
    pub estimated_pages: Option<u32>,
}

// ========== Generated Skill ==========

/// Generated skill metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedSkill {
    /// Unique identifier
    pub id: String,
    /// Skill name
    pub name: String,
    /// Description
    pub description: String,
    /// Source type
    #[serde(rename = "sourceType")]
    pub source_type: SourceType,
    /// Source URL or path
    pub source: String,
    /// Output directory
    #[serde(rename = "outputDir")]
    pub output_dir: String,
    /// SKILL.md path
    #[serde(rename = "skillMdPath")]
    pub skill_md_path: String,
    /// Package path (if packaged)
    #[serde(rename = "packagePath")]
    pub package_path: Option<String>,
    /// Created timestamp
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    /// Last enhanced timestamp
    #[serde(rename = "enhancedAt")]
    pub enhanced_at: Option<DateTime<Utc>>,
    /// Installed to skill library
    pub installed: bool,
    /// Installed skill ID (if installed)
    #[serde(rename = "installedSkillId")]
    pub installed_skill_id: Option<String>,
    /// File size in bytes
    #[serde(rename = "fileSize")]
    pub file_size: u64,
    /// Page count (for website/pdf sources)
    #[serde(rename = "pageCount")]
    pub page_count: Option<u32>,
}

// ========== Service Configuration ==========

/// Skill Seekers service configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillSeekersServiceConfig {
    /// Output directory for generated skills
    #[serde(rename = "outputDir")]
    pub output_dir: String,
    /// Virtual environment path
    #[serde(rename = "venvPath")]
    pub venv_path: String,
    /// Default enhancement provider
    #[serde(rename = "defaultProvider", default)]
    pub default_provider: EnhanceProvider,
    /// GitHub token for API access
    #[serde(rename = "githubToken")]
    pub github_token: Option<String>,
    /// Auto-enhance after scraping
    #[serde(rename = "autoEnhance", default)]
    pub auto_enhance: bool,
    /// Auto-install after generation
    #[serde(rename = "autoInstall", default)]
    pub auto_install: bool,
    /// Checkpoint interval (seconds)
    #[serde(rename = "checkpointInterval", default = "default_checkpoint_interval")]
    pub checkpoint_interval: u64,
}

fn default_checkpoint_interval() -> u64 {
    60
}

impl Default for SkillSeekersServiceConfig {
    fn default() -> Self {
        Self {
            output_dir: String::new(),
            venv_path: String::new(),
            default_provider: EnhanceProvider::default(),
            github_token: None,
            auto_enhance: false,
            auto_install: false,
            checkpoint_interval: default_checkpoint_interval(),
        }
    }
}

// ========== Persistent Store ==========

/// Skill Seekers persistent store
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SkillSeekersStore {
    /// Service configuration
    pub config: SkillSeekersServiceConfig,
    /// Job history
    pub jobs: HashMap<String, SkillGenerationJob>,
    /// Generated skills
    pub skills: HashMap<String, GeneratedSkill>,
    /// Installed flag
    pub installed: bool,
    /// Package version
    pub version: Option<String>,
}

// ========== Event Types ==========

/// Progress event payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    /// Job ID
    #[serde(rename = "jobId")]
    pub job_id: String,
    /// Progress information
    pub progress: JobProgress,
}

/// Job completed event payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobCompletedEvent {
    /// Job ID
    #[serde(rename = "jobId")]
    pub job_id: String,
    /// Success status
    pub success: bool,
    /// Skill path (if successful)
    #[serde(rename = "skillPath")]
    pub skill_path: Option<String>,
    /// Error message (if failed)
    pub error: Option<String>,
}

/// Log event payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEvent {
    /// Job ID
    #[serde(rename = "jobId")]
    pub job_id: String,
    /// Log level
    pub level: String,
    /// Log message
    pub message: String,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
}

// ========== API Request/Response Types ==========

/// Input for website scraping
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapeWebsiteInput {
    /// Scrape configuration
    pub config: WebsiteScrapeConfig,
    /// Use preset config name instead
    #[serde(rename = "presetConfig")]
    pub preset_config: Option<String>,
    /// Enhancement config (optional)
    pub enhance: Option<EnhanceConfig>,
    /// Package config (optional)
    pub package: Option<PackageConfig>,
    /// Auto-install to library
    #[serde(rename = "autoInstall", default)]
    pub auto_install: bool,
}

/// Input for GitHub scraping
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapeGitHubInput {
    /// GitHub config
    pub config: GitHubScrapeConfig,
    /// Enhancement config (optional)
    pub enhance: Option<EnhanceConfig>,
    /// Package config (optional)
    pub package: Option<PackageConfig>,
    /// Auto-install to library
    #[serde(rename = "autoInstall", default)]
    pub auto_install: bool,
}

/// Input for PDF extraction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapePdfInput {
    /// PDF config
    pub config: PdfScrapeConfig,
    /// Enhancement config (optional)
    pub enhance: Option<EnhanceConfig>,
    /// Package config (optional)
    pub package: Option<PackageConfig>,
    /// Auto-install to library
    #[serde(rename = "autoInstall", default)]
    pub auto_install: bool,
}

/// Input for enhancing an existing skill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhanceSkillInput {
    /// Skill directory path
    #[serde(rename = "skillDir")]
    pub skill_dir: String,
    /// Enhancement config
    pub config: EnhanceConfig,
}

/// Input for packaging a skill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageSkillInput {
    /// Skill directory path
    #[serde(rename = "skillDir")]
    pub skill_dir: String,
    /// Package config
    pub config: PackageConfig,
}

/// Page estimation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageEstimation {
    /// Estimated page count
    #[serde(rename = "estimatedPages")]
    pub estimated_pages: u32,
    /// Estimated time (minutes)
    #[serde(rename = "estimatedMinutes")]
    pub estimated_minutes: u32,
    /// Has llms.txt (faster scraping)
    #[serde(rename = "hasLlmsTxt")]
    pub has_llms_txt: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_source_type_serialization() {
        let source = SourceType::GitHub;
        let json = serde_json::to_string(&source).unwrap();
        assert_eq!(json, "\"github\"");

        let parsed: SourceType = serde_json::from_str("\"website\"").unwrap();
        assert_eq!(parsed, SourceType::Website);
    }

    #[test]
    fn test_job_status_serialization() {
        let status = JobStatus::Running;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"running\"");
    }

    #[test]
    fn test_website_scrape_config_default() {
        let config = WebsiteScrapeConfig::default();
        assert_eq!(config.rate_limit, 0.5);
        assert_eq!(config.max_pages, 300);
        assert_eq!(config.workers, 4);
        assert!(!config.async_mode);
    }

    #[test]
    fn test_github_scrape_config_default() {
        let config = GitHubScrapeConfig::default();
        assert_eq!(config.max_issues, 50);
        assert!(!config.include_issues);
        assert_eq!(config.code_analysis_depth, CodeAnalysisDepth::Medium);
        assert!(!config.exclude_dirs.is_empty());
    }

    #[test]
    fn test_enhance_config_default() {
        let config = EnhanceConfig::default();
        assert_eq!(config.mode, EnhanceMode::Local);
        assert_eq!(config.provider, EnhanceProvider::Anthropic);
        assert_eq!(config.quality, EnhanceQuality::Standard);
    }

    #[test]
    fn test_package_target_serialization() {
        let target = PackageTarget::Claude;
        let json = serde_json::to_string(&target).unwrap();
        assert_eq!(json, "\"claude\"");

        let parsed: PackageTarget = serde_json::from_str("\"gemini\"").unwrap();
        assert_eq!(parsed, PackageTarget::Gemini);
    }

    #[test]
    fn test_job_lifecycle() {
        let mut job = SkillGenerationJob::new(
            "test-job".to_string(),
            SourceType::Website,
            "test-skill".to_string(),
        );

        assert_eq!(job.status, JobStatus::Queued);
        assert!(job.started_at.is_none());

        job.start();
        assert_eq!(job.status, JobStatus::Running);
        assert!(job.started_at.is_some());

        job.complete("/path/to/skill".to_string());
        assert_eq!(job.status, JobStatus::Completed);
        assert!(job.completed_at.is_some());
        assert_eq!(job.skill_path, Some("/path/to/skill".to_string()));
    }

    #[test]
    fn test_job_failure() {
        let mut job = SkillGenerationJob::new(
            "test-job".to_string(),
            SourceType::GitHub,
            "test-skill".to_string(),
        );

        job.start();
        job.fail("Network error".to_string());

        assert_eq!(job.status, JobStatus::Failed);
        assert_eq!(job.error, Some("Network error".to_string()));
    }

    #[test]
    fn test_preset_config_serialization() {
        let preset = PresetConfig {
            name: "react".to_string(),
            display_name: "React".to_string(),
            description: "React documentation".to_string(),
            category: "web-frameworks".to_string(),
            config_path: "configs/react.json".to_string(),
            icon: Some("⚛️".to_string()),
            estimated_pages: Some(200),
        };

        let json = serde_json::to_string(&preset).unwrap();
        assert!(json.contains("\"displayName\":\"React\""));
        assert!(json.contains("\"configPath\":\"configs/react.json\""));
    }

    #[test]
    fn test_content_selectors_default() {
        let selectors = ContentSelectors::default();
        assert!(selectors.main_content.contains("article"));
        assert_eq!(selectors.title, "h1");
        assert_eq!(selectors.code_blocks, "pre code");
    }

    #[test]
    fn test_skill_seekers_store_default() {
        let store = SkillSeekersStore::default();
        assert!(!store.installed);
        assert!(store.jobs.is_empty());
        assert!(store.skills.is_empty());
    }

    #[test]
    fn test_progress_event_serialization() {
        let event = ProgressEvent {
            job_id: "job-123".to_string(),
            progress: JobProgress {
                phase: JobPhase::Scraping,
                percent: 50,
                message: "Scraping page 50/100".to_string(),
                pages_scraped: 50,
                pages_total: Some(100),
                current_file: None,
            },
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"jobId\":\"job-123\""));
        assert!(json.contains("\"phase\":\"scraping\""));
    }
}
