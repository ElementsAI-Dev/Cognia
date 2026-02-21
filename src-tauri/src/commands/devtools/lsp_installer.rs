//! LSP server installation, indexing and status queries.

use super::lsp_events::{
    emit_install_progress, emit_server_status_changed, LspInstallProgressEvent,
    LspInstallProgressStatus, LspServerStatusChangedEvent,
};
use super::lsp_registry::{resolve_download_asset, RegistryDownloadAsset};
use super::lsp_resolver::{
    normalize_language_id, recommended_extension_id, resolve_launch_for_language,
    resolve_launch_from_installed_package, supported_language, LspProvider, LspResolvedLaunch,
};
use crate::http::create_proxy_client_long;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;
use tauri::AppHandle;
use tauri::Manager;
use uuid::Uuid;
use zip::ZipArchive;

const INDEX_FILE_NAME: &str = "installed-index.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspInstallServerRequest {
    pub extension_id: String,
    pub language_id: Option<String>,
    pub version: Option<String>,
    pub provider: Option<LspProvider>,
    pub expected_sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspInstallServerResult {
    pub extension_id: String,
    pub language_id: Option<String>,
    pub provider: String,
    pub version: String,
    pub install_path: String,
    pub launch: Option<LspResolvedLaunch>,
    pub verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspUninstallServerRequest {
    pub extension_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspGetServerStatusRequest {
    pub language_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspResolveLaunchRequest {
    pub language_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspServerStatusResponse {
    pub language_id: String,
    pub normalized_language_id: String,
    pub supported: bool,
    pub installed: bool,
    pub ready: bool,
    pub provider: Option<String>,
    pub extension_id: Option<String>,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub needs_approval: bool,
    pub reason: Option<String>,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledServerRecord {
    pub extension_id: String,
    pub provider: String,
    pub version: String,
    pub install_path: String,
    pub manifest_path: String,
    pub target_platform: Option<String>,
    pub installed_at: String,
    pub sha256: Option<String>,
    pub languages: Vec<String>,
    pub launch: Option<LspResolvedLaunch>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct InstalledServerIndex {
    pub servers: Vec<InstalledServerRecord>,
    pub allowed_commands: Vec<String>,
    pub updated_at: Option<String>,
}

fn now_rfc3339() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn lsp_root_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {}", error))?;
    Ok(app_data_dir.join("lsp"))
}

fn lsp_servers_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(lsp_root_dir(app)?.join("servers"))
}

fn lsp_downloads_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(lsp_root_dir(app)?.join("downloads"))
}

fn lsp_index_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(lsp_root_dir(app)?.join(INDEX_FILE_NAME))
}

fn ensure_lsp_dirs(app: &AppHandle) -> Result<(), String> {
    let root = lsp_root_dir(app)?;
    fs::create_dir_all(root.join("servers"))
        .map_err(|error| format!("Failed to create LSP servers directory: {}", error))?;
    fs::create_dir_all(root.join("downloads"))
        .map_err(|error| format!("Failed to create LSP download directory: {}", error))?;
    Ok(())
}

fn load_index(app: &AppHandle) -> Result<InstalledServerIndex, String> {
    ensure_lsp_dirs(app)?;
    let path = lsp_index_path(app)?;
    if !path.exists() {
        return Ok(InstalledServerIndex::default());
    }
    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read LSP index: {}", error))?;
    serde_json::from_str(&content).map_err(|error| format!("Failed to parse LSP index: {}", error))
}

fn save_index(app: &AppHandle, mut index: InstalledServerIndex) -> Result<(), String> {
    ensure_lsp_dirs(app)?;
    index.updated_at = Some(now_rfc3339());
    let path = lsp_index_path(app)?;
    let temp_path = path.with_extension("tmp");
    let content = serde_json::to_string_pretty(&index)
        .map_err(|error| format!("Failed to serialize LSP index: {}", error))?;
    fs::write(&temp_path, content)
        .map_err(|error| format!("Failed to write temp index: {}", error))?;
    fs::rename(&temp_path, &path)
        .map_err(|error| format!("Failed to move temp index: {}", error))?;
    Ok(())
}

fn compute_sha256(file_path: &Path) -> Result<String, String> {
    let mut file = File::open(file_path)
        .map_err(|error| format!("Failed to open file for checksum: {}", error))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|error| format!("Failed to read file for checksum: {}", error))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn extract_vsix_archive(vsix_path: &Path, extract_dir: &Path) -> Result<(), String> {
    let file = File::open(vsix_path).map_err(|error| format!("Failed to open VSIX: {}", error))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|error| format!("Failed to parse VSIX archive: {}", error))?;
    fs::create_dir_all(extract_dir)
        .map_err(|error| format!("Failed to create extraction directory: {}", error))?;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|error| format!("Failed to read VSIX entry: {}", error))?;
        let out_path = match entry.enclosed_name() {
            Some(path) => extract_dir.join(path),
            None => continue,
        };

        if entry.name().ends_with('/') {
            fs::create_dir_all(&out_path)
                .map_err(|error| format!("Failed to create extracted folder: {}", error))?;
            continue;
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Failed to create extracted parent folder: {}", error))?;
        }
        let mut output = File::create(&out_path)
            .map_err(|error| format!("Failed to create extracted file: {}", error))?;
        std::io::copy(&mut entry, &mut output)
            .map_err(|error| format!("Failed to write extracted file: {}", error))?;
    }
    Ok(())
}

