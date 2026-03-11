//! Runtime abstraction for sandbox execution
//!
//! Provides a unified interface for different container runtimes.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Duration;
use thiserror::Error;

use super::languages::{LanguageConfig, LANGUAGE_CONFIGS};
use super::{DockerRuntime, NativeRuntime, PodmanRuntime, SandboxConfig};

/// Sandbox execution errors
#[derive(Error, Debug)]
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

/// Execution diagnostics category
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiagnosticsCategory {
    Validation,
    SecurityPolicy,
    RuntimeUnavailable,
    ResourceLimit,
    InternalFailure,
}

/// Structured execution diagnostics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionDiagnostics {
    pub category: DiagnosticsCategory,
    pub code: String,
    pub message: Option<String>,
    pub remediation_hint: Option<String>,
}

/// Snapshot of effective execution policy applied at runtime
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionPolicySnapshot {
    pub profile: String,
    pub timeout_secs: u64,
    pub memory_limit_mb: u64,
    pub network_enabled: bool,
    pub requested_runtime: Option<RuntimeType>,
    pub selected_runtime: Option<RuntimeType>,
}

/// Policy profile used for request validation and runtime selection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxPolicyProfile {
    pub id: String,
    pub max_timeout_secs: u64,
    pub max_memory_limit_mb: u64,
    pub allow_network: bool,
    pub allowed_runtimes: Vec<RuntimeType>,
}

impl SandboxPolicyProfile {
    fn strict() -> Self {
        Self {
            id: "strict".to_string(),
            max_timeout_secs: 30,
            max_memory_limit_mb: 256,
            allow_network: false,
            allowed_runtimes: vec![RuntimeType::Docker, RuntimeType::Podman],
        }
    }

    fn balanced() -> Self {
        Self {
            id: "balanced".to_string(),
            max_timeout_secs: 60,
            max_memory_limit_mb: 512,
            allow_network: false,
            allowed_runtimes: vec![RuntimeType::Docker, RuntimeType::Podman, RuntimeType::Native],
        }
    }

    fn permissive() -> Self {
        Self {
            id: "permissive".to_string(),
            max_timeout_secs: 120,
            max_memory_limit_mb: 1024,
            allow_network: true,
            allowed_runtimes: vec![RuntimeType::Docker, RuntimeType::Podman, RuntimeType::Native],
        }
    }
}

/// Preflight status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PreflightStatus {
    Ready,
    Blocked,
}

/// Preflight evaluation result returned before execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxPreflightResult {
    pub status: PreflightStatus,
    pub reason_code: String,
    pub message: String,
    pub remediation_hint: Option<String>,
    pub selected_runtime: Option<RuntimeType>,
    pub policy_profile: String,
}

/// A single line of output streamed during execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputLine {
    /// Execution ID this line belongs to
    pub execution_id: String,
    /// Stream type: "stdout" or "stderr"
    pub stream: String,
    /// The text content of this line
    pub text: String,
    /// Timestamp in milliseconds since execution started
    pub timestamp_ms: u64,
}

/// Execution request
#[derive(Debug, Clone, Serialize, Deserialize)]
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

    /// Policy profile identifier used to validate bounds
    pub policy_profile: Option<String>,

    /// Compiler/interpreter settings (optional)
    #[serde(default)]
    pub compiler_settings: Option<CompilerSettings>,
}

/// Compiler and interpreter settings for fine-tuning execution
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompilerSettings {
    /// C++ standard: "c++11", "c++14", "c++17", "c++20", "c++23"
    pub cpp_standard: Option<String>,

    /// Optimization level: "-O0", "-O1", "-O2", "-O3", "-Os"
    pub optimization: Option<String>,

    /// C compiler: "gcc", "clang"
    pub c_compiler: Option<String>,

    /// C++ compiler: "g++", "clang++"
    pub cpp_compiler: Option<String>,

    /// Enable warnings (-Wall -Wextra)
    pub enable_warnings: Option<bool>,

    /// Rust edition: "2015", "2018", "2021", "2024"
    pub rust_edition: Option<String>,

    /// Rust release mode (optimized build)
    pub rust_release: Option<bool>,

    /// Python unbuffered output (PYTHONUNBUFFERED=1)
    pub python_unbuffered: Option<bool>,

    /// Python optimize bytecode (PYTHONOPTIMIZE=1)
    pub python_optimize: Option<bool>,

    /// Additional custom compiler/interpreter arguments
    pub custom_args: Option<Vec<String>>,
}

impl CompilerSettings {
    /// Apply compiler settings to a compile command string, returning the modified command.
    /// Handles C, C++, and Rust compile commands.
    pub fn apply_to_compile_cmd(&self, compile_cmd: &str, language: &str) -> String {
        let mut cmd = compile_cmd.to_string();

        match language {
            "c" => {
                // C compiler swap: gcc -> clang
                if let Some(compiler) = &self.c_compiler {
                    if compiler == "clang" {
                        cmd = cmd.replacen("gcc ", "clang ", 1);
                    }
                }
                // Optimization
                if let Some(opt) = &self.optimization {
                    cmd = format!("{} {}", cmd, opt);
                }
                // Warnings
                if self.enable_warnings == Some(true) {
                    cmd = format!("{} -Wall -Wextra", cmd);
                }
            }
            "cpp" | "c++" => {
                // C++ compiler swap: g++ -> clang++
                if let Some(compiler) = &self.cpp_compiler {
                    if compiler == "clang++" {
                        cmd = cmd.replacen("g++ ", "clang++ ", 1);
                    }
                }
                // C++ standard: replace the default -std=c++20
                if let Some(std) = &self.cpp_standard {
                    if cmd.contains("-std=") {
                        // Replace existing -std= flag
                        let re_start = cmd.find("-std=").unwrap();
                        let re_end = cmd[re_start..]
                            .find(' ')
                            .map(|i| re_start + i)
                            .unwrap_or(cmd.len());
                        cmd.replace_range(re_start..re_end, &format!("-std={}", std));
                    } else {
                        cmd = format!("{} -std={}", cmd, std);
                    }
                }
                // Optimization
                if let Some(opt) = &self.optimization {
                    cmd = format!("{} {}", cmd, opt);
                }
                // Warnings
                if self.enable_warnings == Some(true) {
                    cmd = format!("{} -Wall -Wextra", cmd);
                }
            }
            "rust" => {
                // Rust edition
                if let Some(edition) = &self.rust_edition {
                    cmd = format!("{} --edition {}", cmd, edition);
                }
                // Release mode optimization
                if self.rust_release == Some(true) {
                    cmd = format!("{} -O", cmd);
                }
            }
            _ => {}
        }

        // Append custom args
        if let Some(extra) = &self.custom_args {
            for arg in extra {
                cmd = format!("{} {}", cmd, arg);
            }
        }

        cmd
    }

