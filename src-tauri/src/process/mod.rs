//! Process Management Module
//!
//! Provides local process operations for the agent:
//! - List running processes (via sysinfo crate)
//! - Get process details with CPU/memory
//! - Start new processes (with restrictions)
//! - Terminate processes (graceful + force)
//! - Monitor process status
//!
//! Security: All operations require explicit user approval and have allowlist restrictions.

use futures::stream::{self, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use sysinfo::{Pid, ProcessesToUpdate, System};
use tokio::sync::RwLock;
use uuid::Uuid;

#[cfg(windows)]
mod windows;

#[cfg(unix)]
mod unix;

/// Maximum number of processes to list at once
pub const MAX_PROCESS_LIST: usize = 500;

/// Default timeout for process operations (seconds)
pub const DEFAULT_OPERATION_TIMEOUT: u64 = 30;
/// Default max concurrency for batch operations
pub const DEFAULT_BATCH_CONCURRENCY: usize = 4;
/// Hard cap for batch operation concurrency
pub const MAX_BATCH_CONCURRENCY: usize = 16;
/// Maximum number of async operation records kept in memory
pub const MAX_OPERATION_HISTORY: usize = 200;

/// Process information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub enum ProcessSortField {
    Pid,
    Name,
    Cpu,
    Memory,
    #[serde(alias = "starttime", alias = "start_time")]
    StartTime,
}

/// Request to start a new process
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// Exit code (if available)
    pub exit_code: Option<i32>,
    /// Error message
    pub error: Option<String>,
}

/// Request to start multiple processes in parallel
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProcessBatchRequest {
    /// Batch of start requests
    pub requests: Vec<StartProcessRequest>,
    /// Maximum concurrency for parallel execution
    #[serde(default, alias = "max_concurrency")]
    pub max_concurrency: Option<usize>,
}

/// Result for one start operation in a batch
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProcessBatchItemResult {
    /// Original request index in batch
    pub index: usize,
    /// Program in the original request (for easy identification)
    pub program: String,
    /// Operation result
    pub result: StartProcessResult,
}

/// Result of starting processes in batch
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProcessBatchResult {
    /// Number of requests in batch
    pub total: usize,
    /// Number of successful operations
    pub success_count: usize,
    /// Number of failed operations
    pub failure_count: usize,
    /// Per-request results in original request order
    pub results: Vec<StartProcessBatchItemResult>,
}

/// Request to terminate multiple processes in parallel
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessBatchRequest {
    /// Batch of terminate requests
    pub requests: Vec<TerminateProcessRequest>,
    /// Maximum concurrency for parallel execution
    #[serde(default, alias = "max_concurrency")]
    pub max_concurrency: Option<usize>,
}

/// Result for one terminate operation in a batch
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessBatchItemResult {
    /// Original request index in batch
    pub index: usize,
    /// PID in the original request (for easy identification)
    pub pid: u32,
    /// Operation result
    pub result: TerminateProcessResult,
}

/// Result of terminating processes in batch
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessBatchResult {
    /// Number of requests in batch
    pub total: usize,
    /// Number of successful operations
    pub success_count: usize,
    /// Number of failed operations
    pub failure_count: usize,
    /// Per-request results in original request order
    pub results: Vec<TerminateProcessBatchItemResult>,
}

/// Async operation type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProcessOperationType {
    StartBatch,
    TerminateBatch,
}

/// Async operation status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProcessOperationStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

/// Async operation result payload
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "kind", content = "payload")]
pub enum ProcessOperationResult {
    StartBatch(StartProcessBatchResult),
    TerminateBatch(TerminateProcessBatchResult),
}

