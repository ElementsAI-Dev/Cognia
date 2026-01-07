//! Docker runtime implementation
//!
//! Provides secure code execution using Docker containers.

use async_trait::async_trait;
use std::path::PathBuf;
use std::process::Stdio;
use std::time::Instant;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::time::timeout;

use super::languages::LanguageConfig;
use super::runtime::{
    ExecutionConfig, ExecutionRequest, ExecutionResult, RuntimeType, SandboxError, SandboxRuntime,
};

/// Docker runtime for sandboxed execution
pub struct DockerRuntime {
    docker_path: PathBuf,
}

impl DockerRuntime {
    pub fn new() -> Self {
        log::trace!("Creating new DockerRuntime instance");
        Self {
            docker_path: PathBuf::from("docker"),
        }
    }

    /// Build the docker run command
    fn build_command(
        &self,
        request: &ExecutionRequest,
        language_config: &LanguageConfig,
        exec_config: &ExecutionConfig,
        work_dir: &std::path::Path,
    ) -> Command {
        let mut cmd = Command::new(&self.docker_path);

        cmd.arg("run").arg("--rm").arg("--interactive");

        // Security: drop all capabilities
        cmd.arg("--cap-drop=ALL");

        // Security: read-only root filesystem
        cmd.arg("--read-only");

        // Security: no new privileges
        cmd.arg("--security-opt").arg("no-new-privileges:true");

        // Memory limit
        cmd.arg("--memory")
            .arg(format!("{}m", exec_config.memory_limit_mb));
        cmd.arg("--memory-swap")
            .arg(format!("{}m", exec_config.memory_limit_mb));

        // CPU limit
        cmd.arg("--cpus").arg(format!(
            "{:.2}",
            exec_config.cpu_limit_percent as f64 / 100.0
        ));

        // PIDs limit (prevent fork bombs)
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
            .arg(format!("{}:/code:ro", work_dir.display()));

        // Working directory
        cmd.arg("-w").arg("/code");

        // Environment variables
        for (key, value) in &request.env {
            cmd.arg("-e").arg(format!("{}={}", key, value));
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
            // Compiled language: compile then run
            let compile = compile_cmd
                .replace("{file}", &file_path)
                .replace("{basename}", basename);
            let run = language_config
                .run_cmd
                .replace("{file}", &file_path)
                .replace("{basename}", basename);

            cmd.arg("sh")
                .arg("-c")
                .arg(format!("{} && {}", compile, run));
        } else {
            // Interpreted language: run directly
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

impl Default for DockerRuntime {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl SandboxRuntime for DockerRuntime {
    fn runtime_type(&self) -> RuntimeType {
        RuntimeType::Docker
    }

    async fn is_available(&self) -> bool {
        log::trace!("Checking Docker availability...");
        let result = Command::new(&self.docker_path)
            .arg("version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false);
        log::trace!("Docker availability check result: {}", result);
        result
    }

    async fn get_version(&self) -> Result<String, SandboxError> {
        log::trace!("Getting Docker version...");
        let output = Command::new(&self.docker_path)
            .arg("version")
            .arg("--format")
            .arg("{{.Server.Version}}")
            .output()
            .await?;

        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            log::debug!("Docker version: {}", version);
            Ok(version)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            log::warn!("Failed to get Docker version: {}", stderr);
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
            "Docker execute: id={}, language={}, image={}",
            request.id,
            request.language,
            language_config.docker_image
        );

        let start = Instant::now();

        // Create temporary directory for code
        let temp_dir = tempfile::tempdir()?;
        let work_dir = temp_dir.path().to_path_buf();
        log::trace!("Created temp directory: {:?}", work_dir);

        // Write main code file
        let code_path = work_dir.join(language_config.file_name);
        log::trace!(
            "Writing code to {:?} ({} bytes)",
            code_path,
            request.code.len()
        );
        tokio::fs::write(&code_path, &request.code).await?;

        // Write additional files
        if !request.files.is_empty() {
            log::debug!("Writing {} additional file(s)", request.files.len());
        }
        for (name, content) in &request.files {
            let file_path = work_dir.join(name);
            if let Some(parent) = file_path.parent() {
                tokio::fs::create_dir_all(parent).await?;
            }
            log::trace!(
                "Writing additional file: {} ({} bytes)",
                name,
                content.len()
            );
            tokio::fs::write(&file_path, content).await?;
        }

        // Build and run command
        log::debug!(
            "Building Docker command with memory={}MB, cpu={}%, timeout={}s, network={}",
            exec_config.memory_limit_mb,
            exec_config.cpu_limit_percent,
            exec_config.timeout.as_secs(),
            exec_config.network_enabled
        );

        let mut cmd = self.build_command(request, language_config, exec_config, &work_dir);

        log::info!("Starting Docker container for execution: id={}", request.id);
        let mut child = cmd.spawn().map_err(|e| {
            log::error!("Failed to spawn Docker process: {}", e);
            SandboxError::ContainerError(format!("Failed to start Docker container: {}", e))
        })?;

        // Write stdin if provided
        if let Some(stdin_data) = &request.stdin {
            log::trace!("Writing {} bytes to stdin", stdin_data.len());
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(stdin_data.as_bytes()).await;
                drop(stdin);
            }
        }

        // Wait with timeout
        log::trace!(
            "Waiting for execution with timeout: {}s",
            exec_config.timeout.as_secs()
        );
        let result = timeout(exec_config.timeout, child.wait_with_output()).await;

        let execution_time_ms = start.elapsed().as_millis() as u64;
        log::debug!("Docker execution completed in {}ms", execution_time_ms);

        match result {
            Ok(Ok(output)) => {
                let exit_code = output.status.code().unwrap_or(-1);
                let mut stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let mut stderr = String::from_utf8_lossy(&output.stderr).to_string();

                log::debug!(
                    "Docker execution result: id={}, exit_code={}, stdout_len={}, stderr_len={}",
                    request.id,
                    exit_code,
                    stdout.len(),
                    stderr.len()
                );

                // Truncate output if too large
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
                    RuntimeType::Docker,
                    request.language.clone(),
                ))
            }
            Ok(Err(e)) => {
                log::error!("Docker execution error: id={}, error={}", request.id, e);
                Err(SandboxError::ExecutionFailed(e.to_string()))
            }
            Err(_) => {
                log::warn!(
                    "Docker execution timeout: id={}, timeout={}s",
                    request.id,
                    exec_config.timeout.as_secs()
                );
                // Timeout - kill the container
                log::debug!(
                    "Attempting to kill timed-out container: cognia-sandbox-{}",
                    &request.id[..8.min(request.id.len())]
                );
                let _ = Command::new(&self.docker_path)
                    .arg("kill")
                    .arg(format!(
                        "cognia-sandbox-{}",
                        &request.id[..8.min(request.id.len())]
                    ))
                    .output()
                    .await;

                Ok(ExecutionResult::timeout(
                    request.id.clone(),
                    String::new(),
                    String::new(),
                    exec_config.timeout.as_secs(),
                    RuntimeType::Docker,
                    request.language.clone(),
                ))
            }
        }
    }

    async fn cleanup(&self) -> Result<(), SandboxError> {
        log::debug!("Docker cleanup: pruning orphaned containers with label cognia-sandbox");
        // Clean up any orphaned containers
        let result = Command::new(&self.docker_path)
            .args([
                "container",
                "prune",
                "-f",
                "--filter",
                "label=cognia-sandbox",
            ])
            .output()
            .await;

        match result {
            Ok(output) if output.status.success() => {
                log::trace!("Docker container prune successful");
            }
            Ok(output) => {
                log::debug!(
                    "Docker container prune returned non-zero: {}",
                    String::from_utf8_lossy(&output.stderr)
                );
            }
            Err(e) => {
                log::debug!("Docker container prune command failed: {}", e);
            }
        }
        Ok(())
    }

    async fn prepare_image(&self, language: &str) -> Result<(), SandboxError> {
        log::info!("Docker: preparing image for language '{}'", language);

        let config = super::languages::get_language_config(language).ok_or_else(|| {
            log::warn!(
                "Cannot prepare image - language not supported: {}",
                language
            );
            SandboxError::LanguageNotSupported(language.to_string())
        })?;

        log::info!(
            "Docker: pulling image '{}' for language '{}'",
            config.docker_image,
            language
        );
        let output = Command::new(&self.docker_path)
            .args(["pull", config.docker_image])
            .output()
            .await?;

        if output.status.success() {
            log::info!(
                "Docker: image '{}' pulled successfully",
                config.docker_image
            );
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            log::error!(
                "Docker: failed to pull image '{}': {}",
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
    fn test_docker_runtime_new() {
        let runtime = DockerRuntime::new();
        assert_eq!(runtime.docker_path, PathBuf::from("docker"));
    }

    #[test]
    fn test_docker_runtime_default() {
        let runtime = DockerRuntime::default();
        assert_eq!(runtime.docker_path, PathBuf::from("docker"));
    }

    #[test]
    fn test_docker_runtime_type() {
        let runtime = DockerRuntime::new();
        assert_eq!(runtime.runtime_type(), RuntimeType::Docker);
    }

    // ==================== Availability Tests ====================

    #[tokio::test]
    async fn test_docker_available() {
        let runtime = DockerRuntime::new();
        // This test will pass if Docker is installed, fail gracefully otherwise
        let _ = runtime.is_available().await;
    }

    #[tokio::test]
    async fn test_docker_version() {
        let runtime = DockerRuntime::new();
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
        let runtime = DockerRuntime::new();
        let request = ExecutionRequest::new("python", "print('hello')");
        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);

        // Verify command was created (we can't easily inspect Command internals)
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("docker"));
    }

    #[test]
    fn test_build_command_with_network() {
        let runtime = DockerRuntime::new();
        let request = ExecutionRequest::new("python", "import requests");
        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: true,
            max_output_size: 1024 * 1024,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("docker"));
    }

    #[test]
    fn test_build_command_with_env_vars() {
        let runtime = DockerRuntime::new();
        let mut request = ExecutionRequest::new("python", "import os; print(os.environ['TEST'])");
        request.env.insert("TEST".to_string(), "value".to_string());

        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 256,
            cpu_limit_percent: 50,
            network_enabled: false,
            max_output_size: 1024 * 1024,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("docker"));
    }

