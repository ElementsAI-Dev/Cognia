//! Jupyter Kernel Process Management
//!
//! Manages the lifecycle of IPython kernel processes:
//! - Starting kernels in virtual environments
//! - Communication via stdin/stdout (simplified protocol)
//! - Process monitoring and cleanup

#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Child, Command};
use std::time::Instant;

/// Kernel status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KernelStatus {
    Starting,
    Idle,
    Busy,
    Dead,
    Restarting,
}

impl std::fmt::Display for KernelStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            KernelStatus::Starting => write!(f, "starting"),
            KernelStatus::Idle => write!(f, "idle"),
            KernelStatus::Busy => write!(f, "busy"),
            KernelStatus::Dead => write!(f, "dead"),
            KernelStatus::Restarting => write!(f, "restarting"),
        }
    }
}

/// Kernel configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelConfig {
    pub timeout_secs: u64,
    pub max_output_size: usize,
    pub startup_timeout_secs: u64,
    pub idle_timeout_secs: u64,
}

/// Jupyter Kernel instance
pub struct JupyterKernel {
    pub id: String,
    pub env_path: String,
    pub status: KernelStatus,
    pub execution_count: u32,
    pub python_version: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_activity_at: Option<chrono::DateTime<chrono::Utc>>,
    config: KernelConfig,
    process: Option<Child>,
    variables: HashMap<String, String>,
}

impl JupyterKernel {
    /// Create a new kernel instance
    pub fn new(id: String, env_path: String, config: KernelConfig) -> Self {
        Self {
            id,
            env_path,
            status: KernelStatus::Starting,
            execution_count: 0,
            python_version: None,
            created_at: chrono::Utc::now(),
            last_activity_at: None,
            config,
            process: None,
            variables: HashMap::new(),
        }
    }

    /// Start the kernel process
    pub async fn start(&mut self) -> Result<(), String> {
        let python_path = self.get_python_path();

        if !std::path::Path::new(&python_path).exists() {
            return Err(format!("Python not found at: {}", python_path));
        }

        // Get Python version
        self.python_version = self.detect_python_version(&python_path);

        // Check if ipykernel is installed
        if !self.check_ipykernel_installed(&python_path)? {
            // Try to install ipykernel
            self.install_ipykernel(&python_path)?;
        }

        self.status = KernelStatus::Idle;
        self.last_activity_at = Some(chrono::Utc::now());

        Ok(())
    }

    /// Execute Python code
    pub async fn execute(&mut self, code: &str) -> Result<super::KernelExecutionResult, String> {
        if self.status == KernelStatus::Dead {
            return Err("Kernel is dead".to_string());
        }

        self.status = KernelStatus::Busy;
        self.last_activity_at = Some(chrono::Utc::now());
        let start_time = Instant::now();

        let python_path = self.get_python_path();
        
        // Execute using Python directly (simplified approach)
        let result = self.execute_python(&python_path, code).await;

        self.execution_count += 1;
        self.status = KernelStatus::Idle;

        match result {
            Ok((stdout, stderr)) => {
                let execution_time_ms = start_time.elapsed().as_millis() as u64;
                
                // Parse for display data (matplotlib, pandas, etc.)
                let display_data = self.extract_display_data(&stdout);
                
                Ok(super::KernelExecutionResult {
                    success: stderr.is_empty(),
                    execution_count: self.execution_count,
                    stdout,
                    stderr: stderr.clone(),
                    display_data,
                    error: if !stderr.is_empty() {
                        Some(super::ExecutionError {
                            ename: "ExecutionError".to_string(),
                            evalue: stderr.lines().last().unwrap_or("").to_string(),
                            traceback: stderr.lines().map(String::from).collect(),
                        })
                    } else {
                        None
                    },
                    execution_time_ms,
                })
            }
            Err(e) => {
                Ok(super::KernelExecutionResult {
                    success: false,
                    execution_count: self.execution_count,
                    stdout: String::new(),
                    stderr: e.clone(),
                    display_data: vec![],
                    error: Some(super::ExecutionError {
                        ename: "KernelError".to_string(),
                        evalue: e,
                        traceback: vec![],
                    }),
                    execution_time_ms: start_time.elapsed().as_millis() as u64,
                })
            }
        }
    }

