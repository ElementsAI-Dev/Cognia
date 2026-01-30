//! Git Operation History Module
//!
//! Tracks Git operations for undo/redo functionality.
//! Uses Git reflog and custom operation tracking.

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

/// Maximum number of operations to keep in history
const MAX_HISTORY_SIZE: usize = 50;

/// Git operation type for history tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GitOperationType {
    Commit,
    Checkout,
    Branch,
    Merge,
    Reset,
    Stash,
    Stage,
    Unstage,
    Discard,
    Pull,
    Push,
    Fetch,
}

/// A recorded Git operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitOperationRecord {
    pub id: String,
    #[serde(rename = "operationType")]
    pub operation_type: GitOperationType,
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub description: String,
    /// Commit hash before the operation (for undo)
    #[serde(rename = "beforeRef")]
    pub before_ref: Option<String>,
    /// Commit hash after the operation
    #[serde(rename = "afterRef")]
    pub after_ref: Option<String>,
    /// Whether this operation can be undone
    #[serde(rename = "canUndo")]
    pub can_undo: bool,
    /// Files affected by the operation
    #[serde(rename = "affectedFiles")]
    pub affected_files: Vec<String>,
    /// Timestamp of the operation
    pub timestamp: String,
    /// Whether this operation has been undone
    pub undone: bool,
}

impl GitOperationRecord {
    pub fn new(
        operation_type: GitOperationType,
        repo_path: &str,
        description: &str,
        before_ref: Option<String>,
        after_ref: Option<String>,
        affected_files: Vec<String>,
    ) -> Self {
        let can_undo = matches!(
            operation_type,
            GitOperationType::Commit
                | GitOperationType::Checkout
                | GitOperationType::Reset
                | GitOperationType::Stage
                | GitOperationType::Unstage
        );

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation_type,
            repo_path: repo_path.to_string(),
            description: description.to_string(),
            before_ref,
            after_ref,
            can_undo,
            affected_files,
            timestamp: chrono::Utc::now().to_rfc3339(),
            undone: false,
        }
    }
}

/// Git operation history manager
pub struct GitHistoryManager {
    /// Operations in chronological order (oldest first)
    history: VecDeque<GitOperationRecord>,
    /// Maximum history size
    max_size: usize,
}

impl GitHistoryManager {
    pub fn new() -> Self {
        Self {
            history: VecDeque::with_capacity(MAX_HISTORY_SIZE),
            max_size: MAX_HISTORY_SIZE,
        }
    }

    /// Record a new operation
    pub fn record(&mut self, record: GitOperationRecord) {
        // Remove oldest entries if at capacity
        while self.history.len() >= self.max_size {
            self.history.pop_front();
        }
        self.history.push_back(record);
    }

    /// Get operation history for a repository
    pub fn get_history(&self, repo_path: &str, limit: Option<usize>) -> Vec<GitOperationRecord> {
        let limit = limit.unwrap_or(20);
        self.history
            .iter()
            .rev()
            .filter(|r| r.repo_path == repo_path)
            .take(limit)
            .cloned()
            .collect()
    }

    /// Get a specific operation by ID
    pub fn get_operation(&self, id: &str) -> Option<&GitOperationRecord> {
        self.history.iter().find(|r| r.id == id)
    }

    /// Mark an operation as undone
    pub fn mark_undone(&mut self, id: &str) -> bool {
        if let Some(record) = self.history.iter_mut().find(|r| r.id == id) {
            record.undone = true;
            true
        } else {
            false
        }
    }

    /// Get the last undoable operation for a repository
    pub fn get_last_undoable(&self, repo_path: &str) -> Option<&GitOperationRecord> {
        self.history
            .iter()
            .rev()
            .find(|r| r.repo_path == repo_path && r.can_undo && !r.undone)
    }

    /// Clear history for a repository
    pub fn clear_history(&mut self, repo_path: &str) {
        self.history.retain(|r| r.repo_path != repo_path);
    }

    /// Get all repositories with history
    pub fn get_repositories(&self) -> Vec<String> {
        let mut repos: Vec<String> = self
            .history
            .iter()
            .map(|r| r.repo_path.clone())
            .collect();
        repos.sort();
        repos.dedup();
        repos
    }
}

impl Default for GitHistoryManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Shared history manager state
pub type HistoryManagerState = Mutex<GitHistoryManager>;

// ==================== Tauri Commands ====================

use super::git::{run_git_command, GitOperationResult};
use tauri::State;

/// Get operation history for a repository
#[tauri::command]
pub async fn git_get_history(
    state: State<'_, HistoryManagerState>,
    repo_path: String,
    limit: Option<usize>,
) -> Result<Vec<GitOperationRecord>, String> {
    let manager = state.lock();
    Ok(manager.get_history(&repo_path, limit))
}

