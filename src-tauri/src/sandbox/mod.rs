//! Sandbox Module - Secure code execution environment
//!
//! This module provides a sandboxed environment for executing code in various
//! programming languages. It supports multiple runtimes:
//! - Docker containers (preferred for security)
//! - Podman containers (rootless alternative)
//! - Native process execution (fallback with limited isolation)

mod db;
mod docker;
mod languages;
mod native;
mod podman;
mod runtime;

pub use db::{
    CodeSnippet, ExecutionFilter, ExecutionRecord, ExecutionSession,
    LanguageStats, SandboxDb, SandboxStats, SnippetFilter,
};
pub use docker::DockerRuntime;
pub use languages::{Language, LANGUAGE_CONFIGS};
pub use native::NativeRuntime;
pub use podman::PodmanRuntime;
pub use runtime::{
    ExecutionRequest, ExecutionResult, RuntimeType, SandboxError,
    SandboxManager, SandboxRuntime,
};

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Maximum execution time in seconds (default)
pub const DEFAULT_TIMEOUT_SECS: u64 = 30;

/// Maximum memory limit in MB (default)
pub const DEFAULT_MEMORY_LIMIT_MB: u64 = 256;

/// Maximum CPU usage (percentage, 0-100)
pub const DEFAULT_CPU_LIMIT_PERCENT: u64 = 50;

/// Maximum output size in bytes
pub const DEFAULT_MAX_OUTPUT_SIZE: usize = 1024 * 1024; // 1MB

/// Sandbox configuration stored in app data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxConfig {
    /// Preferred runtime type
    pub preferred_runtime: RuntimeType,

    /// Enable Docker runtime
    pub enable_docker: bool,

    /// Enable Podman runtime
    pub enable_podman: bool,

    /// Enable native execution (less secure)
    pub enable_native: bool,

    /// Default timeout in seconds
    pub default_timeout_secs: u64,

    /// Default memory limit in MB
    pub default_memory_limit_mb: u64,

    /// Default CPU limit percentage
    pub default_cpu_limit_percent: u64,

    /// Maximum output size in bytes
    pub max_output_size: usize,

    /// Custom Docker images per language
    pub custom_images: HashMap<String, String>,

    /// Network access enabled
    pub network_enabled: bool,

    /// Workspace directory for code files
    pub workspace_dir: Option<PathBuf>,

    /// Enabled languages
    pub enabled_languages: Vec<String>,
}

impl Default for SandboxConfig {
    fn default() -> Self {
        Self {
            preferred_runtime: RuntimeType::Docker,
            enable_docker: true,
            enable_podman: true,
            enable_native: false, // Disabled by default for security
            default_timeout_secs: DEFAULT_TIMEOUT_SECS,
            default_memory_limit_mb: DEFAULT_MEMORY_LIMIT_MB,
            default_cpu_limit_percent: DEFAULT_CPU_LIMIT_PERCENT,
            max_output_size: DEFAULT_MAX_OUTPUT_SIZE,
            custom_images: HashMap::new(),
            network_enabled: false, // Disabled by default for security
            workspace_dir: None,
            enabled_languages: vec![
                "python".to_string(),
                "javascript".to_string(),
                "typescript".to_string(),
                "go".to_string(),
                "rust".to_string(),
                "java".to_string(),
                "c".to_string(),
                "cpp".to_string(),
                "ruby".to_string(),
                "php".to_string(),
                "bash".to_string(),
                "powershell".to_string(),
                "r".to_string(),
                "julia".to_string(),
                "lua".to_string(),
                "perl".to_string(),
                "swift".to_string(),
                "kotlin".to_string(),
                "scala".to_string(),
                "haskell".to_string(),
                "elixir".to_string(),
                "clojure".to_string(),
                "fsharp".to_string(),
                "csharp".to_string(),
                "zig".to_string(),
            ],
        }
    }
}

