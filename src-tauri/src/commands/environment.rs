//! Environment Management Tauri Commands
//!
//! Provides commands for detecting and installing development environment tools:
//! - uv (Python package manager)
//! - nvm (Node.js version manager)
//! - Docker (container runtime)
//! - Podman (container runtime)

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use uuid::Uuid;

/// Supported environment tools
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EnvironmentTool {
    Uv,
    Nvm,
    Docker,
    Podman,
    Ffmpeg,
}

impl std::fmt::Display for EnvironmentTool {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EnvironmentTool::Uv => write!(f, "uv"),
            EnvironmentTool::Nvm => write!(f, "nvm"),
            EnvironmentTool::Docker => write!(f, "docker"),
            EnvironmentTool::Podman => write!(f, "podman"),
            EnvironmentTool::Ffmpeg => write!(f, "ffmpeg"),
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
        EnvironmentTool::Ffmpeg,
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
            EnvironmentTool::Ffmpeg => vec![
                "winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements".to_string(),
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
            EnvironmentTool::Ffmpeg => vec![
                "brew install ffmpeg".to_string(),
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
            EnvironmentTool::Ffmpeg => vec![
                "sudo apt-get update && sudo apt-get install -y ffmpeg".to_string(),
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
        EnvironmentTool::Ffmpeg => ("ffmpeg", "-version"),
    }
}

/// Get tool path if installed
fn get_tool_path(tool: &EnvironmentTool) -> Option<String> {
    let cmd_name = match tool {
        EnvironmentTool::Uv => "uv",
        EnvironmentTool::Nvm => "nvm",
        EnvironmentTool::Docker => "docker",
        EnvironmentTool::Podman => "podman",
        EnvironmentTool::Ffmpeg => "ffmpeg",
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
            EnvironmentTool::Ffmpeg => Some("winget uninstall Gyan.FFmpeg".to_string()),
            _ => None,
        }
    }

    #[cfg(target_os = "macos")]
    {
        match tool {
            EnvironmentTool::Docker => Some("brew uninstall --cask docker".to_string()),
            EnvironmentTool::Podman => Some("brew uninstall podman".to_string()),
            EnvironmentTool::Ffmpeg => Some("brew uninstall ffmpeg".to_string()),
            _ => None,
        }
    }

    #[cfg(target_os = "linux")]
    {
        match tool {
            EnvironmentTool::Docker => Some("sudo apt-get remove -y docker-ce docker-ce-cli containerd.io".to_string()),
            EnvironmentTool::Podman => Some("sudo apt-get remove -y podman".to_string()),
            EnvironmentTool::Ffmpeg => Some("sudo apt-get remove -y ffmpeg".to_string()),
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
        EnvironmentTool::Ffmpeg => "https://ffmpeg.org/",
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

// ==================== Virtual Environment Management ====================

/// Virtual environment type
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum VirtualEnvType {
    Venv,
    Uv,
    Conda,
}

impl std::fmt::Display for VirtualEnvType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VirtualEnvType::Venv => write!(f, "venv"),
            VirtualEnvType::Uv => write!(f, "uv"),
            VirtualEnvType::Conda => write!(f, "conda"),
        }
    }
}

/// Virtual environment info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualEnvInfo {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub env_type: VirtualEnvType,
    pub path: String,
    #[serde(rename = "pythonVersion")]
    pub python_version: Option<String>,
    #[serde(rename = "pythonPath")]
    pub python_path: Option<String>,
    pub status: String,
    pub packages: u32,
    pub size: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "lastUsedAt")]
    pub last_used_at: Option<String>,
    #[serde(rename = "isDefault")]
    pub is_default: bool,
    #[serde(rename = "projectPath")]
    pub project_path: Option<String>,
}

/// Virtual environment creation options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVenvOptions {
    pub name: String,
    #[serde(rename = "type")]
    pub env_type: VirtualEnvType,
    #[serde(rename = "pythonVersion")]
    pub python_version: Option<String>,
    #[serde(rename = "basePath")]
    pub base_path: Option<String>,
    #[serde(rename = "projectPath")]
    pub project_path: Option<String>,
    pub packages: Option<Vec<String>>,
    #[serde(rename = "systemSitePackages")]
    pub system_site_packages: Option<bool>,
}

/// Virtual environment creation progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VenvProgress {
    pub stage: String,
    pub progress: u8,
    pub message: String,
    pub error: Option<String>,
}

/// Package info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub latest: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
}

/// Emit venv progress event
fn emit_venv_progress(
    app: &AppHandle,
    stage: &str,
    progress: u8,
    message: &str,
    error: Option<&str>,
) {
    let event = VenvProgress {
        stage: stage.to_string(),
        progress,
        message: message.to_string(),
        error: error.map(|s| s.to_string()),
    };
    let _ = app.emit("venv-progress", event);
}

/// Create a virtual environment
#[tauri::command]
pub async fn environment_create_venv(
    app: AppHandle,
    options: CreateVenvOptions,
) -> Result<VirtualEnvInfo, String> {
    let base_path = options.base_path.unwrap_or_else(|| {
        dirs::home_dir()
            .map(|p| p.join(".cognia").join("envs").to_string_lossy().to_string())
            .unwrap_or_else(|| ".cognia/envs".to_string())
    });

    // Ensure base directory exists
    std::fs::create_dir_all(&base_path).map_err(|e| format!("Failed to create base directory: {}", e))?;

    let env_path = format!("{}/{}", base_path, options.name);

    emit_venv_progress(&app, "preparing", 10, "Preparing environment...", None);

    // Check if environment already exists
    if std::path::Path::new(&env_path).exists() {
        return Err(format!("Environment '{}' already exists at {}", options.name, env_path));
    }

    emit_venv_progress(&app, "creating", 30, "Creating virtual environment...", None);

    // Create virtual environment based on type
    let result = match options.env_type {
        VirtualEnvType::Uv => create_uv_venv(&env_path, options.python_version.as_deref()).await,
        VirtualEnvType::Venv => create_python_venv(&env_path, options.python_version.as_deref(), options.system_site_packages.unwrap_or(false)).await,
        VirtualEnvType::Conda => create_conda_env(&options.name, options.python_version.as_deref()).await,
    };

    if let Err(e) = result {
        emit_venv_progress(&app, "error", 0, "Failed to create environment", Some(&e));
        return Err(e);
    }

    emit_venv_progress(&app, "configuring", 70, "Configuring environment...", None);

    // Install initial packages if specified
    if let Some(packages) = options.packages {
        if !packages.is_empty() {
            emit_venv_progress(&app, "installing", 80, "Installing packages...", None);
            let _ = install_packages_in_env(&env_path, &packages, &options.env_type).await;
        }
    }

    emit_venv_progress(&app, "done", 100, "Environment created successfully!", None);

    // Get environment info
    let info = get_venv_info(&env_path, &options.name, &options.env_type, options.project_path).await?;

    Ok(info)
}

