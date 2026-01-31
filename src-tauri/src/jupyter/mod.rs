//! Jupyter Kernel Module
//!
//! Provides Jupyter kernel management for executing Python code in virtual environments.
//! Supports:
//! - Starting/stopping IPython kernels
//! - Code execution with rich output
//! - Variable inspection
//! - Session management

pub mod kernel;
pub mod protocol;
pub mod session;

// Re-exports for public API
// Note: JupyterKernel and JupyterSession are imported directly from submodules in commands
pub use kernel::KernelConfig;

use serde::{Deserialize, Serialize};

/// Kernel execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelExecutionResult {
    pub success: bool,
    #[serde(rename = "executionCount")]
    pub execution_count: u32,
    pub stdout: String,
    pub stderr: String,
    #[serde(rename = "displayData")]
    pub display_data: Vec<DisplayData>,
    pub error: Option<ExecutionError>,
    #[serde(rename = "executionTimeMs")]
    pub execution_time_ms: u64,
}

/// Display data from kernel output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayData {
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    pub data: String,
}

/// Execution error information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionError {
    pub ename: String,
    pub evalue: String,
    pub traceback: Vec<String>,
}

/// Variable information from kernel
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableInfo {
    pub name: String,
    #[serde(rename = "type")]
    pub var_type: String,
    pub value: String,
    pub size: Option<String>,
}

/// Kernel info response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelInfo {
    pub id: String,
    pub name: String,
    #[serde(rename = "envPath")]
    pub env_path: String,
    pub status: String,
    #[serde(rename = "pythonVersion")]
    pub python_version: Option<String>,
    #[serde(rename = "executionCount")]
    pub execution_count: u32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "lastActivityAt")]
    pub last_activity_at: Option<String>,
    pub config: KernelConfig,
}

/// Default kernel configuration
impl Default for KernelConfig {
    fn default() -> Self {
        Self {
            timeout_secs: 60,
            max_output_size: 1024 * 1024, // 1MB
            startup_timeout_secs: 30,
            idle_timeout_secs: 3600, // 1 hour
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kernel_execution_result_serialization() {
        let result = KernelExecutionResult {
            success: true,
            execution_count: 1,
            stdout: "Hello, World!".to_string(),
            stderr: String::new(),
            display_data: vec![],
            error: None,
            execution_time_ms: 100,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("executionCount"));
        assert!(json.contains("displayData"));
        assert!(json.contains("executionTimeMs"));
        assert!(json.contains("Hello, World!"));
    }

    #[test]
    fn test_display_data_serialization() {
        let data = DisplayData {
            mime_type: "text/html".to_string(),
            data: "<p>test</p>".to_string(),
        };

        let json = serde_json::to_string(&data).unwrap();
        assert!(json.contains("mimeType"));
    }

    #[test]
    fn test_variable_info_serialization() {
        let var = VariableInfo {
            name: "x".to_string(),
            var_type: "int".to_string(),
            value: "42".to_string(),
            size: Some("28 bytes".to_string()),
        };

        let json = serde_json::to_string(&var).unwrap();
        assert!(json.contains("type"));
    }
}
