//! Unix-specific process operations

use super::{
    ProcessError, ProcessFilter, ProcessInfo, ProcessSortField, ProcessStatus,
    StartProcessRequest, StartProcessResult, TerminateProcessRequest, TerminateProcessResult,
    MAX_PROCESS_LIST,
};
use std::time::Instant;
use tokio::process::Command;

/// List running processes on Unix
pub async fn list_processes(filter: Option<ProcessFilter>) -> Result<Vec<ProcessInfo>, ProcessError> {
    let filter = filter.unwrap_or_default();
    let mut processes = Vec::new();

    // Use /proc on Linux or ps on macOS
    #[cfg(target_os = "linux")]
    {
        processes = list_processes_linux(&filter).await?;
    }

    #[cfg(target_os = "macos")]
    {
        processes = list_processes_macos(&filter).await?;
    }

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

#[cfg(target_os = "linux")]
async fn list_processes_linux(filter: &ProcessFilter) -> Result<Vec<ProcessInfo>, ProcessError> {
    use std::fs;
    use std::path::Path;

    let mut processes = Vec::new();

    let proc_path = Path::new("/proc");
    let entries = fs::read_dir(proc_path)
        .map_err(|e| ProcessError::System(format!("Cannot read /proc: {}", e)))?;

    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();

        // Only process numeric directories (PIDs)
        if let Ok(pid) = name_str.parse::<u32>() {
            let proc_dir = entry.path();

            // Read comm (process name)
            let comm_path = proc_dir.join("comm");
            let name = fs::read_to_string(&comm_path)
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|_| "unknown".to_string());

            // Read status for more info
            let status_path = proc_dir.join("status");
            let (parent_pid, memory_bytes, status) = if let Ok(status_content) = fs::read_to_string(&status_path) {
                parse_proc_status(&status_content)
            } else {
                (None, None, ProcessStatus::Unknown)
            };

            // Read cmdline
            let cmdline_path = proc_dir.join("cmdline");
            let cmd_line = fs::read_to_string(&cmdline_path)
                .map(|s| {
                    s.split('\0')
                        .filter(|s| !s.is_empty())
                        .map(String::from)
                        .collect::<Vec<_>>()
                })
                .ok()
                .filter(|v| !v.is_empty());

            // Read exe link
            let exe_path = proc_dir.join("exe");
            let exe = fs::read_link(&exe_path)
                .ok()
                .map(|p| p.to_string_lossy().to_string());

            // Read cwd link
            let cwd_path = proc_dir.join("cwd");
            let cwd = fs::read_link(&cwd_path)
                .ok()
                .map(|p| p.to_string_lossy().to_string());

            let info = ProcessInfo {
                pid,
                name,
                exe_path: exe,
                cmd_line,
                parent_pid,
                cpu_percent: None, // Requires sampling
                memory_bytes,
                status,
                start_time: None,
                user: None,
                cwd,
            };

            if apply_filter(&info, filter) {
                processes.push(info);
            }
        }
    }

    Ok(processes)
}

#[cfg(target_os = "linux")]
fn parse_proc_status(content: &str) -> (Option<u32>, Option<u64>, ProcessStatus) {
    let mut parent_pid = None;
    let mut memory_bytes = None;
    let mut status = ProcessStatus::Unknown;

    for line in content.lines() {
        if let Some(value) = line.strip_prefix("PPid:") {
            parent_pid = value.trim().parse().ok();
        } else if let Some(value) = line.strip_prefix("VmRSS:") {
            // VmRSS is in kB
            if let Some(kb_str) = value.trim().split_whitespace().next() {
                if let Ok(kb) = kb_str.parse::<u64>() {
                    memory_bytes = Some(kb * 1024);
                }
            }
        } else if let Some(value) = line.strip_prefix("State:") {
            let state_char = value.trim().chars().next().unwrap_or('?');
            status = match state_char {
                'R' => ProcessStatus::Running,
                'S' | 'D' | 'I' => ProcessStatus::Sleeping,
                'T' | 't' => ProcessStatus::Stopped,
                'Z' => ProcessStatus::Zombie,
                _ => ProcessStatus::Unknown,
            };
        }
    }

    (parent_pid, memory_bytes, status)
}

