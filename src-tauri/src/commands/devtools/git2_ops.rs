//! Git2 Operations Module
//!
//! Desktop targets use native libgit2. Mobile targets expose compatible
//! commands that return a graceful "unsupported on mobile" error.

#[cfg(not(mobile))]
#[path = "git2_ops_desktop.rs"]
mod desktop;

#[cfg(not(mobile))]
pub use desktop::*;

#[cfg(mobile)]
mod mobile {
    use serde::{Deserialize, Serialize};

    use crate::commands::devtools::git::{
        GitBranchInfo, GitCommitInfo, GitFileStatus, GitRepoInfo,
    };

    fn unsupported_error() -> String {
        "unsupported on mobile".to_string()
    }

    /// Result type kept for API compatibility.
    pub type Git2Result<T> = Result<T, Git2Error>;

    /// Git2 error type kept for API compatibility.
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Git2Error {
        pub code: i32,
        pub message: String,
        pub class: String,
    }

    impl std::fmt::Display for Git2Error {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{}", self.message)
        }
    }

    impl std::error::Error for Git2Error {}

    #[tauri::command]
    pub fn git2_is_available() -> bool {
        false
    }

    #[tauri::command]
    pub fn git2_is_repo(_path: String) -> bool {
        false
    }

    #[tauri::command]
    pub fn git2_get_status(_repo_path: String) -> Result<GitRepoInfo, String> {
        Err(unsupported_error())
    }

    #[tauri::command]
    pub fn git2_get_file_status(_repo_path: String) -> Result<Vec<GitFileStatus>, String> {
        Err(unsupported_error())
    }

    #[tauri::command]
    pub fn git2_get_branches(
        _repo_path: String,
        _include_remote: bool,
    ) -> Result<Vec<GitBranchInfo>, String> {
        Err(unsupported_error())
    }

    #[tauri::command]
    pub fn git2_stage_files(_repo_path: String, _files: Vec<String>) -> Result<(), String> {
        Err(unsupported_error())
    }

    #[tauri::command]
    pub fn git2_stage_all(_repo_path: String) -> Result<(), String> {
        Err(unsupported_error())
    }

    #[tauri::command]
    pub fn git2_create_commit(
        _repo_path: String,
        _message: String,
        _author_name: Option<String>,
        _author_email: Option<String>,
    ) -> Result<GitCommitInfo, String> {
        Err(unsupported_error())
    }

    #[tauri::command]
    pub fn git2_init_repo(_path: String, _initial_branch: Option<String>) -> Result<(), String> {
        Err(unsupported_error())
    }

    #[tauri::command]
    pub fn git2_fetch_remote(_repo_path: String, _remote_name: String) -> Result<(), String> {
        Err(unsupported_error())
    }
}

#[cfg(mobile)]
pub use mobile::*;
