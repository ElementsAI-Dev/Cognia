//! LSP commands for desktop Monaco integration.
//!
//! This module provides protocol-level language server support over stdio.

use super::lsp_events::{emit_server_status_changed, LspServerStatusChangedEvent};
use super::lsp_installer::{
    ensure_server_ready, get_server_status, install_server, list_installed_servers, resolve_launch,
    uninstall_server, LspGetServerStatusRequest, LspInstallServerRequest, LspInstallServerResult,
    LspResolveLaunchRequest, LspServerStatusResponse, LspUninstallServerRequest,
};
use super::lsp_registry::{
    recommended_servers, registry_search, LspRegistryRecommendedResponse, LspRegistrySearchRequest,
};
use super::lsp_resolver::{
    is_command_allowed, normalize_language_id, LspProvider, LspResolvedLaunch,
};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::process::Stdio;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStderr, ChildStdin, ChildStdout, Command};
use tokio::sync::{oneshot, Mutex};
use tokio::time::{timeout, Duration};
use uuid::Uuid;

const LSP_DEFAULT_TIMEOUT_MS: u64 = 10_000;
const LSP_INITIALIZE_TIMEOUT_MS: u64 = 20_000;
const LSP_WORKSPACE_SYMBOL_TIMEOUT_MS: u64 = 15_000;
const LSP_MAX_TIMEOUT_MS: u64 = 120_000;
const LSP_MAX_HEADER_BYTES: usize = 16 * 1024;

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LspRequestMeta {
    #[serde(default)]
    pub client_request_id: Option<String>,
    #[serde(default)]
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspStartSessionRequest {
    pub language: String,
    pub root_uri: Option<String>,
    pub workspace_folders: Option<Vec<String>>,
    pub initialization_options: Option<Value>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    #[serde(default)]
    pub auto_install: Option<bool>,
    #[serde(default)]
    pub preferred_providers: Option<Vec<LspProvider>>,
    #[serde(default)]
    pub allow_fallback: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspStartSessionResponse {
    pub session_id: String,
    pub capabilities: Value,
    pub resolved_command: Option<String>,
    pub resolved_args: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRangePosition {
    pub line: u32,
    pub character: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRangeRequest {
    pub start: LspRangePosition,
    pub end: LspRangePosition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspTextDocumentContentChangeEvent {
    pub range: Option<LspRangeRequest>,
    pub range_length: Option<u32>,
    pub text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspOpenDocumentRequest {
    pub session_id: String,
    pub uri: String,
    pub language_id: String,
    pub version: i64,
    pub text: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspChangeDocumentRequest {
    pub session_id: String,
    pub uri: String,
    pub version: i64,
    pub text: String,
    pub changes: Option<Vec<LspTextDocumentContentChangeEvent>>,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspCloseDocumentRequest {
    pub session_id: String,
    pub uri: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspCancelRequestCommand {
    pub session_id: String,
    pub client_request_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspPositionRequest {
    pub session_id: String,
    pub uri: String,
    pub line: u32,
    pub character: u32,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspReferencesRequest {
    pub session_id: String,
    pub uri: String,
    pub line: u32,
    pub character: u32,
    #[serde(default)]
    pub include_declaration: Option<bool>,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRenameRequest {
    pub session_id: String,
    pub uri: String,
    pub line: u32,
    pub character: u32,
    pub new_name: String,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspDocumentRequest {
    pub session_id: String,
    pub uri: String,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspInlayHintsRequest {
    pub session_id: String,
    pub uri: String,
    pub range: LspRangeRequest,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspFormatDocumentRequest {
    pub session_id: String,
    pub uri: String,
    pub tab_size: Option<u32>,
    pub insert_spaces: Option<bool>,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspCodeActionsRequest {
    pub session_id: String,
    pub uri: String,
    pub range: LspRangeRequest,
    pub diagnostics: Option<Vec<Value>>,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspWorkspaceSymbolsRequest {
    pub session_id: String,
    pub query: String,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspExecuteCommandRequest {
    pub session_id: String,
    pub command: String,
    pub arguments: Option<Vec<Value>>,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspResolveCodeActionRequest {
    pub session_id: String,
    pub action: Value,
    #[serde(flatten)]
    pub meta: LspRequestMeta,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspShutdownSessionRequest {
    pub session_id: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LspTextDocumentSyncKind {
    None,
    Full,
    Incremental,
}

struct PendingRequest {
    sender: oneshot::Sender<Value>,
    client_request_id: Option<String>,
}

struct LspSession {
    stdin: Arc<Mutex<ChildStdin>>,
    child: Arc<Mutex<Child>>,
    pending: Arc<Mutex<HashMap<i64, PendingRequest>>>,
    client_request_index: Arc<Mutex<HashMap<String, i64>>>,
    canceled_request_ids: Arc<Mutex<HashSet<i64>>>,
    next_id: AtomicI64,
    server_capabilities: Arc<Mutex<Value>>,
    text_document_sync_kind: Arc<Mutex<LspTextDocumentSyncKind>>,
    open_documents: Arc<Mutex<HashMap<String, i64>>>,
    root_uri: Option<String>,
    workspace_folders: Vec<String>,
}

static LSP_SESSIONS: Lazy<Mutex<HashMap<String, Arc<LspSession>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn parse_content_length(header_text: &str) -> Result<usize, String> {
    for line in header_text.lines() {
        if let Some(value) = line.strip_prefix("Content-Length:") {
            let parsed = value
                .trim()
                .parse::<usize>()
                .map_err(|e| format!("Invalid content length: {}", e))?;
            return Ok(parsed);
        }
    }
    Err("Missing Content-Length header".to_string())
}

async fn read_lsp_message<R>(reader: &mut R) -> Result<Value, String>
where
    R: AsyncRead + Unpin,
{
    let mut header = Vec::new();
    let mut byte = [0u8; 1];

    loop {
        reader
            .read_exact(&mut byte)
            .await
            .map_err(|e| format!("Failed to read LSP header: {}", e))?;
        header.push(byte[0]);

        if header.len() > LSP_MAX_HEADER_BYTES {
            return Err("LSP header too large".to_string());
        }

        if header.ends_with(b"\r\n\r\n") {
            break;
        }
    }

    let header_text =
        String::from_utf8(header).map_err(|e| format!("Invalid LSP header UTF-8: {}", e))?;
    let content_length = parse_content_length(&header_text)?;

    let mut body = vec![0u8; content_length];
    reader
        .read_exact(&mut body)
        .await
        .map_err(|e| format!("Failed to read LSP payload: {}", e))?;

    serde_json::from_slice(&body).map_err(|e| format!("Invalid LSP JSON payload: {}", e))
}

async fn write_lsp_message(stdin: &Arc<Mutex<ChildStdin>>, message: &Value) -> Result<(), String> {
    let payload =
        serde_json::to_vec(message).map_err(|e| format!("Failed to serialize LSP JSON: {}", e))?;
    let header = format!("Content-Length: {}\r\n\r\n", payload.len());

    let mut writer = stdin.lock().await;
    writer
        .write_all(header.as_bytes())
        .await
        .map_err(|e| format!("Failed to write LSP header: {}", e))?;
    writer
        .write_all(&payload)
        .await
        .map_err(|e| format!("Failed to write LSP payload: {}", e))?;
    writer
        .flush()
        .await
        .map_err(|e| format!("Failed to flush LSP payload: {}", e))
}

async fn lsp_send_notification(
    session: &LspSession,
    method: &str,
    params: Value,
) -> Result<(), String> {
    let message = json!({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
    });
    write_lsp_message(&session.stdin, &message).await
}

fn parse_message_id(raw_id: &Value) -> Option<i64> {
    if let Some(id) = raw_id.as_i64() {
        return Some(id);
    }
    raw_id.as_str().and_then(|s| s.parse::<i64>().ok())
}

fn default_timeout_ms_for_method(method: &str) -> u64 {
    match method {
        "initialize" => LSP_INITIALIZE_TIMEOUT_MS,
        "workspace/symbol" => LSP_WORKSPACE_SYMBOL_TIMEOUT_MS,
        _ => LSP_DEFAULT_TIMEOUT_MS,
    }
}

fn resolve_timeout_ms(method: &str, requested_timeout_ms: Option<u64>) -> u64 {
    let default_timeout = default_timeout_ms_for_method(method);
    match requested_timeout_ms {
        Some(timeout_ms) if timeout_ms > 0 => timeout_ms.min(LSP_MAX_TIMEOUT_MS),
        _ => default_timeout,
    }
}

fn resolve_request_id_for_client(
    client_request_index: &mut HashMap<String, i64>,
    client_request_id: &str,
) -> Option<i64> {
    client_request_index.remove(client_request_id)
}

fn workspace_folder_name(uri: &str) -> String {
    let trimmed = uri.trim_end_matches('/');
    let segment = trimmed.rsplit('/').next().unwrap_or("workspace");
    if segment.is_empty() {
        "workspace".to_string()
    } else {
        segment.to_string()
    }
}

fn build_workspace_folders_payload(workspace_folders: &[String]) -> Value {
    Value::Array(
        workspace_folders
            .iter()
            .map(|uri| {
                json!({
                    "uri": uri,
                    "name": workspace_folder_name(uri),
                })
            })
            .collect(),
    )
}

fn derive_workspace_folders(
    root_uri: Option<&str>,
    workspace_folders: Option<&[String]>,
) -> Vec<String> {
    if let Some(folders) = workspace_folders {
        let normalized = folders
            .iter()
            .filter(|uri| !uri.is_empty())
            .cloned()
            .collect::<Vec<_>>();
        if !normalized.is_empty() {
            return normalized;
        }
    }

    match root_uri {
        Some(uri) if !uri.is_empty() => vec![uri.to_string()],
        _ => vec!["file:///workspace".to_string()],
    }
}

fn extract_server_capabilities(initialize_result: &Value) -> Value {
    initialize_result
        .get("capabilities")
        .cloned()
        .unwrap_or_else(|| initialize_result.clone())
}

fn parse_text_document_sync_kind(server_capabilities: &Value) -> LspTextDocumentSyncKind {
    let Some(text_document_sync) = server_capabilities.get("textDocumentSync") else {
        return LspTextDocumentSyncKind::Full;
    };

    if let Some(kind) = text_document_sync.as_i64() {
        return match kind {
            2 => LspTextDocumentSyncKind::Incremental,
            0 => LspTextDocumentSyncKind::None,
            _ => LspTextDocumentSyncKind::Full,
        };
    }

    if let Some(change_kind) = text_document_sync.get("change").and_then(Value::as_i64) {
        return match change_kind {
            2 => LspTextDocumentSyncKind::Incremental,
            0 => LspTextDocumentSyncKind::None,
            _ => LspTextDocumentSyncKind::Full,
        };
    }

    LspTextDocumentSyncKind::Full
}

fn build_did_change_content_changes(
    sync_kind: LspTextDocumentSyncKind,
    full_text: &str,
    changes: Option<&[LspTextDocumentContentChangeEvent]>,
) -> Vec<Value> {
    if sync_kind == LspTextDocumentSyncKind::Incremental {
        if let Some(changes) = changes {
            if !changes.is_empty() {
                return changes
                    .iter()
                    .map(|change| {
                        let mut payload = serde_json::Map::new();
                        payload.insert("text".to_string(), Value::String(change.text.clone()));
                        if let Some(range) = &change.range {
                            payload.insert(
                                "range".to_string(),
                                serde_json::to_value(range).unwrap_or(Value::Null),
                            );
                        }
                        if let Some(range_length) = change.range_length {
                            payload.insert("rangeLength".to_string(), json!(range_length));
                        }
                        Value::Object(payload)
                    })
                    .collect();
            }
        }
    }

    vec![json!({ "text": full_text })]
}

fn build_server_request_response(
    method: &str,
    id: &Value,
    params: Option<&Value>,
    workspace_folders: &[String],
) -> Value {
    match method {
        "workspace/configuration" => {
            let item_count = params
                .and_then(|value| value.get("items"))
                .and_then(Value::as_array)
                .map(|items| items.len())
                .unwrap_or(0);
            let result = Value::Array((0..item_count).map(|_| json!({})).collect());
            json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": result,
            })
        }
        "workspace/workspaceFolders" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": build_workspace_folders_payload(workspace_folders),
        }),
        "window/workDoneProgress/create" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": Value::Null,
        }),
        "$/cancelRequest" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": Value::Null,
        }),
        _ => json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": {
                "code": -32601,
                "message": format!("Method '{}' not found", method),
            },
        }),
    }
}

fn should_accept_diagnostics(current_version: Option<i64>, incoming_version: Option<i64>) -> bool {
    let Some(version) = current_version else {
        return false;
    };
    match incoming_version {
        Some(incoming) => incoming >= version,
        None => true,
    }
}

fn take_open_document_uris(open_documents: &mut HashMap<String, i64>) -> Vec<String> {
    let uris = open_documents.keys().cloned().collect::<Vec<_>>();
    open_documents.clear();
    uris
}

async fn register_pending_request(
    session: &LspSession,
    request_id: i64,
    pending_request: PendingRequest,
) {
    if let Some(client_request_id) = pending_request.client_request_id.clone() {
        let mut client_request_index = session.client_request_index.lock().await;
        client_request_index.insert(client_request_id, request_id);
    }

    let mut pending = session.pending.lock().await;
    pending.insert(request_id, pending_request);
}

async fn unregister_pending_request(
    session: &LspSession,
    request_id: i64,
) -> Option<PendingRequest> {
    let pending_request = {
        let mut pending = session.pending.lock().await;
        pending.remove(&request_id)
    };

    if let Some(client_request_id) = pending_request
        .as_ref()
        .and_then(|request| request.client_request_id.as_ref())
    {
        let mut client_request_index = session.client_request_index.lock().await;
        if client_request_index.get(client_request_id).copied() == Some(request_id) {
            client_request_index.remove(client_request_id);
        }
    }

    pending_request
}

async fn mark_request_canceled(session: &LspSession, request_id: i64) {
    let mut canceled_request_ids = session.canceled_request_ids.lock().await;
    canceled_request_ids.insert(request_id);
}

async fn take_request_canceled(session: &LspSession, request_id: i64) -> bool {
    let mut canceled_request_ids = session.canceled_request_ids.lock().await;
    canceled_request_ids.remove(&request_id)
}

async fn clear_pending_state(session: &LspSession) {
    {
        let mut pending = session.pending.lock().await;
        pending.clear();
    }
    {
        let mut client_request_index = session.client_request_index.lock().await;
        client_request_index.clear();
    }
    {
        let mut canceled_request_ids = session.canceled_request_ids.lock().await;
        canceled_request_ids.clear();
    }
}

async fn emit_diagnostics(
    app: &AppHandle,
    session_id: &str,
    uri: &str,
    diagnostics: Value,
    version: Option<i64>,
) {
    let payload = json!({
        "sessionId": session_id,
        "uri": uri,
        "diagnostics": diagnostics,
        "version": version,
    });
    let _ = app.emit("lsp://diagnostics", payload);
}

async fn emit_clear_diagnostics(app: &AppHandle, session_id: &str, uri: &str) {
    emit_diagnostics(app, session_id, uri, json!([]), None).await;
}

async fn clear_open_document_diagnostics(session: &LspSession, app: &AppHandle, session_id: &str) {
    let open_document_uris = {
        let mut open_documents = session.open_documents.lock().await;
        take_open_document_uris(&mut open_documents)
    };
    for uri in open_document_uris {
        emit_clear_diagnostics(app, session_id, &uri).await;
    }
}

async fn lsp_send_request(
    session: &LspSession,
    method: &str,
    params: Value,
    meta: &LspRequestMeta,
) -> Result<Value, String> {
    let request_id = session.next_id.fetch_add(1, Ordering::SeqCst);
    let (tx, rx) = oneshot::channel::<Value>();
    register_pending_request(
        session,
        request_id,
        PendingRequest {
            sender: tx,
            client_request_id: meta.client_request_id.clone(),
        },
    )
    .await;

    let message = json!({
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": params,
    });

    if let Err(error) = write_lsp_message(&session.stdin, &message).await {
        let _ = unregister_pending_request(session, request_id).await;
        let _ = take_request_canceled(session, request_id).await;
        return Err(error);
    }

    let timeout_ms = resolve_timeout_ms(method, meta.timeout_ms);
    let response = match timeout(Duration::from_millis(timeout_ms), rx).await {
        Ok(Ok(response)) => response,
        Ok(Err(_)) => {
            if take_request_canceled(session, request_id).await {
                return Err(format!("LSP request '{}' canceled", method));
            }
            let _ = unregister_pending_request(session, request_id).await;
            return Err(format!("LSP request '{}' channel closed", method));
        }
        Err(_) => {
            let _ = unregister_pending_request(session, request_id).await;
            let _ = take_request_canceled(session, request_id).await;
            return Err(format!(
                "LSP request '{}' timed out after {}ms",
                method, timeout_ms
            ));
        }
    };

    if let Some(error) = response.get("error") {
        return Err(format!("LSP error in '{}': {}", method, error));
    }

    Ok(response.get("result").cloned().unwrap_or(Value::Null))
}

async fn handle_publish_diagnostics(
    session: &Arc<LspSession>,
    app: &AppHandle,
    session_id: &str,
    params: &Value,
) {
    let Some(uri) = params.get("uri").and_then(Value::as_str) else {
        return;
    };
    let diagnostics = params
        .get("diagnostics")
        .cloned()
        .filter(Value::is_array)
        .unwrap_or_else(|| json!([]));
    let incoming_version = params.get("version").and_then(Value::as_i64);

    let current_version = {
        let open_documents = session.open_documents.lock().await;
        open_documents.get(uri).copied()
    };

    if !should_accept_diagnostics(current_version, incoming_version) {
        return;
    }

    emit_diagnostics(app, session_id, uri, diagnostics, incoming_version).await;
}

async fn handle_server_notification(
    session: &Arc<LspSession>,
    app: &AppHandle,
    session_id: &str,
    method: &str,
    params: Option<&Value>,
) {
    match method {
        "textDocument/publishDiagnostics" => {
            if let Some(params) = params {
                handle_publish_diagnostics(session, app, session_id, params).await;
            }
        }
        "$/cancelRequest" => {
            log::debug!("LSP[{}] received $/cancelRequest notification", session_id);
        }
        _ => {}
    }
}

async fn handle_server_request(
    session: &Arc<LspSession>,
    session_id: &str,
    method: &str,
    id: &Value,
    params: Option<&Value>,
) {
    if !matches!(
        method,
        "workspace/configuration"
            | "workspace/workspaceFolders"
            | "window/workDoneProgress/create"
            | "$/cancelRequest"
    ) {
        log::debug!(
            "LSP[{}] received unsupported server request '{}', replying -32601",
            session_id,
            method
        );
    }

    let workspace_folders = if session.workspace_folders.is_empty() {
        session
            .root_uri
            .as_ref()
            .map(|uri| vec![uri.clone()])
            .unwrap_or_default()
    } else {
        session.workspace_folders.clone()
    };
    let response = build_server_request_response(method, id, params, &workspace_folders);
    if let Err(error) = write_lsp_message(&session.stdin, &response).await {
        log::warn!(
            "LSP[{}] failed to send response for server request '{}': {}",
            session_id,
            method,
            error
        );
    }
}

async fn lsp_handle_stdout(
    session_id: String,
    app: AppHandle,
    mut stdout: ChildStdout,
    session: Arc<LspSession>,
) {
    loop {
        let message = match read_lsp_message(&mut stdout).await {
            Ok(message) => message,
            Err(error) => {
                log::warn!(
                    "LSP stdout loop ended for session {}: {}",
                    session_id,
                    error
                );
                break;
            }
        };

        if let Some(method) = message.get("method").and_then(Value::as_str) {
            if let Some(id) = message.get("id") {
                handle_server_request(&session, &session_id, method, id, message.get("params"))
                    .await;
            } else {
                handle_server_notification(
                    &session,
                    &app,
                    &session_id,
                    method,
                    message.get("params"),
                )
                .await;
            }
            continue;
        }

        if let Some(raw_id) = message.get("id") {
            if let Some(request_id) = parse_message_id(raw_id) {
                let pending_request =
                    unregister_pending_request(session.as_ref(), request_id).await;
                if let Some(pending_request) = pending_request {
                    if take_request_canceled(session.as_ref(), request_id).await {
                        continue;
                    }
                    let _ = pending_request.sender.send(message);
                }
            }
        }
    }

    {
        let mut sessions = LSP_SESSIONS.lock().await;
        sessions.remove(&session_id);
    }
    clear_pending_state(session.as_ref()).await;
    clear_open_document_diagnostics(session.as_ref(), &app, &session_id).await;
}

async fn lsp_handle_stderr(session_id: String, stderr: ChildStderr) {
    let mut reader = BufReader::new(stderr);
    let mut line = String::new();
    loop {
        line.clear();
        match reader.read_line(&mut line).await {
            Ok(0) => break,
            Ok(_) => {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    log::debug!("LSP[{}] stderr: {}", session_id, trimmed);
                }
            }
            Err(error) => {
                log::warn!(
                    "LSP stderr read failed for session {}: {}",
                    session_id,
                    error
                );
                break;
            }
        }
    }
}

async fn get_lsp_session(session_id: &str) -> Result<Arc<LspSession>, String> {
    let sessions = LSP_SESSIONS.lock().await;
    sessions
        .get(session_id)
        .cloned()
        .ok_or_else(|| format!("LSP session not found: {}", session_id))
}

async fn remove_lsp_session(session_id: &str) -> Option<Arc<LspSession>> {
    let mut sessions = LSP_SESSIONS.lock().await;
    sessions.remove(session_id)
}

async fn terminate_lsp_session(
    session_id: &str,
    session: Arc<LspSession>,
    app: &AppHandle,
    graceful_shutdown: bool,
) {
    if graceful_shutdown {
        let _ = lsp_send_request(
            session.as_ref(),
            "shutdown",
            json!({}),
            &LspRequestMeta {
                client_request_id: None,
                timeout_ms: Some(LSP_DEFAULT_TIMEOUT_MS),
            },
        )
        .await;
        let _ = lsp_send_notification(session.as_ref(), "exit", json!({})).await;
    }

    {
        let mut child = session.child.lock().await;
        let _ = child.kill().await;
    }

    clear_pending_state(session.as_ref()).await;
    clear_open_document_diagnostics(session.as_ref(), app, session_id).await;
}

fn default_server_for_language(language: &str) -> (String, Vec<String>) {
    let normalized = normalize_language_id(language);
    match normalized.as_str() {
        "html" => (
            "vscode-html-language-server".to_string(),
            vec!["--stdio".to_string()],
        ),
        "css" => (
            "vscode-css-language-server".to_string(),
            vec!["--stdio".to_string()],
        ),
        "json" => (
            "vscode-json-language-server".to_string(),
            vec!["--stdio".to_string()],
        ),
        "eslint" => (
            "vscode-eslint-language-server".to_string(),
            vec!["--stdio".to_string()],
        ),
        _ => (
            "typescript-language-server".to_string(),
            vec!["--stdio".to_string()],
        ),
    }
}

fn normalize_location(value: &Value) -> Option<Value> {
    if !value.is_object() {
        return None;
    }

    if let (Some(uri), Some(range)) = (value.get("uri"), value.get("range")) {
        return Some(json!({ "uri": uri, "range": range }));
    }

    if let Some(target_uri) = value.get("targetUri") {
        if let Some(target_selection_range) = value.get("targetSelectionRange") {
            return Some(json!({ "uri": target_uri, "range": target_selection_range }));
        }
        if let Some(target_range) = value.get("targetRange") {
            return Some(json!({ "uri": target_uri, "range": target_range }));
        }
    }

    None
}

fn normalize_location_result(raw: Value) -> Value {
    match raw {
        Value::Array(items) => Value::Array(
            items
                .iter()
                .filter_map(normalize_location)
                .collect::<Vec<Value>>(),
        ),
        Value::Object(_) => normalize_location(&raw)
            .map(|location| Value::Array(vec![location]))
            .unwrap_or_else(|| json!([])),
        _ => json!([]),
    }
}

fn normalize_array_result(raw: Value) -> Value {
    match raw {
        Value::Array(_) => raw,
        Value::Null => json!([]),
        Value::Object(_) => Value::Array(vec![raw]),
        _ => json!([]),
    }
}

fn initialize_capabilities() -> Value {
    json!({
        "general": {
            "positionEncodings": ["utf-16"]
        },
        "workspace": {
            "workspaceFolders": true,
            "symbol": {
                "dynamicRegistration": false,
                "symbolKind": {
                    "valueSet": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26]
                }
            },
            "didChangeConfiguration": {
                "dynamicRegistration": false
            }
        },
        "textDocument": {
            "synchronization": {
                "dynamicRegistration": false,
                "didSave": true
            },
            "completion": {
                "completionItem": {
                    "snippetSupport": true,
                    "insertReplaceSupport": true,
                    "labelDetailsSupport": true,
                    "resolveSupport": {
                        "properties": ["documentation", "detail", "additionalTextEdits"]
                    },
                    "documentationFormat": ["markdown", "plaintext"]
                }
            },
            "hover": {
                "contentFormat": ["markdown", "plaintext"]
            },
            "definition": {
                "linkSupport": true
            },
            "references": {
                "dynamicRegistration": false
            },
            "rename": {
                "dynamicRegistration": false,
                "prepareSupport": true,
                "honorsChangeAnnotations": false
            },
            "implementation": {
                "linkSupport": true
            },
            "typeDefinition": {
                "linkSupport": true
            },
            "signatureHelp": {
                "signatureInformation": {
                    "documentationFormat": ["markdown", "plaintext"],
                    "parameterInformation": {
                        "labelOffsetSupport": true
                    }
                }
            },
            "documentHighlight": {
                "dynamicRegistration": false
            },
            "documentSymbol": {
                "hierarchicalDocumentSymbolSupport": true
            },
            "codeAction": {
                "codeActionLiteralSupport": {
                    "codeActionKind": {
                        "valueSet": ["", "quickfix", "refactor", "refactor.extract", "refactor.inline", "source"]
                    }
                },
                "resolveSupport": {
                    "properties": ["edit", "command", "data"]
                },
                "dataSupport": true
            },
            "formatting": {
                "dynamicRegistration": false
            },
            "inlayHint": {
                "dynamicRegistration": false
            },
            "semanticTokens": {
                "dynamicRegistration": false,
                "requests": {
                    "range": true,
                    "full": true
                },
                "tokenTypes": [
                    "namespace", "type", "class", "enum", "interface", "struct", "typeParameter",
                    "parameter", "variable", "property", "enumMember", "event", "function",
                    "method", "macro", "keyword", "modifier", "comment", "string", "number",
                    "regexp", "operator"
                ],
                "tokenModifiers": [
                    "declaration", "definition", "readonly", "static", "deprecated", "abstract",
                    "async", "modification", "documentation", "defaultLibrary"
                ],
                "formats": ["relative"],
                "multilineTokenSupport": true,
                "overlappingTokenSupport": true
            },
            "publishDiagnostics": {
                "relatedInformation": true,
                "versionSupport": true,
                "tagSupport": {
                    "valueSet": [1, 2]
                }
            }
        }
    })
}

#[tauri::command]
pub async fn lsp_start_session(
    request: LspStartSessionRequest,
    app: AppHandle,
) -> Result<LspStartSessionResponse, String> {
    let auto_install = request.auto_install.unwrap_or(true);
    let allow_fallback = request.allow_fallback.unwrap_or(true);
    let preferred_providers = request.preferred_providers.clone();
    let requested_language = request.language.clone();

    emit_server_status_changed(
        &app,
        &LspServerStatusChangedEvent {
            language_id: requested_language.clone(),
            status: "starting".to_string(),
            session_id: None,
            reason: None,
        },
    );

    let resolved_launch = if let Some(explicit_command) = request.command.clone() {
        let explicit_args = request.args.clone().unwrap_or_default();
        if !is_command_allowed(&explicit_command) {
            return Err(format!(
                "LSP_COMMAND_NOT_TRUSTED: command '{}' is not on the trusted allowlist",
                explicit_command
            ));
        }
        LspResolvedLaunch {
            language_id: request.language.clone(),
            normalized_language_id: normalize_language_id(&request.language),
            command: explicit_command,
            args: explicit_args,
            cwd: None,
            source: "explicit_request".to_string(),
            extension_id: None,
            trusted: true,
            requires_approval: false,
            npm_package: None,
        }
    } else {
        match ensure_server_ready(
            &app,
            &request.language,
            auto_install,
            preferred_providers.clone(),
        )
        .await
        {
            Ok(launch) => launch,
            Err(_error) if allow_fallback => {
                let (default_command, default_args) =
                    default_server_for_language(&request.language);
                LspResolvedLaunch {
                    language_id: request.language.clone(),
                    normalized_language_id: normalize_language_id(&request.language),
                    command: default_command,
                    args: default_args,
                    cwd: None,
                    source: "legacy_fallback".to_string(),
                    extension_id: None,
                    trusted: is_command_allowed("typescript-language-server"),
                    requires_approval: false,
                    npm_package: Some("typescript-language-server".to_string()),
                }
            }
            Err(error) => {
                emit_server_status_changed(
                    &app,
                    &LspServerStatusChangedEvent {
                        language_id: request.language.clone(),
                        status: "error".to_string(),
                        session_id: None,
                        reason: Some(error.clone()),
                    },
                );
                return Err(error);
            }
        }
    };
    let command = resolved_launch.command.clone();
    let args = resolved_launch.args.clone();

    let workspace_folders = derive_workspace_folders(
        request.root_uri.as_deref(),
        request.workspace_folders.as_deref(),
    );
    let root_uri = request
        .root_uri
        .clone()
        .or_else(|| workspace_folders.first().cloned());

    let mut process = Command::new(&command);
    process
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    let mut child = process
        .spawn()
        .map_err(|e| format!("Failed to start language server '{}': {}", command, e))?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "Failed to capture LSP stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture LSP stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture LSP stderr".to_string())?;

    let session_id = Uuid::new_v4().to_string();
    let session = Arc::new(LspSession {
        stdin: Arc::new(Mutex::new(stdin)),
        child: Arc::new(Mutex::new(child)),
        pending: Arc::new(Mutex::new(HashMap::new())),
        client_request_index: Arc::new(Mutex::new(HashMap::new())),
        canceled_request_ids: Arc::new(Mutex::new(HashSet::new())),
        next_id: AtomicI64::new(1),
        server_capabilities: Arc::new(Mutex::new(json!({}))),
        text_document_sync_kind: Arc::new(Mutex::new(LspTextDocumentSyncKind::Full)),
        open_documents: Arc::new(Mutex::new(HashMap::new())),
        root_uri: root_uri.clone(),
        workspace_folders: workspace_folders.clone(),
    });

    {
        let mut sessions = LSP_SESSIONS.lock().await;
        sessions.insert(session_id.clone(), session.clone());
    }

    tokio::spawn(lsp_handle_stdout(
        session_id.clone(),
        app.clone(),
        stdout,
        session.clone(),
    ));
    tokio::spawn(lsp_handle_stderr(session_id.clone(), stderr));

    let initialize_params = json!({
        "processId": Value::Null,
        "rootUri": root_uri,
        "workspaceFolders": build_workspace_folders_payload(&workspace_folders),
        "initializationOptions": request.initialization_options,
        "clientInfo": {
            "name": "cognia-designer",
            "version": "0.1.0"
        },
        "capabilities": initialize_capabilities(),
    });

    let initialize_result = match lsp_send_request(
        session.as_ref(),
        "initialize",
        initialize_params,
        &LspRequestMeta {
            client_request_id: None,
            timeout_ms: Some(LSP_INITIALIZE_TIMEOUT_MS),
        },
    )
    .await
    {
        Ok(result) => result,
        Err(error) => {
            if let Some(existing_session) = remove_lsp_session(&session_id).await {
                terminate_lsp_session(&session_id, existing_session, &app, false).await;
            }
            emit_server_status_changed(
                &app,
                &LspServerStatusChangedEvent {
                    language_id: request.language.clone(),
                    status: "error".to_string(),
                    session_id: Some(session_id.clone()),
                    reason: Some(error.clone()),
                },
            );
            return Err(error);
        }
    };

    let server_capabilities = extract_server_capabilities(&initialize_result);
    {
        let mut capabilities = session.server_capabilities.lock().await;
        *capabilities = server_capabilities.clone();
    }
    {
        let mut sync_kind = session.text_document_sync_kind.lock().await;
        *sync_kind = parse_text_document_sync_kind(&server_capabilities);
    }

    if let Err(error) = lsp_send_notification(session.as_ref(), "initialized", json!({})).await {
        if let Some(existing_session) = remove_lsp_session(&session_id).await {
            terminate_lsp_session(&session_id, existing_session, &app, false).await;
        }
        emit_server_status_changed(
            &app,
            &LspServerStatusChangedEvent {
                language_id: request.language.clone(),
                status: "error".to_string(),
                session_id: Some(session_id.clone()),
                reason: Some(error.clone()),
            },
        );
        return Err(error);
    }

    emit_server_status_changed(
        &app,
        &LspServerStatusChangedEvent {
            language_id: requested_language,
            status: "connected".to_string(),
            session_id: Some(session_id.clone()),
            reason: Some(format!("using {}", resolved_launch.source)),
        },
    );

    Ok(LspStartSessionResponse {
        session_id,
        capabilities: initialize_result,
        resolved_command: Some(command),
        resolved_args: Some(args),
    })
}

#[tauri::command]
pub async fn lsp_registry_search(
    request: LspRegistrySearchRequest,
) -> Result<Vec<super::lsp_registry::LspRegistryEntry>, String> {
    registry_search(request).await
}

#[tauri::command]
pub async fn lsp_registry_get_recommended(
    language_id: String,
    providers: Option<Vec<LspProvider>>,
) -> Result<LspRegistryRecommendedResponse, String> {
    recommended_servers(&language_id, providers).await
}

#[tauri::command]
pub async fn lsp_install_server(
    request: LspInstallServerRequest,
    app: AppHandle,
) -> Result<LspInstallServerResult, String> {
    install_server(&app, request).await
}

#[tauri::command]
pub fn lsp_uninstall_server(
    request: LspUninstallServerRequest,
    app: AppHandle,
) -> Result<bool, String> {
    uninstall_server(&app, request)
}

#[tauri::command]
pub fn lsp_list_installed_servers(
    app: AppHandle,
) -> Result<Vec<super::lsp_installer::InstalledServerRecord>, String> {
    list_installed_servers(&app)
}

#[tauri::command]
pub fn lsp_get_server_status(
    request: LspGetServerStatusRequest,
    app: AppHandle,
) -> Result<LspServerStatusResponse, String> {
    get_server_status(&app, request)
}

#[tauri::command]
pub fn lsp_resolve_launch(
    request: LspResolveLaunchRequest,
    app: AppHandle,
) -> Result<LspResolvedLaunch, String> {
    resolve_launch(&app, request)
}

#[tauri::command]
pub async fn lsp_open_document(request: LspOpenDocumentRequest) -> Result<(), String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri,
            "languageId": request.language_id,
            "version": request.version,
            "text": request.text
        }
    });
    lsp_send_notification(session.as_ref(), "textDocument/didOpen", params).await?;

    let mut open_documents = session.open_documents.lock().await;
    open_documents.insert(request.uri, request.version);
    Ok(())
}

#[tauri::command]
pub async fn lsp_change_document(request: LspChangeDocumentRequest) -> Result<(), String> {
    let session = get_lsp_session(&request.session_id).await?;
    let _ = &request.meta;
    let sync_kind = *session.text_document_sync_kind.lock().await;
    let content_changes =
        build_did_change_content_changes(sync_kind, &request.text, request.changes.as_deref());

    let params = json!({
        "textDocument": {
            "uri": request.uri,
            "version": request.version
        },
        "contentChanges": content_changes
    });
    lsp_send_notification(session.as_ref(), "textDocument/didChange", params).await?;

    let mut open_documents = session.open_documents.lock().await;
    open_documents.insert(request.uri, request.version);
    Ok(())
}

#[tauri::command]
pub async fn lsp_close_document(
    request: LspCloseDocumentRequest,
    app: AppHandle,
) -> Result<(), String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        }
    });
    let send_result =
        lsp_send_notification(session.as_ref(), "textDocument/didClose", params).await;

    {
        let mut open_documents = session.open_documents.lock().await;
        open_documents.remove(&request.uri);
    }
    emit_clear_diagnostics(&app, &request.session_id, &request.uri).await;
    send_result
}

