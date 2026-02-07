//! Multi-VCS commands module
//!
//! Provides Tauri commands for detecting and interacting with multiple
//! version control systems: Git, Jujutsu (jj), Mercurial (hg), and Subversion (svn).
//!
//! Per agent-trace.dev specification section 6.4

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

/// Supported VCS types per agent-trace.dev spec
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VcsType {
    Git,
    Jj,
    Hg,
    Svn,
}

impl VcsType {
    pub fn as_str(&self) -> &'static str {
        match self {
            VcsType::Git => "git",
            VcsType::Jj => "jj",
            VcsType::Hg => "hg",
            VcsType::Svn => "svn",
        }
    }
}

/// VCS detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VcsInfo {
    pub vcs_type: VcsType,
    pub revision: String,
    pub branch: Option<String>,
    pub remote_url: Option<String>,
    pub repo_root: String,
}

/// VCS installation status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VcsStatus {
    pub vcs_type: VcsType,
    pub installed: bool,
    pub version: Option<String>,
}

/// VCS blame line info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VcsBlameLineInfo {
    pub line_number: u32,
    pub revision: String,
    pub author: String,
    pub date: String,
    pub content: String,
}

/// VCS operation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VcsOperationResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> VcsOperationResult<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(msg: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg),
        }
    }
}

// ==================== VCS Detection ====================

