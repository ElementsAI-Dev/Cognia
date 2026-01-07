//! Runtime abstraction for sandbox execution
//!
//! Provides a unified interface for different container runtimes.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use thiserror::Error;

use super::languages::{LanguageConfig, LANGUAGE_CONFIGS};
use super::{DockerRuntime, NativeRuntime, PodmanRuntime, SandboxConfig};

/// Sandbox execution errors
#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum SandboxError {
    #[error("Runtime not available: {0}")]
    RuntimeNotAvailable(String),

    #[error("Language not supported: {0}")]
    LanguageNotSupported(String),

    #[error("Execution timeout after {0} seconds")]
    Timeout(u64),

    #[error("Execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Container error: {0}")]
    ContainerError(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Resource limit exceeded: {0}")]
    ResourceLimit(String),

    #[error("Security violation: {0}")]
    SecurityViolation(String),
}

/// Runtime type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeType {
    Docker,
    Podman,
    Native,
}

impl std::fmt::Display for RuntimeType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuntimeType::Docker => write!(f, "docker"),
            RuntimeType::Podman => write!(f, "podman"),
            RuntimeType::Native => write!(f, "native"),
        }
    }
}

/// Execution status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExecutionStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Timeout,
    Cancelled,
}

/// Execution request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ExecutionRequest {
    /// Unique execution ID
    pub id: String,

    /// Programming language
    pub language: String,

    /// Source code to execute
    pub code: String,

    /// Standard input (optional)
    pub stdin: Option<String>,

    /// Command line arguments
    pub args: Vec<String>,

    /// Environment variables
    pub env: HashMap<String, String>,

    /// Timeout in seconds (optional, uses default if not specified)
    pub timeout_secs: Option<u64>,

    /// Memory limit in MB (optional)
    pub memory_limit_mb: Option<u64>,

    /// CPU limit percentage (optional)
    pub cpu_limit_percent: Option<u64>,

    /// Preferred runtime (optional, uses configured preference)
    pub runtime: Option<RuntimeType>,

    /// Additional files to include
    pub files: HashMap<String, String>,

    /// Whether to allow network access
    pub network_enabled: Option<bool>,
}

impl ExecutionRequest {
    pub fn new(language: impl Into<String>, code: impl Into<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            language: language.into(),
            code: code.into(),
            stdin: None,
            args: Vec::new(),
            env: HashMap::new(),
            timeout_secs: None,
            memory_limit_mb: None,
            cpu_limit_percent: None,
            runtime: None,
            files: HashMap::new(),
            network_enabled: None,
        }
    }

    pub fn with_stdin(mut self, stdin: impl Into<String>) -> Self {
        self.stdin = Some(stdin.into());
        self
    }

    pub fn with_timeout(mut self, secs: u64) -> Self {
        self.timeout_secs = Some(secs);
        self
    }

    pub fn with_memory_limit(mut self, mb: u64) -> Self {
        self.memory_limit_mb = Some(mb);
        self
    }
}

/// Execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    /// Execution ID
    pub id: String,

    /// Execution status
    pub status: ExecutionStatus,

    /// Standard output
    pub stdout: String,

    /// Standard error
    pub stderr: String,

    /// Exit code (if completed)
    pub exit_code: Option<i32>,

    /// Execution time in milliseconds
    pub execution_time_ms: u64,

    /// Memory used in bytes (if available)
    pub memory_used_bytes: Option<u64>,

    /// Error message (if failed)
    pub error: Option<String>,

    /// Runtime used
    pub runtime: RuntimeType,

    /// Language used
    pub language: String,
}

impl ExecutionResult {
    pub fn success(
        id: String,
        stdout: String,
        stderr: String,
        exit_code: i32,
        execution_time_ms: u64,
        runtime: RuntimeType,
        language: String,
    ) -> Self {
        Self {
            id,
            status: if exit_code == 0 {
                ExecutionStatus::Completed
            } else {
                ExecutionStatus::Failed
            },
            stdout,
            stderr,
            exit_code: Some(exit_code),
            execution_time_ms,
            memory_used_bytes: None,
            error: None,
            runtime,
            language,
        }
    }

    pub fn error(id: String, error: String, runtime: RuntimeType, language: String) -> Self {
        Self {
            id,
            status: ExecutionStatus::Failed,
            stdout: String::new(),
            stderr: String::new(),
            exit_code: None,
            execution_time_ms: 0,
            memory_used_bytes: None,
            error: Some(error),
            runtime,
            language,
        }
    }

