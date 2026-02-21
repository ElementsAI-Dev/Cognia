//! Timeline renderer for video editor exports.
//!
//! Converts a frontend render plan into FFmpeg commands and produces
//! a final encoded video file.

use super::progress::{
    emit_processing_completed, emit_processing_error, emit_processing_started,
    monitor_ffmpeg_progress,
};
use super::{VideoProcessingResult, VideoProcessor};
use log::{debug, warn};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::AppHandle;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineRenderPlan {
    pub duration: f64,
    pub tracks: Vec<TimelineRenderTrack>,
    #[serde(default)]
    pub transitions: Vec<TimelineTransition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineRenderTrack {
    pub id: String,
    #[serde(rename = "type")]
    pub track_type: String,
    pub clips: Vec<TimelineRenderClip>,
    #[serde(default)]
    pub muted: bool,
    #[serde(default = "default_volume")]
    pub volume: f64,
}

fn default_volume() -> f64 {
    1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineRenderClip {
    pub id: String,
    pub source_url: String,
    pub start_time: f64,
    pub duration: f64,
    #[serde(default)]
    pub source_start_time: f64,
    pub source_end_time: Option<f64>,
    #[serde(default = "default_volume")]
    pub volume: f64,
    #[serde(default)]
    pub muted: bool,
    #[serde(default = "default_speed")]
    pub playback_speed: f64,
    #[serde(default)]
    pub effects: Vec<TimelineEffect>,
}

fn default_speed() -> f64 {
    1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEffect {
    pub effect_id: String,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    #[serde(default)]
    pub params: Value,
}

fn default_enabled() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineTransition {
    pub id: String,
    #[serde(rename = "type")]
    pub transition_type: String,
    pub duration: f64,
    pub from_clip_id: String,
    pub to_clip_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineRenderOptions {
    pub output_path: String,
    pub format: Option<String>,
    pub resolution: Option<String>,
    pub fps: Option<u32>,
    pub quality: Option<String>,
    pub codec: Option<String>,
    pub audio_bitrate: Option<u32>,
    pub video_bitrate: Option<u32>,
    pub overwrite: Option<bool>,
}

#[derive(Debug, Clone)]
struct ResolvedClip {
    id: String,
    source_path: String,
    start_time: f64,
    duration: f64,
    source_start_time: f64,
    volume: f64,
    muted: bool,
    playback_speed: f64,
    effects: Vec<TimelineEffect>,
}

pub struct TimelineRenderer;

impl TimelineRenderer {
    pub fn render(
        plan: &TimelineRenderPlan,
        options: &TimelineRenderOptions,
    ) -> Result<VideoProcessingResult, String> {
        Self::render_internal(plan, options, None)
    }

    pub fn render_with_progress(
        plan: &TimelineRenderPlan,
        options: &TimelineRenderOptions,
        app_handle: &AppHandle,
    ) -> Result<VideoProcessingResult, String> {
        Self::render_internal(plan, options, Some(app_handle))
    }

    fn render_internal(
        plan: &TimelineRenderPlan,
        options: &TimelineRenderOptions,
        app_handle: Option<&AppHandle>,
    ) -> Result<VideoProcessingResult, String> {
        if !VideoProcessor::check_ffmpeg() {
            let err = "FFMPEG_NOT_FOUND: FFmpeg is not available".to_string();
            if let Some(app) = app_handle {
                emit_processing_error(app, "timeline-render", &err);
            }
            return Err(err);
        }

        let start = std::time::Instant::now();
        if let Some(app) = app_handle {
            emit_processing_started(app, "timeline-render");
        }

        let clips = Self::resolve_clips(plan)?;
        if clips.is_empty() {
            let err = "INVALID_TIMELINE: no renderable clips found".to_string();
            if let Some(app) = app_handle {
                emit_processing_error(app, "timeline-render", &err);
            }
            return Err(err);
        }

        let output_path = PathBuf::from(&options.output_path);
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        if output_path.exists() && options.overwrite.unwrap_or(true) {
            std::fs::remove_file(&output_path).map_err(|e| e.to_string())?;
        }

        let workdir = tempfile::Builder::new()
            .prefix("cognia-timeline-render")
            .tempdir()
            .map_err(|e| e.to_string())?;

        let mut segment_files = Vec::with_capacity(clips.len());
        for (index, clip) in clips.iter().enumerate() {
            let segment_path = workdir.path().join(format!("segment_{index:03}.mp4"));
            Self::render_segment(clip, &segment_path, options)?;
            segment_files.push(segment_path);
        }

        let has_transitions = !plan.transitions.is_empty();
        if has_transitions {
            Self::compose_with_transitions(
                &clips,
                &segment_files,
                &plan.transitions,
                &output_path,
                options,
                app_handle,
                plan.duration,
            )?;
        } else {
            Self::concat_segments(
                &segment_files,
                &output_path,
                options,
                app_handle,
                plan.duration,
            )?;
        }

        let file_size = std::fs::metadata(&output_path)
            .map(|m| m.len())
            .unwrap_or_default();
        let duration_ms = start.elapsed().as_millis() as u64;

        if let Some(app) = app_handle {
            emit_processing_completed(app, "timeline-render", &output_path.to_string_lossy());
        }

        Ok(VideoProcessingResult {
            success: true,
            output_path: output_path.to_string_lossy().to_string(),
            file_size,
            duration_ms,
            error: None,
        })
    }

    fn resolve_clips(plan: &TimelineRenderPlan) -> Result<Vec<ResolvedClip>, String> {
        let mut clips = Vec::new();
        for track in &plan.tracks {
            if track.track_type != "video" {
                continue;
            }
            for clip in &track.clips {
                let source_path = normalize_source_path(&clip.source_url);
                if !Path::new(&source_path).exists() {
                    return Err(format!("IO_CONFLICT: missing source file: {source_path}"));
                }

                clips.push(ResolvedClip {
                    id: clip.id.clone(),
                    source_path,
                    start_time: clip.start_time,
                    duration: clip.duration.max(0.01),
                    source_start_time: clip.source_start_time.max(0.0),
                    volume: (clip.volume * track.volume).clamp(0.0, 2.0),
                    muted: clip.muted || track.muted,
                    playback_speed: clip.playback_speed.clamp(0.25, 4.0),
                    effects: clip.effects.clone(),
                });
            }
        }

        clips.sort_by(|a, b| {
            a.start_time
                .partial_cmp(&b.start_time)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        Ok(clips)
    }

    fn render_segment(
        clip: &ResolvedClip,
        segment_path: &Path,
        options: &TimelineRenderOptions,
    ) -> Result<(), String> {
        let mut args = vec![
            "-y".to_string(),
            "-ss".to_string(),
            format!("{:.3}", clip.source_start_time),
            "-i".to_string(),
            clip.source_path.clone(),
            "-t".to_string(),
            format!("{:.3}", clip.duration),
        ];

        let mut video_filters = Vec::new();
        if (clip.playback_speed - 1.0).abs() > f64::EPSILON {
            video_filters.push(format!("setpts=PTS/{:.6}", clip.playback_speed));
        }
        video_filters.extend(build_video_effect_filters(&clip.effects));

        if let Some(resolution) = options.resolution.as_deref() {
            if let Some((w, h)) = map_resolution(resolution) {
                video_filters.push(format!(
                    "scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2"
                ));
            }
        }

        if !video_filters.is_empty() {
            args.push("-vf".to_string());
            args.push(video_filters.join(","));
        }

        let mut audio_filters = Vec::new();
        if clip.muted {
            audio_filters.push("volume=0".to_string());
        } else if (clip.volume - 1.0).abs() > f64::EPSILON {
            audio_filters.push(format!("volume={:.6}", clip.volume));
        }
        if (clip.playback_speed - 1.0).abs() > f64::EPSILON {
            audio_filters.extend(build_atempo_chain(clip.playback_speed));
        }
        if !audio_filters.is_empty() {
            args.push("-af".to_string());
            args.push(audio_filters.join(","));
        }

        args.extend([
            "-map".to_string(),
            "0:v:0".to_string(),
            "-map".to_string(),
            "0:a?".to_string(),
            "-r".to_string(),
            options.fps.unwrap_or(30).to_string(),
            "-c:v".to_string(),
            options
                .codec
                .clone()
                .unwrap_or_else(|| "libx264".to_string()),
            "-preset".to_string(),
            "medium".to_string(),
            "-crf".to_string(),
            quality_to_crf(options.quality.as_deref()).to_string(),
            "-c:a".to_string(),
            "aac".to_string(),
        ]);
        if let Some(video_bitrate) = options.video_bitrate {
            args.push("-b:v".to_string());
            args.push(video_bitrate.to_string());
        }
        if let Some(audio_bitrate) = options.audio_bitrate {
            args.push("-b:a".to_string());
            args.push(audio_bitrate.to_string());
        }
        args.extend([
            "-movflags".to_string(),
            "+faststart".to_string(),
            segment_path.to_string_lossy().to_string(),
        ]);

        run_ffmpeg(&args)
    }

    fn concat_segments(
        segment_files: &[PathBuf],
        output_path: &Path,
        options: &TimelineRenderOptions,
        app_handle: Option<&AppHandle>,
        total_duration: f64,
    ) -> Result<(), String> {
        let list_path = output_path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join(format!("cognia_concat_{}.txt", Uuid::new_v4()));
        let mut file = File::create(&list_path).map_err(|e| e.to_string())?;
        for path in segment_files {
            writeln!(
                file,
                "file '{}'",
                path.to_string_lossy().replace('\'', "\\'")
            )
            .map_err(|e| e.to_string())?;
        }

        let mut command = Command::new("ffmpeg");
        command.args([
            "-y",
            "-progress",
            "pipe:2",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            &list_path.to_string_lossy(),
            "-c:v",
            &options
                .codec
                .clone()
                .unwrap_or_else(|| "libx264".to_string()),
            "-preset",
            "medium",
            "-crf",
            &quality_to_crf(options.quality.as_deref()).to_string(),
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            &output_path.to_string_lossy(),
        ]);
        command.stderr(Stdio::piped());

        let mut child = command.spawn().map_err(|e| e.to_string())?;
        if let Some(app) = app_handle {
            let _ =
                monitor_ffmpeg_progress(app, &mut child, "timeline-render", Some(total_duration));
        }
        let status = child.wait().map_err(|e| e.to_string())?;
        let _ = std::fs::remove_file(&list_path);
        if !status.success() {
            return Err("FFmpeg concat failed".to_string());
        }
        Ok(())
    }

    fn compose_with_transitions(
        clips: &[ResolvedClip],
        segment_files: &[PathBuf],
        transitions: &[TimelineTransition],
        output_path: &Path,
        options: &TimelineRenderOptions,
        app_handle: Option<&AppHandle>,
        total_duration: f64,
    ) -> Result<(), String> {
        if segment_files.len() < 2 {
            return Self::concat_segments(
                segment_files,
                output_path,
                options,
                app_handle,
                total_duration,
            );
        }

        let mut current = segment_files[0].clone();
        let mut current_duration = clips[0].duration;

        for idx in 1..segment_files.len() {
            let next = &segment_files[idx];
            let transition = transitions
                .iter()
                .find(|t| t.from_clip_id == clips[idx - 1].id && t.to_clip_id == clips[idx].id);
            let out = output_path
                .parent()
                .unwrap_or_else(|| Path::new("."))
                .join(format!("cognia_transition_{idx}_{}.mp4", Uuid::new_v4()));

            if let Some(trans) = transition {
                let transition_name = map_transition_name(&trans.transition_type);
                let transition_duration = trans.duration.clamp(0.05, current_duration.max(0.1));
                let offset = (current_duration - transition_duration).max(0.0);
                let mut args = vec![
                    "-y".to_string(),
                    "-i".to_string(),
                    current.to_string_lossy().to_string(),
                    "-i".to_string(),
                    next.to_string_lossy().to_string(),
                    "-filter_complex".to_string(),
                    format!(
                        "[0:v][1:v]xfade=transition={}:duration={:.3}:offset={:.3}[v];[0:a][1:a]acrossfade=d={:.3}[a]",
                        transition_name, transition_duration, offset, transition_duration
                    ),
                    "-map".to_string(),
                    "[v]".to_string(),
                    "-map".to_string(),
                    "[a]".to_string(),
                    "-c:v".to_string(),
                    options
                        .codec
                        .clone()
                        .unwrap_or_else(|| "libx264".to_string()),
                    "-preset".to_string(),
                    "medium".to_string(),
                    "-crf".to_string(),
                    quality_to_crf(options.quality.as_deref()).to_string(),
                    "-c:a".to_string(),
                    "aac".to_string(),
                ];
                if let Some(video_bitrate) = options.video_bitrate {
                    args.push("-b:v".to_string());
                    args.push(video_bitrate.to_string());
                }
                if let Some(audio_bitrate) = options.audio_bitrate {
                    args.push("-b:a".to_string());
                    args.push(audio_bitrate.to_string());
                }
                args.push(out.to_string_lossy().to_string());
                if idx == segment_files.len() - 1 && app_handle.is_some() {
                    args.splice(1..1, vec!["-progress".to_string(), "pipe:2".to_string()]);
                    let mut command = Command::new("ffmpeg");
                    command.args(args).stderr(Stdio::piped());
                    let mut child = command.spawn().map_err(|e| e.to_string())?;
                    if let Some(app) = app_handle {
                        let _ = monitor_ffmpeg_progress(
                            app,
                            &mut child,
                            "timeline-render",
                            Some(total_duration),
                        );
                    }
                    let status = child.wait().map_err(|e| e.to_string())?;
                    if !status.success() {
                        let fallback_args = vec![
                            "-y".to_string(),
                            "-i".to_string(),
                            current.to_string_lossy().to_string(),
                            "-i".to_string(),
                            next.to_string_lossy().to_string(),
                            "-filter_complex".to_string(),
                            format!(
                                "[0:v][1:v]xfade=transition={}:duration={:.3}:offset={:.3}[v]",
                                transition_name, transition_duration, offset
                            ),
                            "-map".to_string(),
                            "[v]".to_string(),
                            "-map".to_string(),
                            "0:a?".to_string(),
                            "-c:v".to_string(),
                            options
                                .codec
                                .clone()
                                .unwrap_or_else(|| "libx264".to_string()),
                            "-preset".to_string(),
                            "medium".to_string(),
                            "-crf".to_string(),
                            quality_to_crf(options.quality.as_deref()).to_string(),
                            "-c:a".to_string(),
                            "aac".to_string(),
                            out.to_string_lossy().to_string(),
                        ];
                        run_ffmpeg(&fallback_args)
                            .map_err(|_| "FFmpeg transition composition failed".to_string())?;
                    }
                } else {
                    if let Err(err) = run_ffmpeg(&args) {
                        let fallback_args = vec![
                            "-y".to_string(),
                            "-i".to_string(),
                            current.to_string_lossy().to_string(),
                            "-i".to_string(),
                            next.to_string_lossy().to_string(),
                            "-filter_complex".to_string(),
                            format!(
                                "[0:v][1:v]xfade=transition={}:duration={:.3}:offset={:.3}[v]",
                                transition_name, transition_duration, offset
                            ),
                            "-map".to_string(),
                            "[v]".to_string(),
                            "-map".to_string(),
                            "0:a?".to_string(),
                            "-c:v".to_string(),
                            options
                                .codec
                                .clone()
                                .unwrap_or_else(|| "libx264".to_string()),
                            "-preset".to_string(),
                            "medium".to_string(),
                            "-crf".to_string(),
                            quality_to_crf(options.quality.as_deref()).to_string(),
                            "-c:a".to_string(),
                            "aac".to_string(),
                            out.to_string_lossy().to_string(),
                        ];
                        run_ffmpeg(&fallback_args).map_err(|_| err)?;
                    }
                }
                current_duration = current_duration + clips[idx].duration - transition_duration;
            } else {
                let list_path = out
                    .parent()
                    .unwrap_or_else(|| Path::new("."))
                    .join(format!("cognia_pair_concat_{idx}_{}.txt", Uuid::new_v4()));
                let mut file = File::create(&list_path).map_err(|e| e.to_string())?;
                writeln!(
                    file,
                    "file '{}'",
                    current.to_string_lossy().replace('\'', "\\'")
                )
                .map_err(|e| e.to_string())?;
                writeln!(
                    file,
                    "file '{}'",
                    next.to_string_lossy().replace('\'', "\\'")
                )
                .map_err(|e| e.to_string())?;
                run_ffmpeg(&[
                    "-y".to_string(),
                    "-f".to_string(),
                    "concat".to_string(),
                    "-safe".to_string(),
                    "0".to_string(),
                    "-i".to_string(),
                    list_path.to_string_lossy().to_string(),
                    "-c:v".to_string(),
                    "libx264".to_string(),
                    "-c:a".to_string(),
                    "aac".to_string(),
                    out.to_string_lossy().to_string(),
                ])?;
                let _ = std::fs::remove_file(list_path);
                current_duration += clips[idx].duration;
            }

            if current != segment_files[0] {
                let _ = std::fs::remove_file(&current);
            }
            current = out;
        }

        std::fs::copy(&current, output_path).map_err(|e| e.to_string())?;
        if current != segment_files[0] {
            let _ = std::fs::remove_file(current);
        }
        Ok(())
    }
}

fn run_ffmpeg(args: &[String]) -> Result<(), String> {
    debug!("[TimelineRenderer] ffmpeg {}", args.join(" "));
    let output = Command::new("ffmpeg")
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        return Ok(());
    }
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    warn!("[TimelineRenderer] ffmpeg failed: {stderr}");
    Err(stderr)
}

fn normalize_source_path(source_url: &str) -> String {
    if let Some(stripped) = source_url.strip_prefix("file://") {
        return stripped.to_string();
    }
    source_url.to_string()
}

fn quality_to_crf(quality: Option<&str>) -> u8 {
    match quality.unwrap_or("high") {
        "low" => 32,
        "medium" => 27,
        "high" => 22,
        "maximum" => 18,
        _ => 22,
    }
}

fn map_resolution(resolution: &str) -> Option<(u32, u32)> {
    match resolution {
        "480p" => Some((854, 480)),
        "720p" => Some((1280, 720)),
        "1080p" => Some((1920, 1080)),
        "4k" => Some((3840, 2160)),
        _ => None,
    }
}

fn build_video_effect_filters(effects: &[TimelineEffect]) -> Vec<String> {
    let mut filters = Vec::new();
    for effect in effects {
        if !effect.enabled {
            continue;
        }
        let params = effect.params.as_object();
        match effect.effect_id.as_str() {
            "brightness-contrast" => {
                let brightness = params
                    .and_then(|p| p.get("brightness"))
                    .and_then(Value::as_f64)
                    .unwrap_or(0.0)
                    / 100.0;
                let contrast = 1.0
                    + params
                        .and_then(|p| p.get("contrast"))
                        .and_then(Value::as_f64)
                        .unwrap_or(0.0)
                        / 100.0;
                filters.push(format!("eq=brightness={brightness}:contrast={contrast}"));
            }
            "saturation" => {
                let saturation = 1.0
                    + params
                        .and_then(|p| p.get("amount"))
                        .and_then(Value::as_f64)
                        .unwrap_or(0.0)
                        / 100.0;
                filters.push(format!("eq=saturation={saturation}"));
            }
            "hue" => {
                let hue = params
                    .and_then(|p| p.get("amount"))
                    .and_then(Value::as_f64)
                    .unwrap_or(0.0);
                filters.push(format!("hue=h={hue}"));
            }
            "blur" => {
                let blur = params
                    .and_then(|p| p.get("amount"))
                    .and_then(Value::as_f64)
                    .unwrap_or(0.0);
                filters.push(format!("boxblur={:.3}", (blur / 10.0).max(0.0)));
            }
            "sharpen" => {
                let sharpen = params
                    .and_then(|p| p.get("amount"))
                    .and_then(Value::as_f64)
                    .unwrap_or(0.0);
                let amount = (sharpen / 100.0).clamp(0.0, 5.0);
                filters.push(format!("unsharp=5:5:{amount}:5:5:0.0"));
            }
            "grayscale" => filters.push("hue=s=0".to_string()),
            "sepia" => filters.push(
                "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131".to_string(),
            ),
            _ => {}
        }
    }
    filters
}

fn build_atempo_chain(speed: f64) -> Vec<String> {
    let mut remaining = speed;
    let mut chain = Vec::new();
    while remaining > 2.0 {
        chain.push("atempo=2.0".to_string());
        remaining /= 2.0;
    }
    while remaining < 0.5 {
        chain.push("atempo=0.5".to_string());
        remaining /= 0.5;
    }
    chain.push(format!("atempo={remaining:.6}"));
    chain
}

fn map_transition_name(input: &str) -> &str {
    match input {
        "dissolve" => "fade",
        "wipe-left" => "wipeleft",
        "wipe-right" => "wiperight",
        "slide-left" => "slideleft",
        "slide-right" => "slideright",
        "fade" => "fade",
        _ => "fade",
    }
}
