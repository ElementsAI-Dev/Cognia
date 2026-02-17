//! Unified plugin API gateway (v2 transport).

use std::collections::{HashMap, HashSet};
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use once_cell::sync::Lazy;
use rusqlite::{params_from_iter, Connection};
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::{Manager, WebviewUrl};

use super::manager::PluginManager;
use super::types::{
    DatabaseResult, FileEntry, FileStat, NetworkRequestOptions, NetworkResponse,
    PluginApiBatchInvokeRequest, PluginApiBatchInvokeResponse, PluginApiBatchStrategy,
    PluginApiCompatInfo, PluginApiError, PluginApiErrorCode, PluginApiInvokeRequest,
    PluginApiInvokeResponse, PluginCapabilityDescriptor, PluginPermissionField, ShellResult,
};

const HOST_MIN_SDK_VERSION: &str = "1.0.0";
const HOST_RUNTIME_VERSION: &str = env!("CARGO_PKG_VERSION");
const HOST_DEFAULT_TIMEOUT_MS: u64 = 30_000;

const HIGH_RISK_PERMISSIONS: &[&str] = &[
    "shell:execute",
    "process:spawn",
    "filesystem:write",
    "python:execute",
];

struct TransactionConnection {
    plugin_id: String,
    connection: Connection,
}

