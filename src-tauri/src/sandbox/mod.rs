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
mod workspace;

pub use db::{
    CodeSnippet, ExecutionFilter, ExecutionRecord, ExecutionSession, LanguageStats, SandboxDb,
    SandboxStats, SnippetFilter,
};
pub use docker::DockerRuntime;
pub use languages::{Language, LANGUAGE_CONFIGS};
pub use native::NativeRuntime;
pub use podman::PodmanRuntime;
pub use runtime::{
    ExecutionRequest, ExecutionResult, RuntimeType, SandboxError, SandboxManager, SandboxRuntime,
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
        log::info!(
            "Initializing SandboxState with config path: {:?}",
            config_path
        );

        Self::migrate_legacy_config_if_needed(&config_path).await?;

        // Load or create config
        let config = if config_path.exists() {
            log::debug!("Loading existing sandbox config from {:?}", config_path);
            let content = tokio::fs::read_to_string(&config_path).await.map_err(|e| {
                log::error!("Failed to read sandbox config file: {}", e);
                SandboxError::Config(format!("Failed to read config: {}", e))
            })?;
            serde_json::from_str(&content).map_err(|e| {
                log::error!("Failed to parse sandbox config JSON: {}", e);
                SandboxError::Config(format!("Failed to parse config: {}", e))
            })?
        } else {
            log::info!("No existing config found, using default sandbox configuration");
            SandboxConfig::default()
        };

        log::debug!("Sandbox config loaded: preferred_runtime={:?}, docker={}, podman={}, native={}, timeout={}s, memory={}MB",
            config.preferred_runtime, config.enable_docker, config.enable_podman,
            config.enable_native, config.default_timeout_secs, config.default_memory_limit_mb);

        // Create manager
        log::debug!("Creating SandboxManager...");
        let manager = SandboxManager::new(config.clone()).await?;

        // Initialize database
        let db_path = config_path
            .parent()
            .map(|p| p.join("sandbox.db"))
            .unwrap_or_else(|| PathBuf::from("sandbox.db"));
        log::debug!("Initializing sandbox database at {:?}", db_path);
        let db = SandboxDb::new(db_path.clone()).map_err(|e| {
            log::error!(
                "Failed to initialize sandbox database at {:?}: {}",
                db_path,
                e
            );
            SandboxError::Config(format!("Failed to initialize database: {}", e))
        })?;
        log::info!("Sandbox database initialized successfully");

        log::info!("SandboxState initialization complete");
        Ok(Self {
            config: Arc::new(RwLock::new(config)),
            manager: Arc::new(RwLock::new(manager)),
            db: Arc::new(db),
            current_session: Arc::new(RwLock::new(None)),
            config_path,
        })
    }

    async fn persist_config_snapshot(config_path: &std::path::Path, config: &SandboxConfig) -> Result<(), SandboxError> {
        let content = serde_json::to_string_pretty(config).map_err(|e| {
            log::error!("Failed to serialize sandbox config: {}", e);
            SandboxError::Config(format!("Failed to serialize config: {}", e))
        })?;

        // Ensure parent directory exists
        if let Some(parent) = config_path.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| {
                log::error!("Failed to create config directory {:?}: {}", parent, e);
                SandboxError::Config(format!("Failed to create config dir: {}", e))
            })?;
        }

        tokio::fs::write(config_path, &content)
            .await
            .map_err(|e| {
                log::error!(
                    "Failed to write sandbox config to {:?}: {}",
                    config_path,
                    e
                );
                SandboxError::Config(format!("Failed to write config: {}", e))
            })?;

        Ok(())
    }

    async fn migrate_legacy_config_if_needed(config_path: &std::path::Path) -> Result<(), SandboxError> {
        if config_path.exists() {
            return Ok(());
        }

        let Some(parent) = config_path.parent() else {
            return Ok(());
        };

        let legacy_path = parent.join("sandbox-config.json");
        if !legacy_path.exists() {
            return Ok(());
        }

        log::info!(
            "Migrating legacy sandbox config from {:?} to {:?}",
            legacy_path,
            config_path
        );

        if let Some(parent) = config_path.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| {
                SandboxError::Config(format!("Failed to create sandbox config directory: {}", e))
            })?;
        }

        match tokio::fs::rename(&legacy_path, config_path).await {
            Ok(_) => Ok(()),
            Err(rename_error) => {
                log::warn!(
                    "Rename legacy sandbox config failed ({}), falling back to copy+remove",
                    rename_error
                );
                let content = tokio::fs::read(&legacy_path).await.map_err(|e| {
                    SandboxError::Config(format!("Failed to read legacy sandbox config: {}", e))
                })?;
                tokio::fs::write(config_path, content).await.map_err(|e| {
                    SandboxError::Config(format!("Failed to write migrated sandbox config: {}", e))
                })?;
                tokio::fs::remove_file(&legacy_path).await.map_err(|e| {
                    SandboxError::Config(format!("Failed to remove legacy sandbox config: {}", e))
                })?;
                Ok(())
            }
        }
    }

    /// Save configuration to disk
    pub async fn save_config(&self) -> Result<(), SandboxError> {
        log::debug!("Saving sandbox configuration to {:?}", self.config_path);
        let config = self.config.read().await;
        Self::persist_config_snapshot(&self.config_path, &config).await?;

        log::info!("Sandbox configuration saved successfully");
        Ok(())
    }

    /// Apply configuration: validate by creating a new manager, then atomically swap and persist.
    pub async fn apply_config(&self, new_config: SandboxConfig) -> Result<(), SandboxError> {
        log::info!("Applying sandbox configuration");
        log::debug!(
            "Config apply request: preferred_runtime={:?}, docker={}, podman={}, native={}, timeout={}s, memory={}MB, network={}",
            new_config.preferred_runtime,
            new_config.enable_docker,
            new_config.enable_podman,
            new_config.enable_native,
            new_config.default_timeout_secs,
            new_config.default_memory_limit_mb,
            new_config.network_enabled
        );

        // Validate and warm runtime availability with the new configuration before swapping state.
        let new_manager = SandboxManager::new(new_config.clone()).await?;

        // Persist first so in-memory/runtime state never diverges from disk after a successful call.
        Self::persist_config_snapshot(&self.config_path, &new_config).await?;

        {
            let mut manager = self.manager.write().await;
            *manager = new_manager;
        }
        {
            let mut config = self.config.write().await;
            *config = new_config;
        }

        log::info!("Sandbox configuration applied successfully");
        Ok(())
    }

    /// Patch current configuration in a single rebuild+persist flow.
    pub async fn patch_config<F>(&self, patch: F) -> Result<(), SandboxError>
    where
        F: FnOnce(&mut SandboxConfig),
    {
        let mut new_config = self.config.read().await.clone();
        patch(&mut new_config);
        self.apply_config(new_config).await
    }

    /// Update configuration
    pub async fn update_config(&self, new_config: SandboxConfig) -> Result<(), SandboxError> {
        self.apply_config(new_config).await
    }

    /// Execute code
    pub async fn execute(
        &self,
        request: ExecutionRequest,
    ) -> Result<ExecutionResult, SandboxError> {
        self.execute_with_history(request, &[], true).await
    }

    /// Execute code with history tracking
    pub async fn execute_with_history(
        &self,
        request: ExecutionRequest,
        tags: &[String],
        save_to_history: bool,
    ) -> Result<ExecutionResult, SandboxError> {
        log::info!(
            "Executing code: language={}, id={}, code_length={} bytes",
            request.language,
            request.id,
            request.code.len()
        );
        log::debug!(
            "Execution request details: timeout={:?}s, memory={:?}MB, runtime={:?}, stdin={}",
            request.timeout_secs,
            request.memory_limit_mb,
            request.runtime,
            request
                .stdin
                .as_ref()
                .map(|s| format!("{} bytes", s.len()))
                .unwrap_or_else(|| "none".to_string())
        );

        let manager = self.manager.read().await;
        let code = request.code.clone();
        let stdin = request.stdin.clone();
        let execution_id = request.id.clone();
        let language = request.language.clone();

        let result = manager.execute(request).await?;

        log::info!(
            "Execution completed: id={}, language={}, status={:?}, exit_code={:?}, time={}ms",
            execution_id,
            language,
            result.status,
            result.exit_code,
            result.execution_time_ms
        );

        if !result.stderr.is_empty() {
            log::debug!(
                "Execution stderr (first 500 chars): {}",
                result.stderr.chars().take(500).collect::<String>()
            );
        }

        // Save to history if enabled
        if save_to_history {
            let session_id = self.current_session.read().await.clone();
            log::debug!(
                "Saving execution to history: id={}, session={:?}, tags={:?}",
                execution_id,
                session_id,
                tags
            );
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

    /// Get all supported languages
    pub async fn get_all_languages(&self) -> Vec<Language> {
        languages::get_all_languages()
    }

    /// Get languages available for native execution
    pub async fn get_available_languages(&self) -> Vec<String> {
        let manager = self.manager.read().await;
        manager.get_available_languages()
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
        log::info!("Cleaning up all sandbox runtimes");
        let manager = self.manager.read().await;
        let result = manager.cleanup_all().await;
        match &result {
            Ok(_) => log::info!("Sandbox runtime cleanup completed successfully"),
            Err(e) => log::error!("Sandbox runtime cleanup failed: {}", e),
        }
        result
    }

    /// Prepare image for a language
    pub async fn prepare_language(&self, language: &str) -> Result<(), SandboxError> {
        log::info!("Preparing sandbox image for language: {}", language);
        let manager = self.manager.read().await;
        let result = manager.prepare_language(language).await;
        match &result {
            Ok(_) => log::info!("Image prepared successfully for language: {}", language),
            Err(e) => log::error!("Failed to prepare image for language {}: {}", language, e),
        }
        result
    }

    /// Execute code with specific timeout and memory limits
    pub async fn execute_with_limits(
        &self,
        language: String,
        code: String,
        timeout_secs: u64,
        memory_mb: u64,
    ) -> Result<ExecutionResult, SandboxError> {
        log::info!(
            "Executing code with limits: language={}, timeout={}s, memory={}MB",
            language,
            timeout_secs,
            memory_mb
        );

        let manager = self.manager.read().await;
        let result = manager
            .execute_with_limits(language.clone(), code.clone(), timeout_secs, memory_mb)
            .await?;

        log::info!(
            "Execution with limits completed: language={}, status={:?}, exit_code={:?}, time={}ms",
            language,
            result.status,
            result.exit_code,
            result.execution_time_ms
        );

        // Save to history
        let session_id = self.current_session.read().await.clone();
        if let Err(e) = self
            .db
            .save_execution(&result, &code, None, session_id.as_deref(), &[])
        {
            log::warn!("Failed to save execution to history: {}", e);
        }

        Ok(result)
    }

    // ==================== Session Management ====================

    /// Start a new session
    pub async fn start_session(
        &self,
        name: &str,
        description: Option<&str>,
    ) -> Result<ExecutionSession, SandboxError> {
        log::info!(
            "Starting new sandbox session: name='{}', description={:?}",
            name,
            description
        );

        let session = self.db.create_session(name, description).map_err(|e| {
            log::error!("Failed to create session '{}': {}", name, e);
            SandboxError::Config(format!("Failed to create session: {}", e))
        })?;

        let mut current = self.current_session.write().await;
        *current = Some(session.id.clone());

        log::info!(
            "Session started successfully: id={}, name='{}'",
            session.id,
            name
        );
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
            log::info!("Ending sandbox session: id={}", id);
            self.db.close_session(&id).map_err(|e| {
                log::error!("Failed to close session {}: {}", id, e);
                SandboxError::Config(format!("Failed to close session: {}", e))
            })?;
            log::debug!("Session {} closed successfully", id);
        } else {
            log::debug!("No active session to end");
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
        log::info!(
            "Deleting sandbox session: id={}, delete_executions={}",
            id,
            delete_executions
        );

        // Clear current session if it matches
        {
            let mut current = self.current_session.write().await;
            if current.as_deref() == Some(id) {
                log::debug!("Clearing current session reference as it matches deleted session");
                *current = None;
            }
        }

        self.db.delete_session(id, delete_executions).map_err(|e| {
            log::error!("Failed to delete session {}: {}", id, e);
            SandboxError::Config(format!("Failed to delete session: {}", e))
        })?;

        log::info!("Session {} deleted successfully", id);
        Ok(())
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
        log::info!("Clearing execution history: before_date={:?}", before_date);
        let deleted = self.db.clear_executions(before_date).map_err(|e| {
            log::error!("Failed to clear execution history: {}", e);
            SandboxError::Config(format!("Failed to clear history: {}", e))
        })?;
        log::info!("Cleared {} execution records from history", deleted);
        Ok(deleted)
    }

    // ==================== Code Snippets ====================

    /// Create a new code snippet
    pub async fn create_snippet(&self, snippet: &CodeSnippet) -> Result<CodeSnippet, SandboxError> {
        log::debug!(
            "Creating code snippet: id={}, title='{}', language={}",
            snippet.id,
            snippet.title,
            snippet.language
        );
        let result = self.db.create_snippet(snippet).map_err(|e| {
            log::error!("Failed to create snippet '{}': {}", snippet.title, e);
            SandboxError::Config(format!("Failed to create snippet: {}", e))
        })?;
        log::info!(
            "Code snippet created: id={}, title='{}'",
            result.id,
            result.title
        );
        Ok(result)
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
        log::info!("Executing code snippet: id={}", id);
        let snippet = self.get_snippet(id).await?.ok_or_else(|| {
            log::warn!("Snippet not found: id={}", id);
            SandboxError::Config(format!("Snippet {} not found", id))
        })?;

        log::debug!(
            "Found snippet: title='{}', language={}, code_length={} bytes",
            snippet.title,
            snippet.language,
            snippet.code.len()
        );

        // Increment usage count
        if let Err(e) = self.db.increment_snippet_usage(id) {
            log::warn!("Failed to increment snippet usage count for {}: {}", id, e);
        }

        let request = ExecutionRequest::new(snippet.language, snippet.code);
        self.execute_with_history(request, &snippet.tags, true)
            .await
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

    /// Update session
    pub async fn update_session(
        &self,
        id: &str,
        name: &str,
        description: Option<&str>,
    ) -> Result<(), SandboxError> {
        self.db
            .update_session(id, name, description)
            .map_err(|e| SandboxError::Config(format!("Failed to update session: {}", e)))
    }

    /// Get executions for a session
    pub async fn get_session_executions(
        &self,
        session_id: &str,
    ) -> Result<Vec<ExecutionRecord>, SandboxError> {
        self.db
            .get_session_executions(session_id)
            .map_err(|e| SandboxError::Config(format!("Failed to get session executions: {}", e)))
    }

    /// Get database size
    pub async fn get_db_size(&self) -> Result<u64, SandboxError> {
        self.db
            .get_db_size()
            .map_err(|e| SandboxError::Config(format!("Failed to get size: {}", e)))
    }

    /// Vacuum database
    pub async fn vacuum_db(&self) -> Result<(), SandboxError> {
        log::info!("Vacuuming sandbox database");
        self.db.vacuum().map_err(|e| {
            log::error!("Failed to vacuum sandbox database: {}", e);
            SandboxError::Config(format!("Failed to vacuum: {}", e))
        })?;
        log::info!("Sandbox database vacuum completed");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use runtime::ExecutionStatus;

    // ==================== Constants Tests ====================

    #[test]
    fn test_default_constants() {
        assert_eq!(DEFAULT_TIMEOUT_SECS, 30);
        assert_eq!(DEFAULT_MEMORY_LIMIT_MB, 256);
        assert_eq!(DEFAULT_CPU_LIMIT_PERCENT, 50);
        assert_eq!(DEFAULT_MAX_OUTPUT_SIZE, 1024 * 1024);
    }

    // ==================== SandboxConfig Tests ====================

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
    fn test_config_default_values() {
        let config = SandboxConfig::default();
        assert_eq!(config.default_timeout_secs, DEFAULT_TIMEOUT_SECS);
        assert_eq!(config.default_memory_limit_mb, DEFAULT_MEMORY_LIMIT_MB);
        assert_eq!(config.default_cpu_limit_percent, DEFAULT_CPU_LIMIT_PERCENT);
        assert_eq!(config.max_output_size, DEFAULT_MAX_OUTPUT_SIZE);
        assert!(config.custom_images.is_empty());
        assert!(config.workspace_dir.is_none());
    }

    #[test]
    fn test_config_preferred_runtime_default() {
        let config = SandboxConfig::default();
        assert_eq!(config.preferred_runtime, RuntimeType::Docker);
    }

    #[test]
    fn test_config_serialization() {
        let config = SandboxConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let parsed: SandboxConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config.default_timeout_secs, parsed.default_timeout_secs);
        assert_eq!(
            config.default_memory_limit_mb,
            parsed.default_memory_limit_mb
        );
    }

    #[test]
    fn test_config_serialization_roundtrip() {
        let mut config = SandboxConfig {
            enable_native: true,
            network_enabled: true,
            default_timeout_secs: 60,
            ..Default::default()
        };
        config
            .custom_images
            .insert("python".to_string(), "custom/python:latest".to_string());

        let json = serde_json::to_string(&config).unwrap();
        let parsed: SandboxConfig = serde_json::from_str(&json).unwrap();

        assert!(parsed.enable_native);
        assert!(parsed.network_enabled);
        assert_eq!(parsed.default_timeout_secs, 60);
        assert_eq!(
            parsed.custom_images.get("python"),
            Some(&"custom/python:latest".to_string())
        );
    }

    #[test]
    fn test_config_with_custom_images() {
        let mut config = SandboxConfig::default();
        config
            .custom_images
            .insert("python".to_string(), "my-python:3.12".to_string());
        config
            .custom_images
            .insert("rust".to_string(), "my-rust:1.80".to_string());

        assert_eq!(config.custom_images.len(), 2);
        assert_eq!(
            config.custom_images.get("python"),
            Some(&"my-python:3.12".to_string())
        );
    }

    #[test]
    fn test_config_with_workspace_dir() {
        let config = SandboxConfig {
            workspace_dir: Some(PathBuf::from("/tmp/sandbox")),
            ..Default::default()
        };

        assert!(config.workspace_dir.is_some());
        assert_eq!(config.workspace_dir.unwrap(), PathBuf::from("/tmp/sandbox"));
    }

    #[test]
    fn test_config_clone() {
        let config = SandboxConfig::default();
        let cloned = config.clone();
        assert_eq!(config.default_timeout_secs, cloned.default_timeout_secs);
        assert_eq!(
            config.enabled_languages.len(),
            cloned.enabled_languages.len()
        );
    }

    #[test]
    fn test_config_debug() {
        let config = SandboxConfig::default();
        let debug = format!("{:?}", config);
        assert!(debug.contains("SandboxConfig"));
    }

    // ==================== RuntimeType Tests ====================

    #[test]
    fn test_runtime_type_display() {
        assert_eq!(RuntimeType::Docker.to_string(), "docker");
        assert_eq!(RuntimeType::Podman.to_string(), "podman");
        assert_eq!(RuntimeType::Native.to_string(), "native");
    }

    // ==================== ExecutionRequest Tests ====================

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
        let request = ExecutionRequest::new("python", "x = input()").with_stdin("test input");
        assert_eq!(request.stdin, Some("test input".to_string()));
    }

    #[test]
    fn test_execution_request_with_timeout() {
        let request =
            ExecutionRequest::new("python", "import time; time.sleep(1)").with_timeout(60);
        assert_eq!(request.timeout_secs, Some(60));
    }

    #[test]
    fn test_execution_request_with_memory_limit() {
        let request = ExecutionRequest::new("python", "x = [0] * 1000000").with_memory_limit(512);
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

    // ==================== ExecutionResult Tests ====================

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

    // ==================== Enabled Languages Tests ====================

    #[test]
    fn test_enabled_languages_default() {
        let config = SandboxConfig::default();
        assert!(config.enabled_languages.contains(&"python".to_string()));
        assert!(config.enabled_languages.contains(&"javascript".to_string()));
        assert!(config.enabled_languages.contains(&"rust".to_string()));
        assert!(config.enabled_languages.contains(&"go".to_string()));
    }

    #[test]
    fn test_enabled_languages_count() {
        let config = SandboxConfig::default();
        // Should have all 25 default languages
        assert_eq!(config.enabled_languages.len(), 25);
    }

    #[test]
    fn test_enabled_languages_all_present() {
        let config = SandboxConfig::default();
        let expected = vec![
            "python",
            "javascript",
            "typescript",
            "go",
            "rust",
            "java",
            "c",
            "cpp",
            "ruby",
            "php",
            "bash",
            "powershell",
            "r",
            "julia",
            "lua",
            "perl",
            "swift",
            "kotlin",
            "scala",
            "haskell",
            "elixir",
            "clojure",
            "fsharp",
            "csharp",
            "zig",
        ];

        for lang in expected {
            assert!(
                config.enabled_languages.contains(&lang.to_string()),
                "{} should be in enabled_languages",
                lang
            );
        }
    }

    // ==================== SandboxError Tests ====================

    #[test]
    fn test_sandbox_error_display() {
        let err = SandboxError::LanguageNotSupported("unknown".to_string());
        assert!(err.to_string().contains("unknown"));

        let err = SandboxError::Timeout(30);
        assert!(err.to_string().contains("30"));

        let err = SandboxError::RuntimeNotAvailable("docker".to_string());
        assert!(err.to_string().contains("docker"));
    }

    #[test]
    fn test_sandbox_error_all_variants() {
        // Test all error variants have proper display
        let errors = vec![
            SandboxError::RuntimeNotAvailable("test".to_string()),
            SandboxError::LanguageNotSupported("test".to_string()),
            SandboxError::Timeout(30),
            SandboxError::ExecutionFailed("test".to_string()),
            SandboxError::ContainerError("test".to_string()),
            SandboxError::Config("test".to_string()),
            SandboxError::ResourceLimit("test".to_string()),
            SandboxError::SecurityViolation("test".to_string()),
        ];

        for err in errors {
            let display = err.to_string();
            assert!(!display.is_empty());
        }
    }

    // ==================== Re-exports Tests ====================

    #[test]
    fn test_public_reexports() {
        // Test that public types are accessible
        let _: CodeSnippet;
        let _: ExecutionFilter;
        let _: ExecutionRecord;
        let _: ExecutionSession;
        let _: LanguageStats;
        let _: SandboxStats;
        let _: SnippetFilter;

        // These should compile - just checking reexports work
        let _ = DockerRuntime::new();
        let _ = PodmanRuntime::new();
        let _ = NativeRuntime::new();
    }

    #[test]
    fn test_language_configs_reexport() {
        // Test LANGUAGE_CONFIGS is accessible
        assert!(!LANGUAGE_CONFIGS.is_empty());

        // Test Language struct is accessible
        let lang = Language {
            id: "test",
            name: "Test",
            extension: "test",
            category: languages::LanguageCategory::Interpreted,
        };
        assert_eq!(lang.id, "test");
    }

    // ==================== Integration-style Unit Tests ====================

    #[test]
    fn test_config_and_request_compatibility() {
        let config = SandboxConfig::default();
        let request = ExecutionRequest::new("python", "print('hello')")
            .with_timeout(config.default_timeout_secs)
            .with_memory_limit(config.default_memory_limit_mb);

        assert_eq!(request.timeout_secs, Some(DEFAULT_TIMEOUT_SECS));
        assert_eq!(request.memory_limit_mb, Some(DEFAULT_MEMORY_LIMIT_MB));
    }

    #[test]
    fn test_execution_result_status_mapping() {
        // Exit code 0 -> Completed
        let success = ExecutionResult::success(
            "id".to_string(),
            String::new(),
            String::new(),
            0,
            0,
            RuntimeType::Docker,
            "python".to_string(),
        );
        assert!(matches!(success.status, ExecutionStatus::Completed));

        // Exit code non-zero -> Failed
        let failed = ExecutionResult::success(
            "id".to_string(),
            String::new(),
            String::new(),
            1,
            0,
            RuntimeType::Docker,
            "python".to_string(),
        );
        assert!(matches!(failed.status, ExecutionStatus::Failed));

        // Error -> Failed
        let error = ExecutionResult::error(
            "id".to_string(),
            "error".to_string(),
            RuntimeType::Docker,
            "python".to_string(),
        );
        assert!(matches!(error.status, ExecutionStatus::Failed));

        // Timeout -> Timeout
        let timeout = ExecutionResult::timeout(
            "id".to_string(),
            String::new(),
            String::new(),
            30,
            RuntimeType::Docker,
            "python".to_string(),
        );
        assert!(matches!(timeout.status, ExecutionStatus::Timeout));
    }

    // ==================== Edge Case Tests ====================

    #[test]
    fn test_empty_code_request() {
        let request = ExecutionRequest::new("python", "");
        assert_eq!(request.code, "");
    }

    #[test]
    fn test_multiline_code_request() {
        let code = r#"
def hello():
    print("Hello")
    
hello()
"#;
        let request = ExecutionRequest::new("python", code);
        assert!(request.code.contains("def hello"));
    }

    #[test]
    fn test_special_characters_in_code() {
        let code = r#"print("Special: \" \\ \n \t")"#;
        let request = ExecutionRequest::new("python", code);
        assert!(request.code.contains("Special"));
    }

    #[test]
    fn test_unicode_in_code() {
        let code = r#"print("你好世界 🎉")"#;
        let request = ExecutionRequest::new("python", code);
        assert!(request.code.contains("你好世界"));
    }

    #[test]
    fn test_large_stdin() {
        let large_input = "a".repeat(10000);
        let request = ExecutionRequest::new("python", "x = input()").with_stdin(&large_input);
        assert_eq!(request.stdin.unwrap().len(), 10000);
    }

    #[test]
    fn test_zero_timeout() {
        let request = ExecutionRequest::new("python", "code").with_timeout(0);
        assert_eq!(request.timeout_secs, Some(0));
    }

    #[test]
    fn test_large_memory_limit() {
        let request = ExecutionRequest::new("python", "code").with_memory_limit(8192); // 8GB
        assert_eq!(request.memory_limit_mb, Some(8192));
    }
}
