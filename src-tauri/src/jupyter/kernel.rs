//! Jupyter Kernel Process Management
//!
//! Manages the lifecycle of IPython kernel processes:
//! - Starting kernels in virtual environments
//! - Communication via stdin/stdout (simplified protocol)
//! - Process monitoring and cleanup

use crate::jupyter::protocol::{ExecuteRequest, MessageHeader};
use log::{debug, error, info, trace, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command as TokioCommand;

/// Sentinel markers for persistent REPL output framing
const EXEC_START_MARKER: &str = "__COGNIA_EXEC_START__";
const EXEC_END_MARKER: &str = "__COGNIA_EXEC_END__";

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

/// Python REPL wrapper script that runs as a persistent process.
/// Reads JSON commands from stdin, executes code, and writes JSON results to stdout
/// between sentinel markers (__COGNIA_EXEC_START__ / __COGNIA_EXEC_END__).
/// Variables persist across executions in the `_ns` namespace dict.
const PYTHON_REPL_SCRIPT: &str = r#"
import sys, io, json, base64, traceback, ast, os

EXEC_START = "__COGNIA_EXEC_START__"
EXEC_END = "__COGNIA_EXEC_END__"

try:
    import matplotlib
    matplotlib.use('Agg')
except ImportError:
    pass

_ns = {"__builtins__": __builtins__}

def _capture_plots():
    dd = []
    try:
        import matplotlib.pyplot as plt
        for i in plt.get_fignums():
            fig = plt.figure(i)
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            buf.seek(0)
            dd.append({"mimeType": "image/png", "data": base64.b64encode(buf.read()).decode()})
            buf.close()
        plt.close('all')
    except Exception:
        pass
    return dd

def _get_vars():
    skip = {'__builtins__'}
    result = []
    for n, v in _ns.items():
        if n.startswith('_') or n in skip or callable(v) or isinstance(v, type):
            continue
        try:
            t = type(v).__name__
            vs = repr(v)[:200]
            s = None
            if hasattr(v, '__len__'):
                s = f"len={len(v)}"
            elif hasattr(v, 'shape'):
                s = f"shape={v.shape}"
            result.append({"name": n, "type": t, "value": vs, "size": s})
        except Exception:
            pass
    return result

def _auto_install(module_name):
    """Try to pip install a missing module. Returns True on success."""
    import subprocess as _sp
    pkg = module_name.split('.')[0]
    _KNOWN_MAP = {'cv2': 'opencv-python', 'sklearn': 'scikit-learn', 'PIL': 'Pillow',
                  'yaml': 'PyYAML', 'bs4': 'beautifulsoup4', 'attr': 'attrs',
                  'dateutil': 'python-dateutil', 'dotenv': 'python-dotenv'}
    pkg = _KNOWN_MAP.get(pkg, pkg)
    try:
        r = _sp.run([sys.executable, '-m', 'pip', 'install', pkg],
                     capture_output=True, text=True, timeout=120)
        return r.returncode == 0
    except Exception:
        return False

def _run_tree(tree):
    """Execute a parsed AST, displaying the last expression result if applicable."""
    if not tree.body:
        return
    last = tree.body[-1]
    if isinstance(last, ast.Expr):
        if len(tree.body) > 1:
            mod = ast.Module(body=tree.body[:-1], type_ignores=[])
            exec(compile(mod, '<cell>', 'exec'), _ns)
        result = eval(compile(ast.Expression(body=last.value), '<cell>', 'eval'), _ns)
        if result is not None:
            _ns['_'] = result
            if hasattr(result, '_repr_html_'):
                h = result._repr_html_()
                if h:
                    _ns['_last_repr_html'] = h
            print(repr(result))
    else:
        exec(compile(tree, '<cell>', 'exec'), _ns)

def _exec_code(code):
    try:
        tree = ast.parse(code, '<cell>')
    except SyntaxError:
        exec(compile(code, '<cell>', 'exec'), _ns)
        return
    try:
        _run_tree(tree)
    except (ImportError, ModuleNotFoundError) as e:
        mod_name = e.name if hasattr(e, 'name') and e.name else str(e).split("'")[1] if "'" in str(e) else None
        if mod_name and _auto_install(mod_name):
            print(f"[auto-installed '{mod_name}', retrying...]")
            _run_tree(tree)
        else:
            raise

_out = sys.__stdout__
while True:
    try:
        line = sys.__stdin__.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue
        cmd = json.loads(line)
        action = cmd.get("action", "execute")
        exec_id = cmd.get("exec_id", "")
        if action == "shutdown":
            break
        if action == "get_variables":
            r = {"exec_id": exec_id, "success": True, "variables": _get_vars()}
            _out.write(EXEC_START + "\n")
            _out.write(json.dumps(r) + "\n")
            _out.write(EXEC_END + "\n")
            _out.flush()
            continue
        code = base64.b64decode(cmd["code_b64"]).decode("utf-8")
        old_out, old_err = sys.stdout, sys.stderr
        cap_out, cap_err = io.StringIO(), io.StringIO()
        sys.stdout, sys.stderr = cap_out, cap_err
        success = True
        error_info = None
        _ns.pop('_last_repr_html', None)
        try:
            _exec_code(code)
        except Exception as e:
            success = False
            tb = traceback.format_exception(type(e), e, e.__traceback__)
            error_info = {"ename": type(e).__name__, "evalue": str(e), "traceback": tb}
            traceback.print_exc(file=cap_err)
        so = cap_out.getvalue()
        se = cap_err.getvalue()
        sys.stdout, sys.stderr = old_out, old_err
        dd = _capture_plots()
        h = _ns.pop('_last_repr_html', None)
        if h:
            dd.append({"mimeType": "text/html", "data": h})
        r = {"exec_id": exec_id, "success": success, "stdout": so, "stderr": se, "display_data": dd, "error": error_info}
        _out.write(EXEC_START + "\n")
        _out.write(json.dumps(r) + "\n")
        _out.write(EXEC_END + "\n")
        _out.flush()
    except json.JSONDecodeError:
        continue
    except Exception as e:
        try:
            r = {"exec_id": "", "success": False, "stdout": "", "stderr": str(e), "display_data": [], "error": {"ename": "REPLError", "evalue": str(e), "traceback": []}}
            _out.write(EXEC_START + "\n")
            _out.write(json.dumps(r) + "\n")
            _out.write(EXEC_END + "\n")
            _out.flush()
        except Exception:
            pass
"#;

/// Jupyter Kernel instance with a persistent Python REPL process.
/// Variables and state persist across executions within the same kernel.
pub struct JupyterKernel {
    pub id: String,
    pub env_path: String,
    pub status: KernelStatus,
    pub execution_count: u32,
    pub python_version: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_activity_at: Option<chrono::DateTime<chrono::Utc>>,
    config: KernelConfig,
    /// Persistent Python REPL process
    process: Option<tokio::process::Child>,
    /// Stdin handle for sending commands to the REPL
    stdin_handle: Option<tokio::process::ChildStdin>,
    /// Buffered stdout reader for receiving results from the REPL
    stdout_reader: Option<BufReader<tokio::process::ChildStdout>>,
    /// Temp file path for the REPL script
    script_path: Option<std::path::PathBuf>,
    /// Cached variables from last get_variables() call
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
            stdin_handle: None,
            stdout_reader: None,
            script_path: None,
            variables: HashMap::new(),
        }
    }

    /// Start the persistent kernel process.
    /// Spawns a long-running Python REPL that maintains variable state across executions.
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
            self.install_ipykernel(&python_path)?;
            info!("Kernel {}: ipykernel installed successfully", self.id);
        } else {
            debug!("Kernel {}: ipykernel already installed", self.id);
        }

        // Write the REPL script to a temp file
        let temp_dir = std::env::temp_dir();
        let script_path = temp_dir.join(format!("cognia_repl_{}.py", self.id));
        std::fs::write(&script_path, PYTHON_REPL_SCRIPT)
            .map_err(|e| format!("Failed to write REPL script: {}", e))?;
        debug!(
            "Kernel {}: REPL script written to {}",
            self.id,
            script_path.display()
        );

        // Spawn persistent Python REPL process with piped I/O
        let mut child = TokioCommand::new(&python_path)
            .args(["-u", script_path.to_str().unwrap_or("cognia_repl.py")])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| format!("Failed to start kernel process: {}", e))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Failed to capture kernel stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture kernel stdout".to_string())?;

        self.process = Some(child);
        self.stdin_handle = Some(stdin);
        self.stdout_reader = Some(BufReader::new(stdout));
        self.script_path = Some(script_path);

        self.status = KernelStatus::Idle;
        self.last_activity_at = Some(chrono::Utc::now());
        info!(
            "Kernel {} started successfully with persistent REPL, status={}",
            self.id, self.status
        );

        Ok(())
    }

    /// Execute Python code in the persistent REPL process.
    /// Variables and state persist across calls within the same kernel.
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

        // Lightweight protocol integration: create proper Jupyter message header and request
        let msg_header = MessageHeader::new("execute_request", &self.id);
        let execute_request = ExecuteRequest::new(code.to_string());
        trace!(
            "Kernel {} executing with protocol: msg_id={}, msg_type={}, silent={}, store_history={}",
            self.id,
            msg_header.msg_id,
            msg_header.msg_type,
            execute_request.silent,
            execute_request.store_history
        );

        self.status = KernelStatus::Busy;
        self.last_activity_at = Some(chrono::Utc::now());
        let start_time = Instant::now();
        trace!("Kernel {} status changed to Busy", self.id);

        // Send execute command to persistent REPL
        let exec_id = uuid::Uuid::new_v4().to_string();
        use base64::{engine::general_purpose::STANDARD, Engine};
        let code_b64 = STANDARD.encode(code.as_bytes());

        let cmd = serde_json::json!({
            "action": "execute",
            "exec_id": exec_id,
            "code_b64": code_b64
        });

        let stdin = self
            .stdin_handle
            .as_mut()
            .ok_or_else(|| "Kernel process not started".to_string())?;
        Self::send_command(stdin, &cmd).await?;

        // Read result from persistent REPL stdout
        let timeout = Duration::from_secs(self.config.timeout_secs);
        let max_output = self.config.max_output_size;
        let reader = self
            .stdout_reader
            .as_mut()
            .ok_or_else(|| "Kernel process not started".to_string())?;
        let result = Self::read_result(reader, timeout, max_output).await;

        self.execution_count += 1;
        self.status = KernelStatus::Idle;

        match result {
            Ok(parsed) => {
                let execution_time_ms = start_time.elapsed().as_millis() as u64;
                let success = parsed["success"].as_bool().unwrap_or(false);
                let stdout = parsed["stdout"].as_str().unwrap_or("").to_string();
                let stderr = parsed["stderr"].as_str().unwrap_or("").to_string();

                // Parse display data from Python REPL (matplotlib plots, HTML reprs, etc.)
                let display_data: Vec<super::DisplayData> = parsed["display_data"]
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|d| {
                                Some(super::DisplayData {
                                    mime_type: d["mimeType"].as_str()?.to_string(),
                                    data: d["data"].as_str()?.to_string(),
                                })
                            })
                            .collect()
                    })
                    .unwrap_or_default();

                // Parse error from Python REPL
                let error = parsed["error"].as_object().map(|err| {
                    super::ExecutionError {
                        ename: err
                            .get("ename")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Error")
                            .to_string(),
                        evalue: err
                            .get("evalue")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        traceback: err
                            .get("traceback")
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|s| s.as_str().map(String::from))
                                    .collect()
                            })
                            .unwrap_or_default(),
                    }
                });

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
                    stderr,
                    display_data,
                    error,
                    execution_time_ms,
                })
            }
            Err(e) => {
                let execution_time_ms = start_time.elapsed().as_millis() as u64;
                error!(
                    "Kernel {} execute [{}] failed after {}ms: {}",
                    self.id, self.execution_count, execution_time_ms, e
                );

                // Check if process is still alive
                if let Some(ref mut proc) = self.process {
                    if let Ok(Some(exit_status)) = proc.try_wait() {
                        warn!(
                            "Kernel {}: Process exited with status {:?}",
                            self.id, exit_status
                        );
                        self.status = KernelStatus::Dead;
                    }
                }

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

    /// Send a JSON command to the persistent Python REPL via stdin
    async fn send_command(
        stdin: &mut tokio::process::ChildStdin,
        command: &serde_json::Value,
    ) -> Result<(), String> {
        let cmd_str = serde_json::to_string(command)
            .map_err(|e| format!("Failed to serialize command: {}", e))?;
        stdin
            .write_all(cmd_str.as_bytes())
            .await
            .map_err(|e| format!("Failed to write to kernel stdin: {}", e))?;
        stdin
            .write_all(b"\n")
            .await
            .map_err(|e| format!("Failed to write newline to kernel: {}", e))?;
        stdin
            .flush()
            .await
            .map_err(|e| format!("Failed to flush kernel stdin: {}", e))?;
        Ok(())
    }

    /// Read execution result from the persistent Python REPL stdout.
    /// Reads lines until sentinel markers are found, with timeout protection.
    async fn read_result(
        reader: &mut BufReader<tokio::process::ChildStdout>,
        timeout_duration: Duration,
        max_output: usize,
    ) -> Result<serde_json::Value, String> {
        let read_future = async {
            let mut result_lines: Vec<String> = Vec::new();
            let mut found_start = false;
            let mut line = String::new();

            loop {
                line.clear();
                let bytes_read = reader
                    .read_line(&mut line)
                    .await
                    .map_err(|e| format!("Failed to read from kernel stdout: {}", e))?;

                if bytes_read == 0 {
                    return Err("Kernel process terminated unexpectedly".to_string());
                }

                let trimmed = line.trim();

                if trimmed == EXEC_START_MARKER {
                    found_start = true;
                    continue;
                }

                if trimmed == EXEC_END_MARKER && found_start {
                    break;
                }

                if found_start {
                    result_lines.push(trimmed.to_string());
                    let total_size: usize = result_lines.iter().map(|l| l.len()).sum();
                    if total_size > max_output {
                        return Err(format!(
                            "Output exceeds maximum size ({} bytes)",
                            max_output
                        ));
                    }
                }
            }

            let json_str = result_lines.join("\n");
            serde_json::from_str(&json_str)
                .map_err(|e| format!("Failed to parse kernel result JSON: {}", e))
        };

        tokio::time::timeout(timeout_duration, read_future)
            .await
            .map_err(|_| {
                format!(
                    "Execution timed out after {}s",
                    timeout_duration.as_secs()
                )
            })?
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

    /// Get current variables in the kernel namespace.
    /// Queries the persistent REPL process directly for live variable state.
    pub async fn get_variables(&mut self) -> Result<Vec<super::VariableInfo>, String> {
        debug!("Kernel {}: Getting variables from namespace", self.id);

        if self.status == KernelStatus::Dead || self.stdin_handle.is_none() {
            // Return cached if process not available
            debug!(
                "Kernel {}: Process not available, returning {} cached variables",
                self.id,
                self.variables.len()
            );
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

        // Query the persistent REPL for live variables
        let exec_id = uuid::Uuid::new_v4().to_string();
        let cmd = serde_json::json!({
            "action": "get_variables",
            "exec_id": exec_id
        });

        let stdin = self
            .stdin_handle
            .as_mut()
            .ok_or_else(|| "Kernel process not started".to_string())?;
        Self::send_command(stdin, &cmd).await?;

        let timeout = Duration::from_secs(10); // Variables query should be fast
        let max_output = self.config.max_output_size;
        let reader = self
            .stdout_reader
            .as_mut()
            .ok_or_else(|| "Kernel process not started".to_string())?;
        let parsed = Self::read_result(reader, timeout, max_output).await?;

        let vars: Vec<super::VariableInfo> = parsed["variables"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| {
                        Some(super::VariableInfo {
                            name: v["name"].as_str()?.to_string(),
                            var_type: v["type"].as_str()?.to_string(),
                            value: v["value"].as_str()?.to_string(),
                            size: v["size"].as_str().map(String::from),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        // Update cache
        self.variables.clear();
        for var in &vars {
            self.variables.insert(var.name.clone(), var.value.clone());
        }

        debug!(
            "Kernel {}: Retrieved {} live variables from persistent REPL",
            self.id,
            vars.len()
        );
        trace!("Kernel {} variables: {:?}", self.id, vars);
        Ok(vars)
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

    /// Get kernel configuration
    pub fn get_config(&self) -> &KernelConfig {
        &self.config
    }

    /// Stop the persistent kernel process and clean up resources.
    pub async fn stop(&mut self) -> Result<(), String> {
        info!("Kernel {}: Stopping kernel", self.id);

        // Try graceful shutdown first
        if let Some(ref mut stdin) = self.stdin_handle {
            let shutdown_cmd = serde_json::json!({"action": "shutdown"});
            let _ = Self::send_command(stdin, &shutdown_cmd).await;
        }

        // Drop stdin/stdout handles
        self.stdin_handle.take();
        self.stdout_reader.take();

        // Kill the process if still running
        if let Some(ref mut process) = self.process {
            debug!("Kernel {}: Killing kernel process", self.id);
            if let Err(e) = process.start_kill() {
                warn!("Kernel {}: Failed to kill process: {}", self.id, e);
            }
            // Wait briefly for process to exit
            let _ = tokio::time::timeout(
                Duration::from_secs(2),
                process.wait(),
            )
            .await;
        }
        self.process.take();

        // Clean up temp script file
        if let Some(ref script_path) = self.script_path {
            if let Err(e) = std::fs::remove_file(script_path) {
                debug!(
                    "Kernel {}: Could not remove temp script: {}",
                    self.id, e
                );
            }
        }
        self.script_path.take();

        self.status = KernelStatus::Dead;
        info!("Kernel {}: Stopped, status={}", self.id, self.status);
        Ok(())
    }

    /// Restart the kernel: stops the persistent process and starts a fresh one.
    /// All variables and state are reset.
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

    /// Interrupt current execution by sending a signal to the persistent process.
    /// On Unix: sends SIGINT (KeyboardInterrupt in Python).
    /// On Windows: kills and restarts the process (variables are lost).
    pub async fn interrupt(&mut self) -> Result<(), String> {
        info!("Kernel {}: Interrupt requested", self.id);

        if let Some(ref process) = self.process {
            if let Some(pid) = process.id() {
                #[cfg(unix)]
                {
                    // Send SIGINT to the Python process - triggers KeyboardInterrupt
                    debug!(
                        "Kernel {}: Sending SIGINT to process {}",
                        self.id, pid
                    );
                    unsafe {
                        libc::kill(pid as i32, libc::SIGINT);
                    }
                    self.status = KernelStatus::Idle;
                    info!(
                        "Kernel {}: SIGINT sent, kernel should recover to idle",
                        self.id
                    );
                    return Ok(());
                }

                #[cfg(windows)]
                {
                    // Windows: no easy SIGINT for child processes.
                    // Kill and restart to interrupt.
                    warn!(
                        "Kernel {}: Windows interrupt - killing process {} and restarting",
                        self.id, pid
                    );
                    return self.restart().await;
                }

                #[cfg(not(any(unix, windows)))]
                {
                    warn!(
                        "Kernel {}: Interrupt not supported on this platform",
                        self.id
                    );
                    self.status = KernelStatus::Idle;
                    return Ok(());
                }
            }
        }

        // No process running
        self.status = KernelStatus::Idle;
        debug!(
            "Kernel {}: No process to interrupt, setting status to Idle",
            self.id
        );
        Ok(())
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
            config: self.get_config().clone(),
        }
    }
}

impl Drop for JupyterKernel {
    fn drop(&mut self) {
        debug!("Kernel {}: Dropping kernel instance", self.id);
        // Drop stdin/stdout handles first to signal EOF
        self.stdin_handle.take();
        self.stdout_reader.take();
        // Kill persistent process (kill_on_drop is also set, but be explicit)
        if let Some(ref mut process) = self.process {
            info!("Kernel {}: Killing process on drop", self.id);
            if let Err(e) = process.start_kill() {
                warn!("Kernel {}: Failed to kill process on drop: {}", self.id, e);
            }
        }
        self.process.take();
        // Clean up temp script file
        if let Some(ref script_path) = self.script_path {
            let _ = std::fs::remove_file(script_path);
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