    pub fn timeout(
        id: String,
        stdout: String,
        stderr: String,
        timeout_secs: u64,
        runtime: RuntimeType,
        language: String,
    ) -> Self {
        Self {
            id,
            status: ExecutionStatus::Timeout,
            stdout,
            stderr,
            exit_code: None,
            execution_time_ms: timeout_secs * 1000,
            memory_used_bytes: None,
            error: Some(format!("Execution timeout after {} seconds", timeout_secs)),
            runtime,
            language,
        }
    }
}

/// Execution configuration derived from request and defaults
#[derive(Debug, Clone)]
pub struct ExecutionConfig {
    pub timeout: Duration,
    pub memory_limit_mb: u64,
    pub cpu_limit_percent: u64,
    pub network_enabled: bool,
    pub max_output_size: usize,
}

/// Sandbox runtime trait - implemented by Docker, Podman, Native
#[async_trait]
pub trait SandboxRuntime: Send + Sync {
    /// Get the runtime type
    fn runtime_type(&self) -> RuntimeType;

    /// Check if this runtime is available on the system
    async fn is_available(&self) -> bool;

    /// Get runtime version
    async fn get_version(&self) -> Result<String, SandboxError>;

    /// Execute code in the sandbox
    async fn execute(
        &self,
        request: &ExecutionRequest,
        language_config: &LanguageConfig,
        exec_config: &ExecutionConfig,
    ) -> Result<ExecutionResult, SandboxError>;

    /// Clean up any resources (containers, temp files, etc.)
    async fn cleanup(&self) -> Result<(), SandboxError>;

    /// Pull/prepare the image for a language (for container runtimes)
    async fn prepare_image(&self, language: &str) -> Result<(), SandboxError> {
        let _ = language;
        Ok(())
    }
}

/// Sandbox manager - coordinates multiple runtimes
pub struct SandboxManager {
    docker: Option<DockerRuntime>,
    podman: Option<PodmanRuntime>,
    native: Option<NativeRuntime>,
    config: SandboxConfig,
    available_runtimes: Vec<RuntimeType>,
}

impl SandboxManager {
    /// Create a new sandbox manager
    pub async fn new(config: SandboxConfig) -> Result<Self, SandboxError> {
        log::info!("Initializing SandboxManager");
        log::debug!("SandboxManager config: preferred_runtime={:?}, docker_enabled={}, podman_enabled={}, native_enabled={}",
            config.preferred_runtime, config.enable_docker, config.enable_podman, config.enable_native);

        let mut available_runtimes = Vec::new();

        // Initialize Docker runtime if enabled
        let docker = if config.enable_docker {
            log::debug!("Checking Docker runtime availability...");
            let runtime = DockerRuntime::new();
            if runtime.is_available().await {
                match runtime.get_version().await {
                    Ok(version) => log::info!("Docker runtime available: version {}", version),
                    Err(_) => log::info!("Docker runtime available (version unknown)"),
                }
                available_runtimes.push(RuntimeType::Docker);
                Some(runtime)
            } else {
                log::warn!(
                    "Docker runtime not available - docker command not found or not running"
                );
                None
            }
        } else {
            log::debug!("Docker runtime disabled in configuration");
            None
        };

        // Initialize Podman runtime if enabled
        let podman = if config.enable_podman {
            log::debug!("Checking Podman runtime availability...");
            let runtime = PodmanRuntime::new();
            if runtime.is_available().await {
                match runtime.get_version().await {
                    Ok(version) => log::info!("Podman runtime available: version {}", version),
                    Err(_) => log::info!("Podman runtime available (version unknown)"),
                }
                available_runtimes.push(RuntimeType::Podman);
                Some(runtime)
            } else {
                log::warn!(
                    "Podman runtime not available - podman command not found or not running"
                );
                None
            }
        } else {
            log::debug!("Podman runtime disabled in configuration");
            None
        };

        // Initialize Native runtime if enabled
        let native = if config.enable_native {
            log::debug!("Checking Native runtime availability...");
            let runtime = NativeRuntime::new();
            if runtime.is_available().await {
                log::info!("Native runtime available");
                available_runtimes.push(RuntimeType::Native);
                Some(runtime)
            } else {
                log::warn!("Native runtime not available");
                None
            }
        } else {
            log::debug!("Native runtime disabled in configuration (recommended for security)");
            None
        };

        if available_runtimes.is_empty() {
            log::warn!("No sandbox runtimes available! Enable native runtime or install Docker/Podman for code execution.");
        } else {
            log::info!(
                "SandboxManager initialized with {} available runtime(s): {:?}",
                available_runtimes.len(),
                available_runtimes
            );
        }

        Ok(Self {
            docker,
            podman,
            native,
            config,
            available_runtimes,
        })
    }

