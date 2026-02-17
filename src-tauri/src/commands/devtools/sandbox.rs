//! Sandbox Tauri commands
//!
//! Exposes sandbox functionality to the frontend.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

use crate::sandbox::{
    CodeSnippet, ExecutionFilter, ExecutionRecord, ExecutionRequest, ExecutionResult,
    ExecutionSession, Language, LanguageStats, RuntimeType, SandboxConfig, SandboxState,
    SandboxStats, SnippetFilter,
};
use chrono::{DateTime, Utc};

/// Execution request from frontend
#[derive(Debug, Deserialize)]
pub struct ExecuteCodeRequest {
    /// Programming language
    pub language: String,
    /// Source code
    pub code: String,
    /// Standard input (optional)
    pub stdin: Option<String>,
    /// Command line arguments
    #[serde(default)]
    pub args: Vec<String>,
    /// Environment variables
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// Timeout in seconds
    pub timeout_secs: Option<u64>,
    /// Memory limit in MB
    pub memory_limit_mb: Option<u64>,
    /// Preferred runtime
    pub runtime: Option<RuntimeType>,
    /// Additional files
    #[serde(default)]
    pub files: HashMap<String, String>,
    /// Network access
    pub network_enabled: Option<bool>,
}

/// Runtime status
#[derive(Debug, Serialize)]
pub struct RuntimeStatus {
    pub runtime_type: RuntimeType,
    pub available: bool,
    pub version: Option<String>,
}

/// Sandbox status response
#[derive(Debug, Serialize)]
pub struct SandboxStatus {
    pub available_runtimes: Vec<RuntimeStatus>,
    pub supported_languages: Vec<Language>,
    pub config: SandboxConfig,
}

/// Execute code in sandbox
#[tauri::command]
pub async fn sandbox_execute(
    request: ExecuteCodeRequest,
    state: State<'_, SandboxState>,
) -> Result<ExecutionResult, String> {
    let exec_request = ExecutionRequest {
        id: uuid::Uuid::new_v4().to_string(),
        language: request.language,
        code: request.code,
        stdin: request.stdin,
        args: request.args,
        env: request.env,
        timeout_secs: request.timeout_secs,
        memory_limit_mb: request.memory_limit_mb,
        cpu_limit_percent: None,
        runtime: request.runtime,
        files: request.files,
        network_enabled: request.network_enabled,
    };

    state.execute(exec_request).await.map_err(|e| e.to_string())
}

/// Get sandbox status
#[tauri::command]
pub async fn sandbox_get_status(state: State<'_, SandboxState>) -> Result<SandboxStatus, String> {
    let available = state.get_available_runtimes().await;
    let languages = state.get_supported_languages().await;
    let config = state.config.read().await.clone();

    let mut runtime_statuses = Vec::new();

    for rt in [
        RuntimeType::Docker,
        RuntimeType::Podman,
        RuntimeType::Native,
    ] {
        runtime_statuses.push(RuntimeStatus {
            runtime_type: rt,
            available: available.contains(&rt),
            version: None, // Would need to query each runtime
        });
    }

    Ok(SandboxStatus {
        available_runtimes: runtime_statuses,
        supported_languages: languages,
        config,
    })
}

/// Get all supported languages
#[tauri::command]
pub async fn sandbox_get_all_languages(
    state: State<'_, SandboxState>,
) -> Result<Vec<Language>, String> {
    Ok(state.get_all_languages().await)
}

/// Get languages available for native execution
#[tauri::command]
pub async fn sandbox_get_available_languages(
    state: State<'_, SandboxState>,
) -> Result<Vec<String>, String> {
    Ok(state.get_available_languages().await)
}

/// Get sandbox configuration
#[tauri::command]
pub async fn sandbox_get_config(state: State<'_, SandboxState>) -> Result<SandboxConfig, String> {
    Ok(state.config.read().await.clone())
}

/// Update sandbox configuration
#[tauri::command]
pub async fn sandbox_update_config(
    config: SandboxConfig,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state.update_config(config).await.map_err(|e| e.to_string())
}