#[tauri::command]
pub async fn lsp_cancel_request(request: LspCancelRequestCommand) -> Result<(), String> {
    let session = get_lsp_session(&request.session_id).await?;

    let request_id = {
        let mut client_request_index = session.client_request_index.lock().await;
        resolve_request_id_for_client(&mut client_request_index, &request.client_request_id)
    };

    let Some(request_id) = request_id else {
        return Ok(());
    };

    mark_request_canceled(session.as_ref(), request_id).await;
    let _ = unregister_pending_request(session.as_ref(), request_id).await;
    let _ = lsp_send_notification(
        session.as_ref(),
        "$/cancelRequest",
        json!({ "id": request_id }),
    )
    .await;
    Ok(())
}

#[tauri::command]
pub async fn lsp_completion(request: LspPositionRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "position": {
            "line": request.line,
            "character": request.character
        }
    });
    lsp_send_request(
        session.as_ref(),
        "textDocument/completion",
        params,
        &request.meta,
    )
    .await
}

#[tauri::command]
pub async fn lsp_hover(request: LspPositionRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "position": {
            "line": request.line,
            "character": request.character
        }
    });
    lsp_send_request(
        session.as_ref(),
        "textDocument/hover",
        params,
        &request.meta,
    )
    .await
}

#[tauri::command]
pub async fn lsp_definition(request: LspPositionRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "position": {
            "line": request.line,
            "character": request.character
        }
    });

    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/definition",
        params,
        &request.meta,
    )
    .await?;
    Ok(normalize_location_result(raw))
}

