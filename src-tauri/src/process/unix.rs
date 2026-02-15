//! Unix-specific process operations
//!
//! Process listing/querying is now handled by sysinfo in mod.rs.
//! This module only provides platform-specific start and terminate operations.

use super::{
    ProcessError, StartProcessRequest, StartProcessResult, TerminateProcessRequest,
    TerminateProcessResult,
};
use std::time::Instant;
use tokio::process::Command;

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