static TX_CONNECTIONS: Lazy<Mutex<HashMap<String, TransactionConnection>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PathPayload {
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SqlPayload {
    sql: String,
    #[serde(default)]
    params: Option<Vec<Value>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TxPayload {
    tx_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TxSqlPayload {
    tx_id: String,
    sql: String,
    #[serde(default)]
    params: Option<Vec<Value>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WindowIdPayload {
    #[serde(alias = "window_id")]
    window_id: String,
}

fn compat_info(sdk_version: &str) -> PluginApiCompatInfo {
    PluginApiCompatInfo {
        sdk_version: sdk_version.to_string(),
        min_supported_sdk: HOST_MIN_SDK_VERSION.to_string(),
        compatible: true,
    }
}

fn ok_response(request_id: String, sdk_version: &str, data: Value) -> PluginApiInvokeResponse {
    PluginApiInvokeResponse {
        request_id,
        success: true,
        data: Some(data),
        error: None,
        runtime_version: HOST_RUNTIME_VERSION.to_string(),
        compat: compat_info(sdk_version),
    }
}

fn err_response(
    request_id: String,
    sdk_version: &str,
    code: PluginApiErrorCode,
    message: impl Into<String>,
    details: Option<Value>,
) -> PluginApiInvokeResponse {
    PluginApiInvokeResponse {
        request_id,
        success: false,
        data: None,
        error: Some(PluginApiError {
            code,
            message: message.into(),
            details,
        }),
        runtime_version: HOST_RUNTIME_VERSION.to_string(),
        compat: compat_info(sdk_version),
    }
}

fn parse_payload<T: DeserializeOwned>(value: Value) -> Result<T, String> {
    serde_json::from_value::<T>(value).map_err(|error| format!("Invalid payload: {error}"))
}

fn canonical_permission(raw: &str) -> String {
    match raw {
        "fs:read" | "file:read" => "filesystem:read".to_string(),
        "fs:write" | "fs:delete" | "file:write" => "filesystem:write".to_string(),
        "db:query" | "database:query" => "database:read".to_string(),
        "db:execute" | "database:execute" => "database:write".to_string(),
        "secrets:read" => "settings:read".to_string(),
        "secrets:write" => "settings:write".to_string(),
        other => other.to_string(),
    }
}

fn required_permission_for_api(api: &str) -> Option<String> {
    let permission = match api {
        "network:fetch" | "network:download" | "network:upload" => "network:fetch",
        "fs:readText" | "fs:readBinary" | "fs:exists" | "fs:readDir" | "fs:stat" => {
            "filesystem:read"
        }
        "fs:writeText" | "fs:writeBinary" | "fs:mkdir" | "fs:remove" | "fs:copy" | "fs:move" => {
            "filesystem:write"
        }
        "clipboard:readText" | "clipboard:readImage" => "clipboard:read",
        "clipboard:writeText" | "clipboard:writeImage" | "clipboard:clear" => "clipboard:write",
        "shell:execute" | "shell:open" | "shell:showInFolder" => "shell:execute",
        "shell:spawn" => "process:spawn",
        "db:query" | "db:tableExists" => "database:read",
        "db:execute" | "db:createTable" | "db:dropTable" => "database:write",
        "db:beginTransaction" | "db:txQuery" | "db:txExecute" | "db:commit" | "db:rollback" => {
            "database:write"
        }
        "secrets:store" | "secrets:delete" => "settings:write",
        "secrets:get" | "secrets:has" => "settings:read",
        _ => return None,
    };
    Some(permission.to_string())
}

fn is_high_risk(permission: &str) -> bool {
    HIGH_RISK_PERMISSIONS.iter().any(|item| *item == permission)
}

fn normalize_relative(path: &str) -> Result<PathBuf, PluginApiError> {
    let mut normalized = PathBuf::new();
    for component in Path::new(path).components() {
        match component {
            Component::Normal(segment) => normalized.push(segment),
            Component::CurDir => {}
            Component::ParentDir => {
                return Err(PluginApiError {
                    code: PluginApiErrorCode::PermissionDenied,
                    message: "Path traversal is not allowed".to_string(),
                    details: Some(json!({ "path": path })),
                });
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(PluginApiError {
                    code: PluginApiErrorCode::PermissionDenied,
                    message: "Absolute paths are not allowed".to_string(),
                    details: Some(json!({ "path": path })),
                });
            }
        }
    }
    Ok(normalized)
}

fn resolve_plugin_path(base_dir: &Path, raw_path: &str) -> Result<PathBuf, PluginApiError> {
    let relative = normalize_relative(raw_path)?;
    Ok(base_dir.join(relative))
}

fn io_error(error: impl ToString) -> PluginApiError {
    PluginApiError {
        code: PluginApiErrorCode::Internal,
        message: error.to_string(),
        details: None,
    }
}

async fn collect_manifest_permissions(manager: &PluginManager, plugin_id: &str) -> HashSet<String> {
    let mut permissions = HashSet::new();
    let plugin = manager.get_plugin(plugin_id).await;
    if let Some(plugin) = plugin {
        if let Some(manifest_permissions) = plugin.manifest.permissions {
            for permission in manifest_permissions {
                match permission {
                    PluginPermissionField::Typed(typed) => {
                        permissions.insert(canonical_permission(typed.as_str()));
                    }
                    PluginPermissionField::Freeform(raw) => {
                        permissions.insert(canonical_permission(&raw));
                    }
                }
            }
        }
    }
    permissions
}

async fn ensure_api_permission(
    manager: &PluginManager,
    plugin_id: &str,
    api: &str,
) -> Result<(), PluginApiError> {
    let required = match required_permission_for_api(api) {
        Some(value) => canonical_permission(&value),
        None => return Ok(()),
    };

    if manager.has_permission(plugin_id, &required).await {
        return Ok(());
    }

    if is_high_risk(&required) {
        return Err(PluginApiError {
            code: PluginApiErrorCode::PermissionRequired,
            message: format!("Permission '{required}' requires explicit grant"),
            details: Some(json!({ "permission": required, "api": api })),
        });
    }

    let manifest_permissions = collect_manifest_permissions(manager, plugin_id).await;
    if manifest_permissions.contains(&required) {
        return Ok(());
    }

    Err(PluginApiError {
        code: PluginApiErrorCode::PermissionDenied,
        message: format!("Permission '{required}' denied for api '{api}'"),
        details: Some(json!({ "permission": required, "api": api })),
    })
}

fn json_to_sql_value(value: &Value) -> rusqlite::types::Value {
    match value {
        Value::Null => rusqlite::types::Value::Null,
        Value::Bool(v) => rusqlite::types::Value::Integer(if *v { 1 } else { 0 }),
        Value::Number(v) => {
            if let Some(i) = v.as_i64() {
                rusqlite::types::Value::Integer(i)
            } else if let Some(f) = v.as_f64() {
                rusqlite::types::Value::Real(f)
            } else {
                rusqlite::types::Value::Null
            }
        }
        Value::String(v) => rusqlite::types::Value::Text(v.clone()),
        Value::Array(_) | Value::Object(_) => rusqlite::types::Value::Text(value.to_string()),
    }
}

fn sql_value_to_json(value: rusqlite::types::ValueRef<'_>) -> Value {
    match value {
        rusqlite::types::ValueRef::Null => Value::Null,
        rusqlite::types::ValueRef::Integer(v) => json!(v),
        rusqlite::types::ValueRef::Real(v) => json!(v),
        rusqlite::types::ValueRef::Text(v) => json!(String::from_utf8_lossy(v).to_string()),
        rusqlite::types::ValueRef::Blob(v) => json!(v.to_vec()),
    }
}

fn map_query_rows(
    connection: &Connection,
    sql: &str,
    params: &[Value],
) -> Result<Vec<Value>, PluginApiError> {
    let mut statement = connection.prepare(sql).map_err(io_error)?;
    let columns = statement
        .column_names()
        .iter()
        .map(|name| name.to_string())
        .collect::<Vec<_>>();
    let rows = statement
        .query_map(params_from_iter(params.iter().map(json_to_sql_value)), |row| {
            let mut record = serde_json::Map::new();
            for (index, column) in columns.iter().enumerate() {
                let value = row.get_ref(index)?;
                record.insert(column.clone(), sql_value_to_json(value));
            }
            Ok(Value::Object(record))
        })
        .map_err(io_error)?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(io_error)?);
    }
    Ok(result)
}

fn ensure_db_schema(connection: &Connection) -> Result<(), PluginApiError> {
    connection
        .execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            "#,
        )
        .map_err(io_error)?;
    Ok(())
}

async fn dispatch_api(
    app_handle: &tauri::AppHandle,
    manager: &PluginManager,
    plugin_id: &str,
    api: &str,
    payload: Value,
    timeout_ms: Option<u64>,
) -> Result<Value, PluginApiError> {
    let runtime_dirs = manager
        .ensure_plugin_runtime_dirs(plugin_id)
        .await
        .map_err(io_error)?;

    match api {
        "network:fetch" => {
            #[derive(Debug, Deserialize)]
            #[serde(rename_all = "camelCase")]
            struct NetworkFetchPayload {
                url: String,
                #[serde(default)]
                options: Option<NetworkRequestOptions>,
            }
            let payload: NetworkFetchPayload =
                parse_payload(payload).map_err(|error| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: error,
                    details: None,
                })?;

            let options = payload.options.unwrap_or(NetworkRequestOptions {
                method: Some("GET".to_string()),
                headers: None,
                body: None,
                timeout: None,
                response_type: None,
            });
            let method = reqwest::Method::from_bytes(
                options
                    .method
                    .clone()
                    .unwrap_or_else(|| "GET".to_string())
                    .as_bytes(),
            )
            .map_err(io_error)?;

            let client = crate::http::create_proxy_client_long().map_err(io_error)?;
            let mut request = client.request(method, payload.url);
            if let Some(headers) = options.headers {
                for (key, value) in headers {
                    request = request.header(key, value);
                }
            }
            if let Some(body) = options.body {
                request = match body {
                    Value::String(v) => request.body(v),
                    Value::Array(_) | Value::Object(_) => request.json(&body),
                    _ => request.body(body.to_string()),
                };
            }
            let timeout = timeout_ms
                .or(options.timeout)
                .unwrap_or(HOST_DEFAULT_TIMEOUT_MS);
            let response = tokio::time::timeout(Duration::from_millis(timeout), request.send())
                .await
                .map_err(|_| PluginApiError {
                    code: PluginApiErrorCode::Timeout,
                    message: format!("Request timed out after {timeout}ms"),
                    details: None,
                })?
                .map_err(io_error)?;

            let status = response.status();
            let headers = response
                .headers()
                .iter()
                .filter_map(|(key, value)| {
                    value
                        .to_str()
                        .ok()
                        .map(|value| (key.to_string(), value.to_string()))
                })
                .collect::<HashMap<_, _>>();
            let content_type = response
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .unwrap_or("");
            let response_type = options.response_type.unwrap_or_else(|| "auto".to_string());
            let data = if response_type == "text" {
                Value::String(response.text().await.map_err(io_error)?)
            } else if response_type == "arraybuffer" || response_type == "blob" {
                Value::Array(
                    response
                        .bytes()
                        .await
                        .map_err(io_error)?
                        .iter()
                        .map(|value| json!(*value))
                        .collect(),
                )
            } else if content_type.contains("application/json") {
                response.json::<Value>().await.map_err(io_error)?
            } else {
                Value::String(response.text().await.map_err(io_error)?)
            };
            serde_json::to_value(NetworkResponse {
                ok: status.is_success(),
                status: status.as_u16(),
                status_text: status.canonical_reason().unwrap_or("").to_string(),
                headers,
                data,
            })
            .map_err(io_error)
        }
        "network:download" => {
            let url = payload
                .get("url")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing url".to_string(),
                    details: None,
                })?;
            let dest_path = payload
                .get("destPath")
                .and_then(Value::as_str)
                .or_else(|| payload.get("dest_path").and_then(Value::as_str))
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing destPath".to_string(),
                    details: None,
                })?;
            let target = resolve_plugin_path(Path::new(&runtime_dirs.data), dest_path)?;
            if let Some(parent) = target.parent() {
                std::fs::create_dir_all(parent).map_err(io_error)?;
            }
            let client = crate::http::create_proxy_client_long().map_err(io_error)?;
            let response = client.get(url).send().await.map_err(io_error)?;
            let content_type = response
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(|value| value.to_string());
            let body = response.bytes().await.map_err(io_error)?;
            std::fs::write(&target, &body).map_err(io_error)?;
            Ok(json!({
                "path": target.to_string_lossy().to_string(),
                "size": body.len(),
                "contentType": content_type
            }))
        }
        "network:upload" => {
            let url = payload
                .get("url")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing url".to_string(),
                    details: None,
                })?;
            let file_path = payload
                .get("filePath")
                .and_then(Value::as_str)
                .or_else(|| payload.get("file_path").and_then(Value::as_str))
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing filePath".to_string(),
                    details: None,
                })?;
            let source = resolve_plugin_path(Path::new(&runtime_dirs.data), file_path)?;
            let file = tokio::fs::read(source).await.map_err(io_error)?;
            let client = crate::http::create_proxy_client_long().map_err(io_error)?;
            let response = client.post(url).body(file).send().await.map_err(io_error)?;
            let status = response.status();
            let body = response.text().await.map_err(io_error)?;
            Ok(json!({
                "ok": status.is_success(),
                "status": status.as_u16(),
                "statusText": status.canonical_reason().unwrap_or(""),
                "headers": {},
                "data": body
            }))
        }
        "fs:readText" => {
            let payload: PathPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let file = resolve_plugin_path(Path::new(&runtime_dirs.data), &payload.path)?;
            let content = std::fs::read_to_string(file).map_err(io_error)?;
            Ok(json!(content))
        }
        "fs:readBinary" => {
            let payload: PathPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let file = resolve_plugin_path(Path::new(&runtime_dirs.data), &payload.path)?;
            let content = std::fs::read(file).map_err(io_error)?;
            Ok(json!(content))
        }
        "fs:writeText" => {
            let path = payload
                .get("path")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing path".to_string(),
                    details: None,
                })?;
            let content = payload
                .get("content")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing content".to_string(),
                    details: None,
                })?;
            let file = resolve_plugin_path(Path::new(&runtime_dirs.data), path)?;
            if let Some(parent) = file.parent() {
                std::fs::create_dir_all(parent).map_err(io_error)?;
            }
            std::fs::write(file, content).map_err(io_error)?;
            Ok(json!(null))
        }
        "fs:writeBinary" => {
            let path = payload
                .get("path")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing path".to_string(),
                    details: None,
                })?;
            let content = payload
                .get("content")
                .and_then(Value::as_array)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing content".to_string(),
                    details: None,
                })?;
            let bytes = content
                .iter()
                .filter_map(Value::as_u64)
                .map(|value| value as u8)
                .collect::<Vec<_>>();
            let file = resolve_plugin_path(Path::new(&runtime_dirs.data), path)?;
            if let Some(parent) = file.parent() {
                std::fs::create_dir_all(parent).map_err(io_error)?;
            }
            std::fs::write(file, bytes).map_err(io_error)?;
            Ok(json!(null))
        }
        "fs:exists" => {
            let payload: PathPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let file = resolve_plugin_path(Path::new(&runtime_dirs.data), &payload.path)?;
            Ok(json!(file.exists()))
        }
        "fs:mkdir" => {
            let path = payload
                .get("path")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing path".to_string(),
                    details: None,
                })?;
            let recursive = payload
                .get("recursive")
                .and_then(Value::as_bool)
                .unwrap_or(true);
            let dir = resolve_plugin_path(Path::new(&runtime_dirs.data), path)?;
            if recursive {
                std::fs::create_dir_all(dir).map_err(io_error)?;
            } else {
                std::fs::create_dir(dir).map_err(io_error)?;
            }
            Ok(json!(null))
        }
        "fs:remove" => {
            let path = payload
                .get("path")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing path".to_string(),
                    details: None,
                })?;
            let recursive = payload
                .get("recursive")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            let target = resolve_plugin_path(Path::new(&runtime_dirs.data), path)?;
            if target.is_dir() {
                if recursive {
                    std::fs::remove_dir_all(target).map_err(io_error)?;
                } else {
                    std::fs::remove_dir(target).map_err(io_error)?;
                }
            } else if target.exists() {
                std::fs::remove_file(target).map_err(io_error)?;
            }
            Ok(json!(null))
        }
        "fs:copy" | "fs:move" => {
            let src = payload
                .get("src")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing src".to_string(),
                    details: None,
                })?;
            let dest = payload
                .get("dest")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing dest".to_string(),
                    details: None,
                })?;
            let src_path = resolve_plugin_path(Path::new(&runtime_dirs.data), src)?;
            let dest_path = resolve_plugin_path(Path::new(&runtime_dirs.data), dest)?;
            if let Some(parent) = dest_path.parent() {
                std::fs::create_dir_all(parent).map_err(io_error)?;
            }
            if api == "fs:copy" {
                std::fs::copy(src_path, dest_path).map_err(io_error)?;
            } else {
                std::fs::rename(src_path, dest_path).map_err(io_error)?;
            }
            Ok(json!(null))
        }
        "fs:readDir" => {
            let payload: PathPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let dir = resolve_plugin_path(Path::new(&runtime_dirs.data), &payload.path)?;
            let mut entries = Vec::new();
            for entry in std::fs::read_dir(dir).map_err(io_error)? {
                let entry = entry.map_err(io_error)?;
                let metadata = entry.metadata().map_err(io_error)?;
                entries.push(FileEntry {
                    name: entry.file_name().to_string_lossy().to_string(),
                    path: entry.path().to_string_lossy().to_string(),
                    is_file: metadata.is_file(),
                    is_directory: metadata.is_dir(),
                    size: if metadata.is_file() {
                        Some(metadata.len())
                    } else {
                        None
                    },
                });
            }
            serde_json::to_value(entries).map_err(io_error)
        }
        "fs:stat" => {
            let payload: PathPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let target = resolve_plugin_path(Path::new(&runtime_dirs.data), &payload.path)?;
            let metadata = std::fs::symlink_metadata(target).map_err(io_error)?;
            let created = metadata.created().ok().map(|value| {
                chrono::DateTime::<chrono::Utc>::from(value).to_rfc3339()
            });
            let modified = metadata.modified().ok().map(|value| {
                chrono::DateTime::<chrono::Utc>::from(value).to_rfc3339()
            });
            let accessed = metadata.accessed().ok().map(|value| {
                chrono::DateTime::<chrono::Utc>::from(value).to_rfc3339()
            });
            serde_json::to_value(FileStat {
                size: metadata.len(),
                is_file: metadata.is_file(),
                is_directory: metadata.is_dir(),
                is_symlink: metadata.file_type().is_symlink(),
                created,
                modified,
                accessed,
                mode: None,
            })
            .map_err(io_error)
        }
        "clipboard:readText" => {
            let mut clipboard = arboard::Clipboard::new().map_err(io_error)?;
            let text = clipboard.get_text().unwrap_or_default();
            Ok(json!(text))
        }
        "clipboard:writeText" => {
            let text = payload
                .get("text")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing text".to_string(),
                    details: None,
                })?;
            let mut clipboard = arboard::Clipboard::new().map_err(io_error)?;
            clipboard.set_text(text).map_err(io_error)?;
            Ok(json!(null))
        }
        "clipboard:readImage" => {
            let mut clipboard = arboard::Clipboard::new().map_err(io_error)?;
            let image = clipboard.get_image().ok();
            Ok(match image {
                Some(image) => json!(image.bytes.into_owned()),
                None => Value::Null,
            })
        }
        "clipboard:hasText" => {
            let mut clipboard = arboard::Clipboard::new().map_err(io_error)?;
            Ok(json!(clipboard.get_text().is_ok()))
        }
        "clipboard:hasImage" => {
            let mut clipboard = arboard::Clipboard::new().map_err(io_error)?;
            Ok(json!(clipboard.get_image().is_ok()))
        }
        "clipboard:writeImage" => {
            let bytes = payload
                .get("data")
                .and_then(Value::as_array)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing image bytes".to_string(),
                    details: None,
                })?
                .iter()
                .filter_map(Value::as_u64)
                .map(|value| value as u8)
                .collect::<Vec<_>>();
            let mut clipboard = arboard::Clipboard::new().map_err(io_error)?;
            clipboard
                .set_image(arboard::ImageData {
                    width: 1,
                    height: bytes.len().max(4) / 4,
                    bytes: std::borrow::Cow::Owned(bytes),
                })
                .map_err(io_error)?;
            Ok(json!(null))
        }
        "clipboard:clear" => {
            let mut clipboard = arboard::Clipboard::new().map_err(io_error)?;
            clipboard.set_text("").map_err(io_error)?;
            Ok(json!(null))
        }
        "shell:execute" => {
            let command = payload
                .get("command")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing command".to_string(),
                    details: None,
                })?;
            let options = payload.get("options").cloned().unwrap_or_else(|| json!({}));
            let timeout = timeout_ms
                .or(options.get("timeout").and_then(Value::as_u64))
                .unwrap_or(HOST_DEFAULT_TIMEOUT_MS);

            let mut process = if cfg!(target_os = "windows") {
                let mut cmd = tokio::process::Command::new("cmd");
                cmd.arg("/C").arg(command);
                cmd
            } else {
                let mut cmd = tokio::process::Command::new("sh");
                cmd.arg("-c").arg(command);
                cmd
            };
            if let Some(cwd) = options.get("cwd").and_then(Value::as_str) {
                process.current_dir(cwd);
            }

            let output = tokio::time::timeout(Duration::from_millis(timeout), process.output())
                .await
                .map_err(|_| PluginApiError {
                    code: PluginApiErrorCode::Timeout,
                    message: format!("Command timed out after {timeout}ms"),
                    details: None,
                })?
                .map_err(io_error)?;
            serde_json::to_value(ShellResult {
                code: output.status.code().unwrap_or_default(),
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                success: output.status.success(),
            })
            .map_err(io_error)
        }
        "shell:spawn" => {
            let command = payload
                .get("command")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing command".to_string(),
                    details: None,
                })?;
            let mut process = tokio::process::Command::new(command);
            if let Some(args) = payload.get("args").and_then(Value::as_array) {
                for arg in args.iter().filter_map(Value::as_str) {
                    process.arg(arg);
                }
            }
            let child = process.spawn().map_err(io_error)?;
            Ok(json!({ "pid": child.id().unwrap_or_default() }))
        }
        "shell:open" | "shell:showInFolder" => {
            let payload: PathPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let path = resolve_plugin_path(Path::new(&runtime_dirs.data), &payload.path)?;
            if api == "shell:open" {
                open::that(path).map_err(io_error)?;
            } else {
                let parent = path.parent().unwrap_or(path.as_path());
                open::that(parent).map_err(io_error)?;
            }
            Ok(json!(null))
        }
        "db:query" => {
            let payload: SqlPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let db_path = Path::new(&runtime_dirs.db).join("plugin.sqlite");
            let connection = Connection::open(db_path).map_err(io_error)?;
            ensure_db_schema(&connection)?;
            let rows = map_query_rows(&connection, &payload.sql, &payload.params.unwrap_or_default())?;
            Ok(json!(rows))
        }
        "db:execute" => {
            let payload: SqlPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let db_path = Path::new(&runtime_dirs.db).join("plugin.sqlite");
            let connection = Connection::open(db_path).map_err(io_error)?;
            ensure_db_schema(&connection)?;
            let changed = connection
                .execute(
                    &payload.sql,
                    params_from_iter(payload.params.unwrap_or_default().iter().map(json_to_sql_value)),
                )
                .map_err(io_error)?;
            serde_json::to_value(DatabaseResult {
                rows_affected: changed as u64,
                last_insert_id: Some(connection.last_insert_rowid()),
            })
            .map_err(io_error)
        }
        "db:createTable" => {
            let name = payload
                .get("name")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing table name".to_string(),
                    details: None,
                })?;
            let schema = payload
                .get("schema")
                .and_then(Value::as_object)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing table schema".to_string(),
                    details: None,
                })?;
            let columns = schema
                .get("columns")
                .and_then(Value::as_array)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing schema.columns".to_string(),
                    details: None,
                })?;
            let mut column_defs = Vec::new();
            for column in columns {
                let name = column
                    .get("name")
                    .and_then(Value::as_str)
                    .ok_or_else(|| PluginApiError {
                        code: PluginApiErrorCode::InvalidRequest,
                        message: "Column name is required".to_string(),
                        details: None,
                    })?;
                let kind = column
                    .get("type")
                    .and_then(Value::as_str)
                    .ok_or_else(|| PluginApiError {
                        code: PluginApiErrorCode::InvalidRequest,
                        message: "Column type is required".to_string(),
                        details: None,
                    })?;
                column_defs.push(format!("\"{name}\" {kind}"));
            }
            let sql = format!(
                "CREATE TABLE IF NOT EXISTS \"{}\" ({})",
                name,
                column_defs.join(", ")
            );
            let db_path = Path::new(&runtime_dirs.db).join("plugin.sqlite");
            let connection = Connection::open(db_path).map_err(io_error)?;
            ensure_db_schema(&connection)?;
            connection.execute(&sql, []).map_err(io_error)?;
            Ok(json!(null))
        }
        "db:dropTable" => {
            let name = payload
                .get("name")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing table name".to_string(),
                    details: None,
                })?;
            let db_path = Path::new(&runtime_dirs.db).join("plugin.sqlite");
            let connection = Connection::open(db_path).map_err(io_error)?;
            ensure_db_schema(&connection)?;
            connection
                .execute(&format!("DROP TABLE IF EXISTS \"{}\"", name), [])
                .map_err(io_error)?;
            Ok(json!(null))
        }
        "db:tableExists" => {
            let name = payload
                .get("name")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing table name".to_string(),
                    details: None,
                })?;
            let db_path = Path::new(&runtime_dirs.db).join("plugin.sqlite");
            let connection = Connection::open(db_path).map_err(io_error)?;
            ensure_db_schema(&connection)?;
            let exists: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
                    [name],
                    |row| row.get(0),
                )
                .map_err(io_error)?;
            Ok(json!(exists > 0))
        }
        "db:beginTransaction" => {
            let payload: TxPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let db_path = Path::new(&runtime_dirs.db).join("plugin.sqlite");
            let connection = Connection::open(db_path).map_err(io_error)?;
            ensure_db_schema(&connection)?;
            connection.execute("BEGIN IMMEDIATE", []).map_err(io_error)?;
            let mut txs = TX_CONNECTIONS.lock().map_err(io_error)?;
            if txs.contains_key(&payload.tx_id) {
                return Err(PluginApiError {
                    code: PluginApiErrorCode::Conflict,
                    message: format!("Transaction already exists: {}", payload.tx_id),
                    details: None,
                });
            }
            txs.insert(
                payload.tx_id,
                TransactionConnection {
                    plugin_id: plugin_id.to_string(),
                    connection,
                },
            );
            Ok(json!(null))
        }
        "db:txQuery" => {
            let payload: TxSqlPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let mut txs = TX_CONNECTIONS.lock().map_err(io_error)?;
            let tx = txs.get_mut(&payload.tx_id).ok_or_else(|| PluginApiError {
                code: PluginApiErrorCode::NotFound,
                message: format!("Transaction not found: {}", payload.tx_id),
                details: None,
            })?;
            if tx.plugin_id != plugin_id {
                return Err(PluginApiError {
                    code: PluginApiErrorCode::PermissionDenied,
                    message: "Cross-plugin transaction access denied".to_string(),
                    details: None,
                });
            }
            let rows = map_query_rows(
                &tx.connection,
                &payload.sql,
                &payload.params.unwrap_or_default(),
            )?;
            Ok(json!(rows))
        }
        "db:txExecute" => {
            let payload: TxSqlPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let mut txs = TX_CONNECTIONS.lock().map_err(io_error)?;
            let tx = txs.get_mut(&payload.tx_id).ok_or_else(|| PluginApiError {
                code: PluginApiErrorCode::NotFound,
                message: format!("Transaction not found: {}", payload.tx_id),
                details: None,
            })?;
            if tx.plugin_id != plugin_id {
                return Err(PluginApiError {
                    code: PluginApiErrorCode::PermissionDenied,
                    message: "Cross-plugin transaction access denied".to_string(),
                    details: None,
                });
            }
            let changed = tx
                .connection
                .execute(
                    &payload.sql,
                    params_from_iter(payload.params.unwrap_or_default().iter().map(json_to_sql_value)),
                )
                .map_err(io_error)?;
            Ok(json!({
                "rowsAffected": changed,
                "lastInsertId": tx.connection.last_insert_rowid()
            }))
        }
        "db:commit" | "db:rollback" => {
            let payload: TxPayload = parse_payload(payload).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let mut txs = TX_CONNECTIONS.lock().map_err(io_error)?;
            let tx = txs.remove(&payload.tx_id).ok_or_else(|| PluginApiError {
                code: PluginApiErrorCode::NotFound,
                message: format!("Transaction not found: {}", payload.tx_id),
                details: None,
            })?;
            let sql = if api == "db:commit" { "COMMIT" } else { "ROLLBACK" };
            tx.connection.execute(sql, []).map_err(io_error)?;
            Ok(json!(null))
        }
        "secrets:store" | "secrets:get" | "secrets:delete" | "secrets:has" => {
            let key = payload
                .get("key")
                .and_then(Value::as_str)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::InvalidRequest,
                    message: "Missing key".to_string(),
                    details: None,
                })?;
            let file = Path::new(&runtime_dirs.secrets).join("secrets.json");
            let mut store = if file.exists() {
                serde_json::from_str::<HashMap<String, String>>(
                    &std::fs::read_to_string(&file).map_err(io_error)?,
                )
                .unwrap_or_default()
            } else {
                HashMap::new()
            };
            let namespaced = format!("plugin::{plugin_id}::{key}");
            match api {
                "secrets:store" => {
                    let value = payload
                        .get("value")
                        .and_then(Value::as_str)
                        .ok_or_else(|| PluginApiError {
                            code: PluginApiErrorCode::InvalidRequest,
                            message: "Missing value".to_string(),
                            details: None,
                        })?;
                    store.insert(namespaced, value.to_string());
                    std::fs::write(&file, serde_json::to_string_pretty(&store).map_err(io_error)?)
                        .map_err(io_error)?;
                    Ok(json!(null))
                }
                "secrets:get" => Ok(store
                    .get(&namespaced)
                    .map(|value| Value::String(value.clone()))
                    .unwrap_or(Value::Null)),
                "secrets:delete" => {
                    store.remove(&namespaced);
                    std::fs::write(&file, serde_json::to_string_pretty(&store).map_err(io_error)?)
                        .map_err(io_error)?;
                    Ok(json!(null))
                }
                _ => Ok(json!(store.contains_key(&namespaced))),
            }
        }
        "window:create" => {
            let title = payload
                .get("options")
                .and_then(|v| v.get("title"))
                .and_then(Value::as_str)
                .unwrap_or("Plugin Window");
            let window_id = format!("plugin-{plugin_id}-{}", uuid::Uuid::new_v4().simple());
            tauri::WebviewWindowBuilder::new(
                app_handle,
                window_id.clone(),
                WebviewUrl::App("index.html".into()),
            )
            .title(title)
            .build()
            .map_err(io_error)?;
            Ok(json!(window_id))
        }
        "window:close"
        | "window:show"
        | "window:hide"
        | "window:focus"
        | "window:setTitle"
        | "window:setSize"
        | "window:setPosition"
        | "window:center" => {
            let raw_payload = payload;
            let parsed: WindowIdPayload = parse_payload(raw_payload.clone()).map_err(|error| PluginApiError {
                code: PluginApiErrorCode::InvalidRequest,
                message: error,
                details: None,
            })?;
            let window = app_handle
                .get_webview_window(&parsed.window_id)
                .ok_or_else(|| PluginApiError {
                    code: PluginApiErrorCode::NotFound,
                    message: format!("Window not found: {}", parsed.window_id),
                    details: None,
                })?;
            match api {
                "window:close" => window.close().map_err(io_error)?,
                "window:show" => window.show().map_err(io_error)?,
                "window:hide" => window.hide().map_err(io_error)?,
                "window:setTitle" => {
                    let title = raw_payload
                        .get("title")
                        .and_then(Value::as_str)
                        .ok_or_else(|| PluginApiError {
                            code: PluginApiErrorCode::InvalidRequest,
                            message: "Missing title".to_string(),
                            details: None,
                        })?;
                    window.set_title(title).map_err(io_error)?;
                }
                "window:setSize" => {
                    let width = raw_payload
                        .get("width")
                        .and_then(Value::as_u64)
                        .ok_or_else(|| PluginApiError {
                            code: PluginApiErrorCode::InvalidRequest,
                            message: "Missing width".to_string(),
                            details: None,
                        })?;
                    let height = raw_payload
                        .get("height")
                        .and_then(Value::as_u64)
                        .ok_or_else(|| PluginApiError {
                            code: PluginApiErrorCode::InvalidRequest,
                            message: "Missing height".to_string(),
                            details: None,
                        })?;
                    window
                        .set_size(tauri::Size::Logical(tauri::LogicalSize {
                            width: width as f64,
                            height: height as f64,
                        }))
                        .map_err(io_error)?;
                }
                "window:setPosition" => {
                    let x = raw_payload
                        .get("x")
                        .and_then(Value::as_i64)
                        .ok_or_else(|| PluginApiError {
                            code: PluginApiErrorCode::InvalidRequest,
                            message: "Missing x".to_string(),
                            details: None,
                        })?;
                    let y = raw_payload
                        .get("y")
                        .and_then(Value::as_i64)
                        .ok_or_else(|| PluginApiError {
                            code: PluginApiErrorCode::InvalidRequest,
                            message: "Missing y".to_string(),
                            details: None,
                        })?;
                    window
                        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                            x: x as i32,
                            y: y as i32,
                        }))
                        .map_err(io_error)?;
                }
                "window:center" => window.center().map_err(io_error)?,
                _ => window.set_focus().map_err(io_error)?,
            }
            Ok(json!(null))
        }
        _ => Err(PluginApiError {
            code: PluginApiErrorCode::NotSupported,
            message: format!("API not supported: {api}"),
            details: Some(json!({ "api": api })),
        }),
    }
}