#[tauri::command]
pub async fn lsp_references(request: LspReferencesRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "position": {
            "line": request.line,
            "character": request.character
        },
        "context": {
            "includeDeclaration": request.include_declaration.unwrap_or(true)
        }
    });

    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/references",
        params,
        &request.meta,
    )
    .await?;
    Ok(normalize_location_result(raw))
}

#[tauri::command]
pub async fn lsp_rename(request: LspRenameRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "position": {
            "line": request.line,
            "character": request.character
        },
        "newName": request.new_name
    });

    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/rename",
        params,
        &request.meta,
    )
    .await?;
    if raw.is_null() {
        return Ok(json!({}));
    }
    Ok(raw)
}

#[tauri::command]
pub async fn lsp_implementation(request: LspPositionRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "position": {
            "line": request.line,
            "character": request.character
        }
    });

    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/implementation",
        params,
        &request.meta,
    )
    .await?;
    Ok(normalize_location_result(raw))
}

#[tauri::command]
pub async fn lsp_type_definition(request: LspPositionRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "position": {
            "line": request.line,
            "character": request.character
        }
    });

    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/typeDefinition",
        params,
        &request.meta,
    )
    .await?;
    Ok(normalize_location_result(raw))
}

#[tauri::command]
pub async fn lsp_signature_help(request: LspPositionRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "position": {
            "line": request.line,
            "character": request.character
        }
    });

    lsp_send_request(
        session.as_ref(),
        "textDocument/signatureHelp",
        params,
        &request.meta,
    )
    .await
}

