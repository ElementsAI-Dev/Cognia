//! Plugin System Module
//!
//! Provides plugin management, Python integration via PyO3, and plugin lifecycle handling.

pub mod manager;
pub mod python;
pub mod types;

pub use manager::{PluginManager, PythonRuntimeInfo, PythonPluginInfo};
pub use types::*;