pub async fn invoke_api(
    app_handle: &tauri::AppHandle,
    manager: &PluginManager,
    request: PluginApiInvokeRequest,
) -> PluginApiInvokeResponse {
    if let Err(error) = ensure_api_permission(manager, &request.plugin_id, &request.api).await {
        return err_response(
            request.request_id,
            &request.sdk_version,
            error.code,
            error.message,
            error.details,
        );
    }
    match dispatch_api(
        app_handle,
        manager,
        &request.plugin_id,
        &request.api,
        request.payload,
        request.timeout_ms,
    )
    .await
    {
        Ok(data) => ok_response(request.request_id, &request.sdk_version, data),
        Err(error) => err_response(
            request.request_id,
            &request.sdk_version,
            error.code,
            error.message,
            error.details,
        ),
    }
}

pub async fn batch_invoke_api(
    app_handle: &tauri::AppHandle,
    manager: &PluginManager,
    request: PluginApiBatchInvokeRequest,
) -> PluginApiBatchInvokeResponse {
    let mut success = true;
    let mut results = Vec::with_capacity(request.requests.len());
    for item in request.requests {
        let result = invoke_api(
            app_handle,
            manager,
            PluginApiInvokeRequest {
                sdk_version: request.sdk_version.clone(),
                plugin_id: request.plugin_id.clone(),
                request_id: item.request_id,
                api: item.api,
                payload: item.payload,
                timeout_ms: item.timeout_ms,
                context: item.context,
            },
        )
        .await;
        if !result.success {
            success = false;
            results.push(result);
            if matches!(request.strategy, PluginApiBatchStrategy::AbortOnError) {
                break;
            }
        } else {
            results.push(result);
        }
    }
    PluginApiBatchInvokeResponse { success, results }
}

