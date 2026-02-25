//! Podman runtime implementation
//!
//! Provides secure code execution using Podman containers (rootless).

use async_trait::async_trait;
use std::path::PathBuf;
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

/// Podman runtime for sandboxed execution (rootless alternative to Docker)
pub struct PodmanRuntime {
    podman_path: PathBuf,
}

impl PodmanRuntime {
    pub fn new() -> Self {
        log::trace!("Creating new PodmanRuntime instance");
        Self {
            podman_path: PathBuf::from("podman"),
        }
    }

    fn container_name(request: &ExecutionRequest) -> String {
        let suffix = request
            .id
            .chars()
            .filter(|c| c.is_ascii_alphanumeric())
            .take(16)
            .collect::<String>()
            .to_lowercase();
        let suffix = if suffix.is_empty() {
            "run".to_string()
        } else {
            suffix
        };
        format!("cognia-sandbox-{}", suffix)
    }

    fn build_command(
        &self,
        request: &ExecutionRequest,
        language_config: &LanguageConfig,
        exec_config: &ExecutionConfig,
        work_dir: &std::path::Path,
    ) -> Command {
        let mut cmd = Command::new(&self.podman_path);
        let container_name = Self::container_name(request);

        cmd.arg("run").arg("--rm").arg("--interactive");
        cmd.arg("--name").arg(&container_name);
        cmd.arg("--label").arg("cognia-sandbox=true");
        cmd.arg("--label")
            .arg(format!("cognia-sandbox.execution-id={}", request.id));

        // Security: drop all capabilities
        cmd.arg("--cap-drop=ALL");

        // Security: read-only root filesystem
        cmd.arg("--read-only");

        // Security: no new privileges
        cmd.arg("--security-opt").arg("no-new-privileges:true");

        // Memory limit
        cmd.arg("--memory")
            .arg(format!("{}m", exec_config.memory_limit_mb));

        // CPU limit
        cmd.arg("--cpus").arg(format!(
            "{:.2}",
            exec_config.cpu_limit_percent as f64 / 100.0
        ));

        // PIDs limit
        cmd.arg("--pids-limit").arg("64");

        // Network
        if !exec_config.network_enabled {
            cmd.arg("--network").arg("none");
        }

        // Tmpfs for writable areas
        cmd.arg("--tmpfs").arg("/tmp:rw,noexec,nosuid,size=64m");
        cmd.arg("--tmpfs").arg("/var/tmp:rw,noexec,nosuid,size=32m");

        // Mount work directory
        cmd.arg("-v")
            .arg(format!("{}:/code:ro,Z", work_dir.display()));

        // Working directory
        cmd.arg("-w").arg("/code");

        // Environment variables (from request)
        for (key, value) in &request.env {
            cmd.arg("-e").arg(format!("{}={}", key, value));
        }

        // Environment variables from compiler settings (e.g., Python flags)
        if let Some(settings) = &request.compiler_settings {
            for (key, value) in settings.env_vars(&request.language) {
                cmd.arg("-e").arg(format!("{}={}", key, value));
            }
        }

        // Image
        cmd.arg(language_config.docker_image);

        // Build execution command
        let file_path = format!("/code/{}", language_config.file_name);
        let basename = language_config
            .file_name
            .rsplit('.')
            .next_back()
            .unwrap_or("main");

        if let Some(compile_cmd) = language_config.compile_cmd {
            let mut compile = compile_cmd
                .replace("{file}", &file_path)
                .replace("{basename}", basename);

            // Apply compiler settings to the compile command
            if let Some(settings) = &request.compiler_settings {
                compile = settings.apply_to_compile_cmd(&compile, &request.language);
            }

            let run = language_config
                .run_cmd
                .replace("{file}", &file_path)
                .replace("{basename}", basename);
            cmd.arg("sh")
                .arg("-c")
                .arg(format!("{} && {}", compile, run));
        } else {
            let run = language_config
                .run_cmd
                .replace("{file}", &file_path)
                .replace("{basename}", basename);
            cmd.arg("sh").arg("-c").arg(run);
        }

        cmd.stdin(Stdio::piped());
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        cmd
    }
}

impl Default for PodmanRuntime {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl SandboxRuntime for PodmanRuntime {
    fn runtime_type(&self) -> RuntimeType {
        RuntimeType::Podman
    }