fn read_manifest_from_extract_dir(extract_dir: &Path) -> Result<(PathBuf, Value), String> {
    let candidates = [
        extract_dir.join("extension").join("package.json"),
        extract_dir.join("package.json"),
    ];
    let manifest_path = candidates
        .iter()
        .find(|path| path.exists())
        .cloned()
        .ok_or_else(|| "VSIX manifest package.json not found".to_string())?;
    let content = fs::read_to_string(&manifest_path)
        .map_err(|error| format!("Failed to read package.json: {}", error))?;
    let manifest = serde_json::from_str::<Value>(&content)
        .map_err(|error| format!("Failed to parse package.json: {}", error))?;
    Ok((manifest_path, manifest))
}

fn extract_manifest_languages(manifest: &Value) -> Vec<String> {
    manifest
        .get("contributes")
        .and_then(|value| value.get("languages"))
        .and_then(Value::as_array)
        .map(|languages| {
            languages
                .iter()
                .filter_map(|language| language.get("id").and_then(Value::as_str))
                .map(normalize_language_id)
                .collect::<Vec<String>>()
        })
        .unwrap_or_default()
}

async fn download_vsix(
    app: &AppHandle,
    asset: &RegistryDownloadAsset,
    task_id: &str,
    language_id: Option<&str>,
) -> Result<PathBuf, String> {
    ensure_lsp_dirs(app)?;
    let downloads_dir = lsp_downloads_dir(app)?;
    let file_name = format!(
        "{}-{}-{}.vsix",
        asset.extension_id.replace('.', "_"),
        asset.version,
        task_id
    );
    let vsix_path = downloads_dir.join(file_name);

    emit_install_progress(
        app,
        &LspInstallProgressEvent {
            task_id: task_id.to_string(),
            status: LspInstallProgressStatus::Connecting,
            provider: asset.provider.as_str().to_string(),
            extension_id: asset.extension_id.clone(),
            language_id: language_id.map(ToString::to_string),
            total_bytes: 0,
            downloaded_bytes: 0,
            percent: 0.0,
            speed_bps: 0,
            error: None,
        },
    );

    let client = create_proxy_client_long()
        .map_err(|error| format!("Failed to create LSP download client: {}", error))?;
    let response = client
        .get(&asset.download_url)
        .send()
        .await
        .map_err(|error| format!("Failed to download VSIX package: {}", error))?;
    if !response.status().is_success() {
        return Err(format!(
            "Failed to download VSIX package, status {}",
            response.status()
        ));
    }
    let total_bytes = response.content_length().unwrap_or(0);
    let mut downloaded_bytes = 0u64;
    let mut last_emit = Instant::now();
    let start = Instant::now();

    let mut output = File::create(&vsix_path)
        .map_err(|error| format!("Failed to create VSIX file: {}", error))?;
    let mut stream = response.bytes_stream();
    while let Some(chunk_result) = stream.next().await {
        let chunk =
            chunk_result.map_err(|error| format!("Failed to stream VSIX chunk: {}", error))?;
        output
            .write_all(&chunk)
            .map_err(|error| format!("Failed to write VSIX chunk: {}", error))?;
        downloaded_bytes += chunk.len() as u64;

        if last_emit.elapsed().as_millis() >= 100 {
            let elapsed_secs = start.elapsed().as_secs_f64().max(0.001);
            let speed_bps = (downloaded_bytes as f64 / elapsed_secs) as u64;
            let percent = if total_bytes > 0 {
                downloaded_bytes as f64 / total_bytes as f64 * 100.0
            } else {
                0.0
            };
            emit_install_progress(
                app,
                &LspInstallProgressEvent {
                    task_id: task_id.to_string(),
                    status: LspInstallProgressStatus::Downloading,
                    provider: asset.provider.as_str().to_string(),
                    extension_id: asset.extension_id.clone(),
                    language_id: language_id.map(ToString::to_string),
                    total_bytes,
                    downloaded_bytes,
                    percent,
                    speed_bps,
                    error: None,
                },
            );
            last_emit = Instant::now();
        }
    }
    Ok(vsix_path)
}