/// Create a venv using uv
async fn create_uv_venv(path: &str, python_version: Option<&str>) -> Result<(), String> {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        let uv_cmd = if let Some(version) = python_version {
            format!("uv venv \"{}\" --python {}", path, version)
        } else {
            format!("uv venv \"{}\"", path)
        };
        c.args(["/C", &uv_cmd]);
        c
    } else {
        let mut c = Command::new("sh");
        let uv_cmd = if let Some(version) = python_version {
            format!("uv venv '{}' --python {}", path, version)
        } else {
            format!("uv venv '{}'", path)
        };
        c.args(["-c", &uv_cmd]);
        c
    };

    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Create a venv using python -m venv
async fn create_python_venv(path: &str, python_version: Option<&str>, system_site_packages: bool) -> Result<(), String> {
    let python_cmd = python_version.map(|v| format!("python{}", v)).unwrap_or_else(|| "python".to_string());
    
    let mut args = vec!["-m", "venv"];
    if system_site_packages {
        args.push("--system-site-packages");
    }

    let output = if cfg!(target_os = "windows") {
        let venv_cmd = format!("{} {} \"{}\"", python_cmd, args.join(" "), path);
        Command::new("cmd")
            .args(["/C", &venv_cmd])
            .output()
    } else {
        let venv_cmd = format!("{} {} '{}'", python_cmd, args.join(" "), path);
        Command::new("sh")
            .args(["-c", &venv_cmd])
            .output()
    };

    match output {
        Ok(out) if out.status.success() => Ok(()),
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Create a conda environment
async fn create_conda_env(name: &str, python_version: Option<&str>) -> Result<(), String> {
    let python_arg = python_version.map(|v| format!("python={}", v)).unwrap_or_else(|| "python".to_string());
    
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("conda create -n {} {} -y", name, python_arg)])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("conda create -n {} {} -y", name, python_arg)])
            .output()
    };

    match output {
        Ok(out) if out.status.success() => Ok(()),
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Install packages in an environment
async fn install_packages_in_env(env_path: &str, packages: &[String], env_type: &VirtualEnvType) -> Result<(), String> {
    let packages_str = packages.join(" ");

    let output = match env_type {
        VirtualEnvType::Uv => {
            if cfg!(target_os = "windows") {
                Command::new("cmd")
                    .args(["/C", &format!("uv pip install {} --python \"{}\\Scripts\\python.exe\"", packages_str, env_path)])
                    .output()
            } else {
                Command::new("sh")
                    .args(["-c", &format!("uv pip install {} --python '{}/bin/python'", packages_str, env_path)])
                    .output()
            }
        }
        VirtualEnvType::Venv => {
            if cfg!(target_os = "windows") {
                Command::new("cmd")
                    .args(["/C", &format!("\"{}\\Scripts\\pip.exe\" install {}", env_path, packages_str)])
                    .output()
            } else {
                Command::new("sh")
                    .args(["-c", &format!("'{}/bin/pip' install {}", env_path, packages_str)])
                    .output()
            }
        }
        VirtualEnvType::Conda => {
            let env_name = std::path::Path::new(env_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            if cfg!(target_os = "windows") {
                Command::new("cmd")
                    .args(["/C", &format!("conda install -n {} {} -y", env_name, packages_str)])
                    .output()
            } else {
                Command::new("sh")
                    .args(["-c", &format!("conda install -n {} {} -y", env_name, packages_str)])
                    .output()
            }
        }
    };

    match output {
        Ok(out) if out.status.success() => Ok(()),
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Get virtual environment info
async fn get_venv_info(
    path: &str,
    name: &str,
    env_type: &VirtualEnvType,
    project_path: Option<String>,
) -> Result<VirtualEnvInfo, String> {
    let python_path = if cfg!(target_os = "windows") {
        format!("{}\\Scripts\\python.exe", path)
    } else {
        format!("{}/bin/python", path)
    };

    // Get Python version
    let python_version = get_python_version_from_path(&python_path).await;

    // Count packages
    let packages = count_packages(&python_path).await.unwrap_or(0);

    // Get directory size
    let size = get_dir_size(path).ok();

    Ok(VirtualEnvInfo {
        id: format!("venv-{}-{}", chrono::Utc::now().timestamp_millis(), &name[..name.len().min(6)]),
        name: name.to_string(),
        env_type: *env_type,
        path: path.to_string(),
        python_version,
        python_path: Some(python_path),
        status: "inactive".to_string(),
        packages,
        size,
        created_at: chrono::Utc::now().to_rfc3339(),
        last_used_at: None,
        is_default: false,
        project_path,
    })
}

/// Get Python version from a specific python executable
async fn get_python_version_from_path(python_path: &str) -> Option<String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("\"{}\" --version", python_path)])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("'{}' --version", python_path)])
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

/// Count packages in an environment
async fn count_packages(python_path: &str) -> Result<u32, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("\"{}\" -m pip list --format=json", python_path)])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("'{}' -m pip list --format=json", python_path)])
            .output()
    };

    match output {
        Ok(out) if out.status.success() => {
            let json_str = String::from_utf8_lossy(&out.stdout);
            let packages: Vec<serde_json::Value> = serde_json::from_str(&json_str).unwrap_or_default();
            Ok(packages.len() as u32)
        }
        _ => Ok(0),
    }
}

/// Get directory size as human-readable string
fn get_dir_size(path: &str) -> Result<String, String> {
    let mut total_size: u64 = 0;
    
    fn walk_dir(dir: &std::path::Path, total: &mut u64) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Ok(metadata) = std::fs::metadata(&path) {
                        *total += metadata.len();
                    }
                } else if path.is_dir() {
                    walk_dir(&path, total);
                }
            }
        }
    }

    walk_dir(std::path::Path::new(path), &mut total_size);

    let size_str = if total_size < 1024 {
        format!("{} B", total_size)
    } else if total_size < 1024 * 1024 {
        format!("{:.1} KB", total_size as f64 / 1024.0)
    } else if total_size < 1024 * 1024 * 1024 {
        format!("{:.1} MB", total_size as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.2} GB", total_size as f64 / (1024.0 * 1024.0 * 1024.0))
    };

    Ok(size_str)
}

