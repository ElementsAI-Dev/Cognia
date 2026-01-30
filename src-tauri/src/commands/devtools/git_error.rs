//! Git Error Types
//!
//! Provides structured error handling for Git operations with user-friendly messages.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Categorized Git errors for better error handling and user feedback
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "details")]
pub enum GitErrorKind {
    /// Repository not found at path
    #[serde(rename = "repo_not_found")]
    RepoNotFound { path: String },

    /// Not a Git repository
    #[serde(rename = "not_a_repo")]
    NotARepo { path: String },

    /// Authentication required for remote
    #[serde(rename = "auth_required")]
    AuthRequired { remote: String },

    /// Invalid credentials provided
    #[serde(rename = "auth_failed")]
    AuthFailed { remote: String },

    /// Merge conflict detected
    #[serde(rename = "merge_conflict")]
    MergeConflict { files: Vec<String> },

    /// Network error (unreachable remote, timeout, etc.)
    #[serde(rename = "network")]
    Network { message: String },

    /// Branch not found
    #[serde(rename = "branch_not_found")]
    BranchNotFound { name: String },

    /// Branch already exists
    #[serde(rename = "branch_exists")]
    BranchExists { name: String },

    /// Cannot delete current branch
    #[serde(rename = "cannot_delete_current")]
    CannotDeleteCurrentBranch { name: String },

    /// Uncommitted changes would be overwritten
    #[serde(rename = "uncommitted_changes")]
    UncommittedChanges { files: Vec<String> },

    /// Nothing to commit
    #[serde(rename = "nothing_to_commit")]
    NothingToCommit,

    /// Remote not found
    #[serde(rename = "remote_not_found")]
    RemoteNotFound { name: String },

    /// Remote already exists
    #[serde(rename = "remote_exists")]
    RemoteExists { name: String },

    /// Invalid remote URL
    #[serde(rename = "invalid_remote_url")]
    InvalidRemoteUrl { url: String },

    /// Push rejected (non-fast-forward)
    #[serde(rename = "push_rejected")]
    PushRejected { reason: String },

    /// File not found
    #[serde(rename = "file_not_found")]
    FileNotFound { path: String },

    /// Permission denied
    #[serde(rename = "permission_denied")]
    PermissionDenied { path: String },

    /// Git not installed
    #[serde(rename = "git_not_installed")]
    GitNotInstalled,

    /// Invalid commit reference
    #[serde(rename = "invalid_ref")]
    InvalidRef { reference: String },

    /// Stash not found
    #[serde(rename = "stash_not_found")]
    StashNotFound { index: u32 },

    /// Lock file exists (another git process running)
    #[serde(rename = "lock_exists")]
    LockExists { path: String },

    /// Operation cancelled
    #[serde(rename = "cancelled")]
    Cancelled,

    /// Unknown/generic error
    #[serde(rename = "unknown")]
    Unknown { message: String },
}

/// Structured Git error with kind and message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitError {
    pub kind: GitErrorKind,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

impl GitError {
    pub fn new(kind: GitErrorKind, message: impl Into<String>) -> Self {
        let message = message.into();
        let suggestion = Self::get_suggestion(&kind);
        Self {
            kind,
            message,
            suggestion,
        }
    }

    /// Get a helpful suggestion for the error
    fn get_suggestion(kind: &GitErrorKind) -> Option<String> {
        match kind {
            GitErrorKind::AuthRequired { .. } => {
                Some("Configure SSH keys or enter credentials when prompted.".to_string())
            }
            GitErrorKind::AuthFailed { .. } => {
                Some("Check your credentials and try again.".to_string())
            }
            GitErrorKind::MergeConflict { .. } => {
                Some("Resolve conflicts manually and commit the changes.".to_string())
            }
            GitErrorKind::Network { .. } => {
                Some("Check your internet connection and try again.".to_string())
            }
            GitErrorKind::UncommittedChanges { .. } => {
                Some("Commit or stash your changes before this operation.".to_string())
            }
            GitErrorKind::NothingToCommit => {
                Some("Make some changes before committing.".to_string())
            }
            GitErrorKind::PushRejected { .. } => {
                Some("Pull the latest changes and try again, or use force push.".to_string())
            }
            GitErrorKind::GitNotInstalled => {
                Some("Install Git from https://git-scm.com/downloads".to_string())
            }
            GitErrorKind::LockExists { .. } => {
                Some("Wait for the other Git process to finish or remove the lock file.".to_string())
            }
            _ => None,
        }
    }

