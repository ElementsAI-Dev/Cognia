//! Process Management Module
//!
//! Provides local process operations for the agent:
//! - List running processes
//! - Get process details
//! - Start new processes (with restrictions)
//! - Terminate processes
//! - Monitor process status
//!
//! Security: All operations require explicit user approval and have allowlist restrictions.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

#[cfg(windows)]
mod windows;

#[cfg(unix)]
mod unix;

#[cfg(test)]
fn apply_filter_for_test(info: &ProcessInfo, filter: &ProcessFilter) -> bool {
    #[cfg(windows)]
    {
        return windows::apply_filter(info, filter);
    }
    #[cfg(unix)]
    {
        return unix::apply_filter(info, filter);
    }
    #[cfg(not(any(windows, unix)))]
    {
        let _ = (info, filter);
        false
    }
}

#[cfg(test)]
fn sort_processes_for_test(processes: &mut [ProcessInfo], sort_by: ProcessSortField, desc: bool) {
    #[cfg(windows)]
    {
        windows::sort_processes(processes, sort_by, desc);
        return;
    }
    #[cfg(unix)]
    {
        unix::sort_processes(processes, sort_by, desc);
        return;
    }
    #[cfg(not(any(windows, unix)))]
    {
        let _ = (processes, sort_by, desc);
    }
}

/// Maximum number of processes to list at once
pub const MAX_PROCESS_LIST: usize = 500;

/// Default timeout for process operations (seconds)
pub const DEFAULT_OPERATION_TIMEOUT: u64 = 30;

/// Process information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    /// Process ID
    pub pid: u32,
    /// Process name
    pub name: String,
    /// Executable path (if available)
    pub exe_path: Option<String>,
    /// Command line arguments
    pub cmd_line: Option<Vec<String>>,
    /// Parent process ID
    pub parent_pid: Option<u32>,
    /// CPU usage percentage (0-100)
    pub cpu_percent: Option<f32>,
    /// Memory usage in bytes
    pub memory_bytes: Option<u64>,
    /// Process status
    pub status: ProcessStatus,
    /// Start time (Unix timestamp)
    pub start_time: Option<u64>,
    /// User/owner
    pub user: Option<String>,
    /// Working directory
    pub cwd: Option<String>,
}

/// Process status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProcessStatus {
    Running,
    Sleeping,
    Stopped,
    Zombie,
    Unknown,
}

impl Default for ProcessStatus {
    fn default() -> Self {
        Self::Unknown
    }
}

/// Process filter for listing
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProcessFilter {
    /// Filter by name (partial match, case-insensitive)
    pub name: Option<String>,
    /// Filter by PID
    pub pid: Option<u32>,
    /// Filter by parent PID
    pub parent_pid: Option<u32>,
    /// Filter by user
    pub user: Option<String>,
    /// Minimum CPU usage
    pub min_cpu: Option<f32>,
    /// Minimum memory usage (bytes)
    pub min_memory: Option<u64>,
    /// Maximum number of results
    pub limit: Option<usize>,
    /// Sort by field
    pub sort_by: Option<ProcessSortField>,
    /// Sort descending
    pub sort_desc: Option<bool>,
}

/// Sort field for process list
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProcessSortField {
    Pid,
    Name,
    Cpu,
    Memory,
    StartTime,
}

/// Request to start a new process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartProcessRequest {
    /// Program path or name
    pub program: String,
    /// Command line arguments
    #[serde(default)]
    pub args: Vec<String>,
    /// Working directory
    pub cwd: Option<String>,
    /// Environment variables (merged with current)
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// Run in background (detached)
    #[serde(default = "default_true")]
    pub detached: bool,
    /// Timeout for process start (seconds)
    pub timeout_secs: Option<u64>,
    /// Capture stdout/stderr (for non-detached)
    #[serde(default)]
    pub capture_output: bool,
}

fn default_true() -> bool {
    true
}

/// Result of starting a process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartProcessResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// Process ID (if started successfully)
    pub pid: Option<u32>,
    /// Stdout output (if captured)
    pub stdout: Option<String>,
    /// Stderr output (if captured)
    pub stderr: Option<String>,
    /// Exit code (if process completed)
    pub exit_code: Option<i32>,
    /// Error message
    pub error: Option<String>,
    /// Duration in milliseconds
    pub duration_ms: Option<u64>,
}

/// Request to terminate a process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminateProcessRequest {
    /// Process ID to terminate
    pub pid: u32,
    /// Force kill (SIGKILL on Unix, TerminateProcess on Windows)
    #[serde(default)]
    pub force: bool,
    /// Timeout for graceful termination (seconds)
    pub timeout_secs: Option<u64>,
}

/// Result of terminating a process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminateProcessResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// Exit code (if available)
    pub exit_code: Option<i32>,
    /// Error message
    pub error: Option<String>,
}