/// List all virtual environments
#[tauri::command]
pub async fn environment_list_venvs(base_path: Option<String>) -> Result<Vec<VirtualEnvInfo>, String> {
    let base = base_path.unwrap_or_else(|| {
        dirs::home_dir()
            .map(|p| p.join(".cognia").join("envs").to_string_lossy().to_string())
            .unwrap_or_else(|| ".cognia/envs".to_string())
    });

    let mut envs = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&base) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                // Detect environment type
                let env_type = detect_env_type(&path);
                
                if let Ok(info) = get_venv_info(
                    &path.to_string_lossy(),
                    &name,
                    &env_type,
                    None,
                ).await {
                    envs.push(info);
                }
            }
        }
    }

    Ok(envs)
}

/// Detect virtual environment type
fn detect_env_type(path: &std::path::Path) -> VirtualEnvType {
    // Check for pyvenv.cfg (venv/uv)
    if path.join("pyvenv.cfg").exists() {
        // Check if created by uv
        if let Ok(content) = std::fs::read_to_string(path.join("pyvenv.cfg")) {
            if content.contains("uv") {
                return VirtualEnvType::Uv;
            }
        }
        return VirtualEnvType::Venv;
    }
    
    // Check for conda
    if path.join("conda-meta").exists() {
        return VirtualEnvType::Conda;
    }
    
    VirtualEnvType::Venv
}

/// Delete a virtual environment
#[tauri::command]
pub async fn environment_delete_venv(path: String) -> Result<bool, String> {
    if !std::path::Path::new(&path).exists() {
        return Err("Environment does not exist".to_string());
    }

    std::fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete environment: {}", e))?;
    
    Ok(true)
}

/// Get packages in a virtual environment
#[tauri::command]
pub async fn environment_list_packages(env_path: String) -> Result<Vec<PackageInfo>, String> {
    let python_path = if cfg!(target_os = "windows") {
        format!("{}\\Scripts\\python.exe", env_path)
    } else {
        format!("{}/bin/python", env_path)
    };

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("\"{}\" -m pip list --format=json", python_path)])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("'{}' -m pip list --format=json", python_path)])
            .output()
    };

    match output {
        Ok(out) if out.status.success() => {
            let json_str = String::from_utf8_lossy(&out.stdout);
            let raw_packages: Vec<serde_json::Value> = serde_json::from_str(&json_str)
                .map_err(|e| format!("Failed to parse package list: {}", e))?;
            
            let packages: Vec<PackageInfo> = raw_packages
                .into_iter()
                .map(|p| PackageInfo {
                    name: p["name"].as_str().unwrap_or("").to_string(),
                    version: p["version"].as_str().unwrap_or("").to_string(),
                    latest: None,
                    description: None,
                    location: None,
                })
                .collect();
            
            Ok(packages)
        }
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Install packages in a virtual environment
#[tauri::command]
pub async fn environment_install_packages(
    app: AppHandle,
    env_path: String,
    packages: Vec<String>,
    upgrade: Option<bool>,
) -> Result<bool, String> {
    let python_path = if cfg!(target_os = "windows") {
        format!("{}\\Scripts\\python.exe", env_path)
    } else {
        format!("{}/bin/python", env_path)
    };

    let upgrade_flag = if upgrade.unwrap_or(false) { "--upgrade " } else { "" };
    let packages_str = packages.join(" ");

    emit_venv_progress(&app, "installing", 50, &format!("Installing {}...", packages_str), None);

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("\"{}\" -m pip install {}{}", python_path, upgrade_flag, packages_str)])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("'{}' -m pip install {}{}", python_path, upgrade_flag, packages_str)])
            .output()
    };

    match output {
        Ok(out) if out.status.success() => {
            emit_venv_progress(&app, "done", 100, "Packages installed successfully!", None);
            Ok(true)
        }
        Ok(out) => {
            let error = String::from_utf8_lossy(&out.stderr).to_string();
            emit_venv_progress(&app, "error", 0, "Installation failed", Some(&error));
            Err(error)
        }
        Err(e) => {
            emit_venv_progress(&app, "error", 0, "Installation failed", Some(&e.to_string()));
            Err(e.to_string())
        }
    }
}

/// Run a command in a virtual environment
#[tauri::command]
pub async fn environment_run_in_venv(
    env_path: String,
    command: String,
    cwd: Option<String>,
) -> Result<String, String> {
    let activate_cmd = if cfg!(target_os = "windows") {
        format!("\"{}\\Scripts\\activate.bat\" && {}", env_path, command)
    } else {
        format!("source '{}/bin/activate' && {}", env_path, command)
    };

    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(["/C", &activate_cmd]);
        c
    } else {
        let mut c = Command::new("bash");
        c.args(["-c", &activate_cmd]);
        c
    };

    if let Some(working_dir) = cwd {
        cmd.current_dir(working_dir);
    }

    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Get available Python versions (for uv)
#[tauri::command]
pub async fn environment_get_available_python_versions() -> Result<Vec<String>, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "uv python list --all-versions"])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", "uv python list --all-versions"])
            .output()
    };

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let versions: Vec<String> = stdout
                .lines()
                .filter(|line| !line.is_empty() && line.starts_with("cpython-"))
                .map(|line| {
                    line.split_whitespace()
                        .next()
                        .unwrap_or("")
                        .replace("cpython-", "")
                        .to_string()
                })
                .collect();
            Ok(versions)
        }
        Ok(_) => {
            // Fallback: return common versions
            Ok(vec![
                "3.12".to_string(),
                "3.11".to_string(),
                "3.10".to_string(),
                "3.9".to_string(),
            ])
        }
        Err(_) => {
            Ok(vec![
                "3.12".to_string(),
                "3.11".to_string(),
                "3.10".to_string(),
                "3.9".to_string(),
            ])
        }
    }
}

/// Install a specific Python version using uv
#[tauri::command]
pub async fn environment_install_python_version(
    app: AppHandle,
    version: String,
) -> Result<bool, String> {
    emit_venv_progress(&app, "installing", 30, &format!("Installing Python {}...", version), None);

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("uv python install {}", version)])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("uv python install {}", version)])
            .output()
    };

    match output {
        Ok(out) if out.status.success() => {
            emit_venv_progress(&app, "done", 100, &format!("Python {} installed successfully!", version), None);
            Ok(true)
        }
        Ok(out) => {
            let error = String::from_utf8_lossy(&out.stderr).to_string();
            emit_venv_progress(&app, "error", 0, "Installation failed", Some(&error));
            Err(error)
        }
        Err(e) => {
            emit_venv_progress(&app, "error", 0, "Installation failed", Some(&e.to_string()));
            Err(e.to_string())
        }
    }
}

// ==================== Python Execution in Virtual Environment ====================

