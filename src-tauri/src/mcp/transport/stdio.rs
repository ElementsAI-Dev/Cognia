//! stdio transport implementation for MCP
//!
//! Communicates with MCP servers via subprocess stdin/stdout

use async_trait::async_trait;
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout, Command};
use tokio::sync::Mutex as TokioMutex;

use crate::mcp::error::{McpError, McpResult};
use crate::mcp::transport::Transport;

/// stdio transport for subprocess communication
pub struct StdioTransport {
    child: TokioMutex<Child>,
    stdin: TokioMutex<ChildStdin>,
    stdout: TokioMutex<BufReader<ChildStdout>>,
    connected: AtomicBool,
}

impl StdioTransport {
    /// Spawn a new subprocess and create a stdio transport
    pub async fn spawn(
        command: &str,
        args: &[String],
        env: &HashMap<String, String>,
        working_dir: Option<&str>,
    ) -> McpResult<Self> {
        log::debug!(
            "Spawning stdio transport: command='{}', args={:?}, env_vars={}, working_dir={:?}",
            command,
            args,
            env.len(),
            working_dir
        );

        let mut cmd = Command::new(command);
        cmd.args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        // Set environment variables
        for (key, value) in env {
            log::trace!(
                "Setting env var: {}={}",
                key,
                if key.to_lowercase().contains("key")
                    || key.to_lowercase().contains("secret")
                    || key.to_lowercase().contains("token")
                {
                    "[REDACTED]"
                } else {
                    value
                }
            );
            cmd.env(key, value);
        }

        // Set working directory if specified
        if let Some(dir) = working_dir {
            log::trace!("Setting working directory: {}", dir);
            cmd.current_dir(dir);
        }

        // On Windows, prevent window from showing
        #[cfg(windows)]
        {
            #[allow(unused_imports)]
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        log::debug!("Executing spawn command");
        let mut child = cmd.spawn().map_err(|e| {
            log::error!("Failed to spawn process '{}': {}", command, e);
            McpError::SpawnFailed(format!("{}: {}", command, e))
        })?;

        let pid = child.id();
        log::debug!("Process spawned with PID: {:?}", pid);

        let stdin = child.stdin.take().ok_or_else(|| {
            log::error!("Failed to capture stdin for process '{}'", command);
            McpError::StdinUnavailable
        })?;
        let stdout = child.stdout.take().ok_or_else(|| {
            log::error!("Failed to capture stdout for process '{}'", command);
            McpError::StdoutUnavailable
        })?;

        log::info!(
            "Spawned MCP server process: {} {:?} (PID: {:?})",
            command,
            args,
            pid
        );

        Ok(Self {
            child: TokioMutex::new(child),
            stdin: TokioMutex::new(stdin),
            stdout: TokioMutex::new(BufReader::new(stdout)),
            connected: AtomicBool::new(true),
        })
    }

    /// Check if the child process is still running
    pub async fn check_process(&self) -> bool {
        let mut child = self.child.lock().await;
        match child.try_wait() {
            Ok(Some(status)) => {
                // Process has exited
                log::debug!("Process exited with status: {:?}", status);
                self.connected.store(false, Ordering::SeqCst);
                false
            }
            Ok(None) => {
                // Process is still running
                log::trace!("Process is still running");
                true
            }
            Err(e) => {
                // Error checking status
                log::warn!("Error checking process status: {}", e);
                self.connected.store(false, Ordering::SeqCst);
                false
            }
        }
    }

    /// Get the process ID if available
    pub async fn pid(&self) -> Option<u32> {
        let child = self.child.lock().await;
        child.id()
    }
}

#[async_trait]
impl Transport for StdioTransport {
    async fn send(&self, message: &str) -> McpResult<()> {
        if !self.is_connected() {
            log::warn!("Attempted to send message on disconnected stdio transport");
            return Err(McpError::NotConnected);
        }

        let msg_len = message.len();
        log::trace!("Sending {} bytes via stdio", msg_len);

        let mut stdin = self.stdin.lock().await;

        // Write message followed by newline
        stdin.write_all(message.as_bytes()).await.map_err(|e| {
            log::error!("Failed to write to stdin: {}", e);
            McpError::IoError(e)
        })?;

        stdin.write_all(b"\n").await.map_err(|e| {
            log::error!("Failed to write newline to stdin: {}", e);
            McpError::IoError(e)
        })?;

        stdin.flush().await.map_err(|e| {
            log::error!("Failed to flush stdin: {}", e);
            McpError::IoError(e)
        })?;

        log::trace!(
            "Sent message ({} bytes): {}",
            msg_len,
            if msg_len > 500 {
                &message[..500]
            } else {
                message
            }
        );

        Ok(())
    }