    /// Build extra environment variables based on settings (e.g., Python flags).
    pub fn env_vars(&self, language: &str) -> HashMap<String, String> {
        let mut env = HashMap::new();
        if language == "python" {
            if self.python_unbuffered == Some(true) {
                env.insert("PYTHONUNBUFFERED".to_string(), "1".to_string());
            }
            if self.python_optimize == Some(true) {
                env.insert("PYTHONOPTIMIZE".to_string(), "1".to_string());
            }
        }
        env
    }
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
            policy_profile: None,
            compiler_settings: None,
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

    /// Structured diagnostics for validation/security/runtime failures
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub diagnostics: Option<ExecutionDiagnostics>,

    /// Effective policy snapshot applied to this execution
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_snapshot: Option<ExecutionPolicySnapshot>,
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
            diagnostics: None,
            policy_snapshot: None,
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
            diagnostics: None,
            policy_snapshot: None,
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
            diagnostics: Some(ExecutionDiagnostics {
                category: DiagnosticsCategory::ResourceLimit,
                code: "execution_timeout".to_string(),
                message: Some(format!("Execution timeout after {} seconds", timeout_secs)),
                remediation_hint: Some(
                    "Increase timeout within policy limits or optimize the code path.".to_string(),
                ),
            }),
            policy_snapshot: None,
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
    pub workspace_dir: Option<PathBuf>,
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

    /// Execute code with a sender for streaming output lines.
    /// Default implementation calls `execute` and ignores the sender.
    async fn execute_with_sender(
        &self,
        request: &ExecutionRequest,
        language_config: &LanguageConfig,
        exec_config: &ExecutionConfig,
        output_tx: Option<tokio::sync::mpsc::Sender<OutputLine>>,
    ) -> Result<ExecutionResult, SandboxError> {
        let _ = output_tx;
        self.execute(request, language_config, exec_config).await
    }

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
    /// Languages available for native execution
    available_languages: Vec<String>,
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
        let mut native = if config.enable_native {
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

        // Detect available languages for native runtime
        let mut available_languages = Vec::new();
        if let Some(ref mut native) = native {
            log::info!("Detecting available native languages...");
            native.detect_available_languages().await;
            available_languages = native.get_available_languages().to_vec();
            log::info!(
                "Detected {} native language(s): {:?}",
                available_languages.len(),
                available_languages
            );
        }

        Ok(Self {
            docker,
            podman,
            native,
            config,
            available_runtimes,
            available_languages,
        })
    }

    /// Get available runtimes
    pub fn get_available_runtimes(&self) -> Vec<RuntimeType> {
        self.available_runtimes.clone()
    }