/// Process manager configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessManagerConfig {
    /// Whether process management is enabled
    pub enabled: bool,
    /// Allowlist of programs that can be started (empty = all allowed)
    pub allowed_programs: Vec<String>,
    /// Denylist of programs that cannot be started
    pub denied_programs: Vec<String>,
    /// Whether to allow terminating any process
    pub allow_terminate_any: bool,
    /// Only allow terminating processes started by this app
    pub only_terminate_own: bool,
    /// Maximum concurrent processes to track
    pub max_tracked_processes: usize,
    /// Default timeout for operations
    pub default_timeout_secs: u64,
}

impl Default for ProcessManagerConfig {
    fn default() -> Self {
        Self {
            enabled: false, // Disabled by default for security
            allowed_programs: Vec::new(),
            denied_programs: vec![
                // Dangerous programs that should never be run
                "rm".to_string(),
                "del".to_string(),
                "format".to_string(),
                "dd".to_string(),
                "mkfs".to_string(),
                "shutdown".to_string(),
                "reboot".to_string(),
            ],
            allow_terminate_any: false,
            only_terminate_own: true,
            max_tracked_processes: 100,
            default_timeout_secs: DEFAULT_OPERATION_TIMEOUT,
        }
    }
}

/// Process manager state
pub struct ProcessManager {
    /// Configuration
    pub config: Arc<RwLock<ProcessManagerConfig>>,
    /// Tracked processes (PIDs started by this app)
    tracked_processes: Arc<RwLock<Vec<u32>>>,
    /// Config file path
    config_path: PathBuf,
}

impl ProcessManager {
    /// Create new process manager
    pub async fn new(config_path: PathBuf) -> Result<Self, ProcessError> {
        log::info!(
            "Initializing ProcessManager with config path: {:?}",
            config_path
        );

        // Load or create config
        let config = if config_path.exists() {
            log::debug!("Loading existing process manager config from {:?}", config_path);
            let content = tokio::fs::read_to_string(&config_path)
                .await
                .map_err(|e| ProcessError::Config(format!("Failed to read config: {}", e)))?;
            serde_json::from_str(&content)
                .map_err(|e| ProcessError::Config(format!("Failed to parse config: {}", e)))?
        } else {
            log::info!("No existing config found, using default process manager configuration");
            ProcessManagerConfig::default()
        };

        Ok(Self {
            config: Arc::new(RwLock::new(config)),
            tracked_processes: Arc::new(RwLock::new(Vec::new())),
            config_path,
        })
    }

