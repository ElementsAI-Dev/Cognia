//! Git commands module
//!
//! Provides Tauri commands for Git operations:
//! - Installation detection and management
//! - Repository operations (init, clone, status)
//! - Commit, push, pull operations
//! - Branch management

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use tauri::{AppHandle, Emitter};

/// Git installation status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub status: String,
    pub error: Option<String>,
    #[serde(rename = "lastChecked")]
    pub last_checked: Option<String>,
}

/// Git repository info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRepoInfo {
    pub path: String,
    #[serde(rename = "isGitRepo")]
    pub is_git_repo: bool,
    pub status: String,
    pub branch: Option<String>,
    #[serde(rename = "remoteName")]
    pub remote_name: Option<String>,
    #[serde(rename = "remoteUrl")]
    pub remote_url: Option<String>,
    pub ahead: i32,
    pub behind: i32,
    #[serde(rename = "hasUncommittedChanges")]
    pub has_uncommitted_changes: bool,
    #[serde(rename = "hasUntrackedFiles")]
    pub has_untracked_files: bool,
    #[serde(rename = "lastCommit")]
    pub last_commit: Option<GitCommitInfo>,
}

/// Git commit info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommitInfo {
    pub hash: String,
    #[serde(rename = "shortHash")]
    pub short_hash: String,
    pub author: String,
    #[serde(rename = "authorEmail")]
    pub author_email: String,
    pub date: String,
    pub message: String,
    #[serde(rename = "messageBody")]
    pub message_body: Option<String>,
}

/// Git branch info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranchInfo {
    pub name: String,
    #[serde(rename = "isRemote")]
    pub is_remote: bool,
    #[serde(rename = "isCurrent")]
    pub is_current: bool,
    pub upstream: Option<String>,
}

/// Git file status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
    #[serde(rename = "oldPath")]
    pub old_path: Option<String>,
}

/// Git remote info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRemoteInfo {
    pub name: String,
    #[serde(rename = "fetchUrl")]
    pub fetch_url: String,
    #[serde(rename = "pushUrl")]
    pub push_url: String,
}

/// Git diff info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitDiffInfo {
    pub path: String,
    pub additions: i32,
    pub deletions: i32,
    pub content: Option<String>,
}

/// Git config
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitConfig {
    #[serde(rename = "userName")]
    pub user_name: Option<String>,
    #[serde(rename = "userEmail")]
    pub user_email: Option<String>,
    #[serde(rename = "defaultBranch")]
    pub default_branch: Option<String>,
    pub editor: Option<String>,
}

/// Git operation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitOperationResult<T = ()> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub output: Option<String>,
}

impl<T> GitOperationResult<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            output: None,
        }
    }

    pub fn success_with_output(data: T, output: String) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            output: Some(output),
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
            output: None,
        }
    }
}

impl GitOperationResult<()> {
    pub fn ok() -> Self {
        Self {
            success: true,
            data: Some(()),
            error: None,
            output: None,
        }
    }

    pub fn ok_with_output(output: String) -> Self {
        Self {
            success: true,
            data: Some(()),
            error: None,
            output: Some(output),
        }
    }
}

/// Git init options
#[derive(Debug, Clone, Deserialize)]
pub struct GitInitOptions {
    pub path: String,
    #[serde(rename = "initialBranch")]
    pub initial_branch: Option<String>,
    pub bare: Option<bool>,
}

/// Git clone options
#[derive(Debug, Clone, Deserialize)]
pub struct GitCloneOptions {
    pub url: String,
    #[serde(rename = "targetPath")]
    pub target_path: String,
    pub branch: Option<String>,
    pub depth: Option<u32>,
    pub recursive: Option<bool>,
}

/// Git commit options
#[derive(Debug, Clone, Deserialize)]
pub struct GitCommitOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub message: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub email: Option<String>,
    pub amend: Option<bool>,
    #[serde(rename = "allowEmpty")]
    pub allow_empty: Option<bool>,
    pub files: Option<Vec<String>>,
}

/// Git push options
#[derive(Debug, Clone, Deserialize)]
pub struct GitPushOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub remote: Option<String>,
    pub branch: Option<String>,
    pub force: Option<bool>,
    #[serde(rename = "setUpstream")]
    pub set_upstream: Option<bool>,
    pub tags: Option<bool>,
}

/// Git pull options
#[derive(Debug, Clone, Deserialize)]
pub struct GitPullOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub remote: Option<String>,
    pub branch: Option<String>,
    pub rebase: Option<bool>,
    #[serde(rename = "noCommit")]
    pub no_commit: Option<bool>,
}

/// Git checkout options
#[derive(Debug, Clone, Deserialize)]
pub struct GitCheckoutOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub target: String,
    #[serde(rename = "createBranch")]
    pub create_branch: Option<bool>,
    pub force: Option<bool>,
}

/// Git branch options
#[derive(Debug, Clone, Deserialize)]
pub struct GitBranchOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub name: String,
    #[serde(rename = "startPoint")]
    pub start_point: Option<String>,
    pub delete: Option<bool>,
    pub force: Option<bool>,
}

/// Git stash options
#[derive(Debug, Clone, Deserialize)]
pub struct GitStashOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub action: String,
    pub message: Option<String>,
    #[serde(rename = "includeUntracked")]
    pub include_untracked: Option<bool>,
    #[serde(rename = "stashIndex")]
    pub stash_index: Option<u32>,
}

/// Git reset options
#[derive(Debug, Clone, Deserialize)]
pub struct GitResetOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub mode: String,
    pub target: Option<String>,
}

/// Git log options
#[derive(Debug, Clone, Deserialize)]
pub struct GitLogOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    #[serde(rename = "maxCount")]
    pub max_count: Option<u32>,
    pub skip: Option<u32>,
    pub since: Option<String>,
    pub until: Option<String>,
    pub author: Option<String>,
    pub grep: Option<String>,
    pub path: Option<String>,
}

/// Git merge options
#[derive(Debug, Clone, Deserialize)]
pub struct GitMergeOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub branch: String,
    #[serde(rename = "noCommit")]
    pub no_commit: Option<bool>,
    #[serde(rename = "noFf")]
    pub no_ff: Option<bool>,
    pub squash: Option<bool>,
    pub message: Option<String>,
}

