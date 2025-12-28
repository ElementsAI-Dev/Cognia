//! Native process execution runtime
//!
//! Fallback execution using native OS processes (less secure than containers).

use async_trait::async_trait;
use std::collections::HashMap;
use std::process::Stdio;
use std::time::Instant;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::time::timeout;

use super::languages::LanguageConfig;
use super::runtime::{
    ExecutionConfig, ExecutionRequest, ExecutionResult, RuntimeType, SandboxError, SandboxRuntime,
};

/// Native language runtime commands
struct NativeCommand {
    /// Command to check if runtime is available
    check_cmd: &'static str,
    /// Arguments for check command
    check_args: &'static [&'static str],
    /// Compile command (if needed)
    compile_cmd: Option<&'static str>,
    /// Run command
    run_cmd: &'static str,
}

lazy_static::lazy_static! {
    static ref NATIVE_COMMANDS: HashMap<&'static str, NativeCommand> = {
        let mut m = HashMap::new();
        m.insert("python", NativeCommand {
            check_cmd: "python3",
            check_args: &["--version"],
            compile_cmd: None,
            run_cmd: "python3",
        });
        m.insert("javascript", NativeCommand {
            check_cmd: "node",
            check_args: &["--version"],
            compile_cmd: None,
            run_cmd: "node",
        });
        m.insert("typescript", NativeCommand {
            check_cmd: "npx",
            check_args: &["tsc", "--version"],
            compile_cmd: Some("npx tsc"),
            run_cmd: "node",
        });
        m.insert("go", NativeCommand {
            check_cmd: "go",
            check_args: &["version"],
            compile_cmd: None,
            run_cmd: "go run",
        });
        m.insert("rust", NativeCommand {
            check_cmd: "rustc",
            check_args: &["--version"],
            compile_cmd: Some("rustc"),
            run_cmd: "",
        });
        m.insert("ruby", NativeCommand {
            check_cmd: "ruby",
            check_args: &["--version"],
            compile_cmd: None,
            run_cmd: "ruby",
        });
        m.insert("php", NativeCommand {
            check_cmd: "php",
            check_args: &["--version"],
            compile_cmd: None,
            run_cmd: "php",
        });
        m.insert("bash", NativeCommand {
            check_cmd: "bash",
            check_args: &["--version"],
            compile_cmd: None,
            run_cmd: "bash",
        });
        m.insert("powershell", NativeCommand {
            check_cmd: "pwsh",
            check_args: &["--version"],
            compile_cmd: None,
            run_cmd: "pwsh -File",
        });
        m.insert("lua", NativeCommand {
            check_cmd: "lua",
            check_args: &["-v"],
            compile_cmd: None,
            run_cmd: "lua",
        });
        m.insert("perl", NativeCommand {
            check_cmd: "perl",
            check_args: &["--version"],
            compile_cmd: None,
            run_cmd: "perl",
        });
        m
    };
}

/// Native runtime for local process execution (fallback, less secure)
pub struct NativeRuntime {
    _available_languages: Vec<String>,
}

impl NativeRuntime {
    pub fn new() -> Self {
        Self {
            _available_languages: Vec::new(),
        }
    }

    /// Check which languages are available natively
    #[allow(dead_code)]
    pub async fn detect_available_languages(&mut self) {
        self._available_languages.clear();
        
        for (lang, cmd) in NATIVE_COMMANDS.iter() {
            let result = Command::new(cmd.check_cmd)
                .args(cmd.check_args)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .await;

            if result.map(|s| s.success()).unwrap_or(false) {
                self._available_languages.push(lang.to_string());
            }
        }
    }

    #[allow(dead_code)]
    pub fn get_available_languages(&self) -> &[String] {
        &self._available_languages
    }
}

impl Default for NativeRuntime {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl SandboxRuntime for NativeRuntime {
    fn runtime_type(&self) -> RuntimeType {
        RuntimeType::Native
    }

    async fn is_available(&self) -> bool {
        // Native runtime is always "available" but may have limited language support
        true
    }

    async fn get_version(&self) -> Result<String, SandboxError> {
        Ok("native-1.0".to_string())
    }

