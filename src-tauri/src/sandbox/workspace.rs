//! Sandbox workspace utilities.
//!
//! Centralizes execution workdir lifecycle and file writing security checks.

use std::path::{Component, Path, PathBuf};

use super::languages::LanguageConfig;
use super::runtime::{ExecutionRequest, SandboxError};

/// A prepared workspace for one execution.
///
/// Keeps temporary directories alive for the execution lifetime when no persistent
/// workspace root is configured.
pub struct SandboxWorkspace {
    path: PathBuf,
    _temp_dir: Option<tempfile::TempDir>,
}

impl SandboxWorkspace {
    pub fn path(&self) -> &Path {
        &self.path
    }
}

fn sanitize_execution_id(execution_id: &str) -> String {
    let cleaned = execution_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(16)
        .collect::<String>()
        .to_lowercase();
    if cleaned.is_empty() {
        "run".to_string()
    } else {
        cleaned
    }
}

/// Validate an additional file path and normalize it to a safe relative path.
fn sanitize_relative_file_path(file_name: &str) -> Result<PathBuf, SandboxError> {
    let raw = file_name.trim();
    if raw.is_empty() {
        return Err(SandboxError::SecurityViolation(
            "additional file path cannot be empty".to_string(),
        ));
    }

    let path = Path::new(raw);
    if path.is_absolute() {
        return Err(SandboxError::SecurityViolation(format!(
            "absolute paths are not allowed in additional files: {}",
            raw
        )));
    }

    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(segment) => normalized.push(segment),
            Component::CurDir => {}
            Component::ParentDir => {
                return Err(SandboxError::SecurityViolation(format!(
                    "parent directory traversal is not allowed in additional files: {}",
                    raw
                )))
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(SandboxError::SecurityViolation(format!(
                    "rooted or prefixed paths are not allowed in additional files: {}",
                    raw
                )))
            }
        }
    }

    if normalized.as_os_str().is_empty() {
        return Err(SandboxError::SecurityViolation(format!(
            "invalid additional file path: {}",
            raw
        )));
    }

    Ok(normalized)
}

/// Create the execution workspace directory.
///
/// When `workspace_root` is set, each execution gets a dedicated child folder there.
/// Otherwise a temporary directory is created and removed automatically.
pub async fn create_workspace(
    workspace_root: Option<&Path>,
    execution_id: &str,
) -> Result<SandboxWorkspace, SandboxError> {
    if let Some(root) = workspace_root {
        tokio::fs::create_dir_all(root).await?;
        let dir_name = format!(
            "exec-{}-{}",
            sanitize_execution_id(execution_id),
            uuid::Uuid::new_v4().simple()
        );
        let path = root.join(dir_name);
        tokio::fs::create_dir_all(&path).await?;
        return Ok(SandboxWorkspace {
            path,
            _temp_dir: None,
        });
    }

    let temp_dir = tempfile::Builder::new()
        .prefix("cognia-sandbox-")
        .tempdir()?;
    let path = temp_dir.path().to_path_buf();
    Ok(SandboxWorkspace {
        path,
        _temp_dir: Some(temp_dir),
    })
}

/// Write the primary code file and optional additional files to the workspace.
pub async fn write_execution_files(
    workspace: &Path,
    request: &ExecutionRequest,
    language_config: &LanguageConfig,
) -> Result<PathBuf, SandboxError> {
    let code_path = workspace.join(language_config.file_name);
    if let Some(parent) = code_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    tokio::fs::write(&code_path, &request.code).await?;

    for (name, content) in &request.files {
        let safe_relative = sanitize_relative_file_path(name)?;
        let file_path = workspace.join(&safe_relative);
        if let Some(parent) = file_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(&file_path, content).await?;
    }

    Ok(code_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_relative_file_path_accepts_nested_relative() {
        let path = sanitize_relative_file_path("dir/data.txt").expect("path should be valid");
        assert_eq!(path, PathBuf::from("dir").join("data.txt"));
    }

    #[test]
    fn test_sanitize_relative_file_path_rejects_parent_dir() {
        let err = sanitize_relative_file_path("../escape.txt").expect_err("must reject parent dir");
        assert!(err.to_string().contains("traversal"));
    }

    #[test]
    fn test_sanitize_relative_file_path_rejects_absolute() {
        let err = sanitize_relative_file_path("/abs.txt").expect_err("must reject absolute");
        assert!(err.to_string().contains("absolute"));
    }
}

