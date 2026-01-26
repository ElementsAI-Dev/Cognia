//! Plugin System Module
//!
//! Provides plugin management, Python integration via PyO3, and plugin lifecycle handling.

pub mod manager;
pub mod metrics;
pub mod python;
pub mod signature;
pub mod types;
pub mod watcher;

pub use manager::PluginManager;
pub use metrics::PluginMetricsCollector;
pub use signature::PluginSignatureVerifier;
pub use types::*;
pub use watcher::PluginWatcher;