#[tauri::command]
pub async fn lsp_document_highlights(request: LspPositionRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "position": {
            "line": request.line,
            "character": request.character
        }
    });

    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/documentHighlight",
        params,
        &request.meta,
    )
    .await?;

    Ok(normalize_array_result(raw))
}

#[tauri::command]
pub async fn lsp_document_symbols(request: LspDocumentRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        }
    });
    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/documentSymbol",
        params,
        &request.meta,
    )
    .await?;
    if raw.is_null() {
        return Ok(json!([]));
    }
    Ok(raw)
}

#[tauri::command]
pub async fn lsp_format_document(request: LspFormatDocumentRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "options": {
            "tabSize": request.tab_size.unwrap_or(2),
            "insertSpaces": request.insert_spaces.unwrap_or(true)
        }
    });
    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/formatting",
        params,
        &request.meta,
    )
    .await?;
    if raw.is_null() {
        return Ok(json!([]));
    }
    Ok(raw)
}

#[tauri::command]
pub async fn lsp_inlay_hints(request: LspInlayHintsRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "range": {
            "start": {
                "line": request.range.start.line,
                "character": request.range.start.character
            },
            "end": {
                "line": request.range.end.line,
                "character": request.range.end.character
            }
        }
    });

    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/inlayHint",
        params,
        &request.meta,
    )
    .await?;
    Ok(normalize_array_result(raw))
}

