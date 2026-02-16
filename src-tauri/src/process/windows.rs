//! Windows-specific process operations
//!
//! Process listing/querying is now handled by sysinfo in mod.rs.
//! This module only provides platform-specific start and terminate operations.

use super::{
    ProcessError, StartProcessRequest, StartProcessResult, TerminateProcessRequest,
    TerminateProcessResult,
};
use std::time::Instant;
use tokio::process::Command;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Threading::{
    OpenProcess, TerminateProcess, PROCESS_QUERY_INFORMATION, PROCESS_TERMINATE,
};

/// Start a new process
pub async fn start_process(
    request: StartProcessRequest,
) -> Result<StartProcessResult, ProcessError> {
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

        match tokio::time::timeout(std::time::Duration::from_secs(timeout_secs), cmd.output()).await
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
pub async fn terminate_process(
    request: TerminateProcessRequest,
) -> Result<TerminateProcessResult, ProcessError> {
    tokio::task::spawn_blocking(move || {
        unsafe {
            let access_rights = PROCESS_TERMINATE | PROCESS_QUERY_INFORMATION;
            let handle = OpenProcess(access_rights, false, request.pid).map_err(|e| {
                ProcessError::PermissionDenied(format!("Cannot open process: {}", e))
            })?;

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