/// Async operation record
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessOperation {
    /// Unique operation ID
    pub operation_id: String,
    /// Operation type
    pub operation_type: ProcessOperationType,
    /// Current status
    pub status: ProcessOperationStatus,
    /// Operation creation timestamp (unix ms)
    pub created_at: i64,
    /// Operation start timestamp (unix ms)
    pub started_at: Option<i64>,
    /// Operation completion timestamp (unix ms)
    pub completed_at: Option<i64>,
    /// Optional error message
    pub error: Option<String>,
    /// Result payload when completed
    pub result: Option<ProcessOperationResult>,
}

fn now_timestamp_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn normalize_batch_concurrency(value: Option<usize>) -> usize {
    value
        .unwrap_or(DEFAULT_BATCH_CONCURRENCY)
        .clamp(1, MAX_BATCH_CONCURRENCY)
}

/// Process manager configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ProcessManagerConfig {
    /// Whether process management is enabled
    pub enabled: bool,
    /// Allowlist of programs that can be started (empty = all allowed)
    #[serde(alias = "allowed_programs")]
    pub allowed_programs: Vec<String>,
    /// Denylist of programs that cannot be started
    #[serde(alias = "denied_programs")]
    pub denied_programs: Vec<String>,
    /// Whether to allow terminating any process
    #[serde(alias = "allow_terminate_any")]
    pub allow_terminate_any: bool,
    /// Only allow terminating processes started by this app
    #[serde(alias = "only_terminate_own")]
    pub only_terminate_own: bool,
    /// Maximum concurrent processes to track
    #[serde(alias = "max_tracked_processes")]
    pub max_tracked_processes: usize,
    /// Default timeout for operations
    #[serde(alias = "default_timeout_secs")]
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

/// Apply filter to a process (shared across all platforms)
pub fn apply_filter(info: &ProcessInfo, filter: &ProcessFilter) -> bool {
    if let Some(pid) = filter.pid {
        if info.pid != pid {
            return false;
        }
    }
    if let Some(ref name) = filter.name {
        if !info.name.to_lowercase().contains(&name.to_lowercase()) {
            return false;
        }
    }
    if let Some(parent_pid) = filter.parent_pid {
        if info.parent_pid != Some(parent_pid) {
            return false;
        }
    }
    if let Some(ref user) = filter.user {
        if let Some(ref info_user) = info.user {
            if !info_user.to_lowercase().contains(&user.to_lowercase()) {
                return false;
            }
        } else {
            return false;
        }
    }
    if let Some(min_cpu) = filter.min_cpu {
        if let Some(cpu) = info.cpu_percent {
            if cpu < min_cpu {
                return false;
            }
        } else {
            return false;
        }
    }
    if let Some(min_memory) = filter.min_memory {
        if let Some(memory) = info.memory_bytes {
            if memory < min_memory {
                return false;
            }
        } else {
            return false;
        }
    }
    true
}

/// Sort processes by field (shared across all platforms)
pub fn sort_processes(processes: &mut [ProcessInfo], sort_by: ProcessSortField, desc: bool) {
    processes.sort_by(|a, b| {
        let cmp = match sort_by {
            ProcessSortField::Pid => a.pid.cmp(&b.pid),
            ProcessSortField::Name => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            ProcessSortField::Cpu => {
                let a_cpu = a.cpu_percent.unwrap_or(0.0);
                let b_cpu = b.cpu_percent.unwrap_or(0.0);
                a_cpu
                    .partial_cmp(&b_cpu)
                    .unwrap_or(std::cmp::Ordering::Equal)
            }
            ProcessSortField::Memory => {
                let a_mem = a.memory_bytes.unwrap_or(0);
                let b_mem = b.memory_bytes.unwrap_or(0);
                a_mem.cmp(&b_mem)
            }
            ProcessSortField::StartTime => {
                let a_time = a.start_time.unwrap_or(0);
                let b_time = b.start_time.unwrap_or(0);
                a_time.cmp(&b_time)
            }
        };
        if desc {
            cmp.reverse()
        } else {
            cmp
        }
    });
}

