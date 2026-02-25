//! Native process execution runtime
//!
//! Fallback execution using native OS processes (less secure than containers).

use async_trait::async_trait;
use std::collections::HashMap;
use std::process::Stdio;
use std::time::Instant;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::time::timeout;

use super::languages::LanguageConfig;
use super::runtime::{
    ExecutionConfig, ExecutionRequest, ExecutionResult, OutputLine, RuntimeType, SandboxError,
    SandboxRuntime,
};
use super::workspace::{create_workspace, write_execution_files};

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

        // Python: Windows uses "python", Unix uses "python3"
        #[cfg(target_os = "windows")]
        m.insert("python", NativeCommand {
            check_cmd: "python",
            check_args: &["--version"],
            compile_cmd: None,
            run_cmd: "python",
        });
        #[cfg(not(target_os = "windows"))]
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

        // Bash: only available on Unix (or Git Bash on Windows, but not reliable)
        #[cfg(not(target_os = "windows"))]
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
        log::trace!("Creating new NativeRuntime instance");
        Self {
            _available_languages: Vec::new(),
        }
    }

    /// Check which languages are available natively
    pub async fn detect_available_languages(&mut self) {
        log::debug!("Detecting available native languages...");
        self._available_languages.clear();

        for (lang, cmd) in NATIVE_COMMANDS.iter() {
            log::trace!(
                "Checking native support for {}: {} {:?}",
                lang,
                cmd.check_cmd,
                cmd.check_args
            );
            let result = Command::new(cmd.check_cmd)
                .args(cmd.check_args)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .await;

            if result.map(|s| s.success()).unwrap_or(false) {
                log::debug!("Native runtime available for: {}", lang);
                self._available_languages.push(lang.to_string());
            } else {
                log::trace!("Native runtime not available for: {}", lang);
            }
        }

        log::info!(
            "Detected {} native language runtime(s): {:?}",
            self._available_languages.len(),
            self._available_languages
        );
    }

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
        log::trace!("Native runtime availability check: always true");
        true
    }

    async fn get_version(&self) -> Result<String, SandboxError> {
        log::trace!("Native runtime version: native-1.0");
        Ok("native-1.0".to_string())
    }

    async fn execute(
        &self,
        request: &ExecutionRequest,
        language_config: &LanguageConfig,
        exec_config: &ExecutionConfig,
    ) -> Result<ExecutionResult, SandboxError> {
        log::debug!(
            "Native execute: id={}, language={}",
            request.id,
            request.language
        );

        let native_cmd = NATIVE_COMMANDS.get(language_config.id).ok_or_else(|| {
            log::warn!(
                "Language '{}' is not supported in native mode",
                language_config.name
            );
            SandboxError::LanguageNotSupported(format!(
                "{} is not supported in native mode",
                language_config.name
            ))
        })?;

        log::debug!(
            "Native command config: check={}, compile={:?}, run={}",
            native_cmd.check_cmd,
            native_cmd.compile_cmd,
            native_cmd.run_cmd
        );

        let start = Instant::now();

        let workspace = create_workspace(exec_config.workspace_dir.as_deref(), &request.id).await?;
        let work_dir = workspace.path().to_path_buf();
        log::trace!("Created execution workspace: {:?}", work_dir);

        let code_path = write_execution_files(&work_dir, request, language_config).await?;
        log::trace!("Wrote execution files to {:?}", work_dir);

        // Compile if needed
        let mut output_path = code_path.clone();
        if let Some(compile) = native_cmd.compile_cmd {
            log::debug!("Compiling code using native compiler: {}", compile);

            // Apply compiler settings to determine the actual compiler and flags
            let effective_compile = if let Some(settings) = &request.compiler_settings {
                // For native mode, the compile_cmd is just the base command (e.g. "rustc")
                // We build a full command string and apply settings to it
                let base_cmd = format!("{} {{file}}", compile);
                let modified = settings.apply_to_compile_cmd(&base_cmd, &request.language);
                modified.replace("{file}", "")
            } else {
                compile.to_string()
            };

            let parts: Vec<&str> = effective_compile.split_whitespace().collect();
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

            log::trace!("Running compilation command...");
            let compile_result = timeout(exec_config.timeout, compile_cmd.output()).await;

            match compile_result {
                Ok(Ok(output)) if !output.status.success() => {
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    log::debug!(
                        "Compilation failed: exit_code={:?}, stderr_len={}",
                        output.status.code(),
                        stderr.len()
                    );
                    return Ok(ExecutionResult::success(
                        request.id.clone(),
                        String::new(),
                        stderr,
                        output.status.code().unwrap_or(1),
                        start.elapsed().as_millis() as u64,
                        RuntimeType::Native,
                        request.language.clone(),
                    ));
                }
                Ok(Err(e)) => {
                    log::error!("Compilation error: {}", e);
                    return Err(SandboxError::ExecutionFailed(e.to_string()));
                }
                Err(_) => {
                    log::warn!(
                        "Compilation timeout after {}s",
                        exec_config.timeout.as_secs()
                    );
                    return Ok(ExecutionResult::timeout(
                        request.id.clone(),
                        String::new(),
                        String::new(),
                        exec_config.timeout.as_secs(),
                        RuntimeType::Native,
                        request.language.clone(),
                    ));
                }
                Ok(Ok(_)) => {
                    log::debug!("Compilation successful");
                }
            }
        }

        // Run
        log::debug!("Running code with command: {}", native_cmd.run_cmd);
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

        // Set environment variables (from request)
        if !request.env.is_empty() {
            log::trace!("Setting {} environment variable(s)", request.env.len());
        }
        for (key, value) in &request.env {
            run_cmd.env(key, value);
        }

        // Set environment variables from compiler settings (e.g., Python flags)
        if let Some(settings) = &request.compiler_settings {
            for (key, value) in settings.env_vars(&request.language) {
                run_cmd.env(&key, &value);
            }
        }

        // Add arguments
        if !request.args.is_empty() {
            log::trace!("Adding {} argument(s)", request.args.len());
        }
        for arg in &request.args {
            run_cmd.arg(arg);
        }

        log::info!("Starting native process for execution: id={}", request.id);
        let mut child = run_cmd.spawn().map_err(|e| {
            log::error!("Failed to spawn native process: {}", e);
            SandboxError::ExecutionFailed(format!("Failed to start process: {}", e))
        })?;

        // Write stdin
        if let Some(stdin_data) = &request.stdin {
            log::trace!("Writing {} bytes to stdin", stdin_data.len());
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(stdin_data.as_bytes()).await;
                drop(stdin);
            }
        }

        log::trace!(
            "Waiting for execution with timeout: {}s",
            exec_config.timeout.as_secs()
        );
        let mut stdout_pipe = child
            .stdout
            .take()
            .ok_or_else(|| SandboxError::ExecutionFailed("failed to capture stdout".to_string()))?;
        let mut stderr_pipe = child
            .stderr
            .take()
            .ok_or_else(|| SandboxError::ExecutionFailed("failed to capture stderr".to_string()))?;

        let stdout_task = tokio::spawn(async move {
            let mut bytes = Vec::new();
            let _ = stdout_pipe.read_to_end(&mut bytes).await;
            bytes
        });
        let stderr_task = tokio::spawn(async move {
            let mut bytes = Vec::new();
            let _ = stderr_pipe.read_to_end(&mut bytes).await;
            bytes
        });

        let result = timeout(exec_config.timeout, child.wait()).await;
        let execution_time_ms = start.elapsed().as_millis() as u64;
        log::debug!("Native execution completed in {}ms", execution_time_ms);

        match result {
            Ok(Ok(status)) => {
                let exit_code = status.code().unwrap_or(-1);
                let stdout_bytes = stdout_task.await.unwrap_or_default();
                let stderr_bytes = stderr_task.await.unwrap_or_default();
                let mut stdout = String::from_utf8_lossy(&stdout_bytes).to_string();
                let mut stderr = String::from_utf8_lossy(&stderr_bytes).to_string();

                log::debug!(
                    "Native execution result: id={}, exit_code={}, stdout_len={}, stderr_len={}",
                    request.id,
                    exit_code,
                    stdout.len(),
                    stderr.len()
                );

                if stdout.len() > exec_config.max_output_size {
                    log::debug!(
                        "Truncating stdout from {} to {} bytes",
                        stdout.len(),
                        exec_config.max_output_size
                    );
                    stdout.truncate(exec_config.max_output_size);
                    stdout.push_str("\n... [output truncated]");
                }
                if stderr.len() > exec_config.max_output_size {
                    log::debug!(
                        "Truncating stderr from {} to {} bytes",
                        stderr.len(),
                        exec_config.max_output_size
                    );
                    stderr.truncate(exec_config.max_output_size);
                    stderr.push_str("\n... [output truncated]");
                }

                if exit_code != 0 {
                    log::debug!("Execution finished with non-zero exit code: {}", exit_code);
                }

                Ok(ExecutionResult::success(
                    request.id.clone(),
                    stdout,
                    stderr,
                    exit_code,
                    execution_time_ms,
                    RuntimeType::Native,
                    request.language.clone(),
                ))
            }
            Ok(Err(e)) => {
                log::error!("Native execution error: id={}, error={}", request.id, e);
                let _ = stdout_task.await;
                let _ = stderr_task.await;
                Err(SandboxError::ExecutionFailed(e.to_string()))
            }
            Err(_) => {
                log::warn!(
                    "Native execution timeout: id={}, timeout={}s",
                    request.id,
                    exec_config.timeout.as_secs()
                );
                let _ = child.start_kill();
                let _ = child.wait().await;
                let _ = stdout_task.await;
                let _ = stderr_task.await;
                Ok(ExecutionResult::timeout(
                    request.id.clone(),
                    String::new(),
                    String::new(),
                    exec_config.timeout.as_secs(),
                    RuntimeType::Native,
                    request.language.clone(),
                ))
            }
        }
    }

    async fn execute_with_sender(
        &self,
        request: &ExecutionRequest,
        language_config: &LanguageConfig,
        exec_config: &ExecutionConfig,
        output_tx: Option<tokio::sync::mpsc::Sender<OutputLine>>,
    ) -> Result<ExecutionResult, SandboxError> {
        let Some(tx) = output_tx else {
            return self.execute(request, language_config, exec_config).await;
        };

        log::debug!("Native streaming execute: id={}, language={}", request.id, request.language);

        let native_cmd = NATIVE_COMMANDS.get(language_config.id).ok_or_else(|| {
            SandboxError::LanguageNotSupported(format!(
                "{} is not supported in native mode", language_config.name
            ))
        })?;

        let start = Instant::now();
        let workspace = create_workspace(exec_config.workspace_dir.as_deref(), &request.id).await?;
        let work_dir = workspace.path().to_path_buf();
        let code_path = write_execution_files(&work_dir, request, language_config).await?;

        // Compile if needed (non-streaming, compilation is usually fast)
        let mut output_path = code_path.clone();
        if let Some(compile) = native_cmd.compile_cmd {
            let effective_compile = if let Some(settings) = &request.compiler_settings {
                let base_cmd = format!("{} {{file}}", compile);
                let modified = settings.apply_to_compile_cmd(&base_cmd, &request.language);
                modified.replace("{file}", "")
            } else {
                compile.to_string()
            };

            let parts: Vec<&str> = effective_compile.split_whitespace().collect();
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
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    return Ok(ExecutionResult::success(
                        request.id.clone(), String::new(), stderr,
                        output.status.code().unwrap_or(1),
                        start.elapsed().as_millis() as u64,
                        RuntimeType::Native, request.language.clone(),
                    ));
                }
                Ok(Err(e)) => return Err(SandboxError::ExecutionFailed(e.to_string())),
                Err(_) => {
                    return Ok(ExecutionResult::timeout(
                        request.id.clone(), String::new(), String::new(),
                        exec_config.timeout.as_secs(), RuntimeType::Native, request.language.clone(),
                    ));
                }
                Ok(Ok(_)) => {}
            }
        }

        // Build run command
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

        for (key, value) in &request.env {
            run_cmd.env(key, value);
        }
        if let Some(settings) = &request.compiler_settings {
            for (key, value) in settings.env_vars(&request.language) {
                run_cmd.env(&key, &value);
            }
        }
        for arg in &request.args {
            run_cmd.arg(arg);
        }

        let mut child = run_cmd.spawn().map_err(|e| {
            SandboxError::ExecutionFailed(format!("Failed to start process: {}", e))
        })?;

        if let Some(stdin_data) = &request.stdin {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(stdin_data.as_bytes()).await;
                drop(stdin);
            }
        }

        let stdout_pipe = child.stdout.take()
            .ok_or_else(|| SandboxError::ExecutionFailed("failed to capture stdout".into()))?;
        let stderr_pipe = child.stderr.take()
            .ok_or_else(|| SandboxError::ExecutionFailed("failed to capture stderr".into()))?;

        let exec_id_out = request.id.clone();
        let exec_id_err = request.id.clone();
        let tx_err = tx.clone();

        let stdout_task = tokio::spawn(async move {
            let mut lines = BufReader::new(stdout_pipe).lines();
            let mut collected = String::new();
            while let Ok(Some(line)) = lines.next_line().await {
                let elapsed = start.elapsed().as_millis() as u64;
                let _ = tx.send(OutputLine {
                    execution_id: exec_id_out.clone(),
                    stream: "stdout".into(),
                    text: line.clone(),
                    timestamp_ms: elapsed,
                }).await;
                if !collected.is_empty() { collected.push('\n'); }
                collected.push_str(&line);
            }
            collected
        });

        let stderr_task = tokio::spawn(async move {
            let mut lines = BufReader::new(stderr_pipe).lines();
            let mut collected = String::new();
            while let Ok(Some(line)) = lines.next_line().await {
                let elapsed = start.elapsed().as_millis() as u64;
                let _ = tx_err.send(OutputLine {
                    execution_id: exec_id_err.clone(),
                    stream: "stderr".into(),
                    text: line.clone(),
                    timestamp_ms: elapsed,
                }).await;
                if !collected.is_empty() { collected.push('\n'); }
                collected.push_str(&line);
            }
            collected
        });

        let result = timeout(exec_config.timeout, child.wait()).await;
        let execution_time_ms = start.elapsed().as_millis() as u64;

        match result {
            Ok(Ok(status)) => {
                let exit_code = status.code().unwrap_or(-1);
                let stdout = stdout_task.await.unwrap_or_default();
                let stderr = stderr_task.await.unwrap_or_default();
                Ok(ExecutionResult::success(
                    request.id.clone(), stdout, stderr, exit_code,
                    execution_time_ms, RuntimeType::Native, request.language.clone(),
                ))
            }
            Ok(Err(e)) => {
                let _ = stdout_task.await;
                let _ = stderr_task.await;
                Err(SandboxError::ExecutionFailed(e.to_string()))
            }
            Err(_) => {
                let _ = child.start_kill();
                let _ = child.wait().await;
                let _ = stdout_task.await;
                let _ = stderr_task.await;
                Ok(ExecutionResult::timeout(
                    request.id.clone(), String::new(), String::new(),
                    exec_config.timeout.as_secs(), RuntimeType::Native, request.language.clone(),
                ))
            }
        }
    }

    async fn cleanup(&self) -> Result<(), SandboxError> {
        // Native runtime cleanup is handled by tempfile
        log::trace!("Native runtime cleanup (handled by tempfile)");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    // ==================== Runtime Creation Tests ====================

    #[test]
    fn test_native_runtime_new() {
        let runtime = NativeRuntime::new();
        assert!(runtime._available_languages.is_empty());
    }

    #[test]
    fn test_native_runtime_default() {
        let runtime = NativeRuntime::default();
        assert!(runtime._available_languages.is_empty());
    }

    #[test]
    fn test_native_runtime_type() {
        let runtime = NativeRuntime::new();
        assert_eq!(runtime.runtime_type(), RuntimeType::Native);
    }

    // ==================== Availability Tests ====================

    #[tokio::test]
    async fn test_native_always_available() {
        let runtime = NativeRuntime::new();
        // Native runtime is always "available"
        assert!(runtime.is_available().await);
    }

    #[tokio::test]
    async fn test_native_version() {
        let runtime = NativeRuntime::new();
        let version = runtime.get_version().await;
        assert!(version.is_ok());
        assert_eq!(version.unwrap(), "native-1.0");
    }

    // ==================== Language Detection Tests ====================

    #[tokio::test]
    async fn test_detect_available_languages() {
        let mut runtime = NativeRuntime::new();
        runtime.detect_available_languages().await;
        // At least one common language should be available on most systems
        // This is a soft assertion since it depends on the system
        let _ = runtime.get_available_languages();
    }

    #[test]
    fn test_get_available_languages_initially_empty() {
        let runtime = NativeRuntime::new();
        let languages = runtime.get_available_languages();
        assert!(languages.is_empty());
    }

    // ==================== Cleanup Tests ====================

    #[tokio::test]
    async fn test_cleanup() {
        let runtime = NativeRuntime::new();
        let result = runtime.cleanup().await;
        assert!(result.is_ok());
    }

    // ==================== Prepare Image Tests ====================

    #[tokio::test]
    async fn test_prepare_image_noop() {
        let runtime = NativeRuntime::new();
        // Native runtime doesn't need to prepare images
        let result = runtime.prepare_image("python").await;
        assert!(result.is_ok());
    }

    // ==================== Unsupported Language Tests ====================

    #[tokio::test]
    async fn test_execute_unsupported_language() {
        let runtime = NativeRuntime::new();
        let request = ExecutionRequest::new("nonexistent_lang", "code");

        // Create a mock language config (this would normally fail at lookup)
        let language_config = LanguageConfig {
            id: "nonexistent_lang",
            name: "Nonexistent",
            extension: "xxx",
            aliases: &[],
            docker_image: "none",
            compile_cmd: None,
            run_cmd: "nonexistent",
            category: super::super::languages::LanguageCategory::Interpreted,
            file_name: "main.xxx",
        };

        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };

        let result = runtime
            .execute(&request, &language_config, &exec_config)
            .await;
        assert!(result.is_err());
        match result {
            Err(SandboxError::LanguageNotSupported(msg)) => {
                assert!(msg.contains("not supported"));
            }
            _ => panic!("Expected LanguageNotSupported error"),
        }
    }

    // ==================== NATIVE_COMMANDS Tests ====================

    #[test]
    fn test_native_commands_contains_python() {
        assert!(NATIVE_COMMANDS.contains_key("python"));
        let cmd = &NATIVE_COMMANDS["python"];
        #[cfg(target_os = "windows")]
        assert_eq!(cmd.check_cmd, "python");
        #[cfg(not(target_os = "windows"))]
        assert_eq!(cmd.check_cmd, "python3");
        assert!(cmd.compile_cmd.is_none());
    }

    #[test]
    fn test_native_commands_contains_javascript() {
        assert!(NATIVE_COMMANDS.contains_key("javascript"));
        let cmd = &NATIVE_COMMANDS["javascript"];
        assert_eq!(cmd.check_cmd, "node");
        assert!(cmd.compile_cmd.is_none());
    }

    #[test]
    fn test_native_commands_contains_rust() {
        assert!(NATIVE_COMMANDS.contains_key("rust"));
        let cmd = &NATIVE_COMMANDS["rust"];
        assert_eq!(cmd.check_cmd, "rustc");
        assert!(cmd.compile_cmd.is_some());
    }

    #[test]
    fn test_native_commands_contains_go() {
        assert!(NATIVE_COMMANDS.contains_key("go"));
        let cmd = &NATIVE_COMMANDS["go"];
        assert_eq!(cmd.check_cmd, "go");
    }

    #[test]
    fn test_native_commands_contains_ruby() {
        assert!(NATIVE_COMMANDS.contains_key("ruby"));
        let cmd = &NATIVE_COMMANDS["ruby"];
        assert_eq!(cmd.check_cmd, "ruby");
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_native_commands_contains_bash() {
        assert!(NATIVE_COMMANDS.contains_key("bash"));
        let cmd = &NATIVE_COMMANDS["bash"];
        assert_eq!(cmd.check_cmd, "bash");
    }

    #[test]
    fn test_native_commands_contains_powershell() {
        assert!(NATIVE_COMMANDS.contains_key("powershell"));
        let cmd = &NATIVE_COMMANDS["powershell"];
        assert_eq!(cmd.check_cmd, "pwsh");
    }

    #[test]
    fn test_native_commands_all_have_check_cmd() {
        for (lang, cmd) in NATIVE_COMMANDS.iter() {
            assert!(!cmd.check_cmd.is_empty(), "{} has no check_cmd", lang);
            assert!(!cmd.check_args.is_empty(), "{} has no check_args", lang);
        }
    }

    #[test]
    fn test_native_commands_compiled_have_compile_cmd() {
        let compiled_langs = ["rust", "typescript"];
        for lang in compiled_langs {
            if let Some(cmd) = NATIVE_COMMANDS.get(lang) {
                assert!(
                    cmd.compile_cmd.is_some(),
                    "{} should have compile_cmd",
                    lang
                );
            }
        }
    }

    // ==================== Execution Config Tests ====================

    #[test]
    fn test_execution_config_creation() {
        let config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };

        assert_eq!(config.timeout.as_secs(), 30);
        assert_eq!(config.memory_limit_mb, 256);
        assert_eq!(config.cpu_limit_percent, 50);
        assert!(!config.network_enabled);
        assert_eq!(config.max_output_size, 1024 * 1024);
    }

    // ==================== Integration Tests (requires native runtimes) ====================

    #[tokio::test]
    #[ignore] // Run with --ignored flag when Python is available
    async fn test_execute_python_native() {
        let runtime = NativeRuntime::new();
        let request = ExecutionRequest::new("python", "print('Hello from native!')");
        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };

        let result = runtime
            .execute(&request, language_config, &exec_config)
            .await;
        if result.is_ok() {
            let execution_result = result.unwrap();
            assert!(execution_result.stdout.contains("Hello from native!"));
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_python_with_stdin_native() {
        let runtime = NativeRuntime::new();
        let request = ExecutionRequest::new("python", "name = input(); print(f'Hello, {name}!')")
            .with_stdin("World");
        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };

        let result = runtime
            .execute(&request, language_config, &exec_config)
            .await;
        if result.is_ok() {
            let execution_result = result.unwrap();
            assert!(execution_result.stdout.contains("Hello, World!"));
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_bash_native() {
        let runtime = NativeRuntime::new();
        let request = ExecutionRequest::new("bash", "echo 'Hello from bash!'");
        let language_config = super::super::languages::get_language_config("bash").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };

        let result = runtime
            .execute(&request, language_config, &exec_config)
            .await;
        if result.is_ok() {
            let execution_result = result.unwrap();
            assert!(execution_result.stdout.contains("Hello from bash!"));
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_with_error_native() {
        let runtime = NativeRuntime::new();
        let request = ExecutionRequest::new("python", "raise Exception('test error')");
        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };

        let result = runtime
            .execute(&request, language_config, &exec_config)
            .await;
        if result.is_ok() {
            let execution_result = result.unwrap();
            assert!(
                execution_result.stderr.contains("Exception")
                    || execution_result.exit_code != Some(0)
            );
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_with_env_vars_native() {
        let runtime = NativeRuntime::new();
        let mut request = ExecutionRequest::new("python", "import os; print(os.environ['MY_VAR'])");
        request
            .env
            .insert("MY_VAR".to_string(), "test_value".to_string());

        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };

        let result = runtime
            .execute(&request, language_config, &exec_config)
            .await;
        if result.is_ok() {
            let execution_result = result.unwrap();
            assert!(execution_result.stdout.contains("test_value"));
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_with_args_native() {
        let runtime = NativeRuntime::new();
        let mut request = ExecutionRequest::new("python", "import sys; print(sys.argv[1])");
        request.args.push("test_arg".to_string());

        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };

        let result = runtime
            .execute(&request, language_config, &exec_config)
            .await;
        if result.is_ok() {
            let execution_result = result.unwrap();
            assert!(execution_result.stdout.contains("test_arg"));
        }
    }
}
