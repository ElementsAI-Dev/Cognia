//! Tauri commands module
//!
//! All Tauri IPC commands organized by functional category.

// Functional submodules
pub mod compatibility;
pub mod context;
pub mod devtools;
pub mod extensions;
pub mod input_completion;
pub mod media;
pub mod providers;
pub mod scheduler;
pub mod speedpass_runtime;
pub mod storage;
pub mod system;
pub mod window;
pub mod workflow_runtime;

// Standalone module (already organized)
pub mod academic;