/// Git operation progress event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitProgress {
    pub operation: String,
    pub stage: String,
    pub progress: u32,
    pub message: String,
    pub error: Option<String>,
}

impl GitProgress {
    pub fn new(operation: &str, stage: &str, progress: u32, message: &str) -> Self {
        Self {
            operation: operation.to_string(),
            stage: stage.to_string(),
            progress,
            message: message.to_string(),
            error: None,
        }
    }

    pub fn preparing(operation: &str) -> Self {
        Self::new(operation, "preparing", 0, &format!("Preparing {}...", operation))
    }

    pub fn running(operation: &str, progress: u32, message: &str) -> Self {
        Self::new(operation, "running", progress, message)
    }

    pub fn finishing(operation: &str) -> Self {
        Self::new(operation, "finishing", 90, &format!("Finishing {}...", operation))
    }

    pub fn done(operation: &str) -> Self {
        Self::new(operation, "done", 100, &format!("{} completed", operation))
    }

    pub fn error(operation: &str, error: &str) -> Self {
        Self {
            operation: operation.to_string(),
            stage: "error".to_string(),
            progress: 0,
            message: error.to_string(),
            error: Some(error.to_string()),
        }
    }
}

/// Emit a Git progress event
fn emit_git_progress(app: &AppHandle, progress: GitProgress) {
    if let Err(e) = app.emit("git-operation-progress", &progress) {
        log::warn!("Failed to emit git progress event: {}", e);
    }
}

/// Git full status - combined response for all status data
/// This reduces multiple IPC calls to a single call for better performance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFullStatus {
    #[serde(rename = "repoInfo")]
    pub repo_info: Option<GitRepoInfo>,
    pub branches: Vec<GitBranchInfo>,
    pub commits: Vec<GitCommitInfo>,
    #[serde(rename = "fileStatus")]
    pub file_status: Vec<GitFileStatus>,
    #[serde(rename = "stashList")]
    pub stash_list: Vec<GitStashEntry>,
    pub remotes: Vec<GitRemoteInfo>,
}

// ==================== Helper Functions ====================

fn run_git_command(args: &[&str], cwd: Option<&str>) -> Result<String, String> {
    let mut cmd = Command::new("git");
    cmd.args(args);
    
    // Prevent credential prompts from blocking the process
    cmd.env("GIT_TERMINAL_PROMPT", "0");

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    log::debug!("Running git command: git {:?} in {:?}", args, cwd);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if stderr.is_empty() {
            "Git command failed".to_string()
        } else {
            stderr
        })
    }
}

fn get_current_timestamp() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn parse_git_status_short(line: &str) -> Option<GitFileStatus> {
    if line.len() < 3 {
        return None;
    }

    let index_status = line.chars().next().unwrap_or(' ');
    let worktree_status = line.chars().nth(1).unwrap_or(' ');
    let path = line[3..].to_string();

    let (status, staged) = match (index_status, worktree_status) {
        ('A', _) => ("added", true),
        ('M', ' ') => ("modified", true),
        (' ', 'M') | ('M', 'M') => ("modified", worktree_status == ' '),
        ('D', _) => ("deleted", true),
        (' ', 'D') => ("deleted", false),
        ('R', _) => ("renamed", true),
        ('C', _) => ("copied", true),
        ('?', '?') => ("untracked", false),
        ('!', '!') => ("ignored", false),
        _ => ("modified", false),
    };

    Some(GitFileStatus {
        path,
        status: status.to_string(),
        staged,
        old_path: None,
    })
}

fn parse_commit_log(output: &str) -> Vec<GitCommitInfo> {
    let mut commits = Vec::new();

    for entry in output.split("\x00\x00") {
        let entry = entry.trim();
        if entry.is_empty() {
            continue;
        }

        let parts: Vec<&str> = entry.splitn(6, '\x00').collect();
        if parts.len() >= 5 {
            let message_parts: Vec<&str> = parts.get(4).unwrap_or(&"").splitn(2, '\n').collect();

            commits.push(GitCommitInfo {
                hash: parts[0].to_string(),
                short_hash: parts[0].chars().take(7).collect(),
                author: parts[1].to_string(),
                author_email: parts[2].to_string(),
                date: parts[3].to_string(),
                message: message_parts.first().unwrap_or(&"").to_string(),
                message_body: message_parts.get(1).map(|s| s.to_string()),
            });
        }
    }

    commits
}

// ==================== Tauri Commands ====================

/// Get current platform
#[tauri::command]
pub fn git_get_platform() -> String {
    #[cfg(target_os = "windows")]
    return "windows".to_string();
    #[cfg(target_os = "macos")]
    return "macos".to_string();
    #[cfg(target_os = "linux")]
    return "linux".to_string();
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    return "unknown".to_string();
}

/// Check if Git is installed
#[tauri::command]
pub async fn git_check_installed() -> GitStatus {
    log::debug!("Checking Git installation...");

    match run_git_command(&["--version"], None) {
        Ok(output) => {
            // Parse version from "git version X.Y.Z"
            let version = output
                .strip_prefix("git version ")
                .map(|v| v.split_whitespace().next().unwrap_or(v))
                .map(|v| v.to_string());

            // Get git path
            let path = if cfg!(target_os = "windows") {
                run_git_command(&["--exec-path"], None).ok()
            } else {
                std::process::Command::new("which")
                    .arg("git")
                    .output()
                    .ok()
                    .and_then(|o| {
                        if o.status.success() {
                            Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
                        } else {
                            None
                        }
                    })
            };

            log::info!("Git found: version={:?}, path={:?}", version, path);

            GitStatus {
                installed: true,
                version,
                path,
                status: "installed".to_string(),
                error: None,
                last_checked: Some(get_current_timestamp()),
            }
        }
        Err(e) => {
            log::warn!("Git not found: {}", e);
            GitStatus {
                installed: false,
                version: None,
                path: None,
                status: "not_installed".to_string(),
                error: Some(e),
                last_checked: Some(get_current_timestamp()),
            }
        }
    }
}

