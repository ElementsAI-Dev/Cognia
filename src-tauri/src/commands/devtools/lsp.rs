//! LSP commands for desktop Monaco integration.
//!
//! This module provides protocol-level language server support over stdio.

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStderr, ChildStdin, ChildStdout, Command};
use tokio::sync::{oneshot, Mutex};
use tokio::time::{timeout, Duration};
use uuid::Uuid;

const LSP_RESPONSE_TIMEOUT_SECS: u64 = 10;
const LSP_MAX_HEADER_BYTES: usize = 16 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspStartSessionRequest {
    pub language: String,
    pub root_uri: Option<String>,
    pub workspace_folders: Option<Vec<String>>,
    pub initialization_options: Option<Value>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspStartSessionResponse {
    pub session_id: String,
    pub capabilities: Value,
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
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspCloseDocumentRequest {
    pub session_id: String,
    pub uri: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspPositionRequest {
    pub session_id: String,
    pub uri: String,
    pub line: u32,
    pub character: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspDocumentRequest {
    pub session_id: String,
    pub uri: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspFormatDocumentRequest {
    pub session_id: String,
    pub uri: String,
    pub tab_size: Option<u32>,
    pub insert_spaces: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRangePosition {
    pub line: u32,
    pub character: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRangeRequest {
    pub start: LspRangePosition,
    pub end: LspRangePosition,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspCodeActionsRequest {
    pub session_id: String,
    pub uri: String,
    pub range: LspRangeRequest,
    pub diagnostics: Option<Vec<Value>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspWorkspaceSymbolsRequest {
    pub session_id: String,
    pub query: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspExecuteCommandRequest {
    pub session_id: String,
    pub command: String,
    pub arguments: Option<Vec<Value>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspResolveCodeActionRequest {
    pub session_id: String,
    pub action: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspShutdownSessionRequest {
    pub session_id: String,
}

struct LspSession {
    stdin: Arc<Mutex<ChildStdin>>,
    child: Arc<Mutex<Child>>,
    pending: Arc<Mutex<HashMap<i64, oneshot::Sender<Value>>>>,
    next_id: AtomicI64,
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

async fn lsp_send_request(
    session: &LspSession,
    method: &str,
    params: Value,
) -> Result<Value, String> {
    let request_id = session.next_id.fetch_add(1, Ordering::SeqCst);
    let (tx, rx) = oneshot::channel::<Value>();
    {
        let mut pending = session.pending.lock().await;
        pending.insert(request_id, tx);
    }

    let message = json!({
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": params,
    });

    if let Err(error) = write_lsp_message(&session.stdin, &message).await {
        let mut pending = session.pending.lock().await;
        pending.remove(&request_id);
        return Err(error);
    }

    let response = match timeout(Duration::from_secs(LSP_RESPONSE_TIMEOUT_SECS), rx).await {
        Ok(Ok(response)) => response,
        Ok(Err(_)) => {
            let mut pending = session.pending.lock().await;
            pending.remove(&request_id);
            return Err(format!("LSP request '{}' channel closed", method));
        }
        Err(_) => {
            let mut pending = session.pending.lock().await;
            pending.remove(&request_id);
            return Err(format!("LSP request '{}' timed out", method));
        }
    };

    if let Some(error) = response.get("error") {
        return Err(format!("LSP error in '{}': {}", method, error));
    }

    Ok(response.get("result").cloned().unwrap_or(Value::Null))
}

async fn lsp_handle_stdout(
    session_id: String,
    app: AppHandle,
    mut stdout: ChildStdout,
    pending: Arc<Mutex<HashMap<i64, oneshot::Sender<Value>>>>,
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
            if method == "textDocument/publishDiagnostics" {
                if let Some(params) = message.get("params") {
                    let payload = json!({
                        "sessionId": session_id,
                        "uri": params.get("uri").cloned().unwrap_or(Value::Null),
                        "diagnostics": params.get("diagnostics").cloned().unwrap_or_else(|| json!([])),
                        "version": params.get("version").cloned().unwrap_or(Value::Null),
                    });
                    let _ = app.emit("lsp://diagnostics", payload);
                }
            }
            continue;
        }

        if let Some(raw_id) = message.get("id") {
            if let Some(id) = parse_message_id(raw_id) {
                let sender = {
                    let mut pending_map = pending.lock().await;
                    pending_map.remove(&id)
                };
                if let Some(tx) = sender {
                    let _ = tx.send(message);
                }
            }
        }
    }

    {
        let mut sessions = LSP_SESSIONS.lock().await;
        sessions.remove(&session_id);
    }

    {
        let mut pending_map = pending.lock().await;
        pending_map.clear();
    }
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

async fn terminate_lsp_session(session: Arc<LspSession>, graceful_shutdown: bool) {
    if graceful_shutdown {
        let _ = lsp_send_request(session.as_ref(), "shutdown", json!({})).await;
        let _ = lsp_send_notification(session.as_ref(), "exit", json!({})).await;
    }

    {
        let mut child = session.child.lock().await;
        let _ = child.kill().await;
    }

    {
        let mut pending = session.pending.lock().await;
        pending.clear();
    }
}

fn default_server_for_language(language: &str) -> (String, Vec<String>) {
    let normalized = language.to_lowercase();
    if normalized.contains("typescript") || normalized.contains("javascript") {
        return (
            "typescript-language-server".to_string(),
            vec!["--stdio".to_string()],
        );
    }

    (
        "typescript-language-server".to_string(),
        vec!["--stdio".to_string()],
    )
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

#[tauri::command]
pub async fn lsp_start_session(
    request: LspStartSessionRequest,
    app: AppHandle,
) -> Result<LspStartSessionResponse, String> {
    let (default_command, default_args) = default_server_for_language(&request.language);
    let command = request.command.unwrap_or(default_command);
    let args = request.args.unwrap_or(default_args);

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
    let pending = Arc::new(Mutex::new(HashMap::<i64, oneshot::Sender<Value>>::new()));

    let session = Arc::new(LspSession {
        stdin: Arc::new(Mutex::new(stdin)),
        child: Arc::new(Mutex::new(child)),
        pending: pending.clone(),
        next_id: AtomicI64::new(1),
    });

    {
        let mut sessions = LSP_SESSIONS.lock().await;
        sessions.insert(session_id.clone(), session.clone());
    }

    tokio::spawn(lsp_handle_stdout(
        session_id.clone(),
        app.clone(),
        stdout,
        pending,
    ));
    tokio::spawn(lsp_handle_stderr(session_id.clone(), stderr));

    let initialize_params = json!({
        "processId": Value::Null,
        "rootUri": request.root_uri,
        "workspaceFolders": request.workspace_folders,
        "initializationOptions": request.initialization_options,
        "clientInfo": {
            "name": "cognia-designer",
            "version": "0.1.0"
        },
        "capabilities": {
            "textDocument": {
                "completion": {
                    "completionItem": {
                        "snippetSupport": true,
                        "documentationFormat": ["markdown", "plaintext"]
                    }
                },
                "hover": {
                    "contentFormat": ["markdown", "plaintext"]
                },
                "definition": {
                    "linkSupport": true
                },
                "documentSymbol": {
                    "hierarchicalDocumentSymbolSupport": true
                },
                "codeAction": {
                    "codeActionLiteralSupport": {
                        "codeActionKind": {
                            "valueSet": ["", "quickfix", "refactor", "refactor.extract", "refactor.inline", "source"]
                        }
                    }
                },
                "formatting": {
                    "dynamicRegistration": false
                },
                "publishDiagnostics": {
                    "relatedInformation": true
                }
            },
            "workspace": {
                "workspaceFolders": true,
                "symbol": true
            }
        }
    });

    let capabilities =
        match lsp_send_request(session.as_ref(), "initialize", initialize_params).await {
            Ok(capabilities) => capabilities,
            Err(error) => {
                if let Some(s) = remove_lsp_session(&session_id).await {
                    terminate_lsp_session(s, false).await;
                }
                return Err(error);
            }
        };

    if let Err(error) = lsp_send_notification(session.as_ref(), "initialized", json!({})).await {
        if let Some(s) = remove_lsp_session(&session_id).await {
            terminate_lsp_session(s, false).await;
        }
        return Err(error);
    }

    Ok(LspStartSessionResponse {
        session_id,
        capabilities,
    })
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
    lsp_send_notification(session.as_ref(), "textDocument/didOpen", params).await
}

#[tauri::command]
pub async fn lsp_change_document(request: LspChangeDocumentRequest) -> Result<(), String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri,
            "version": request.version
        },
        "contentChanges": [
            {
                "text": request.text
            }
        ]
    });
    lsp_send_notification(session.as_ref(), "textDocument/didChange", params).await
}

#[tauri::command]
pub async fn lsp_close_document(request: LspCloseDocumentRequest) -> Result<(), String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        }
    });
    lsp_send_notification(session.as_ref(), "textDocument/didClose", params).await
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
    lsp_send_request(session.as_ref(), "textDocument/completion", params).await
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
    lsp_send_request(session.as_ref(), "textDocument/hover", params).await
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

    let raw = lsp_send_request(session.as_ref(), "textDocument/definition", params).await?;
    Ok(normalize_location_result(raw))
}

#[tauri::command]
pub async fn lsp_document_symbols(request: LspDocumentRequest) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let params = json!({
        "textDocument": {
            "uri": request.uri
        }
    });
    let raw = lsp_send_request(session.as_ref(), "textDocument/documentSymbol", params).await?;
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
    let raw = lsp_send_request(session.as_ref(), "textDocument/formatting", params).await?;
    if raw.is_null() {
        return Ok(json!([]));
    }
    Ok(raw)
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

    let raw = lsp_send_request(session.as_ref(), "textDocument/codeAction", params).await?;
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
    let raw = lsp_send_request(session.as_ref(), "workspace/symbol", params).await?;
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
    lsp_send_request(session.as_ref(), "workspace/executeCommand", params).await
}

#[tauri::command]
pub async fn lsp_resolve_code_action(
    request: LspResolveCodeActionRequest,
) -> Result<Value, String> {
    let session = get_lsp_session(&request.session_id).await?;
    let raw = lsp_send_request(session.as_ref(), "codeAction/resolve", request.action).await?;
    if raw.is_null() {
        return Ok(json!({}));
    }
    Ok(raw)
}

#[tauri::command]
pub async fn lsp_shutdown_session(request: LspShutdownSessionRequest) -> Result<(), String> {
    let Some(session) = remove_lsp_session(&request.session_id).await else {
        return Ok(());
    };

    terminate_lsp_session(session, true).await;
    Ok(())
}