/// Convert a sysinfo process to our ProcessInfo struct
fn sysinfo_to_process_info(pid: &Pid, proc: &sysinfo::Process) -> ProcessInfo {
    let num_cpus = sysinfo::System::new().cpus().len().max(1) as f32;
    ProcessInfo {
        pid: pid.as_u32(),
        name: proc.name().to_string_lossy().to_string(),
        exe_path: proc.exe().map(|p| p.to_string_lossy().to_string()),
        cmd_line: {
            let cmd: Vec<String> = proc
                .cmd()
                .iter()
                .map(|s| s.to_string_lossy().to_string())
                .collect();
            if cmd.is_empty() {
                None
            } else {
                Some(cmd)
            }
        },
        parent_pid: proc.parent().map(|p| p.as_u32()),
        cpu_percent: Some(proc.cpu_usage() / num_cpus),
        memory_bytes: Some(proc.memory()),
        status: match proc.status() {
            sysinfo::ProcessStatus::Run => ProcessStatus::Running,
            sysinfo::ProcessStatus::Sleep | sysinfo::ProcessStatus::Idle => ProcessStatus::Sleeping,
            sysinfo::ProcessStatus::Stop => ProcessStatus::Stopped,
            sysinfo::ProcessStatus::Zombie => ProcessStatus::Zombie,
            _ => ProcessStatus::Unknown,
        },
        start_time: Some(proc.start_time()),
        user: proc.user_id().map(|u| u.to_string()),
        cwd: proc.cwd().map(|p| p.to_string_lossy().to_string()),
    }
}

