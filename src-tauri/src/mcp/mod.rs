//! MCP (Model Context Protocol) module for Cognia
//!
//! This module provides complete MCP support including:
//! - Multiple transport types (stdio, SSE)
//! - Full protocol implementation (tools, resources, prompts, sampling)
//! - Server lifecycle management
//! - Configuration persistence

#![allow(dead_code)]

pub mod client;
pub mod config;
pub mod error;
pub mod manager;
pub mod protocol;
pub mod transport;
pub mod types;

pub use manager::McpManager;