/// Install Git (opens download page or uses package manager)
#[tauri::command]
pub async fn git_install(_app: AppHandle) -> Result<GitStatus, String> {
    log::info!("Installing Git...");

    #[cfg(target_os = "windows")]
    {
        // Try winget first
        let result = std::process::Command::new("winget")
            .args([
                "install",
                "--id",
                "Git.Git",
                "-e",
                "--accept-source-agreements",
                "--accept-package-agreements",
            ])
            .output();

        match result {
            Ok(output) if output.status.success() => {
                log::info!("Git installed via winget");
                Ok(git_check_installed().await)
            }
            _ => {
                // Open download page as fallback
                let _ = open::that("https://git-scm.com/download/win");
                Err("Please install Git from the opened download page".to_string())
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // Try xcode-select first (includes git)
        let result = std::process::Command::new("xcode-select")
            .args(["--install"])
            .output();

        match result {
            Ok(_) => {
                log::info!("Xcode Command Line Tools installation initiated");
                return Err("Xcode Command Line Tools installation dialog opened. Please follow the prompts.".to_string());
            }
            _ => {
                // Open download page as fallback
                let _ = open::that("https://git-scm.com/download/mac");
                return Err("Please install Git from the opened download page".to_string());
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Open download page - user needs to use their package manager
        let _ = open::that("https://git-scm.com/download/linux");
        return Err(
            "Please install Git using your package manager (apt, dnf, pacman, etc.)".to_string(),
        );
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Git installation not supported on this platform".to_string())
    }
}

/// Open Git website
#[tauri::command]
pub async fn git_open_website() -> Result<(), String> {
    open::that("https://git-scm.com/downloads").map_err(|e| e.to_string())
}

/// Get Git configuration
#[tauri::command]
pub async fn git_get_config() -> Result<GitConfig, String> {
    let user_name = run_git_command(&["config", "--global", "user.name"], None).ok();
    let user_email = run_git_command(&["config", "--global", "user.email"], None).ok();
    let default_branch = run_git_command(&["config", "--global", "init.defaultBranch"], None).ok();
    let editor = run_git_command(&["config", "--global", "core.editor"], None).ok();

    Ok(GitConfig {
        user_name,
        user_email,
        default_branch,
        editor,
    })
}

/// Set Git configuration
#[tauri::command]
pub async fn git_set_config(config: GitConfig) -> Result<(), String> {
    if let Some(name) = config.user_name {
        run_git_command(&["config", "--global", "user.name", &name], None)?;
    }
    if let Some(email) = config.user_email {
        run_git_command(&["config", "--global", "user.email", &email], None)?;
    }
    if let Some(branch) = config.default_branch {
        run_git_command(&["config", "--global", "init.defaultBranch", &branch], None)?;
    }
    if let Some(editor) = config.editor {
        run_git_command(&["config", "--global", "core.editor", &editor], None)?;
    }

    Ok(())
}

/// Initialize a new Git repository
#[tauri::command]
pub async fn git_init(options: GitInitOptions) -> GitOperationResult<GitRepoInfo> {
    log::info!("Initializing Git repository at: {}", options.path);

    let mut args = vec!["init"];

    if options.bare.unwrap_or(false) {
        args.push("--bare");
    }

    if let Some(ref branch) = options.initial_branch {
        args.push("-b");
        args.push(branch);
    }

    args.push(&options.path);

    match run_git_command(&args, None) {
        Ok(output) => {
            log::info!("Git repository initialized: {}", output);

            // Get repo info
            match git_status_internal(&options.path) {
                Ok(info) => GitOperationResult::success_with_output(info, output),
                Err(e) => GitOperationResult::error(e),
            }
        }
        Err(e) => {
            log::error!("Failed to initialize Git repository: {}", e);
            GitOperationResult::error(e)
        }
    }
}

/// Clone a Git repository with progress events
#[tauri::command]
pub async fn git_clone(app: AppHandle, options: GitCloneOptions) -> GitOperationResult<GitRepoInfo> {
    log::info!(
        "Cloning Git repository from: {} to: {}",
        options.url,
        options.target_path
    );

    // Emit preparing progress
    emit_git_progress(&app, GitProgress::preparing("clone"));

    let mut args = vec!["clone".to_string(), "--progress".to_string()];

    if let Some(branch) = &options.branch {
        args.push("-b".to_string());
        args.push(branch.clone());
    }

    if let Some(depth) = options.depth {
        args.push("--depth".to_string());
        args.push(depth.to_string());
    }

    if options.recursive.unwrap_or(false) {
        args.push("--recursive".to_string());
    }

    args.push(options.url.clone());
    args.push(options.target_path.clone());

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    // Emit running progress
    emit_git_progress(&app, GitProgress::running("clone", 20, "Connecting to remote..."));

    match run_git_command(&args_refs, None) {
        Ok(output) => {
            log::info!("Repository cloned successfully");

            // Emit finishing progress
            emit_git_progress(&app, GitProgress::finishing("clone"));

            match git_status_internal(&options.target_path) {
                Ok(info) => {
                    // Emit done progress
                    emit_git_progress(&app, GitProgress::done("clone"));
                    GitOperationResult::success_with_output(info, output)
                }
                Err(e) => {
                    emit_git_progress(&app, GitProgress::error("clone", &e));
                    GitOperationResult::error(e)
                }
            }
        }
        Err(e) => {
            log::error!("Failed to clone repository: {}", e);
            emit_git_progress(&app, GitProgress::error("clone", &e));
            GitOperationResult::error(e)
        }
    }
}

/// Check if path is a Git repository
#[tauri::command]
pub async fn git_is_repo(path: String) -> bool {
    let git_dir = Path::new(&path).join(".git");
    git_dir.exists() || run_git_command(&["rev-parse", "--git-dir"], Some(&path)).is_ok()
}

/// Get repository status
fn git_status_internal(repo_path: &str) -> Result<GitRepoInfo, String> {
    // Check if it's a git repo
    if !Path::new(repo_path).join(".git").exists()
        && run_git_command(&["rev-parse", "--git-dir"], Some(repo_path)).is_err()
    {
        return Ok(GitRepoInfo {
            path: repo_path.to_string(),
            is_git_repo: false,
            status: "not_initialized".to_string(),
            branch: None,
            remote_name: None,
            remote_url: None,
            ahead: 0,
            behind: 0,
            has_uncommitted_changes: false,
            has_untracked_files: false,
            last_commit: None,
        });
    }

    // Get current branch
    let branch = run_git_command(&["rev-parse", "--abbrev-ref", "HEAD"], Some(repo_path)).ok();

    // Get remote info
    let remote_name = run_git_command(&["remote"], Some(repo_path))
        .ok()
        .and_then(|r| r.lines().next().map(|s| s.to_string()));

    let remote_url = remote_name
        .as_ref()
        .and_then(|name| run_git_command(&["remote", "get-url", name], Some(repo_path)).ok());

    // Get ahead/behind
    let (ahead, behind) = if let Some(ref branch) = branch {
        let upstream = format!("{}@{{upstream}}", branch);
        let rev_list = run_git_command(
            &[
                "rev-list",
                "--left-right",
                "--count",
                &format!("{}...{}", branch, upstream),
            ],
            Some(repo_path),
        );

        rev_list
            .ok()
            .map(|output| {
                let parts: Vec<&str> = output.split_whitespace().collect();
                (
                    parts.first().and_then(|s| s.parse().ok()).unwrap_or(0),
                    parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0),
                )
            })
            .unwrap_or((0, 0))
    } else {
        (0, 0)
    };

    // Check for uncommitted changes
    let status_output =
        run_git_command(&["status", "--porcelain"], Some(repo_path)).unwrap_or_default();

    let has_uncommitted_changes = status_output.lines().any(|l| !l.starts_with("??"));
    let has_untracked_files = status_output.lines().any(|l| l.starts_with("??"));

    // Determine overall status - consider untracked files as dirty too
    let status = if has_uncommitted_changes || has_untracked_files {
        "dirty"
    } else if ahead > 0 && behind > 0 {
        "diverged"
    } else if ahead > 0 {
        "ahead"
    } else if behind > 0 {
        "behind"
    } else {
        "clean"
    };

    // Get last commit
    let last_commit = run_git_command(
        &["log", "-1", "--format=%H%x00%an%x00%ae%x00%aI%x00%s"],
        Some(repo_path),
    )
    .ok()
    .and_then(|output| {
        let parts: Vec<&str> = output.split('\x00').collect();
        if parts.len() >= 5 {
            Some(GitCommitInfo {
                hash: parts[0].to_string(),
                short_hash: parts[0].chars().take(7).collect(),
                author: parts[1].to_string(),
                author_email: parts[2].to_string(),
                date: parts[3].to_string(),
                message: parts[4].to_string(),
                message_body: None,
            })
        } else {
            None
        }
    });

    Ok(GitRepoInfo {
        path: repo_path.to_string(),
        is_git_repo: true,
        status: status.to_string(),
        branch,
        remote_name,
        remote_url,
        ahead,
        behind,
        has_uncommitted_changes,
        has_untracked_files,
        last_commit,
    })
}

/// Get repository status
#[tauri::command]
pub async fn git_status(repo_path: String) -> GitOperationResult<GitRepoInfo> {
    match git_status_internal(&repo_path) {
        Ok(info) => GitOperationResult::success(info),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Get full repository status in a single call
/// This combines repo info, branches, commits, file status, stash list, and remotes
/// Reduces 5+ IPC calls to 1 for better performance
#[tauri::command]
pub async fn git_full_status(
    repo_path: String,
    max_commits: Option<u32>,
) -> GitOperationResult<GitFullStatus> {
    // Get repo info
    let repo_info = git_status_internal(&repo_path).ok();

    // Only proceed if it's a git repo
    if repo_info.as_ref().map(|r| !r.is_git_repo).unwrap_or(true) {
        return GitOperationResult::success(GitFullStatus {
            repo_info,
            branches: vec![],
            commits: vec![],
            file_status: vec![],
            stash_list: vec![],
            remotes: vec![],
        });
    }

    // Get branches
    let branches = run_git_command(
        &[
            "branch",
            "-a",
            "--format=%(refname:short)%00%(upstream:short)%00%(HEAD)",
        ],
        Some(&repo_path),
    )
    .map(|output| {
        output
            .lines()
            .filter_map(|line| {
                let parts: Vec<&str> = line.split('\x00').collect();
                if parts.is_empty() || parts[0].is_empty() {
                    return None;
                }
                let raw_name = parts[0].to_string();
                let is_remote = raw_name.starts_with("remotes/");
                let name = raw_name.trim_start_matches("remotes/").to_string();
                Some(GitBranchInfo {
                    name,
                    is_remote,
                    is_current: parts.get(2).map(|s| s.trim() == "*").unwrap_or(false),
                    upstream: parts.get(1).filter(|s| !s.is_empty()).map(|s| s.to_string()),
                })
            })
            .collect()
    })
    .unwrap_or_default();

    // Get commits
    let max_count = max_commits.unwrap_or(20);
    let commits = run_git_command(
        &[
            "log",
            &format!("-{}", max_count),
            "--format=%H%x00%an%x00%ae%x00%aI%x00%s%x00%x00",
        ],
        Some(&repo_path),
    )
    .map(|output| parse_commit_log(&output))
    .unwrap_or_default();

    // Get file status
    let file_status = run_git_command(&["status", "--porcelain"], Some(&repo_path))
        .map(|output| output.lines().filter_map(parse_git_status_short).collect())
        .unwrap_or_default();

    // Get stash list
    let stash_list = run_git_command(
        &["stash", "list", "--format=%gd%x00%gs%x00%ci"],
        Some(&repo_path),
    )
    .map(|output| {
        output
            .lines()
            .filter_map(|line| {
                let parts: Vec<&str> = line.split('\x00').collect();
                if parts.len() >= 2 {
                    let index = parts[0]
                        .strip_prefix("stash@{")
                        .and_then(|s| s.strip_suffix("}"))
                        .and_then(|s| s.parse::<u32>().ok())
                        .unwrap_or(0);
                    let message = parts[1].to_string();
                    let branch = if message.starts_with("WIP on ") || message.starts_with("On ") {
                        message.split(':').next().and_then(|s| {
                            s.strip_prefix("WIP on ")
                                .or_else(|| s.strip_prefix("On "))
                                .map(|b| b.to_string())
                        })
                    } else {
                        None
                    };
                    let date = parts.get(2).map(|s| s.to_string());
                    Some(GitStashEntry {
                        index,
                        message,
                        branch,
                        date,
                    })
                } else {
                    None
                }
            })
            .collect()
    })
    .unwrap_or_default();

    // Get remotes
    let remotes = run_git_command(&["remote", "-v"], Some(&repo_path))
        .map(|output| {
            let mut remotes: Vec<GitRemoteInfo> = Vec::new();
            let mut seen = std::collections::HashSet::new();
            for line in output.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    let name = parts[0].to_string();
                    if seen.insert(name.clone()) {
                        let url = parts[1].to_string();
                        remotes.push(GitRemoteInfo {
                            name,
                            fetch_url: url.clone(),
                            push_url: url,
                        });
                    }
                }
            }
            remotes
        })
        .unwrap_or_default();

    GitOperationResult::success(GitFullStatus {
        repo_info,
        branches,
        commits,
        file_status,
        stash_list,
        remotes,
    })
}

/// Stage files
#[tauri::command]
pub async fn git_stage(repo_path: String, files: Vec<String>) -> GitOperationResult<()> {
    let mut args = vec!["add", "--"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs);

    match run_git_command(&args, Some(&repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Stage all changes
#[tauri::command]
pub async fn git_stage_all(repo_path: String) -> GitOperationResult<()> {
    match run_git_command(&["add", "-A"], Some(&repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Unstage files
#[tauri::command]
pub async fn git_unstage(repo_path: String, files: Vec<String>) -> GitOperationResult<()> {
    let mut args = vec!["reset", "HEAD", "--"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs);

    match run_git_command(&args, Some(&repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Create a commit
#[tauri::command]
pub async fn git_commit(options: GitCommitOptions) -> GitOperationResult<GitCommitInfo> {
    let mut args = vec![
        "commit".to_string(),
        "-m".to_string(),
        options.message.clone(),
    ];

    if let Some(desc) = &options.description {
        args.push("-m".to_string());
        args.push(desc.clone());
    }

    if options.amend.unwrap_or(false) {
        args.push("--amend".to_string());
    }

    if options.allow_empty.unwrap_or(false) {
        args.push("--allow-empty".to_string());
    }

    if let Some(author) = &options.author {
        if let Some(email) = &options.email {
            args.push("--author".to_string());
            args.push(format!("{} <{}>", author, email));
        }
    }

    if let Some(files) = &options.files {
        if !files.is_empty() {
            args.push("--".to_string());
            args.extend(files.iter().cloned());
        }
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match run_git_command(&args_refs, Some(&options.repo_path)) {
        Ok(output) => {
            // Get the commit info
            match run_git_command(
                &["log", "-1", "--format=%H%x00%an%x00%ae%x00%aI%x00%s"],
                Some(&options.repo_path),
            ) {
                Ok(log_output) => {
                    let parts: Vec<&str> = log_output.split('\x00').collect();
                    if parts.len() >= 5 {
                        let commit = GitCommitInfo {
                            hash: parts[0].to_string(),
                            short_hash: parts[0].chars().take(7).collect(),
                            author: parts[1].to_string(),
                            author_email: parts[2].to_string(),
                            date: parts[3].to_string(),
                            message: parts[4].to_string(),
                            message_body: None,
                        };
                        GitOperationResult::success_with_output(commit, output)
                    } else {
                        GitOperationResult::error("Failed to parse commit info".to_string())
                    }
                }
                Err(e) => GitOperationResult::error(e),
            }
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Get commit history
#[tauri::command]
pub async fn git_log(options: GitLogOptions) -> GitOperationResult<Vec<GitCommitInfo>> {
    let mut args = vec![
        "log".to_string(),
        "--format=%H%x00%an%x00%ae%x00%aI%x00%s%x00%x00".to_string(),
    ];

    if let Some(max) = options.max_count {
        args.push(format!("-{}", max));
    }

    if let Some(skip) = options.skip {
        args.push(format!("--skip={}", skip));
    }

    if let Some(since) = &options.since {
        args.push(format!("--since={}", since));
    }

    if let Some(until) = &options.until {
        args.push(format!("--until={}", until));
    }

    if let Some(author) = &options.author {
        args.push(format!("--author={}", author));
    }

    if let Some(grep) = &options.grep {
        args.push(format!("--grep={}", grep));
    }

    if let Some(path) = &options.path {
        args.push("--".to_string());
        args.push(path.clone());
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match run_git_command(&args_refs, Some(&options.repo_path)) {
        Ok(output) => {
            let commits = parse_commit_log(&output);
            GitOperationResult::success(commits)
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Get file status
#[tauri::command]
pub async fn git_file_status(repo_path: String) -> GitOperationResult<Vec<GitFileStatus>> {
    match run_git_command(&["status", "--porcelain"], Some(&repo_path)) {
        Ok(output) => {
            let statuses: Vec<GitFileStatus> =
                output.lines().filter_map(parse_git_status_short).collect();
            GitOperationResult::success(statuses)
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Get diff
#[tauri::command]
pub async fn git_diff(
    repo_path: String,
    staged: Option<bool>,
) -> GitOperationResult<Vec<GitDiffInfo>> {
    let args = if staged.unwrap_or(false) {
        vec!["diff", "--staged", "--numstat"]
    } else {
        vec!["diff", "--numstat"]
    };

    match run_git_command(&args, Some(&repo_path)) {
        Ok(output) => {
            let diffs: Vec<GitDiffInfo> = output
                .lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        Some(GitDiffInfo {
                            additions: parts[0].parse().unwrap_or(0),
                            deletions: parts[1].parse().unwrap_or(0),
                            path: parts[2..].join(" "),
                            content: None,
                        })
                    } else {
                        None
                    }
                })
                .collect();
            GitOperationResult::success(diffs)
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Get diff between refs
#[tauri::command]
pub async fn git_diff_between(
    repo_path: String,
    from_ref: String,
    to_ref: String,
) -> GitOperationResult<Vec<GitDiffInfo>> {
    match run_git_command(&["diff", "--numstat", &from_ref, &to_ref], Some(&repo_path)) {
        Ok(output) => {
            let diffs: Vec<GitDiffInfo> = output
                .lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        Some(GitDiffInfo {
                            additions: parts[0].parse().unwrap_or(0),
                            deletions: parts[1].parse().unwrap_or(0),
                            path: parts[2..].join(" "),
                            content: None,
                        })
                    } else {
                        None
                    }
                })
                .collect();
            GitOperationResult::success(diffs)
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Get diff content for a specific file
#[tauri::command]
pub async fn git_diff_file(
    repo_path: String,
    file_path: String,
    staged: Option<bool>,
    max_lines: Option<u32>,
) -> GitOperationResult<GitDiffInfo> {
    let mut args = vec!["diff"];
    
    if staged.unwrap_or(false) {
        args.push("--staged");
    }
    
    args.push("--");
    args.push(&file_path);

    match run_git_command(&args, Some(&repo_path)) {
        Ok(content) => {
            // Count additions and deletions
            let mut additions = 0;
            let mut deletions = 0;
            let mut line_count = 0;
            let max = max_lines.unwrap_or(5000) as usize;
            
            let truncated_content: String = content
                .lines()
                .take_while(|line| {
                    line_count += 1;
                    if line.starts_with('+') && !line.starts_with("+++") {
                        additions += 1;
                    } else if line.starts_with('-') && !line.starts_with("---") {
                        deletions += 1;
                    }
                    line_count <= max
                })
                .collect::<Vec<_>>()
                .join("\n");
            
            let final_content = if line_count > max {
                format!("{}\n\n... (truncated, {} more lines)", truncated_content, line_count - max)
            } else {
                truncated_content
            };
            
            GitOperationResult::success(GitDiffInfo {
                path: file_path,
                additions,
                deletions,
                content: Some(final_content),
            })
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Stash entry info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStashEntry {
    pub index: u32,
    pub message: String,
    pub branch: Option<String>,
    pub date: Option<String>,
}

/// Get stash list with parsed entries
#[tauri::command]
pub async fn git_stash_list(repo_path: String) -> GitOperationResult<Vec<GitStashEntry>> {
    match run_git_command(
        &["stash", "list", "--format=%gd%x00%gs%x00%ci"],
        Some(&repo_path),
    ) {
        Ok(output) => {
            let entries: Vec<GitStashEntry> = output
                .lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split('\x00').collect();
                    if parts.len() >= 2 {
                        // Parse stash@{N} to get index
                        let index = parts[0]
                            .strip_prefix("stash@{")
                            .and_then(|s| s.strip_suffix("}"))
                            .and_then(|s| s.parse::<u32>().ok())
                            .unwrap_or(0);
                        
                        // Parse message which may contain branch info
                        let message = parts[1].to_string();
                        let branch = if message.starts_with("WIP on ") || message.starts_with("On ") {
                            message.split(':').next().and_then(|s| {
                                s.strip_prefix("WIP on ")
                                    .or_else(|| s.strip_prefix("On "))
                                    .map(|b| b.to_string())
                            })
                        } else {
                            None
                        };
                        
                        let date = parts.get(2).map(|s| s.to_string());
                        
                        Some(GitStashEntry {
                            index,
                            message,
                            branch,
                            date,
                        })
                    } else {
                        None
                    }
                })
                .collect();
            
            GitOperationResult::success(entries)
        }
        Err(e) => {
            // Empty stash list is not an error
            if e.contains("No stash entries") || e.is_empty() {
                GitOperationResult::success(vec![])
            } else {
                GitOperationResult::error(e)
            }
        }
    }
}

/// Push to remote
#[tauri::command]
pub async fn git_push(options: GitPushOptions) -> GitOperationResult<()> {
    let mut args = vec!["push".to_string()];

    if options.force.unwrap_or(false) {
        args.push("--force".to_string());
    }

    if options.set_upstream.unwrap_or(false) {
        args.push("-u".to_string());
    }

    if options.tags.unwrap_or(false) {
        args.push("--tags".to_string());
    }

    if let Some(remote) = &options.remote {
        args.push(remote.clone());
    }

    if let Some(branch) = &options.branch {
        args.push(branch.clone());
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match run_git_command(&args_refs, Some(&options.repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Pull from remote
#[tauri::command]
pub async fn git_pull(options: GitPullOptions) -> GitOperationResult<()> {
    let mut args = vec!["pull".to_string()];

    if options.rebase.unwrap_or(false) {
        args.push("--rebase".to_string());
    }

    if options.no_commit.unwrap_or(false) {
        args.push("--no-commit".to_string());
    }

    if let Some(remote) = &options.remote {
        args.push(remote.clone());
    }

    if let Some(branch) = &options.branch {
        args.push(branch.clone());
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match run_git_command(&args_refs, Some(&options.repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Fetch from remote
#[tauri::command]
pub async fn git_fetch(repo_path: String, remote: Option<String>) -> GitOperationResult<()> {
    let mut args = vec!["fetch"];

    if let Some(ref r) = remote {
        args.push(r);
    }

    match run_git_command(&args, Some(&repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Get remotes
#[tauri::command]
pub async fn git_remotes(repo_path: String) -> GitOperationResult<Vec<GitRemoteInfo>> {
    match run_git_command(&["remote", "-v"], Some(&repo_path)) {
        Ok(output) => {
            let mut remotes: Vec<GitRemoteInfo> = Vec::new();
            let mut seen = std::collections::HashSet::new();

            for line in output.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    let name = parts[0].to_string();
                    if seen.insert(name.clone()) {
                        let url = parts[1].to_string();
                        remotes.push(GitRemoteInfo {
                            name,
                            fetch_url: url.clone(),
                            push_url: url,
                        });
                    }
                }
            }

            GitOperationResult::success(remotes)
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Add remote
#[tauri::command]
pub async fn git_add_remote(
    repo_path: String,
    name: String,
    url: String,
) -> GitOperationResult<()> {
    match run_git_command(&["remote", "add", &name, &url], Some(&repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Remove remote
#[tauri::command]
pub async fn git_remove_remote(repo_path: String, name: String) -> GitOperationResult<()> {
    match run_git_command(&["remote", "remove", &name], Some(&repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Get branches
#[tauri::command]
pub async fn git_branches(
    repo_path: String,
    include_remote: Option<bool>,
) -> GitOperationResult<Vec<GitBranchInfo>> {
    let args = if include_remote.unwrap_or(false) {
        vec![
            "branch",
            "-a",
            "--format=%(refname:short)%00%(upstream:short)%00%(HEAD)",
        ]
    } else {
        vec![
            "branch",
            "--format=%(refname:short)%00%(upstream:short)%00%(HEAD)",
        ]
    };

    match run_git_command(&args, Some(&repo_path)) {
        Ok(output) => {
            let branches: Vec<GitBranchInfo> = output
                .lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split('\x00').collect();
                    if parts.is_empty() || parts[0].is_empty() {
                        return None;
                    }

                    let raw_name = parts[0].to_string();
                    // Remote branches start with "remotes/" prefix from -a flag
                    let is_remote = raw_name.starts_with("remotes/");
                    let name = raw_name.trim_start_matches("remotes/").to_string();

                    Some(GitBranchInfo {
                        name,
                        is_remote,
                        is_current: parts.get(2).map(|s| s.trim() == "*").unwrap_or(false),
                        upstream: parts
                            .get(1)
                            .filter(|s| !s.is_empty())
                            .map(|s| s.to_string()),
                    })
                })
                .collect();

            GitOperationResult::success(branches)
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Create branch
#[tauri::command]
pub async fn git_create_branch(options: GitBranchOptions) -> GitOperationResult<()> {
    let mut args = vec!["branch", &options.name];

    if let Some(ref start) = options.start_point {
        args.push(start);
    }

    match run_git_command(&args, Some(&options.repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Delete branch
#[tauri::command]
pub async fn git_delete_branch(options: GitBranchOptions) -> GitOperationResult<()> {
    if !options.delete.unwrap_or(false) {
        log::warn!(
            "git_delete_branch called for '{}' without delete flag; refusing to proceed",
            options.name
        );
        return GitOperationResult::error(
            "Delete flag not set; refusing to delete branch".to_string(),
        );
    }

    let flag = if options.force.unwrap_or(false) {
        "-D"
    } else {
        "-d"
    };

    match run_git_command(&["branch", flag, &options.name], Some(&options.repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Checkout
#[tauri::command]
pub async fn git_checkout(options: GitCheckoutOptions) -> GitOperationResult<()> {
    let mut args = vec!["checkout".to_string()];

    if options.create_branch.unwrap_or(false) {
        args.push("-b".to_string());
    }

    if options.force.unwrap_or(false) {
        args.push("-f".to_string());
    }

    args.push(options.target);

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match run_git_command(&args_refs, Some(&options.repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Merge
#[tauri::command]
pub async fn git_merge(options: GitMergeOptions) -> GitOperationResult<()> {
    let mut args = vec!["merge".to_string()];

    if options.no_commit.unwrap_or(false) {
        args.push("--no-commit".to_string());
    }

    if options.no_ff.unwrap_or(false) {
        args.push("--no-ff".to_string());
    }

    if options.squash.unwrap_or(false) {
        args.push("--squash".to_string());
    }

    if let Some(msg) = &options.message {
        args.push("-m".to_string());
        args.push(msg.clone());
    }

    args.push(options.branch);

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match run_git_command(&args_refs, Some(&options.repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Stash
#[tauri::command]
pub async fn git_stash(options: GitStashOptions) -> GitOperationResult<()> {
    let mut args = vec!["stash".to_string()];

    match options.action.as_str() {
        "save" => {
            args.push("push".to_string());
            if options.include_untracked.unwrap_or(false) {
                args.push("-u".to_string());
            }
            if let Some(msg) = &options.message {
                args.push("-m".to_string());
                args.push(msg.clone());
            }
        }
        "pop" => {
            args.push("pop".to_string());
            if let Some(idx) = options.stash_index {
                args.push(format!("stash@{{{}}}", idx));
            }
        }
        "apply" => {
            args.push("apply".to_string());
            if let Some(idx) = options.stash_index {
                args.push(format!("stash@{{{}}}", idx));
            }
        }
        "drop" => {
            args.push("drop".to_string());
            if let Some(idx) = options.stash_index {
                args.push(format!("stash@{{{}}}", idx));
            }
        }
        "list" => {
            args.push("list".to_string());
        }
        "clear" => {
            args.push("clear".to_string());
        }
        _ => return GitOperationResult::error(format!("Unknown stash action: {}", options.action)),
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match run_git_command(&args_refs, Some(&options.repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Reset
#[tauri::command]
pub async fn git_reset(options: GitResetOptions) -> GitOperationResult<()> {
    let mut args = vec!["reset".to_string()];

    match options.mode.as_str() {
        "soft" => args.push("--soft".to_string()),
        "mixed" => args.push("--mixed".to_string()),
        "hard" => args.push("--hard".to_string()),
        _ => return GitOperationResult::error(format!("Unknown reset mode: {}", options.mode)),
    }

    if let Some(target) = &options.target {
        args.push(target.clone());
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match run_git_command(&args_refs, Some(&options.repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Discard changes
#[tauri::command]
pub async fn git_discard_changes(repo_path: String, files: Vec<String>) -> GitOperationResult<()> {
    // First, try to restore tracked files
    let mut checkout_args = vec!["checkout", "--"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    checkout_args.extend(file_refs.clone());

    match run_git_command(&checkout_args, Some(&repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => {
            // If checkout fails, try to remove untracked files
            let mut clean_args = vec!["clean", "-fd", "--"];
            clean_args.extend(file_refs);
            match run_git_command(&clean_args, Some(&repo_path)) {
                Ok(output) => GitOperationResult::ok_with_output(output),
                Err(_) => GitOperationResult::error(e), // Return original error
            }
        }
    }
}

/// Create .gitignore file
#[tauri::command]
pub async fn git_create_gitignore(repo_path: String, template: String) -> GitOperationResult<()> {
    let gitignore_path = Path::new(&repo_path).join(".gitignore");

    match std::fs::write(&gitignore_path, template) {
        Ok(_) => GitOperationResult::ok(),
        Err(e) => GitOperationResult::error(format!("Failed to create .gitignore: {}", e)),
    }
}

/// Git export options for chat/designer data
#[derive(Debug, Clone, Deserialize)]
pub struct GitExportOptions {
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub data: String,
    #[serde(rename = "commitMessage")]
    pub commit_message: Option<String>,
    /// Custom directory name (default: "chats" or "designer")
    #[serde(rename = "customDir")]
    pub custom_dir: Option<String>,
    /// File extension (default: "json")
    #[serde(rename = "fileExtension")]
    pub file_extension: Option<String>,
    /// Create a branch for this export
    #[serde(rename = "createBranch")]
    pub create_branch: Option<bool>,
    /// Branch name for export (default: "exports/{session_id}")
    #[serde(rename = "branchName")]
    pub branch_name: Option<String>,
    /// Include timestamp in filename
    #[serde(rename = "includeTimestamp")]
    pub include_timestamp: Option<bool>,
}

/// Export chat to Git with configurable options
#[tauri::command]
pub async fn git_export_chat(
    repo_path: String,
    session_id: String,
    chat_data: String,
    commit_message: Option<String>,
) -> GitOperationResult<GitCommitInfo> {
    git_export_data(GitExportOptions {
        repo_path,
        session_id,
        data: chat_data,
        commit_message,
        custom_dir: Some("chats".to_string()),
        file_extension: Some("json".to_string()),
        create_branch: None,
        branch_name: None,
        include_timestamp: None,
    })
    .await
}

/// Export data to Git with full options
#[tauri::command]
pub async fn git_export_data(options: GitExportOptions) -> GitOperationResult<GitCommitInfo> {
    let dir_name = options.custom_dir.unwrap_or_else(|| "exports".to_string());
    let extension = options.file_extension.unwrap_or_else(|| "json".to_string());

    // Create export directory if it doesn't exist
    let export_dir = Path::new(&options.repo_path).join(&dir_name);
    if !export_dir.exists() {
        if let Err(e) = std::fs::create_dir_all(&export_dir) {
            return GitOperationResult::error(format!("Failed to create {} directory: {}", dir_name, e));
        }
    }

    // Optionally create a branch for this export
    if options.create_branch.unwrap_or(false) {
        let branch_name = options
            .branch_name
            .unwrap_or_else(|| format!("exports/{}", options.session_id));
        if let Err(e) = run_git_command(&["checkout", "-b", &branch_name], Some(&options.repo_path)) {
            // Branch might already exist, try to switch to it
            if let Err(e2) = run_git_command(&["checkout", &branch_name], Some(&options.repo_path)) {
                log::warn!("Could not create/switch branch: {} / {}", e, e2);
            }
        }
    }

    // Build filename
    let filename = if options.include_timestamp.unwrap_or(false) {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        format!("{}_{}.{}", options.session_id, timestamp, extension)
    } else {
        format!("{}.{}", options.session_id, extension)
    };

    // Write data
    let file_path = export_dir.join(&filename);
    if let Err(e) = std::fs::write(&file_path, &options.data) {
        return GitOperationResult::error(format!("Failed to write file: {}", e));
    }

    // Stage the file
    let relative_path = format!("{}/{}", dir_name, filename);
    if let Err(e) = run_git_command(&["add", &relative_path], Some(&options.repo_path)) {
        return GitOperationResult::error(e);
    }

    // Commit
    let message = options
        .commit_message
        .unwrap_or_else(|| format!("Export {}: {}", dir_name, options.session_id));
    git_commit(GitCommitOptions {
        repo_path: options.repo_path,
        message,
        description: None,
        author: None,
        email: None,
        amend: None,
        allow_empty: None,
        files: None,
    })
    .await
}

/// Export designer to Git with configurable options
#[tauri::command]
pub async fn git_export_designer(
    repo_path: String,
    project_id: String,
    designer_data: String,
    commit_message: Option<String>,
) -> GitOperationResult<GitCommitInfo> {
    git_export_data(GitExportOptions {
        repo_path,
        session_id: project_id,
        data: designer_data,
        commit_message,
        custom_dir: Some("designer".to_string()),
        file_extension: Some("json".to_string()),
        create_branch: None,
        branch_name: None,
        include_timestamp: None,
    })
    .await
}

/// List all exported items in a directory
#[tauri::command]
pub async fn git_list_exports(
    repo_path: String,
    export_type: String,
) -> GitOperationResult<Vec<String>> {
    let dir_name = match export_type.as_str() {
        "chat" | "chats" => "chats",
        "designer" => "designer",
        _ => &export_type,
    };

    let export_dir = Path::new(&repo_path).join(dir_name);
    if !export_dir.exists() {
        return GitOperationResult::success(vec![]);
    }

    match std::fs::read_dir(&export_dir) {
        Ok(entries) => {
            let files: Vec<String> = entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().is_file())
                .filter_map(|e| {
                    e.path()
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .map(|s| s.to_string())
                })
                .collect();
            GitOperationResult::success(files)
        }
        Err(e) => GitOperationResult::error(format!("Failed to list exports: {}", e)),
    }
}

/// Get export history from Git log
#[tauri::command]
pub async fn git_export_history(
    repo_path: String,
    export_type: String,
    max_count: Option<u32>,
) -> GitOperationResult<Vec<GitCommitInfo>> {
    let dir_name = match export_type.as_str() {
        "chat" | "chats" => "chats",
        "designer" => "designer",
        _ => &export_type,
    };

    let count = max_count.unwrap_or(20);
    let path_arg = format!("{}/", dir_name);

    match run_git_command(
        &[
            "log",
            &format!("-{}", count),
            "--format=%H%x00%an%x00%ae%x00%aI%x00%s%x00%x00",
            "--",
            &path_arg,
        ],
        Some(&repo_path),
    ) {
        Ok(output) => GitOperationResult::success(parse_commit_log(&output)),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Restore chat from Git
#[tauri::command]
pub async fn git_restore_chat(
    repo_path: String,
    session_id: String,
    commit_hash: String,
) -> GitOperationResult<String> {
    let relative_path = format!("chats/{}.json", session_id);

    match run_git_command(
        &["show", &format!("{}:{}", commit_hash, relative_path)],
        Some(&repo_path),
    ) {
        Ok(content) => GitOperationResult::success(content),
        Err(e) => GitOperationResult::error(e),
    }
}

/// Restore designer from Git
#[tauri::command]
pub async fn git_restore_designer(
    repo_path: String,
    project_id: String,
    commit_hash: String,
) -> GitOperationResult<String> {
    let relative_path = format!("designer/{}.json", project_id);

    match run_git_command(
        &["show", &format!("{}:{}", commit_hash, relative_path)],
        Some(&repo_path),
    ) {
        Ok(content) => GitOperationResult::success(content),
        Err(e) => GitOperationResult::error(e),
    }
}