/// Result of Python code execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonExecutionResult {
    /// Unique execution ID
    pub id: String,
    /// Execution status: "completed", "failed", "timeout", "error"
    pub status: String,
    /// Standard output
    pub stdout: String,
    /// Standard error
    pub stderr: String,
    /// Exit code (None if process didn't complete normally)
    #[serde(rename = "exitCode")]
    pub exit_code: Option<i32>,
    /// Execution time in milliseconds
    #[serde(rename = "executionTimeMs")]
    pub execution_time_ms: u64,
    /// Error message if execution failed
    pub error: Option<String>,
    /// Virtual environment path used
    #[serde(rename = "envPath")]
    pub env_path: String,
}

/// Python execution progress event (for streaming)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonExecutionProgress {
    /// Execution ID
    pub id: String,
    /// Output type: "stdout", "stderr", "status"
    #[serde(rename = "outputType")]
    pub output_type: String,
    /// Content of the output
    pub content: String,
    /// Whether execution is complete
    pub done: bool,
    /// Final exit code (only present when done=true)
    #[serde(rename = "exitCode")]
    pub exit_code: Option<i32>,
}

/// Options for Python execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonExecutionOptions {
    /// Standard input to pass to the script
    pub stdin: Option<String>,
    /// Timeout in seconds (default: 30)
    #[serde(rename = "timeoutSecs")]
    pub timeout_secs: Option<u64>,
    /// Working directory
    pub cwd: Option<String>,
    /// Environment variables to set
    pub env: Option<std::collections::HashMap<String, String>>,
    /// Arguments to pass to the script
    pub args: Option<Vec<String>>,
}

/// Execute Python code safely in a virtual environment
/// 
/// This command writes code to a temporary file and executes it using the
/// virtual environment's Python interpreter, avoiding shell injection vulnerabilities.
#[tauri::command]
pub async fn environment_execute_python(
    env_path: String,
    code: String,
    options: Option<PythonExecutionOptions>,
) -> Result<PythonExecutionResult, String> {
    let execution_id = Uuid::new_v4().to_string();
    let start_time = Instant::now();
    let opts = options.unwrap_or(PythonExecutionOptions {
        stdin: None,
        timeout_secs: Some(30),
        cwd: None,
        env: None,
        args: None,
    });

    // Get Python executable path
    let python_path = if cfg!(target_os = "windows") {
        format!("{}\\Scripts\\python.exe", env_path)
    } else {
        format!("{}/bin/python", env_path)
    };

    // Verify Python exists
    if !std::path::Path::new(&python_path).exists() {
        return Ok(PythonExecutionResult {
            id: execution_id,
            status: "error".to_string(),
            stdout: String::new(),
            stderr: String::new(),
            exit_code: None,
            execution_time_ms: start_time.elapsed().as_millis() as u64,
            error: Some(format!("Python executable not found at: {}", python_path)),
            env_path,
        });
    }

    // Create temporary file for the code
    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join(format!("cognia_exec_{}.py", execution_id));
    
    if let Err(e) = std::fs::write(&script_path, &code) {
        return Ok(PythonExecutionResult {
            id: execution_id,
            status: "error".to_string(),
            stdout: String::new(),
            stderr: String::new(),
            exit_code: None,
            execution_time_ms: start_time.elapsed().as_millis() as u64,
            error: Some(format!("Failed to write temporary script: {}", e)),
            env_path,
        });
    }

    // Build the command
    let mut cmd = Command::new(&python_path);
    cmd.arg(&script_path);
    
    // Add arguments if provided
    if let Some(args) = &opts.args {
        for arg in args {
            cmd.arg(arg);
        }
    }

    // Set working directory
    if let Some(cwd) = &opts.cwd {
        cmd.current_dir(cwd);
    }

    // Set environment variables
    if let Some(env_vars) = &opts.env {
        for (key, value) in env_vars {
            cmd.env(key, value);
        }
    }

    // Configure stdin
    if opts.stdin.is_some() {
        cmd.stdin(Stdio::piped());
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    // Spawn the process
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            let _ = std::fs::remove_file(&script_path);
            return Ok(PythonExecutionResult {
                id: execution_id,
                status: "error".to_string(),
                stdout: String::new(),
                stderr: String::new(),
                exit_code: None,
                execution_time_ms: start_time.elapsed().as_millis() as u64,
                error: Some(format!("Failed to spawn process: {}", e)),
                env_path,
            });
        }
    };

    // Write stdin if provided
    if let Some(stdin_data) = &opts.stdin {
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(stdin_data.as_bytes());
        }
    }

    // Wait for completion with timeout
    let timeout = Duration::from_secs(opts.timeout_secs.unwrap_or(30));
    let result = tokio::task::spawn_blocking(move || {
        let start = Instant::now();
        loop {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let stdout = child.stdout.take()
                        .map(|s| std::io::read_to_string(s).unwrap_or_default())
                        .unwrap_or_default();
                    let stderr = child.stderr.take()
                        .map(|s| std::io::read_to_string(s).unwrap_or_default())
                        .unwrap_or_default();
                    return Ok((status.code(), stdout, stderr, false));
                }
                Ok(None) => {
                    if start.elapsed() > timeout {
                        let _ = child.kill();
                        return Ok((None, String::new(), String::new(), true));
                    }
                    std::thread::sleep(Duration::from_millis(10));
                }
                Err(e) => return Err(e.to_string()),
            }
        }
    }).await;

    // Clean up temporary file
    let _ = std::fs::remove_file(&script_path);

    let execution_time_ms = start_time.elapsed().as_millis() as u64;

    match result {
        Ok(Ok((exit_code, stdout, stderr, timed_out))) => {
            if timed_out {
                Ok(PythonExecutionResult {
                    id: execution_id,
                    status: "timeout".to_string(),
                    stdout,
                    stderr,
                    exit_code: None,
                    execution_time_ms,
                    error: Some(format!("Execution timed out after {} seconds", opts.timeout_secs.unwrap_or(30))),
                    env_path,
                })
            } else {
                let status = if exit_code == Some(0) { "completed" } else { "failed" };
                Ok(PythonExecutionResult {
                    id: execution_id,
                    status: status.to_string(),
                    stdout,
                    stderr,
                    exit_code,
                    execution_time_ms,
                    error: None,
                    env_path,
                })
            }
        }
        Ok(Err(e)) => {
            Ok(PythonExecutionResult {
                id: execution_id,
                status: "error".to_string(),
                stdout: String::new(),
                stderr: String::new(),
                exit_code: None,
                execution_time_ms,
                error: Some(e),
                env_path,
            })
        }
        Err(join_error) => {
            Ok(PythonExecutionResult {
                id: execution_id,
                status: "error".to_string(),
                stdout: String::new(),
                stderr: String::new(),
                exit_code: None,
                execution_time_ms,
                error: Some(format!("Task execution failed: {}", join_error)),
                env_path,
            })
        }
    }
}