    async fn is_available(&self) -> bool {
        log::trace!("Checking Podman availability...");
        let result = Command::new(&self.podman_path)
            .arg("version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false);
        log::trace!("Podman availability check result: {}", result);
        result
    }

    async fn get_version(&self) -> Result<String, SandboxError> {
        log::trace!("Getting Podman version...");
        let output = Command::new(&self.podman_path)
            .arg("version")
            .arg("--format")
            .arg("{{.Version}}")
            .output()
            .await?;

        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            log::debug!("Podman version: {}", version);
            Ok(version)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            log::warn!("Failed to get Podman version: {}", stderr);
            Err(SandboxError::RuntimeNotAvailable(stderr))
        }
    }

    async fn execute(
        &self,
        request: &ExecutionRequest,
        language_config: &LanguageConfig,
        exec_config: &ExecutionConfig,
    ) -> Result<ExecutionResult, SandboxError> {
        log::debug!(
            "Podman execute: id={}, language={}, image={}",
            request.id,
            request.language,
            language_config.docker_image
        );

        let start = Instant::now();

        let workspace = create_workspace(exec_config.workspace_dir.as_deref(), &request.id).await?;
        let work_dir = workspace.path().to_path_buf();
        log::trace!("Created execution workspace: {:?}", work_dir);
        let _ = write_execution_files(&work_dir, request, language_config).await?;

        log::debug!(
            "Building Podman command with memory={}MB, cpu={}%, timeout={}s, network={}",
            exec_config.memory_limit_mb,
            exec_config.cpu_limit_percent,
            exec_config.timeout.as_secs(),
            exec_config.network_enabled
        );

        let mut cmd = self.build_command(request, language_config, exec_config, &work_dir);

        log::info!("Starting Podman container for execution: id={}", request.id);
        let mut child = cmd.spawn().map_err(|e| {
            log::error!("Failed to spawn Podman process: {}", e);
            SandboxError::ContainerError(format!("Failed to start Podman container: {}", e))
        })?;

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
        log::debug!("Podman execution completed in {}ms", execution_time_ms);

        match result {
            Ok(Ok(status)) => {
                let exit_code = status.code().unwrap_or(-1);
                let stdout_bytes = stdout_task.await.unwrap_or_default();
                let stderr_bytes = stderr_task.await.unwrap_or_default();
                let mut stdout = String::from_utf8_lossy(&stdout_bytes).to_string();
                let mut stderr = String::from_utf8_lossy(&stderr_bytes).to_string();

                log::debug!(
                    "Podman execution result: id={}, exit_code={}, stdout_len={}, stderr_len={}",
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
                    RuntimeType::Podman,
                    request.language.clone(),
                ))
            }
            Ok(Err(e)) => {
                log::error!("Podman execution error: id={}, error={}", request.id, e);
                let _ = stdout_task.await;
                let _ = stderr_task.await;
                Err(SandboxError::ExecutionFailed(e.to_string()))
            }
            Err(_) => {
                let container_name = Self::container_name(request);
                log::warn!(
                    "Podman execution timeout: id={}, timeout={}s",
                    request.id,
                    exec_config.timeout.as_secs()
                );
                let _ = Command::new(&self.podman_path)
                    .arg("kill")
                    .arg(&container_name)
                    .output()
                    .await;
                let _ = Command::new(&self.podman_path)
                    .args(["rm", "-f"])
                    .arg(&container_name)
                    .output()
                    .await;
                let _ = child.start_kill();
                let _ = child.wait().await;
                let _ = stdout_task.await;
                let _ = stderr_task.await;
                Ok(ExecutionResult::timeout(
                    request.id.clone(),
                    String::new(),
                    String::new(),
                    exec_config.timeout.as_secs(),
                    RuntimeType::Podman,
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

        log::debug!("Podman streaming execute: id={}, language={}", request.id, request.language);
        let start = Instant::now();

        let workspace = create_workspace(exec_config.workspace_dir.as_deref(), &request.id).await?;
        let work_dir = workspace.path().to_path_buf();
        let _ = write_execution_files(&work_dir, request, language_config).await?;

        let mut cmd = self.build_command(request, language_config, exec_config, &work_dir);
        let mut child = cmd.spawn().map_err(|e| {
            SandboxError::ContainerError(format!("Failed to start Podman container: {}", e))
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
                    execution_time_ms, RuntimeType::Podman, request.language.clone(),
                ))
            }
            Ok(Err(e)) => {
                let _ = stdout_task.await;
                let _ = stderr_task.await;
                Err(SandboxError::ExecutionFailed(e.to_string()))
            }
            Err(_) => {
                let container_name = Self::container_name(request);
                let _ = Command::new(&self.podman_path).arg("kill").arg(&container_name).output().await;
                let _ = Command::new(&self.podman_path).args(["rm", "-f"]).arg(&container_name).output().await;
                let _ = child.start_kill();
                let _ = child.wait().await;
                let _ = stdout_task.await;
                let _ = stderr_task.await;
                Ok(ExecutionResult::timeout(
                    request.id.clone(), String::new(), String::new(),
                    exec_config.timeout.as_secs(), RuntimeType::Podman, request.language.clone(),
                ))
            }
        }
    }

    async fn cleanup(&self) -> Result<(), SandboxError> {
        log::debug!("Podman cleanup: pruning stopped containers with cognia-sandbox=true label");
        let result = Command::new(&self.podman_path)
            .args([
                "container",
                "prune",
                "-f",
                "--filter",
                "label=cognia-sandbox=true",
            ])
            .output()
            .await;

        match result {
            Ok(output) if output.status.success() => {
                log::trace!("Podman container prune successful");
            }
            Ok(output) => {
                log::debug!(
                    "Podman container prune returned non-zero: {}",
                    String::from_utf8_lossy(&output.stderr)
                );
            }
            Err(e) => {
                log::debug!("Podman container prune command failed: {}", e);
            }
        }
        Ok(())
    }

    async fn prepare_image(&self, language: &str) -> Result<(), SandboxError> {
        log::info!("Podman: preparing image for language '{}'", language);

        let config = super::languages::get_language_config(language).ok_or_else(|| {
            log::warn!(
                "Cannot prepare image - language not supported: {}",
                language
            );
            SandboxError::LanguageNotSupported(language.to_string())
        })?;

        log::info!(
            "Podman: pulling image '{}' for language '{}'",
            config.docker_image,
            language
        );
        let output = Command::new(&self.podman_path)
            .args(["pull", config.docker_image])
            .output()
            .await?;

        if output.status.success() {
            log::info!(
                "Podman: image '{}' pulled successfully",
                config.docker_image
            );
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            log::error!(
                "Podman: failed to pull image '{}': {}",
                config.docker_image,
                stderr
            );
            Err(SandboxError::ContainerError(format!(
                "Failed to pull image {}: {}",
                config.docker_image, stderr
            )))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::runtime::ExecutionStatus;
    use super::*;
    use std::time::Duration;

    // ==================== Runtime Creation Tests ====================

    #[test]
    fn test_podman_runtime_new() {
        let runtime = PodmanRuntime::new();
        assert_eq!(runtime.podman_path, PathBuf::from("podman"));
    }

    #[test]
    fn test_podman_runtime_default() {
        let runtime = PodmanRuntime::default();
        assert_eq!(runtime.podman_path, PathBuf::from("podman"));
    }

    #[test]
    fn test_podman_runtime_type() {
        let runtime = PodmanRuntime::new();
        assert_eq!(runtime.runtime_type(), RuntimeType::Podman);
    }

    // ==================== Availability Tests ====================

    #[tokio::test]
    async fn test_podman_available() {
        let runtime = PodmanRuntime::new();
        // This test will pass if Podman is installed, fail gracefully otherwise
        let _ = runtime.is_available().await;
    }

    #[tokio::test]
    async fn test_podman_version() {
        let runtime = PodmanRuntime::new();
        if runtime.is_available().await {
            let version = runtime.get_version().await;
            assert!(version.is_ok());
            let version_str = version.unwrap();
            assert!(!version_str.is_empty());
        }
    }

    // ==================== Command Building Tests ====================

    #[test]
    fn test_build_command_basic() {
        let runtime = PodmanRuntime::new();
        let request = ExecutionRequest::new("python", "print('hello')");
        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);

        // Verify command was created
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("podman"));
    }

    #[test]
    fn test_build_command_with_network() {
        let runtime = PodmanRuntime::new();
        let request = ExecutionRequest::new("python", "import requests");
        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: true,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("podman"));
    }