#[cfg(target_os = "macos")]
async fn list_processes_macos(filter: &ProcessFilter) -> Result<Vec<ProcessInfo>, ProcessError> {
    // Use ps command on macOS
    let output = Command::new("ps")
        .args(["-axo", "pid,ppid,rss,state,comm"])
        .output()
        .await
        .map_err(|e| ProcessError::System(format!("Failed to run ps: {}", e)))?;

    if !output.status.success() {
        return Err(ProcessError::System("ps command failed".to_string()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut processes = Vec::new();

    for line in stdout.lines().skip(1) {
        // Skip header
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 5 {
            let pid: u32 = parts[0].parse().unwrap_or(0);
            let parent_pid: u32 = parts[1].parse().unwrap_or(0);
            let rss_kb: u64 = parts[2].parse().unwrap_or(0);
            let state_char = parts[3].chars().next().unwrap_or('?');
            let name = parts[4..].join(" ");

            let status = match state_char {
                'R' => ProcessStatus::Running,
                'S' | 'I' => ProcessStatus::Sleeping,
                'T' => ProcessStatus::Stopped,
                'Z' => ProcessStatus::Zombie,
                _ => ProcessStatus::Unknown,
            };

            let info = ProcessInfo {
                pid,
                name,
                exe_path: None,
                cmd_line: None,
                parent_pid: if parent_pid > 0 { Some(parent_pid) } else { None },
                cpu_percent: None,
                memory_bytes: Some(rss_kb * 1024),
                status,
                start_time: None,
                user: None,
                cwd: None,
            };

            if apply_filter(&info, filter) {
                processes.push(info);
            }
        }
    }

    Ok(processes)
}

/// Get process by PID
pub async fn get_process(pid: u32) -> Result<Option<ProcessInfo>, ProcessError> {
    let processes = list_processes(Some(ProcessFilter {
        pid: Some(pid),
        limit: Some(1),
        ..Default::default()
    }))
    .await?;

    Ok(processes.into_iter().next())
}

/// Start a new process
pub async fn start_process(request: StartProcessRequest) -> Result<StartProcessResult, ProcessError> {
    let start = Instant::now();

    let mut cmd = Command::new(&request.program);

    // Add arguments
    for arg in &request.args {
        cmd.arg(arg);
    }

    // Set working directory
    if let Some(cwd) = &request.cwd {
        cmd.current_dir(cwd);
    }

    // Set environment variables
    for (key, value) in &request.env {
        cmd.env(key, value);
    }

    if request.detached {
        // Spawn detached process using setsid
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            unsafe {
                cmd.pre_exec(|| {
                    // Create new session
                    libc::setsid();
                    Ok(())
                });
            }
        }

        match cmd.spawn() {
            Ok(child) => {
                let pid = child.id();
                Ok(StartProcessResult {
                    success: true,
                    pid,
                    stdout: None,
                    stderr: None,
                    exit_code: None,
                    error: None,
                    duration_ms: Some(start.elapsed().as_millis() as u64),
                })
            }
            Err(e) => Ok(StartProcessResult {
                success: false,
                pid: None,
                stdout: None,
                stderr: None,
                exit_code: None,
                error: Some(e.to_string()),
                duration_ms: Some(start.elapsed().as_millis() as u64),
            }),
        }
    } else {
        // Run and capture output
        let timeout_secs = request.timeout_secs.unwrap_or(30);

        match tokio::time::timeout(
            std::time::Duration::from_secs(timeout_secs),
            cmd.output(),
        )
        .await
        {
            Ok(Ok(output)) => Ok(StartProcessResult {
                success: output.status.success(),
                pid: None,
                stdout: Some(String::from_utf8_lossy(&output.stdout).to_string()),
                stderr: Some(String::from_utf8_lossy(&output.stderr).to_string()),
                exit_code: output.status.code(),
                error: None,
                duration_ms: Some(start.elapsed().as_millis() as u64),
            }),
            Ok(Err(e)) => Ok(StartProcessResult {
                success: false,
                pid: None,
                stdout: None,
                stderr: None,
                exit_code: None,
                error: Some(e.to_string()),
                duration_ms: Some(start.elapsed().as_millis() as u64),
            }),
            Err(_) => Ok(StartProcessResult {
                success: false,
                pid: None,
                stdout: None,
                stderr: None,
                exit_code: None,
                error: Some("Process timed out".to_string()),
                duration_ms: Some(start.elapsed().as_millis() as u64),
            }),
        }
    }
}

/// Terminate a process
pub async fn terminate_process(request: TerminateProcessRequest) -> Result<TerminateProcessResult, ProcessError> {
    use nix::sys::signal::{kill, Signal};
    use nix::unistd::Pid;

    let pid = Pid::from_raw(request.pid as i32);
    let signal = if request.force {
        Signal::SIGKILL
    } else {
        Signal::SIGTERM
    };

    match kill(pid, signal) {
        Ok(()) => Ok(TerminateProcessResult {
            success: true,
            exit_code: None, // Not available immediately
            error: None,
        }),
        Err(e) => {
            if e == nix::errno::Errno::ESRCH {
                Err(ProcessError::NotFound(request.pid))
            } else if e == nix::errno::Errno::EPERM {
                Err(ProcessError::PermissionDenied(format!(
                    "Cannot terminate process {}: {}",
                    request.pid, e
                )))
            } else {
                Ok(TerminateProcessResult {
                    success: false,
                    exit_code: None,
                    error: Some(e.to_string()),
                })
            }
        }
    }
}

/// Apply filter to a process
pub(super) fn apply_filter(info: &ProcessInfo, filter: &ProcessFilter) -> bool {
    // Filter by PID
    if let Some(pid) = filter.pid {
        if info.pid != pid {
            return false;
        }
    }

    // Filter by name
    if let Some(ref name) = filter.name {
        if !info.name.to_lowercase().contains(&name.to_lowercase()) {
            return false;
        }
    }

    // Filter by parent PID
    if let Some(parent_pid) = filter.parent_pid {
        if info.parent_pid != Some(parent_pid) {
            return false;
        }
    }

    // Filter by user
    if let Some(ref user) = filter.user {
        if let Some(ref info_user) = info.user {
            if !info_user.to_lowercase().contains(&user.to_lowercase()) {
                return false;
            }
        } else {
            return false;
        }
    }

    // Filter by min CPU
    if let Some(min_cpu) = filter.min_cpu {
        if let Some(cpu) = info.cpu_percent {
            if cpu < min_cpu {
                return false;
            }
        } else {
            return false;
        }
    }

    // Filter by min memory
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

/// Sort processes by field
pub(super) fn sort_processes(processes: &mut Vec<ProcessInfo>, sort_by: ProcessSortField, desc: bool) {
    processes.sort_by(|a, b| {
        let cmp = match sort_by {
            ProcessSortField::Pid => a.pid.cmp(&b.pid),
            ProcessSortField::Name => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            ProcessSortField::Cpu => {
                let a_cpu = a.cpu_percent.unwrap_or(0.0);
                let b_cpu = b.cpu_percent.unwrap_or(0.0);
                a_cpu.partial_cmp(&b_cpu).unwrap_or(std::cmp::Ordering::Equal)
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
