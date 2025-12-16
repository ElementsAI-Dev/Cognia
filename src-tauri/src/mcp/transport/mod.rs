//! MCP Transport implementations
//!
//! Provides different transport mechanisms for MCP communication

pub mod sse;
pub mod stdio;

use async_trait::async_trait;

use crate::mcp::error::McpResult;
use crate::mcp::protocol::JsonRpcMessage;

/// Transport trait for MCP communication
#[async_trait]
pub trait Transport: Send + Sync {
    /// Send a message through the transport
    async fn send(&self, message: &str) -> McpResult<()>;

    /// Receive the next message from the transport
    async fn receive(&self) -> McpResult<String>;

    /// Close the transport connection
    async fn close(&self) -> McpResult<()>;

    /// Check if the transport is still connected
    fn is_connected(&self) -> bool;
}

/// Transport type enum for configuration
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransportType {
    Stdio,
    Sse,
}