/// Execute Python code with streaming output
/// 
/// This command executes Python code and streams output in real-time via events.
/// Events are emitted with the name "python-execution-output".
#[tauri::command]
pub async fn environment_execute_python_stream(
    app: AppHandle,
    env_path: String,
    code: String,
    execution_id: String,
    options: Option<PythonExecutionOptions>,
) -> Result<(), String> {
    let opts = options.unwrap_or(PythonExecutionOptions {
        stdin: None,
        timeout_secs: Some(30),
        cwd: None,
        env: None,
        args: None,
    });

    // Get Python executable path
    let python_path = if cfg!(target_os = "windows") {
        format!("{}\\Scripts\\python.exe", env_path)
    } else {
        format!("{}/bin/python", env_path)
    };

    // Verify Python exists
    if !std::path::Path::new(&python_path).exists() {
        let _ = app.emit("python-execution-output", PythonExecutionProgress {
            id: execution_id.clone(),
            output_type: "status".to_string(),
            content: format!("Python executable not found at: {}", python_path),
            done: true,
            exit_code: None,
        });
        return Err(format!("Python executable not found at: {}", python_path));
    }

    // Create temporary file for the code
    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join(format!("cognia_exec_{}.py", execution_id));
    
    if let Err(e) = std::fs::write(&script_path, &code) {
        let _ = app.emit("python-execution-output", PythonExecutionProgress {
            id: execution_id.clone(),
            output_type: "status".to_string(),
            content: format!("Failed to write temporary script: {}", e),
            done: true,
            exit_code: None,
        });
        return Err(format!("Failed to write temporary script: {}", e));
    }

    // Build the command
    let mut cmd = Command::new(&python_path);
    cmd.arg("-u"); // Unbuffered output
    cmd.arg(&script_path);
    
    if let Some(args) = &opts.args {
        for arg in args {
            cmd.arg(arg);
        }
    }

    if let Some(cwd) = &opts.cwd {
        cmd.current_dir(cwd);
    }

    if let Some(env_vars) = &opts.env {
        for (key, value) in env_vars {
            cmd.env(key, value);
        }
    }

    if opts.stdin.is_some() {
        cmd.stdin(Stdio::piped());
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            let _ = std::fs::remove_file(&script_path);
            let _ = app.emit("python-execution-output", PythonExecutionProgress {
                id: execution_id.clone(),
                output_type: "status".to_string(),
                content: format!("Failed to spawn process: {}", e),
                done: true,
                exit_code: None,
            });
            return Err(format!("Failed to spawn process: {}", e));
        }
    };

    // Write stdin if provided
    if let Some(stdin_data) = &opts.stdin {
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(stdin_data.as_bytes());
        }
    }

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let timeout = Duration::from_secs(opts.timeout_secs.unwrap_or(30));
    let start_time = Instant::now();

    // Create channels for stdout and stderr
    let (tx, mut rx) = mpsc::channel::<(String, String)>(100);

    // Spawn thread for stdout
    if let Some(stdout) = stdout {
        let tx_stdout = tx.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                if tx_stdout.blocking_send(("stdout".to_string(), line)).is_err() {
                    break;
                }
            }
        });
    }

    // Spawn thread for stderr
    if let Some(stderr) = stderr {
        let tx_stderr = tx.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                if tx_stderr.blocking_send(("stderr".to_string(), line)).is_err() {
                    break;
                }
            }
        });
    }

    drop(tx); // Close the sender so rx.recv() will return None when both threads finish

    // Process output and check for timeout
    let script_path_clone = script_path.clone();
    let app_clone = app.clone();
    let exec_id_clone = execution_id.clone();
    
    tokio::spawn(async move {
        // Receive and emit output
        while let Some((output_type, content)) = rx.recv().await {
            let _ = app_clone.emit("python-execution-output", PythonExecutionProgress {
                id: exec_id_clone.clone(),
                output_type,
                content,
                done: false,
                exit_code: None,
            });
        }

        // Wait for process with timeout
        let result = tokio::task::spawn_blocking(move || {
            loop {
                match child.try_wait() {
                    Ok(Some(status)) => return Ok(status.code()),
                    Ok(None) => {
                        if start_time.elapsed() > timeout {
                            let _ = child.kill();
                            return Err("timeout".to_string());
                        }
                        std::thread::sleep(Duration::from_millis(50));
                    }
                    Err(e) => return Err(e.to_string()),
                }
            }
        }).await;

        // Clean up
        let _ = std::fs::remove_file(&script_path_clone);

        // Emit completion
        let (exit_code, error_content) = match result {
            Ok(Ok(code)) => (code, None),
            Ok(Err(e)) if e == "timeout" => (None, Some("Execution timed out".to_string())),
            Ok(Err(e)) => (None, Some(e)),
            Err(join_error) => (None, Some(format!("Task failed: {}", join_error))),
        };

        let _ = app_clone.emit("python-execution-output", PythonExecutionProgress {
            id: exec_id_clone,
            output_type: "status".to_string(),
            content: error_content.unwrap_or_else(|| "Execution completed".to_string()),
            done: true,
            exit_code,
        });
    });

    Ok(())
}

/// Execute a Python file in a virtual environment
#[tauri::command]
pub async fn environment_execute_python_file(
    env_path: String,
    file_path: String,
    options: Option<PythonExecutionOptions>,
) -> Result<PythonExecutionResult, String> {
    // Read the file content
    let code = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path, e))?;
    
    // Use the same execution logic
    environment_execute_python(env_path, code, options).await
}

/// Get information about a virtual environment's Python interpreter
#[tauri::command]
pub async fn environment_get_python_info(
    env_path: String,
) -> Result<PythonInterpreterInfo, String> {
    let python_path = if cfg!(target_os = "windows") {
        format!("{}\\Scripts\\python.exe", env_path)
    } else {
        format!("{}/bin/python", env_path)
    };

    if !std::path::Path::new(&python_path).exists() {
        return Err(format!("Python executable not found at: {}", python_path));
    }

    // Get Python version and info
    let version_output = Command::new(&python_path)
        .args(["--version"])
        .output()
        .map_err(|e| e.to_string())?;

    let version = String::from_utf8_lossy(&version_output.stdout)
        .trim()
        .replace("Python ", "")
        .to_string();

    // Get sys.path
    let path_output = Command::new(&python_path)
        .args(["-c", "import sys; print('\\n'.join(sys.path))"])
        .output()
        .map_err(|e| e.to_string())?;

    let sys_path: Vec<String> = String::from_utf8_lossy(&path_output.stdout)
        .lines()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect();

    // Get platform info
    let platform_output = Command::new(&python_path)
        .args(["-c", "import platform; print(platform.platform())"])
        .output()
        .map_err(|e| e.to_string())?;

    let platform = String::from_utf8_lossy(&platform_output.stdout)
        .trim()
        .to_string();

    Ok(PythonInterpreterInfo {
        version,
        executable: python_path,
        env_path,
        sys_path,
        platform,
    })
}

