//! Jupyter Kernel Process Management
//!
//! Manages the lifecycle of IPython kernel processes:
//! - Starting kernels in virtual environments
//! - Communication via stdin/stdout (simplified protocol)
//! - Process monitoring and cleanup

use crate::jupyter::protocol::ExecuteRequest;
use log::{debug, error, info, trace, warn};
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
        info!(
            "Creating new Jupyter kernel: id={}, env_path={}",
            id, env_path
        );
        debug!(
            "Kernel config: timeout={}s, max_output={}, startup_timeout={}s, idle_timeout={}s",
            config.timeout_secs,
            config.max_output_size,
            config.startup_timeout_secs,
            config.idle_timeout_secs
        );
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
        info!("Starting kernel {}: env_path={}", self.id, self.env_path);
        let python_path = self.get_python_path();
        debug!("Python executable path: {}", python_path);

        if !std::path::Path::new(&python_path).exists() {
            error!(
                "Kernel {} start failed: Python not found at {}",
                self.id, python_path
            );
            return Err(format!("Python not found at: {}", python_path));
        }

        // Get Python version
        self.python_version = self.detect_python_version(&python_path);
        if let Some(ref version) = self.python_version {
            info!("Kernel {}: Detected Python version {}", self.id, version);
        } else {
            warn!("Kernel {}: Could not detect Python version", self.id);
        }

        // Check if ipykernel is installed
        debug!("Kernel {}: Checking ipykernel installation", self.id);
        if !self.check_ipykernel_installed(&python_path)? {
            info!(
                "Kernel {}: ipykernel not found, attempting installation",
                self.id
            );
            // Try to install ipykernel
            self.install_ipykernel(&python_path)?;
            info!("Kernel {}: ipykernel installed successfully", self.id);
        } else {
            debug!("Kernel {}: ipykernel already installed", self.id);
        }

        self.status = KernelStatus::Idle;
        self.last_activity_at = Some(chrono::Utc::now());
        info!(
            "Kernel {} started successfully, status={}",
            self.id, self.status
        );

        Ok(())
    }

    /// Execute Python code
    pub async fn execute(&mut self, code: &str) -> Result<super::KernelExecutionResult, String> {
        let code_preview = if code.len() > 100 {
            format!("{}...", &code[..100])
        } else {
            code.to_string()
        };
        debug!(
            "Kernel {} execute [{}]: {}",
            self.id,
            self.execution_count + 1,
            code_preview.replace('\n', "\\n")
        );

        if self.status == KernelStatus::Dead {
            error!("Kernel {} execute failed: kernel is dead", self.id);
            return Err("Kernel is dead".to_string());
        }

        // Lightweight protocol integration: create ExecuteRequest for logging
        let execute_request = ExecuteRequest::new(code.to_string());
        trace!(
            "Kernel {} executing with protocol: msg_type={}, silent={}, store_history={}",
            self.id,
            "execute_request",
            execute_request.silent,
            execute_request.store_history
        );

        self.status = KernelStatus::Busy;
        self.last_activity_at = Some(chrono::Utc::now());
        let start_time = Instant::now();
        trace!("Kernel {} status changed to Busy", self.id);

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

                // Update variables cache with successful execution
                if !stdout.is_empty() || !stderr.is_empty() {
                    self.cache_variables_from_output(&stdout);
                }

                let success = stderr.is_empty();
                if success {
                    info!(
                        "Kernel {} execute [{}] completed: {}ms, stdout={} bytes, display_data={} items",
                        self.id,
                        self.execution_count,
                        execution_time_ms,
                        stdout.len(),
                        display_data.len()
                    );
                    trace!("Kernel {} stdout: {}", self.id, stdout);
                } else {
                    warn!(
                        "Kernel {} execute [{}] had errors: {}ms, stderr={} bytes",
                        self.id,
                        self.execution_count,
                        execution_time_ms,
                        stderr.len()
                    );
                    debug!("Kernel {} stderr: {}", self.id, stderr);
                }

                Ok(super::KernelExecutionResult {
                    success,
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
                let execution_time_ms = start_time.elapsed().as_millis() as u64;
                error!(
                    "Kernel {} execute [{}] failed after {}ms: {}",
                    self.id, self.execution_count, execution_time_ms, e
                );
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
                    execution_time_ms,
                })
            }
        }
    }

    /// Execute Python code using subprocess
    async fn execute_python(
        &self,
        python_path: &str,
        code: &str,
    ) -> Result<(String, String), String> {
        trace!(
            "Kernel {}: Executing Python subprocess at {}",
            self.id,
            python_path
        );
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
                .args([
                    "/C",
                    &format!(
                        "\"{}\" -c \"{}\"",
                        python_path,
                        wrapper_code.replace("\"", "\\\"").replace("\n", " ")
                    ),
                ])
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
                trace!(
                    "Kernel {}: Subprocess raw output: {} bytes stdout, {} bytes stderr",
                    self.id,
                    raw_output.len(),
                    raw_stderr.len()
                );

                // Try to parse JSON output
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(raw_output.trim()) {
                    let stdout = parsed["stdout"].as_str().unwrap_or("").to_string();
                    let stderr = parsed["stderr"].as_str().unwrap_or("").to_string();
                    trace!("Kernel {}: Parsed JSON output successfully", self.id);
                    Ok((
                        stdout,
                        if stderr.is_empty() {
                            raw_stderr
                        } else {
                            stderr
                        },
                    ))
                } else {
                    // Fallback to raw output
                    debug!(
                        "Kernel {}: Could not parse JSON output, using raw output",
                        self.id
                    );
                    Ok((raw_output, raw_stderr))
                }
            }
            Err(e) => {
                error!("Kernel {}: Subprocess execution error: {}", self.id, e);
                Err(e.to_string())
            }
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
        debug!(
            "Kernel {}: Detecting Python version at {}",
            self.id, python_path
        );
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", &format!("\"{}\" --version", python_path)])
                .output()
        } else {
            Command::new(python_path).args(["--version"]).output()
        };

        output.ok().and_then(|out| {
            if out.status.success() {
                let version = String::from_utf8_lossy(&out.stdout);
                let version_str = version.trim().replace("Python ", "");
                debug!(
                    "Kernel {}: Python version detected: {}",
                    self.id, version_str
                );
                Some(version_str)
            } else {
                warn!(
                    "Kernel {}: Python version command failed with status {:?}",
                    self.id,
                    out.status.code()
                );
                None
            }
        })
    }

    /// Check if ipykernel is installed
    fn check_ipykernel_installed(&self, python_path: &str) -> Result<bool, String> {
        trace!("Kernel {}: Checking if ipykernel is installed", self.id);
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args([
                    "/C",
                    &format!("\"{}\" -c \"import ipykernel\"", python_path),
                ])
                .output()
        } else {
            Command::new(python_path)
                .args(["-c", "import ipykernel"])
                .output()
        };

        match output {
            Ok(out) => {
                let installed = out.status.success();
                debug!(
                    "Kernel {}: ipykernel installed check: {}",
                    self.id, installed
                );
                Ok(installed)
            }
            Err(e) => {
                error!(
                    "Kernel {}: Failed to check ipykernel installation: {}",
                    self.id, e
                );
                Err(e.to_string())
            }
        }
    }

    /// Install ipykernel in the environment
    fn install_ipykernel(&self, python_path: &str) -> Result<(), String> {
        info!("Kernel {}: Installing ipykernel", self.id);
        // Try using uv first, then pip
        debug!("Kernel {}: Attempting installation via uv", self.id);
        let uv_result = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args([
                    "/C",
                    &format!("uv pip install ipykernel --python \"{}\"", python_path),
                ])
                .output()
        } else {
            Command::new("sh")
                .args([
                    "-c",
                    &format!("uv pip install ipykernel --python '{}'", python_path),
                ])
                .output()
        };

        if let Ok(out) = uv_result {
            if out.status.success() {
                info!(
                    "Kernel {}: ipykernel installed successfully via uv",
                    self.id
                );
                return Ok(());
            }
            debug!(
                "Kernel {}: uv installation failed, stderr: {}",
                self.id,
                String::from_utf8_lossy(&out.stderr)
            );
        } else {
            debug!("Kernel {}: uv command not available", self.id);
        }

        // Fallback to pip
        info!(
            "Kernel {}: Falling back to pip for ipykernel installation",
            self.id
        );
        let pip_result = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args([
                    "/C",
                    &format!("\"{}\" -m pip install ipykernel", python_path),
                ])
                .output()
        } else {
            Command::new(python_path)
                .args(["-m", "pip", "install", "ipykernel"])
                .output()
        };

        match pip_result {
            Ok(out) if out.status.success() => {
                info!(
                    "Kernel {}: ipykernel installed successfully via pip",
                    self.id
                );
                Ok(())
            }
            Ok(out) => {
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                error!("Kernel {}: pip installation failed: {}", self.id, stderr);
                Err(stderr)
            }
            Err(e) => {
                error!("Kernel {}: pip command execution failed: {}", self.id, e);
                Err(e.to_string())
            }
        }
    }

    /// Extract display data from output
    fn extract_display_data(&self, output: &str) -> Vec<super::DisplayData> {
        let mut display_data = vec![];

        // Check for base64 encoded images (matplotlib)
        if output.contains("data:image/png;base64,") {
            trace!("Kernel {}: Found base64 PNG image in output", self.id);
            if let Some(start) = output.find("data:image/png;base64,") {
                if let Some(end) = output[start..]
                    .find("\"")
                    .or_else(|| output[start..].find("'"))
                {
                    let data = &output[start + 22..start + end];
                    display_data.push(super::DisplayData {
                        mime_type: "image/png".to_string(),
                        data: data.to_string(),
                    });
                    debug!(
                        "Kernel {}: Extracted PNG image, {} bytes",
                        self.id,
                        data.len()
                    );
                }
            }
        }

        // Check for HTML output (pandas DataFrames)
        if output.contains("<table") || output.contains("<div") {
            trace!("Kernel {}: Found HTML content in output", self.id);
            // Extract HTML content
            if let (Some(start), Some(end)) = (output.find("<"), output.rfind(">")) {
                let html = &output[start..=end];
                display_data.push(super::DisplayData {
                    mime_type: "text/html".to_string(),
                    data: html.to_string(),
                });
                debug!(
                    "Kernel {}: Extracted HTML content, {} bytes",
                    self.id,
                    html.len()
                );
            }
        }

        if !display_data.is_empty() {
            debug!(
                "Kernel {}: Extracted {} display data items",
                self.id,
                display_data.len()
            );
        }

        display_data
    }

    /// Get current variables in the kernel namespace
    pub async fn get_variables(&mut self) -> Result<Vec<super::VariableInfo>, String> {
        debug!("Kernel {}: Getting variables from namespace", self.id);

        // Return cached variables if available
        if !self.variables.is_empty() {
            debug!("Kernel {}: Returning {} cached variables", self.id, self.variables.len());
            return Ok(self
                .variables
                .iter()
                .map(|(name, value)| super::VariableInfo {
                    name: name.clone(),
                    var_type: "cached".to_string(),
                    value: value.clone(),
                    size: None,
                })
                .collect());
        }

        // Fall back to live query
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
            let vars: Vec<super::VariableInfo> =
                serde_json::from_str(&result.stdout).map_err(|e| {
                    error!("Kernel {}: Failed to parse variables JSON: {}", self.id, e);
                    e.to_string()
                })?;

            // Cache the variables
            for var in &vars {
                self.variables.insert(var.name.clone(), var.value.clone());
            }

            debug!(
                "Kernel {}: Retrieved and cached {} variables from namespace",
                self.id,
                vars.len()
            );
            trace!("Kernel {} variables: {:?}", self.id, vars);
            Ok(vars)
        } else {
            warn!(
                "Kernel {}: get_variables execution failed: {}",
                self.id, result.stderr
            );
            Err(result.stderr)
        }
    }

    /// Get cached variables without querying the kernel
    pub fn get_cached_variables(&self) -> Vec<super::VariableInfo> {
        self.variables
            .iter()
            .map(|(name, value)| super::VariableInfo {
                name: name.clone(),
                var_type: "cached".to_string(),
                value: value.clone(),
                size: None,
            })
            .collect()
    }

    /// Cache variables from execution output
    fn cache_variables_from_output(&mut self, output: &str) {
        // Simple heuristic: extract variable assignments from output
        for line in output.lines() {
            if line.contains('=') && !line.starts_with('#') {
                if let Some(var_name) = line.split('=').next() {
                    let var_name = var_name.trim();
                    if !var_name.is_empty() && !var_name.contains(' ') {
                        let var_value = line.split('=').nth(1).unwrap_or("").trim();
                        self.variables.insert(var_name.to_string(), var_value.to_string());
                        trace!("Kernel {}: Cached variable '{}' with value '{}'", self.id, var_name, var_value);
                    }
                }
            }
        }
    }

    /// Stop the kernel
    pub async fn stop(&mut self) -> Result<(), String> {
        info!("Kernel {}: Stopping kernel", self.id);
        if let Some(mut process) = self.process.take() {
            debug!("Kernel {}: Killing kernel process", self.id);
            if let Err(e) = process.kill() {
                warn!("Kernel {}: Failed to kill process: {}", self.id, e);
            }
        }
        self.status = KernelStatus::Dead;
        info!("Kernel {}: Stopped, status={}", self.id, self.status);
        Ok(())
    }

    /// Restart the kernel
    pub async fn restart(&mut self) -> Result<(), String> {
        info!("Kernel {}: Restarting kernel", self.id);
        self.status = KernelStatus::Restarting;
        self.stop().await?;
        self.execution_count = 0;
        self.variables.clear();
        debug!(
            "Kernel {}: Reset execution_count and variables, starting fresh",
            self.id
        );
        self.start().await
    }

    /// Interrupt current execution
    pub async fn interrupt(&mut self) -> Result<(), String> {
        info!("Kernel {}: Interrupt requested", self.id);
        // For subprocess-based execution, we can't easily interrupt
        // The execution will timeout naturally
        self.status = KernelStatus::Idle;
        debug!(
            "Kernel {}: Status set to Idle (subprocess will timeout naturally)",
            self.id
        );
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
        debug!("Kernel {}: Dropping kernel instance", self.id);
        if let Some(mut process) = self.process.take() {
            info!("Kernel {}: Killing process on drop", self.id);
            if let Err(e) = process.kill() {
                warn!("Kernel {}: Failed to kill process on drop: {}", self.id, e);
            }
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