    /// Get languages available for native execution
    pub fn get_available_languages(&self) -> Vec<String> {
        self.available_languages.clone()
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

    fn resolve_policy_profile(&self, profile_name: Option<&str>) -> SandboxPolicyProfile {
        match profile_name.unwrap_or("balanced") {
            "strict" => SandboxPolicyProfile::strict(),
            "permissive" => SandboxPolicyProfile::permissive(),
            _ => SandboxPolicyProfile::balanced(),
        }
    }

    fn resolve_runtime_for_profile(
        &self,
        requested: Option<RuntimeType>,
        profile: &SandboxPolicyProfile,
    ) -> Option<RuntimeType> {
        if let Some(runtime) = requested {
            if profile.allowed_runtimes.contains(&runtime) && self.is_runtime_available(runtime) {
                return Some(runtime);
            }
            return None;
        }

        if profile
            .allowed_runtimes
            .contains(&self.config.preferred_runtime)
            && self.is_runtime_available(self.config.preferred_runtime)
        {
            return Some(self.config.preferred_runtime);
        }

        [RuntimeType::Docker, RuntimeType::Podman, RuntimeType::Native]
            .into_iter()
            .find(|runtime| {
                profile.allowed_runtimes.contains(runtime) && self.is_runtime_available(*runtime)
            })
    }

    fn map_error_to_diagnostics(error: &SandboxError) -> ExecutionDiagnostics {
        match error {
            SandboxError::RuntimeNotAvailable(message) => ExecutionDiagnostics {
                category: DiagnosticsCategory::RuntimeUnavailable,
                code: "runtime_unavailable".to_string(),
                message: Some(message.clone()),
                remediation_hint: Some(
                    "Enable a supported runtime or install Docker/Podman on this machine."
                        .to_string(),
                ),
            },
            SandboxError::LanguageNotSupported(message) => ExecutionDiagnostics {
                category: DiagnosticsCategory::Validation,
                code: "language_not_supported".to_string(),
                message: Some(message.clone()),
                remediation_hint: Some(
                    "Choose an enabled language or update sandbox language settings.".to_string(),
                ),
            },
            SandboxError::Timeout(secs) => ExecutionDiagnostics {
                category: DiagnosticsCategory::ResourceLimit,
                code: "timeout".to_string(),
                message: Some(format!("Invalid or exceeded timeout setting: {}s", secs)),
                remediation_hint: Some(
                    "Use a timeout greater than 0 and within the selected policy bounds."
                        .to_string(),
                ),
            },
            SandboxError::ResourceLimit(message) => ExecutionDiagnostics {
                category: DiagnosticsCategory::ResourceLimit,
                code: "resource_limit".to_string(),
                message: Some(message.clone()),
                remediation_hint: Some(
                    "Reduce resource requests or switch to a policy profile with higher limits."
                        .to_string(),
                ),
            },
            SandboxError::SecurityViolation(message) => ExecutionDiagnostics {
                category: DiagnosticsCategory::SecurityPolicy,
                code: "security_policy_violation".to_string(),
                message: Some(message.clone()),
                remediation_hint: Some(
                    "Disable restricted options (for example network) or use an allowed profile."
                        .to_string(),
                ),
            },
            SandboxError::ContainerError(message) => ExecutionDiagnostics {
                category: DiagnosticsCategory::RuntimeUnavailable,
                code: "container_runtime_error".to_string(),
                message: Some(message.clone()),
                remediation_hint: Some(
                    "Check container runtime health and image availability.".to_string(),
                ),
            },
            SandboxError::ExecutionFailed(_)
            | SandboxError::Config(_)
            | SandboxError::Io(_) => ExecutionDiagnostics {
                category: DiagnosticsCategory::InternalFailure,
                code: "execution_internal_failure".to_string(),
                message: Some(error.to_string()),
                remediation_hint: Some(
                    "Retry the execution and inspect sandbox logs for additional details."
                        .to_string(),
                ),
            },
        }
    }

    pub fn preflight(&self, request: &ExecutionRequest) -> SandboxPreflightResult {
        let profile = self.resolve_policy_profile(request.policy_profile.as_deref());

        let timeout_secs = request.timeout_secs.unwrap_or(self.config.default_timeout_secs);
        if timeout_secs == 0 {
            return SandboxPreflightResult {
                status: PreflightStatus::Blocked,
                reason_code: "invalid_timeout".to_string(),
                message: "Timeout must be greater than 0 seconds.".to_string(),
                remediation_hint: Some(
                    "Provide a timeout greater than 0 seconds before running.".to_string(),
                ),
                selected_runtime: None,
                policy_profile: profile.id,
            };
        }
        if timeout_secs > profile.max_timeout_secs {
            return SandboxPreflightResult {
                status: PreflightStatus::Blocked,
                reason_code: "timeout_out_of_bounds".to_string(),
                message: format!(
                    "Requested timeout {}s exceeds '{}' policy limit of {}s.",
                    timeout_secs, profile.id, profile.max_timeout_secs
                ),
                remediation_hint: Some(
                    "Reduce timeout or select a profile with higher limits.".to_string(),
                ),
                selected_runtime: None,
                policy_profile: profile.id,
            };
        }

        let memory_mb = request
            .memory_limit_mb
            .unwrap_or(self.config.default_memory_limit_mb);
        if memory_mb == 0 {
            return SandboxPreflightResult {
                status: PreflightStatus::Blocked,
                reason_code: "invalid_memory".to_string(),
                message: "Memory limit must be greater than 0 MB.".to_string(),
                remediation_hint: Some(
                    "Provide a memory limit greater than 0 MB before running.".to_string(),
                ),
                selected_runtime: None,
                policy_profile: profile.id,
            };
        }
        if memory_mb > profile.max_memory_limit_mb {
            return SandboxPreflightResult {
                status: PreflightStatus::Blocked,
                reason_code: "memory_out_of_bounds".to_string(),
                message: format!(
                    "Requested memory {} MB exceeds '{}' policy limit of {} MB.",
                    memory_mb, profile.id, profile.max_memory_limit_mb
                ),
                remediation_hint: Some(
                    "Reduce memory limit or select a profile with higher bounds.".to_string(),
                ),
                selected_runtime: None,
                policy_profile: profile.id,
            };
        }

        let network_enabled = request.network_enabled.unwrap_or(self.config.network_enabled);
        if network_enabled && !self.config.network_enabled {
            return SandboxPreflightResult {
                status: PreflightStatus::Blocked,
                reason_code: "network_not_allowed".to_string(),
                message: "Network access is disabled in sandbox configuration.".to_string(),
                remediation_hint: Some(
                    "Disable network access or update sandbox configuration.".to_string(),
                ),
                selected_runtime: None,
                policy_profile: profile.id,
            };
        }
        if network_enabled && !profile.allow_network {
            return SandboxPreflightResult {
                status: PreflightStatus::Blocked,
                reason_code: "network_not_allowed".to_string(),
                message: format!(
                    "Network access is blocked by '{}' policy profile.",
                    profile.id
                ),
                remediation_hint: Some(
                    "Select a profile that allows network access or disable network for this run."
                        .to_string(),
                ),
                selected_runtime: None,
                policy_profile: profile.id,
            };
        }

        let language_config = match LANGUAGE_CONFIGS
            .iter()
            .find(|l| l.id == request.language || l.aliases.contains(&request.language.as_str()))
        {
            Some(language) => language,
            None => {
                return SandboxPreflightResult {
                    status: PreflightStatus::Blocked,
                    reason_code: "unsupported_language".to_string(),
                    message: format!("Language '{}' is not supported.", request.language),
                    remediation_hint: Some(
                        "Select a supported language from the sandbox language selector."
                            .to_string(),
                    ),
                    selected_runtime: None,
                    policy_profile: profile.id,
                }
            }
        };

        if !self
            .config
            .enabled_languages
            .contains(&language_config.id.to_string())
        {
            return SandboxPreflightResult {
                status: PreflightStatus::Blocked,
                reason_code: "language_disabled".to_string(),
                message: format!("Language '{}' is disabled.", language_config.name),
                remediation_hint: Some(
                    "Enable this language in sandbox settings before executing.".to_string(),
                ),
                selected_runtime: None,
                policy_profile: profile.id,
            };
        }

        if let Some(runtime) = request.runtime {
            if !profile.allowed_runtimes.contains(&runtime) {
                return SandboxPreflightResult {
                    status: PreflightStatus::Blocked,
                    reason_code: "runtime_not_allowed".to_string(),
                    message: format!(
                        "Runtime '{}' is not allowed by '{}' policy profile.",
                        runtime, profile.id
                    ),
                    remediation_hint: Some(
                        "Pick a runtime allowed by the selected policy profile.".to_string(),
                    ),
                    selected_runtime: None,
                    policy_profile: profile.id,
                };
            }
        }

        let selected_runtime = match self.resolve_runtime_for_profile(request.runtime, &profile) {
            Some(runtime) => runtime,
            None => {
                return SandboxPreflightResult {
                    status: PreflightStatus::Blocked,
                    reason_code: "runtime_unavailable".to_string(),
                    message: "No allowed runtime is available for this request.".to_string(),
                    remediation_hint: Some(
                        "Start an available runtime (Docker/Podman) or switch runtime/profile."
                            .to_string(),
                    ),
                    selected_runtime: None,
                    policy_profile: profile.id,
                }
            }
        };

        if selected_runtime == RuntimeType::Native
            && !self.available_languages.contains(&language_config.id.to_string())
        {
            return SandboxPreflightResult {
                status: PreflightStatus::Blocked,
                reason_code: "language_unavailable".to_string(),
                message: format!(
                    "Language '{}' is not available in native runtime.",
                    language_config.name
                ),
                remediation_hint: Some(
                    "Install the language toolchain or switch to a container runtime.".to_string(),
                ),
                selected_runtime: Some(selected_runtime),
                policy_profile: profile.id,
            };
        }

        SandboxPreflightResult {
            status: PreflightStatus::Ready,
            reason_code: "ok".to_string(),
            message: "Sandbox preflight checks passed.".to_string(),
            remediation_hint: None,
            selected_runtime: Some(selected_runtime),
            policy_profile: profile.id,
        }
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
        let preflight = self.preflight(&request);
        let profile = self.resolve_policy_profile(request.policy_profile.as_deref());

        let timeout_secs = request.timeout_secs.unwrap_or(self.config.default_timeout_secs);
        let memory_mb = request
            .memory_limit_mb
            .unwrap_or(self.config.default_memory_limit_mb);
        let network_enabled = request.network_enabled.unwrap_or(self.config.network_enabled);

        if matches!(preflight.status, PreflightStatus::Blocked) {
            let diagnostics = match preflight.reason_code.as_str() {
                "network_not_allowed" => ExecutionDiagnostics {
                    category: DiagnosticsCategory::SecurityPolicy,
                    code: preflight.reason_code.clone(),
                    message: Some(preflight.message.clone()),
                    remediation_hint: preflight.remediation_hint.clone(),
                },
                "runtime_unavailable" | "language_unavailable" => ExecutionDiagnostics {
                    category: DiagnosticsCategory::RuntimeUnavailable,
                    code: preflight.reason_code.clone(),
                    message: Some(preflight.message.clone()),
                    remediation_hint: preflight.remediation_hint.clone(),
                },
                "timeout_out_of_bounds" | "memory_out_of_bounds" => ExecutionDiagnostics {
                    category: DiagnosticsCategory::ResourceLimit,
                    code: preflight.reason_code.clone(),
                    message: Some(preflight.message.clone()),
                    remediation_hint: preflight.remediation_hint.clone(),
                },
                _ => ExecutionDiagnostics {
                    category: DiagnosticsCategory::Validation,
                    code: preflight.reason_code.clone(),
                    message: Some(preflight.message.clone()),
                    remediation_hint: preflight.remediation_hint.clone(),
                },
            };

            return Ok(ExecutionResult {
                id: request.id.clone(),
                status: ExecutionStatus::Failed,
                stdout: String::new(),
                stderr: String::new(),
                exit_code: None,
                execution_time_ms: 0,
                memory_used_bytes: None,
                error: Some(preflight.message.clone()),
                runtime: preflight.selected_runtime.unwrap_or(RuntimeType::Native),
                language: request.language.clone(),
                diagnostics: Some(diagnostics),
                policy_snapshot: Some(ExecutionPolicySnapshot {
                    profile: profile.id.clone(),
                    timeout_secs,
                    memory_limit_mb: memory_mb,
                    network_enabled,
                    requested_runtime: request.runtime,
                    selected_runtime: preflight.selected_runtime,
                }),
            });
        }

        // Get language configuration (safe because preflight already validated support)
        let language_config = match LANGUAGE_CONFIGS
            .iter()
            .find(|l| l.id == request.language || l.aliases.contains(&request.language.as_str()))
        {
            Some(language) => language,
            None => {
                return Ok(ExecutionResult {
                    id: request.id.clone(),
                    status: ExecutionStatus::Failed,
                    stdout: String::new(),
                    stderr: String::new(),
                    exit_code: None,
                    execution_time_ms: 0,
                    memory_used_bytes: None,
                    error: Some(format!("Language '{}' is not supported.", request.language)),
                    runtime: RuntimeType::Native,
                    language: request.language.clone(),
                    diagnostics: Some(ExecutionDiagnostics {
                        category: DiagnosticsCategory::Validation,
                        code: "unsupported_language".to_string(),
                        message: Some(format!(
                            "Language '{}' is not supported.",
                            request.language
                        )),
                        remediation_hint: Some(
                            "Select a supported language from the sandbox selector.".to_string(),
                        ),
                    }),
                    policy_snapshot: None,
                })
            }
        };

        let selected_runtime = preflight.selected_runtime.unwrap_or(RuntimeType::Native);
        let runtime = self.get_runtime_by_type(selected_runtime).ok_or_else(|| {
            SandboxError::RuntimeNotAvailable(format!(
                "Runtime '{}' is no longer available",
                selected_runtime
            ))
        })?;

        let cpu_percent = request
            .cpu_limit_percent
            .unwrap_or(self.config.default_cpu_limit_percent);

        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(timeout_secs),
            memory_limit_mb: memory_mb,
            cpu_limit_percent: cpu_percent,
            network_enabled,
            max_output_size: self.config.max_output_size,
            workspace_dir: self.config.workspace_dir.clone(),
        };

        let policy_snapshot = ExecutionPolicySnapshot {
            profile: profile.id,
            timeout_secs,
            memory_limit_mb: memory_mb,
            network_enabled,
            requested_runtime: request.runtime,
            selected_runtime: Some(selected_runtime),
        };

        log::info!(
            "Starting execution: id={}, language={}, runtime={:?}",
            request.id,
            request.language,
            runtime.runtime_type()
        );

        let mut result = match runtime.execute(&request, language_config, &exec_config).await {
            Ok(result) => result,
            Err(error) => {
                log::error!("Execution failed: id={}, error={}", request.id, error);
                let mut result = ExecutionResult::error(
                    request.id.clone(),
                    error.to_string(),
                    runtime.runtime_type(),
                    request.language.clone(),
                );
                result.diagnostics = Some(Self::map_error_to_diagnostics(&error));
                result
            }
        };

        if result.diagnostics.is_none() && matches!(result.status, ExecutionStatus::Timeout) {
            result.diagnostics = Some(ExecutionDiagnostics {
                category: DiagnosticsCategory::ResourceLimit,
                code: "execution_timeout".to_string(),
                message: result.error.clone(),
                remediation_hint: Some(
                    "Increase timeout within policy limits or optimize execution.".to_string(),
                ),
            });
        }

        result.policy_snapshot = Some(policy_snapshot);
        Ok(result)
    }