    /// Save configuration to file
    pub async fn save_config(&self) -> Result<(), ProcessError> {
        let config = self.config.read().await;
        let content = serde_json::to_string_pretty(&*config)
            .map_err(|e| ProcessError::Config(format!("Failed to serialize config: {}", e)))?;

        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| ProcessError::Config(format!("Failed to create config dir: {}", e)))?;
        }

        tokio::fs::write(&self.config_path, content)
            .await
            .map_err(|e| ProcessError::Config(format!("Failed to write config: {}", e)))?;

        Ok(())
    }

    /// Update configuration
    pub async fn update_config(&self, new_config: ProcessManagerConfig) -> Result<(), ProcessError> {
        {
            let mut config = self.config.write().await;
            *config = new_config;
        }
        self.save_config().await
    }

    /// Get current configuration
    pub async fn get_config(&self) -> ProcessManagerConfig {
        self.config.read().await.clone()
    }

    /// Check if a program is allowed to be started
    pub async fn is_program_allowed(&self, program: &str) -> bool {
        let config = self.config.read().await;

        if !config.enabled {
            return false;
        }

        // Check denylist first
        let program_lower = program.to_lowercase();
        for denied in &config.denied_programs {
            if program_lower.contains(&denied.to_lowercase()) {
                log::warn!("Program '{}' is in denylist", program);
                return false;
            }
        }

        // If allowlist is empty, allow all (except denylist)
        if config.allowed_programs.is_empty() {
            return true;
        }

        // Check allowlist
        for allowed in &config.allowed_programs {
            if program_lower.contains(&allowed.to_lowercase()) {
                return true;
            }
        }

        log::warn!("Program '{}' is not in allowlist", program);
        false
    }

    /// Check if a process can be terminated
    pub async fn can_terminate(&self, pid: u32) -> bool {
        let config = self.config.read().await;

        if !config.enabled {
            return false;
        }

        if config.allow_terminate_any {
            return true;
        }

        if config.only_terminate_own {
            let tracked = self.tracked_processes.read().await;
            return tracked.contains(&pid);
        }

        false
    }

    /// Track a started process
    pub async fn track_process(&self, pid: u32) {
        let mut tracked = self.tracked_processes.write().await;
        let config = self.config.read().await;

        // Remove if at capacity
        if tracked.len() >= config.max_tracked_processes {
            tracked.remove(0);
        }

        tracked.push(pid);
    }

    /// Untrack a process
    pub async fn untrack_process(&self, pid: u32) {
        let mut tracked = self.tracked_processes.write().await;
        tracked.retain(|&p| p != pid);
    }

    /// Get tracked processes
    pub async fn get_tracked_processes(&self) -> Vec<u32> {
        self.tracked_processes.read().await.clone()
    }

    /// List running processes
    pub async fn list_processes(&self, filter: Option<ProcessFilter>) -> Result<Vec<ProcessInfo>, ProcessError> {
        let config = self.config.read().await;
        if !config.enabled {
            return Err(ProcessError::Disabled);
        }
        drop(config);

        #[cfg(windows)]
        {
            windows::list_processes(filter).await
        }
        #[cfg(unix)]
        {
            unix::list_processes(filter).await
        }
        #[cfg(not(any(windows, unix)))]
        {
            Err(ProcessError::Unsupported("Platform not supported".to_string()))
        }
    }

    /// Get process by PID
    pub async fn get_process(&self, pid: u32) -> Result<Option<ProcessInfo>, ProcessError> {
        let config = self.config.read().await;
        if !config.enabled {
            return Err(ProcessError::Disabled);
        }
        drop(config);

        #[cfg(windows)]
        {
            windows::get_process(pid).await
        }
        #[cfg(unix)]
        {
            unix::get_process(pid).await
        }
        #[cfg(not(any(windows, unix)))]
        {
            Err(ProcessError::Unsupported("Platform not supported".to_string()))
        }
    }

    /// Start a new process
    pub async fn start_process(&self, request: StartProcessRequest) -> Result<StartProcessResult, ProcessError> {
        // Check if allowed
        if !self.is_program_allowed(&request.program).await {
            return Ok(StartProcessResult {
                success: false,
                pid: None,
                stdout: None,
                stderr: None,
                exit_code: None,
                error: Some(format!("Program '{}' is not allowed", request.program)),
                duration_ms: None,
            });
        }

        #[cfg(windows)]
        let result = windows::start_process(request).await;
        #[cfg(unix)]
        let result = unix::start_process(request).await;
        #[cfg(not(any(windows, unix)))]
        let result = Err(ProcessError::Unsupported("Platform not supported".to_string()));

        // Track if successful
        if let Ok(ref res) = result {
            if res.success {
                if let Some(pid) = res.pid {
                    self.track_process(pid).await;
                }
            }
        }

        result
    }

    /// Terminate a process
    pub async fn terminate_process(&self, request: TerminateProcessRequest) -> Result<TerminateProcessResult, ProcessError> {
        // Check if allowed
        if !self.can_terminate(request.pid).await {
            return Ok(TerminateProcessResult {
                success: false,
                exit_code: None,
                error: Some(format!("Not allowed to terminate process {}", request.pid)),
            });
        }

        // Preserve pid for post-call usage to avoid moved-value error
        let pid = request.pid;

        #[cfg(windows)]
        let result = windows::terminate_process(request).await;
        #[cfg(unix)]
        let result = unix::terminate_process(request).await;
        #[cfg(not(any(windows, unix)))]
        let result = Err(ProcessError::Unsupported("Platform not supported".to_string()));

        // Untrack if successful
        if let Ok(ref res) = result {
            if res.success {
                self.untrack_process(pid).await;
            }
        }

        result
    }
}

/// Process management error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProcessError {
    /// Process management is disabled
    Disabled,
    /// Platform not supported
    Unsupported(String),
    /// Configuration error
    Config(String),
    /// Process not found
    NotFound(u32),
    /// Permission denied
    PermissionDenied(String),
    /// Operation timeout
    Timeout,
    /// System error
    System(String),
    /// Other error
    Other(String),
}

impl std::fmt::Display for ProcessError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProcessError::Disabled => write!(f, "Process management is disabled"),
            ProcessError::Unsupported(msg) => write!(f, "Unsupported: {}", msg),
            ProcessError::Config(msg) => write!(f, "Config error: {}", msg),
            ProcessError::NotFound(pid) => write!(f, "Process {} not found", pid),
            ProcessError::PermissionDenied(msg) => write!(f, "Permission denied: {}", msg),
            ProcessError::Timeout => write!(f, "Operation timed out"),
            ProcessError::System(msg) => write!(f, "System error: {}", msg),
            ProcessError::Other(msg) => write!(f, "{}", msg),
        }
    }
}

impl std::error::Error for ProcessError {}

