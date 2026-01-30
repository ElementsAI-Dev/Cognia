//! Git2 Operations Module
//!
//! Native Git operations using libgit2 for improved performance.
//! This module provides an alternative to CLI-based Git operations.

use git2::{
    BranchType, Cred, CredentialType, FetchOptions, PushOptions, RemoteCallbacks, Repository,
    Signature, StatusOptions,
};
use serde::{Deserialize, Serialize};
use std::path::Path;

use super::git::{GitBranchInfo, GitCommitInfo, GitFileStatus, GitRepoInfo};

/// Result type for git2 operations
pub type Git2Result<T> = Result<T, Git2Error>;

/// Git2 error type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Git2Error {
    pub code: i32,
    pub message: String,
    pub class: String,
}

impl From<git2::Error> for Git2Error {
    fn from(e: git2::Error) -> Self {
        Self {
            code: e.code() as i32,
            message: e.message().to_string(),
            class: format!("{:?}", e.class()),
        }
    }
}

impl std::fmt::Display for Git2Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for Git2Error {}

/// Open a repository at the given path
pub fn open_repo(path: &str) -> Git2Result<Repository> {
    Repository::open(path).map_err(Git2Error::from)
}

/// Check if a path is a Git repository
pub fn is_git_repo(path: &str) -> bool {
    Repository::open(path).is_ok()
}

/// Get repository status using git2
pub fn get_status(repo_path: &str) -> Git2Result<GitRepoInfo> {
    let repo = open_repo(repo_path)?;

    // Get current branch
    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()));

    // Get remote info
    let (remote_name, remote_url) = repo
        .find_remote("origin")
        .ok()
        .map(|r| {
            (
                Some("origin".to_string()),
                r.url().map(|u| u.to_string()),
            )
        })
        .unwrap_or((None, None));

    // Check for uncommitted changes
    let mut status_opts = StatusOptions::new();
    status_opts.include_untracked(true);
    let statuses = repo.statuses(Some(&mut status_opts))?;

    let has_uncommitted_changes = statuses.iter().any(|s| {
        let status = s.status();
        status.is_index_new()
            || status.is_index_modified()
            || status.is_index_deleted()
            || status.is_wt_modified()
            || status.is_wt_deleted()
    });

    let has_untracked_files = statuses.iter().any(|s| s.status().is_wt_new());

    // Get ahead/behind counts
    let (ahead, behind) = if let Some(ref branch_name) = branch {
        get_ahead_behind(&repo, branch_name).unwrap_or((0, 0))
    } else {
        (0, 0)
    };

    // Get last commit
    let last_commit = repo
        .head()
        .ok()
        .and_then(|h| h.peel_to_commit().ok())
        .map(|c| GitCommitInfo {
            hash: c.id().to_string(),
            short_hash: c.id().to_string().chars().take(7).collect(),
            author: c.author().name().unwrap_or("Unknown").to_string(),
            author_email: c.author().email().unwrap_or("").to_string(),
            date: chrono::DateTime::from_timestamp(c.time().seconds(), 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
            message: c.summary().unwrap_or("").to_string(),
            message_body: c.body().map(|s| s.to_string()),
        });

    // Determine status
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

    Ok(GitRepoInfo {
        path: repo_path.to_string(),
        is_git_repo: true,
        status: status.to_string(),
        branch,
        remote_name,
        remote_url,
        ahead: ahead as i32,
        behind: behind as i32,
        has_uncommitted_changes,
        has_untracked_files,
        last_commit,
    })
}

/// Get ahead/behind counts for a branch
fn get_ahead_behind(repo: &Repository, branch_name: &str) -> Git2Result<(usize, usize)> {
    let local = repo.revparse_single(&format!("refs/heads/{}", branch_name))?;
    let upstream = repo.revparse_single(&format!("refs/remotes/origin/{}", branch_name))?;

    let (ahead, behind) = repo.graph_ahead_behind(local.id(), upstream.id())?;
    Ok((ahead, behind))
}

/// Get file status using git2
pub fn get_file_status(repo_path: &str) -> Git2Result<Vec<GitFileStatus>> {
    let repo = open_repo(repo_path)?;

    let mut status_opts = StatusOptions::new();
    status_opts.include_untracked(true);
    status_opts.recurse_untracked_dirs(true);

    let statuses = repo.statuses(Some(&mut status_opts))?;

    let file_statuses: Vec<GitFileStatus> = statuses
        .iter()
        .map(|entry| {
            let status = entry.status();
            let path = entry.path().unwrap_or("").to_string();

            let (status_str, staged) = if status.is_index_new() {
                ("added", true)
            } else if status.is_index_modified() {
                ("modified", true)
            } else if status.is_index_deleted() {
                ("deleted", true)
            } else if status.is_index_renamed() {
                ("renamed", true)
            } else if status.is_wt_new() {
                ("untracked", false)
            } else if status.is_wt_modified() {
                ("modified", false)
            } else if status.is_wt_deleted() {
                ("deleted", false)
            } else if status.is_ignored() {
                ("ignored", false)
            } else {
                ("unknown", false)
            };

            GitFileStatus {
                path,
                status: status_str.to_string(),
                staged,
                old_path: None,
            }
        })
        .collect();

    Ok(file_statuses)
}