/// Information about a Python interpreter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonInterpreterInfo {
    /// Python version (e.g., "3.12.0")
    pub version: String,
    /// Path to the Python executable
    pub executable: String,
    /// Path to the virtual environment
    #[serde(rename = "envPath")]
    pub env_path: String,
    /// Python's sys.path
    #[serde(rename = "sysPath")]
    pub sys_path: Vec<String>,
    /// Platform information
    pub platform: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_environment_tool_display() {
        assert_eq!(format!("{}", EnvironmentTool::Uv), "uv");
        assert_eq!(format!("{}", EnvironmentTool::Nvm), "nvm");
        assert_eq!(format!("{}", EnvironmentTool::Docker), "docker");
        assert_eq!(format!("{}", EnvironmentTool::Podman), "podman");
        assert_eq!(format!("{}", EnvironmentTool::Ffmpeg), "ffmpeg");
    }

    #[test]
    fn test_environment_tool_serialization() {
        let tool = EnvironmentTool::Docker;
        let serialized = serde_json::to_string(&tool).unwrap();
        assert_eq!(serialized, r#""docker""#);
        
        let deserialized: EnvironmentTool = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, EnvironmentTool::Docker);
    }

    #[test]
    fn test_environment_tool_deserialization() {
        let uv: EnvironmentTool = serde_json::from_str(r#""uv""#).unwrap();
        assert_eq!(uv, EnvironmentTool::Uv);
        
        let nvm: EnvironmentTool = serde_json::from_str(r#""nvm""#).unwrap();
        assert_eq!(nvm, EnvironmentTool::Nvm);
        
        let docker: EnvironmentTool = serde_json::from_str(r#""docker""#).unwrap();
        assert_eq!(docker, EnvironmentTool::Docker);
        
        let podman: EnvironmentTool = serde_json::from_str(r#""podman""#).unwrap();
        assert_eq!(podman, EnvironmentTool::Podman);
        
        let ffmpeg: EnvironmentTool = serde_json::from_str(r#""ffmpeg""#).unwrap();
        assert_eq!(ffmpeg, EnvironmentTool::Ffmpeg);
    }

    #[test]
    fn test_ffmpeg_serialization() {
        let tool = EnvironmentTool::Ffmpeg;
        let serialized = serde_json::to_string(&tool).unwrap();
        assert_eq!(serialized, r#""ffmpeg""#);
        
        let deserialized: EnvironmentTool = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, EnvironmentTool::Ffmpeg);
    }

    #[test]
    fn test_ffmpeg_tool_status() {
        let status = ToolStatus {
            tool: EnvironmentTool::Ffmpeg,
            installed: true,
            version: Some("6.1.1".to_string()),
            path: Some("/usr/bin/ffmpeg".to_string()),
            status: "installed".to_string(),
            error: None,
            last_checked: Some("2024-01-01T00:00:00Z".to_string()),
        };
        
        assert_eq!(status.tool, EnvironmentTool::Ffmpeg);
        assert!(status.installed);
        assert_eq!(status.version, Some("6.1.1".to_string()));
        assert!(status.error.is_none());
    }

    #[test]
    fn test_ffmpeg_install_progress() {
        let progress = InstallProgress {
            tool: EnvironmentTool::Ffmpeg,
            stage: "installing".to_string(),
            progress: 75,
            message: "Installing FFmpeg...".to_string(),
            error: None,
        };
        
        assert_eq!(progress.tool, EnvironmentTool::Ffmpeg);
        assert_eq!(progress.stage, "installing");
        assert_eq!(progress.progress, 75);
        assert!(progress.error.is_none());
    }

    #[test]
    fn test_tool_status_struct() {
        let status = ToolStatus {
            tool: EnvironmentTool::Docker,
            installed: true,
            version: Some("24.0.5".to_string()),
            path: Some("/usr/bin/docker".to_string()),
            status: "installed".to_string(),
            error: None,
            last_checked: Some("2024-01-01T00:00:00Z".to_string()),
        };
        
        assert_eq!(status.tool, EnvironmentTool::Docker);
        assert!(status.installed);
        assert_eq!(status.version, Some("24.0.5".to_string()));
        assert!(status.error.is_none());
    }

    #[test]
    fn test_tool_status_serialization() {
        let status = ToolStatus {
            tool: EnvironmentTool::Uv,
            installed: false,
            version: None,
            path: None,
            status: "not_installed".to_string(),
            error: Some("Command not found".to_string()),
            last_checked: None,
        };
        
        let serialized = serde_json::to_string(&status).unwrap();
        let deserialized: ToolStatus = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(status.tool, deserialized.tool);
        assert_eq!(status.installed, deserialized.installed);
        assert_eq!(status.error, deserialized.error);
    }

    #[test]
    fn test_install_progress_struct() {
        let progress = InstallProgress {
            tool: EnvironmentTool::Nvm,
            stage: "downloading".to_string(),
            progress: 50,
            message: "Downloading...".to_string(),
            error: None,
        };
        
        assert_eq!(progress.tool, EnvironmentTool::Nvm);
        assert_eq!(progress.stage, "downloading");
        assert_eq!(progress.progress, 50);
        assert!(progress.error.is_none());
    }

    #[test]
    fn test_install_progress_with_error() {
        let progress = InstallProgress {
            tool: EnvironmentTool::Docker,
            stage: "error".to_string(),
            progress: 0,
            message: "Installation failed".to_string(),
            error: Some("Permission denied".to_string()),
        };
        
        assert_eq!(progress.error, Some("Permission denied".to_string()));
    }

    #[test]
    fn test_truncate_cmd_short() {
        let cmd = "npm install";
        let truncated = truncate_cmd(cmd);
        assert_eq!(truncated, "npm install");
    }

    #[test]
    fn test_truncate_cmd_long() {
        let cmd = "This is a very long command that exceeds fifty characters and should be truncated";
        let truncated = truncate_cmd(cmd);
        assert!(truncated.len() <= 50);
        assert!(truncated.ends_with("..."));
    }

    #[test]
    fn test_truncate_cmd_exactly_50() {
        let cmd = "12345678901234567890123456789012345678901234567890"; // 50 chars
        let truncated = truncate_cmd(cmd);
        assert_eq!(truncated, cmd);
    }

    #[test]
    fn test_virtual_env_type_display() {
        assert_eq!(format!("{}", VirtualEnvType::Venv), "venv");
        assert_eq!(format!("{}", VirtualEnvType::Uv), "uv");
        assert_eq!(format!("{}", VirtualEnvType::Conda), "conda");
    }

    #[test]
    fn test_virtual_env_type_serialization() {
        let env_type = VirtualEnvType::Uv;
        let serialized = serde_json::to_string(&env_type).unwrap();
        assert_eq!(serialized, r#""uv""#);
        
        let deserialized: VirtualEnvType = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, VirtualEnvType::Uv);
    }

    #[test]
    fn test_virtual_env_info_struct() {
        let info = VirtualEnvInfo {
            id: "venv-123".to_string(),
            name: "test-env".to_string(),
            env_type: VirtualEnvType::Venv,
            path: "/home/user/.venvs/test-env".to_string(),
            python_version: Some("3.11.0".to_string()),
            python_path: Some("/home/user/.venvs/test-env/bin/python".to_string()),
            status: "active".to_string(),
            packages: 25,
            size: Some("150 MB".to_string()),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            last_used_at: None,
            is_default: false,
            project_path: None,
        };
        
        assert_eq!(info.name, "test-env");
        assert_eq!(info.env_type, VirtualEnvType::Venv);
        assert_eq!(info.packages, 25);
    }

    #[test]
    fn test_create_venv_options_struct() {
        let options = CreateVenvOptions {
            name: "my-env".to_string(),
            env_type: VirtualEnvType::Uv,
            python_version: Some("3.12".to_string()),
            base_path: None,
            project_path: Some("/home/user/project".to_string()),
            packages: Some(vec!["numpy".to_string(), "pandas".to_string()]),
            system_site_packages: Some(false),
        };
        
        assert_eq!(options.name, "my-env");
        assert_eq!(options.env_type, VirtualEnvType::Uv);
        assert_eq!(options.python_version, Some("3.12".to_string()));
        assert_eq!(options.packages, Some(vec!["numpy".to_string(), "pandas".to_string()]));
    }

    #[test]
    fn test_venv_progress_struct() {
        let progress = VenvProgress {
            stage: "creating".to_string(),
            progress: 30,
            message: "Creating virtual environment...".to_string(),
            error: None,
        };
        
        assert_eq!(progress.stage, "creating");
        assert_eq!(progress.progress, 30);
    }

    #[test]
    fn test_package_info_struct() {
        let pkg = PackageInfo {
            name: "numpy".to_string(),
            version: "1.24.0".to_string(),
            latest: Some("1.25.0".to_string()),
            description: Some("Numerical Python".to_string()),
            location: Some("/path/to/site-packages".to_string()),
        };
        
        assert_eq!(pkg.name, "numpy");
        assert_eq!(pkg.version, "1.24.0");
        assert_eq!(pkg.latest, Some("1.25.0".to_string()));
    }

    #[test]
    fn test_get_check_command() {
        let (cmd, arg) = get_check_command(&EnvironmentTool::Uv);
        assert_eq!(cmd, "uv");
        assert_eq!(arg, "--version");
        
        let (cmd, arg) = get_check_command(&EnvironmentTool::Docker);
        assert_eq!(cmd, "docker");
        assert_eq!(arg, "--version");
        
        let (cmd, arg) = get_check_command(&EnvironmentTool::Podman);
        assert_eq!(cmd, "podman");
        assert_eq!(arg, "--version");
        
        let (cmd, arg) = get_check_command(&EnvironmentTool::Ffmpeg);
        assert_eq!(cmd, "ffmpeg");
        assert_eq!(arg, "-version");
    }

    #[test]
    fn test_get_dir_size_formatting() {
        // Test the get_dir_size function logic by verifying size string format
        // Create a temp directory for testing
        let temp_dir = std::env::temp_dir().join("test_dir_size");
        let _ = std::fs::create_dir_all(&temp_dir);
        
        // Write some test data
        let test_file = temp_dir.join("test.txt");
        std::fs::write(&test_file, "Hello, World!").ok();
        
        let result = get_dir_size(temp_dir.to_str().unwrap());
        assert!(result.is_ok());
        let size_str = result.unwrap();
        
        // Should have a unit suffix
        assert!(size_str.contains("B") || size_str.contains("KB") || 
                size_str.contains("MB") || size_str.contains("GB"));
        
        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_detect_env_type_venv() {
        let temp_dir = std::env::temp_dir().join("test_venv_detection");
        let _ = std::fs::create_dir_all(&temp_dir);
        
        // Create pyvenv.cfg for venv detection
        std::fs::write(temp_dir.join("pyvenv.cfg"), "home = /usr/bin").ok();
        
        let env_type = detect_env_type(&temp_dir);
        assert_eq!(env_type, VirtualEnvType::Venv);
        
        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_detect_env_type_uv() {
        let temp_dir = std::env::temp_dir().join("test_uv_detection");
        let _ = std::fs::create_dir_all(&temp_dir);
        
        // Create pyvenv.cfg with uv for uv detection
        std::fs::write(temp_dir.join("pyvenv.cfg"), "uv = 0.1.0\nhome = /usr/bin").ok();
        
        let env_type = detect_env_type(&temp_dir);
        assert_eq!(env_type, VirtualEnvType::Uv);
        
        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_detect_env_type_conda() {
        let temp_dir = std::env::temp_dir().join("test_conda_detection");
        let _ = std::fs::create_dir_all(&temp_dir);
        
        // Create conda-meta directory
        let _ = std::fs::create_dir_all(temp_dir.join("conda-meta"));
        
        let env_type = detect_env_type(&temp_dir);
        assert_eq!(env_type, VirtualEnvType::Conda);
        
        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_environment_get_platform() {
        let platform = environment_get_platform();
        
        #[cfg(target_os = "windows")]
        assert_eq!(platform, "windows");
        
        #[cfg(target_os = "macos")]
        assert_eq!(platform, "macos");
        
        #[cfg(target_os = "linux")]
        assert_eq!(platform, "linux");
    }

    // ==================== Python Execution Tests ====================

    #[test]
    fn test_python_execution_options_struct() {
        let options = PythonExecutionOptions {
            stdin: None,
            timeout_secs: None,
            cwd: None,
            env: None,
            args: None,
        };
        assert!(options.stdin.is_none());
        assert!(options.timeout_secs.is_none());
        assert!(options.cwd.is_none());
        assert!(options.env.is_none());
        assert!(options.args.is_none());
    }

    #[test]
    fn test_python_execution_options_serialization() {
        let options = PythonExecutionOptions {
            stdin: Some("test input".to_string()),
            timeout_secs: Some(60),
            cwd: Some("/home/user/project".to_string()),
            env: Some(std::collections::HashMap::from([
                ("PYTHONPATH".to_string(), "/custom/path".to_string()),
            ])),
            args: Some(vec!["--verbose".to_string(), "-n".to_string(), "5".to_string()]),
        };
        
        let serialized = serde_json::to_string(&options).unwrap();
        let deserialized: PythonExecutionOptions = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(options.stdin, deserialized.stdin);
        assert_eq!(options.timeout_secs, deserialized.timeout_secs);
        assert_eq!(options.cwd, deserialized.cwd);
        assert_eq!(options.args, deserialized.args);
    }

    #[test]
    fn test_python_execution_result_success() {
        let result = PythonExecutionResult {
            id: "exec-123".to_string(),
            status: "completed".to_string(),
            stdout: "Hello, World!\n".to_string(),
            stderr: String::new(),
            exit_code: Some(0),
            execution_time_ms: 150,
            error: None,
            env_path: "/path/to/venv".to_string(),
        };
        
        assert_eq!(result.status, "completed");
        assert_eq!(result.exit_code, Some(0));
        assert!(result.error.is_none());
        assert!(result.stdout.contains("Hello"));
    }

    #[test]
    fn test_python_execution_result_error() {
        let result = PythonExecutionResult {
            id: "exec-456".to_string(),
            status: "failed".to_string(),
            stdout: String::new(),
            stderr: "NameError: name 'foo' is not defined\n".to_string(),
            exit_code: Some(1),
            execution_time_ms: 50,
            error: Some("Script execution failed".to_string()),
            env_path: "/path/to/venv".to_string(),
        };
        
        assert_eq!(result.status, "failed");
        assert_eq!(result.exit_code, Some(1));
        assert!(result.error.is_some());
        assert!(result.stderr.contains("NameError"));
    }

    #[test]
    fn test_python_execution_result_timeout() {
        let result = PythonExecutionResult {
            id: "exec-789".to_string(),
            status: "timeout".to_string(),
            stdout: "partial output...".to_string(),
            stderr: String::new(),
            exit_code: None,
            execution_time_ms: 30000,
            error: Some("Execution timed out after 30 seconds".to_string()),
            env_path: "/path/to/venv".to_string(),
        };
        
        assert_eq!(result.status, "timeout");
        assert!(result.exit_code.is_none());
        assert!(result.error.is_some());
    }

    #[test]
    fn test_python_execution_result_serialization() {
        let result = PythonExecutionResult {
            id: "exec-test".to_string(),
            status: "completed".to_string(),
            stdout: "output".to_string(),
            stderr: "".to_string(),
            exit_code: Some(0),
            execution_time_ms: 100,
            error: None,
            env_path: "/venv".to_string(),
        };
        
        let serialized = serde_json::to_string(&result).unwrap();
        let deserialized: PythonExecutionResult = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(result.id, deserialized.id);
        assert_eq!(result.status, deserialized.status);
        assert_eq!(result.stdout, deserialized.stdout);
        assert_eq!(result.exit_code, deserialized.exit_code);
    }

    #[test]
    fn test_python_execution_progress_stdout() {
        let progress = PythonExecutionProgress {
            id: "exec-123".to_string(),
            output_type: "stdout".to_string(),
            content: "Processing line 1...".to_string(),
            done: false,
            exit_code: None,
        };
        
        assert_eq!(progress.output_type, "stdout");
        assert!(!progress.done);
        assert!(progress.exit_code.is_none());
    }

    #[test]
    fn test_python_execution_progress_stderr() {
        let progress = PythonExecutionProgress {
            id: "exec-123".to_string(),
            output_type: "stderr".to_string(),
            content: "Warning: deprecated function".to_string(),
            done: false,
            exit_code: None,
        };
        
        assert_eq!(progress.output_type, "stderr");
        assert!(progress.content.contains("Warning"));
    }

    #[test]
    fn test_python_execution_progress_completion() {
        let progress = PythonExecutionProgress {
            id: "exec-123".to_string(),
            output_type: "status".to_string(),
            content: "Execution completed".to_string(),
            done: true,
            exit_code: Some(0),
        };
        
        assert!(progress.done);
        assert_eq!(progress.exit_code, Some(0));
    }

    #[test]
    fn test_python_execution_progress_serialization() {
        let progress = PythonExecutionProgress {
            id: "exec-test".to_string(),
            output_type: "stdout".to_string(),
            content: "test output".to_string(),
            done: false,
            exit_code: None,
        };
        
        let serialized = serde_json::to_string(&progress).unwrap();
        let deserialized: PythonExecutionProgress = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(progress.id, deserialized.id);
        assert_eq!(progress.output_type, deserialized.output_type);
        assert_eq!(progress.content, deserialized.content);
        assert_eq!(progress.done, deserialized.done);
    }

    #[test]
    fn test_python_interpreter_info_struct() {
        let info = PythonInterpreterInfo {
            version: "3.12.0".to_string(),
            executable: "/path/to/venv/bin/python".to_string(),
            env_path: "/path/to/venv".to_string(),
            sys_path: vec![
                "/path/to/venv/lib/python3.12".to_string(),
                "/path/to/venv/lib/python3.12/site-packages".to_string(),
            ],
            platform: "Linux-5.15.0-x86_64-with-glibc2.35".to_string(),
        };
        
        assert_eq!(info.version, "3.12.0");
        assert!(info.executable.contains("python"));
        assert_eq!(info.sys_path.len(), 2);
        assert!(info.platform.contains("Linux"));
    }

    #[test]
    fn test_python_interpreter_info_serialization() {
        let info = PythonInterpreterInfo {
            version: "3.11.5".to_string(),
            executable: "/venv/bin/python".to_string(),
            env_path: "/venv".to_string(),
            sys_path: vec!["/venv/lib".to_string()],
            platform: "Windows-10".to_string(),
        };
        
        let serialized = serde_json::to_string(&info).unwrap();
        let deserialized: PythonInterpreterInfo = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(info.version, deserialized.version);
        assert_eq!(info.executable, deserialized.executable);
        assert_eq!(info.sys_path, deserialized.sys_path);
    }

    #[test]
    fn test_python_executable_path_construction() {
        // Test the expected path construction logic for Python executables
        let env_path = std::path::Path::new("/home/user/.venvs/myenv");
        
        #[cfg(target_os = "windows")]
        {
            let expected = env_path.join("Scripts").join("python.exe");
            assert!(expected.to_string_lossy().contains("Scripts"));
            assert!(expected.to_string_lossy().contains("python.exe"));
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            let expected = env_path.join("bin").join("python");
            assert!(expected.to_string_lossy().contains("bin"));
            assert!(expected.to_string_lossy().contains("python"));
        }
    }
}