/// Get available runtimes
#[tauri::command]
pub async fn sandbox_get_runtimes(
    state: State<'_, SandboxState>,
) -> Result<Vec<RuntimeType>, String> {
    Ok(state.get_available_runtimes().await)
}

/// Get supported languages
#[tauri::command]
pub async fn sandbox_get_languages(
    state: State<'_, SandboxState>,
) -> Result<Vec<Language>, String> {
    Ok(state.get_supported_languages().await)
}

/// Check if a specific runtime is available
#[tauri::command]
pub async fn sandbox_check_runtime(
    runtime: RuntimeType,
    state: State<'_, SandboxState>,
) -> Result<bool, String> {
    Ok(state.is_runtime_available(runtime).await)
}

/// Prepare/pull image for a language (container runtimes)
#[tauri::command]
pub async fn sandbox_prepare_language(
    language: String,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .prepare_language(&language)
        .await
        .map_err(|e| e.to_string())
}

/// Quick execute - simplified execution for common use cases
#[tauri::command]
pub async fn sandbox_quick_execute(
    language: String,
    code: String,
    state: State<'_, SandboxState>,
) -> Result<ExecutionResult, String> {
    let request = ExecutionRequest::new(language, code);
    state.execute(request).await.map_err(|e| e.to_string())
}

/// Execute with stdin
#[tauri::command]
pub async fn sandbox_execute_with_stdin(
    language: String,
    code: String,
    stdin: String,
    state: State<'_, SandboxState>,
) -> Result<ExecutionResult, String> {
    let request = ExecutionRequest::new(language, code).with_stdin(stdin);
    state.execute(request).await.map_err(|e| e.to_string())
}

/// Toggle a language enabled/disabled
#[tauri::command]
pub async fn sandbox_toggle_language(
    language: String,
    enabled: bool,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .patch_config(|config| {
            if enabled {
                if !config.enabled_languages.contains(&language) {
                    config.enabled_languages.push(language.clone());
                }
            } else {
                config.enabled_languages.retain(|l| l != &language);
            }
        })
        .await
        .map_err(|e| e.to_string())
}

/// Set preferred runtime
#[tauri::command]
pub async fn sandbox_set_runtime(
    runtime: RuntimeType,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .patch_config(|config| {
            config.preferred_runtime = runtime;
        })
        .await
        .map_err(|e| e.to_string())
}

/// Set default timeout
#[tauri::command]
pub async fn sandbox_set_timeout(
    timeout_secs: u64,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .patch_config(|config| {
            config.default_timeout_secs = timeout_secs;
        })
        .await
        .map_err(|e| e.to_string())
}

/// Set memory limit
#[tauri::command]
pub async fn sandbox_set_memory_limit(
    memory_mb: u64,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .patch_config(|config| {
            config.default_memory_limit_mb = memory_mb;
        })
        .await
        .map_err(|e| e.to_string())
}

/// Set network access
#[tauri::command]
pub async fn sandbox_set_network(
    enabled: bool,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .patch_config(|config| {
            config.network_enabled = enabled;
        })
        .await
        .map_err(|e| e.to_string())
}

/// Get runtime version information
#[tauri::command]
pub async fn sandbox_get_runtime_info(
    runtime: RuntimeType,
    state: State<'_, SandboxState>,
) -> Result<Option<(RuntimeType, String)>, String> {
    Ok(state.get_runtime_info(runtime).await)
}

/// Cleanup all runtimes (containers, temp files)
#[tauri::command]
pub async fn sandbox_cleanup(state: State<'_, SandboxState>) -> Result<(), String> {
    state.cleanup_all().await.map_err(|e| e.to_string())
}

/// Execute with specific timeout and memory limits
#[tauri::command]
pub async fn sandbox_execute_with_limits(
    language: String,
    code: String,
    timeout_secs: u64,
    memory_mb: u64,
    state: State<'_, SandboxState>,
) -> Result<ExecutionResult, String> {
    state
        .execute_with_limits(language, code, timeout_secs, memory_mb)
        .await
        .map_err(|e| e.to_string())
}