/// Sandbox state managed by Tauri
pub struct SandboxState {
    /// Configuration
    pub config: Arc<RwLock<SandboxConfig>>,

    /// Sandbox manager
    pub manager: Arc<RwLock<SandboxManager>>,

    /// Database for execution history and snippets
    pub db: Arc<SandboxDb>,

    /// Current active session ID
    pub current_session: Arc<RwLock<Option<String>>>,

    /// Config file path
    config_path: PathBuf,
}

impl SandboxState {
    /// Create new sandbox state
    pub async fn new(config_path: PathBuf) -> Result<Self, SandboxError> {
        // Load or create config
        let config = if config_path.exists() {
            let content = tokio::fs::read_to_string(&config_path)
                .await
                .map_err(|e| SandboxError::Config(format!("Failed to read config: {}", e)))?;
            serde_json::from_str(&content)
                .map_err(|e| SandboxError::Config(format!("Failed to parse config: {}", e)))?
        } else {
            SandboxConfig::default()
        };

        // Create manager
        let manager = SandboxManager::new(config.clone()).await?;

        // Initialize database
        let db_path = config_path
            .parent()
            .map(|p| p.join("sandbox.db"))
            .unwrap_or_else(|| PathBuf::from("sandbox.db"));
        let db = SandboxDb::new(db_path)
            .map_err(|e| SandboxError::Config(format!("Failed to initialize database: {}", e)))?;

        Ok(Self {
            config: Arc::new(RwLock::new(config)),
            manager: Arc::new(RwLock::new(manager)),
            db: Arc::new(db),
            current_session: Arc::new(RwLock::new(None)),
            config_path,
        })
    }