fn install_record_directory(
    app: &AppHandle,
    extension_id: &str,
    version: &str,
) -> Result<PathBuf, String> {
    Ok(lsp_servers_dir(app)?.join(extension_id).join(version))
}

fn merge_record(index: &mut InstalledServerIndex, record: InstalledServerRecord) {
    index.servers.retain(|server| {
        !(server.extension_id == record.extension_id && server.version == record.version)
    });
    index.servers.push(record);
}

pub async fn install_server(
    app: &AppHandle,
    request: LspInstallServerRequest,
) -> Result<LspInstallServerResult, String> {
    let provider = request.provider.clone().unwrap_or(LspProvider::OpenVsx);
    let task_id = Uuid::new_v4().to_string();
    let language_id = request.language_id.clone();
    let asset =
        resolve_download_asset(&request.extension_id, request.version.as_deref(), &provider)
            .await?;
    let vsix_path = match download_vsix(app, &asset, &task_id, language_id.as_deref()).await {
        Ok(path) => path,
        Err(error) => {
            emit_install_progress(
                app,
                &LspInstallProgressEvent {
                    task_id,
                    status: LspInstallProgressStatus::Failed,
                    provider: provider.as_str().to_string(),
                    extension_id: request.extension_id.clone(),
                    language_id,
                    total_bytes: 0,
                    downloaded_bytes: 0,
                    percent: 0.0,
                    speed_bps: 0,
                    error: Some(error.clone()),
                },
            );
            return Err(error);
        }
    };

    emit_install_progress(
        app,
        &LspInstallProgressEvent {
            task_id: task_id.clone(),
            status: LspInstallProgressStatus::Verifying,
            provider: provider.as_str().to_string(),
            extension_id: request.extension_id.clone(),
            language_id: request.language_id.clone(),
            total_bytes: 0,
            downloaded_bytes: 0,
            percent: 100.0,
            speed_bps: 0,
            error: None,
        },
    );

    let actual_sha256 = compute_sha256(&vsix_path)?;
    let expected_sha256 = request
        .expected_sha256
        .clone()
        .or_else(|| asset.sha256.clone());
    if let Some(expected_sha256) = expected_sha256 {
        if !actual_sha256.eq_ignore_ascii_case(expected_sha256.trim()) {
            let _ = fs::remove_file(&vsix_path);
            return Err(format!(
                "LSP_CHECKSUM_MISMATCH: expected {}, got {}",
                expected_sha256, actual_sha256
            ));
        }
    }

    emit_install_progress(
        app,
        &LspInstallProgressEvent {
            task_id: task_id.clone(),
            status: LspInstallProgressStatus::Extracting,
            provider: provider.as_str().to_string(),
            extension_id: request.extension_id.clone(),
            language_id: request.language_id.clone(),
            total_bytes: 0,
            downloaded_bytes: 0,
            percent: 100.0,
            speed_bps: 0,
            error: None,
        },
    );

    let extract_root = lsp_downloads_dir(app)?.join(format!("extract-{}", task_id));
    if extract_root.exists() {
        fs::remove_dir_all(&extract_root)
            .map_err(|error| format!("Failed to clean stale extraction dir: {}", error))?;
    }
    extract_vsix_archive(&vsix_path, &extract_root)?;
    let (manifest_path, manifest) = read_manifest_from_extract_dir(&extract_root)?;

    let install_dir = install_record_directory(app, &asset.extension_id, &asset.version)?;
    if install_dir.exists() {
        fs::remove_dir_all(&install_dir)
            .map_err(|error| format!("Failed to remove previous LSP installation: {}", error))?;
    }
    fs::create_dir_all(install_dir.parent().unwrap_or_else(|| Path::new(".")))
        .map_err(|error| format!("Failed to create LSP install parent dir: {}", error))?;
    fs::rename(&extract_root, &install_dir)
        .map_err(|error| format!("Failed to move LSP installation into place: {}", error))?;
    let _ = fs::remove_file(&vsix_path);

    let install_manifest = if install_dir.join("extension").join("package.json").exists() {
        install_dir.join("extension").join("package.json")
    } else {
        install_dir.join("package.json")
    };
    let install_root = install_manifest
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| install_dir.clone());
    let languages = extract_manifest_languages(&manifest);

    let launch = request.language_id.as_deref().and_then(|language_id| {
        resolve_launch_from_installed_package(
            language_id,
            &asset.extension_id,
            &install_root,
            &manifest,
        )
    });

    let record = InstalledServerRecord {
        extension_id: asset.extension_id.clone(),
        provider: provider.as_str().to_string(),
        version: asset.version.clone(),
        install_path: install_root.to_string_lossy().to_string(),
        manifest_path: install_manifest.to_string_lossy().to_string(),
        target_platform: asset.target_platform.clone(),
        installed_at: now_rfc3339(),
        sha256: Some(actual_sha256),
        languages,
        launch: launch.clone(),
    };

    let mut index = load_index(app)?;
    merge_record(&mut index, record.clone());
    save_index(app, index)?;

    emit_install_progress(
        app,
        &LspInstallProgressEvent {
            task_id,
            status: LspInstallProgressStatus::Completed,
            provider: provider.as_str().to_string(),
            extension_id: asset.extension_id.clone(),
            language_id: request.language_id.clone(),
            total_bytes: 0,
            downloaded_bytes: 0,
            percent: 100.0,
            speed_bps: 0,
            error: None,
        },
    );

    if let Some(language_id) = request.language_id.as_deref() {
        emit_server_status_changed(
            app,
            &LspServerStatusChangedEvent {
                language_id: language_id.to_string(),
                status: "installed".to_string(),
                session_id: None,
                reason: Some(format!("Installed {}", asset.extension_id)),
            },
        );
    }

    let _ = manifest_path;

    Ok(LspInstallServerResult {
        extension_id: record.extension_id,
        language_id: request.language_id,
        provider: record.provider,
        version: record.version,
        install_path: record.install_path,
        launch: record.launch,
        verified: true,
    })
}