pub fn capabilities() -> Vec<PluginCapabilityDescriptor> {
    let define = |api: &str, perms: Vec<&str>, high_risk: bool| PluginCapabilityDescriptor {
        api: api.to_string(),
        supported: true,
        high_risk,
        required_permissions: perms.into_iter().map(canonical_permission).collect(),
        platform: None,
    };
    vec![
        define("network:fetch", vec!["network:fetch"], false),
        define("network:download", vec!["network:fetch"], false),
        define("network:upload", vec!["network:fetch"], false),
        define("fs:readText", vec!["filesystem:read"], false),
        define("fs:readBinary", vec!["filesystem:read"], false),
        define("fs:writeText", vec!["filesystem:write"], true),
        define("fs:writeBinary", vec!["filesystem:write"], true),
        define("fs:exists", vec!["filesystem:read"], false),
        define("fs:mkdir", vec!["filesystem:write"], true),
        define("fs:remove", vec!["filesystem:write"], true),
        define("fs:copy", vec!["filesystem:write"], true),
        define("fs:move", vec!["filesystem:write"], true),
        define("fs:readDir", vec!["filesystem:read"], false),
        define("fs:stat", vec!["filesystem:read"], false),
        define("clipboard:readText", vec!["clipboard:read"], false),
        define("clipboard:writeText", vec!["clipboard:write"], false),
        define("clipboard:readImage", vec!["clipboard:read"], false),
        define("clipboard:writeImage", vec!["clipboard:write"], false),
        define("clipboard:hasText", vec!["clipboard:read"], false),
        define("clipboard:hasImage", vec!["clipboard:read"], false),
        define("clipboard:clear", vec!["clipboard:write"], false),
        define("shell:execute", vec!["shell:execute"], true),
        define("shell:spawn", vec!["process:spawn"], true),
        define("shell:open", vec!["shell:execute"], true),
        define("shell:showInFolder", vec!["shell:execute"], true),
        define("db:query", vec!["database:read"], false),
        define("db:execute", vec!["database:write"], false),
        define("db:createTable", vec!["database:write"], false),
        define("db:dropTable", vec!["database:write"], false),
        define("db:tableExists", vec!["database:read"], false),
        define("db:beginTransaction", vec!["database:write"], false),
        define("db:txQuery", vec!["database:write"], false),
        define("db:txExecute", vec!["database:write"], false),
        define("db:commit", vec!["database:write"], false),
        define("db:rollback", vec!["database:write"], false),
        define("secrets:get", vec!["settings:read"], false),
        define("secrets:store", vec!["settings:write"], false),
        define("secrets:delete", vec!["settings:write"], false),
        define("secrets:has", vec!["settings:read"], false),
        define("window:create", vec![], false),
        define("window:close", vec![], false),
        define("window:show", vec![], false),
        define("window:hide", vec![], false),
        define("window:focus", vec![], false),
        define("window:setTitle", vec![], false),
        define("window:setSize", vec![], false),
        define("window:setPosition", vec![], false),
        define("window:center", vec![], false),
    ]
}

pub fn canonicalize_permission(permission: &str) -> String {
    canonical_permission(permission)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonicalizes_permission_aliases() {
        assert_eq!(canonicalize_permission("fs:read"), "filesystem:read");
        assert_eq!(canonicalize_permission("fs:write"), "filesystem:write");
        assert_eq!(canonicalize_permission("db:query"), "database:read");
        assert_eq!(canonicalize_permission("db:execute"), "database:write");
    }

    #[test]
    fn rejects_path_traversal() {
        let result = normalize_relative("../escape.txt");
        assert!(result.is_err());
    }

    #[test]
    fn marks_shell_execute_as_high_risk_capability() {
        let capability = capabilities()
            .into_iter()
            .find(|item| item.api == "shell:execute")
            .expect("shell:execute capability should exist");
        assert!(capability.high_risk);
        assert!(capability.required_permissions.contains(&"shell:execute".to_string()));
    }
}