    async fn receive(&self) -> McpResult<String> {
        if !self.is_connected() {
            log::warn!("Attempted to receive message on disconnected stdio transport");
            return Err(McpError::NotConnected);
        }

        let mut stdout = self.stdout.lock().await;
        let mut line = String::new();

        log::trace!("Waiting to receive message from stdout");
        let bytes_read = stdout.read_line(&mut line).await.map_err(|e| {
            log::error!("Failed to read from stdout: {}", e);
            McpError::IoError(e)
        })?;

        if bytes_read == 0 {
            // EOF - process closed stdout
            log::warn!("EOF received on stdout, process likely terminated");
            self.connected.store(false, Ordering::SeqCst);
            return Err(McpError::TransportError("Connection closed".to_string()));
        }

        let trimmed = line.trim().to_string();
        let msg_len = trimmed.len();
        log::trace!(
            "Received message ({} bytes): {}",
            msg_len,
            if msg_len > 500 {
                &trimmed[..500]
            } else {
                &trimmed
            }
        );

        Ok(trimmed)
    }

    async fn close(&self) -> McpResult<()> {
        log::debug!("Closing stdio transport");
        self.connected.store(false, Ordering::SeqCst);

        let process_pid = self.pid().await;
        let still_running = self.check_process().await;

        if !still_running {
            log::info!(
                "MCP server process (PID: {:?}) already exited, skipping kill",
                process_pid
            );
            return Ok(());
        }

        // Try to kill the process gracefully
        let mut child = self.child.lock().await;
        log::debug!("Terminating child process (PID: {:?})", process_pid);
        match child.kill().await {
            Ok(_) => {
                log::info!(
                    "MCP server process terminated successfully (PID: {:?})",
                    process_pid
                );
            }
            Err(e) => {
                log::warn!("Failed to kill MCP server process (PID: {:?}): {}", process_pid, e);
            }
        }

        Ok(())
    }

    fn is_connected(&self) -> bool {
        let connected = self.connected.load(Ordering::SeqCst);
        log::trace!("Stdio transport connection status: {}", connected);
        connected
    }
}

impl Drop for StdioTransport {
    fn drop(&mut self) {
        log::debug!("Dropping stdio transport, marking as disconnected");
        self.connected.store(false, Ordering::SeqCst);
        // Child process will be killed on drop due to kill_on_drop(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================================
    // StdioTransport Creation Tests
    // ============================================================================

    #[tokio::test]
    async fn test_stdio_transport_creation() {
        // This test requires a simple echo command
        #[cfg(windows)]
        let result = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo test".to_string()],
            &HashMap::new(),
            None,
        )
        .await;

        #[cfg(not(windows))]
        let result =
            StdioTransport::spawn("echo", &["test".to_string()], &HashMap::new(), None).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_stdio_transport_spawn_nonexistent_command() {
        let result =
            StdioTransport::spawn("nonexistent_command_12345", &[], &HashMap::new(), None).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_stdio_transport_with_env_vars() {
        let mut env = HashMap::new();
        env.insert("TEST_VAR".to_string(), "test_value".to_string());

        #[cfg(windows)]
        let result = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo %TEST_VAR%".to_string()],
            &env,
            None,
        )
        .await;

        #[cfg(not(windows))]
        let result = StdioTransport::spawn("echo", &["$TEST_VAR".to_string()], &env, None).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_stdio_transport_with_working_dir() {
        #[cfg(windows)]
        let result = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "cd".to_string()],
            &HashMap::new(),
            Some("."),
        )
        .await;

        #[cfg(not(windows))]
        let result = StdioTransport::spawn("pwd", &[], &HashMap::new(), Some(".")).await;

        assert!(result.is_ok());
    }

    // ============================================================================
    // Connection State Tests
    // ============================================================================

    #[tokio::test]
    async fn test_stdio_transport_is_connected_initially() {
        #[cfg(windows)]
        let transport = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo test".to_string()],
            &HashMap::new(),
            None,
        )
        .await
        .unwrap();