    /// Execute code with streaming output via mpsc sender
    pub async fn execute_streaming(
        &self,
        request: ExecutionRequest,
        output_tx: tokio::sync::mpsc::Sender<OutputLine>,
    ) -> Result<ExecutionResult, SandboxError> {
        log::debug!(
            "SandboxManager.execute_streaming: language={}, id={}",
            request.language, request.id
        );
        let preflight = self.preflight(&request);
        let profile = self.resolve_policy_profile(request.policy_profile.as_deref());

        let timeout_secs = request.timeout_secs.unwrap_or(self.config.default_timeout_secs);
        let memory_mb = request
            .memory_limit_mb
            .unwrap_or(self.config.default_memory_limit_mb);
        let network_enabled = request.network_enabled.unwrap_or(self.config.network_enabled);

        if matches!(preflight.status, PreflightStatus::Blocked) {
            return Ok(ExecutionResult {
                id: request.id.clone(),
                status: ExecutionStatus::Failed,
                stdout: String::new(),
                stderr: String::new(),
                exit_code: None,
                execution_time_ms: 0,
                memory_used_bytes: None,
                error: Some(preflight.message.clone()),
                runtime: preflight.selected_runtime.unwrap_or(RuntimeType::Native),
                language: request.language.clone(),
                diagnostics: Some(ExecutionDiagnostics {
                    category: DiagnosticsCategory::Validation,
                    code: preflight.reason_code.clone(),
                    message: Some(preflight.message.clone()),
                    remediation_hint: preflight.remediation_hint.clone(),
                }),
                policy_snapshot: Some(ExecutionPolicySnapshot {
                    profile: profile.id.clone(),
                    timeout_secs,
                    memory_limit_mb: memory_mb,
                    network_enabled,
                    requested_runtime: request.runtime,
                    selected_runtime: preflight.selected_runtime,
                }),
            });
        }

        let language_config = match LANGUAGE_CONFIGS
            .iter()
            .find(|l| l.id == request.language || l.aliases.contains(&request.language.as_str()))
        {
            Some(language) => language,
            None => {
                return Ok(ExecutionResult {
                    id: request.id.clone(),
                    status: ExecutionStatus::Failed,
                    stdout: String::new(),
                    stderr: String::new(),
                    exit_code: None,
                    execution_time_ms: 0,
                    memory_used_bytes: None,
                    error: Some(format!("Language '{}' is not supported.", request.language)),
                    runtime: RuntimeType::Native,
                    language: request.language.clone(),
                    diagnostics: Some(ExecutionDiagnostics {
                        category: DiagnosticsCategory::Validation,
                        code: "unsupported_language".to_string(),
                        message: Some(format!(
                            "Language '{}' is not supported.",
                            request.language
                        )),
                        remediation_hint: Some(
                            "Select a supported language from the sandbox selector.".to_string(),
                        ),
                    }),
                    policy_snapshot: None,
                })
            }
        };

        let selected_runtime = preflight.selected_runtime.unwrap_or(RuntimeType::Native);
        let runtime = self.get_runtime_by_type(selected_runtime).ok_or_else(|| {
            SandboxError::RuntimeNotAvailable(format!(
                "Runtime '{}' is no longer available",
                selected_runtime
            ))
        })?;

        let cpu_percent = request
            .cpu_limit_percent
            .unwrap_or(self.config.default_cpu_limit_percent);
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(timeout_secs),
            memory_limit_mb: memory_mb,
            cpu_limit_percent: cpu_percent,
            network_enabled,
            max_output_size: self.config.max_output_size,
            workspace_dir: self.config.workspace_dir.clone(),
        };