    /// Get available runtimes
    pub fn get_available_runtimes(&self) -> Vec<RuntimeType> {
        self.available_runtimes.clone()
    }

    /// Check if a specific runtime is available
    pub fn is_runtime_available(&self, runtime: RuntimeType) -> bool {
        self.available_runtimes.contains(&runtime)
    }

    /// Get runtime by type
    fn get_runtime_by_type(&self, runtime_type: RuntimeType) -> Option<&dyn SandboxRuntime> {
        match runtime_type {
            RuntimeType::Docker => self.docker.as_ref().map(|r| r as &dyn SandboxRuntime),
            RuntimeType::Podman => self.podman.as_ref().map(|r| r as &dyn SandboxRuntime),
            RuntimeType::Native => self.native.as_ref().map(|r| r as &dyn SandboxRuntime),
        }
    }

    /// Get any available runtime in priority order (Docker > Podman > Native)
    fn get_any_runtime(&self) -> Option<&dyn SandboxRuntime> {
        self.get_runtime_by_type(RuntimeType::Docker)
            .or_else(|| self.get_runtime_by_type(RuntimeType::Podman))
            .or_else(|| self.get_runtime_by_type(RuntimeType::Native))
    }

    /// Get the best available runtime
    fn get_runtime(&self, preferred: Option<RuntimeType>) -> Option<&dyn SandboxRuntime> {
        // Try preferred runtime first
        if let Some(pref) = preferred {
            if let Some(runtime) = self.get_runtime_by_type(pref) {
                return Some(runtime);
            }
        }

        // Fall back to configured preference
        self.get_runtime_by_type(self.config.preferred_runtime)
            .or_else(|| self.get_any_runtime())
    }

    /// Execute code
    pub async fn execute(
        &self,
        request: ExecutionRequest,
    ) -> Result<ExecutionResult, SandboxError> {
        log::debug!(
            "SandboxManager.execute: language={}, id={}, preferred_runtime={:?}",
            request.language,
            request.id,
            request.runtime
        );

        // Get language configuration
        let language_config = LANGUAGE_CONFIGS
            .iter()
            .find(|l| l.id == request.language || l.aliases.contains(&request.language.as_str()))
            .ok_or_else(|| {
                log::warn!("Language not supported: {}", request.language);
                SandboxError::LanguageNotSupported(request.language.clone())
            })?;

        log::debug!(
            "Language config found: id={}, name={}, image={}, category={:?}",
            language_config.id,
            language_config.name,
            language_config.docker_image,
            language_config.category
        );

        // Check if language is enabled
        if !self
            .config
            .enabled_languages
            .contains(&language_config.id.to_string())
        {
            log::warn!(
                "Language '{}' is disabled in configuration",
                language_config.name
            );
            return Err(SandboxError::LanguageNotSupported(format!(
                "{} is disabled in configuration",
                language_config.name
            )));
        }

        // Get runtime
        let runtime = self.get_runtime(request.runtime).ok_or_else(|| {
            log::error!(
                "No runtime available for execution (requested: {:?})",
                request.runtime
            );
            SandboxError::RuntimeNotAvailable("No runtime available".to_string())
        })?;

        log::debug!("Selected runtime: {:?}", runtime.runtime_type());

        // Build execution config
        let timeout_secs = request
            .timeout_secs
            .unwrap_or(self.config.default_timeout_secs);
        let memory_mb = request
            .memory_limit_mb
            .unwrap_or(self.config.default_memory_limit_mb);
        let cpu_percent = request
            .cpu_limit_percent
            .unwrap_or(self.config.default_cpu_limit_percent);
        let network = request
            .network_enabled
            .unwrap_or(self.config.network_enabled);

        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(timeout_secs),
            memory_limit_mb: memory_mb,
            cpu_limit_percent: cpu_percent,
            network_enabled: network,
            max_output_size: self.config.max_output_size,
        };

        log::debug!(
            "Execution config: timeout={}s, memory={}MB, cpu={}%, network={}, max_output={}",
            timeout_secs,
            memory_mb,
            cpu_percent,
            network,
            self.config.max_output_size
        );

        // Execute and handle errors
        log::info!(
            "Starting execution: id={}, language={}, runtime={:?}",
            request.id,
            request.language,
            runtime.runtime_type()
        );