    async fn execute(
        &self,
        request: &ExecutionRequest,
        language_config: &LanguageConfig,
        exec_config: &ExecutionConfig,
    ) -> Result<ExecutionResult, SandboxError> {
        let native_cmd = NATIVE_COMMANDS.get(language_config.id).ok_or_else(|| {
            SandboxError::LanguageNotSupported(format!(
                "{} is not supported in native mode",
                language_config.name
            ))
        })?;

        let start = Instant::now();

        // Create temporary directory
        let temp_dir = tempfile::tempdir()?;
        let work_dir = temp_dir.path().to_path_buf();

        // Write code file
        let code_path = work_dir.join(language_config.file_name);
        tokio::fs::write(&code_path, &request.code).await?;

        // Write additional files
        for (name, content) in &request.files {
            let file_path = work_dir.join(name);
            if let Some(parent) = file_path.parent() {
                tokio::fs::create_dir_all(parent).await?;
            }
            tokio::fs::write(&file_path, content).await?;
        }

        // Compile if needed
        let mut output_path = code_path.clone();
        if let Some(compile) = native_cmd.compile_cmd {
            let parts: Vec<&str> = compile.split_whitespace().collect();
            let mut compile_cmd = Command::new(parts[0]);
            
            for part in &parts[1..] {
                compile_cmd.arg(part);
            }
            compile_cmd.arg(&code_path);
            compile_cmd.current_dir(&work_dir);

            if language_config.id == "rust" {
                output_path = work_dir.join("main");
                compile_cmd.arg("-o").arg(&output_path);
            }

            let compile_result = timeout(exec_config.timeout, compile_cmd.output()).await;

            match compile_result {
                Ok(Ok(output)) if !output.status.success() => {
                    return Ok(ExecutionResult::success(
                        request.id.clone(),
                        String::new(),
                        String::from_utf8_lossy(&output.stderr).to_string(),
                        output.status.code().unwrap_or(1),
                        start.elapsed().as_millis() as u64,
                        RuntimeType::Native,
                        request.language.clone(),
                    ));
                }
                Ok(Err(e)) => return Err(SandboxError::ExecutionFailed(e.to_string())),
                Err(_) => {
                    return Ok(ExecutionResult::timeout(
                        request.id.clone(),
                        String::new(),
                        String::new(),
                        exec_config.timeout.as_secs(),
                        RuntimeType::Native,
                        request.language.clone(),
                    ));
                }
                _ => {}
            }
        }

        // Run
        let run_parts: Vec<&str> = native_cmd.run_cmd.split_whitespace().collect();
        let mut run_cmd = if run_parts.is_empty() {
            Command::new(&output_path)
        } else {
            let mut cmd = Command::new(run_parts[0]);
            for part in &run_parts[1..] {
                cmd.arg(part);
            }
            if native_cmd.compile_cmd.is_none() {
                cmd.arg(&code_path);
            } else if !run_parts.is_empty() {
                cmd.arg(&output_path);
            }
            cmd
        };

        run_cmd.current_dir(&work_dir);
        run_cmd.stdin(Stdio::piped());
        run_cmd.stdout(Stdio::piped());
        run_cmd.stderr(Stdio::piped());

        // Set environment variables
        for (key, value) in &request.env {
            run_cmd.env(key, value);
        }

        // Add arguments
        for arg in &request.args {
            run_cmd.arg(arg);
        }

        let mut child = run_cmd.spawn().map_err(|e| {
            SandboxError::ExecutionFailed(format!("Failed to start process: {}", e))
        })?;

        // Write stdin
        if let Some(stdin_data) = &request.stdin {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(stdin_data.as_bytes()).await;
                drop(stdin);
            }
        }

        let result = timeout(exec_config.timeout, child.wait_with_output()).await;
        let execution_time_ms = start.elapsed().as_millis() as u64;

        match result {
            Ok(Ok(output)) => {
                let mut stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let mut stderr = String::from_utf8_lossy(&output.stderr).to_string();

                if stdout.len() > exec_config.max_output_size {
                    stdout.truncate(exec_config.max_output_size);
                    stdout.push_str("\n... [output truncated]");
                }
                if stderr.len() > exec_config.max_output_size {
                    stderr.truncate(exec_config.max_output_size);
                    stderr.push_str("\n... [output truncated]");
                }

                Ok(ExecutionResult::success(
                    request.id.clone(),
                    stdout,
                    stderr,
                    output.status.code().unwrap_or(-1),
                    execution_time_ms,
                    RuntimeType::Native,
                    request.language.clone(),
                ))
            }
            Ok(Err(e)) => Err(SandboxError::ExecutionFailed(e.to_string())),
            Err(_) => Ok(ExecutionResult::timeout(
                request.id.clone(),
                String::new(),
                String::new(),
                exec_config.timeout.as_secs(),
                RuntimeType::Native,
                request.language.clone(),
            )),
        }
    }

    async fn cleanup(&self) -> Result<(), SandboxError> {
        // Native runtime cleanup is handled by tempfile
        Ok(())
    }
}