        let policy_snapshot = ExecutionPolicySnapshot {
            profile: profile.id,
            timeout_secs,
            memory_limit_mb: memory_mb,
            network_enabled,
            requested_runtime: request.runtime,
            selected_runtime: Some(selected_runtime),
        };

        let mut result = match runtime
            .execute_with_sender(&request, language_config, &exec_config, Some(output_tx))
            .await
        {
            Ok(result) => result,
            Err(error) => {
                log::error!("Streaming execution failed: id={}, error={}", request.id, error);
                let mut result = ExecutionResult::error(
                    request.id.clone(),
                    error.to_string(),
                    runtime.runtime_type(),
                    request.language.clone(),
                );
                result.diagnostics = Some(Self::map_error_to_diagnostics(&error));
                result
            }
        };

        if result.diagnostics.is_none() && matches!(result.status, ExecutionStatus::Timeout) {
            result.diagnostics = Some(ExecutionDiagnostics {
                category: DiagnosticsCategory::ResourceLimit,
                code: "execution_timeout".to_string(),
                message: result.error.clone(),
                remediation_hint: Some(
                    "Increase timeout within policy limits or optimize execution.".to_string(),
                ),
            });
        }

        result.policy_snapshot = Some(policy_snapshot);
        Ok(result)
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

    fn build_preflight_test_manager(
        config: SandboxConfig,
        available_runtimes: Vec<RuntimeType>,
        available_languages: Vec<&str>,
    ) -> SandboxManager {
        SandboxManager {
            docker: None,
            podman: None,
            native: None,
            config,
            available_runtimes,
            available_languages: available_languages
                .into_iter()
                .map(std::string::ToString::to_string)
                .collect(),
        }
    }

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
            workspace_dir: None,
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
            workspace_dir: None,
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