#[tauri::command]
pub async fn lsp_semantic_tokens_full(request: LspDocumentRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        }
    });
    lsp_send_request(
        session.as_ref(),
        "textDocument/semanticTokens/full",
        params,
        &request.meta,
    )
    .await
}

#[tauri::command]
pub async fn lsp_code_actions(request: LspCodeActionsRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        },
        "range": {
            "start": {
                "line": request.range.start.line,
                "character": request.range.start.character
            },
            "end": {
                "line": request.range.end.line,
                "character": request.range.end.character
            }
        },
        "context": {
            "diagnostics": request.diagnostics.unwrap_or_default(),
            "triggerKind": 1
        }
    });

    let raw = lsp_send_request(
        session.as_ref(),
        "textDocument/codeAction",
        params,
        &request.meta,
    )
    .await?;
    if raw.is_null() {
        return Ok(json!([]));
    }
    Ok(raw)
}

#[tauri::command]
pub async fn lsp_workspace_symbols(request: LspWorkspaceSymbolsRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "query": request.query
    });
    let raw = lsp_send_request(session.as_ref(), "workspace/symbol", params, &request.meta).await?;
    if raw.is_null() {
        return Ok(json!([]));
    }
    Ok(raw)
}

#[tauri::command]
pub async fn lsp_execute_command(request: LspExecuteCommandRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "command": request.command,
        "arguments": request.arguments.unwrap_or_default()
    });
    lsp_send_request(
        session.as_ref(),
        "workspace/executeCommand",
        params,
        &request.meta,
    )
    .await
}