/// Undo the last operation
#[tauri::command]
pub async fn git_undo_last(
    state: State<'_, HistoryManagerState>,
    repo_path: String,
) -> GitOperationResult<()> {
    let mut manager = state.lock();

    let operation = match manager.get_last_undoable(&repo_path) {
        Some(op) => op.clone(),
        None => return GitOperationResult::error("No undoable operation found".to_string()),
    };

    // Perform the undo based on operation type
    let result = match operation.operation_type {
        GitOperationType::Commit => {
            // Undo commit by resetting to before_ref
            if let Some(ref before) = operation.before_ref {
                run_git_command(&["reset", "--soft", before], Some(&repo_path))
            } else {
                run_git_command(&["reset", "--soft", "HEAD~1"], Some(&repo_path))
            }
        }
        GitOperationType::Stage => {
            // Unstage all affected files
            if operation.affected_files.is_empty() {
                run_git_command(&["reset", "HEAD"], Some(&repo_path))
            } else {
                let mut args = vec!["reset", "HEAD", "--"];
                for file in &operation.affected_files {
                    args.push(file.as_str());
                }
                run_git_command(&args, Some(&repo_path))
            }
        }
        GitOperationType::Unstage => {
            // Re-stage the affected files
            if operation.affected_files.is_empty() {
                return GitOperationResult::error("Cannot redo unstage: no files recorded".to_string());
            }
            let mut args = vec!["add", "--"];
            for file in &operation.affected_files {
                args.push(file.as_str());
            }
            run_git_command(&args, Some(&repo_path))
        }
        GitOperationType::Checkout => {
            // Go back to the previous branch/commit
            if let Some(ref before) = operation.before_ref {
                run_git_command(&["checkout", before], Some(&repo_path))
            } else {
                return GitOperationResult::error("Cannot undo checkout: no previous ref recorded".to_string());
            }
        }
        GitOperationType::Reset => {
            // Undo reset by going to after_ref (the original HEAD)
            if let Some(ref before) = operation.before_ref {
                run_git_command(&["reset", "--hard", before], Some(&repo_path))
            } else {
                return GitOperationResult::error("Cannot undo reset: no previous ref recorded".to_string());
            }
        }
        _ => {
            return GitOperationResult::error(format!(
                "Undo not supported for {:?}",
                operation.operation_type
            ));
        }
    };

    match result {
        Ok(output) => {
            manager.mark_undone(&operation.id);
            GitOperationResult::ok_with_output(output)
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Clear operation history for a repository
#[tauri::command]
pub async fn git_clear_history(
    state: State<'_, HistoryManagerState>,
    repo_path: String,
) -> Result<(), String> {
    let mut manager = state.lock();
    manager.clear_history(&repo_path);
    Ok(())
}

/// Get Git reflog entries
#[tauri::command]
pub async fn git_reflog(
    repo_path: String,
    max_count: Option<u32>,
) -> GitOperationResult<Vec<ReflogEntry>> {
    let count = max_count.unwrap_or(20);

    match run_git_command(
        &[
            "reflog",
            &format!("-{}", count),
            "--format=%H%x00%gd%x00%gs%x00%ci",
        ],
        Some(&repo_path),
    ) {
        Ok(output) => {
            let entries: Vec<ReflogEntry> = output
                .lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split('\x00').collect();
                    if parts.len() >= 4 {
                        Some(ReflogEntry {
                            hash: parts[0].to_string(),
                            short_hash: parts[0].chars().take(7).collect(),
                            selector: parts[1].to_string(),
                            action: parts[2].to_string(),
                            date: parts[3].to_string(),
                        })
                    } else {
                        None
                    }
                })
                .collect();
            GitOperationResult::success(entries)
        }
        Err(e) => GitOperationResult::error(e),
    }
}

/// Reflog entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflogEntry {
    pub hash: String,
    #[serde(rename = "shortHash")]
    pub short_hash: String,
    pub selector: String,
    pub action: String,
    pub date: String,
}

/// Recover to a reflog entry
#[tauri::command]
pub async fn git_recover_to_reflog(
    repo_path: String,
    selector: String,
) -> GitOperationResult<()> {
    match run_git_command(&["reset", "--hard", &selector], Some(&repo_path)) {
        Ok(output) => GitOperationResult::ok_with_output(output),
        Err(e) => GitOperationResult::error(e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_history_manager() {
        let mut manager = GitHistoryManager::new();

        let record = GitOperationRecord::new(
            GitOperationType::Commit,
            "/path/to/repo",
            "Test commit",
            Some("abc123".to_string()),
            Some("def456".to_string()),
            vec!["file.txt".to_string()],
        );

        manager.record(record);

        let history = manager.get_history("/path/to/repo", None);
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].description, "Test commit");
    }

    #[test]
    fn test_history_capacity() {
        let mut manager = GitHistoryManager::new();

        for i in 0..60 {
            let record = GitOperationRecord::new(
                GitOperationType::Commit,
                "/path/to/repo",
                &format!("Commit {}", i),
                None,
                None,
                vec![],
            );
            manager.record(record);
        }

        // Should only keep MAX_HISTORY_SIZE entries
        assert!(manager.history.len() <= MAX_HISTORY_SIZE);
    }
}