    // ==================== Validation Tests ====================

    #[tokio::test]
    async fn test_sandbox_manager_execute_zero_timeout() {
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
        let request = ExecutionRequest::new("python", "print('hello')").with_timeout(0);
        let result = manager.execute(request).await;

        // Should fail with Timeout error for invalid timeout value
        assert!(result.is_err());
        match result {
            Err(SandboxError::Timeout(0)) => {}
            _ => panic!("Expected Timeout(0) error"),
        }
    }

    #[tokio::test]
    async fn test_sandbox_manager_execute_zero_memory() {
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
        let request = ExecutionRequest::new("python", "print('hello')").with_memory_limit(0);
        let result = manager.execute(request).await;

        // Should fail with ResourceLimit error
        assert!(result.is_err());
        match result {
            Err(SandboxError::ResourceLimit(msg)) => {
                assert!(msg.contains("Memory"));
            }
            _ => panic!("Expected ResourceLimit error"),
        }
    }

    #[tokio::test]
    async fn test_sandbox_manager_execute_network_security_violation() {
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
            network_enabled: false, // Network disabled in config
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };

        let manager = SandboxManager::new(config).await.unwrap();
        let mut request = ExecutionRequest::new("python", "print('hello')");
        request.network_enabled = Some(true); // Request network access
        let result = manager.execute(request).await;

