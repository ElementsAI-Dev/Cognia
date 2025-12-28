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
        work_dir: &PathBuf,
    ) -> Command {
        let mut cmd = Command::new(&self.docker_path);
        
        cmd.arg("run")
            .arg("--rm")
            .arg("--interactive");

        // Security: drop all capabilities
        cmd.arg("--cap-drop=ALL");

        // Security: read-only root filesystem
        cmd.arg("--read-only");

        // Security: no new privileges
        cmd.arg("--security-opt").arg("no-new-privileges:true");

        // Memory limit
        cmd.arg("--memory").arg(format!("{}m", exec_config.memory_limit_mb));
        cmd.arg("--memory-swap").arg(format!("{}m", exec_config.memory_limit_mb));

        // CPU limit
        cmd.arg("--cpus").arg(format!("{:.2}", exec_config.cpu_limit_percent as f64 / 100.0));

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
        cmd.arg("-v").arg(format!("{}:/code:ro", work_dir.display()));

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
        let basename = language_config.file_name.rsplit('.').last().unwrap_or("main");

        if let Some(compile_cmd) = language_config.compile_cmd {
            // Compiled language: compile then run
            let compile = compile_cmd
                .replace("{file}", &file_path)
                .replace("{basename}", basename);
            let run = language_config.run_cmd
                .replace("{file}", &file_path)
                .replace("{basename}", basename);
            
            cmd.arg("sh").arg("-c").arg(format!("{} && {}", compile, run));
        } else {
            // Interpreted language: run directly
            let run = language_config.run_cmd
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
        Command::new(&self.docker_path)
            .arg("version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false)
    }

    async fn get_version(&self) -> Result<String, SandboxError> {
        let output = Command::new(&self.docker_path)
            .arg("version")
            .arg("--format")
            .arg("{{.Server.Version}}")
            .output()
            .await?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            Err(SandboxError::RuntimeNotAvailable(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ))
        }
    }

    async fn execute(
        &self,
        request: &ExecutionRequest,
        language_config: &LanguageConfig,
        exec_config: &ExecutionConfig,
    ) -> Result<ExecutionResult, SandboxError> {
        let start = Instant::now();

        // Create temporary directory for code
        let temp_dir = tempfile::tempdir()?;
        let work_dir = temp_dir.path().to_path_buf();

        // Write main code file
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

        // Build and run command
        let mut cmd = self.build_command(request, language_config, exec_config, &work_dir);
        let mut child = cmd.spawn().map_err(|e| {
            SandboxError::ContainerError(format!("Failed to start Docker container: {}", e))
        })?;

        // Write stdin if provided
        if let Some(stdin_data) = &request.stdin {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(stdin_data.as_bytes()).await;
                drop(stdin);
            }
        }

        // Wait with timeout
        let result = timeout(exec_config.timeout, child.wait_with_output()).await;

        let execution_time_ms = start.elapsed().as_millis() as u64;

        match result {
            Ok(Ok(output)) => {
                let mut stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let mut stderr = String::from_utf8_lossy(&output.stderr).to_string();

                // Truncate output if too large
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
                    RuntimeType::Docker,
                    request.language.clone(),
                ))
            }
            Ok(Err(e)) => Err(SandboxError::ExecutionFailed(e.to_string())),
            Err(_) => {
                // Timeout - kill the container
                let _ = Command::new(&self.docker_path)
                    .arg("kill")
                    .arg(format!("cognia-sandbox-{}", &request.id[..8]))
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
        // Clean up any orphaned containers
        let _ = Command::new(&self.docker_path)
            .args(["container", "prune", "-f", "--filter", "label=cognia-sandbox"])
            .output()
            .await;
        Ok(())
    }

    async fn prepare_image(&self, language: &str) -> Result<(), SandboxError> {
        let config = super::languages::get_language_config(language)
            .ok_or_else(|| SandboxError::LanguageNotSupported(language.to_string()))?;

        let output = Command::new(&self.docker_path)
            .args(["pull", config.docker_image])
            .output()
            .await?;

        if output.status.success() {
            Ok(())
        } else {
            Err(SandboxError::ContainerError(format!(
                "Failed to pull image {}: {}",
                config.docker_image,
                String::from_utf8_lossy(&output.stderr)
            )))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_docker_available() {
        let runtime = DockerRuntime::new();
        // This test will pass if Docker is installed
        let _ = runtime.is_available().await;
    }
}