impl From<std::io::Error> for ProcessError {
    fn from(e: std::io::Error) -> Self {
        ProcessError::System(e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn new_uses_default_config_when_missing() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");

        let manager = ProcessManager::new(config_path).await.expect("manager");
        let config = manager.get_config().await;

        assert!(!config.enabled);
        assert_eq!(config.default_timeout_secs, DEFAULT_OPERATION_TIMEOUT);
        assert!(config.allowed_programs.is_empty());
    }

    #[tokio::test]
    async fn update_config_persists_and_loads() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");

        let manager = ProcessManager::new(config_path.clone()).await.expect("manager");
        let mut updated = ProcessManagerConfig::default();
        updated.enabled = true;
        updated.allowed_programs = vec!["python".to_string()];
        updated.max_tracked_processes = 42;

        manager.update_config(updated).await.expect("update");

        let manager_reload = ProcessManager::new(config_path).await.expect("manager reload");
        let config = manager_reload.get_config().await;

        assert!(config.enabled);
        assert_eq!(config.allowed_programs, vec!["python".to_string()]);
        assert_eq!(config.max_tracked_processes, 42);
    }

    #[tokio::test]
    async fn is_program_allowed_respects_enabled_and_lists() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");
        let manager = ProcessManager::new(config_path).await.expect("manager");

        assert!(!manager.is_program_allowed("python").await);

        let mut enabled_config = ProcessManagerConfig::default();
        enabled_config.enabled = true;
        enabled_config.denied_programs = vec!["rm".to_string()];
        manager.update_config(enabled_config).await.expect("update");

        assert!(!manager.is_program_allowed("rm").await);
        assert!(manager.is_program_allowed("node").await);

        let mut allowlist_config = ProcessManagerConfig::default();
        allowlist_config.enabled = true;
        allowlist_config.allowed_programs = vec!["python".to_string()];
        manager.update_config(allowlist_config).await.expect("update");

        assert!(manager.is_program_allowed("python3").await);
        assert!(!manager.is_program_allowed("node").await);
    }

    #[tokio::test]
    async fn can_terminate_respects_tracking_and_flags() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");
        let manager = ProcessManager::new(config_path).await.expect("manager");

        let mut config = ProcessManagerConfig::default();
        config.enabled = true;
        config.allow_terminate_any = true;
        manager.update_config(config).await.expect("update");

        assert!(manager.can_terminate(123).await);

        let mut tracking_config = ProcessManagerConfig::default();
        tracking_config.enabled = true;
        tracking_config.allow_terminate_any = false;
        tracking_config.only_terminate_own = true;
        manager.update_config(tracking_config).await.expect("update");

        assert!(!manager.can_terminate(456).await);
        manager.track_process(456).await;
        assert!(manager.can_terminate(456).await);
        manager.untrack_process(456).await;
        assert!(!manager.can_terminate(456).await);
    }

    #[tokio::test]
    async fn track_process_respects_capacity() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");
        let manager = ProcessManager::new(config_path).await.expect("manager");

        let mut config = ProcessManagerConfig::default();
        config.enabled = true;
        config.max_tracked_processes = 2;
        manager.update_config(config).await.expect("update");

        manager.track_process(1).await;
        manager.track_process(2).await;
        manager.track_process(3).await;

        let tracked = manager.get_tracked_processes().await;
        assert_eq!(tracked, vec![2, 3]);
    }

    #[test]
    fn apply_filter_handles_name_and_memory() {
        let info = ProcessInfo {
            pid: 10,
            name: "python".to_string(),
            exe_path: None,
            cmd_line: None,
            parent_pid: Some(1),
            cpu_percent: Some(2.5),
            memory_bytes: Some(2048),
            status: ProcessStatus::Running,
            start_time: Some(100),
            user: Some("tester".to_string()),
            cwd: None,
        };

        let filter = ProcessFilter {
            name: Some("py".to_string()),
            min_memory: Some(1024),
            ..Default::default()
        };

        assert!(apply_filter_for_test(&info, &filter));

        let mismatched = ProcessFilter {
            name: Some("node".to_string()),
            ..Default::default()
        };

        assert!(!apply_filter_for_test(&info, &mismatched));
    }

    #[test]
    fn sort_processes_orders_by_memory_desc() {
        let mut processes = vec![
            ProcessInfo {
                pid: 1,
                name: "alpha".to_string(),
                exe_path: None,
                cmd_line: None,
                parent_pid: None,
                cpu_percent: None,
                memory_bytes: Some(100),
                status: ProcessStatus::Running,
                start_time: None,
                user: None,
                cwd: None,
            },
            ProcessInfo {
                pid: 2,
                name: "beta".to_string(),
                exe_path: None,
                cmd_line: None,
                parent_pid: None,
                cpu_percent: None,
                memory_bytes: Some(200),
                status: ProcessStatus::Running,
                start_time: None,
                user: None,
                cwd: None,
            },
        ];

        sort_processes_for_test(&mut processes, ProcessSortField::Memory, true);

        assert_eq!(processes[0].pid, 2);
        assert_eq!(processes[1].pid, 1);
    }
}
