//! Environment Management Tauri Commands
//!
//! Provides commands for detecting and installing development environment tools:
//! - uv (Python package manager)
//! - nvm (Node.js version manager)
//! - Docker (container runtime)
//! - Podman (container runtime)

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{AppHandle, Emitter};

/// Supported environment tools
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EnvironmentTool {
    Uv,
    Nvm,
    Docker,
    Podman,
}

impl std::fmt::Display for EnvironmentTool {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EnvironmentTool::Uv => write!(f, "uv"),
            EnvironmentTool::Nvm => write!(f, "nvm"),
            EnvironmentTool::Docker => write!(f, "docker"),
            EnvironmentTool::Podman => write!(f, "podman"),
        }
    }
}

/// Tool status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolStatus {
    pub tool: EnvironmentTool,
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub status: String,
    pub error: Option<String>,
    #[serde(rename = "lastChecked")]
    pub last_checked: Option<String>,
}

/// Installation progress event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallProgress {
    pub tool: EnvironmentTool,
    pub stage: String,
    pub progress: u8,
    pub message: String,
    pub error: Option<String>,
}

/// Get current platform
#[tauri::command]
pub fn environment_get_platform() -> String {
    #[cfg(target_os = "windows")]
    return "windows".to_string();
    #[cfg(target_os = "macos")]
    return "macos".to_string();
    #[cfg(target_os = "linux")]
    return "linux".to_string();
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    return "unknown".to_string();
}

/// Check if a tool is installed and get its version
#[tauri::command]
pub async fn environment_check_tool(tool: EnvironmentTool) -> Result<ToolStatus, String> {
    let now = chrono::Utc::now().to_rfc3339();

    let (check_cmd, version_arg) = get_check_command(&tool);

    let result = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("{} {}", check_cmd, version_arg)])
            .output()
    } else {
        // For nvm, we need to source it first
        if matches!(tool, EnvironmentTool::Nvm) {
            Command::new("bash")
                .args([
                    "-c",
                    &format!(
                        "export NVM_DIR=\"$HOME/.nvm\"; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; {} {}",
                        check_cmd, version_arg
                    ),
                ])
                .output()
        } else {
            Command::new("sh")
                .args(["-c", &format!("{} {}", check_cmd, version_arg)])
                .output()
        }
    };

    match result {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout)
                    .trim()
                    .to_string();
                let path = get_tool_path(&tool);

                Ok(ToolStatus {
                    tool,
                    installed: true,
                    version: Some(version),
                    path,
                    status: "installed".to_string(),
                    error: None,
                    last_checked: Some(now),
                })
            } else {
                Ok(ToolStatus {
                    tool,
                    installed: false,
                    version: None,
                    path: None,
                    status: "not_installed".to_string(),
                    error: None,
                    last_checked: Some(now),
                })
            }
        }
        Err(e) => Ok(ToolStatus {
            tool,
            installed: false,
            version: None,
            path: None,
            status: "not_installed".to_string(),
            error: Some(e.to_string()),
            last_checked: Some(now),
        }),
    }
}

/// Check all tools at once
#[tauri::command]
pub async fn environment_check_all_tools() -> Result<Vec<ToolStatus>, String> {
    let tools = vec![
        EnvironmentTool::Uv,
        EnvironmentTool::Nvm,
        EnvironmentTool::Docker,
        EnvironmentTool::Podman,
    ];

    let mut results = Vec::new();
    for tool in tools {
        match environment_check_tool(tool).await {
            Ok(status) => results.push(status),
            Err(e) => {
                results.push(ToolStatus {
                    tool,
                    installed: false,
                    version: None,
                    path: None,
                    status: "error".to_string(),
                    error: Some(e),
                    last_checked: Some(chrono::Utc::now().to_rfc3339()),
                });
            }
        }
    }

    Ok(results)
}