        // Should fail with SecurityViolation error
        assert!(result.is_err());
        match result {
            Err(SandboxError::SecurityViolation(msg)) => {
                assert!(msg.contains("Network"));
            }
            _ => panic!("Expected SecurityViolation error"),
        }
    }

    #[test]
    fn test_preflight_ready_returns_runtime_and_profile() {
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
        let manager =
            build_preflight_test_manager(config, vec![RuntimeType::Native], vec!["python"]);
        let request = ExecutionRequest::new("python", "print('ok')");

        let preflight = manager.preflight(&request);

        assert!(matches!(preflight.status, PreflightStatus::Ready));
        assert_eq!(preflight.reason_code, "ok");
        assert_eq!(preflight.policy_profile, "balanced");
        assert_eq!(preflight.selected_runtime, Some(RuntimeType::Native));
    }

    #[test]
    fn test_preflight_blocked_runtime_not_allowed_has_remediation_hint() {
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
        let manager =
            build_preflight_test_manager(config, vec![RuntimeType::Native], vec!["python"]);
        let mut request = ExecutionRequest::new("python", "print('ok')");
        request.runtime = Some(RuntimeType::Native);
        request.policy_profile = Some("strict".to_string());

        let preflight = manager.preflight(&request);

        assert!(matches!(preflight.status, PreflightStatus::Blocked));
        assert_eq!(preflight.reason_code, "runtime_not_allowed");
        assert!(preflight
            .remediation_hint
            .as_deref()
            .unwrap_or_default()
            .contains("allowed"));
    }

    #[tokio::test]
    async fn test_execute_blocked_profile_violation_returns_structured_diagnostics() {
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
            network_enabled: true,
            workspace_dir: None,
            enabled_languages: vec!["python".to_string()],
        };
        let manager =
            build_preflight_test_manager(config, vec![RuntimeType::Native], vec!["python"]);
        let mut request = ExecutionRequest::new("python", "print('ok')");
        request.policy_profile = Some("strict".to_string());
        request.network_enabled = Some(true);

        let result = manager.execute(request).await.unwrap();
        let diagnostics = result.diagnostics.expect("diagnostics should be attached");
        let snapshot = result
            .policy_snapshot
            .expect("policy snapshot should be attached");

        assert!(matches!(result.status, ExecutionStatus::Failed));
        assert!(matches!(
            diagnostics.category,
            DiagnosticsCategory::SecurityPolicy
        ));
        assert_eq!(diagnostics.code, "network_not_allowed");
        assert_eq!(snapshot.profile, "strict");
        assert!(snapshot.network_enabled);
    }

    #[tokio::test]
    async fn test_execute_timeout_out_of_bounds_returns_resource_limit_diagnostics() {
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
        let manager =
            build_preflight_test_manager(config, vec![RuntimeType::Native], vec!["python"]);
        let mut request = ExecutionRequest::new("python", "print('ok')");
        request.policy_profile = Some("strict".to_string());
        request.timeout_secs = Some(999);

        let result = manager.execute(request).await.unwrap();
        let diagnostics = result.diagnostics.expect("diagnostics should be attached");

        assert!(matches!(result.status, ExecutionStatus::Failed));
        assert!(matches!(
            diagnostics.category,
            DiagnosticsCategory::ResourceLimit
        ));
        assert_eq!(diagnostics.code, "timeout_out_of_bounds");
    }

    #[tokio::test]
    async fn test_sandbox_manager_execute_with_limits() {
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
        // Test that execute_with_limits properly delegates to execute
        let result = manager
            .execute_with_limits("python".to_string(), "print('hello')".to_string(), 60, 512)
            .await;

        // Result depends on whether python is available, but should not panic
        let _ = result;
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

    // ==================== CompilerSettings Tests ====================

    #[test]
    fn test_compiler_settings_default() {
        let settings = CompilerSettings::default();
        assert!(settings.cpp_standard.is_none());
        assert!(settings.optimization.is_none());
        assert!(settings.c_compiler.is_none());
        assert!(settings.cpp_compiler.is_none());
        assert!(settings.enable_warnings.is_none());
        assert!(settings.rust_edition.is_none());
        assert!(settings.rust_release.is_none());
        assert!(settings.python_unbuffered.is_none());
        assert!(settings.python_optimize.is_none());
        assert!(settings.custom_args.is_none());
    }

    #[test]
    fn test_compiler_settings_serialization() {
        let settings = CompilerSettings {
            cpp_standard: Some("c++20".to_string()),
            optimization: Some("-O2".to_string()),
            enable_warnings: Some(true),
            ..Default::default()
        };

        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("\"cpp_standard\":\"c++20\""));
        assert!(json.contains("\"-O2\""));
        assert!(json.contains("\"enable_warnings\":true"));
    }

    #[test]
    fn test_compiler_settings_deserialization() {
        let json = r#"{
            "cpp_standard": "c++17",
            "optimization": "-O3",
            "rust_edition": "2021"
        }"#;
        let settings: CompilerSettings = serde_json::from_str(json).unwrap();
        assert_eq!(settings.cpp_standard, Some("c++17".to_string()));
        assert_eq!(settings.optimization, Some("-O3".to_string()));
        assert_eq!(settings.rust_edition, Some("2021".to_string()));
        assert!(settings.c_compiler.is_none());
    }

    #[test]
    fn test_compiler_settings_apply_c_clang() {
        let settings = CompilerSettings {
            c_compiler: Some("clang".to_string()),
            optimization: Some("-O2".to_string()),
            enable_warnings: Some(true),
            ..Default::default()
        };
        let result = settings.apply_to_compile_cmd("gcc -o main {file}", "c");
        assert!(result.contains("clang"));
        assert!(!result.contains("gcc"));
        assert!(result.contains("-O2"));
        assert!(result.contains("-Wall -Wextra"));
    }

    #[test]
    fn test_compiler_settings_apply_cpp_standard() {
        let settings = CompilerSettings {
            cpp_standard: Some("c++17".to_string()),
            ..Default::default()
        };
        let result = settings.apply_to_compile_cmd("g++ -std=c++20 -o main {file}", "cpp");
        assert!(result.contains("-std=c++17"));
        assert!(!result.contains("-std=c++20"));
    }

    #[test]
    fn test_compiler_settings_apply_cpp_clang() {
        let settings = CompilerSettings {
            cpp_compiler: Some("clang++".to_string()),
            ..Default::default()
        };
        let result = settings.apply_to_compile_cmd("g++ -o main {file}", "cpp");
        assert!(result.contains("clang++"));
        assert!(!result.contains("g++"));
    }

    #[test]
    fn test_compiler_settings_apply_rust_edition() {
        let settings = CompilerSettings {
            rust_edition: Some("2021".to_string()),
            rust_release: Some(true),
            ..Default::default()
        };
        let result = settings.apply_to_compile_cmd("rustc {file}", "rust");
        assert!(result.contains("--edition 2021"));
        assert!(result.contains("-O"));
    }

    #[test]
    fn test_compiler_settings_apply_custom_args() {
        let settings = CompilerSettings {
            custom_args: Some(vec!["-DFOO=1".to_string(), "-lm".to_string()]),
            ..Default::default()
        };
        let result = settings.apply_to_compile_cmd("gcc -o main {file}", "c");
        assert!(result.contains("-DFOO=1"));
        assert!(result.contains("-lm"));
    }

    #[test]
    fn test_compiler_settings_apply_noop_for_unknown_language() {
        let settings = CompilerSettings {
            optimization: Some("-O2".to_string()),
            ..Default::default()
        };
        let result = settings.apply_to_compile_cmd("javac {file}", "java");
        // Should not modify the base command (except custom_args)
        assert!(result.contains("javac"));
        // Java doesn't match C/C++/Rust branches, so -O2 is not appended
        assert!(!result.contains("-O2"));
    }

    #[test]
    fn test_compiler_settings_env_vars_python() {
        let settings = CompilerSettings {
            python_unbuffered: Some(true),
            python_optimize: Some(true),
            ..Default::default()
        };
        let env = settings.env_vars("python");
        assert_eq!(env.get("PYTHONUNBUFFERED"), Some(&"1".to_string()));
        assert_eq!(env.get("PYTHONOPTIMIZE"), Some(&"1".to_string()));
    }

    #[test]
    fn test_compiler_settings_env_vars_non_python() {
        let settings = CompilerSettings {
            python_unbuffered: Some(true),
            ..Default::default()
        };
        let env = settings.env_vars("rust");
        assert!(env.is_empty());
    }

    #[test]
    fn test_compiler_settings_env_vars_disabled() {
        let settings = CompilerSettings {
            python_unbuffered: Some(false),
            python_optimize: Some(false),
            ..Default::default()
        };
        let env = settings.env_vars("python");
        assert!(env.is_empty());
    }

    // ==================== OutputLine Tests ====================

    #[test]
    fn test_output_line_creation() {
        let line = OutputLine {
            execution_id: "exec-1".to_string(),
            stream: "stdout".to_string(),
            text: "Hello, World!".to_string(),
            timestamp_ms: 42,
        };
        assert_eq!(line.execution_id, "exec-1");
        assert_eq!(line.stream, "stdout");
        assert_eq!(line.text, "Hello, World!");
        assert_eq!(line.timestamp_ms, 42);
    }

    #[test]
    fn test_output_line_serialization() {
        let line = OutputLine {
            execution_id: "exec-1".to_string(),
            stream: "stderr".to_string(),
            text: "error: something failed".to_string(),
            timestamp_ms: 100,
        };
        let json = serde_json::to_string(&line).unwrap();
        assert!(json.contains("\"execution_id\":\"exec-1\""));
        assert!(json.contains("\"stream\":\"stderr\""));
        assert!(json.contains("\"timestamp_ms\":100"));
    }

    #[test]
    fn test_output_line_deserialization() {
        let json = r#"{
            "execution_id": "exec-2",
            "stream": "stdout",
            "text": "line content",
            "timestamp_ms": 250
        }"#;
        let line: OutputLine = serde_json::from_str(json).unwrap();
        assert_eq!(line.execution_id, "exec-2");
        assert_eq!(line.stream, "stdout");
        assert_eq!(line.text, "line content");
        assert_eq!(line.timestamp_ms, 250);
    }

    #[test]
    fn test_output_line_clone() {
        let line = OutputLine {
            execution_id: "exec-1".to_string(),
            stream: "stdout".to_string(),
            text: "data".to_string(),
            timestamp_ms: 10,
        };
        let cloned = line.clone();
        assert_eq!(line.execution_id, cloned.execution_id);
        assert_eq!(line.text, cloned.text);
    }

    // ==================== ExecutionRequest with CompilerSettings Tests ====================

    #[test]
    fn test_execution_request_compiler_settings_none_by_default() {
        let request = ExecutionRequest::new("python", "print('hello')");
        assert!(request.compiler_settings.is_none());
    }

    #[test]
    fn test_execution_request_with_compiler_settings() {
        let mut request = ExecutionRequest::new("cpp", "int main() {}");
        request.compiler_settings = Some(CompilerSettings {
            cpp_standard: Some("c++20".to_string()),
            optimization: Some("-O2".to_string()),
            ..Default::default()
        });
        assert!(request.compiler_settings.is_some());
        let settings = request.compiler_settings.unwrap();
        assert_eq!(settings.cpp_standard, Some("c++20".to_string()));
    }

    #[test]
    fn test_execution_request_deserialization_with_compiler_settings() {
        let json = r#"{
            "id": "test-id",
            "language": "cpp",
            "code": "int main() {}",
            "args": [],
            "env": {},
            "files": {},
            "compiler_settings": {
                "cpp_standard": "c++17",
                "optimization": "-O2"
            }
        }"#;
        let request: ExecutionRequest = serde_json::from_str(json).unwrap();
        assert!(request.compiler_settings.is_some());
        let settings = request.compiler_settings.unwrap();
        assert_eq!(settings.cpp_standard, Some("c++17".to_string()));
        assert_eq!(settings.optimization, Some("-O2".to_string()));
    }

    #[test]
    fn test_execution_request_deserialization_without_compiler_settings() {
        let json = r#"{
            "id": "test-id",
            "language": "python",
            "code": "print('hello')",
            "args": [],
            "env": {},
            "files": {}
        }"#;
        let request: ExecutionRequest = serde_json::from_str(json).unwrap();
        assert!(request.compiler_settings.is_none());
    }

    // ==================== Streaming Validation Tests ====================

    #[tokio::test]
    async fn test_sandbox_manager_execute_streaming_zero_timeout() {
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
        let request = ExecutionRequest::new("python", "print('hello')").with_timeout(0);
        let (tx, _rx) = tokio::sync::mpsc::channel(16);
        let result = manager.execute_streaming(request, tx).await;

        assert!(result.is_err());
        match result {
            Err(SandboxError::Timeout(0)) => {}
            _ => panic!("Expected Timeout(0) error"),
        }
    }

    #[tokio::test]
    async fn test_sandbox_manager_execute_streaming_disabled_language() {
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
            enabled_languages: vec![], // No languages
        };

        let manager = SandboxManager::new(config).await.unwrap();
        let request = ExecutionRequest::new("python", "print('hello')");
        let (tx, _rx) = tokio::sync::mpsc::channel(16);
        let result = manager.execute_streaming(request, tx).await;

        assert!(result.is_err());
    }
}
