/**
 * Video Processing Native API
 *
 * Provides TypeScript bindings for video processing via FFmpeg in Tauri.
 * Includes trimming, format conversion, and export functionality.
 */

import { invoke } from "@tauri-apps/api/core";

// ============== Types ==============

export interface VideoTrimOptions {
  /** Source video file path */
  inputPath: string;
  /** Output file path */
  outputPath: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Output format (mp4, webm, gif) */
  format?: 'mp4' | 'webm' | 'gif';
  /** Quality 1-100 (for mp4/webm) */
  quality?: number;
  /** GIF frame rate (for gif output) */
  gifFps?: number;
}

export interface VideoConvertOptions {
  /** Source video file path */
  inputPath: string;
  /** Output file path */
  outputPath: string;
  /** Output format */
  format: 'mp4' | 'webm' | 'gif';
  /** Quality 1-100 */
  quality?: number;
  /** Target width (optional, maintains aspect ratio) */
  width?: number;
  /** GIF frame rate */
  gifFps?: number;
}

export interface VideoProcessingResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Output file path */
  outputPath: string;
  /** Output file size in bytes */
  fileSize: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
}

export interface VideoInfo {
  /** Duration in milliseconds */
  durationMs: number;
  /** Video width */
  width: number;
  /** Video height */
  height: number;
  /** Frame rate */
  fps: number;
  /** Codec */
  codec: string;
  /** File size in bytes */
  fileSize: number;
  /** Has audio track */
  hasAudio: boolean;
}

// ============== Video Processing Functions ==============

/**
 * Trim a video file
 */
export async function trimVideo(options: VideoTrimOptions): Promise<VideoProcessingResult> {
  return invoke<VideoProcessingResult>("video_trim", { options });
}

/**
 * Trim a video file with progress events
 * Listen for 'video-processing-started', 'video-processing-progress', 'video-processing-completed', 'video-processing-error' events
 */
export async function trimVideoWithProgress(options: VideoTrimOptions): Promise<VideoProcessingResult> {
  return invoke<VideoProcessingResult>("video_trim_with_progress", { options });
}

/**
 * Convert video format
 */
export async function convertVideo(options: VideoConvertOptions): Promise<VideoProcessingResult> {
  return invoke<VideoProcessingResult>("video_convert", { options });
}

/**
 * Convert video format with progress events
 * Listen for 'video-processing-started', 'video-processing-progress', 'video-processing-completed', 'video-processing-error' events
 */
export async function convertVideoWithProgress(options: VideoConvertOptions): Promise<VideoProcessingResult> {
  return invoke<VideoProcessingResult>("video_convert_with_progress", { options });
}

/**
 * Get video information
 */
export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  return invoke<VideoInfo>("video_get_info", { filePath });
}

/**
 * Generate video thumbnail
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestampMs: number = 0
): Promise<string> {
  return invoke<string>("video_generate_thumbnail", { 
    videoPath, 
    outputPath, 
    timestampMs 
  });
}

/**
 * Generate video thumbnail with progress events
 * Listen for 'video-processing-started', 'video-processing-completed', 'video-processing-error' events
 */
export async function generateThumbnailWithProgress(
  videoPath: string,
  outputPath: string,
  timestampMs: number = 0
): Promise<string> {
  return invoke<string>("video_generate_thumbnail_with_progress", { 
    videoPath, 
    outputPath, 
    timestampMs 
  });
}

/**
 * Check if FFmpeg supports encoding
 */
export async function checkEncodingSupport(): Promise<{
  h264: boolean;
  h265: boolean;
  vp9: boolean;
  gif: boolean;
}> {
  return invoke("video_check_encoding_support");
}

// ============== Utility Functions ==============

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Generate output filename based on input and format
 */
export function generateOutputFilename(
  inputPath: string,
  format: 'mp4' | 'webm' | 'gif',
  suffix: string = '_edited'
): string {
  const lastDot = inputPath.lastIndexOf('.');
  const lastSlash = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
  const baseName = inputPath.substring(lastSlash + 1, lastDot > lastSlash ? lastDot : undefined);
  const dir = inputPath.substring(0, lastSlash + 1);
  
  return `${dir}${baseName}${suffix}.${format}`;
}

/**
 * Estimate output file size based on duration and quality
 */
export function estimateFileSize(
  durationSeconds: number,
  quality: number,
  format: 'mp4' | 'webm' | 'gif'
): number {
  // Rough estimates in bytes per second
  const bitrateMap = {
    mp4: quality * 50000, // ~5MB/s at q=100
    webm: quality * 40000, // ~4MB/s at q=100
    gif: quality * 200000, // ~20MB/s at q=100 (GIFs are large)
  };
  
  return Math.round(durationSeconds * bitrateMap[format] / 100);
}

/**
 * Cancel ongoing video processing
 * Note: Currently returns false as FFmpeg processes run synchronously.
 * For true cancellation, backend processing would need to run in background tasks.
 */
export async function cancelVideoProcessing(): Promise<boolean> {
  return invoke<boolean>("video_cancel_processing");
}