fn run_command(cmd: &str, args: &[&str], cwd: Option<&str>) -> Result<String, String> {
    let mut command = Command::new(cmd);
    command.args(args);

    if let Some(dir) = cwd {
        command.current_dir(dir);
    }

    let output = command
        .output()
        .map_err(|e| format!("Failed to execute {}: {}", cmd, e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn is_command_available(cmd: &str) -> bool {
    Command::new(cmd)
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Check if a directory is a Git repository
fn is_git_repo(path: &str) -> bool {
    Path::new(path).join(".git").exists()
        || run_command("git", &["rev-parse", "--git-dir"], Some(path)).is_ok()
}

/// Check if a directory is a Jujutsu repository
fn is_jj_repo(path: &str) -> bool {
    Path::new(path).join(".jj").exists()
}

/// Check if a directory is a Mercurial repository
fn is_hg_repo(path: &str) -> bool {
    Path::new(path).join(".hg").exists()
}

/// Check if a directory is a Subversion working copy
fn is_svn_repo(path: &str) -> bool {
    Path::new(path).join(".svn").exists()
}

/// Detect which VCS is used in a directory
#[tauri::command]
pub async fn vcs_detect(path: String) -> VcsOperationResult<VcsType> {
    // Check in order of preference
    if is_git_repo(&path) {
        return VcsOperationResult::success(VcsType::Git);
    }
    if is_jj_repo(&path) {
        return VcsOperationResult::success(VcsType::Jj);
    }
    if is_hg_repo(&path) {
        return VcsOperationResult::success(VcsType::Hg);
    }
    if is_svn_repo(&path) {
        return VcsOperationResult::success(VcsType::Svn);
    }

    VcsOperationResult::error("No VCS detected in directory".to_string())
}

/// Check if a specific VCS type is available on the system
#[tauri::command]
pub async fn vcs_is_type_available(vcs_type: VcsType) -> VcsStatus {
    let cmd = vcs_type.as_str();
    if !is_command_available(cmd) {
        return VcsStatus {
            vcs_type,
            installed: false,
            version: None,
        };
    }

    let version = match vcs_type {
        VcsType::Git => run_command("git", &["--version"], None)
            .ok()
            .map(|v| v.replace("git version ", "")),
        VcsType::Jj => run_command("jj", &["--version"], None)
            .ok()
            .map(|v| v.replace("jj ", "")),
        VcsType::Hg => run_command("hg", &["--version"], None)
            .ok()
            .and_then(|v| v.lines().next().map(|l| l.to_string())),
        VcsType::Svn => run_command("svn", &["--version", "--quiet"], None).ok(),
    };

    VcsStatus {
        vcs_type,
        installed: true,
        version,
    }
}

/// Check which VCS tools are installed
#[tauri::command]
pub async fn vcs_check_installed() -> Vec<VcsStatus> {
    let mut results = Vec::new();

    // Git - use is_command_available for quick check
    let git_installed = is_command_available(VcsType::Git.as_str());
    let git_version = if git_installed {
        run_command("git", &["--version"], None).ok()
    } else {
        None
    };
    results.push(VcsStatus {
        vcs_type: VcsType::Git,
        installed: git_installed,
        version: git_version.map(|v| v.replace("git version ", "")),
    });

    // Jujutsu - use is_command_available for quick check
    let jj_installed = is_command_available(VcsType::Jj.as_str());
    let jj_version = if jj_installed {
        run_command("jj", &["--version"], None).ok()
    } else {
        None
    };
    results.push(VcsStatus {
        vcs_type: VcsType::Jj,
        installed: jj_installed,
        version: jj_version.map(|v| v.replace("jj ", "")),
    });

    // Mercurial - use is_command_available for quick check
    let hg_installed = is_command_available(VcsType::Hg.as_str());
    let hg_version = if hg_installed {
        run_command("hg", &["--version"], None).ok()
    } else {
        None
    };
    results.push(VcsStatus {
        vcs_type: VcsType::Hg,
        installed: hg_installed,
        version: hg_version.and_then(|v| v.lines().next().map(|l| l.to_string())),
    });

    // Subversion - use is_command_available for quick check
    let svn_installed = is_command_available(VcsType::Svn.as_str());
    let svn_version = if svn_installed {
        run_command("svn", &["--version", "--quiet"], None).ok()
    } else {
        None
    };
    results.push(VcsStatus {
        vcs_type: VcsType::Svn,
        installed: svn_installed,
        version: svn_version,
    });

    results
}

// ==================== VCS Info ====================

fn get_git_info(path: &str) -> Result<VcsInfo, String> {
    let revision = run_command("git", &["rev-parse", "HEAD"], Some(path))?;
    let branch = run_command("git", &["rev-parse", "--abbrev-ref", "HEAD"], Some(path)).ok();
    let remote_url = run_command("git", &["remote", "get-url", "origin"], Some(path)).ok();
    let repo_root = run_command("git", &["rev-parse", "--show-toplevel"], Some(path))?;

    Ok(VcsInfo {
        vcs_type: VcsType::Git,
        revision,
        branch,
        remote_url,
        repo_root,
    })
}

fn get_jj_info(path: &str) -> Result<VcsInfo, String> {
    // Get current commit ID
    let revision = run_command("jj", &["log", "-r", "@", "--no-graph", "-T", "commit_id"], Some(path))?;
    // Get branch/bookmark if any
    let branch = run_command("jj", &["log", "-r", "@", "--no-graph", "-T", "bookmarks"], Some(path)).ok();
    // Jujutsu repos may be backed by Git
    let remote_url = run_command("git", &["remote", "get-url", "origin"], Some(path)).ok();
    let repo_root = run_command("jj", &["workspace", "root"], Some(path))?;

    Ok(VcsInfo {
        vcs_type: VcsType::Jj,
        revision,
        branch: branch.filter(|s| !s.is_empty()),
        remote_url,
        repo_root,
    })
}

fn get_hg_info(path: &str) -> Result<VcsInfo, String> {
    let revision = run_command("hg", &["id", "-i"], Some(path))?;
    let branch = run_command("hg", &["branch"], Some(path)).ok();
    let remote_url = run_command("hg", &["paths", "default"], Some(path)).ok();
    let repo_root = run_command("hg", &["root"], Some(path))?;

    Ok(VcsInfo {
        vcs_type: VcsType::Hg,
        revision: revision.trim_end_matches('+').to_string(),
        branch,
        remote_url,
        repo_root,
    })
}

fn get_svn_info(path: &str) -> Result<VcsInfo, String> {
    let info_output = run_command("svn", &["info"], Some(path))?;
    
    let mut revision = String::new();
    let mut remote_url = None;
    let mut repo_root = String::new();

    for line in info_output.lines() {
        if let Some(rev) = line.strip_prefix("Revision: ") {
            revision = rev.to_string();
        } else if let Some(url) = line.strip_prefix("URL: ") {
            remote_url = Some(url.to_string());
        } else if let Some(root) = line.strip_prefix("Working Copy Root Path: ") {
            repo_root = root.to_string();
        }
    }

    if revision.is_empty() {
        return Err("Failed to get SVN revision".to_string());
    }

    Ok(VcsInfo {
        vcs_type: VcsType::Svn,
        revision,
        branch: None, // SVN uses URL-based branches
        remote_url,
        repo_root,
    })
}

/// Get VCS info for a directory
#[tauri::command]
pub async fn vcs_get_info(path: String) -> VcsOperationResult<VcsInfo> {
    // Detect VCS type first
    if is_git_repo(&path) {
        match get_git_info(&path) {
            Ok(info) => return VcsOperationResult::success(info),
            Err(e) => return VcsOperationResult::error(e),
        }
    }
    if is_jj_repo(&path) {
        match get_jj_info(&path) {
            Ok(info) => return VcsOperationResult::success(info),
            Err(e) => return VcsOperationResult::error(e),
        }
    }
    if is_hg_repo(&path) {
        match get_hg_info(&path) {
            Ok(info) => return VcsOperationResult::success(info),
            Err(e) => return VcsOperationResult::error(e),
        }
    }
    if is_svn_repo(&path) {
        match get_svn_info(&path) {
            Ok(info) => return VcsOperationResult::success(info),
            Err(e) => return VcsOperationResult::error(e),
        }
    }

    VcsOperationResult::error("No VCS detected in directory".to_string())
}

// ==================== VCS Blame ====================

fn parse_git_blame_line(output: &str) -> Vec<VcsBlameLineInfo> {
    // Use existing git blame parser from git.rs
    // This is a simplified version
    let mut lines = Vec::new();
    let mut current_revision = String::new();
    let mut current_author = String::new();
    let mut current_date = String::new();
    let mut line_number: u32 = 0;

    for line in output.lines() {
        if let Some(stripped) = line.strip_prefix('\t') {
            lines.push(VcsBlameLineInfo {
                line_number,
                revision: current_revision.clone(),
                author: current_author.clone(),
                date: current_date.clone(),
                content: stripped.to_string(),
            });
        } else if let Some(rest) = line.strip_prefix("author ") {
            current_author = rest.to_string();
        } else if let Some(rest) = line.strip_prefix("author-time ") {
            if let Ok(ts) = rest.parse::<i64>() {
                current_date = chrono::DateTime::from_timestamp(ts, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_else(|| rest.to_string());
            }
        } else if line.len() >= 40 && line.chars().take(40).all(|c| c.is_ascii_hexdigit()) {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if !parts.is_empty() {
                current_revision = parts[0].to_string();
                if parts.len() >= 2 {
                    line_number = parts[1].parse().unwrap_or(0);
                }
            }
        }
    }

    lines
}

fn get_hg_blame(path: &str, file_path: &str, line_number: Option<u32>) -> Result<Vec<VcsBlameLineInfo>, String> {
    let output = run_command("hg", &["annotate", "-u", "-d", "-n", file_path], Some(path))?;
    
    let mut lines = Vec::new();
    for (idx, line) in output.lines().enumerate() {
        let line_num = (idx + 1) as u32;
        
        // Skip if we're looking for a specific line
        if let Some(target) = line_number {
            if line_num != target {
                continue;
            }
        }

        // Parse: "author date rev: content"
        let parts: Vec<&str> = line.splitn(2, ": ").collect();
        if parts.len() == 2 {
            let meta = parts[0];
            let content = parts[1].to_string();
            
            // Extract author, date, revision from meta
            let meta_parts: Vec<&str> = meta.split_whitespace().collect();
            if meta_parts.len() >= 3 {
                lines.push(VcsBlameLineInfo {
                    line_number: line_num,
                    revision: meta_parts[meta_parts.len() - 1].to_string(),
                    author: meta_parts[0].to_string(),
                    date: meta_parts[1..meta_parts.len() - 1].join(" "),
                    content,
                });
            }
        }
    }

    Ok(lines)
}

fn get_svn_blame(path: &str, file_path: &str, line_number: Option<u32>) -> Result<Vec<VcsBlameLineInfo>, String> {
    let output = run_command("svn", &["blame", "-v", file_path], Some(path))?;
    
    let mut lines = Vec::new();
    for (idx, line) in output.lines().enumerate() {
        let line_num = (idx + 1) as u32;
        
        if let Some(target) = line_number {
            if line_num != target {
                continue;
            }
        }

        // SVN blame format: "  rev author date content"
        let trimmed = line.trim_start();
        let parts: Vec<&str> = trimmed.splitn(4, char::is_whitespace).collect();
        if parts.len() >= 4 {
            lines.push(VcsBlameLineInfo {
                line_number: line_num,
                revision: parts[0].to_string(),
                author: parts[1].to_string(),
                date: parts[2].to_string(),
                content: parts[3..].join(" "),
            });
        }
    }

    Ok(lines)
}

/// Get blame info for a file (multi-VCS)
#[tauri::command]
pub async fn vcs_blame(
    repo_path: String,
    file_path: String,
    line_number: Option<u32>,
) -> VcsOperationResult<Vec<VcsBlameLineInfo>> {
    // Detect VCS and use appropriate blame command
    if is_git_repo(&repo_path) {
        let mut args = vec!["blame", "--porcelain"];
        let line_range: String;
        if let Some(line) = line_number {
            line_range = format!("-L{},{}", line, line);
            args.push(&line_range);
        }
        args.push(&file_path);

        match run_command("git", &args, Some(&repo_path)) {
            Ok(output) => {
                let lines = parse_git_blame_line(&output);
                return VcsOperationResult::success(lines);
            }
            Err(e) => return VcsOperationResult::error(e),
        }
    }

    if is_jj_repo(&repo_path) {
        // Jujutsu uses git blame under the hood for colocated repos
        let mut args = vec!["blame", "--porcelain"];
        let line_range: String;
        if let Some(line) = line_number {
            line_range = format!("-L{},{}", line, line);
            args.push(&line_range);
        }
        args.push(&file_path);

        match run_command("git", &args, Some(&repo_path)) {
            Ok(output) => {
                let lines = parse_git_blame_line(&output);
                return VcsOperationResult::success(lines);
            }
            Err(e) => return VcsOperationResult::error(e),
        }
    }

    if is_hg_repo(&repo_path) {
        match get_hg_blame(&repo_path, &file_path, line_number) {
            Ok(lines) => return VcsOperationResult::success(lines),
            Err(e) => return VcsOperationResult::error(e),
        }
    }

    if is_svn_repo(&repo_path) {
        match get_svn_blame(&repo_path, &file_path, line_number) {
            Ok(lines) => return VcsOperationResult::success(lines),
            Err(e) => return VcsOperationResult::error(e),
        }
    }

    VcsOperationResult::error("No VCS detected in directory".to_string())
}
