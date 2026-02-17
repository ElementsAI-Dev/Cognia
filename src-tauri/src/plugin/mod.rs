//! Plugin System Module
//!
//! Provides plugin management, Python integration via PyO3, and plugin lifecycle handling.

pub mod manager;
pub mod python;
pub mod types;
pub mod api_gateway;

pub use manager::{PluginManager, PythonPluginInfo, PythonRuntimeInfo};
pub use types::*;
