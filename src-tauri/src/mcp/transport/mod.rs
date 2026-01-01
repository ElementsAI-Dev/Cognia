//! MCP Transport implementations
//!
//! Provides different transport mechanisms for MCP communication

pub mod sse;
pub mod stdio;

use async_trait::async_trait;

use crate::mcp::error::McpResult;

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
#[allow(dead_code)]
pub enum TransportType {
    Stdio,
    Sse,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================================
    // TransportType Tests
    // ============================================================================

    #[test]
    fn test_transport_type_debug() {
        let stdio = TransportType::Stdio;
        let sse = TransportType::Sse;
        
        assert_eq!(format!("{:?}", stdio), "Stdio");
        assert_eq!(format!("{:?}", sse), "Sse");
    }

    #[test]
    fn test_transport_type_clone() {
        let original = TransportType::Stdio;
        let cloned = original;
        
        assert_eq!(original, cloned);
    }

    #[test]
    fn test_transport_type_copy() {
        let original = TransportType::Sse;
        let copied = original;
        
        assert_eq!(original, copied);
    }

    #[test]
    fn test_transport_type_equality() {
        assert_eq!(TransportType::Stdio, TransportType::Stdio);
        assert_eq!(TransportType::Sse, TransportType::Sse);
        assert_ne!(TransportType::Stdio, TransportType::Sse);
    }

    #[test]
    fn test_transport_type_variants() {
        let types = [TransportType::Stdio, TransportType::Sse];
        assert_eq!(types.len(), 2);
    }
}