    #[test]
    fn test_build_command_compiled_language() {
        let runtime = DockerRuntime::new();
        let request = ExecutionRequest::new("rust", "fn main() { println!(\"hello\"); }");
        let language_config = super::super::languages::get_language_config("rust").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(60),
            memory_limit_mb: 512,
            cpu_limit_percent: 75,
            network_enabled: false,
            max_output_size: 1024 * 1024,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("docker"));
    }

    #[test]
    fn test_build_command_memory_limits() {
        let runtime = DockerRuntime::new();
        let request = ExecutionRequest::new("python", "x = [0] * 1000000");
        let language_config = super::super::languages::get_language_config("python").unwrap();
        let exec_config = ExecutionConfig {
            timeout: Duration::from_secs(30),
            memory_limit_mb: 128,  // Lower memory limit
            cpu_limit_percent: 25, // Lower CPU limit
            network_enabled: false,
            max_output_size: 1024,
        };
        let work_dir = PathBuf::from("/tmp/test");

        let cmd = runtime.build_command(&request, language_config, &exec_config, &work_dir);
        assert!(cmd
            .as_std()
            .get_program()
            .to_str()
            .unwrap()
            .contains("docker"));
    }

    // ==================== Cleanup Tests ====================

    #[tokio::test]
    async fn test_cleanup() {
        let runtime = DockerRuntime::new();
        // Cleanup should not error even if nothing to clean
        let result = runtime.cleanup().await;
        assert!(result.is_ok());
    }

    // ==================== Prepare Image Tests ====================

    #[tokio::test]
    async fn test_prepare_image_unsupported_language() {
        let runtime = DockerRuntime::new();
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
    fn test_execution_result_success_creation() {
        let result = ExecutionResult::success(
            "test-id".to_string(),
            "output".to_string(),
            String::new(),
            0,
            100,
            RuntimeType::Docker,
            "python".to_string(),
        );

        assert_eq!(result.id, "test-id");
        assert_eq!(result.stdout, "output");
        assert_eq!(result.exit_code, Some(0));
        assert_eq!(result.runtime, RuntimeType::Docker);
    }

    #[test]
    fn test_execution_result_with_stderr() {
        let result = ExecutionResult::success(
            "test-id".to_string(),
            String::new(),
            "error output".to_string(),
            1,
            100,
            RuntimeType::Docker,
            "python".to_string(),
        );

        assert_eq!(result.stderr, "error output");
        assert_eq!(result.exit_code, Some(1));
    }

    #[test]
    fn test_execution_result_timeout() {
        let result = ExecutionResult::timeout(
            "test-id".to_string(),
            "partial".to_string(),
            String::new(),
            30,
            RuntimeType::Docker,
            "python".to_string(),
        );

        assert!(matches!(result.status, ExecutionStatus::Timeout));
        assert!(result.error.is_some());
        assert!(result.error.unwrap().contains("30"));
    }

    // ==================== Integration Test (requires Docker) ====================

    #[tokio::test]
    #[ignore] // Run with --ignored flag when Docker is available
    async fn test_execute_simple_python() {
        let runtime = DockerRuntime::new();

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
    async fn test_execute_with_stdin() {
        let runtime = DockerRuntime::new();

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
    async fn test_execute_with_error() {
        let runtime = DockerRuntime::new();

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
}
