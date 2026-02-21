//! LSP installer and runtime status event helpers.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LspInstallProgressStatus {
    Pending,
    Connecting,
    Downloading,
    Verifying,
    Extracting,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspInstallProgressEvent {
    pub task_id: String,
    pub status: LspInstallProgressStatus,
    pub provider: String,
    pub extension_id: String,
    pub language_id: Option<String>,
    pub total_bytes: u64,
    pub downloaded_bytes: u64,
    pub percent: f64,
    pub speed_bps: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspServerStatusChangedEvent {
    pub language_id: String,
    pub status: String,
    pub session_id: Option<String>,
    pub reason: Option<String>,
}

pub fn emit_install_progress(app: &AppHandle, event: &LspInstallProgressEvent) {
    let _ = app.emit("lsp-install-progress", event);
}

pub fn emit_server_status_changed(app: &AppHandle, event: &LspServerStatusChangedEvent) {
    let _ = app.emit("lsp-server-status-changed", event);
}