pub fn uninstall_server(
    app: &AppHandle,
    request: LspUninstallServerRequest,
) -> Result<bool, String> {
    let mut index = load_index(app)?;
    let mut removed = false;
    let mut remove_paths: Vec<String> = Vec::new();
    index.servers.retain(|record| {
        if record.extension_id == request.extension_id {
            removed = true;
            remove_paths.push(record.install_path.clone());
            false
        } else {
            true
        }
    });
    for path in remove_paths {
        let path = PathBuf::from(path);
        if path.exists() {
            let _ = fs::remove_dir_all(path);
        }
    }
    if removed {
        save_index(app, index)?;
    }
    Ok(removed)
}

pub fn list_installed_servers(app: &AppHandle) -> Result<Vec<InstalledServerRecord>, String> {
    Ok(load_index(app)?.servers)
}

pub fn resolve_launch(
    app: &AppHandle,
    request: LspResolveLaunchRequest,
) -> Result<LspResolvedLaunch, String> {
    let normalized_language_id = normalize_language_id(&request.language_id);
    let index = load_index(app)?;
    for record in index.servers {
        if let Some(launch) = record.launch.as_ref() {
            if launch.normalized_language_id == normalized_language_id {
                return Ok(launch.clone());
            }
        }
        if record
            .languages
            .iter()
            .any(|language| language == &normalized_language_id)
        {
            if let Some(launch) = record.launch.as_ref() {
                return Ok(launch.clone());
            }
        }
    }
    resolve_launch_for_language(&request.language_id)
}