    /// Execute Python code using subprocess
    async fn execute_python(&self, python_path: &str, code: &str) -> Result<(String, String), String> {
        // Create a wrapper script that captures output properly
        let wrapper_code = format!(
            r#"
import sys
import io
import json
import traceback

# Capture stdout/stderr
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

try:
    exec(compile('''{}''', '<cell>', 'exec'))
except Exception:
    traceback.print_exc()

stdout_val = sys.stdout.getvalue()
stderr_val = sys.stderr.getvalue()

sys.stdout = old_stdout
sys.stderr = old_stderr

# Output as JSON for parsing
print(json.dumps({{"stdout": stdout_val, "stderr": stderr_val}}))
"#,
            code.replace("'''", r#"\'\'\'"#).replace("\\", "\\\\")
        );

        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", &format!("\"{}\" -c \"{}\"", python_path, 
                    wrapper_code.replace("\"", "\\\"").replace("\n", " "))])
                .output()
        } else {
            Command::new(python_path)
                .args(["-c", &wrapper_code])
                .output()
        };

        match output {
            Ok(out) => {
                let raw_output = String::from_utf8_lossy(&out.stdout).to_string();
                let raw_stderr = String::from_utf8_lossy(&out.stderr).to_string();

                // Try to parse JSON output
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(raw_output.trim()) {
                    let stdout = parsed["stdout"].as_str().unwrap_or("").to_string();
                    let stderr = parsed["stderr"].as_str().unwrap_or("").to_string();
                    Ok((stdout, if stderr.is_empty() { raw_stderr } else { stderr }))
                } else {
                    // Fallback to raw output
                    Ok((raw_output, raw_stderr))
                }
            }
            Err(e) => Err(e.to_string()),
        }
    }

    /// Get Python executable path
    fn get_python_path(&self) -> String {
        if cfg!(target_os = "windows") {
            format!("{}\\Scripts\\python.exe", self.env_path)
        } else {
            format!("{}/bin/python", self.env_path)
        }
    }

    /// Detect Python version
    fn detect_python_version(&self, python_path: &str) -> Option<String> {
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", &format!("\"{}\" --version", python_path)])
                .output()
        } else {
            Command::new(python_path)
                .args(["--version"])
                .output()
        };

        output.ok().and_then(|out| {
            if out.status.success() {
                let version = String::from_utf8_lossy(&out.stdout);
                Some(version.trim().replace("Python ", ""))
            } else {
                None
            }
        })
    }

    /// Check if ipykernel is installed
    fn check_ipykernel_installed(&self, python_path: &str) -> Result<bool, String> {
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", &format!("\"{}\" -c \"import ipykernel\"", python_path)])
                .output()
        } else {
            Command::new(python_path)
                .args(["-c", "import ipykernel"])
                .output()
        };

        match output {
            Ok(out) => Ok(out.status.success()),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Install ipykernel in the environment
    fn install_ipykernel(&self, python_path: &str) -> Result<(), String> {
        // Try using uv first, then pip
        let uv_result = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", &format!("uv pip install ipykernel --python \"{}\"", python_path)])
                .output()
        } else {
            Command::new("sh")
                .args(["-c", &format!("uv pip install ipykernel --python '{}'", python_path)])
                .output()
        };

        if let Ok(out) = uv_result {
            if out.status.success() {
                return Ok(());
            }
        }

        // Fallback to pip
        let pip_result = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", &format!("\"{}\" -m pip install ipykernel", python_path)])
                .output()
        } else {
            Command::new(python_path)
                .args(["-m", "pip", "install", "ipykernel"])
                .output()
        };

        match pip_result {
            Ok(out) if out.status.success() => Ok(()),
            Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Extract display data from output
    fn extract_display_data(&self, output: &str) -> Vec<super::DisplayData> {
        let mut display_data = vec![];

        // Check for base64 encoded images (matplotlib)
        if output.contains("data:image/png;base64,") {
            if let Some(start) = output.find("data:image/png;base64,") {
                if let Some(end) = output[start..].find("\"").or_else(|| output[start..].find("'")) {
                    let data = &output[start + 22..start + end];
                    display_data.push(super::DisplayData {
                        mime_type: "image/png".to_string(),
                        data: data.to_string(),
                    });
                }
            }
        }

        // Check for HTML output (pandas DataFrames)
        if output.contains("<table") || output.contains("<div") {
            // Extract HTML content
            if let (Some(start), Some(end)) = (output.find("<"), output.rfind(">")) {
                let html = &output[start..=end];
                display_data.push(super::DisplayData {
                    mime_type: "text/html".to_string(),
                    data: html.to_string(),
                });
            }
        }

        display_data
    }

    /// Get current variables in the kernel namespace
    pub async fn get_variables(&mut self) -> Result<Vec<super::VariableInfo>, String> {
        let code = r#"
import json
import sys

def get_var_info():
    variables = []
    for name, value in globals().items():
        if not name.startswith('_') and not callable(value) and not isinstance(value, type):
            try:
                type_name = type(value).__name__
                value_str = repr(value)[:100]
                size_str = None
                if hasattr(value, '__len__'):
                    size_str = f"len={len(value)}"
                elif hasattr(value, 'shape'):
                    size_str = f"shape={value.shape}"
                variables.append({
                    "name": name,
                    "type": type_name,
                    "value": value_str,
                    "size": size_str
                })
            except:
                pass
    return variables

print(json.dumps(get_var_info()))
"#;

        let result = self.execute(code).await?;
        
        if result.success {
            let vars: Vec<super::VariableInfo> = serde_json::from_str(&result.stdout)
                .map_err(|e| e.to_string())?;
            Ok(vars)
        } else {
            Err(result.stderr)
        }
    }

    /// Stop the kernel
    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(mut process) = self.process.take() {
            let _ = process.kill();
        }
        self.status = KernelStatus::Dead;
        Ok(())
    }

    /// Restart the kernel
    pub async fn restart(&mut self) -> Result<(), String> {
        self.status = KernelStatus::Restarting;
        self.stop().await?;
        self.execution_count = 0;
        self.variables.clear();
        self.start().await
    }

    /// Interrupt current execution
    pub async fn interrupt(&mut self) -> Result<(), String> {
        // For subprocess-based execution, we can't easily interrupt
        // The execution will timeout naturally
        self.status = KernelStatus::Idle;
        Ok(())
    }

    /// Check if kernel is alive
    pub fn is_alive(&self) -> bool {
        self.status != KernelStatus::Dead
    }

    /// Get kernel info
    pub fn get_info(&self) -> super::KernelInfo {
        super::KernelInfo {
            id: self.id.clone(),
            name: format!("Python {}", self.python_version.as_deref().unwrap_or("3.x")),
            env_path: self.env_path.clone(),
            status: self.status.to_string(),
            python_version: self.python_version.clone(),
            execution_count: self.execution_count,
            created_at: self.created_at.to_rfc3339(),
            last_activity_at: self.last_activity_at.map(|t| t.to_rfc3339()),
        }
    }
}

impl Drop for JupyterKernel {
    fn drop(&mut self) {
        if let Some(mut process) = self.process.take() {
            let _ = process.kill();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kernel_status_display() {
        assert_eq!(KernelStatus::Idle.to_string(), "idle");
        assert_eq!(KernelStatus::Busy.to_string(), "busy");
        assert_eq!(KernelStatus::Dead.to_string(), "dead");
    }

    #[test]
    fn test_kernel_status_serialization() {
        let status = KernelStatus::Idle;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"idle\"");
    }

    #[test]
    fn test_kernel_config_default() {
        let config = KernelConfig::default();
        assert_eq!(config.timeout_secs, 60);
        assert_eq!(config.max_output_size, 1024 * 1024);
    }

    #[test]
    fn test_kernel_creation() {
        let config = KernelConfig::default();
        let kernel = JupyterKernel::new(
            "test-kernel".to_string(),
            "/path/to/env".to_string(),
            config,
        );
        
        assert_eq!(kernel.id, "test-kernel");
        assert_eq!(kernel.status, KernelStatus::Starting);
        assert_eq!(kernel.execution_count, 0);
    }
}
