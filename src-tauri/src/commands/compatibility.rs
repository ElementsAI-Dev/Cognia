//! Compatibility commands for legacy frontend invoke contracts.
//!
//! These commands provide one-version compatibility while frontend callers
//! are migrated to canonical command contracts.

use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use chrono::{Duration, Utc};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use image::{imageops::FilterType, RgbaImage};
use once_cell::sync::Lazy;
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::{Manager, State};
use uuid::Uuid;

use crate::commands::extensions::plugin::PluginManagerState;
use crate::plugin::PluginStatus;
use crate::screen_recording::timeline_renderer::{
    TimelineEffect, TimelineRenderClip, TimelineRenderOptions, TimelineRenderPlan,
    TimelineRenderTrack, TimelineTransition,
};
use crate::screen_recording::TimelineRenderer;

static MEDIA_CLIPS: Lazy<Mutex<HashMap<String, StoredVideoClip>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Clone)]
struct StoredVideoClip {
    clip: PluginMediaClip,
    source_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginMediaClip {
    id: String,
    source_url: String,
    start_time: f64,
    end_time: f64,
    duration: f64,
    position: f64,
    track: i32,
    volume: Option<f64>,
    playback_speed: Option<f64>,
    filters: Option<Vec<String>>,
    #[serde(default)]
    effect_params: Option<HashMap<String, Value>>,
    transitions: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoFrameResult {
    data: Vec<u8>,
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageDataResult {
    data: Vec<u8>,
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DevServerStartResult {
    port: u16,
    host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginBuildResult {
    success: bool,
    output_path: Option<String>,
    errors: Option<Vec<String>>,
    warnings: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrustedPublisher {
    id: String,
    name: String,
    public_key: String,
    trust_level: String,
    added_at: String,
    domains: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginSignaturePayload {
    plugin_id: String,
    version: String,
    algorithm: String,
    signature: String,
    public_key: String,
    signed_at: String,
    expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleTrackInfo {
    stream_index: usize,
    codec: String,
    language: Option<String>,
    title: Option<String>,
    is_default: bool,
    is_forced: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSubtitleInfoResponse {
    has_subtitles: bool,
    tracks: Vec<SubtitleTrackInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedSubtitleFile {
    stream_index: usize,
    file_path: String,
    format: String,
    language: Option<String>,
    cue_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleExtractResponse {
    success: bool,
    extracted_files: Vec<ExtractedSubtitleFile>,
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioExtractResponse {
    success: bool,
    audio_path: Option<String>,
    error: Option<String>,
}

fn resolve_home_path(raw: &str) -> PathBuf {
    if raw == "~" {
        return dirs::home_dir().unwrap_or_else(|| PathBuf::from(raw));
    }
    if let Some(stripped) = raw.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(stripped);
        }
    }
    PathBuf::from(raw)
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn app_data_file(app: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    Ok(data_dir.join(filename))
}

fn load_kv_store(app: &tauri::AppHandle) -> Result<Map<String, Value>, String> {
    let file = app_data_file(app, "compat_storage.json")?;
    if !file.exists() {
        return Ok(Map::new());
    }
    let content = std::fs::read_to_string(&file).map_err(|e| e.to_string())?;
    let parsed: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(parsed.as_object().cloned().unwrap_or_default())
}

fn save_kv_store(app: &tauri::AppHandle, map: &Map<String, Value>) -> Result<(), String> {
    let file = app_data_file(app, "compat_storage.json")?;
    ensure_parent(&file)?;
    let content = serde_json::to_string_pretty(map).map_err(|e| e.to_string())?;
    std::fs::write(file, content).map_err(|e| e.to_string())
}

fn compute_path_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    if path.is_file() {
        return std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    }
    let mut total = 0;
    let mut stack = vec![path.to_path_buf()];
    while let Some(current) = stack.pop() {
        if let Ok(entries) = std::fs::read_dir(current) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    stack.push(entry_path);
                } else {
                    total += std::fs::metadata(entry.path())
                        .map(|m| m.len())
                        .unwrap_or(0);
                }
            }
        }
    }
    total
}

fn list_files_recursive(path: &Path) -> Vec<String> {
    if !path.exists() {
        return Vec::new();
    }
    if path.is_file() {
        return vec![path.to_string_lossy().to_string()];
    }
    let mut files = Vec::new();
    let mut stack = vec![path.to_path_buf()];
    while let Some(current) = stack.pop() {
        if let Ok(entries) = std::fs::read_dir(current) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    stack.push(entry_path);
                } else {
                    files.push(entry_path.to_string_lossy().to_string());
                }
            }
        }
    }
    files
}

fn publishers_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_data_file(app, "trusted_publishers.json")
}

fn load_user_publishers(app: &tauri::AppHandle) -> Result<Vec<TrustedPublisher>, String> {
    let file = publishers_file(app)?;
    if !file.exists() {
        return Ok(Vec::new());
    }
    let content = std::fs::read_to_string(file).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn save_user_publishers(
    app: &tauri::AppHandle,
    publishers: &[TrustedPublisher],
) -> Result<(), String> {
    let file = publishers_file(app)?;
    ensure_parent(&file)?;
    let content = serde_json::to_string_pretty(publishers).map_err(|e| e.to_string())?;
    std::fs::write(file, content).map_err(|e| e.to_string())
}

fn digest_plugin_payload(plugin_path: &str) -> Result<Vec<u8>, String> {
    let path = PathBuf::from(plugin_path);
    let mut hasher = Sha256::new();

    if path.is_file() {
        let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
        hasher.update(bytes);
        return Ok(hasher.finalize().to_vec());
    }

    if path.is_dir() {
        let mut files = list_files_recursive(&path);
        files.sort();
        for file in files {
            let bytes = std::fs::read(&file).map_err(|e| e.to_string())?;
            hasher.update(file.as_bytes());
            hasher.update(bytes);
        }
        return Ok(hasher.finalize().to_vec());
    }

    Err(format!("Path not found: {plugin_path}"))
}

fn parse_manifest_identity(plugin_path: &str) -> (String, String) {
    let path = PathBuf::from(plugin_path);
    let manifest_path = if path.is_dir() {
        path.join("plugin.json")
    } else {
        path.parent()
            .map(|parent| parent.join("plugin.json"))
            .unwrap_or_else(|| PathBuf::from("plugin.json"))
    };

    if manifest_path.exists() {
        if let Ok(content) = std::fs::read_to_string(manifest_path) {
            if let Ok(v) = serde_json::from_str::<Value>(&content) {
                let plugin_id = v
                    .get("id")
                    .and_then(Value::as_str)
                    .unwrap_or("unknown")
                    .to_string();
                let version = v
                    .get("version")
                    .and_then(Value::as_str)
                    .unwrap_or("0.0.0")
                    .to_string();
                return (plugin_id, version);
            }
        }
    }

    let fallback_id = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();
    (fallback_id, "0.0.0".to_string())
}

fn extract_frame(path: &str, time_secs: f64) -> Result<VideoFrameResult, String> {
    let frame_path = std::env::temp_dir().join(format!("cognia_frame_{}.png", Uuid::new_v4()));
    let frame_path_str = frame_path.to_string_lossy().to_string();
    let output = Command::new("ffmpeg")
        .args([
            "-y",
            "-ss",
            &format!("{time_secs:.3}"),
            "-i",
            path,
            "-frames:v",
            "1",
            "-f",
            "image2",
            "-vcodec",
            "png",
            &frame_path_str,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {e}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let image = image::open(&frame_path)
        .map_err(|e| format!("Failed to decode frame image: {e}"))?
        .to_rgba8();
    let _ = std::fs::remove_file(&frame_path);
    Ok(VideoFrameResult {
        data: image.clone().into_raw(),
        width: image.width(),
        height: image.height(),
    })
}

fn source_value_to_path(source: Value) -> Result<String, String> {
    if let Some(path) = source.as_str() {
        return Ok(path.to_string());
    }
    if let Some(obj) = source.as_object() {
        if let Some(path) = obj.get("path").and_then(Value::as_str) {
            return Ok(path.to_string());
        }
        if let Some(url) = obj.get("sourceUrl").and_then(Value::as_str) {
            return Ok(url.to_string());
        }
    }
    Err("Unsupported source payload; expected file path string".to_string())
}

fn upscaled_image(
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    factor: u32,
) -> Result<ImageDataResult, String> {
    let image =
        RgbaImage::from_raw(width, height, image_data).ok_or("Invalid RGBA image buffer")?;
    let resized = image::imageops::resize(
        &image,
        width.saturating_mul(factor),
        height.saturating_mul(factor),
        FilterType::Lanczos3,
    );
    Ok(ImageDataResult {
        data: resized.into_raw(),
        width: width.saturating_mul(factor),
        height: height.saturating_mul(factor),
    })
}

fn build_timeline_plan_from_clip_ids(
    clip_ids: &[String],
    clips: &HashMap<String, StoredVideoClip>,
) -> Result<TimelineRenderPlan, String> {
    let mut resolved = Vec::<StoredVideoClip>::new();
    for clip_id in clip_ids {
        let clip = clips
            .get(clip_id)
            .ok_or_else(|| format!("Unknown clip id: {clip_id}"))?;
        resolved.push(clip.clone());
    }

    let mut render_clips = Vec::<TimelineRenderClip>::new();
    let mut transitions = Vec::<TimelineTransition>::new();
    let mut duration_acc = 0.0f64;
    for clip in &resolved {
        let playback_speed = clip.clip.playback_speed.unwrap_or(1.0).clamp(0.25, 4.0);
        let duration = if clip.clip.duration > 0.0 {
            clip.clip.duration
        } else {
            (clip.clip.end_time - clip.clip.start_time).max(0.01)
        };
        render_clips.push(TimelineRenderClip {
            id: clip.clip.id.clone(),
            source_url: clip.source_path.clone(),
            start_time: duration_acc,
            duration,
            source_start_time: clip.clip.start_time.max(0.0),
            source_end_time: Some(clip.clip.end_time.max(clip.clip.start_time)),
            volume: clip.clip.volume.unwrap_or(1.0),
            muted: false,
            playback_speed,
            effects: clip
                .clip
                .filters
                .clone()
                .unwrap_or_default()
                .into_iter()
                .map(|effect_id| TimelineEffect {
                    params: clip
                        .clip
                        .effect_params
                        .as_ref()
                        .and_then(|map| map.get(&effect_id))
                        .cloned()
                        .unwrap_or_else(|| Value::Object(Map::new())),
                    effect_id,
                    enabled: true,
                })
                .collect(),
        });
        duration_acc += duration;
    }

    for pair in resolved.windows(2) {
        let left = &pair[0];
        let right = &pair[1];
        if let Some(Value::Object(obj)) = &left.clip.transitions {
            let transition_type = obj
                .get("type")
                .and_then(Value::as_str)
                .unwrap_or("fade")
                .to_string();
            let transition_duration = obj
                .get("duration")
                .and_then(Value::as_f64)
                .unwrap_or(0.5)
                .max(0.05);
            transitions.push(TimelineTransition {
                id: Uuid::new_v4().to_string(),
                transition_type,
                duration: transition_duration,
                from_clip_id: left.clip.id.clone(),
                to_clip_id: right.clip.id.clone(),
            });
        }
    }

    Ok(TimelineRenderPlan {
        duration: duration_acc,
        tracks: vec![TimelineRenderTrack {
            id: "plugin-track-0".to_string(),
            track_type: "video".to_string(),
            clips: render_clips,
            muted: false,
            volume: 1.0,
        }],
        transitions,
    })
}

#[tauri::command]
pub async fn get_storage_value(
    app_handle: tauri::AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    let map = load_kv_store(&app_handle)?;
    Ok(map.get(&key).and_then(Value::as_str).map(ToOwned::to_owned))
}

#[tauri::command]
pub async fn set_storage_value(
    app_handle: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    let mut map = load_kv_store(&app_handle)?;
    map.insert(key, Value::String(value));
    save_kv_store(&app_handle, &map)
}

#[tauri::command]
pub async fn delete_storage_value(app_handle: tauri::AppHandle, key: String) -> Result<(), String> {
    let mut map = load_kv_store(&app_handle)?;
    map.remove(&key);
    save_kv_store(&app_handle, &map)
}

#[tauri::command]
pub async fn stronghold_store_sync_credential(
    app_handle: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    let namespaced = format!("sync_credential::{key}");
    set_storage_value(app_handle, namespaced, value).await
}

#[tauri::command]
pub async fn stronghold_get_sync_credential(
    app_handle: tauri::AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    let namespaced = format!("sync_credential::{key}");
    get_storage_value(app_handle, namespaced).await
}

#[tauri::command]
pub async fn stronghold_remove_sync_credential(
    app_handle: tauri::AppHandle,
    key: String,
) -> Result<(), String> {
    let namespaced = format!("sync_credential::{key}");
    delete_storage_value(app_handle, namespaced).await
}

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(resolve_home_path(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_read_file(path: String) -> Result<String, String> {
    read_text_file(path).await
}

#[tauri::command]
pub async fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(resolve_home_path(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn shell_open(url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn selection_set_theme(theme: String) -> Result<(), String> {
    log::info!("[compat] selection_set_theme deprecated command called with theme={theme}");
    Ok(())
}

#[tauri::command]
pub async fn agent_execute(config: Value) -> Result<Value, String> {
    Err(format!(
        "NOT_SUPPORTED: agent_execute compatibility command is deprecated; config keys={}",
        config.as_object().map(|v| v.len()).unwrap_or(0)
    ))
}

#[tauri::command]
pub async fn agent_cancel(agent_id: String) -> Result<(), String> {
    log::warn!("[compat] agent_cancel no-op for agent_id={agent_id}");
    Ok(())
}

#[tauri::command]
pub async fn selection_replace_text(text: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use arboard::Clipboard;
        use rdev::{simulate, EventType, Key};
        use std::thread;
        use std::time::Duration;

        let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
        let original = clipboard.get_text().ok();
        clipboard.set_text(text).map_err(|e| e.to_string())?;

        simulate(&EventType::KeyPress(Key::ControlLeft)).map_err(|e| format!("{e:?}"))?;
        thread::sleep(Duration::from_millis(8));
        simulate(&EventType::KeyPress(Key::KeyV)).map_err(|e| format!("{e:?}"))?;
        thread::sleep(Duration::from_millis(8));
        simulate(&EventType::KeyRelease(Key::KeyV)).map_err(|e| format!("{e:?}"))?;
        thread::sleep(Duration::from_millis(8));
        simulate(&EventType::KeyRelease(Key::ControlLeft)).map_err(|e| format!("{e:?}"))?;

        thread::sleep(Duration::from_millis(20));
        if let Some(old) = original {
            let _ = clipboard.set_text(old);
        }
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = text;
        Err("selection_replace_text is currently supported on Windows only".to_string())
    }
}

#[tauri::command]
pub async fn video_get_subtitle_info(
    video_path: String,
) -> Result<VideoSubtitleInfoResponse, String> {
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_streams",
            &video_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {e}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let parsed: Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("Invalid ffprobe JSON: {e}"))?;
    let tracks = parsed["streams"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|stream| stream["codec_type"].as_str() == Some("subtitle"))
        .map(|stream| SubtitleTrackInfo {
            stream_index: stream["index"].as_u64().unwrap_or(0) as usize,
            codec: stream["codec_name"]
                .as_str()
                .unwrap_or("unknown")
                .to_string(),
            language: stream["tags"]["language"].as_str().map(ToOwned::to_owned),
            title: stream["tags"]["title"].as_str().map(ToOwned::to_owned),
            is_default: stream["disposition"]["default"].as_i64().unwrap_or(0) == 1,
            is_forced: stream["disposition"]["forced"].as_i64().unwrap_or(0) == 1,
        })
        .collect::<Vec<_>>();

    Ok(VideoSubtitleInfoResponse {
        has_subtitles: !tracks.is_empty(),
        tracks,
    })
}

#[tauri::command]
pub async fn video_extract_subtitles(options: Value) -> Result<SubtitleExtractResponse, String> {
    let video_path = options
        .get("videoPath")
        .or_else(|| options.get("video_path"))
        .and_then(Value::as_str)
        .ok_or("Missing videoPath")?
        .to_string();
    let output_format = options
        .get("outputFormat")
        .or_else(|| options.get("output_format"))
        .and_then(Value::as_str)
        .unwrap_or("srt");
    let track_indices = options
        .get("trackIndices")
        .or_else(|| options.get("track_indices"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let output_dir = options
        .get("outputDir")
        .or_else(|| options.get("output_dir"))
        .and_then(Value::as_str)
        .map(resolve_home_path)
        .unwrap_or_else(|| std::env::temp_dir().join("cognia_subtitles"));

    std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;

    let indices = if track_indices.is_empty() {
        vec![0usize]
    } else {
        track_indices
            .iter()
            .filter_map(Value::as_u64)
            .map(|v| v as usize)
            .collect::<Vec<_>>()
    };

    let mut extracted = Vec::new();
    for index in indices {
        let out_file = output_dir.join(format!(
            "{}_track_{}.{}",
            Uuid::new_v4().simple(),
            index,
            output_format
        ));
        let map_arg = format!("0:s:{index}");
        let codec_arg = if output_format.eq_ignore_ascii_case("vtt") {
            "webvtt"
        } else {
            "srt"
        };
        let out_file_str = out_file.to_string_lossy().to_string();

        let output = Command::new("ffmpeg")
            .args([
                "-y",
                "-i",
                &video_path,
                "-map",
                &map_arg,
                "-c:s",
                codec_arg,
                &out_file_str,
            ])
            .output()
            .map_err(|e| format!("Failed to run ffmpeg: {e}"))?;

        if output.status.success() && out_file.exists() {
            let cue_count = std::fs::read_to_string(&out_file)
                .ok()
                .map(|text| text.lines().filter(|line| line.contains("-->")).count())
                .unwrap_or(0);
            extracted.push(ExtractedSubtitleFile {
                stream_index: index,
                file_path: out_file_str,
                format: output_format.to_string(),
                language: None,
                cue_count,
            });
        }
    }

    Ok(SubtitleExtractResponse {
        success: !extracted.is_empty(),
        extracted_files: extracted,
        error: None,
    })
}

#[tauri::command]
pub async fn video_extract_audio(
    video_path: String,
    output_path: Option<String>,
    format: Option<String>,
) -> Result<AudioExtractResponse, String> {
    let fmt = format.unwrap_or_else(|| "mp3".to_string());
    let out = output_path
        .map(|p| resolve_home_path(&p))
        .unwrap_or_else(|| {
            std::env::temp_dir().join(format!("cognia_audio_{}.{}", Uuid::new_v4(), fmt))
        });

    if let Some(parent) = out.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let out_str = out.to_string_lossy().to_string();

    let output = Command::new("ffmpeg")
        .args([
            "-y",
            "-i",
            &video_path,
            "-vn",
            "-acodec",
            if fmt.eq_ignore_ascii_case("wav") {
                "pcm_s16le"
            } else {
                "libmp3lame"
            },
            &out_str,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {e}"))?;

    if output.status.success() && out.exists() {
        return Ok(AudioExtractResponse {
            success: true,
            audio_path: Some(out_str),
            error: None,
        });
    }

    Ok(AudioExtractResponse {
        success: false,
        audio_path: None,
        error: Some(String::from_utf8_lossy(&output.stderr).to_string()),
    })
}

#[tauri::command]
pub async fn plugin_backup_load_index(backup_path: String) -> Result<Value, String> {
    let index_file = resolve_home_path(&backup_path).join("index.json");
    if !index_file.exists() {
        return Ok(json!({}));
    }
    let content = std::fs::read_to_string(index_file).map_err(|e| e.to_string())?;
    let parsed: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(if parsed.is_object() {
        parsed
    } else {
        json!({})
    })
}

#[tauri::command]
pub async fn plugin_backup_get_size(path: String) -> Result<u64, String> {
    Ok(compute_path_size(&resolve_home_path(&path)))
}

#[tauri::command]
pub async fn plugin_backup_inspect(backup_path: String) -> Result<Value, String> {
    let target = resolve_home_path(&backup_path);
    let files = list_files_recursive(&target);
    let manifest = if target.is_dir() && target.join("plugin.json").exists() {
        let content =
            std::fs::read_to_string(target.join("plugin.json")).map_err(|e| e.to_string())?;
        serde_json::from_str::<Value>(&content).unwrap_or_else(|_| json!({}))
    } else {
        json!({})
    };
    Ok(json!({
        "manifest": manifest,
        "config": {},
        "data": {},
        "files": files
    }))
}

#[tauri::command]
pub async fn plugin_get_manifest(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<Value, String> {
    let manager = state.0.read().await;
    let plugin = manager
        .get_plugin(&plugin_id)
        .await
        .ok_or_else(|| format!("Plugin not found: {plugin_id}"))?;
    serde_json::to_value(plugin.manifest).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_list_installed(state: State<'_, PluginManagerState>) -> Result<Value, String> {
    let manager = state.0.read().await;
    let plugins = manager.get_all_plugins().await;
    let list = plugins
        .into_iter()
        .map(|plugin| {
            json!({
                "id": plugin.manifest.id,
                "version": plugin.manifest.version
            })
        })
        .collect::<Vec<_>>();
    Ok(Value::Array(list))
}

#[tauri::command]
pub async fn plugin_list_enabled(
    state: State<'_, PluginManagerState>,
) -> Result<Vec<String>, String> {
    let manager = state.0.read().await;
    let plugins = manager.get_all_plugins().await;
    Ok(plugins
        .into_iter()
        .filter(|plugin| plugin.status == PluginStatus::Enabled)
        .map(|plugin| plugin.manifest.id)
        .collect())
}

#[tauri::command]
pub async fn plugin_get_data(_plugin_id: String) -> Result<Value, String> {
    Ok(json!({}))
}

#[tauri::command]
pub async fn plugin_requires_restart(_plugin_id: String) -> Result<bool, String> {
    Ok(false)
}

#[tauri::command]
pub async fn plugin_download_version(
    _plugin_id: String,
    _version: String,
) -> Result<Value, String> {
    Err("NOT_SUPPORTED: plugin_download_version is not implemented yet".to_string())
}

#[tauri::command]
pub async fn plugin_marketplace_versions(_plugin_id: String) -> Result<Value, String> {
    Ok(Value::Array(Vec::new()))
}

#[tauri::command]
pub async fn plugin_dev_server_start(
    config: Option<Value>,
) -> Result<DevServerStartResult, String> {
    let port = config
        .as_ref()
        .and_then(|v| v.get("port"))
        .and_then(Value::as_u64)
        .unwrap_or(9527) as u16;
    let host = config
        .as_ref()
        .and_then(|v| v.get("host"))
        .and_then(Value::as_str)
        .unwrap_or("localhost")
        .to_string();

    log::warn!(
        "[compat] plugin_dev_server_start called (deprecated compatibility), host={}, port={}",
        host,
        port
    );
    Ok(DevServerStartResult { port, host })
}

#[tauri::command]
pub async fn plugin_build(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    _config: Option<Value>,
) -> Result<PluginBuildResult, String> {
    let manager = state.0.read().await;
    let plugin = manager
        .get_plugin(&plugin_id)
        .await
        .ok_or_else(|| format!("Plugin not found: {plugin_id}"))?;
    let plugin_path = PathBuf::from(plugin.path);
    let package_json = plugin_path.join("package.json");
    if !package_json.exists() {
        return Ok(PluginBuildResult {
            success: false,
            output_path: None,
            errors: Some(vec!["package.json not found".to_string()]),
            warnings: None,
        });
    }

    let output = Command::new("pnpm")
        .arg("build")
        .current_dir(&plugin_path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(PluginBuildResult {
            success: true,
            output_path: Some(plugin_path.to_string_lossy().to_string()),
            errors: None,
            warnings: None,
        })
    } else {
        Ok(PluginBuildResult {
            success: false,
            output_path: None,
            errors: Some(vec![String::from_utf8_lossy(&output.stderr).to_string()]),
            warnings: None,
        })
    }
}

#[tauri::command]
pub async fn plugin_list_dev_plugins(plugins_dir: String) -> Result<Vec<String>, String> {
    let dir = resolve_home_path(&plugins_dir);
    if !dir.exists() || !dir.is_dir() {
        return Ok(Vec::new());
    }
    let mut plugin_ids = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let manifest_path = path.join("plugin.json");
        if !manifest_path.exists() {
            continue;
        }
        if let Ok(content) = std::fs::read_to_string(manifest_path) {
            if let Ok(manifest) = serde_json::from_str::<Value>(&content) {
                if let Some(id) = manifest.get("id").and_then(Value::as_str) {
                    plugin_ids.push(id.to_string());
                }
            }
        }
    }
    Ok(plugin_ids)
}

#[tauri::command]
pub async fn plugin_get_official_publishers() -> Result<Vec<TrustedPublisher>, String> {
    Ok(vec![TrustedPublisher {
        id: "cognia-official".to_string(),
        name: "Cognia Official".to_string(),
        public_key: "".to_string(),
        trust_level: "official".to_string(),
        added_at: Utc::now().to_rfc3339(),
        domains: Some(vec!["cognia.app".to_string()]),
    }])
}

#[tauri::command]
pub async fn plugin_get_user_publishers(
    app_handle: tauri::AppHandle,
) -> Result<Vec<TrustedPublisher>, String> {
    load_user_publishers(&app_handle)
}

#[tauri::command]
pub async fn plugin_read_signature(
    plugin_path: String,
) -> Result<Option<PluginSignaturePayload>, String> {
    let base = resolve_home_path(&plugin_path);
    let candidates = [
        base.join("signature.json"),
        base.join("plugin-signature.json"),
    ];
    for file in candidates {
        if file.exists() {
            let content = std::fs::read_to_string(file).map_err(|e| e.to_string())?;
            let parsed: PluginSignaturePayload =
                serde_json::from_str(&content).map_err(|e| e.to_string())?;
            return Ok(Some(parsed));
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn plugin_verify_signature(
    plugin_path: String,
    signature: String,
    public_key: String,
    algorithm: String,
) -> Result<bool, String> {
    if algorithm.eq_ignore_ascii_case("rsa-sha256") {
        return Err("NOT_SUPPORTED: rsa-sha256 is not supported; use ed25519".to_string());
    }
    if !algorithm.eq_ignore_ascii_case("ed25519") {
        return Err(format!("Unsupported signature algorithm: {algorithm}"));
    }

    let digest = digest_plugin_payload(&plugin_path)?;
    let key_bytes = BASE64_STANDARD
        .decode(public_key)
        .map_err(|e| format!("Invalid public key: {e}"))?;
    let signature_bytes = BASE64_STANDARD
        .decode(signature)
        .map_err(|e| format!("Invalid signature: {e}"))?;

    let key_arr: [u8; 32] = key_bytes
        .try_into()
        .map_err(|_| "Invalid ed25519 public key length".to_string())?;
    let sig_arr: [u8; 64] = signature_bytes
        .try_into()
        .map_err(|_| "Invalid ed25519 signature length".to_string())?;

    let verifying_key = VerifyingKey::from_bytes(&key_arr).map_err(|e| e.to_string())?;
    let sig = Signature::from_bytes(&sig_arr);
    Ok(verifying_key.verify(&digest, &sig).is_ok())
}

#[tauri::command]
pub async fn plugin_create_signature(
    plugin_path: String,
    private_key: String,
    algorithm: String,
    expires_in: Option<i64>,
) -> Result<PluginSignaturePayload, String> {
    if algorithm.eq_ignore_ascii_case("rsa-sha256") {
        return Err("NOT_SUPPORTED: rsa-sha256 is not supported; use ed25519".to_string());
    }
    if !algorithm.eq_ignore_ascii_case("ed25519") {
        return Err(format!("Unsupported signature algorithm: {algorithm}"));
    }

    let digest = digest_plugin_payload(&plugin_path)?;
    let private_bytes = BASE64_STANDARD
        .decode(private_key)
        .map_err(|e| format!("Invalid private key: {e}"))?;
    let seed: [u8; 32] = if private_bytes.len() == 32 {
        private_bytes
            .as_slice()
            .try_into()
            .map_err(|_| "Invalid private key length".to_string())?
    } else if private_bytes.len() == 64 {
        private_bytes[0..32]
            .try_into()
            .map_err(|_| "Invalid private key length".to_string())?
    } else {
        return Err("Invalid private key length, expected 32 or 64 bytes".to_string());
    };

    let signing_key = SigningKey::from_bytes(&seed);
    let verifying_key = signing_key.verifying_key();
    let sig = signing_key.sign(&digest);
    let (plugin_id, version) = parse_manifest_identity(&plugin_path);
    let now = Utc::now();
    let expires_at = expires_in.map(|seconds| (now + Duration::seconds(seconds)).to_rfc3339());

    Ok(PluginSignaturePayload {
        plugin_id,
        version,
        algorithm: "ed25519".to_string(),
        signature: BASE64_STANDARD.encode(sig.to_bytes()),
        public_key: BASE64_STANDARD.encode(verifying_key.to_bytes()),
        signed_at: now.to_rfc3339(),
        expires_at,
    })
}

#[tauri::command]
pub async fn plugin_generate_keypair() -> Result<Value, String> {
    let signing_key = SigningKey::generate(&mut OsRng);
    let verifying_key = signing_key.verifying_key();
    Ok(json!({
        "publicKey": BASE64_STANDARD.encode(verifying_key.to_bytes()),
        "privateKey": BASE64_STANDARD.encode(signing_key.to_bytes())
    }))
}

#[tauri::command]
pub async fn plugin_add_trusted_publisher(
    app_handle: tauri::AppHandle,
    publisher: TrustedPublisher,
) -> Result<(), String> {
    let mut publishers = load_user_publishers(&app_handle)?;
    publishers.retain(|p| p.id != publisher.id);
    publishers.push(publisher);
    save_user_publishers(&app_handle, &publishers)
}

#[tauri::command]
pub async fn plugin_remove_trusted_publisher(
    app_handle: tauri::AppHandle,
    publisher_id: String,
) -> Result<(), String> {
    let mut publishers = load_user_publishers(&app_handle)?;
    publishers.retain(|p| p.id != publisher_id);
    save_user_publishers(&app_handle, &publishers)
}

#[tauri::command]
pub async fn plugin_media_load_video_clip(
    _plugin_id: String,
    source: Value,
) -> Result<PluginMediaClip, String> {
    let source_path = source_value_to_path(source)?;
    let info = crate::screen_recording::VideoProcessor::get_video_info(&source_path)?;
    let duration = info.duration_ms as f64 / 1000.0;
    let clip = PluginMediaClip {
        id: Uuid::new_v4().to_string(),
        source_url: source_path.clone(),
        start_time: 0.0,
        end_time: duration,
        duration,
        position: 0.0,
        track: 0,
        volume: Some(1.0),
        playback_speed: Some(1.0),
        filters: Some(Vec::new()),
        effect_params: Some(HashMap::new()),
        transitions: None,
    };
    let mut clips = MEDIA_CLIPS.lock().map_err(|e| e.to_string())?;
    clips.insert(
        clip.id.clone(),
        StoredVideoClip {
            clip: clip.clone(),
            source_path,
        },
    );
    Ok(clip)
}

#[tauri::command]
pub async fn plugin_media_get_video_frame(
    _plugin_id: String,
    clip_id: String,
    time: f64,
) -> Result<VideoFrameResult, String> {
    let clips = MEDIA_CLIPS.lock().map_err(|e| e.to_string())?;
    let stored = clips
        .get(&clip_id)
        .ok_or_else(|| format!("Unknown clip id: {clip_id}"))?;
    extract_frame(&stored.source_path, time)
}

#[tauri::command]
pub async fn plugin_media_get_video_metadata(
    _plugin_id: String,
    source: Value,
) -> Result<Value, String> {
    let source_path = source_value_to_path(source)?;
    let info = crate::screen_recording::VideoProcessor::get_video_info(&source_path)?;
    Ok(json!({
        "duration": info.duration_ms as f64 / 1000.0,
        "width": info.width,
        "height": info.height,
        "fps": info.fps,
        "codec": info.codec,
        "bitrate": 0,
        "hasAudio": info.has_audio
    }))
}

#[tauri::command]
pub async fn plugin_media_trim_video(
    _plugin_id: String,
    clip_id: String,
    start_time: f64,
    end_time: f64,
) -> Result<PluginMediaClip, String> {
    if end_time <= start_time {
        return Err("endTime must be greater than startTime".to_string());
    }
    let mut clips = MEDIA_CLIPS.lock().map_err(|e| e.to_string())?;
    let base = clips
        .get(&clip_id)
        .ok_or_else(|| format!("Unknown clip id: {clip_id}"))?
        .clone();

    let output_path = std::env::temp_dir()
        .join(format!("cognia_plugin_trim_{}.mp4", Uuid::new_v4()))
        .to_string_lossy()
        .to_string();
    let trim_options = crate::screen_recording::VideoTrimOptions {
        input_path: base.source_path.clone(),
        output_path: output_path.clone(),
        start_time,
        end_time,
        format: Some("mp4".to_string()),
        quality: Some(85),
        gif_fps: None,
    };
    crate::screen_recording::VideoProcessor::trim_video(&trim_options)?;
    let info = crate::screen_recording::VideoProcessor::get_video_info(&output_path)?;
    let new_duration = info.duration_ms as f64 / 1000.0;

    let new_clip = PluginMediaClip {
        id: Uuid::new_v4().to_string(),
        source_url: output_path.clone(),
        start_time: 0.0,
        end_time: new_duration,
        duration: new_duration,
        position: 0.0,
        track: base.clip.track,
        volume: base.clip.volume,
        playback_speed: base.clip.playback_speed,
        filters: base.clip.filters.clone(),
        effect_params: base.clip.effect_params.clone(),
        transitions: base.clip.transitions.clone(),
    };
    clips.insert(
        new_clip.id.clone(),
        StoredVideoClip {
            clip: new_clip.clone(),
            source_path: output_path,
        },
    );
    Ok(new_clip)
}

#[tauri::command]
pub async fn plugin_media_concatenate_videos(
    _plugin_id: String,
    clip_ids: Vec<String>,
) -> Result<PluginMediaClip, String> {
    if clip_ids.is_empty() {
        return Err("No clip ids provided".to_string());
    }
    let mut clips = MEDIA_CLIPS.lock().map_err(|e| e.to_string())?;
    let plan = build_timeline_plan_from_clip_ids(&clip_ids, &clips)?;
    let output_path = std::env::temp_dir()
        .join(format!("cognia_plugin_concat_{}.mp4", Uuid::new_v4()))
        .to_string_lossy()
        .to_string();
    let options = TimelineRenderOptions {
        output_path: output_path.clone(),
        format: Some("mp4".to_string()),
        resolution: Some("1080p".to_string()),
        fps: Some(30),
        quality: Some("high".to_string()),
        codec: Some("libx264".to_string()),
        audio_bitrate: Some(192000),
        video_bitrate: None,
        overwrite: Some(true),
    };
    TimelineRenderer::render(&plan, &options)?;
    let info = crate::screen_recording::VideoProcessor::get_video_info(&output_path)?;
    let duration = info.duration_ms as f64 / 1000.0;
    let merged = PluginMediaClip {
        id: Uuid::new_v4().to_string(),
        source_url: output_path.clone(),
        start_time: 0.0,
        end_time: duration,
        duration,
        position: 0.0,
        track: 0,
        volume: Some(1.0),
        playback_speed: Some(1.0),
        filters: Some(Vec::new()),
        effect_params: Some(HashMap::new()),
        transitions: None,
    };
    clips.insert(
        merged.id.clone(),
        StoredVideoClip {
            clip: merged.clone(),
            source_path: output_path,
        },
    );
    Ok(merged)
}

#[tauri::command]
pub async fn plugin_media_apply_video_effect(
    _plugin_id: String,
    clip_id: String,
    effect_id: String,
    _params: Option<Value>,
    params: Option<Value>,
) -> Result<(), String> {
    let mut clips = MEDIA_CLIPS.lock().map_err(|e| e.to_string())?;
    let stored = clips
        .get_mut(&clip_id)
        .ok_or_else(|| format!("Unknown clip id: {clip_id}"))?;
    let mut filters = stored.clip.filters.take().unwrap_or_default();
    if !filters.iter().any(|f| f == &effect_id) {
        filters.push(effect_id.clone());
    }
    stored.clip.filters = Some(filters);
    let selected_params = params.or(_params);
    if let Some(value) = selected_params {
        let mut effect_params = stored.clip.effect_params.take().unwrap_or_default();
        effect_params.insert(effect_id, value);
        stored.clip.effect_params = Some(effect_params);
    }
    Ok(())
}

#[tauri::command]
pub async fn plugin_media_add_transition(
    _plugin_id: String,
    from_clip_id: String,
    to_clip_id: String,
    transition: Value,
) -> Result<(), String> {
    let mut clips = MEDIA_CLIPS.lock().map_err(|e| e.to_string())?;
    let from = clips
        .get_mut(&from_clip_id)
        .ok_or_else(|| format!("Unknown clip id: {from_clip_id}"))?;
    let mut transition_obj = transition.as_object().cloned().unwrap_or_default();
    transition_obj.insert("toClipId".to_string(), Value::String(to_clip_id));
    from.clip.transitions = Some(Value::Object(transition_obj));
    Ok(())
}

#[tauri::command]
pub async fn plugin_media_export_video(
    app_handle: tauri::AppHandle,
    _plugin_id: String,
    clip_ids: Vec<String>,
    options: Value,
) -> Result<Vec<u8>, String> {
    if clip_ids.is_empty() {
        return Err("No clip ids provided".to_string());
    }
    let clips = MEDIA_CLIPS.lock().map_err(|e| e.to_string())?;
    let plan = build_timeline_plan_from_clip_ids(&clip_ids, &clips)?;
    drop(clips);

    let format = options
        .get("format")
        .and_then(Value::as_str)
        .unwrap_or("mp4")
        .to_string();
    let resolution = options
        .get("resolution")
        .and_then(Value::as_str)
        .unwrap_or("1080p")
        .to_string();
    let fps = options
        .get("fps")
        .and_then(Value::as_u64)
        .map(|v| v as u32)
        .unwrap_or(30);
    let quality = options
        .get("quality")
        .and_then(Value::as_str)
        .unwrap_or("high")
        .to_string();

    let output_path = std::env::temp_dir()
        .join(format!(
            "cognia_plugin_export_{}.{}",
            Uuid::new_v4(),
            format
        ))
        .to_string_lossy()
        .to_string();
    let render_options = TimelineRenderOptions {
        output_path: output_path.clone(),
        format: Some(format),
        resolution: Some(resolution),
        fps: Some(fps),
        quality: Some(quality),
        codec: Some("libx264".to_string()),
        audio_bitrate: options
            .get("audioBitrate")
            .and_then(Value::as_u64)
            .map(|v| v as u32),
        video_bitrate: options
            .get("videoBitrate")
            .and_then(Value::as_u64)
            .map(|v| v as u32),
        overwrite: Some(true),
    };
    TimelineRenderer::render_with_progress(&plan, &render_options, &app_handle)?;
    std::fs::read(&output_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_media_ai_upscale(
    _plugin_id: String,
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    factor: u32,
) -> Result<ImageDataResult, String> {
    let scale = if factor == 4 { 4 } else { 2 };
    upscaled_image(image_data, width, height, scale)
}

#[tauri::command]
pub async fn plugin_media_ai_remove_background(
    _plugin_id: String,
    image_data: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<ImageDataResult, String> {
    Ok(ImageDataResult {
        data: image_data,
        width,
        height,
    })
}

#[tauri::command]
pub async fn plugin_media_ai_enhance(
    _plugin_id: String,
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    _enhance_type: Option<String>,
) -> Result<ImageDataResult, String> {
    Ok(ImageDataResult {
        data: image_data,
        width,
        height,
    })
}

#[tauri::command]
pub async fn plugin_media_ai_variation(
    _plugin_id: String,
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    _prompt: Option<String>,
) -> Result<ImageDataResult, String> {
    Ok(ImageDataResult {
        data: image_data,
        width,
        height,
    })
}

#[tauri::command]
pub async fn plugin_media_ai_inpaint(
    _plugin_id: String,
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    _mask_data: Vec<u8>,
    _prompt: String,
) -> Result<ImageDataResult, String> {
    Ok(ImageDataResult {
        data: image_data,
        width,
        height,
    })
}