    #[test]
    fn test_build_command_with_env_vars() {
        let runtime = PodmanRuntime::new();
        let mut request = ExecutionRequest::new("python", "import os; print(os.environ['TEST'])");
        request.env.insert("TEST".to_string(), "value".to_string());

        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("podman"));
    }

    #[test]
    fn test_build_command_compiled_language() {
        let runtime = PodmanRuntime::new();
        let request = ExecutionRequest::new("rust", "fn main() { println!(\"hello\"); }");
        let language_config = super::super::languages::get_language_config("rust").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(60),
            memory_limit_mb: 512,
            cpu_limit_percent: 75,
            network_enabled: false,
            max_output_size: 1024 * 1024,
            workspace_dir: None,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("podman"));
    }

    #[test]
    fn test_build_command_memory_limits() {
        let runtime = PodmanRuntime::new();
        let request = ExecutionRequest::new("python", "x = [0] * 1000000");
        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 128,
            cpu_limit_percent: 25,
            network_enabled: false,
            max_output_size: 1024,
            workspace_dir: None,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("podman"));
    }

    // ==================== Cleanup Tests ====================

    #[tokio::test]
    async fn test_cleanup() {
        let runtime = PodmanRuntime::new();
        // Cleanup should not error even if nothing to clean
        let result = runtime.cleanup().await;
        assert!(result.is_ok());
    }

    // ==================== Prepare Image Tests ====================

    #[tokio::test]
    async fn test_prepare_image_unsupported_language() {
        let runtime = PodmanRuntime::new();
        let result = runtime.prepare_image("nonexistent_language").await;
        assert!(result.is_err());
        match result {
            Err(SandboxError::LanguageNotSupported(lang)) => {
                assert_eq!(lang, "nonexistent_language");
            }
            _ => panic!("Expected LanguageNotSupported error"),
        }
    }

    // ==================== Execution Result Tests ====================

    #[test]
    fn test_execution_result_success_podman() {
        let result = ExecutionResult::success(
            "test-id".to_string(),
            "output".to_string(),
            String::new(),
            0,
            100,
            RuntimeType::Podman,
            "python".to_string(),
        );

        assert_eq!(result.id, "test-id");
        assert_eq!(result.runtime, RuntimeType::Podman);
        assert_eq!(result.exit_code, Some(0));
    }

    #[test]
    fn test_execution_result_timeout_podman() {
        let result = ExecutionResult::timeout(
            "test-id".to_string(),
            "partial".to_string(),
            String::new(),
            30,
            RuntimeType::Podman,
            "python".to_string(),
        );

        assert!(matches!(result.status, ExecutionStatus::Timeout));
        assert_eq!(result.runtime, RuntimeType::Podman);
        assert!(result.error.is_some());
    }

    // ==================== Integration Tests (requires Podman) ====================

    #[tokio::test]
    #[ignore] // Run with --ignored flag when Podman is available
    async fn test_execute_simple_python_podman() {
        let runtime = PodmanRuntime::new();

        if !runtime.is_available().await {
            return;
        }

        let request = ExecutionRequest::new("python", "print('Hello, World!')");
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
        assert!(result.is_ok());

        let execution_result = result.unwrap();
        assert!(execution_result.stdout.contains("Hello, World!"));
        assert_eq!(execution_result.exit_code, Some(0));
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_with_stdin_podman() {
        let runtime = PodmanRuntime::new();

        if !runtime.is_available().await {
            return;
        }

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
        assert!(result.is_ok());

        let execution_result = result.unwrap();
        assert!(execution_result.stdout.contains("Hello, World!"));
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_with_error_podman() {
        let runtime = PodmanRuntime::new();

        if !runtime.is_available().await {
            return;
        }

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
        assert!(result.is_ok());

        let execution_result = result.unwrap();
        assert!(
            execution_result.stderr.contains("Exception") || execution_result.exit_code != Some(0)
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_execute_with_additional_files_podman() {
        let runtime = PodmanRuntime::new();

        if !runtime.is_available().await {
            return;
        }

        let mut request =
            ExecutionRequest::new("python", "with open('data.txt') as f: print(f.read())");
        request
            .files
            .insert("data.txt".to_string(), "Hello from file!".to_string());

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
        assert!(result.is_ok());

        let execution_result = result.unwrap();
        assert!(execution_result.stdout.contains("Hello from file!"));
    }
}
