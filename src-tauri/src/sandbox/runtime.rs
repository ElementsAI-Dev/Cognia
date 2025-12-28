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
    pub fn success(id: String, stdout: String, stderr: String, exit_code: i32, execution_time_ms: u64, runtime: RuntimeType, language: String) -> Self {
        Self {
            id,
            status: if exit_code == 0 { ExecutionStatus::Completed } else { ExecutionStatus::Failed },
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

    pub fn timeout(id: String, stdout: String, stderr: String, timeout_secs: u64, runtime: RuntimeType, language: String) -> Self {
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
        let mut available_runtimes = Vec::new();

        // Initialize Docker runtime if enabled
        let docker = if config.enable_docker {
            let runtime = DockerRuntime::new();
            if runtime.is_available().await {
                available_runtimes.push(RuntimeType::Docker);
                Some(runtime)
            } else {
                log::warn!("Docker runtime not available");
                None
            }
        } else {
            None
        };

        // Initialize Podman runtime if enabled
        let podman = if config.enable_podman {
            let runtime = PodmanRuntime::new();
            if runtime.is_available().await {
                available_runtimes.push(RuntimeType::Podman);
                Some(runtime)
            } else {
                log::warn!("Podman runtime not available");
                None
            }
        } else {
            None
        };

        // Initialize Native runtime if enabled
        let native = if config.enable_native {
            let runtime = NativeRuntime::new();
            if runtime.is_available().await {
                available_runtimes.push(RuntimeType::Native);
                Some(runtime)
            } else {
                log::warn!("Native runtime not available");
                None
            }
        } else {
            None
        };

        if available_runtimes.is_empty() {
            log::error!("No sandbox runtimes available");
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

    /// Get the best available runtime
    fn get_runtime(&self, preferred: Option<RuntimeType>) -> Option<&dyn SandboxRuntime> {
        // Try preferred runtime first
        if let Some(pref) = preferred {
            match pref {
                RuntimeType::Docker if self.docker.is_some() => {
                    return self.docker.as_ref().map(|r| r as &dyn SandboxRuntime);
                }
                RuntimeType::Podman if self.podman.is_some() => {
                    return self.podman.as_ref().map(|r| r as &dyn SandboxRuntime);
                }
                RuntimeType::Native if self.native.is_some() => {
                    return self.native.as_ref().map(|r| r as &dyn SandboxRuntime);
                }
                _ => {}
            }
        }

        // Fall back to configured preference
        match self.config.preferred_runtime {
            RuntimeType::Docker if self.docker.is_some() => {
                self.docker.as_ref().map(|r| r as &dyn SandboxRuntime)
            }
            RuntimeType::Podman if self.podman.is_some() => {
                self.podman.as_ref().map(|r| r as &dyn SandboxRuntime)
            }
            RuntimeType::Native if self.native.is_some() => {
                self.native.as_ref().map(|r| r as &dyn SandboxRuntime)
            }
            _ => {
                // Try any available runtime
                self.docker
                    .as_ref()
                    .map(|r| r as &dyn SandboxRuntime)
                    .or_else(|| self.podman.as_ref().map(|r| r as &dyn SandboxRuntime))
                    .or_else(|| self.native.as_ref().map(|r| r as &dyn SandboxRuntime))
            }
        }
    }

    /// Execute code
    pub async fn execute(&self, request: ExecutionRequest) -> Result<ExecutionResult, SandboxError> {
        // Get language configuration
        let language_config = LANGUAGE_CONFIGS
            .iter()
            .find(|l| l.id == request.language || l.aliases.contains(&request.language.as_str()))
            .ok_or_else(|| SandboxError::LanguageNotSupported(request.language.clone()))?;

        // Check if language is enabled
        if !self.config.enabled_languages.contains(&language_config.id.to_string()) {
            return Err(SandboxError::LanguageNotSupported(format!(
                "{} is disabled in configuration",
                language_config.name
            )));
        }

        // Get runtime
        let runtime = self
            .get_runtime(request.runtime)
            .ok_or_else(|| SandboxError::RuntimeNotAvailable("No runtime available".to_string()))?;

        // Build execution config
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(
                request.timeout_secs.unwrap_or(self.config.default_timeout_secs),
            ),
            memory_limit_mb: request
                .memory_limit_mb
                .unwrap_or(self.config.default_memory_limit_mb),
            cpu_limit_percent: request
                .cpu_limit_percent
                .unwrap_or(self.config.default_cpu_limit_percent),
            network_enabled: request.network_enabled.unwrap_or(self.config.network_enabled),
            max_output_size: self.config.max_output_size,
        };

        // Execute and handle errors
        match runtime.execute(&request, language_config, &exec_config).await {
            Ok(result) => Ok(result),
            Err(e) => Ok(ExecutionResult::error(
                request.id.clone(),
                e.to_string(),
                runtime.runtime_type(),
                request.language.clone(),
            )),
        }
    }

    /// Get runtime information (type and version)
    pub async fn get_runtime_info(&self, runtime_type: RuntimeType) -> Option<(RuntimeType, String)> {
        match runtime_type {
            RuntimeType::Docker => {
                if let Some(ref docker) = self.docker {
                    if let Ok(version) = docker.get_version().await {
                        return Some((docker.runtime_type(), version));
                    }
                }
            }
            RuntimeType::Podman => {
                if let Some(ref podman) = self.podman {
                    if let Ok(version) = podman.get_version().await {
                        return Some((podman.runtime_type(), version));
                    }
                }
            }
            RuntimeType::Native => {
                if let Some(ref native) = self.native {
                    if let Ok(version) = native.get_version().await {
                        return Some((native.runtime_type(), version));
                    }
                }
            }
        }
        None
    }

    /// Cleanup all runtimes
    pub async fn cleanup_all(&self) -> Result<(), SandboxError> {
        if let Some(ref docker) = self.docker {
            docker.cleanup().await?;
        }
        if let Some(ref podman) = self.podman {
            podman.cleanup().await?;
        }
        if let Some(ref native) = self.native {
            native.cleanup().await?;
        }
        Ok(())
    }

    /// Prepare image for a language
    pub async fn prepare_language(&self, language: &str) -> Result<(), SandboxError> {
        // Try Docker first, then Podman
        if let Some(ref docker) = self.docker {
            return docker.prepare_image(language).await;
        }
        if let Some(ref podman) = self.podman {
            return podman.prepare_image(language).await;
        }
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