fn map_error_code(message: &str) -> Option<String> {
    if message.starts_with("LSP_DEPENDENCY_MISSING") {
        Some("dependency_missing".to_string())
    } else if message.starts_with("LSP_UNSUPPORTED_LANGUAGE") {
        Some("unsupported_language".to_string())
    } else if message.starts_with("LSP_CHECKSUM_MISMATCH") {
        Some("checksum_mismatch".to_string())
    } else if message.starts_with("LSP_COMMAND_NOT_TRUSTED") {
        Some("command_not_trusted".to_string())
    } else {
        None
    }
}

pub fn get_server_status(
    app: &AppHandle,
    request: LspGetServerStatusRequest,
) -> Result<LspServerStatusResponse, String> {
    let normalized_language_id = normalize_language_id(&request.language_id);
    let supported = supported_language(&request.language_id);
    let index = load_index(app)?;
    let installed_record = index
        .servers
        .iter()
        .rev()
        .find(|record| {
            record
                .languages
                .iter()
                .any(|language| language == &normalized_language_id)
        })
        .cloned();

    let launch = resolve_launch(
        app,
        LspResolveLaunchRequest {
            language_id: request.language_id.clone(),
        },
    );
    let (ready, command, args, needs_approval, reason, error_code) = match launch {
        Ok(launch) => (
            true,
            Some(launch.command),
            launch.args,
            launch.requires_approval,
            None,
            None,
        ),
        Err(error) => (
            false,
            None,
            Vec::new(),
            false,
            Some(error.clone()),
            map_error_code(&error),
        ),
    };

    Ok(LspServerStatusResponse {
        language_id: request.language_id,
        normalized_language_id,
        supported,
        installed: installed_record.is_some(),
        ready,
        provider: installed_record
            .as_ref()
            .map(|record| record.provider.clone()),
        extension_id: installed_record
            .as_ref()
            .map(|record| record.extension_id.clone()),
        command,
        args,
        needs_approval,
        reason,
        error_code,
    })
}

pub async fn ensure_server_ready(
    app: &AppHandle,
    language_id: &str,
    auto_install: bool,
    preferred_providers: Option<Vec<LspProvider>>,
) -> Result<LspResolvedLaunch, String> {
    if let Ok(launch) = resolve_launch(
        app,
        LspResolveLaunchRequest {
            language_id: language_id.to_string(),
        },
    ) {
        return Ok(launch);
    }

    if !auto_install {
        return Err(format!(
            "LSP_DEPENDENCY_MISSING: no available runtime for '{}' and auto-install disabled",
            language_id
        ));
    }

    let Some(extension_id) = recommended_extension_id(language_id) else {
        return resolve_launch_for_language(language_id);
    };
    let provider = preferred_providers
        .as_ref()
        .and_then(|providers| providers.first())
        .cloned()
        .unwrap_or(LspProvider::OpenVsx);

    let _ = install_server(
        app,
        LspInstallServerRequest {
            extension_id,
            language_id: Some(language_id.to_string()),
            version: None,
            provider: Some(provider),
            expected_sha256: None,
        },
    )
    .await;

    resolve_launch(
        app,
        LspResolveLaunchRequest {
            language_id: language_id.to_string(),
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn computes_sha256_hash() {
        let temp_dir = TempDir::new().expect("temp_dir");
        let file = temp_dir.path().join("a.txt");
        fs::write(&file, "abc").expect("write");
        let hash = compute_sha256(&file).expect("hash");
        assert_eq!(
            hash,
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn extracts_manifest_languages() {
        let manifest = serde_json::json!({
          "contributes": {
            "languages": [
              { "id": "typescriptreact" },
              { "id": "jsonc" }
            ]
          }
        });
        let languages = extract_manifest_languages(&manifest);
        assert_eq!(
            languages,
            vec!["typescript".to_string(), "json".to_string()]
        );
    }
}