/// Get branches using git2
pub fn get_branches(repo_path: &str, include_remote: bool) -> Git2Result<Vec<GitBranchInfo>> {
    let repo = open_repo(repo_path)?;

    let mut branches = Vec::new();

    // Get local branches
    for branch_result in repo.branches(Some(BranchType::Local))? {
        let (branch, _) = branch_result?;
        let name = branch.name()?.unwrap_or("").to_string();
        let is_current = branch.is_head();
        let upstream = branch
            .upstream()
            .ok()
            .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));

        branches.push(GitBranchInfo {
            name,
            is_remote: false,
            is_current,
            upstream,
        });
    }

    // Get remote branches if requested
    if include_remote {
        for branch_result in repo.branches(Some(BranchType::Remote))? {
            let (branch, _) = branch_result?;
            let name = branch.name()?.unwrap_or("").to_string();

            branches.push(GitBranchInfo {
                name,
                is_remote: true,
                is_current: false,
                upstream: None,
            });
        }
    }

    Ok(branches)
}

/// Stage files using git2
pub fn stage_files(repo_path: &str, files: &[String]) -> Git2Result<()> {
    let repo = open_repo(repo_path)?;
    let mut index = repo.index()?;

    for file in files {
        index.add_path(Path::new(file))?;
    }

    index.write()?;
    Ok(())
}

/// Stage all files using git2
pub fn stage_all(repo_path: &str) -> Git2Result<()> {
    let repo = open_repo(repo_path)?;
    let mut index = repo.index()?;

    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;
    Ok(())
}

/// Create a commit using git2
pub fn create_commit(
    repo_path: &str,
    message: &str,
    author_name: Option<&str>,
    author_email: Option<&str>,
) -> Git2Result<GitCommitInfo> {
    let repo = open_repo(repo_path)?;

    // Get the signature
    let sig = if let (Some(name), Some(email)) = (author_name, author_email) {
        Signature::now(name, email)?
    } else {
        repo.signature()?
    };

    // Get the index and write tree
    let mut index = repo.index()?;
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    // Get parent commit
    let parent = repo.head().ok().and_then(|h| h.peel_to_commit().ok());

    // Create the commit
    let parents: Vec<_> = parent.iter().collect();
    let commit_id = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parents)?;

    // Get commit info
    let commit = repo.find_commit(commit_id)?;

    Ok(GitCommitInfo {
        hash: commit.id().to_string(),
        short_hash: commit.id().to_string().chars().take(7).collect(),
        author: sig.name().unwrap_or("Unknown").to_string(),
        author_email: sig.email().unwrap_or("").to_string(),
        date: chrono::DateTime::from_timestamp(commit.time().seconds(), 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default(),
        message: message.to_string(),
        message_body: None,
    })
}

/// Initialize a new repository using git2
pub fn init_repo(path: &str, initial_branch: Option<&str>) -> Git2Result<()> {
    let repo = Repository::init(path)?;

    // Set initial branch if specified
    if let Some(branch_name) = initial_branch {
        // Create an empty initial commit to establish the branch
        let sig = repo.signature().unwrap_or_else(|_| {
            Signature::now("Cognia", "cognia@local").expect("Failed to create signature")
        });

        let tree_id = {
            let mut index = repo.index()?;
            index.write_tree()?
        };

        let tree = repo.find_tree(tree_id)?;
        repo.commit(
            Some(&format!("refs/heads/{}", branch_name)),
            &sig,
            &sig,
            "Initial commit",
            &tree,
            &[],
        )?;

        // Set HEAD to point to the new branch
        repo.set_head(&format!("refs/heads/{}", branch_name))?;
    }

    Ok(())
}

/// Create remote callbacks with optional credentials
fn create_callbacks<'a>() -> RemoteCallbacks<'a> {
    let mut callbacks = RemoteCallbacks::new();

    callbacks.credentials(|_url, username_from_url, allowed_types| {
        // Try SSH agent first
        if allowed_types.contains(CredentialType::SSH_KEY) {
            if let Some(username) = username_from_url {
                if let Ok(cred) = Cred::ssh_key_from_agent(username) {
                    return Ok(cred);
                }
            }
        }

        // Try default credentials
        if allowed_types.contains(CredentialType::DEFAULT) {
            return Cred::default();
        }

        Err(git2::Error::from_str("No credentials available"))
    });

    callbacks
}

/// Fetch from remote using git2
pub fn fetch_remote(repo_path: &str, remote_name: &str) -> Git2Result<()> {
    let repo = open_repo(repo_path)?;
    let mut remote = repo.find_remote(remote_name)?;

    let callbacks = create_callbacks();
    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    remote.fetch(&[] as &[&str], Some(&mut fetch_opts), None)?;
    Ok(())
}

/// Check if git2 is available (always true when compiled with git2)
pub fn is_git2_available() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_git2_available() {
        assert!(is_git2_available());
    }
}