/// Install a tool
#[tauri::command]
pub async fn environment_install_tool(
    app: AppHandle,
    tool: EnvironmentTool,
) -> Result<ToolStatus, String> {
    // Emit progress: starting
    emit_progress(&app, &tool, "downloading", 0, "Starting installation...", None);

    let install_commands = get_install_commands(&tool);

    if install_commands.is_empty() {
        return Err(format!("No installation commands available for {} on this platform", tool));
    }

    // Execute installation commands
    for (idx, cmd) in install_commands.iter().enumerate() {
        let progress = ((idx + 1) as f32 / install_commands.len() as f32 * 80.0) as u8;
        emit_progress(
            &app,
            &tool,
            "installing",
            progress,
            &format!("Running: {}...", truncate_cmd(cmd)),
            None,
        );

        let result = execute_install_command(cmd);

        if let Err(e) = result {
            emit_progress(&app, &tool, "error", 0, "Installation failed", Some(&e));
            return Err(e);
        }
    }

    // Run post-install commands if any
    let post_install = get_post_install_commands(&tool);
    for cmd in post_install {
        emit_progress(&app, &tool, "configuring", 90, "Configuring...", None);
        let _ = execute_install_command(&cmd);
    }

    // Verify installation
    emit_progress(&app, &tool, "verifying", 95, "Verifying installation...", None);

    // Wait a moment for installation to complete
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let status = environment_check_tool(tool).await?;

    if status.installed {
        emit_progress(&app, &tool, "done", 100, "Installation complete!", None);
    } else {
        emit_progress(
            &app,
            &tool,
            "error",
            0,
            "Installation verification failed",
            Some("Tool was installed but could not be verified. You may need to restart your terminal or system."),
        );
    }

    Ok(status)
}