#[tauri::command]
pub async fn lsp_resolve_code_action(
    request: LspResolveCodeActionRequest,
) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let raw = lsp_send_request(
        session.as_ref(),
        "codeAction/resolve",
        request.action,
        &request.meta,
    )
    .await?;
    if raw.is_null() {
        return Ok(json!({}));
    }
    Ok(raw)
}

#[tauri::command]
pub async fn lsp_shutdown_session(
    request: LspShutdownSessionRequest,
    app: AppHandle,
) -> Result<(), String> {
    let Some(session) = remove_lsp_session(&request.session_id).await else {
        return Ok(());
    };

    terminate_lsp_session(&request.session_id, session, &app, true).await;
    emit_server_status_changed(
        &app,
        &LspServerStatusChangedEvent {
            language_id: "unknown".to_string(),
            status: "disconnected".to_string(),
            session_id: Some(request.session_id),
            reason: None,
        },
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_text_document_sync_kind_from_number_and_object() {
        let numeric_caps = json!({ "textDocumentSync": 2 });
        assert_eq!(
            parse_text_document_sync_kind(&numeric_caps),
            LspTextDocumentSyncKind::Incremental
        );

        let object_caps = json!({ "textDocumentSync": { "change": 1 } });
        assert_eq!(
            parse_text_document_sync_kind(&object_caps),
            LspTextDocumentSyncKind::Full
        );
    }

    #[test]
    fn builds_did_change_payload_for_incremental_and_full() {
        let incremental_changes = vec![LspTextDocumentContentChangeEvent {
            range: Some(LspRangeRequest {
                start: LspRangePosition {
                    line: 0,
                    character: 1,
                },
                end: LspRangePosition {
                    line: 0,
                    character: 3,
                },
            }),
            range_length: Some(2),
            text: "xy".to_string(),
        }];

        let incremental_payload = build_did_change_content_changes(
            LspTextDocumentSyncKind::Incremental,
            "const value = 1;",
            Some(&incremental_changes),
        );
        assert_eq!(incremental_payload.len(), 1);
        assert_eq!(incremental_payload[0]["text"], "xy");
        assert!(incremental_payload[0].get("range").is_some());

        let full_payload = build_did_change_content_changes(
            LspTextDocumentSyncKind::Full,
            "const full = true;",
            Some(&incremental_changes),
        );
        assert_eq!(full_payload, vec![json!({ "text": "const full = true;" })]);
    }

    #[test]
    fn resolves_client_request_id_mapping_for_cancel() {
        let mut client_request_index = HashMap::new();
        client_request_index.insert("completion:1".to_string(), 42);
        assert_eq!(
            resolve_request_id_for_client(&mut client_request_index, "completion:1"),
            Some(42)
        );
        assert_eq!(
            resolve_request_id_for_client(&mut client_request_index, "completion:1"),
            None
        );
    }

    #[test]
    fn builds_server_request_router_responses() {
        let workspace_folders = vec!["file:///workspace".to_string()];
        let configuration_response = build_server_request_response(
            "workspace/configuration",
            &json!(7),
            Some(&json!({ "items": [{}, {}] })),
            &workspace_folders,
        );
        assert_eq!(configuration_response["result"], json!([{}, {}]));

        let folders_response = build_server_request_response(
            "workspace/workspaceFolders",
            &json!(9),
            None,
            &workspace_folders,
        );
        assert_eq!(
            folders_response["result"],
            json!([{
                "uri": "file:///workspace",
                "name": "workspace"
            }])
        );

        let progress_response = build_server_request_response(
            "window/workDoneProgress/create",
            &json!(10),
            Some(&json!({})),
            &workspace_folders,
        );
        assert!(progress_response["result"].is_null());
    }

    #[test]
    fn returns_method_not_found_for_unknown_server_request() {
        let response = build_server_request_response("unknown/method", &json!(1), None, &[]);
        assert_eq!(response["error"]["code"], -32601);
    }

    #[test]
    fn clears_open_document_diagnostics_state() {
        let mut open_documents = HashMap::new();
        open_documents.insert("file:///a.ts".to_string(), 1);
        open_documents.insert("file:///b.ts".to_string(), 3);

        let mut uris = take_open_document_uris(&mut open_documents);
        uris.sort();

        assert_eq!(
            uris,
            vec!["file:///a.ts".to_string(), "file:///b.ts".to_string()]
        );
        assert!(open_documents.is_empty());
    }

    #[test]
    fn resolves_default_server_for_extended_languages() {
        let (command, args) = default_server_for_language("html");
        assert_eq!(command, "vscode-html-language-server");
        assert_eq!(args, vec!["--stdio".to_string()]);

        let (command, args) = default_server_for_language("typescriptreact");
        assert_eq!(command, "typescript-language-server");
        assert_eq!(args, vec!["--stdio".to_string()]);
    }

    #[test]
    fn normalizes_array_like_lsp_results() {
        assert_eq!(normalize_array_result(Value::Null), json!([]));
        assert_eq!(
            normalize_array_result(
                json!({ "range": { "start": { "line": 0, "character": 0 }, "end": { "line": 0, "character": 1 } } })
            ),
            json!([{ "range": { "start": { "line": 0, "character": 0 }, "end": { "line": 0, "character": 1 } } }])
        );
        assert_eq!(
            normalize_array_result(json!([{"kind": 2}])),
            json!([{"kind": 2}])
        );
    }
}
