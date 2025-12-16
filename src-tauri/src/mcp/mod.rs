//! MCP (Model Context Protocol) module for Cognia
//!
//! This module provides complete MCP support including:
//! - Multiple transport types (stdio, SSE)
//! - Full protocol implementation (tools, resources, prompts, sampling)
//! - Server lifecycle management
//! - Configuration persistence

pub mod client;
pub mod config;
pub mod error;
pub mod manager;
pub mod protocol;
pub mod transport;
pub mod types;

pub use client::McpClient;
pub use config::McpConfigManager;
pub use error::McpError;
pub use manager::McpManager;
pub use types::*;
