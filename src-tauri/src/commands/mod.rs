//! Tauri commands module
//!
//! All Tauri IPC commands organized by functional category.

// Functional submodules
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
pub mod workflow_runtime;
pub mod window;

// Standalone module (already organized)
pub mod academic;