/// Process manager state
#[derive(Clone)]
pub struct ProcessManager {
    /// Configuration
    pub config: Arc<RwLock<ProcessManagerConfig>>,
    /// Tracked processes (PIDs started by this app)
    tracked_processes: Arc<RwLock<Vec<u32>>>,
    /// Config file path
    config_path: PathBuf,
    /// sysinfo System instance for process queries
    sys: Arc<RwLock<System>>,
    /// Async operation records
    operations: Arc<RwLock<HashMap<String, ProcessOperation>>>,
    /// Operation order for recency listing
    operation_order: Arc<RwLock<Vec<String>>>,
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
            log::debug!(
                "Loading existing process manager config from {:?}",
                config_path
            );
            let content = tokio::fs::read_to_string(&config_path)
                .await
                .map_err(|e| ProcessError::Config(format!("Failed to read config: {}", e)))?;
            serde_json::from_str(&content)
                .map_err(|e| ProcessError::Config(format!("Failed to parse config: {}", e)))?
        } else {
            log::info!("No existing config found, using default process manager configuration");
            ProcessManagerConfig::default()
        };

        // Initialize sysinfo with an initial refresh so CPU deltas are available
        let mut sys = System::new_all();
        sys.refresh_processes(ProcessesToUpdate::All, true);

        Ok(Self {
            config: Arc::new(RwLock::new(config)),
            tracked_processes: Arc::new(RwLock::new(Vec::new())),
            config_path,
            sys: Arc::new(RwLock::new(sys)),
            operations: Arc::new(RwLock::new(HashMap::new())),
            operation_order: Arc::new(RwLock::new(Vec::new())),
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
    pub async fn update_config(
        &self,
        new_config: ProcessManagerConfig,
    ) -> Result<(), ProcessError> {
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

    /// List running processes using sysinfo
    pub async fn list_processes(
        &self,
        filter: Option<ProcessFilter>,
    ) -> Result<Vec<ProcessInfo>, ProcessError> {
        let config = self.config.read().await;
        if !config.enabled {
            return Err(ProcessError::Disabled);
        }
        drop(config);

        let filter = filter.unwrap_or_default();

        // Refresh processes (this updates CPU deltas)
        {
            let mut sys = self.sys.write().await;
            sys.refresh_processes(ProcessesToUpdate::All, true);
        }

        let sys = self.sys.read().await;
        let mut processes: Vec<ProcessInfo> = sys
            .processes()
            .iter()
            .map(|(pid, proc)| sysinfo_to_process_info(pid, proc))
            .filter(|info| apply_filter(info, &filter))
            .collect();

        // Sort if requested
        if let Some(sort_by) = filter.sort_by {
            let desc = filter.sort_desc.unwrap_or(false);
            sort_processes(&mut processes, sort_by, desc);
        }

        // Apply limit
        let limit = filter.limit.unwrap_or(MAX_PROCESS_LIST);
        processes.truncate(limit);

        Ok(processes)
    }

    /// Get process by PID using sysinfo
    pub async fn get_process(&self, pid: u32) -> Result<Option<ProcessInfo>, ProcessError> {
        let config = self.config.read().await;
        if !config.enabled {
            return Err(ProcessError::Disabled);
        }
        drop(config);

        let sysinfo_pid = Pid::from_u32(pid);

        // Refresh only the target process
        {
            let mut sys = self.sys.write().await;
            sys.refresh_processes(ProcessesToUpdate::Some(&[sysinfo_pid]), true);
        }

        let sys = self.sys.read().await;
        Ok(sys
            .process(sysinfo_pid)
            .map(|proc| sysinfo_to_process_info(&sysinfo_pid, proc)))
    }

    /// Start a new process
    pub async fn start_process(
        &self,
        request: StartProcessRequest,
    ) -> Result<StartProcessResult, ProcessError> {
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
        let result = Err(ProcessError::Unsupported(
            "Platform not supported".to_string(),
        ));

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
    pub async fn terminate_process(
        &self,
        request: TerminateProcessRequest,
    ) -> Result<TerminateProcessResult, ProcessError> {
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
        let result = Err(ProcessError::Unsupported(
            "Platform not supported".to_string(),
        ));

        // Untrack if successful
        if let Ok(ref res) = result {
            if res.success {
                self.untrack_process(pid).await;
            }
        }

        result
    }

    async fn insert_operation(&self, operation: ProcessOperation) {
        let operation_id = operation.operation_id.clone();
        {
            let mut operations = self.operations.write().await;
            operations.insert(operation_id.clone(), operation);
        }

        let mut evicted: Option<String> = None;
        {
            let mut order = self.operation_order.write().await;
            order.push(operation_id);
            if order.len() > MAX_OPERATION_HISTORY {
                evicted = Some(order.remove(0));
            }
        }
        if let Some(evicted_id) = evicted {
            let mut operations = self.operations.write().await;
            operations.remove(&evicted_id);
        }
    }

    async fn mark_operation_running(&self, operation_id: &str) {
        let mut operations = self.operations.write().await;
        if let Some(operation) = operations.get_mut(operation_id) {
            operation.status = ProcessOperationStatus::Running;
            operation.started_at = Some(now_timestamp_ms());
            operation.error = None;
        }
    }

    async fn mark_operation_completed(&self, operation_id: &str, result: ProcessOperationResult) {
        let mut operations = self.operations.write().await;
        if let Some(operation) = operations.get_mut(operation_id) {
            operation.status = ProcessOperationStatus::Completed;
            operation.completed_at = Some(now_timestamp_ms());
            operation.result = Some(result);
            operation.error = None;
        }
    }

    async fn mark_operation_failed(&self, operation_id: &str, error: String) {
        let mut operations = self.operations.write().await;
        if let Some(operation) = operations.get_mut(operation_id) {
            operation.status = ProcessOperationStatus::Failed;
            operation.completed_at = Some(now_timestamp_ms());
            operation.error = Some(error);
        }
    }

    /// Start multiple processes in parallel with bounded concurrency
    pub async fn start_process_batch(
        &self,
        request: StartProcessBatchRequest,
    ) -> Result<StartProcessBatchResult, ProcessError> {
        let total = request.requests.len();
        let concurrency = normalize_batch_concurrency(request.max_concurrency);
        let manager = self.clone();

        let mut results = stream::iter(request.requests.into_iter().enumerate())
            .map(move |(index, start_request)| {
                let manager = manager.clone();
                async move {
                    let program = start_request.program.clone();
                    let result = match manager.start_process(start_request).await {
                        Ok(result) => result,
                        Err(error) => StartProcessResult {
                            success: false,
                            pid: None,
                            stdout: None,
                            stderr: None,
                            exit_code: None,
                            error: Some(error.to_string()),
                            duration_ms: None,
                        },
                    };
                    StartProcessBatchItemResult {
                        index,
                        program,
                        result,
                    }
                }
            })
            .buffer_unordered(concurrency)
            .collect::<Vec<_>>()
            .await;

        results.sort_by_key(|item| item.index);
        let success_count = results.iter().filter(|item| item.result.success).count();
        let failure_count = total.saturating_sub(success_count);

        Ok(StartProcessBatchResult {
            total,
            success_count,
            failure_count,
            results,
        })
    }

    /// Terminate multiple processes in parallel with bounded concurrency
    pub async fn terminate_process_batch(
        &self,
        request: TerminateProcessBatchRequest,
    ) -> Result<TerminateProcessBatchResult, ProcessError> {
        let total = request.requests.len();
        let concurrency = normalize_batch_concurrency(request.max_concurrency);
        let manager = self.clone();

        let mut results = stream::iter(request.requests.into_iter().enumerate())
            .map(move |(index, terminate_request)| {
                let manager = manager.clone();
                async move {
                    let pid = terminate_request.pid;
                    let result = match manager.terminate_process(terminate_request).await {
                        Ok(result) => result,
                        Err(error) => TerminateProcessResult {
                            success: false,
                            exit_code: None,
                            error: Some(error.to_string()),
                        },
                    };
                    TerminateProcessBatchItemResult { index, pid, result }
                }
            })
            .buffer_unordered(concurrency)
            .collect::<Vec<_>>()
            .await;

        results.sort_by_key(|item| item.index);
        let success_count = results.iter().filter(|item| item.result.success).count();
        let failure_count = total.saturating_sub(success_count);

        Ok(TerminateProcessBatchResult {
            total,
            success_count,
            failure_count,
            results,
        })
    }

    /// Start a batch operation asynchronously and return operation metadata immediately
    pub async fn start_process_batch_async(
        &self,
        request: StartProcessBatchRequest,
    ) -> Result<ProcessOperation, ProcessError> {
        let operation = ProcessOperation {
            operation_id: Uuid::new_v4().to_string(),
            operation_type: ProcessOperationType::StartBatch,
            status: ProcessOperationStatus::Pending,
            created_at: now_timestamp_ms(),
            started_at: None,
            completed_at: None,
            error: None,
            result: None,
        };

        self.insert_operation(operation.clone()).await;

        let manager = self.clone();
        let operation_id = operation.operation_id.clone();
        tokio::spawn(async move {
            manager.mark_operation_running(&operation_id).await;
            match manager.start_process_batch(request).await {
                Ok(result) => {
                    manager
                        .mark_operation_completed(
                            &operation_id,
                            ProcessOperationResult::StartBatch(result),
                        )
                        .await;
                }
                Err(error) => {
                    manager
                        .mark_operation_failed(&operation_id, error.to_string())
                        .await;
                }
            }
        });

        Ok(operation)
    }

    /// Terminate a batch operation asynchronously and return operation metadata immediately
    pub async fn terminate_process_batch_async(
        &self,
        request: TerminateProcessBatchRequest,
    ) -> Result<ProcessOperation, ProcessError> {
        let operation = ProcessOperation {
            operation_id: Uuid::new_v4().to_string(),
            operation_type: ProcessOperationType::TerminateBatch,
            status: ProcessOperationStatus::Pending,
            created_at: now_timestamp_ms(),
            started_at: None,
            completed_at: None,
            error: None,
            result: None,
        };

        self.insert_operation(operation.clone()).await;

        let manager = self.clone();
        let operation_id = operation.operation_id.clone();
        tokio::spawn(async move {
            manager.mark_operation_running(&operation_id).await;
            match manager.terminate_process_batch(request).await {
                Ok(result) => {
                    manager
                        .mark_operation_completed(
                            &operation_id,
                            ProcessOperationResult::TerminateBatch(result),
                        )
                        .await;
                }
                Err(error) => {
                    manager
                        .mark_operation_failed(&operation_id, error.to_string())
                        .await;
                }
            }
        });

        Ok(operation)
    }

    /// Get async operation by ID
    pub async fn get_operation(&self, operation_id: &str) -> Option<ProcessOperation> {
        let operations = self.operations.read().await;
        operations.get(operation_id).cloned()
    }

    /// List recent async operations, most recent first
    pub async fn list_operations(&self, limit: Option<usize>) -> Vec<ProcessOperation> {
        let max = limit.unwrap_or(50).clamp(1, MAX_OPERATION_HISTORY);
        let order = self.operation_order.read().await;
        let ids: Vec<String> = order.iter().rev().take(max).cloned().collect();
        drop(order);

        let operations = self.operations.read().await;
        ids.into_iter()
            .filter_map(|id| operations.get(&id).cloned())
            .collect()
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

        let manager = ProcessManager::new(config_path.clone())
            .await
            .expect("manager");
        let updated = ProcessManagerConfig {
            enabled: true,
            allowed_programs: vec!["python".to_string()],
            max_tracked_processes: 42,
            ..Default::default()
        };

        manager.update_config(updated).await.expect("update");

        let manager_reload = ProcessManager::new(config_path)
            .await
            .expect("manager reload");
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

        let enabled_config = ProcessManagerConfig {
            enabled: true,
            denied_programs: vec!["rm".to_string()],
            ..Default::default()
        };
        manager.update_config(enabled_config).await.expect("update");

        assert!(!manager.is_program_allowed("rm").await);
        assert!(manager.is_program_allowed("node").await);

        let allowlist_config = ProcessManagerConfig {
            enabled: true,
            allowed_programs: vec!["python".to_string()],
            ..Default::default()
        };
        manager
            .update_config(allowlist_config)
            .await
            .expect("update");

        assert!(manager.is_program_allowed("python3").await);
        assert!(!manager.is_program_allowed("node").await);
    }

    #[tokio::test]
    async fn can_terminate_respects_tracking_and_flags() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");
        let manager = ProcessManager::new(config_path).await.expect("manager");

        let config = ProcessManagerConfig {
            enabled: true,
            allow_terminate_any: true,
            ..Default::default()
        };
        manager.update_config(config).await.expect("update");

        assert!(manager.can_terminate(123).await);

        let tracking_config = ProcessManagerConfig {
            enabled: true,
            allow_terminate_any: false,
            only_terminate_own: true,
            ..Default::default()
        };
        manager
            .update_config(tracking_config)
            .await
            .expect("update");

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

        let config = ProcessManagerConfig {
            enabled: true,
            max_tracked_processes: 2,
            ..Default::default()
        };
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

        assert!(apply_filter(&info, &filter));

        let mismatched = ProcessFilter {
            name: Some("node".to_string()),
            ..Default::default()
        };

        assert!(!apply_filter(&info, &mismatched));
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

        sort_processes(&mut processes, ProcessSortField::Memory, true);

        assert_eq!(processes[0].pid, 2);
        assert_eq!(processes[1].pid, 1);
    }

    #[test]
    fn process_config_serializes_to_camel_case() {
        let config = ProcessManagerConfig::default();
        let value = serde_json::to_value(config).expect("serialize config");

        assert!(value.get("allowedPrograms").is_some());
        assert!(value.get("deniedPrograms").is_some());
        assert!(value.get("allowTerminateAny").is_some());
        assert!(value.get("onlyTerminateOwn").is_some());
        assert!(value.get("maxTrackedProcesses").is_some());
        assert!(value.get("defaultTimeoutSecs").is_some());
    }

    #[test]
    fn process_config_deserializes_legacy_snake_case() {
        let legacy = serde_json::json!({
            "enabled": true,
            "allowed_programs": ["python"],
            "denied_programs": ["rm"],
            "allow_terminate_any": true,
            "only_terminate_own": false,
            "max_tracked_processes": 12,
            "default_timeout_secs": 5
        });

        let config: ProcessManagerConfig =
            serde_json::from_value(legacy).expect("deserialize legacy config");

        assert!(config.enabled);
        assert_eq!(config.allowed_programs, vec!["python".to_string()]);
        assert_eq!(config.denied_programs, vec!["rm".to_string()]);
        assert!(config.allow_terminate_any);
        assert!(!config.only_terminate_own);
        assert_eq!(config.max_tracked_processes, 12);
        assert_eq!(config.default_timeout_secs, 5);
    }

    #[test]
    fn process_sort_field_accepts_start_time_aliases() {
        let camel: ProcessSortField =
            serde_json::from_str(r#""startTime""#).expect("startTime variant");
        let legacy_lower: ProcessSortField =
            serde_json::from_str(r#""starttime""#).expect("legacy lowercase variant");
        let legacy_snake: ProcessSortField =
            serde_json::from_str(r#""start_time""#).expect("legacy snake variant");

        assert_eq!(camel, ProcessSortField::StartTime);
        assert_eq!(legacy_lower, ProcessSortField::StartTime);
        assert_eq!(legacy_snake, ProcessSortField::StartTime);
    }

    #[tokio::test]
    async fn start_process_batch_returns_counts_and_preserves_order() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");
        let manager = ProcessManager::new(config_path).await.expect("manager");

        manager
            .update_config(ProcessManagerConfig {
                enabled: true,
                allowed_programs: vec!["allowed-only".to_string()],
                ..Default::default()
            })
            .await
            .expect("update");

        let result = manager
            .start_process_batch(StartProcessBatchRequest {
                requests: vec![
                    StartProcessRequest {
                        program: "foo".to_string(),
                        args: vec![],
                        cwd: None,
                        env: HashMap::new(),
                        detached: true,
                        timeout_secs: Some(1),
                        capture_output: false,
                    },
                    StartProcessRequest {
                        program: "bar".to_string(),
                        args: vec![],
                        cwd: None,
                        env: HashMap::new(),
                        detached: true,
                        timeout_secs: Some(1),
                        capture_output: false,
                    },
                ],
                max_concurrency: Some(8),
            })
            .await
            .expect("batch");

        assert_eq!(result.total, 2);
        assert_eq!(result.success_count, 0);
        assert_eq!(result.failure_count, 2);
        assert_eq!(result.results[0].index, 0);
        assert_eq!(result.results[1].index, 1);
        assert_eq!(result.results[0].program, "foo");
        assert_eq!(result.results[1].program, "bar");
    }

    #[tokio::test]
    async fn terminate_process_batch_respects_restrictions() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");
        let manager = ProcessManager::new(config_path).await.expect("manager");

        manager
            .update_config(ProcessManagerConfig {
                enabled: true,
                allow_terminate_any: false,
                only_terminate_own: true,
                ..Default::default()
            })
            .await
            .expect("update");

        let result = manager
            .terminate_process_batch(TerminateProcessBatchRequest {
                requests: vec![
                    TerminateProcessRequest {
                        pid: 999_001,
                        force: false,
                        timeout_secs: Some(1),
                    },
                    TerminateProcessRequest {
                        pid: 999_002,
                        force: false,
                        timeout_secs: Some(1),
                    },
                ],
                max_concurrency: Some(4),
            })
            .await
            .expect("batch");

        assert_eq!(result.total, 2);
        assert_eq!(result.success_count, 0);
        assert_eq!(result.failure_count, 2);
        assert_eq!(result.results[0].pid, 999_001);
        assert_eq!(result.results[1].pid, 999_002);
    }

    #[tokio::test]
    async fn start_process_batch_async_records_and_completes_operation() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");
        let manager = ProcessManager::new(config_path).await.expect("manager");

        manager
            .update_config(ProcessManagerConfig {
                enabled: true,
                allowed_programs: vec!["allowed-only".to_string()],
                ..Default::default()
            })
            .await
            .expect("update");

        let operation = manager
            .start_process_batch_async(StartProcessBatchRequest {
                requests: vec![StartProcessRequest {
                    program: "foo".to_string(),
                    args: vec![],
                    cwd: None,
                    env: HashMap::new(),
                    detached: true,
                    timeout_secs: Some(1),
                    capture_output: false,
                }],
                max_concurrency: Some(2),
            })
            .await
            .expect("submit");

        assert_eq!(operation.operation_type, ProcessOperationType::StartBatch);
        assert!(matches!(
            operation.status,
            ProcessOperationStatus::Pending
                | ProcessOperationStatus::Running
                | ProcessOperationStatus::Completed
        ));

        let completed = tokio::time::timeout(std::time::Duration::from_secs(2), async {
            loop {
                let current = manager
                    .get_operation(&operation.operation_id)
                    .await
                    .expect("operation exists");
                if current.status == ProcessOperationStatus::Completed {
                    break current;
                }
                tokio::time::sleep(std::time::Duration::from_millis(20)).await;
            }
        })
        .await
        .expect("operation completion");

        assert_eq!(completed.status, ProcessOperationStatus::Completed);
        let payload = completed.result.expect("result");
        match payload {
            ProcessOperationResult::StartBatch(batch) => {
                assert_eq!(batch.total, 1);
                assert_eq!(batch.failure_count, 1);
            }
            ProcessOperationResult::TerminateBatch(_) => panic!("unexpected operation result kind"),
        }
    }

    #[tokio::test]
    async fn list_operations_returns_recent_first_with_limit() {
        let dir = tempdir().expect("tempdir");
        let config_path = dir.path().join("process.json");
        let manager = ProcessManager::new(config_path).await.expect("manager");

        manager
            .update_config(ProcessManagerConfig {
                enabled: true,
                allowed_programs: vec!["allowed-only".to_string()],
                ..Default::default()
            })
            .await
            .expect("update");

        let first = manager
            .start_process_batch_async(StartProcessBatchRequest {
                requests: vec![StartProcessRequest {
                    program: "foo".to_string(),
                    args: vec![],
                    cwd: None,
                    env: HashMap::new(),
                    detached: true,
                    timeout_secs: Some(1),
                    capture_output: false,
                }],
                max_concurrency: Some(1),
            })
            .await
            .expect("first");

        let second = manager
            .start_process_batch_async(StartProcessBatchRequest {
                requests: vec![StartProcessRequest {
                    program: "bar".to_string(),
                    args: vec![],
                    cwd: None,
                    env: HashMap::new(),
                    detached: true,
                    timeout_secs: Some(1),
                    capture_output: false,
                }],
                max_concurrency: Some(1),
            })
            .await
            .expect("second");

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        let recent_one = manager.list_operations(Some(1)).await;
        assert_eq!(recent_one.len(), 1);
        assert_eq!(recent_one[0].operation_id, second.operation_id);

        let all = manager.list_operations(Some(10)).await;
        assert!(all.iter().any(|op| op.operation_id == first.operation_id));
        assert!(all.iter().any(|op| op.operation_id == second.operation_id));
    }
}