        match runtime
            .execute(&request, language_config, &exec_config)
            .await
        {
            Ok(result) => {
                log::debug!(
                    "Execution succeeded: id={}, status={:?}, exit_code={:?}, time={}ms",
                    result.id,
                    result.status,
                    result.exit_code,
                    result.execution_time_ms
                );
                Ok(result)
            }
            Err(e) => {
                log::error!("Execution failed: id={}, error={}", request.id, e);
                Ok(ExecutionResult::error(
                    request.id.clone(),
                    e.to_string(),
                    runtime.runtime_type(),
                    request.language.clone(),
                ))
            }
        }
    }

    /// Get runtime information (type and version)
    pub async fn get_runtime_info(
        &self,
        runtime_type: RuntimeType,
    ) -> Option<(RuntimeType, String)> {
        let runtime = self.get_runtime_by_type(runtime_type)?;
        let version = runtime.get_version().await.ok()?;
        Some((runtime.runtime_type(), version))
    }

    /// Cleanup all runtimes
    pub async fn cleanup_all(&self) -> Result<(), SandboxError> {
        log::info!("Cleaning up all sandbox runtimes");

        if let Some(ref docker) = self.docker {
            log::debug!("Cleaning up Docker runtime...");
            if let Err(e) = docker.cleanup().await {
                log::warn!("Docker cleanup error: {}", e);
            } else {
                log::debug!("Docker runtime cleaned up successfully");
            }
        }
        if let Some(ref podman) = self.podman {
            log::debug!("Cleaning up Podman runtime...");
            if let Err(e) = podman.cleanup().await {
                log::warn!("Podman cleanup error: {}", e);
            } else {
                log::debug!("Podman runtime cleaned up successfully");
            }
        }
        if let Some(ref native) = self.native {
            log::debug!("Cleaning up Native runtime...");
            if let Err(e) = native.cleanup().await {
                log::warn!("Native cleanup error: {}", e);
            } else {
                log::debug!("Native runtime cleaned up successfully");
            }
        }

        log::info!("All sandbox runtimes cleanup completed");
        Ok(())
    }

    /// Prepare image for a language
    pub async fn prepare_language(&self, language: &str) -> Result<(), SandboxError> {
        log::info!("Preparing container image for language: {}", language);

        // Try Docker first, then Podman
        if let Some(ref docker) = self.docker {
            log::debug!(
                "Pulling image using Docker runtime for language: {}",
                language
            );
            match docker.prepare_image(language).await {
                Ok(_) => {
                    log::info!(
                        "Docker image prepared successfully for language: {}",
                        language
                    );
                    return Ok(());
                }
                Err(e) => {
                    log::error!("Failed to prepare Docker image for {}: {}", language, e);
                    return Err(e);
                }
            }
        }
        if let Some(ref podman) = self.podman {
            log::debug!(
                "Pulling image using Podman runtime for language: {}",
                language
            );
            match podman.prepare_image(language).await {
                Ok(_) => {
                    log::info!(
                        "Podman image prepared successfully for language: {}",
                        language
                    );
                    return Ok(());
                }
                Err(e) => {
                    log::error!("Failed to prepare Podman image for {}: {}", language, e);
                    return Err(e);
                }
            }
        }

        log::debug!(
            "No container runtime available for image preparation (language: {})",
            language
        );
        Ok(())
    }

    /// Execute code with timeout and memory limit
    #[allow(dead_code)]
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
        self.execute(request).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    // ==================== RuntimeType Tests ====================

    #[test]
    fn test_runtime_type_display() {
        assert_eq!(RuntimeType::Docker.to_string(), "docker");
        assert_eq!(RuntimeType::Podman.to_string(), "podman");
        assert_eq!(RuntimeType::Native.to_string(), "native");
    }

    #[test]
    fn test_runtime_type_equality() {
        assert_eq!(RuntimeType::Docker, RuntimeType::Docker);
        assert_eq!(RuntimeType::Podman, RuntimeType::Podman);
        assert_eq!(RuntimeType::Native, RuntimeType::Native);
        assert_ne!(RuntimeType::Docker, RuntimeType::Podman);
    }

    #[test]
    fn test_runtime_type_serialization() {
        let docker = serde_json::to_string(&RuntimeType::Docker).unwrap();
        assert_eq!(docker, "\"docker\"");

        let podman = serde_json::to_string(&RuntimeType::Podman).unwrap();
        assert_eq!(podman, "\"podman\"");

        let native = serde_json::to_string(&RuntimeType::Native).unwrap();
        assert_eq!(native, "\"native\"");
    }

    #[test]
    fn test_runtime_type_deserialization() {
        let docker: RuntimeType = serde_json::from_str("\"docker\"").unwrap();
        assert_eq!(docker, RuntimeType::Docker);

        let podman: RuntimeType = serde_json::from_str("\"podman\"").unwrap();
        assert_eq!(podman, RuntimeType::Podman);

        let native: RuntimeType = serde_json::from_str("\"native\"").unwrap();
        assert_eq!(native, RuntimeType::Native);
    }

    #[test]
    fn test_runtime_type_clone() {
        let docker = RuntimeType::Docker;
        let cloned = docker;
        assert_eq!(docker, cloned);
    }

    #[test]
    fn test_runtime_type_copy() {
        let docker = RuntimeType::Docker;
        let copied = docker;
        assert_eq!(docker, copied);
    }

    #[test]
    fn test_runtime_type_hash() {
        use std::collections::HashSet;
        let mut set = HashSet::new();
        set.insert(RuntimeType::Docker);
        set.insert(RuntimeType::Podman);
        set.insert(RuntimeType::Native);
        assert_eq!(set.len(), 3);

        // Adding duplicate should not increase size
        set.insert(RuntimeType::Docker);
        assert_eq!(set.len(), 3);
    }

    // ==================== ExecutionStatus Tests ====================

    #[test]
    fn test_execution_status_serialization() {
        let pending = serde_json::to_string(&ExecutionStatus::Pending).unwrap();
        assert_eq!(pending, "\"pending\"");

        let running = serde_json::to_string(&ExecutionStatus::Running).unwrap();
        assert_eq!(running, "\"running\"");

        let completed = serde_json::to_string(&ExecutionStatus::Completed).unwrap();
        assert_eq!(completed, "\"completed\"");

        let failed = serde_json::to_string(&ExecutionStatus::Failed).unwrap();
        assert_eq!(failed, "\"failed\"");

        let timeout = serde_json::to_string(&ExecutionStatus::Timeout).unwrap();
        assert_eq!(timeout, "\"timeout\"");

        let cancelled = serde_json::to_string(&ExecutionStatus::Cancelled).unwrap();
        assert_eq!(cancelled, "\"cancelled\"");
    }

    #[test]
    fn test_execution_status_deserialization() {
        let pending: ExecutionStatus = serde_json::from_str("\"pending\"").unwrap();
        assert!(matches!(pending, ExecutionStatus::Pending));

        let completed: ExecutionStatus = serde_json::from_str("\"completed\"").unwrap();
        assert!(matches!(completed, ExecutionStatus::Completed));
    }

    #[test]
    fn test_execution_status_clone() {
        let status = ExecutionStatus::Completed;
        let cloned = status.clone();
        assert!(matches!(cloned, ExecutionStatus::Completed));
    }

    #[test]
    fn test_execution_status_debug() {
        let status = ExecutionStatus::Failed;
        let debug = format!("{:?}", status);
        assert!(debug.contains("Failed"));
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
        assert!(request.timeout_secs.is_none());
        assert!(request.memory_limit_mb.is_none());
        assert!(request.cpu_limit_percent.is_none());
        assert!(request.runtime.is_none());
        assert!(request.files.is_empty());
        assert!(request.network_enabled.is_none());
        assert!(!request.id.is_empty());
    }

    #[test]
    fn test_execution_request_with_stdin() {
        let request = ExecutionRequest::new("python", "x = input()").with_stdin("test input");
        assert_eq!(request.stdin, Some("test input".to_string()));
    }

    #[test]
    fn test_execution_request_with_timeout() {
        let request = ExecutionRequest::new("python", "code").with_timeout(60);
        assert_eq!(request.timeout_secs, Some(60));
    }

    #[test]
    fn test_execution_request_with_memory_limit() {
        let request = ExecutionRequest::new("python", "code").with_memory_limit(512);
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
    fn test_execution_request_unique_ids() {
        let request1 = ExecutionRequest::new("python", "code");
        let request2 = ExecutionRequest::new("python", "code");
        assert_ne!(request1.id, request2.id);
    }

    #[test]
    fn test_execution_request_serialization() {
        let request = ExecutionRequest::new("python", "print('hello')")
            .with_stdin("input")
            .with_timeout(30);

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("\"language\":\"python\""));
        assert!(json.contains("\"code\":\"print('hello')\""));
        assert!(json.contains("\"stdin\":\"input\""));
        assert!(json.contains("\"timeout_secs\":30"));
    }

    #[test]
    fn test_execution_request_deserialization() {
        let json = r#"{
            "id": "test-id",
            "language": "python",
            "code": "print('hello')",
            "stdin": "input",
            "args": [],
            "env": {},
            "timeout_secs": 30,
            "memory_limit_mb": null,
            "cpu_limit_percent": null,
            "runtime": null,
            "files": {},
            "network_enabled": null
        }"#;

        let request: ExecutionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.id, "test-id");
        assert_eq!(request.language, "python");
        assert_eq!(request.stdin, Some("input".to_string()));
        assert_eq!(request.timeout_secs, Some(30));
    }

    #[test]
    fn test_execution_request_with_env() {
        let mut request = ExecutionRequest::new("python", "code");
        request.env.insert("KEY".to_string(), "VALUE".to_string());
        assert_eq!(request.env.get("KEY"), Some(&"VALUE".to_string()));
    }

    #[test]
    fn test_execution_request_with_args() {
        let mut request = ExecutionRequest::new("python", "code");
        request.args.push("arg1".to_string());
        request.args.push("arg2".to_string());
        assert_eq!(request.args.len(), 2);
    }

    #[test]
    fn test_execution_request_with_files() {
        let mut request = ExecutionRequest::new("python", "code");
        request
            .files
            .insert("data.txt".to_string(), "content".to_string());
        assert_eq!(request.files.get("data.txt"), Some(&"content".to_string()));
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
        assert_eq!(result.stderr, "");
        assert_eq!(result.exit_code, Some(0));
        assert_eq!(result.execution_time_ms, 100);
        assert!(result.memory_used_bytes.is_none());
        assert!(result.error.is_none());
        assert_eq!(result.runtime, RuntimeType::Docker);
        assert_eq!(result.language, "python");
    }

    #[test]
    fn test_execution_result_success_with_nonzero_exit() {
        let result = ExecutionResult::success(
            "test-id".to_string(),
            String::new(),
            "error".to_string(),
            1,
            100,
            RuntimeType::Docker,
            "python".to_string(),
        );

        assert!(matches!(result.status, ExecutionStatus::Failed));
        assert_eq!(result.exit_code, Some(1));
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
        assert_eq!(result.execution_time_ms, 0);
        assert!(result.stdout.is_empty());
        assert!(result.stderr.is_empty());
    }

    #[test]
    fn test_execution_result_timeout() {
        let result = ExecutionResult::timeout(
            "test-id".to_string(),
            "partial output".to_string(),
            "partial error".to_string(),
            30,
            RuntimeType::Docker,
            "python".to_string(),
        );

        assert!(matches!(result.status, ExecutionStatus::Timeout));
        assert_eq!(result.stdout, "partial output");
        assert_eq!(result.stderr, "partial error");
        assert!(result.exit_code.is_none());
        assert_eq!(result.execution_time_ms, 30 * 1000);
        assert!(result.error.is_some());
        assert!(result.error.unwrap().contains("30"));
    }

    #[test]
    fn test_execution_result_serialization() {
        let result = ExecutionResult::success(
            "test-id".to_string(),
            "output".to_string(),
            String::new(),
            0,
            100,
            RuntimeType::Docker,
            "python".to_string(),
        );

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"id\":\"test-id\""));
        assert!(json.contains("\"status\":\"completed\""));
        assert!(json.contains("\"runtime\":\"docker\""));
    }

    #[test]
    fn test_execution_result_clone() {
        let result = ExecutionResult::success(
            "test-id".to_string(),
            "output".to_string(),
            String::new(),
            0,
            100,
            RuntimeType::Docker,
            "python".to_string(),
        );

        let cloned = result.clone();
        assert_eq!(result.id, cloned.id);
        assert_eq!(result.stdout, cloned.stdout);
    }

    // ==================== ExecutionConfig Tests ====================

    #[test]
    fn test_execution_config_creation() {
        let config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
        };

        assert_eq!(config.timeout.as_secs(), 30);
        assert_eq!(config.memory_limit_mb, 256);
        assert_eq!(config.cpu_limit_percent, 50);
        assert!(!config.network_enabled);
        assert_eq!(config.max_output_size, 1024 * 1024);
    }

    #[test]
    fn test_execution_config_clone() {
        let config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: true,
            max_output_size: 1024,
        };

        let cloned = config.clone();
        assert_eq!(config.timeout, cloned.timeout);
        assert_eq!(config.memory_limit_mb, cloned.memory_limit_mb);
    }

    // ==================== SandboxError Tests ====================

    #[test]
    fn test_sandbox_error_runtime_not_available() {
        let err = SandboxError::RuntimeNotAvailable("docker".to_string());
        let display = err.to_string();
        assert!(display.contains("docker"));
        assert!(display.contains("not available"));
    }

    #[test]
    fn test_sandbox_error_language_not_supported() {
        let err = SandboxError::LanguageNotSupported("unknown".to_string());
        let display = err.to_string();
        assert!(display.contains("unknown"));
        assert!(display.contains("not supported"));
    }

    #[test]
    fn test_sandbox_error_timeout() {
        let err = SandboxError::Timeout(30);
        let display = err.to_string();
        assert!(display.contains("30"));
        assert!(display.contains("timeout"));
    }

    #[test]
    fn test_sandbox_error_execution_failed() {
        let err = SandboxError::ExecutionFailed("process crashed".to_string());
        let display = err.to_string();
        assert!(display.contains("process crashed"));
    }

    #[test]
    fn test_sandbox_error_container_error() {
        let err = SandboxError::ContainerError("failed to start".to_string());
        let display = err.to_string();
        assert!(display.contains("failed to start"));
    }

    #[test]
    fn test_sandbox_error_config() {
        let err = SandboxError::Config("invalid config".to_string());
        let display = err.to_string();
        assert!(display.contains("invalid config"));
    }

    #[test]
    fn test_sandbox_error_resource_limit() {
        let err = SandboxError::ResourceLimit("memory exceeded".to_string());
        let display = err.to_string();
        assert!(display.contains("memory exceeded"));
    }

    #[test]
    fn test_sandbox_error_security_violation() {
        let err = SandboxError::SecurityViolation("network access denied".to_string());
        let display = err.to_string();
        assert!(display.contains("network access"));
    }

    #[test]
    fn test_sandbox_error_io() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let err: SandboxError = io_err.into();
        let display = err.to_string();
        assert!(display.contains("file not found") || display.contains("IO"));
    }

    #[test]
    fn test_sandbox_error_debug() {
        let err = SandboxError::Timeout(30);
        let debug = format!("{:?}", err);
        assert!(debug.contains("Timeout"));
        assert!(debug.contains("30"));
    }

    // ==================== SandboxManager Tests ====================

    #[tokio::test]
    async fn test_sandbox_manager_creation_all_disabled() {
        let config = SandboxConfig {
            preferred_runtime: RuntimeType::Docker,
            enable_docker: false,
            enable_podman: false,
            enable_native: false,
            default_timeout_secs: 30,
            default_memory_limit_mb: 256,
            default_cpu_limit_percent: 50,
            max_output_size: 1024 * 1024,
            custom_images: HashMap::new(),
            network_enabled: false,
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };

        let manager = SandboxManager::new(config).await;
        assert!(manager.is_ok());
        let manager = manager.unwrap();
        assert!(manager.get_available_runtimes().is_empty());
    }

    #[tokio::test]
    async fn test_sandbox_manager_creation_native_enabled() {
        let config = SandboxConfig {
            preferred_runtime: RuntimeType::Native,
            enable_docker: false,
            enable_podman: false,
            enable_native: true,
            default_timeout_secs: 30,
            default_memory_limit_mb: 256,
            default_cpu_limit_percent: 50,
            max_output_size: 1024 * 1024,
            custom_images: HashMap::new(),
            network_enabled: false,
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };

        let manager = SandboxManager::new(config).await;
        assert!(manager.is_ok());
        let manager = manager.unwrap();
        assert!(manager.is_runtime_available(RuntimeType::Native));
    }

    #[tokio::test]
    async fn test_sandbox_manager_get_available_runtimes() {
        let config = SandboxConfig {
            preferred_runtime: RuntimeType::Native,
            enable_docker: false,
            enable_podman: false,
            enable_native: true,
            default_timeout_secs: 30,
            default_memory_limit_mb: 256,
            default_cpu_limit_percent: 50,
            max_output_size: 1024 * 1024,
            custom_images: HashMap::new(),
            network_enabled: false,
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };

        let manager = SandboxManager::new(config).await.unwrap();
        let runtimes = manager.get_available_runtimes();
        assert!(runtimes.contains(&RuntimeType::Native));
    }

    #[tokio::test]
    async fn test_sandbox_manager_is_runtime_available() {
        let config = SandboxConfig {
            preferred_runtime: RuntimeType::Native,
            enable_docker: false,
            enable_podman: false,
            enable_native: true,
            default_timeout_secs: 30,
            default_memory_limit_mb: 256,
            default_cpu_limit_percent: 50,
            max_output_size: 1024 * 1024,
            custom_images: HashMap::new(),
            network_enabled: false,
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };

        let manager = SandboxManager::new(config).await.unwrap();
        assert!(manager.is_runtime_available(RuntimeType::Native));
        // Docker/Podman might not be available, so just check they don't crash
        let _ = manager.is_runtime_available(RuntimeType::Docker);
        let _ = manager.is_runtime_available(RuntimeType::Podman);
    }

    #[tokio::test]
    async fn test_sandbox_manager_cleanup_all() {
        let config = SandboxConfig {
            preferred_runtime: RuntimeType::Native,
            enable_docker: false,
            enable_podman: false,
            enable_native: true,
            default_timeout_secs: 30,
            default_memory_limit_mb: 256,
            default_cpu_limit_percent: 50,
            max_output_size: 1024 * 1024,
            custom_images: HashMap::new(),
            network_enabled: false,
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };

        let manager = SandboxManager::new(config).await.unwrap();
        let result = manager.cleanup_all().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_sandbox_manager_execute_unsupported_language() {
        let config = SandboxConfig {
            preferred_runtime: RuntimeType::Native,
            enable_docker: false,
            enable_podman: false,
            enable_native: true,
            default_timeout_secs: 30,
            default_memory_limit_mb: 256,
            default_cpu_limit_percent: 50,
            max_output_size: 1024 * 1024,
            custom_images: HashMap::new(),
            network_enabled: false,
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };

        let manager = SandboxManager::new(config).await.unwrap();
        let request = ExecutionRequest::new("nonexistent_lang", "code");
        let result = manager.execute(request).await;

        // Should return an error result, not an Err
        assert!(result.is_err() || matches!(result.unwrap().status, ExecutionStatus::Failed));
    }

    #[tokio::test]
    async fn test_sandbox_manager_execute_disabled_language() {
        let config = SandboxConfig {
            preferred_runtime: RuntimeType::Native,
            enable_docker: false,
            enable_podman: false,
            enable_native: true,
            default_timeout_secs: 30,
            default_memory_limit_mb: 256,
            default_cpu_limit_percent: 50,
            max_output_size: 1024 * 1024,
            custom_images: HashMap::new(),
            network_enabled: false,
            workspace_dir: None,
            enabled_languages: vec![], // No languages enabled
        };

        let manager = SandboxManager::new(config).await.unwrap();
        let request = ExecutionRequest::new("python", "print('hello')");
        let result = manager.execute(request).await;

        // Should fail because python is not in enabled_languages
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_sandbox_manager_prepare_language() {
        let config = SandboxConfig {
            preferred_runtime: RuntimeType::Native,
            enable_docker: false,
            enable_podman: false,
            enable_native: true,
            default_timeout_secs: 30,
            default_memory_limit_mb: 256,
            default_cpu_limit_percent: 50,
            max_output_size: 1024 * 1024,
            custom_images: HashMap::new(),
            network_enabled: false,
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };

        let manager = SandboxManager::new(config).await.unwrap();
        // Should succeed (no-op for native runtime)
        let result = manager.prepare_language("python").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_sandbox_manager_get_runtime_info() {
        let config = SandboxConfig {
            preferred_runtime: RuntimeType::Native,
            enable_docker: false,
            enable_podman: false,
            enable_native: true,
            default_timeout_secs: 30,
            default_memory_limit_mb: 256,
            default_cpu_limit_percent: 50,
            max_output_size: 1024 * 1024,
            custom_images: HashMap::new(),
            network_enabled: false,
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };

        let manager = SandboxManager::new(config).await.unwrap();
        let info = manager.get_runtime_info(RuntimeType::Native).await;
        assert!(info.is_some());
        let (rt, version) = info.unwrap();
        assert_eq!(rt, RuntimeType::Native);
        assert_eq!(version, "native-1.0");
    }

    // ==================== LANGUAGE_CONFIGS Tests ====================

    #[test]
    fn test_language_configs_not_empty() {
        assert!(!LANGUAGE_CONFIGS.is_empty());
    }

    #[test]
    fn test_language_configs_contains_python() {
        let python = LANGUAGE_CONFIGS.iter().find(|l| l.id == "python");
        assert!(python.is_some());
    }

    #[test]
    fn test_language_configs_find_by_alias() {
        let found = LANGUAGE_CONFIGS
            .iter()
            .find(|l| l.id == "python" || l.aliases.contains(&"py"));
        assert!(found.is_some());
    }
}