    /// Save configuration to disk
    pub async fn save_config(&self) -> Result<(), SandboxError> {
        let config = self.config.read().await;
        let content = serde_json::to_string_pretty(&*config)
            .map_err(|e| SandboxError::Config(format!("Failed to serialize config: {}", e)))?;

        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| SandboxError::Config(format!("Failed to create config dir: {}", e)))?;
        }

        tokio::fs::write(&self.config_path, content)
            .await
            .map_err(|e| SandboxError::Config(format!("Failed to write config: {}", e)))?;

        Ok(())
    }

    /// Update configuration
    pub async fn update_config(&self, new_config: SandboxConfig) -> Result<(), SandboxError> {
        {
            let mut config = self.config.write().await;
            *config = new_config.clone();
        }

        // Reinitialize manager with new config
        {
            let mut manager = self.manager.write().await;
            *manager = SandboxManager::new(new_config).await?;
        }

        self.save_config().await
    }

    /// Execute code
    pub async fn execute(&self, request: ExecutionRequest) -> Result<ExecutionResult, SandboxError> {
        self.execute_with_history(request, &[], true).await
    }

    /// Execute code with history tracking
    pub async fn execute_with_history(
        &self,
        request: ExecutionRequest,
        tags: &[String],
        save_to_history: bool,
    ) -> Result<ExecutionResult, SandboxError> {
        let manager = self.manager.read().await;
        let code = request.code.clone();
        let stdin = request.stdin.clone();
        let result = manager.execute(request).await?;

        // Save to history if enabled
        if save_to_history {
            let session_id = self.current_session.read().await.clone();
            if let Err(e) = self.db.save_execution(
                &result,
                &code,
                stdin.as_deref(),
                session_id.as_deref(),
                tags,
            ) {
                log::warn!("Failed to save execution to history: {}", e);
            }
        }

        Ok(result)
    }

    /// Get available runtimes
    pub async fn get_available_runtimes(&self) -> Vec<RuntimeType> {
        let manager = self.manager.read().await;
        manager.get_available_runtimes()
    }

    /// Get supported languages
    pub async fn get_supported_languages(&self) -> Vec<Language> {
        let config = self.config.read().await;
        LANGUAGE_CONFIGS
            .iter()
            .filter(|lang| config.enabled_languages.contains(&lang.id.to_string()))
            .map(|lang| Language {
                id: lang.id,
                name: lang.name,
                extension: lang.extension,
                category: lang.category,
            })
            .collect()
    }

    /// Check if a specific runtime is available
    pub async fn is_runtime_available(&self, runtime: RuntimeType) -> bool {
        let manager = self.manager.read().await;
        manager.is_runtime_available(runtime)
    }

    /// Get runtime information (type and version)
    pub async fn get_runtime_info(&self, runtime: RuntimeType) -> Option<(RuntimeType, String)> {
        let manager = self.manager.read().await;
        manager.get_runtime_info(runtime).await
    }

    /// Cleanup all runtimes
    pub async fn cleanup_all(&self) -> Result<(), SandboxError> {
        let manager = self.manager.read().await;
        manager.cleanup_all().await
    }

    /// Prepare image for a language
    pub async fn prepare_language(&self, language: &str) -> Result<(), SandboxError> {
        let manager = self.manager.read().await;
        manager.prepare_language(language).await
    }

    /// Execute code with specific timeout and memory limits
    pub async fn execute_with_limits(
        &self,
        language: String,
        code: String,
        timeout_secs: u64,
        memory_mb: u64,
    ) -> Result<ExecutionResult, SandboxError> {
        let request = ExecutionRequest::new(language, code)
            .with_timeout(timeout_secs)
            .with_memory_limit(memory_mb);
        self.execute_with_history(request, &[], true).await
    }

    // ==================== Session Management ====================

    /// Start a new session
    pub async fn start_session(
        &self,
        name: &str,
        description: Option<&str>,
    ) -> Result<ExecutionSession, SandboxError> {
        let session = self
            .db
            .create_session(name, description)
            .map_err(|e| SandboxError::Config(format!("Failed to create session: {}", e)))?;

        let mut current = self.current_session.write().await;
        *current = Some(session.id.clone());

        Ok(session)
    }

    /// Get current session
    pub async fn get_current_session(&self) -> Option<String> {
        self.current_session.read().await.clone()
    }

    /// Set current session
    pub async fn set_current_session(&self, session_id: Option<String>) {
        let mut current = self.current_session.write().await;
        *current = session_id;
    }

    /// End current session
    pub async fn end_session(&self) -> Result<(), SandboxError> {
        let session_id = {
            let mut current = self.current_session.write().await;
            current.take()
        };

        if let Some(id) = session_id {
            self.db
                .close_session(&id)
                .map_err(|e| SandboxError::Config(format!("Failed to close session: {}", e)))?;
        }

        Ok(())
    }

    /// List all sessions
    pub async fn list_sessions(
        &self,
        active_only: bool,
    ) -> Result<Vec<ExecutionSession>, SandboxError> {
        self.db
            .list_sessions(active_only)
            .map_err(|e| SandboxError::Config(format!("Failed to list sessions: {}", e)))
    }

    /// Get session by ID
    pub async fn get_session(&self, id: &str) -> Result<Option<ExecutionSession>, SandboxError> {
        self.db
            .get_session(id)
            .map_err(|e| SandboxError::Config(format!("Failed to get session: {}", e)))
    }

    /// Delete a session
    pub async fn delete_session(
        &self,
        id: &str,
        delete_executions: bool,
    ) -> Result<(), SandboxError> {
        // Clear current session if it matches
        {
            let mut current = self.current_session.write().await;
            if current.as_deref() == Some(id) {
                *current = None;
            }
        }

        self.db
            .delete_session(id, delete_executions)
            .map_err(|e| SandboxError::Config(format!("Failed to delete session: {}", e)))
    }

    // ==================== Execution History ====================

    /// Get execution by ID
    pub async fn get_execution(&self, id: &str) -> Result<Option<ExecutionRecord>, SandboxError> {
        self.db
            .get_execution(id)
            .map_err(|e| SandboxError::Config(format!("Failed to get execution: {}", e)))
    }

    /// Query executions with filter
    pub async fn query_executions(
        &self,
        filter: &ExecutionFilter,
    ) -> Result<Vec<ExecutionRecord>, SandboxError> {
        self.db
            .query_executions(filter)
            .map_err(|e| SandboxError::Config(format!("Failed to query executions: {}", e)))
    }

    /// Get recent executions
    pub async fn get_recent_executions(
        &self,
        limit: u32,
    ) -> Result<Vec<ExecutionRecord>, SandboxError> {
        self.query_executions(&ExecutionFilter {
            limit: Some(limit),
            ..Default::default()
        })
        .await
    }

    /// Delete an execution
    pub async fn delete_execution(&self, id: &str) -> Result<bool, SandboxError> {
        self.db
            .delete_execution(id)
            .map_err(|e| SandboxError::Config(format!("Failed to delete execution: {}", e)))
    }

    /// Toggle execution favorite status
    pub async fn toggle_execution_favorite(&self, id: &str) -> Result<bool, SandboxError> {
        self.db
            .toggle_execution_favorite(id)
            .map_err(|e| SandboxError::Config(format!("Failed to toggle favorite: {}", e)))
    }

    /// Add tags to an execution
    pub async fn add_execution_tags(&self, id: &str, tags: &[String]) -> Result<(), SandboxError> {
        self.db
            .add_execution_tags(id, tags)
            .map_err(|e| SandboxError::Config(format!("Failed to add tags: {}", e)))
    }

    /// Remove tags from an execution
    pub async fn remove_execution_tags(
        &self,
        id: &str,
        tags: &[String],
    ) -> Result<(), SandboxError> {
        self.db
            .remove_execution_tags(id, tags)
            .map_err(|e| SandboxError::Config(format!("Failed to remove tags: {}", e)))
    }

    /// Clear execution history
    pub async fn clear_execution_history(
        &self,
        before_date: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<u64, SandboxError> {
        self.db
            .clear_executions(before_date)
            .map_err(|e| SandboxError::Config(format!("Failed to clear history: {}", e)))
    }

    // ==================== Code Snippets ====================

    /// Create a new code snippet
    pub async fn create_snippet(&self, snippet: &CodeSnippet) -> Result<CodeSnippet, SandboxError> {
        self.db
            .create_snippet(snippet)
            .map_err(|e| SandboxError::Config(format!("Failed to create snippet: {}", e)))
    }

    /// Get snippet by ID
    pub async fn get_snippet(&self, id: &str) -> Result<Option<CodeSnippet>, SandboxError> {
        self.db
            .get_snippet(id)
            .map_err(|e| SandboxError::Config(format!("Failed to get snippet: {}", e)))
    }

    /// Query snippets with filter
    pub async fn query_snippets(
        &self,
        filter: &SnippetFilter,
    ) -> Result<Vec<CodeSnippet>, SandboxError> {
        self.db
            .query_snippets(filter)
            .map_err(|e| SandboxError::Config(format!("Failed to query snippets: {}", e)))
    }

    /// Update a snippet
    pub async fn update_snippet(&self, snippet: &CodeSnippet) -> Result<(), SandboxError> {
        self.db
            .update_snippet(snippet)
            .map_err(|e| SandboxError::Config(format!("Failed to update snippet: {}", e)))
    }

    /// Delete a snippet
    pub async fn delete_snippet(&self, id: &str) -> Result<bool, SandboxError> {
        self.db
            .delete_snippet(id)
            .map_err(|e| SandboxError::Config(format!("Failed to delete snippet: {}", e)))
    }

    /// Create snippet from execution
    pub async fn create_snippet_from_execution(
        &self,
        execution_id: &str,
        title: &str,
        description: Option<&str>,
        category: Option<&str>,
        is_template: bool,
    ) -> Result<CodeSnippet, SandboxError> {
        self.db
            .create_snippet_from_execution(execution_id, title, description, category, is_template)
            .map_err(|e| SandboxError::Config(format!("Failed to create snippet: {}", e)))
    }

    /// Execute a snippet
    pub async fn execute_snippet(&self, id: &str) -> Result<ExecutionResult, SandboxError> {
        let snippet = self
            .get_snippet(id)
            .await?
            .ok_or_else(|| SandboxError::Config(format!("Snippet {} not found", id)))?;

        // Increment usage count
        let _ = self.db.increment_snippet_usage(id);

        let request = ExecutionRequest::new(snippet.language, snippet.code);
        self.execute_with_history(request, &snippet.tags, true).await
    }

    // ==================== Statistics ====================

    /// Get language statistics
    pub async fn get_language_stats(
        &self,
        language: &str,
    ) -> Result<Option<LanguageStats>, SandboxError> {
        self.db
            .get_language_stats(language)
            .map_err(|e| SandboxError::Config(format!("Failed to get stats: {}", e)))
    }

    /// Get all language statistics
    pub async fn get_all_language_stats(&self) -> Result<Vec<LanguageStats>, SandboxError> {
        self.db
            .get_all_language_stats()
            .map_err(|e| SandboxError::Config(format!("Failed to get stats: {}", e)))
    }

    /// Get overall sandbox statistics
    pub async fn get_sandbox_stats(&self) -> Result<SandboxStats, SandboxError> {
        self.db
            .get_sandbox_stats()
            .map_err(|e| SandboxError::Config(format!("Failed to get stats: {}", e)))
    }

    /// Get daily execution counts
    pub async fn get_daily_execution_counts(
        &self,
        days: u32,
    ) -> Result<Vec<(String, u64)>, SandboxError> {
        self.db
            .get_daily_execution_counts(days)
            .map_err(|e| SandboxError::Config(format!("Failed to get counts: {}", e)))
    }

    // ==================== Utilities ====================

    /// Export all data to JSON
    pub async fn export_data(&self) -> Result<String, SandboxError> {
        self.db
            .export_to_json()
            .map_err(|e| SandboxError::Config(format!("Failed to export: {}", e)))
    }

    /// Get all unique tags
    pub async fn get_all_tags(&self) -> Result<Vec<String>, SandboxError> {
        self.db
            .get_all_tags()
            .map_err(|e| SandboxError::Config(format!("Failed to get tags: {}", e)))
    }

    /// Get all unique categories
    pub async fn get_all_categories(&self) -> Result<Vec<String>, SandboxError> {
        self.db
            .get_all_categories()
            .map_err(|e| SandboxError::Config(format!("Failed to get categories: {}", e)))
    }

    /// Get database size
    pub async fn get_db_size(&self) -> Result<u64, SandboxError> {
        self.db
            .get_db_size()
            .map_err(|e| SandboxError::Config(format!("Failed to get size: {}", e)))
    }

    /// Vacuum database
    pub async fn vacuum_db(&self) -> Result<(), SandboxError> {
        self.db
            .vacuum()
            .map_err(|e| SandboxError::Config(format!("Failed to vacuum: {}", e)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use runtime::ExecutionStatus;

    #[test]
    fn test_default_config() {
        let config = SandboxConfig::default();
        assert!(config.enable_docker);
        assert!(config.enable_podman);
        assert!(!config.enable_native);
        assert!(!config.network_enabled);
        assert_eq!(config.default_timeout_secs, DEFAULT_TIMEOUT_SECS);
    }

    #[test]
    fn test_config_serialization() {
        let config = SandboxConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let parsed: SandboxConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config.default_timeout_secs, parsed.default_timeout_secs);
        assert_eq!(config.default_memory_limit_mb, parsed.default_memory_limit_mb);
    }

    #[test]
    fn test_runtime_type_display() {
        assert_eq!(RuntimeType::Docker.to_string(), "docker");
        assert_eq!(RuntimeType::Podman.to_string(), "podman");
        assert_eq!(RuntimeType::Native.to_string(), "native");
    }

    #[test]
    fn test_execution_request_new() {
        let request = ExecutionRequest::new("python", "print('hello')");
        assert_eq!(request.language, "python");
        assert_eq!(request.code, "print('hello')");
        assert!(request.stdin.is_none());
        assert!(request.args.is_empty());
        assert!(request.env.is_empty());
    }

    #[test]
    fn test_execution_request_with_stdin() {
        let request = ExecutionRequest::new("python", "x = input()")
            .with_stdin("test input");
        assert_eq!(request.stdin, Some("test input".to_string()));
    }

    #[test]
    fn test_execution_request_with_timeout() {
        let request = ExecutionRequest::new("python", "import time; time.sleep(1)")
            .with_timeout(60);
        assert_eq!(request.timeout_secs, Some(60));
    }

    #[test]
    fn test_execution_request_with_memory_limit() {
        let request = ExecutionRequest::new("python", "x = [0] * 1000000")
            .with_memory_limit(512);
        assert_eq!(request.memory_limit_mb, Some(512));
    }

    #[test]
    fn test_execution_request_chaining() {
        let request = ExecutionRequest::new("python", "print('hello')")
            .with_stdin("input")
            .with_timeout(30)
            .with_memory_limit(256);
        
        assert_eq!(request.language, "python");
        assert_eq!(request.stdin, Some("input".to_string()));
        assert_eq!(request.timeout_secs, Some(30));
        assert_eq!(request.memory_limit_mb, Some(256));
    }

    #[test]
    fn test_execution_result_success() {
        let result = ExecutionResult::success(
            "test-id".to_string(),
            "Hello, World!".to_string(),
            String::new(),
            0,
            100,
            RuntimeType::Docker,
            "python".to_string(),
        );
        
        assert_eq!(result.id, "test-id");
        assert!(matches!(result.status, ExecutionStatus::Completed));
        assert_eq!(result.stdout, "Hello, World!");
        assert_eq!(result.exit_code, Some(0));
        assert_eq!(result.execution_time_ms, 100);
    }

    #[test]
    fn test_execution_result_error() {
        let result = ExecutionResult::error(
            "test-id".to_string(),
            "Compilation failed".to_string(),
            RuntimeType::Docker,
            "rust".to_string(),
        );
        
        assert!(matches!(result.status, ExecutionStatus::Failed));
        assert_eq!(result.error, Some("Compilation failed".to_string()));
        assert!(result.exit_code.is_none());
    }

    #[test]
    fn test_execution_result_timeout() {
        let result = ExecutionResult::timeout(
            "test-id".to_string(),
            "partial output".to_string(),
            String::new(),
            30,
            RuntimeType::Docker,
            "python".to_string(),
        );
        
        assert!(matches!(result.status, ExecutionStatus::Timeout));
        assert!(result.error.is_some());
        assert!(result.error.unwrap().contains("timeout"));
    }

    #[test]
    fn test_enabled_languages_default() {
        let config = SandboxConfig::default();
        assert!(config.enabled_languages.contains(&"python".to_string()));
        assert!(config.enabled_languages.contains(&"javascript".to_string()));
        assert!(config.enabled_languages.contains(&"rust".to_string()));
        assert!(config.enabled_languages.contains(&"go".to_string()));
    }

    #[test]
    fn test_sandbox_error_display() {
        let err = SandboxError::LanguageNotSupported("unknown".to_string());
        assert!(err.to_string().contains("unknown"));
        
        let err = SandboxError::Timeout(30);
        assert!(err.to_string().contains("30"));
        
        let err = SandboxError::RuntimeNotAvailable("docker".to_string());
        assert!(err.to_string().contains("docker"));
    }
}