    /// Parse a Git CLI error message into a structured error
    pub fn from_git_stderr(stderr: &str, context: &str) -> Self {
        let stderr_lower = stderr.to_lowercase();

        // Authentication errors
        if stderr_lower.contains("authentication failed")
            || stderr_lower.contains("permission denied")
            || stderr_lower.contains("could not read username")
        {
            return Self::new(
                GitErrorKind::AuthFailed {
                    remote: context.to_string(),
                },
                stderr.to_string(),
            );
        }

        // Network errors
        if stderr_lower.contains("could not resolve host")
            || stderr_lower.contains("connection refused")
            || stderr_lower.contains("network is unreachable")
            || stderr_lower.contains("timed out")
        {
            return Self::new(
                GitErrorKind::Network {
                    message: stderr.to_string(),
                },
                stderr.to_string(),
            );
        }

        // Merge conflicts
        if stderr_lower.contains("merge conflict")
            || stderr_lower.contains("automatic merge failed")
        {
            return Self::new(
                GitErrorKind::MergeConflict { files: vec![] },
                stderr.to_string(),
            );
        }

        // Uncommitted changes
        if stderr_lower.contains("your local changes would be overwritten")
            || stderr_lower.contains("please commit or stash")
        {
            return Self::new(
                GitErrorKind::UncommittedChanges { files: vec![] },
                stderr.to_string(),
            );
        }

        // Push rejected
        if stderr_lower.contains("rejected")
            || stderr_lower.contains("non-fast-forward")
            || stderr_lower.contains("failed to push")
        {
            return Self::new(
                GitErrorKind::PushRejected {
                    reason: stderr.to_string(),
                },
                stderr.to_string(),
            );
        }

        // Nothing to commit
        if stderr_lower.contains("nothing to commit")
            || stderr_lower.contains("no changes added")
        {
            return Self::new(GitErrorKind::NothingToCommit, stderr.to_string());
        }

        // Lock file
        if stderr_lower.contains("lock file") || stderr_lower.contains("index.lock") {
            return Self::new(
                GitErrorKind::LockExists {
                    path: context.to_string(),
                },
                stderr.to_string(),
            );
        }

        // Branch not found
        if stderr_lower.contains("pathspec") && stderr_lower.contains("did not match") {
            return Self::new(
                GitErrorKind::BranchNotFound {
                    name: context.to_string(),
                },
                stderr.to_string(),
            );
        }

        // Branch already exists
        if stderr_lower.contains("already exists") {
            return Self::new(
                GitErrorKind::BranchExists {
                    name: context.to_string(),
                },
                stderr.to_string(),
            );
        }

        // Not a repo
        if stderr_lower.contains("not a git repository") {
            return Self::new(
                GitErrorKind::NotARepo {
                    path: context.to_string(),
                },
                stderr.to_string(),
            );
        }

        // Default to unknown
        Self::new(
            GitErrorKind::Unknown {
                message: stderr.to_string(),
            },
            stderr.to_string(),
        )
    }
}

impl fmt::Display for GitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for GitError {}

/// Convert a string error to GitError
impl From<String> for GitError {
    fn from(s: String) -> Self {
        GitError::from_git_stderr(&s, "")
    }
}

impl From<&str> for GitError {
    fn from(s: &str) -> Self {
        GitError::from_git_stderr(s, "")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_auth_error() {
        let stderr = "fatal: Authentication failed for 'https://github.com/user/repo.git'";
        let error = GitError::from_git_stderr(stderr, "origin");
        assert!(matches!(error.kind, GitErrorKind::AuthFailed { .. }));
    }

    #[test]
    fn test_parse_network_error() {
        let stderr = "fatal: unable to access: Could not resolve host: github.com";
        let error = GitError::from_git_stderr(stderr, "origin");
        assert!(matches!(error.kind, GitErrorKind::Network { .. }));
    }

    #[test]
    fn test_parse_merge_conflict() {
        let stderr = "CONFLICT (content): Merge conflict in file.txt";
        let error = GitError::from_git_stderr(stderr, "");
        assert!(matches!(error.kind, GitErrorKind::MergeConflict { .. }));
    }

    #[test]
    fn test_parse_push_rejected() {
        let stderr = "! [rejected]        main -> main (non-fast-forward)";
        let error = GitError::from_git_stderr(stderr, "origin/main");
        assert!(matches!(error.kind, GitErrorKind::PushRejected { .. }));
    }
}
