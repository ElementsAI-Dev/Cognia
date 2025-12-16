//! stdio transport implementation for MCP
//!
//! Communicates with MCP servers via subprocess stdin/stdout

use async_trait::async_trait;
use parking_lot::Mutex;
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
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
        let mut cmd = Command::new(command);
        cmd.args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        // Set environment variables
        for (key, value) in env {
            cmd.env(key, value);
        }

        // Set working directory if specified
        if let Some(dir) = working_dir {
            cmd.current_dir(dir);
        }

        // On Windows, prevent window from showing
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let mut child = cmd
            .spawn()
            .map_err(|e| McpError::SpawnFailed(format!("{}: {}", command, e)))?;

        let stdin = child.stdin.take().ok_or(McpError::StdinUnavailable)?;
        let stdout = child.stdout.take().ok_or(McpError::StdoutUnavailable)?;

        log::info!("Spawned MCP server process: {} {:?}", command, args);

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
            Ok(Some(_status)) => {
                // Process has exited
                self.connected.store(false, Ordering::SeqCst);
                false
            }
            Ok(None) => {
                // Process is still running
                true
            }
            Err(_) => {
                // Error checking status
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
            return Err(McpError::NotConnected);
        }

        let mut stdin = self.stdin.lock().await;

        // Write message followed by newline
        stdin
            .write_all(message.as_bytes())
            .await
            .map_err(|e| McpError::IoError(e))?;

        stdin
            .write_all(b"\n")
            .await
            .map_err(|e| McpError::IoError(e))?;

        stdin.flush().await.map_err(|e| McpError::IoError(e))?;

        log::trace!("Sent message: {}", message);

        Ok(())
    }

    async fn receive(&self) -> McpResult<String> {
        if !self.is_connected() {
            return Err(McpError::NotConnected);
        }

        let mut stdout = self.stdout.lock().await;
        let mut line = String::new();

        let bytes_read = stdout
            .read_line(&mut line)
            .await
            .map_err(|e| McpError::IoError(e))?;

        if bytes_read == 0 {
            // EOF - process closed stdout
            self.connected.store(false, Ordering::SeqCst);
            return Err(McpError::TransportError("Connection closed".to_string()));
        }

        let trimmed = line.trim().to_string();
        log::trace!("Received message: {}", trimmed);

        Ok(trimmed)
    }

    async fn close(&self) -> McpResult<()> {
        self.connected.store(false, Ordering::SeqCst);

        let mut child = self.child.lock().await;

        // Try to kill the process gracefully
        match child.kill().await {
            Ok(_) => {
                log::info!("MCP server process terminated");
            }
            Err(e) => {
                log::warn!("Failed to kill MCP server process: {}", e);
            }
        }

        Ok(())
    }

    fn is_connected(&self) -> bool {
        self.connected.load(Ordering::SeqCst)
    }
}

impl Drop for StdioTransport {
    fn drop(&mut self) {
        self.connected.store(false, Ordering::SeqCst);
        // Child process will be killed on drop due to kill_on_drop(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_stdio_transport_creation() {
        // This test requires a simple echo command
        #[cfg(windows)]
        let result = StdioTransport::spawn("cmd", &["/c".to_string(), "echo test".to_string()], &HashMap::new(), None).await;

        #[cfg(not(windows))]
        let result = StdioTransport::spawn("echo", &["test".to_string()], &HashMap::new(), None).await;

        assert!(result.is_ok());
    }
}
