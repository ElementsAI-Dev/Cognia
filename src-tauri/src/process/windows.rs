//! Windows-specific process operations

use super::{
    ProcessError, ProcessFilter, ProcessInfo, ProcessSortField, ProcessStatus,
    StartProcessRequest, StartProcessResult, TerminateProcessRequest, TerminateProcessResult,
    MAX_PROCESS_LIST,
};
use std::time::Instant;
use tokio::process::Command;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::ProcessStatus::{K32GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS};
use windows::Win32::System::Threading::{
    OpenProcess, TerminateProcess, PROCESS_QUERY_INFORMATION,
    PROCESS_TERMINATE, PROCESS_VM_READ,
};

/// List running processes on Windows
pub async fn list_processes(filter: Option<ProcessFilter>) -> Result<Vec<ProcessInfo>, ProcessError> {
    tokio::task::spawn_blocking(move || {
        let filter = filter.unwrap_or_default();
        let mut processes = Vec::new();

        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
                .map_err(|e| ProcessError::System(format!("Failed to create snapshot: {}", e)))?;

            if snapshot.is_invalid() {
                return Err(ProcessError::System("Failed to create snapshot".to_string()));
            }

            let mut entry = PROCESSENTRY32W {
                dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
                ..Default::default()
            };

            if Process32FirstW(snapshot, &mut entry).is_ok() {
                loop {
                    let name = String::from_utf16_lossy(
                        &entry.szExeFile[..entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len())]
                    );

                    let pid = entry.th32ProcessID;
                    let parent_pid = if entry.th32ParentProcessID > 0 {
                        Some(entry.th32ParentProcessID)
                    } else {
                        None
                    };

                    // Get additional process info
                    let (memory_bytes, status) = get_process_details(pid);

                    let info = ProcessInfo {
                        pid,
                        name: name.clone(),
                        exe_path: None, // Would require additional API calls
                        cmd_line: None,
                        parent_pid,
                        cpu_percent: None, // Requires sampling over time
                        memory_bytes,
                        status,
                        start_time: None,
                        user: None,
                        cwd: None,
                    };

                    // Apply filters
                    let matches = apply_filter(&info, &filter);
                    if matches {
                        processes.push(info);
                    }

                    // Check limit
                    let limit = filter.limit.unwrap_or(MAX_PROCESS_LIST);
                    if processes.len() >= limit {
                        break;
                    }

                    if Process32NextW(snapshot, &mut entry).is_err() {
                        break;
                    }
                }
            }

            let _ = CloseHandle(snapshot);
        }

        // Sort if requested
        if let Some(sort_by) = filter.sort_by {
            let desc = filter.sort_desc.unwrap_or(false);
            sort_processes(&mut processes, sort_by, desc);
        }

        Ok(processes)
    })
    .await
    .map_err(|e| ProcessError::System(format!("Task join error: {}", e)))?
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

    // Configure for detached or captured
    if request.detached {
        #[cfg(windows)]
        {
            #[allow(unused_imports)]
            use std::os::windows::process::CommandExt;
            const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
            const DETACHED_PROCESS: u32 = 0x00000008;
            cmd.creation_flags(CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS);
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
                pid: None, // Process already completed
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
    tokio::task::spawn_blocking(move || {
        unsafe {
            let access_rights = PROCESS_TERMINATE | PROCESS_QUERY_INFORMATION;
            let handle = OpenProcess(access_rights, false, request.pid)
                .map_err(|e| ProcessError::PermissionDenied(format!("Cannot open process: {}", e)))?;

            if handle.is_invalid() {
                return Err(ProcessError::NotFound(request.pid));
            }

            // If not forcing, we could try WM_CLOSE first, but for simplicity we just terminate
            let result = TerminateProcess(handle, 1);
            let _ = CloseHandle(handle);

            match result {
                Ok(()) => Ok(TerminateProcessResult {
                    success: true,
                    exit_code: Some(1),
                    error: None,
                }),
                Err(e) => Ok(TerminateProcessResult {
                    success: false,
                    exit_code: None,
                    error: Some(format!("Failed to terminate: {}", e)),
                }),
            }
        }
    })
    .await
    .map_err(|e| ProcessError::System(format!("Task join error: {}", e)))?
}

/// Get process memory and status details
fn get_process_details(pid: u32) -> (Option<u64>, ProcessStatus) {
    unsafe {
        let access_rights = PROCESS_QUERY_INFORMATION | PROCESS_VM_READ;
        match OpenProcess(access_rights, false, pid) {
            Ok(handle) => {
                if handle.is_invalid() {
                    return (None, ProcessStatus::Unknown);
                }

                let mut mem_counters = PROCESS_MEMORY_COUNTERS::default();
                let mem_bytes = if K32GetProcessMemoryInfo(
                    handle,
                    &mut mem_counters,
                    std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
                )
                .as_bool()
                {
                    Some(mem_counters.WorkingSetSize as u64)
                } else {
                    None
                };

                let _ = CloseHandle(handle);
                (mem_bytes, ProcessStatus::Running)
            }
            Err(_) => (None, ProcessStatus::Unknown),
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
pub(super) fn sort_processes(processes: &mut [ProcessInfo], sort_by: ProcessSortField, desc: bool) {
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