/// Get installation commands for a tool based on platform
fn get_install_commands(tool: &EnvironmentTool) -> Vec<String> {
    #[cfg(target_os = "windows")]
    {
        match tool {
            EnvironmentTool::Uv => vec![
                r#"powershell -ExecutionPolicy ByPass -Command "irm https://astral.sh/uv/install.ps1 | iex""#.to_string(),
            ],
            EnvironmentTool::Nvm => vec![
                "winget install --id CoreyButler.NVMforWindows -e --accept-source-agreements --accept-package-agreements".to_string(),
            ],
            EnvironmentTool::Docker => vec![
                "winget install --id Docker.DockerDesktop -e --accept-source-agreements --accept-package-agreements".to_string(),
            ],
            EnvironmentTool::Podman => vec![
                "winget install --id RedHat.Podman -e --accept-source-agreements --accept-package-agreements".to_string(),
            ],
        }
    }

    #[cfg(target_os = "macos")]
    {
        match tool {
            EnvironmentTool::Uv => vec![
                "curl -LsSf https://astral.sh/uv/install.sh | sh".to_string(),
            ],
            EnvironmentTool::Nvm => vec![
                "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash".to_string(),
            ],
            EnvironmentTool::Docker => vec![
                "brew install --cask docker".to_string(),
            ],
            EnvironmentTool::Podman => vec![
                "brew install podman".to_string(),
            ],
        }
    }

    #[cfg(target_os = "linux")]
    {
        match tool {
            EnvironmentTool::Uv => vec![
                "curl -LsSf https://astral.sh/uv/install.sh | sh".to_string(),
            ],
            EnvironmentTool::Nvm => vec![
                "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash".to_string(),
            ],
            EnvironmentTool::Docker => vec![
                "curl -fsSL https://get.docker.com | sh".to_string(),
            ],
            EnvironmentTool::Podman => vec![
                "sudo apt-get update && sudo apt-get install -y podman".to_string(),
            ],
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        vec![]
    }
}

/// Get post-install commands
#[allow(unused_variables)]
fn get_post_install_commands(tool: &EnvironmentTool) -> Vec<String> {
    #[cfg(target_os = "macos")]
    {
        match tool {
            EnvironmentTool::Docker => vec!["open -a Docker".to_string()],
            EnvironmentTool::Podman => vec![
                "podman machine init".to_string(),
                "podman machine start".to_string(),
            ],
            _ => vec![],
        }
    }

    #[cfg(target_os = "linux")]
    {
        match tool {
            EnvironmentTool::Docker => vec![
                "sudo systemctl enable docker".to_string(),
                "sudo systemctl start docker".to_string(),
            ],
            _ => vec![],
        }
    }

    #[cfg(target_os = "windows")]
    {
        vec![]
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        vec![]
    }
}

/// Get the command to check if a tool is installed
fn get_check_command(tool: &EnvironmentTool) -> (&'static str, &'static str) {
    match tool {
        EnvironmentTool::Uv => ("uv", "--version"),
        EnvironmentTool::Nvm => {
            #[cfg(target_os = "windows")]
            return ("nvm", "version");
            #[cfg(not(target_os = "windows"))]
            return ("nvm", "--version");
        }
        EnvironmentTool::Docker => ("docker", "--version"),
        EnvironmentTool::Podman => ("podman", "--version"),
    }
}

/// Get tool path if installed
fn get_tool_path(tool: &EnvironmentTool) -> Option<String> {
    let cmd_name = match tool {
        EnvironmentTool::Uv => "uv",
        EnvironmentTool::Nvm => "nvm",
        EnvironmentTool::Docker => "docker",
        EnvironmentTool::Podman => "podman",
    };

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("where").arg(cmd_name).output().ok()?;
        if output.status.success() {
            Some(
                String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()?
                    .to_string(),
            )
        } else {
            None
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("which").arg(cmd_name).output().ok()?;
        if output.status.success() {
            Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            None
        }
    }
}

/// Execute an install command
fn execute_install_command(cmd: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("cmd")
            .args(["/C", cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            Err(format!(
                "Command failed: {}\nstdout: {}\nstderr: {}",
                cmd, stdout, stderr
            ))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("sh")
            .args(["-c", cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            Err(format!(
                "Command failed: {}\nstdout: {}\nstderr: {}",
                cmd, stdout, stderr
            ))
        }
    }
}

/// Emit progress event to frontend
fn emit_progress(
    app: &AppHandle,
    tool: &EnvironmentTool,
    stage: &str,
    progress: u8,
    message: &str,
    error: Option<&str>,
) {
    let event = InstallProgress {
        tool: *tool,
        stage: stage.to_string(),
        progress,
        message: message.to_string(),
        error: error.map(|s| s.to_string()),
    };

    let _ = app.emit("environment-install-progress", event);
}

/// Truncate command for display
fn truncate_cmd(cmd: &str) -> String {
    if cmd.len() > 50 {
        format!("{}...", &cmd[..47])
    } else {
        cmd.to_string()
    }
}

/// Uninstall a tool (where supported)
#[tauri::command]
pub async fn environment_uninstall_tool(tool: EnvironmentTool) -> Result<bool, String> {
    let uninstall_cmd = get_uninstall_command(&tool);

    if let Some(cmd) = uninstall_cmd {
        execute_install_command(&cmd)?;
        Ok(true)
    } else {
        Err(format!(
            "Automatic uninstallation not supported for {}. Please uninstall manually.",
            tool
        ))
    }
}

/// Get uninstall command if available
fn get_uninstall_command(tool: &EnvironmentTool) -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        match tool {
            EnvironmentTool::Nvm => Some("winget uninstall CoreyButler.NVMforWindows".to_string()),
            EnvironmentTool::Docker => Some("winget uninstall Docker.DockerDesktop".to_string()),
            EnvironmentTool::Podman => Some("winget uninstall RedHat.Podman".to_string()),
            _ => None,
        }
    }

    #[cfg(target_os = "macos")]
    {
        match tool {
            EnvironmentTool::Docker => Some("brew uninstall --cask docker".to_string()),
            EnvironmentTool::Podman => Some("brew uninstall podman".to_string()),
            _ => None,
        }
    }

    #[cfg(target_os = "linux")]
    {
        match tool {
            EnvironmentTool::Docker => Some("sudo apt-get remove -y docker-ce docker-ce-cli containerd.io".to_string()),
            EnvironmentTool::Podman => Some("sudo apt-get remove -y podman".to_string()),
            _ => None,
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        None
    }
}

/// Open tool's official website
#[tauri::command]
pub async fn environment_open_tool_website(tool: EnvironmentTool) -> Result<(), String> {
    let url = match tool {
        EnvironmentTool::Uv => "https://docs.astral.sh/uv/",
        EnvironmentTool::Nvm => "https://github.com/nvm-sh/nvm",
        EnvironmentTool::Docker => "https://www.docker.com/",
        EnvironmentTool::Podman => "https://podman.io/",
    };

    open::that(url).map_err(|e| e.to_string())
}

/// Get Python versions managed by uv
#[tauri::command]
pub async fn environment_get_python_versions() -> Result<Vec<String>, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "uv python list"])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", "uv python list"])
            .output()
    };

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let versions: Vec<String> = stdout
                .lines()
                .filter(|line| !line.is_empty())
                .map(|line| line.trim().to_string())
                .collect();
            Ok(versions)
        }
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Get Node.js versions managed by nvm
#[tauri::command]
pub async fn environment_get_node_versions() -> Result<Vec<String>, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "nvm list"])
            .output()
    } else {
        Command::new("bash")
            .args([
                "-c",
                r#"export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; nvm list"#,
            ])
            .output()
    };

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let versions: Vec<String> = stdout
                .lines()
                .filter(|line| !line.is_empty() && line.contains('v'))
                .map(|line| {
                    line.trim()
                        .trim_start_matches(['*', '-', '>', ' '])
                        .trim()
                        .to_string()
                })
                .collect();
            Ok(versions)
        }
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}