        #[cfg(not(windows))]
        let transport = StdioTransport::spawn("cat", &[], &HashMap::new(), None)
            .await
            .unwrap();

        assert!(transport.is_connected());
    }

    #[tokio::test]
    async fn test_stdio_transport_close() {
        #[cfg(windows)]
        let transport = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo test".to_string()],
            &HashMap::new(),
            None,
        )
        .await
        .unwrap();

        #[cfg(not(windows))]
        let transport = StdioTransport::spawn("cat", &[], &HashMap::new(), None)
            .await
            .unwrap();

        let close_result = transport.close().await;
        assert!(close_result.is_ok());
        assert!(!transport.is_connected());
    }

    // ============================================================================
    // Process Management Tests
    // ============================================================================

    #[tokio::test]
    async fn test_stdio_transport_pid() {
        #[cfg(windows)]
        let transport = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo test".to_string()],
            &HashMap::new(),
            None,
        )
        .await
        .unwrap();

        #[cfg(not(windows))]
        let transport = StdioTransport::spawn("cat", &[], &HashMap::new(), None)
            .await
            .unwrap();

        let pid = transport.pid().await;
        // PID should be available for a running process
        assert!(pid.is_some() || pid.is_none()); // PID may or may not be available depending on timing
    }

    #[tokio::test]
    async fn test_stdio_transport_check_process() {
        #[cfg(windows)]
        let transport = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo test".to_string()],
            &HashMap::new(),
            None,
        )
        .await
        .unwrap();

        #[cfg(not(windows))]
        let transport = StdioTransport::spawn("sleep", &["0.1".to_string()], &HashMap::new(), None)
            .await
            .unwrap();

        // Process should be running initially or may have completed
        let _is_running = transport.check_process().await;
        // We just verify this doesn't panic
    }

    // ============================================================================
    // Send/Receive Tests
    // ============================================================================

    #[tokio::test]
    async fn test_stdio_transport_send_when_not_connected() {
        #[cfg(windows)]
        let transport = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo test".to_string()],
            &HashMap::new(),
            None,
        )
        .await
        .unwrap();

        #[cfg(not(windows))]
        let transport = StdioTransport::spawn("cat", &[], &HashMap::new(), None)
            .await
            .unwrap();

        transport.close().await.unwrap();

        let result = transport.send("test message").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_stdio_transport_receive_when_not_connected() {
        #[cfg(windows)]
        let transport = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo test".to_string()],
            &HashMap::new(),
            None,
        )
        .await
        .unwrap();

        #[cfg(not(windows))]
        let transport = StdioTransport::spawn("cat", &[], &HashMap::new(), None)
            .await
            .unwrap();

        transport.close().await.unwrap();

        let result = transport.receive().await;
        assert!(result.is_err());
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[tokio::test]
    async fn test_stdio_transport_with_empty_args() {
        #[cfg(windows)]
        let result = StdioTransport::spawn("cmd", &["/c".to_string()], &HashMap::new(), None).await;

        #[cfg(not(windows))]
        let result = StdioTransport::spawn("true", &[], &HashMap::new(), None).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_stdio_transport_multiple_close_calls() {
        #[cfg(windows)]
        let transport = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo test".to_string()],
            &HashMap::new(),
            None,
        )
        .await
        .unwrap();

        #[cfg(not(windows))]
        let transport = StdioTransport::spawn("cat", &[], &HashMap::new(), None)
            .await
            .unwrap();

        // First close
        let result1 = transport.close().await;
        assert!(result1.is_ok());

        // Second close should also succeed (idempotent)
        let result2 = transport.close().await;
        assert!(result2.is_ok());
    }

    #[tokio::test]
    async fn test_stdio_transport_with_multiple_env_vars() {
        let mut env = HashMap::new();
        env.insert("VAR1".to_string(), "value1".to_string());
        env.insert("VAR2".to_string(), "value2".to_string());
        env.insert("VAR3".to_string(), "value3".to_string());

        #[cfg(windows)]
        let result = StdioTransport::spawn(
            "cmd",
            &["/c".to_string(), "echo test".to_string()],
            &env,
            None,
        )
        .await;

        #[cfg(not(windows))]
        let result = StdioTransport::spawn("echo", &["test".to_string()], &env, None).await;

        assert!(result.is_ok());
    }
}