// ==================== Session Commands ====================

/// Start a new execution session
#[tauri::command]
pub async fn sandbox_start_session(
    name: String,
    description: Option<String>,
    state: State<'_, SandboxState>,
) -> Result<ExecutionSession, String> {
    state
        .start_session(&name, description.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Get current session ID
#[tauri::command]
pub async fn sandbox_get_current_session(
    state: State<'_, SandboxState>,
) -> Result<Option<String>, String> {
    Ok(state.get_current_session().await)
}

/// Set current session
#[tauri::command]
pub async fn sandbox_set_current_session(
    session_id: Option<String>,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state.set_current_session(session_id).await;
    Ok(())
}

/// End current session
#[tauri::command]
pub async fn sandbox_end_session(state: State<'_, SandboxState>) -> Result<(), String> {
    state.end_session().await.map_err(|e| e.to_string())
}

/// List all sessions
#[tauri::command]
pub async fn sandbox_list_sessions(
    active_only: bool,
    state: State<'_, SandboxState>,
) -> Result<Vec<ExecutionSession>, String> {
    state
        .list_sessions(active_only)
        .await
        .map_err(|e| e.to_string())
}

/// Get session by ID
#[tauri::command]
pub async fn sandbox_get_session(
    id: String,
    state: State<'_, SandboxState>,
) -> Result<Option<ExecutionSession>, String> {
    state.get_session(&id).await.map_err(|e| e.to_string())
}

/// Delete a session
#[tauri::command]
pub async fn sandbox_delete_session(
    id: String,
    delete_executions: bool,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .delete_session(&id, delete_executions)
        .await
        .map_err(|e| e.to_string())
}

// ==================== Execution History Commands ====================

/// Get execution by ID
#[tauri::command]
pub async fn sandbox_get_execution(
    id: String,
    state: State<'_, SandboxState>,
) -> Result<Option<ExecutionRecord>, String> {
    state.get_execution(&id).await.map_err(|e| e.to_string())
}

/// Query executions with filter
#[tauri::command]
pub async fn sandbox_query_executions(
    filter: ExecutionFilter,
    state: State<'_, SandboxState>,
) -> Result<Vec<ExecutionRecord>, String> {
    state
        .query_executions(&filter)
        .await
        .map_err(|e| e.to_string())
}

/// Get recent executions
#[tauri::command]
pub async fn sandbox_get_recent_executions(
    limit: u32,
    state: State<'_, SandboxState>,
) -> Result<Vec<ExecutionRecord>, String> {
    state
        .get_recent_executions(limit)
        .await
        .map_err(|e| e.to_string())
}

/// Delete an execution
#[tauri::command]
pub async fn sandbox_delete_execution(
    id: String,
    state: State<'_, SandboxState>,
) -> Result<bool, String> {
    state.delete_execution(&id).await.map_err(|e| e.to_string())
}

/// Toggle execution favorite status
#[tauri::command]
pub async fn sandbox_toggle_favorite(
    id: String,
    state: State<'_, SandboxState>,
) -> Result<bool, String> {
    state
        .toggle_execution_favorite(&id)
        .await
        .map_err(|e| e.to_string())
}

/// Add tags to an execution
#[tauri::command]
pub async fn sandbox_add_execution_tags(
    id: String,
    tags: Vec<String>,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .add_execution_tags(&id, &tags)
        .await
        .map_err(|e| e.to_string())
}

/// Remove tags from an execution
#[tauri::command]
pub async fn sandbox_remove_execution_tags(
    id: String,
    tags: Vec<String>,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .remove_execution_tags(&id, &tags)
        .await
        .map_err(|e| e.to_string())
}

/// Clear execution history
#[tauri::command]
pub async fn sandbox_clear_history(
    before_date: Option<String>,
    state: State<'_, SandboxState>,
) -> Result<u64, String> {
    let date = before_date
        .map(|s| DateTime::parse_from_rfc3339(&s).map(|dt| dt.with_timezone(&Utc)))
        .transpose()
        .map_err(|e| format!("Invalid date format: {}", e))?;

    state
        .clear_execution_history(date)
        .await
        .map_err(|e| e.to_string())
}

// ==================== Code Snippet Commands ====================

/// Create snippet request
#[derive(Debug, Deserialize)]
pub struct CreateSnippetRequest {
    pub title: String,
    pub description: Option<String>,
    pub language: String,
    pub code: String,
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub is_template: bool,
}

/// Create a new code snippet
#[tauri::command]
pub async fn sandbox_create_snippet(
    request: CreateSnippetRequest,
    state: State<'_, SandboxState>,
) -> Result<CodeSnippet, String> {
    let now = Utc::now();
    let snippet = CodeSnippet {
        id: uuid::Uuid::new_v4().to_string(),
        title: request.title,
        description: request.description,
        language: request.language,
        code: request.code,
        tags: request.tags,
        category: request.category,
        is_template: request.is_template,
        usage_count: 0,
        created_at: now,
        updated_at: now,
    };

    state
        .create_snippet(&snippet)
        .await
        .map_err(|e| e.to_string())
}

/// Get snippet by ID
#[tauri::command]
pub async fn sandbox_get_snippet(
    id: String,
    state: State<'_, SandboxState>,
) -> Result<Option<CodeSnippet>, String> {
    state.get_snippet(&id).await.map_err(|e| e.to_string())
}

/// Query snippets with filter
#[tauri::command]
pub async fn sandbox_query_snippets(
    filter: SnippetFilter,
    state: State<'_, SandboxState>,
) -> Result<Vec<CodeSnippet>, String> {
    state
        .query_snippets(&filter)
        .await
        .map_err(|e| e.to_string())
}

/// Update a snippet
#[tauri::command]
pub async fn sandbox_update_snippet(
    snippet: CodeSnippet,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .update_snippet(&snippet)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a snippet
#[tauri::command]
pub async fn sandbox_delete_snippet(
    id: String,
    state: State<'_, SandboxState>,
) -> Result<bool, String> {
    state.delete_snippet(&id).await.map_err(|e| e.to_string())
}

/// Create snippet from execution
#[tauri::command]
pub async fn sandbox_create_snippet_from_execution(
    execution_id: String,
    title: String,
    description: Option<String>,
    category: Option<String>,
    is_template: bool,
    state: State<'_, SandboxState>,
) -> Result<CodeSnippet, String> {
    state
        .create_snippet_from_execution(
            &execution_id,
            &title,
            description.as_deref(),
            category.as_deref(),
            is_template,
        )
        .await
        .map_err(|e| e.to_string())
}

/// Execute a snippet
#[tauri::command]
pub async fn sandbox_execute_snippet(
    id: String,
    state: State<'_, SandboxState>,
) -> Result<ExecutionResult, String> {
    state.execute_snippet(&id).await.map_err(|e| e.to_string())
}

// ==================== Statistics Commands ====================

/// Get language statistics
#[tauri::command]
pub async fn sandbox_get_language_stats(
    language: String,
    state: State<'_, SandboxState>,
) -> Result<Option<LanguageStats>, String> {
    state
        .get_language_stats(&language)
        .await
        .map_err(|e| e.to_string())
}

/// Get all language statistics
#[tauri::command]
pub async fn sandbox_get_all_language_stats(
    state: State<'_, SandboxState>,
) -> Result<Vec<LanguageStats>, String> {
    state
        .get_all_language_stats()
        .await
        .map_err(|e| e.to_string())
}

/// Get overall sandbox statistics
#[tauri::command]
pub async fn sandbox_get_stats(state: State<'_, SandboxState>) -> Result<SandboxStats, String> {
    state.get_sandbox_stats().await.map_err(|e| e.to_string())
}

/// Get daily execution counts
#[tauri::command]
pub async fn sandbox_get_daily_counts(
    days: u32,
    state: State<'_, SandboxState>,
) -> Result<Vec<(String, u64)>, String> {
    state
        .get_daily_execution_counts(days)
        .await
        .map_err(|e| e.to_string())
}

// ==================== Utility Commands ====================

/// Export all sandbox data to JSON
#[tauri::command]
pub async fn sandbox_export_data(state: State<'_, SandboxState>) -> Result<String, String> {
    state.export_data().await.map_err(|e| e.to_string())
}

/// Get all unique tags
#[tauri::command]
pub async fn sandbox_get_all_tags(state: State<'_, SandboxState>) -> Result<Vec<String>, String> {
    state.get_all_tags().await.map_err(|e| e.to_string())
}

/// Get all unique categories
#[tauri::command]
pub async fn sandbox_get_all_categories(
    state: State<'_, SandboxState>,
) -> Result<Vec<String>, String> {
    state.get_all_categories().await.map_err(|e| e.to_string())
}

/// Update session
#[tauri::command]
pub async fn sandbox_update_session(
    session_id: String,
    name: String,
    description: Option<String>,
    state: State<'_, SandboxState>,
) -> Result<(), String> {
    state
        .update_session(&session_id, &name, description.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Get executions for a session
#[tauri::command]
pub async fn sandbox_get_session_executions(
    session_id: String,
    state: State<'_, SandboxState>,
) -> Result<Vec<ExecutionRecord>, String> {
    state
        .get_session_executions(&session_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get database size in bytes
#[tauri::command]
pub async fn sandbox_get_db_size(state: State<'_, SandboxState>) -> Result<u64, String> {
    state.get_db_size().await.map_err(|e| e.to_string())
}

/// Vacuum database to reclaim space
#[tauri::command]
pub async fn sandbox_vacuum_db(state: State<'_, SandboxState>) -> Result<(), String> {
    state.vacuum_db().await.map_err(|e| e.to_string())
}

/// Execute code with history tracking options
#[tauri::command]
pub async fn sandbox_execute_with_options(
    request: ExecuteCodeRequest,
    tags: Vec<String>,
    save_to_history: bool,
    state: State<'_, SandboxState>,
) -> Result<ExecutionResult, String> {
    let exec_request = ExecutionRequest {
        id: uuid::Uuid::new_v4().to_string(),
        language: request.language,
        code: request.code,
        stdin: request.stdin,
        args: request.args,
        env: request.env,
        timeout_secs: request.timeout_secs,
        memory_limit_mb: request.memory_limit_mb,
        cpu_limit_percent: None,
        runtime: request.runtime,
        files: request.files,
        network_enabled: request.network_enabled,
    };

    state
        .execute_with_history(exec_request, &tags, save_to_history)
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::collections::HashMap;

    #[test]
    fn test_execute_code_request_deserialization() {
        let json = json!({
            "language": "python",
            "code": "print('hello')",
            "stdin": null,
            "args": [],
            "env": {},
            "timeout_secs": 30,
            "memory_limit_mb": 256
        });

        let request: ExecuteCodeRequest = serde_json::from_value(json).unwrap();
        assert_eq!(request.language, "python");
        assert_eq!(request.code, "print('hello')");
        assert!(request.stdin.is_none());
        assert!(request.args.is_empty());
    }

    #[test]
    fn test_execute_code_request_with_all_fields() {
        let mut env = HashMap::new();
        env.insert("MY_VAR".to_string(), "value".to_string());

        let mut files = HashMap::new();
        files.insert("data.txt".to_string(), "file content".to_string());

        let request = ExecuteCodeRequest {
            language: "javascript".to_string(),
            code: "console.log('test')".to_string(),
            stdin: Some("input data".to_string()),
            args: vec!["--flag".to_string()],
            env,
            timeout_secs: Some(60),
            memory_limit_mb: Some(512),
            runtime: Some(RuntimeType::Native),
            files,
            network_enabled: Some(false),
        };

        assert_eq!(request.language, "javascript");
        assert_eq!(request.stdin, Some("input data".to_string()));
        assert_eq!(request.args.len(), 1);
        assert_eq!(request.env.get("MY_VAR"), Some(&"value".to_string()));
        assert_eq!(
            request.files.get("data.txt"),
            Some(&"file content".to_string())
        );
    }

    #[test]
    fn test_runtime_status_struct() {
        let status = RuntimeStatus {
            runtime_type: RuntimeType::Docker,
            available: true,
            version: Some("24.0.5".to_string()),
        };

        assert!(matches!(status.runtime_type, RuntimeType::Docker));
        assert!(status.available);
        assert_eq!(status.version, Some("24.0.5".to_string()));
    }

    #[test]
    fn test_runtime_status_unavailable() {
        let status = RuntimeStatus {
            runtime_type: RuntimeType::Podman,
            available: false,
            version: None,
        };

        assert!(!status.available);
        assert!(status.version.is_none());
    }

    #[test]
    fn test_runtime_status_serialization() {
        let status = RuntimeStatus {
            runtime_type: RuntimeType::Native,
            available: true,
            version: Some("1.0.0".to_string()),
        };

        let serialized = serde_json::to_string(&status).unwrap();
        assert!(serialized.contains("\"available\":true"));
    }

    #[test]
    fn test_sandbox_status_struct() {
        let status = SandboxStatus {
            available_runtimes: vec![
                RuntimeStatus {
                    runtime_type: RuntimeType::Docker,
                    available: true,
                    version: Some("24.0".to_string()),
                },
                RuntimeStatus {
                    runtime_type: RuntimeType::Native,
                    available: true,
                    version: None,
                },
            ],
            supported_languages: vec![],
            config: SandboxConfig::default(),
        };

        assert_eq!(status.available_runtimes.len(), 2);
    }

    #[test]
    fn test_create_snippet_request_struct() {
        let request = CreateSnippetRequest {
            title: "My Snippet".to_string(),
            description: Some("A test snippet".to_string()),
            language: "rust".to_string(),
            code: "fn main() {}".to_string(),
            tags: vec!["test".to_string(), "example".to_string()],
            category: Some("examples".to_string()),
            is_template: false,
        };

        assert_eq!(request.title, "My Snippet");
        assert_eq!(request.language, "rust");
        assert_eq!(request.tags.len(), 2);
        assert!(!request.is_template);
    }

    #[test]
    fn test_create_snippet_request_deserialization() {
        let json = json!({
            "title": "Test",
            "description": null,
            "language": "python",
            "code": "pass",
            "tags": [],
            "category": null,
            "is_template": true
        });

        let request: CreateSnippetRequest = serde_json::from_value(json).unwrap();
        assert_eq!(request.title, "Test");
        assert!(request.description.is_none());
        assert!(request.is_template);
    }

    #[test]
    fn test_execute_code_request_defaults() {
        let json = json!({
            "language": "python",
            "code": "pass"
        });

        let request: ExecuteCodeRequest = serde_json::from_value(json).unwrap();
        assert!(request.args.is_empty());
        assert!(request.env.is_empty());
        assert!(request.files.is_empty());
        assert!(request.stdin.is_none());
        assert!(request.timeout_secs.is_none());
        assert!(request.memory_limit_mb.is_none());
        assert!(request.runtime.is_none());
        assert!(request.network_enabled.is_none());
    }

    #[test]
    fn test_execute_code_request_with_runtime() {
        let request = ExecuteCodeRequest {
            language: "python".to_string(),
            code: "print(1)".to_string(),
            stdin: None,
            args: vec![],
            env: HashMap::new(),
            timeout_secs: None,
            memory_limit_mb: None,
            runtime: Some(RuntimeType::Docker),
            files: HashMap::new(),
            network_enabled: None,
        };

        assert!(matches!(request.runtime, Some(RuntimeType::Docker)));
    }
}
